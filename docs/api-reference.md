# API Reference

Complete API documentation for Roman's Rater 4.21.

## Table of Contents

1. [Overview](#overview)
2. [Core Classes](#core-classes)
3. [Data Models](#data-models)
4. [Rating Engine](#rating-engine)
5. [PDF Processing](#pdf-processing)
6. [Data Loaders](#data-loaders)
7. [Storage](#storage)
8. [Export Utilities](#export-utilities)
9. [CLI Interface](#cli-interface)
10. [Configuration](#configuration)

---

## Overview

Roman's Rater is organized into modular components:

```
src/
├── models/           # Data models (Policy, Vehicle, Driver)
├── parsers/          # PDF parsing and OCR
├── loaders/          # Excel rating table loaders
├── rating/           # Rating engine and calculations
├── fees/             # Fees and taxes calculation
├── storage/          # SQLite database operations
├── exports/          # JSON/CSV/PDF export utilities
├── ui/               # NiceGUI desktop interface
└── main.py           # Entry point and CLI
```

### Design Principles

- **Type Safety**: All functions use type hints (Python 3.11+)
- **Immutability**: Data models use `@dataclass(frozen=True)` where possible
- **Error Handling**: Custom exceptions for domain errors
- **Testability**: Pure functions, dependency injection
- **Separation**: Clear boundaries between layers

---

## Core Classes

### RomansRater

Main orchestration class that coordinates PDF parsing, rating, and storage.

**Location:** `src/main.py`

```python
class RomansRater:
    """Main application class for rating PDF quotes."""

    def __init__(
        self,
        data_dir: Path,
        db_path: Path,
        config_path: Path | None = None
    ):
        """Initialize rater with data directory and database.

        Args:
            data_dir: Directory containing rating tables
            db_path: Path to SQLite database file
            config_path: Optional config file path
        """

    def rate_pdf(
        self,
        pdf_path: Path,
        use_ocr: bool = False
    ) -> RatingResult:
        """Process PDF and calculate premium.

        Args:
            pdf_path: Path to CWIS quote PDF
            use_ocr: Enable OCR for image-based PDFs

        Returns:
            RatingResult with calculated premium and reconciliation

        Raises:
            ParseError: PDF parsing failed
            RatingError: Premium calculation failed
            ValidationError: Invalid data extracted
        """
```

**Example Usage:**

```python
from pathlib import Path
from src.main import RomansRater

# Initialize
rater = RomansRater(
    data_dir=Path("data"),
    db_path=Path("data/calculations.db")
)

# Rate PDF
result = rater.rate_pdf(
    pdf_path=Path("quote.pdf"),
    use_ocr=False
)

# Access results
print(f"AL Total: ${result.al_total:.2f}")
print(f"Reconciliation: {result.reconciliation.status}")

# Export
result.to_json("export.json")
result.to_csv("export.csv")
```

---

## Data Models

All models in `src/models/policy.py` using `@dataclass`.

### Policy

Top-level container for quote information.

```python
@dataclass
class Policy:
    """Represents a complete insurance policy quote."""

    insured_name: str
    address: Address
    effective_date: date
    expiration_date: date
    state: str  # Two-letter state code
    vehicles: list[Vehicle]
    drivers: list[Driver]
    al_selection: ALSelection
    quote_number: str | None = None

    def validate(self) -> None:
        """Validate policy data for completeness.

        Raises:
            ValidationError: Missing required fields or invalid data
        """

    def get_program(self) -> str:
        """Determine CW or SS program based on state.

        Returns:
            "CW" or "SS"
        """
```

### Vehicle

Vehicle information and rating attributes.

```python
@dataclass
class Vehicle:
    """Represents a vehicle on the policy."""

    vin: str  # 17-character VIN
    year: int
    make: str
    model: str
    body_class: str  # e.g., "Van - Light"
    radius: str  # e.g., "Local 0-50"
    value: float
    garaging_zip: str | None = None

    @property
    def units(self) -> float:
        """Calculate units based on value.

        Returns:
            value / 7500, rounded to 2 decimals
        """
        return round(self.value / 7500, 2)

    def validate(self) -> None:
        """Validate vehicle data.

        Raises:
            ValidationError: Invalid VIN, year, or value
        """
```

### Driver

Driver information including experience and MVR.

```python
@dataclass
class Driver:
    """Represents a driver on the policy."""

    first_name: str
    last_name: str
    license_state: str
    license_no: str
    dob: date
    years_exp: float
    accidents: int = 0
    violations: int = 0
    suspensions: int = 0
    major_violations: int = 0
    excluded: bool = False

    @property
    def total_mvr_incidents(self) -> int:
        """Total MVR incidents (accidents + violations + suspensions + major).

        Returns:
            Sum of all incident counts
        """
        return (
            self.accidents +
            self.violations +
            self.suspensions +
            self.major_violations
        )

    @property
    def age(self) -> int:
        """Calculate current age from date of birth.

        Returns:
            Age in years
        """
        today = date.today()
        return (
            today.year - self.dob.year -
            ((today.month, today.day) < (self.dob.month, self.dob.day))
        )

    def get_driver_factor_category(self) -> str:
        """Determine driver risk category.

        Returns:
            "excellent", "good", "average", "poor", or "declined"
        """
```

### ALSelection

Auto Liability coverage selection.

```python
@dataclass
class ALSelection:
    """Auto liability coverage selection."""

    limit: int  # e.g., 1000000 for $1M
    coverage_type: str  # "CSL" or "Split"

    def get_limit_display(self) -> str:
        """Format limit for display.

        Returns:
            "$1,000,000 CSL" or "$500,000/$1,000,000 Split"
        """
```

### Address

Physical address information.

```python
@dataclass
class Address:
    """Physical address."""

    street: str
    city: str
    state: str
    zip_code: str

    def __str__(self) -> str:
        """Format address for display.

        Returns:
            "123 Main St, City, ST 12345"
        """
```

### RatingResult

Complete rating calculation results.

```python
@dataclass
class RatingResult:
    """Results of premium calculation."""

    policy: Policy
    per_vehicle_breakdown: list[VehiclePremium]
    premium_subtotal: float
    fees: dict[str, float]
    taxes: dict[str, float]
    fees_total: float
    taxes_total: float
    al_total: float
    reconciliation: Reconciliation
    timestamp: datetime

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""

    def to_json(self, file_path: Path) -> None:
        """Export to JSON file."""

    def to_csv(self, file_path: Path) -> None:
        """Export to CSV file."""
```

---

## Rating Engine

### RatingEngine

Core calculation engine for premium rating.

**Location:** `src/rating/rating_engine.py`

```python
class RatingEngine:
    """Calculate auto liability premiums using factor-based rating."""

    def __init__(
        self,
        rating_tables: RatingTables,
        tax_calculator: TaxCalculator,
        min_premium_policy: float = 1000.0,
        min_premium_per_unit: float = 500.0
    ):
        """Initialize rating engine.

        Args:
            rating_tables: Loaded rating factors
            tax_calculator: Tax calculation utility
            min_premium_policy: Policy-level minimum
            min_premium_per_unit: Per-unit minimum rate
        """

    def calculate_premium(self, policy: Policy) -> RatingResult:
        """Calculate complete premium for policy.

        Args:
            policy: Validated policy object

        Returns:
            RatingResult with all calculations

        Raises:
            RatingError: Calculation failed
        """
```

**Rating Formula:**

```python
def _calculate_vehicle_premium(
    self,
    vehicle: Vehicle,
    policy: Policy,
    vehicle_idx: int,
    factors_accumulator: dict
) -> VehiclePremium:
    """Calculate premium for single vehicle.

    Formula:
        rate_per_unit = (
            base_al ×
            F_body_class ×
            F_radius ×
            F_driver ×
            F_limit
        )

        premium = max(rate_per_unit, min_per_unit) × units

    Args:
        vehicle: Vehicle to rate
        policy: Parent policy
        vehicle_idx: Index in vehicle list
        factors_accumulator: Dict to collect factors

    Returns:
        VehiclePremium with breakdown
    """
```

### FactorLookup

Look up rating factors from tables.

**Location:** `src/rating/factor_lookup.py`

```python
class FactorLookup:
    """Look up rating factors from loaded tables."""

    def __init__(self, rating_tables: RatingTables):
        """Initialize with rating tables."""

    def get_base_al(self, state: str, program: str) -> float:
        """Get base AL rate for state and program.

        Args:
            state: Two-letter state code
            program: "CW" or "SS"

        Returns:
            Base AL rate (e.g., 850.00)

        Raises:
            RatingError: State/program not found
        """

    def get_body_class_factor(self, body_class: str) -> float:
        """Get factor for vehicle body class.

        Args:
            body_class: e.g., "Van - Light"

        Returns:
            Factor (e.g., 1.15)
        """

    def get_radius_factor(self, radius: str) -> float:
        """Get factor for operating radius.

        Args:
            radius: e.g., "Local 0-50"

        Returns:
            Factor (e.g., 1.05)
        """

    def get_driver_factor(
        self,
        years_exp: float,
        mvr_incidents: int
    ) -> float:
        """Get factor for driver experience and MVR.

        Args:
            years_exp: Years of driving experience
            mvr_incidents: Total incidents count

        Returns:
            Factor (e.g., 1.02)
        """

    def get_limit_factor(self, limit: int) -> float:
        """Get factor for liability limit.

        Args:
            limit: Limit in dollars (e.g., 1000000)

        Returns:
            Factor (e.g., 1.08)
        """
```

### TaxCalculator

Calculate fees and taxes.

**Location:** `src/rating/tax_calculator.py`

```python
class TaxCalculator:
    """Calculate state-specific fees and taxes."""

    def __init__(self, tax_config: TaxConfig):
        """Initialize with tax configuration.

        Args:
            tax_config: State tax rules and rates
        """

    def calculate_fees(
        self,
        premium_subtotal: float,
        vehicle_count: int,
        state: str
    ) -> dict[str, float]:
        """Calculate all fees for policy.

        Args:
            premium_subtotal: AL premium before fees
            vehicle_count: Number of vehicles
            state: State code

        Returns:
            Dict with fee names and amounts
        """

    def calculate_taxes(
        self,
        premium_subtotal: float,
        fees: dict[str, float],
        state: str
    ) -> dict[str, float]:
        """Calculate all taxes for policy.

        Args:
            premium_subtotal: AL premium
            fees: Calculated fees
            state: State code

        Returns:
            Dict with tax names and amounts
        """
```

---

## PDF Processing

### PDFParser

Extract text from PDF files.

**Location:** `src/parsers/pdf_parser.py`

```python
class PDFParser:
    """Parse text from PDF files with OCR fallback."""

    def __init__(self, pdf_path: Path):
        """Initialize parser with PDF file.

        Args:
            pdf_path: Path to PDF file
        """

    def extract_text(self, use_ocr: bool = False) -> str:
        """Extract text from PDF.

        Tries in order:
        1. pdfplumber (fast, text-based PDFs)
        2. PyMuPDF (fallback for some PDFs)
        3. Tesseract OCR (image-based PDFs, if use_ocr=True)

        Args:
            use_ocr: Enable OCR as fallback

        Returns:
            Extracted text

        Raises:
            ParseError: Extraction failed
        """

    def extract_tables(self) -> list[list[list[str]]]:
        """Extract tables from PDF.

        Returns:
            List of tables, each table is list of rows
        """
```

### FieldExtractor

Extract structured data from PDF text.

**Location:** `src/parsers/field_extractor.py`

```python
class FieldExtractor:
    """Extract policy fields from PDF text."""

    def __init__(self, text: str, tables: list):
        """Initialize with extracted text and tables.

        Args:
            text: Full PDF text
            tables: Extracted tables
        """

    def extract_policy(self) -> Policy:
        """Extract complete policy from PDF.

        Returns:
            Validated Policy object

        Raises:
            ParseError: Required fields missing
            ValidationError: Invalid field values
        """

    def extract_insured_name(self) -> str:
        """Extract insured name using regex."""

    def extract_address(self) -> Address:
        """Extract insured address."""

    def extract_dates(self) -> tuple[date, date]:
        """Extract effective and expiration dates.

        Returns:
            (effective_date, expiration_date)
        """

    def extract_vehicles(self) -> list[Vehicle]:
        """Extract all vehicles from tables."""

    def extract_drivers(self) -> list[Driver]:
        """Extract all drivers from tables."""

    def extract_al_selection(self) -> ALSelection:
        """Extract AL coverage limit."""
```

---

## Data Loaders

### RatingTablesLoader

Load rating factors from Excel workbooks.

**Location:** `src/loaders/rating_tables_loader.py`

```python
class RatingTablesLoader:
    """Load rating tables from Excel workbooks."""

    def __init__(self, workbook_path: Path):
        """Initialize with workbook path.

        Args:
            workbook_path: Path to rating tables Excel file
        """

    def load(self) -> RatingTables:
        """Load all rating tables.

        Returns:
            RatingTables with all factors

        Raises:
            LoadError: Workbook format invalid
            SecurityError: Macro-enabled workbook detected
        """

    def _validate_workbook(self) -> None:
        """Validate workbook security and format.

        Raises:
            SecurityError: Macros detected (FR-047)
        """
```

### TaxConfigLoader

Load tax rates and fees from Excel.

**Location:** `src/loaders/tax_config_loader.py`

```python
class TaxConfigLoader:
    """Load tax configuration from Excel."""

    def __init__(self, workbook_path: Path):
        """Initialize with workbook path."""

    def load(self) -> dict[str, TaxConfig]:
        """Load tax configs for all states.

        Returns:
            Dict mapping state code to TaxConfig
        """
```

---

## Storage

### SQLite Database

**Location:** `src/storage/sqlite_store.py`

```python
def initialize_db(db_path: Path) -> None:
    """Initialize SQLite database with schema.

    Args:
        db_path: Path to database file
    """

def save_calculation(
    db_path: Path,
    result: RatingResult
) -> int:
    """Save calculation result to database.

    Args:
        db_path: Database path
        result: RatingResult to save

    Returns:
        Record ID
    """

def get_calculation(db_path: Path, calc_id: int) -> RatingResult:
    """Retrieve calculation by ID.

    Args:
        db_path: Database path
        calc_id: Calculation ID

    Returns:
        RatingResult

    Raises:
        NotFoundError: ID not found
    """

def list_calculations(
    db_path: Path,
    limit: int = 100,
    offset: int = 0
) -> list[dict]:
    """List recent calculations.

    Args:
        db_path: Database path
        limit: Maximum results
        offset: Pagination offset

    Returns:
        List of calculation summaries
    """
```

**Database Schema:**

```sql
CREATE TABLE calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL,
    policy_data TEXT NOT NULL,  -- JSON
    rating_result TEXT NOT NULL,  -- JSON
    reconciliation_status TEXT,
    al_total REAL,
    state TEXT,
    insured_name TEXT,
    pdf_path TEXT,
    UNIQUE(timestamp, pdf_path)
);

CREATE INDEX idx_timestamp ON calculations(timestamp DESC);
CREATE INDEX idx_state ON calculations(state);
CREATE INDEX idx_status ON calculations(reconciliation_status);
```

---

## Export Utilities

### JSON Exporter

**Location:** `src/exports/json_exporter.py`

```python
def export_json(
    result: RatingResult,
    output_path: Path,
    include_factors: bool = True
) -> None:
    """Export result to JSON file.

    Args:
        result: RatingResult to export
        output_path: Output file path
        include_factors: Include factor breakdown
    """
```

### CSV Exporter

**Location:** `src/exports/csv_exporter.py`

```python
def export_csv(
    result: RatingResult,
    output_path: Path
) -> None:
    """Export result to CSV file.

    Args:
        result: RatingResult to export
        output_path: Output file path
    """
```

### PDF Audit Generator

**Location:** `src/exports/pdf_generator.py`

```python
def generate_audit_pdf(
    result: RatingResult,
    output_path: Path
) -> None:
    """Generate audit report PDF.

    Args:
        result: RatingResult to document
        output_path: Output PDF path
    """
```

---

## CLI Interface

### Command-Line Arguments

**Location:** `src/main.py`

```python
def main() -> int:
    """Main entry point.

    Returns:
        Exit code (0=success, 1=error)
    """
    parser = argparse.ArgumentParser(
        description="Roman's Rater 4.21 - Auto Liability Rating"
    )

    parser.add_argument(
        "pdf_path",
        nargs="?",
        help="PDF file to process (CLI mode)"
    )

    parser.add_argument(
        "--ocr",
        action="store_true",
        help="Enable OCR for image-based PDFs"
    )

    parser.add_argument(
        "--output",
        type=Path,
        help="Output directory for exports"
    )

    parser.add_argument(
        "--format",
        choices=["text", "json", "csv"],
        default="text",
        help="Output format"
    )

    # ... more arguments
```

---

## Configuration

### Config File Format

**Location:** `data/config.json`

```json
{
  "min_premiums": {
    "policy": 1000.0,
    "per_unit": 500.0
  },
  "reconciliation_tolerance": 0.50,
  "ocr_confidence_threshold": 0.80,
  "gui": {
    "default_port": 8080,
    "auto_open_browser": false,
    "theme": "light"
  },
  "exports": {
    "default_format": "json",
    "include_factors": true,
    "timestamp_format": "%Y%m%d_%H%M%S",
    "output_directory": "data/exports"
  },
  "logging": {
    "level": "INFO",
    "file": "data/logs/romans-rater.log",
    "max_bytes": 10485760,
    "backup_count": 5
  }
}
```

### Config Loader

**Location:** `src/config.py`

```python
@dataclass
class Config:
    """Application configuration."""

    min_premium_policy: float
    min_premium_per_unit: float
    reconciliation_tolerance: float
    ocr_confidence_threshold: float
    # ... more fields

    @classmethod
    def load(cls, config_path: Path) -> "Config":
        """Load configuration from JSON file.

        Args:
            config_path: Path to config.json

        Returns:
            Config object
        """

    @classmethod
    def default(cls) -> "Config":
        """Create default configuration.

        Returns:
            Config with default values
        """
```

---

## Error Handling

### Custom Exceptions

**Location:** `src/exceptions.py`

```python
class RomansRaterError(Exception):
    """Base exception for all errors."""

class ParseError(RomansRaterError):
    """PDF parsing failed."""

class RatingError(RomansRaterError):
    """Premium calculation failed."""

class ValidationError(RomansRaterError):
    """Data validation failed."""

class LoadError(RomansRaterError):
    """Rating tables failed to load."""

class SecurityError(RomansRaterError):
    """Security validation failed (e.g., macros detected)."""

class NotFoundError(RomansRaterError):
    """Record not found in database."""
```

---

## Type Definitions

### Common Types

```python
from typing import TypeAlias

StateCode: TypeAlias = str  # Two-letter state code
Program: TypeAlias = str  # "CW" or "SS"
ReconciliationStatus: TypeAlias = str  # "MATCH" | "MISMATCH" | "NO_PRINTED_TOTAL"
```

---

## Version Information

**Current Version:** 4.21.0
**API Stability:** Stable
**Python Required:** 3.11+
**Last Updated:** January 2025

---

**Complete API Reference** | [Quick Start](quickstart.md) | [User Guide](user-guide.md) | [Testing Guide](testing-guide.md)
