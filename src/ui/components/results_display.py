"""
Results display component for Roman's Rater 4.21

Displays calculation results in a user-friendly format.
"""

from typing import Optional
from nicegui import ui
from ...models.calculation_result import CalculationResult


class ResultsDisplayComponent:
    """Component for displaying calculation results."""

    def __init__(self):
        """Initialize results display component."""
        self.container: Optional[ui.column] = None
        self.current_result: Optional[CalculationResult] = None

    def render(self) -> ui.card:
        """
        Render the results display component.

        Returns:
            NiceGUI card containing the results interface
        """
        with ui.card().classes('w-full') as card:
            ui.label('Calculation Results').classes('text-h6')
            self.container = ui.column().classes('w-full gap-2')
            with self.container:
                ui.label('No results yet. Upload and process a PDF to see results.').classes(
                    'text-gray-500 italic'
                )

        return card

    def display_result(self, result: CalculationResult):
        """
        Display a calculation result.

        Args:
            result: CalculationResult to display
        """
        self.current_result = result
        self.container.clear()

        with self.container:
            # Policy Information Section
            with ui.expansion('Policy Information', icon='description').classes('w-full'):
                with ui.grid(columns=2).classes('w-full gap-2'):
                    self._info_row('Insured Name', result.policy_data.get('insured_name', 'N/A'))
                    self._info_row('State', result.policy_data.get('state', 'N/A'))
                    self._info_row('Effective Date', result.policy_data.get('effective_date', 'N/A'))
                    self._info_row('Expiration Date', result.policy_data.get('expiration_date', 'N/A'))
                    self._info_row('Vehicles', str(len(result.vehicles)))
                    self._info_row('Drivers', str(len(result.drivers)))
                    self._info_row('Coverage Limit', result.al_selection.get('limit', 'N/A'))
                    self._info_row('Program', result.metadata.get('program', 'N/A'))

            # Premium Breakdown Section
            with ui.expansion('Premium Breakdown', icon='calculate', value=True).classes('w-full'):
                # Per-vehicle breakdown
                breakdown = result.get_per_vehicle_breakdown()
                if breakdown:
                    with ui.column().classes('w-full gap-2 mb-4'):
                        ui.label('Per-Vehicle Premiums:').classes('text-sm font-bold')
                        for vehicle in breakdown:
                            with ui.row().classes('w-full justify-between items-center'):
                                ui.label(
                                    f"Vehicle {vehicle.get('vehicle_index', 0) + 1}: "
                                    f"{vehicle.get('class', 'N/A')} - {vehicle.get('vin', 'N/A')[:10]}..."
                                ).classes('text-sm')
                                ui.label(
                                    f"${vehicle.get('rate_per_unit', 0):,.2f}"
                                ).classes('text-sm font-mono')

                ui.separator()

                # Totals
                self._total_row('AL Premium Subtotal', result.premium_subtotal, 'text-lg font-bold')
                self._total_row('Fees Total', result.fees_total)
                self._total_row('Taxes Total', result.taxes_total)

                ui.separator().classes('my-2')

                self._total_row('AL TOTAL', result.al_total, 'text-xl font-bold text-primary')

            # Reconciliation Section
            if result.reconciliation_delta is not None:
                status = result.get_reconciliation_status()
                icon = '✓' if status == 'match' else '⚠' if status == 'minor_diff' else '✗'
                color = 'green' if status == 'match' else 'orange' if status == 'minor_diff' else 'red'

                with ui.expansion('Reconciliation', icon='sync').classes('w-full'):
                    with ui.column().classes('w-full gap-2'):
                        self._info_row('Status', f'{icon} {status.replace("_", " ").title()}')
                        delta_text = f"${result.reconciliation_delta:+,.2f}"
                        with ui.row().classes('w-full justify-between'):
                            ui.label('Delta (Calculated - Printed):').classes('text-sm')
                            ui.label(delta_text).classes(f'text-sm font-mono text-{color}')

            # Intermediate Factors Section (Advanced)
            with ui.expansion('Intermediate Factors (Advanced)', icon='functions').classes('w-full'):
                with ui.column().classes('w-full gap-1'):
                    for key, value in sorted(result.intermediate_factors.items()):
                        if key != 'per_vehicle_breakdown':
                            self._info_row(key, self._format_value(value), 'text-xs font-mono')

            # Actions Section
            with ui.row().classes('w-full gap-2 mt-4'):
                ui.button(
                    'Export JSON',
                    on_click=lambda: self._export_json(),
                    icon='download'
                ).props('outline')

                ui.button(
                    'View History',
                    on_click=lambda: self._show_history(),
                    icon='history'
                ).props('outline')

                ui.button(
                    'New Calculation',
                    on_click=lambda: self._new_calculation(),
                    icon='add',
                    color='primary'
                )

    def _info_row(self, label: str, value: str, extra_classes: str = ''):
        """Create an info row with label and value."""
        with ui.row().classes(f'w-full justify-between {extra_classes}'):
            ui.label(f'{label}:').classes('text-sm')
            ui.label(str(value)).classes('text-sm font-mono')

    def _total_row(self, label: str, amount: float, extra_classes: str = ''):
        """Create a total row with currency formatting."""
        with ui.row().classes(f'w-full justify-between {extra_classes}'):
            ui.label(label)
            ui.label(f'${amount:,.2f}').classes('font-mono')

    def _format_value(self, value) -> str:
        """Format a value for display."""
        if isinstance(value, float):
            return f'{value:.4f}'
        elif isinstance(value, (list, dict)):
            return f'{type(value).__name__} (length: {len(value)})'
        return str(value)

    def _export_json(self):
        """Export current result to JSON."""
        if not self.current_result:
            ui.notify('No result to export', type='warning')
            return

        try:
            from pathlib import Path
            from ...storage import save_calculation_json_timestamped

            output_dir = Path.home() / 'Downloads'
            json_path = save_calculation_json_timestamped(
                self.current_result,
                output_dir,
                prefix='romans_rater_calculation'
            )

            ui.notify(f'Exported to: {json_path.name}', type='positive')

        except Exception as e:
            ui.notify(f'Export failed: {e}', type='negative')

    def _show_history(self):
        """Show calculation history."""
        ui.notify('History view coming soon...', type='info')

    def _new_calculation(self):
        """Start a new calculation."""
        self.clear()
        ui.notify('Ready for new calculation', type='info')

    def clear(self):
        """Clear the results display."""
        self.current_result = None
        self.container.clear()
        with self.container:
            ui.label('No results yet. Upload and process a PDF to see results.').classes(
                'text-gray-500 italic'
            )
