"""
Main entry point for Roman's Rater 4.21

This module provides the command-line interface and coordinates
the complete rating workflow.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from .parsers import PDFParser, FieldExtractor
from .loaders import load_rating_tables, load_tax_config
from .rating import RatingEngine, FeeCalculator, TaxCalculator, calculate_al_total
from .models.calculation_result import CalculationResult
from .storage import initialize_db, save_calculation, save_calculation_json_timestamped
from .exceptions import RomansRaterError


class RomansRater:
    """Main application class for Roman's Rater."""

    def __init__(self, data_dir: Path, db_path: Path, config_path: Path):
        """
        Initialize Roman's Rater application.

        Args:
            data_dir: Directory containing rating tables Excel files
            db_path: Path to SQLite database
            config_path: Path to config.json
        """
        self.data_dir = data_dir
        self.db_path = db_path
        self.config = self._load_config(config_path)

        # Initialize database
        initialize_db(db_path)

        # Load rating tables and tax config
        print("Loading rating tables...")
        self.rating_tables = load_rating_tables(
            data_dir / "2025 Cover Whale Rater AL only version.xlsx"
        )

        print("Loading tax configuration...")
        self.tax_configs = load_tax_config(
            data_dir / "State Taxes and Fees 2025.xlsx"
        )

        print("Initialization complete.\n")

    def _load_config(self, config_path: Path) -> dict:
        """Load configuration from JSON file."""
        if not config_path.exists():
            # Return defaults
            return {
                "min_premiums": {"policy": 1000.0, "per_unit": 500.0},
                "reconciliation_tolerance": 0.50,
                "ocr_confidence_threshold": 0.80,
            }

        with open(config_path, 'r') as f:
            return json.load(f)

    def rate_pdf(self, pdf_path: Path, use_ocr: bool = False) -> CalculationResult:
        """
        Complete rating workflow for a PDF quote.

        Args:
            pdf_path: Path to quote PDF
            use_ocr: Whether to use OCR for image-based PDFs

        Returns:
            CalculationResult with all calculations

        Raises:
            RomansRaterError: If any step fails
        """
        print(f"Processing: {pdf_path.name}")
        print("=" * 60)

        # Step 1: Parse PDF
        print("\n[1/5] Parsing PDF...")
        parser = PDFParser(pdf_path)
        text = parser.extract_text(use_ocr=use_ocr)
        tables = parser.extract_tables()
        print(f"  ✓ Extracted {len(text)} characters, {len(tables)} tables")

        # Step 2: Extract fields
        print("\n[2/5] Extracting policy data...")
        extractor = FieldExtractor(text, tables)
        policy = extractor.extract_policy()
        printed_total = extractor.extract_printed_total()
        print(f"  ✓ Insured: {policy.insured_name}")
        print(f"  ✓ State: {policy.address.state}")
        print(f"  ✓ Vehicles: {len(policy.vehicles)}")
        print(f"  ✓ Drivers: {len(policy.drivers)}")
        if printed_total:
            print(f"  ✓ Printed total: ${printed_total:,.2f}")

        # Step 3: Calculate premium
        print("\n[3/5] Calculating premium...")
        engine = RatingEngine(
            self.rating_tables,
            self.config["min_premiums"]["policy"],
            self.config["min_premiums"]["per_unit"]
        )
        engine.validate_policy_for_rating(policy)
        premium_result = engine.calculate_premium(policy)
        print(f"  ✓ AL Premium Subtotal: ${premium_result['premium_subtotal']:,.2f}")

        # Step 4: Calculate fees and taxes
        print("\n[4/5] Calculating fees and taxes...")
        fee_calc = FeeCalculator()
        fees = fee_calc.calculate_fees()
        print(f"  ✓ Fees Total: ${fees['total']:,.2f}")

        # Get tax config for state
        state = policy.address.state
        if state not in self.tax_configs:
            raise RomansRaterError(f"Tax configuration not found for state: {state}")

        tax_calc = TaxCalculator(self.tax_configs[state])
        taxes = tax_calc.calculate_taxes(premium_result['premium_subtotal'], fees)
        print(f"  ✓ Taxes Total: ${taxes['total']:,.2f}")

        # Calculate AL Total
        al_total = calculate_al_total(
            premium_result['premium_subtotal'],
            fees['total'],
            taxes['total']
        )
        print(f"  ✓ AL Total: ${al_total:,.2f}")

        # Calculate reconciliation
        reconciliation_delta = None
        if printed_total:
            reconciliation_delta = round(al_total - printed_total, 2)
            status = "✓ MATCH" if abs(reconciliation_delta) <= self.config["reconciliation_tolerance"] else "⚠ DIFF"
            print(f"  {status} Reconciliation delta: ${reconciliation_delta:+,.2f}")

        # Step 5: Create and save result
        print("\n[5/5] Saving results...")
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={
                "insured_name": policy.insured_name,
                "state": policy.address.state,
                "effective_date": policy.effective_date.isoformat(),
                "expiration_date": policy.expiration_date.isoformat(),
            },
            vehicles=[
                {"vin": v.vin, "class": v.vehicle_class}
                for v in policy.vehicles
            ],
            drivers=[
                {"name": f"{d.first_name} {d.last_name}"}
                for d in policy.drivers
            ],
            al_selection={
                "limit": policy.al_selection.limit,
                "radius": policy.al_selection.radius_bucket,
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
        calc_id = save_calculation(self.db_path, result)
        result.id = calc_id
        print(f"  ✓ Saved to database (ID: {calc_id})")

        # Save to JSON
        json_path = save_calculation_json_timestamped(
            result,
            self.data_dir / "outputs",
            prefix="calculation"
        )
        print(f"  ✓ Exported to: {json_path.name}")

        print("\n" + "=" * 60)
        print("Rating complete!\n")

        return result


def main():
    """Main entry point - supports both CLI and GUI modes."""
    # Determine paths
    app_dir = Path(__file__).parent.parent
    data_dir = app_dir / "data"
    db_path = data_dir / "calculations.db"
    config_path = data_dir / "config.json"

    # Check if GUI mode requested
    if len(sys.argv) == 1 or "--gui" in sys.argv:
        # GUI mode
        try:
            from .ui import launch_gui

            # Load config
            config = _load_config(config_path)

            # Launch GUI
            launch_gui(data_dir, db_path, config)

        except ImportError:
            print("Error: NiceGUI not installed. Install with: pip install nicegui")
            print("Or use CLI mode: romans-rater <pdf_file>")
            sys.exit(1)

    else:
        # CLI mode
        print("=" * 60)
        print("Roman's Rater 4.21")
        print("Auto Liability Rating Engine")
        print("=" * 60 + "\n")

        # Parse command-line arguments
        if sys.argv[1] in ["--help", "-h"]:
            print("Usage: romans-rater [<pdf_file>] [--ocr] [--gui]")
            print("\nModes:")
            print("  GUI mode (default):  romans-rater")
            print("                       romans-rater --gui")
            print("\n  CLI mode:            romans-rater <pdf_file>")
            print("                       romans-rater <pdf_file> --ocr")
            print("\nExamples:")
            print("  romans-rater                    # Launch GUI")
            print("  romans-rater quote.pdf          # Rate PDF in CLI")
            print("  romans-rater quote.pdf --ocr    # Rate image-based PDF")
            sys.exit(0)

        pdf_path = Path(sys.argv[1])
        use_ocr = "--ocr" in sys.argv

        if not pdf_path.exists():
            print(f"Error: PDF file not found: {pdf_path}")
            sys.exit(1)

        try:
            # Initialize application
            rater = RomansRater(data_dir, db_path, config_path)

            # Rate the PDF
            result = rater.rate_pdf(pdf_path, use_ocr=use_ocr)

            # Display summary
            print(f"Final Results:")
            print(f"  AL Premium Subtotal:  ${result.premium_subtotal:>12,.2f}")
            print(f"  Fees Total:           ${result.fees_total:>12,.2f}")
            print(f"  Taxes Total:          ${result.taxes_total:>12,.2f}")
            print(f"  {'-' * 40}")
            print(f"  AL Total:             ${result.al_total:>12,.2f}")

            if result.reconciliation_delta is not None:
                print(f"\n  Reconciliation Delta: ${result.reconciliation_delta:>12,.2f}")
                print(f"  Status:                {result.get_reconciliation_status():>12}")

            sys.exit(0)

        except RomansRaterError as e:
            print(f"\nError: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"\nUnexpected error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


def _load_config(config_path: Path) -> dict:
    """Load configuration from JSON file."""
    if not config_path.exists():
        # Return defaults
        return {
            "min_premiums": {"policy": 1000.0, "per_unit": 500.0},
            "reconciliation_tolerance": 0.50,
            "ocr_confidence_threshold": 0.80,
            "edition": "2025-01",
        }

    with open(config_path, 'r') as f:
        return json.load(f)


if __name__ == "__main__":
    main()
