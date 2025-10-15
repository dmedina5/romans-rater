"""
Main window for Roman's Rater 4.21 GUI

Provides the desktop application interface using NiceGUI.
"""

import asyncio
from pathlib import Path
from typing import Optional
from nicegui import ui, app

from .components import FileUploadComponent, ResultsDisplayComponent
from ..parsers import PDFParser, FieldExtractor
from ..loaders import load_rating_tables, load_tax_config
from ..rating import RatingEngine, FeeCalculator, TaxCalculator, calculate_al_total
from ..models.calculation_result import CalculationResult
from ..storage import initialize_db, save_calculation
from ..exceptions import RomansRaterError
from datetime import datetime


class MainWindow:
    """Main application window for Roman's Rater."""

    def __init__(self, data_dir: Path, db_path: Path, config: dict):
        """
        Initialize main window.

        Args:
            data_dir: Directory containing rating tables
            db_path: Path to SQLite database
            config: Application configuration
        """
        self.data_dir = data_dir
        self.db_path = db_path
        self.config = config

        # Initialize database
        initialize_db(db_path)

        # Components
        self.file_upload: Optional[FileUploadComponent] = None
        self.results_display: Optional[ResultsDisplayComponent] = None

        # Data
        self.rating_tables = None
        self.tax_configs = None

        # State
        self.is_initialized = False

    async def initialize_data(self):
        """Load rating tables and tax configs asynchronously."""
        if self.is_initialized:
            return

        try:
            ui.notify('Loading rating tables...', type='ongoing', position='top')

            # Load rating tables
            self.rating_tables = await asyncio.to_thread(
                load_rating_tables,
                self.data_dir / "2025 Cover Whale Rater AL only version.xlsx"
            )

            # Load tax configs
            self.tax_configs = await asyncio.to_thread(
                load_tax_config,
                self.data_dir / "State Taxes and Fees 2025.xlsx"
            )

            self.is_initialized = True
            ui.notify('Initialization complete!', type='positive')

        except Exception as e:
            ui.notify(f'Initialization failed: {e}', type='negative', timeout=10000)
            raise

    def build(self):
        """Build the main window UI."""
        # Set page configuration
        ui.colors(primary='#7E369F')  # Purple from config

        # Header
        with ui.header().classes('items-center justify-between'):
            with ui.row().classes('items-center gap-2'):
                ui.label('Roman\'s Rater 4.21').classes('text-h5')
                ui.badge('MVP', color='green').classes('text-xs')

            with ui.row().classes('gap-2'):
                ui.button(
                    icon='settings',
                    on_click=self._show_settings
                ).props('flat round')
                ui.button(
                    icon='help',
                    on_click=self._show_help
                ).props('flat round')

        # Main content area
        with ui.column().classes('w-full max-w-6xl mx-auto p-4 gap-4'):
            # Info banner
            with ui.card().classes('w-full bg-blue-50'):
                with ui.row().classes('items-center gap-2'):
                    ui.icon('info', color='blue')
                    ui.label(
                        'Upload an auto liability quote PDF to calculate rating. '
                        'Supports both text-based and image-based PDFs (with OCR).'
                    ).classes('text-sm')

            # Two-column layout
            with ui.row().classes('w-full gap-4'):
                # Left column: File upload
                with ui.column().classes('flex-1'):
                    self.file_upload = FileUploadComponent(
                        on_file_selected=self._handle_file_processing
                    )
                    self.file_upload.render()

                # Right column: Results
                with ui.column().classes('flex-1'):
                    self.results_display = ResultsDisplayComponent()
                    self.results_display.render()

        # Footer
        with ui.footer().classes('bg-gray-100'):
            with ui.row().classes('w-full max-w-6xl mx-auto justify-between items-center'):
                ui.label(f'Edition: {self.config.get("edition", "2025-01")}').classes('text-xs text-gray-600')
                ui.label('Offline Mode').classes('text-xs text-green-600')

        # Initialize data on startup
        ui.timer(0.1, self.initialize_data, once=True)

    async def _handle_file_processing(self, pdf_path: Path, use_ocr: bool):
        """
        Handle PDF file processing.

        Args:
            pdf_path: Path to uploaded PDF
            use_ocr: Whether to use OCR
        """
        if not self.is_initialized:
            self.file_upload.show_error('Application still initializing. Please wait...')
            return

        try:
            # Step 1: Parse PDF
            ui.notify('Parsing PDF...', type='ongoing')
            parser = PDFParser(pdf_path)
            text = await asyncio.to_thread(parser.extract_text, use_ocr)
            tables = await asyncio.to_thread(parser.extract_tables)

            # Step 2: Extract fields
            ui.notify('Extracting policy data...', type='ongoing')
            extractor = FieldExtractor(text, tables)
            policy = await asyncio.to_thread(extractor.extract_policy)
            printed_total = await asyncio.to_thread(extractor.extract_printed_total)

            # Step 3: Calculate premium
            ui.notify('Calculating premium...', type='ongoing')
            engine = RatingEngine(
                self.rating_tables,
                self.config["min_premiums"]["policy"],
                self.config["min_premiums"]["per_unit"]
            )
            await asyncio.to_thread(engine.validate_policy_for_rating, policy)
            premium_result = await asyncio.to_thread(engine.calculate_premium, policy)

            # Step 4: Calculate fees
            ui.notify('Calculating fees and taxes...', type='ongoing')
            fee_calc = FeeCalculator()
            fees = fee_calc.calculate_fees()

            # Get tax config
            state = policy.address.state
            if state not in self.tax_configs:
                raise RomansRaterError(f"Tax configuration not found for state: {state}")

            tax_calc = TaxCalculator(self.tax_configs[state])
            taxes = tax_calc.calculate_taxes(premium_result['premium_subtotal'], fees)

            # Calculate totals
            al_total = calculate_al_total(
                premium_result['premium_subtotal'],
                fees['total'],
                taxes['total']
            )

            # Calculate reconciliation
            reconciliation_delta = None
            if printed_total:
                reconciliation_delta = round(al_total - printed_total, 2)

            # Step 5: Create result
            result = CalculationResult(
                timestamp=datetime.now(),
                policy_data={
                    "insured_name": policy.insured_name,
                    "state": policy.address.state,
                    "effective_date": policy.effective_date.isoformat(),
                    "expiration_date": policy.expiration_date.isoformat(),
                },
                vehicles=[
                    {"vin": v.vin, "class": v.vehicle_class, "body_type": v.body_type}
                    for v in policy.vehicles
                ],
                drivers=[
                    {"name": f"{d.first_name} {d.last_name}", "excluded": d.excluded}
                    for d in policy.drivers
                ],
                al_selection={
                    "limit": policy.al_selection.limit if policy.al_selection else "N/A",
                    "radius": policy.al_selection.radius_bucket if policy.al_selection else "N/A",
                },
                intermediate_factors=premium_result['intermediate_factors'],
                premium_subtotal=premium_result['premium_subtotal'],
                fees_total=fees['total'],
                taxes_total=taxes['total'],
                al_total=al_total,
                reconciliation_delta=reconciliation_delta,
                metadata={
                    "program": premium_result['intermediate_factors'].get('vehicle_0_program', ''),
                    "edition_code": self.rating_tables.edition_code,
                    "pdf_file": pdf_path.name,
                }
            )

            # Save to database
            calc_id = await asyncio.to_thread(save_calculation, self.db_path, result)
            result.id = calc_id

            # Display results
            self.results_display.display_result(result)
            self.file_upload.show_success()

            # Show summary notification
            status = result.get_reconciliation_status()
            if status == 'match':
                ui.notify(
                    f'Calculation complete! AL Total: ${al_total:,.2f} (Reconciled ✓)',
                    type='positive',
                    timeout=5000
                )
            else:
                ui.notify(
                    f'Calculation complete! AL Total: ${al_total:,.2f}',
                    type='positive',
                    timeout=5000
                )

        except RomansRaterError as e:
            self.file_upload.show_error(str(e))
            ui.notify(f'Rating failed: {e}', type='negative', timeout=10000)

        except Exception as e:
            self.file_upload.show_error(f'Unexpected error: {e}')
            ui.notify(f'Unexpected error: {e}', type='negative', timeout=10000)

    def _show_settings(self):
        """Show settings dialog."""
        with ui.dialog() as dialog, ui.card():
            ui.label('Settings').classes('text-h6')

            with ui.column().classes('gap-2 mt-4'):
                ui.label('Minimum Premiums').classes('text-sm font-bold')
                with ui.row().classes('gap-2 items-center'):
                    ui.label('Policy:')
                    ui.input(
                        value=str(self.config["min_premiums"]["policy"])
                    ).props('type=number prefix=$').classes('w-32')

                with ui.row().classes('gap-2 items-center'):
                    ui.label('Per Unit:')
                    ui.input(
                        value=str(self.config["min_premiums"]["per_unit"])
                    ).props('type=number prefix=$').classes('w-32')

                ui.separator()

                ui.label('Reconciliation').classes('text-sm font-bold')
                with ui.row().classes('gap-2 items-center'):
                    ui.label('Tolerance:')
                    ui.input(
                        value=str(self.config.get("reconciliation_tolerance", 0.50))
                    ).props('type=number prefix=$').classes('w-32')

            with ui.row().classes('gap-2 mt-4 justify-end'):
                ui.button('Cancel', on_click=dialog.close).props('flat')
                ui.button('Save', on_click=lambda: (ui.notify('Settings saved'), dialog.close()))

        dialog.open()

    def _show_help(self):
        """Show help dialog."""
        with ui.dialog() as dialog, ui.card().classes('w-96'):
            ui.label('Roman\'s Rater 4.21 - Help').classes('text-h6')

            with ui.column().classes('gap-2 mt-4'):
                ui.label('How to use:').classes('text-sm font-bold')
                with ui.column().classes('gap-1 text-sm'):
                    ui.label('1. Click "Select PDF" to upload an auto liability quote')
                    ui.label('2. Check "Use OCR" if the PDF is image-based')
                    ui.label('3. Click "Process Quote" to calculate rating')
                    ui.label('4. View results in the right panel')
                    ui.label('5. Export results to JSON if needed')

                ui.separator()

                ui.label('Features:').classes('text-sm font-bold')
                with ui.column().classes('gap-1 text-sm'):
                    ui.label('• Factor-based rating algorithm')
                    ui.label('• Automatic program selection (CW/SS)')
                    ui.label('• Fee and tax calculation')
                    ui.label('• Reconciliation with printed totals')
                    ui.label('• Offline operation (no internet required)')

                ui.separator()

                ui.label('Support:').classes('text-sm font-bold')
                ui.label('For issues or questions, contact support.').classes('text-sm')

            ui.button('Close', on_click=dialog.close).classes('mt-4')

        dialog.open()


def launch_gui(data_dir: Path, db_path: Path, config: dict):
    """
    Launch the GUI application.

    Args:
        data_dir: Directory containing rating tables
        db_path: Path to SQLite database
        config: Application configuration
    """
    # Create main window
    window = MainWindow(data_dir, db_path, config)
    window.build()

    # Run the application
    ui.run(
        title='Roman\'s Rater 4.21',
        native=True,  # Run as desktop app
        window_size=(1400, 900),
        reload=False,
        show=True,
    )
