# Roman's Rater 4.21 - Usage Guide

## Overview

Roman's Rater 4.21 is an auto liability insurance rating engine that calculates premiums from quote PDFs. It supports both **GUI** (desktop) and **CLI** (command-line) modes.

## Installation

```bash
# Navigate to project directory
cd romans-rater

# Install dependencies
pip install -r requirements.txt

# Install package in development mode
pip install -e .
```

## Usage Modes

### 1. GUI Mode (Recommended)

Launch the desktop application with a graphical interface:

```bash
# Default mode - just run with no arguments
romans-rater

# Or explicitly request GUI
romans-rater --gui

# Or run as Python module
python -m src.main
```

#### GUI Features:

- **File Upload**: Drag-and-drop or browse to select quote PDFs
- **OCR Support**: Checkbox to enable OCR for image-based PDFs
- **Live Results**: Real-time display of calculation results
- **Policy Details**: Expandable sections showing all extracted data
- **Premium Breakdown**: Per-vehicle and total premium calculations
- **Reconciliation**: Automatic comparison with printed totals
- **Export**: One-click JSON export of results
- **Settings**: Configurable minimum premiums and tolerances
- **History**: Access to previous calculations (via database)

#### GUI Workflow:

1. **Launch Application**
   ```bash
   romans-rater
   ```

2. **Upload PDF**
   - Click "Select PDF" button
   - Choose your quote PDF file
   - Check "Use OCR" if the PDF is image-based

3. **Process**
   - Click "Process Quote"
   - Wait for calculation (typically 5-15 seconds)

4. **View Results**
   - Review policy information
   - Check premium breakdown
   - Verify reconciliation status
   - Expand "Intermediate Factors" for detailed calculations

5. **Export (Optional)**
   - Click "Export JSON" to save results
   - Files saved to ~/Downloads/

### 2. CLI Mode (Advanced)

Use command-line for batch processing or scripting:

```bash
# Basic usage
romans-rater quote.pdf

# With OCR for image-based PDFs
romans-rater quote.pdf --ocr

# Show help
romans-rater --help
```

#### CLI Output:

```
============================================================
Roman's Rater 4.21
Auto Liability Rating Engine
============================================================

Loading rating tables...
Loading tax configuration...
Initialization complete.

Processing: quote.pdf
============================================================

[1/5] Parsing PDF...
  ✓ Extracted 12453 characters, 3 tables

[2/5] Extracting policy data...
  ✓ Insured: ABC Trucking LLC
  ✓ State: CA
  ✓ Vehicles: 2
  ✓ Drivers: 3
  ✓ Printed total: $8,500.00

[3/5] Calculating premium...
  ✓ AL Premium Subtotal: $7,250.00

[4/5] Calculating fees and taxes...
  ✓ Fees Total: $225.00
  ✓ Taxes Total: $276.13
  ✓ AL Total: $7,751.13

  ✓ MATCH Reconciliation delta: $-0.25

[5/5] Saving results...
  ✓ Saved to database (ID: 42)
  ✓ Exported to: calculation_20250114_143022.json

============================================================
Rating complete!

Final Results:
  AL Premium Subtotal:  $    7,250.00
  Fees Total:           $      225.00
  Taxes Total:          $      276.13
  ----------------------------------------
  AL Total:             $    7,751.13

  Reconciliation Delta: $       -0.25
  Status:                       match
```

## Configuration

Edit `data/config.json` to customize settings:

```json
{
  "min_premiums": {
    "policy": 1000.0,
    "per_unit": 500.0
  },
  "reconciliation_tolerance": 0.50,
  "ocr_confidence_threshold": 0.80,
  "ui": {
    "primary_color": "#7E369F",
    "title": "Roman's Rater 4.21"
  }
}
```

### Configuration Options:

- **min_premiums.policy**: Minimum total policy premium ($)
- **min_premiums.per_unit**: Minimum per-vehicle premium ($)
- **reconciliation_tolerance**: Acceptable difference from printed total ($)
- **ocr_confidence_threshold**: Minimum OCR confidence (0-1, default 0.80)
- **ui.primary_color**: GUI primary color (hex)

## Data Requirements

Place these Excel files in the `data/` directory:

1. **2025 Cover Whale Rater AL only version.xlsx**
   - Rating Plan by State
   - AL SS Tables
   - AL CW Tables
   - Attribute Lookups

2. **State Taxes and Fees 2025.xlsx**
   - State tax configurations
   - SLT and Stamp percentages
   - Fee taxability rules

## Database

All calculations are automatically saved to `data/calculations.db` (SQLite).

### Query Database:

```bash
sqlite3 data/calculations.db

# View recent calculations
SELECT id, timestamp, al_total FROM calculations
ORDER BY timestamp DESC LIMIT 10;

# Count total calculations
SELECT COUNT(*) FROM calculations;
```

## Exports

### JSON Export Format:

```json
{
  "id": 42,
  "timestamp": "2025-01-14T14:30:22.123456",
  "policy": {
    "insured_name": "ABC Trucking LLC",
    "state": "CA",
    "effective_date": "2025-01-01",
    "expiration_date": "2026-01-01"
  },
  "vehicles": [
    {"vin": "1HGBH41JXMN109186", "class": "Class8"}
  ],
  "drivers": [
    {"name": "John Smith"}
  ],
  "al_selection": {
    "limit": "1000000/2000000",
    "radius": "0-50"
  },
  "factors": {...},
  "premium_subtotal": 7250.00,
  "fees_total": 225.00,
  "taxes_total": 276.13,
  "al_total": 7751.13,
  "reconciliation_delta": -0.25,
  "reconciliation_status": "match",
  "metadata": {
    "program": "CW",
    "edition_code": "2025-01",
    "pdf_file": "quote.pdf"
  }
}
```

## Troubleshooting

### GUI won't launch

```bash
# Verify NiceGUI is installed
pip install nicegui

# Try CLI mode instead
romans-rater quote.pdf
```

### PDF parsing fails

```bash
# For image-based PDFs, enable OCR
romans-rater quote.pdf --ocr

# Verify Tesseract is installed
tesseract --version
```

### Rating tables not found

```bash
# Check files exist
ls -l data/*.xlsx

# Verify file names match exactly:
#   - 2025 Cover Whale Rater AL only version.xlsx
#   - State Taxes and Fees 2025.xlsx
```

### Low OCR confidence

If you see "OCR confidence too low" errors:
- Improve PDF quality (higher resolution scan)
- Clean up image artifacts
- Try different PDF export settings
- Adjust threshold in config.json (minimum 0.60)

## Examples

### Batch Processing (CLI)

```bash
# Process multiple PDFs
for pdf in quotes/*.pdf; do
  romans-rater "$pdf"
done

# Process with error handling
for pdf in quotes/*.pdf; do
  echo "Processing: $pdf"
  romans-rater "$pdf" || echo "Failed: $pdf"
done
```

### Export All Calculations

```bash
sqlite3 data/calculations.db <<EOF
.mode json
.output all_calculations.json
SELECT * FROM calculations;
.quit
EOF
```

## Support

For issues or questions:
1. Check this guide
2. Review error messages carefully
3. Verify data files are present and correct
4. Check database for previous calculations
5. Contact support

## Version

**Roman's Rater 4.21**
Edition: 2025-01
Mode: Offline (no internet required)
