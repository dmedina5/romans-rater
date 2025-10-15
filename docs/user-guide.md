# User Guide

Complete guide to using Roman's Rater 4.21 for commercial auto liability insurance rating.

## Table of Contents

1. [Overview](#overview)
2. [GUI Mode](#gui-mode)
3. [CLI Mode](#cli-mode)
4. [Rating Process](#rating-process)
5. [Data Management](#data-management)
6. [Export and Audit](#export-and-audit)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Roman's Rater 4.21 is a desktop application that:
- Parses CWIS commercial auto quote PDFs
- Calculates AL premiums using state-specific rating factors
- Applies fees and taxes per state regulations
- Reconciles calculated totals against PDF printed values
- Provides audit trails for compliance

### Key Features

- **Dual-Mode**: GUI for interactive use, CLI for automation
- **Offline**: No network required - fully standalone
- **Multi-State**: Supports all 50 US states with CW/SS program selection
- **OCR Fallback**: Handles image-based PDFs with Tesseract
- **Audit Trail**: Complete calculation history in SQLite + JSON exports

---

## GUI Mode

### Launching the GUI

```bash
# Standalone executable
./romans-rater

# From source
python src/main.py

# Custom port
./romans-rater --port 8081

# Open in browser
./romans-rater --browser
```

The GUI opens at `http://localhost:8080` in your default browser.

### Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│ Roman's Rater 4.21                          [Settings] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Upload PDF                                      │  │
│  │  Drag & drop or click to select                 │  │
│  │  Supported: PDF files from CWIS                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Policy Information              [Recalculate]  │  │
│  │  ─────────────────────────────────────────────  │  │
│  │  Insured: ABC Trucking LLC                      │  │
│  │  State: TX    Program: CW                       │  │
│  │  Effective: 01/01/2025 - 01/01/2026            │  │
│  │                                                  │  │
│  │  Vehicles (2)                    [Edit] [Add]   │  │
│  │  • 2020 Ford Transit Van                        │  │
│  │  • 2021 Chevrolet Express                       │  │
│  │                                                  │  │
│  │  Drivers (3)                     [Edit] [Add]   │  │
│  │  • John Smith (15 yrs exp)                      │  │
│  │  • Jane Doe (8 yrs exp)                         │  │
│  │  • Bob Johnson (12 yrs exp)                     │  │
│  │                                                  │  │
│  │  Liability Limit: $1,000,000 CSL                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Rating Results                  [Export ▼]     │  │
│  │  ─────────────────────────────────────────────  │  │
│  │  AL Premium Subtotal:      $12,450.00          │  │
│  │  Fees Total:                  $250.00          │  │
│  │  Taxes Total:                 $688.08          │  │
│  │  ─────────────────────────────────────────────  │  │
│  │  AL Total:                 $13,388.08          │  │
│  │                                                  │  │
│  │  Reconciliation: ✓ MATCH ($-0.08)               │  │
│  │                                                  │  │
│  │  [View Breakdown] [View Factors] [View Audit]   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Process New PDF]  [History]  [Settings]  [Help]      │
└─────────────────────────────────────────────────────────┘
```

### Workflow

#### 1. Upload PDF

**Drag & Drop:**
- Drag a PDF file onto the upload area
- File is automatically parsed

**Click to Browse:**
- Click "Upload PDF" button
- Select file from file picker
- File is automatically parsed

**Status Messages:**
```
⏳ Parsing PDF...
✓ PDF parsed successfully
⚠ OCR recommended - click to enable
❌ Parse failed - check file format
```

#### 2. Review Parsed Data

After upload, verify extracted information:

**Policy Section:**
- Insured name and address
- Effective/expiration dates
- State (determines CW/SS program)
- Garaging address

**Vehicles Section:**
Each vehicle shows:
- VIN (last 4 digits visible)
- Year, make, model
- Body class (e.g., "Van - Light")
- Radius (e.g., "Local 0-50 miles")
- Vehicle value
- Calculated units

**Edit if needed:**
- Click **[Edit]** button next to vehicle
- Modify fields in popup dialog
- Click **[Save]** to update

**Add vehicles:**
- Click **[Add]** button
- Fill in all required fields
- Vehicle is added to list

**Drivers Section:**
Each driver shows:
- Name
- License state and number
- Years of experience
- MVR incidents count

**Edit/Add drivers:**
- Similar to vehicles
- Update experience or incidents
- Add additional drivers

**AL Selection:**
- Liability limit (dropdown)
- Coverage type (CSL or Split)
- Automatically updates calculation

#### 3. Calculate Premium

**Automatic Calculation:**
- Triggers on PDF upload
- Triggers on any data change
- Triggers on recalculate click

**Manual Recalculation:**
- Click **[Recalculate]** button
- Useful after manual edits
- Updates results instantly

#### 4. View Results

**Summary View (Default):**
```
AL Premium Subtotal:  $12,450.00
Fees Total:              $250.00
Taxes Total:             $688.08
────────────────────────────────
AL Total:            $13,388.08

Reconciliation: ✓ MATCH ($-0.08)
```

**Breakdown View:**
```
Vehicle Premiums
────────────────────────────────
Vehicle #1: 2020 Ford Transit Van
  Rate per unit:      $1,250.00
  × Units:                 6.00
  = Premium:          $7,500.00

Vehicle #2: 2021 Chevrolet Express
  Rate per unit:      $1,100.00
  × Units:                 4.50
  = Premium:          $4,950.00
────────────────────────────────
Subtotal:           $12,450.00

Fees
────────────────────────────────
Policy Fee:            $150.00
Per-Vehicle Fee (×2):  $100.00
────────────────────────────────
Fees Total:            $250.00

Taxes
────────────────────────────────
Taxable Base:       $12,600.00
SLT (5.0%):            $631.50
Stamp (0.25%):          $31.58
Fire Marshal:           $25.00
────────────────────────────────
Taxes Total:           $688.08
```

**Factor View:**
```
Rating Factors - Vehicle #1
────────────────────────────────
Base AL (TX, CW):        $850.00
× Body Class (Van):        1.15
× Radius (Local):          1.05
× Driver (Best):           1.02
× Limit ($1M CSL):         1.08
────────────────────────────────
Rate per unit:         $1,250.45
```

#### 5. Export Results

Click **[Export ▼]** dropdown:

**JSON Export:**
- Machine-readable format
- Complete calculation data
- Suitable for integration
- File: `export_YYYYMMDD_HHMMSS.json`

**CSV Export:**
- Spreadsheet format
- One row per vehicle
- Includes all factors
- File: `export_YYYYMMDD_HHMMSS.csv`

**PDF Audit Report:**
- Professional audit document
- Complete calculation breakdown
- Factor justification
- Reconciliation details
- File: `audit_YYYYMMDD_HHMMSS.pdf`

All exports saved to: `data/exports/`

---

## CLI Mode

### Basic Usage

```bash
# Process single PDF
./romans-rater quote.pdf

# With OCR
./romans-rater quote.pdf --ocr

# Save output to file
./romans-rater quote.pdf --output results/

# JSON output format
./romans-rater quote.pdf --format json

# Quiet mode (errors only)
./romans-rater quote.pdf --quiet
```

### Command-Line Options

```
Usage: romans-rater [OPTIONS] [PDF_PATH]

Options:
  --ocr              Enable OCR for image-based PDFs
  --output DIR       Save results to directory (default: data/exports/)
  --format FORMAT    Output format: text, json, csv (default: text)
  --port PORT        GUI port (default: 8080)
  --browser          Auto-open browser in GUI mode
  --quiet            Suppress informational output
  --verbose          Verbose logging
  --version          Show version and exit
  --help             Show this message and exit

Examples:
  romans-rater                        Launch GUI
  romans-rater quote.pdf              Process PDF in CLI mode
  romans-rater quote.pdf --ocr        Use OCR for image PDF
  romans-rater quote.pdf --format json  JSON output
```

### CLI Output Format

**Text Format (Default):**
```
Roman's Rater 4.21 - CLI Mode
══════════════════════════════════════

Processing: quote.pdf
Status: ✓ Parsed successfully

Policy Information
──────────────────────────────────────
Insured:     ABC Trucking LLC
State:       TX
Program:     CW
Effective:   01/01/2025 - 01/01/2026

Vehicles: 2
Drivers: 3
Limit: $1,000,000 CSL

Rating Results
──────────────────────────────────────
AL Premium Subtotal:  $12,450.00
Fees Total:              $250.00
Taxes Total:             $688.08
──────────────────────────────────────
AL Total:            $13,388.08

Reconciliation
──────────────────────────────────────
Calculated:          $13,388.08
PDF Printed:         $13,388.00
Difference:              $-0.08
Status:              ✓ MATCH

Export: data/exports/export_20250114_143022.json
```

**JSON Format:**
```json
{
  "timestamp": "2025-01-14T14:30:22Z",
  "pdf_path": "quote.pdf",
  "policy": {
    "insured_name": "ABC Trucking LLC",
    "state": "TX",
    "program": "CW",
    "effective_date": "2025-01-01",
    "expiration_date": "2026-01-01"
  },
  "vehicles": [
    {
      "vin": "1FTYR14U8YPA12345",
      "year": 2020,
      "make": "Ford",
      "model": "Transit Van",
      "body_class": "Van - Light",
      "radius": "Local 0-50",
      "value": 45000.00,
      "units": 6.00
    }
  ],
  "rating_result": {
    "premium_subtotal": 12450.00,
    "fees_total": 250.00,
    "taxes_total": 688.08,
    "al_total": 13388.08
  },
  "reconciliation": {
    "calculated_total": 13388.08,
    "printed_total": 13388.00,
    "difference": -0.08,
    "status": "MATCH"
  }
}
```

### Batch Processing

**Process Multiple PDFs:**
```bash
# Loop through directory
for pdf in quotes/*.pdf; do
    ./romans-rater "$pdf" --output results/ --format json
done

# With parallel processing (GNU parallel)
parallel ./romans-rater {} --output results/ ::: quotes/*.pdf

# Filter results
./romans-rater quote.pdf --format json | jq '.rating_result.al_total'
```

### Exit Codes

- `0` - Success
- `1` - Parse error
- `2` - Rating error
- `3` - Invalid arguments
- `4` - File not found

---

## Rating Process

### State and Program Selection

**Automatic Detection:**
- State extracted from policy address
- Program (CW or SS) selected based on state

**CW States (Cover Whale):**
Most states including TX, CA, FL, NY, etc.

**SS States (Specialty Solutions):**
Limited to specific states with alternate programs.

**Override:**
Not available in current version - uses state-based rules.

### Factor Lookup

#### Base AL Factor
- State-specific base rate
- Separate CW and SS tables
- Found in rating tables workbook

#### Body Class Factor
Vehicle type determines factor:
- **Van - Light**: 1.15
- **Van - Medium**: 1.25
- **Truck - Light**: 1.20
- **Truck - Medium**: 1.35
- **Truck - Heavy**: 1.50
- **Tractor**: 1.75

#### Radius Factor
Operating range:
- **Local (0-50 miles)**: 1.05
- **Intermediate (51-200 miles)**: 1.20
- **Long Haul (200+ miles)**: 1.45

#### Driver Factor
Based on experience and MVR:
- Clean MVR, 10+ years: 1.00 (best)
- Clean MVR, 5-9 years: 1.05
- Clean MVR, <5 years: 1.15
- 1-2 incidents: 1.25
- 3+ incidents: 1.50 or declined

**MVR Incidents:**
- Accidents (at-fault)
- Violations (speeding, etc.)
- Suspensions
- Major violations (DUI, etc.)

#### Limit Factor
Liability coverage limit:
- **$1,000,000 CSL**: 1.00 (base)
- **$500,000 CSL**: 0.85
- **$2,000,000 CSL**: 1.25
- **$5,000,000 CSL**: 1.75

### Units Calculation

```
units = vehicle_value / 7500

Examples:
  $30,000 vehicle → 4.0 units
  $45,000 vehicle → 6.0 units
  $60,000 vehicle → 8.0 units
```

### Minimum Premium Enforcement

**Per-Unit Minimum:**
```
if rate_per_unit < $500:
    rate_per_unit = $500
```

**Policy Minimum:**
```
if total_premium < $1000:
    total_premium = $1000
```

### Fees Calculation

**Policy Fee:**
- Flat fee per policy
- State-specific
- Example: $150

**Per-Vehicle Fee:**
- Charged per vehicle
- State-specific
- Example: $50 per vehicle

### Tax Calculation

**Surplus Lines Tax (SLT):**
```
slt = (premium_subtotal + taxable_fees) × slt_rate
```

**Stamp Tax:**
```
stamp = (premium_subtotal + taxable_fees) × stamp_rate
```

**Fire Marshal Fee:**
- Fixed or percentage-based
- State-specific

**Other Fees:**
- State-specific additional fees
- Example: Municipal tax

### Reconciliation

**Process:**
1. Extract printed total from PDF
2. Calculate difference: `calculated - printed`
3. Compare to tolerance (±$0.50)

**Results:**
- **MATCH**: Within tolerance
- **MISMATCH**: Outside tolerance, requires review
- **NO_PRINTED_TOTAL**: PDF didn't contain printed total

---

## Data Management

### Calculation History

**Database Storage:**
- Location: `data/calculations.db`
- Format: SQLite3
- Schema: See [API Reference](api-reference.md)

**View History (GUI):**
1. Click **[History]** tab
2. Browse previous calculations
3. Filter by date, state, status
4. Click entry to view details

**View History (CLI):**
```bash
# Query database
sqlite3 data/calculations.db "SELECT * FROM calculations ORDER BY timestamp DESC LIMIT 10;"
```

### Rating Tables

**Location:**
- Standalone: Built-in (embedded)
- Source: `data/` directory

**Files:**
- `2025_Cover_Whale_Rater_AL_only_version.xlsx`
- `State_Taxes_and_Fees_2025.xlsx`

**Update Tables:**
1. Obtain new rating tables (Excel format)
2. Replace files in `data/` directory
3. Restart application
4. Verify version in Settings

### Export Management

**Export Location:**
```
data/exports/
├── export_20250114_143022.json
├── export_20250114_143045.csv
├── audit_20250114_143101.pdf
└── ...
```

**Naming Convention:**
```
[type]_YYYYMMDD_HHMMSS.[ext]
```

**Cleanup:**
```bash
# Remove exports older than 90 days
find data/exports -name "*.json" -mtime +90 -delete
```

---

## Export and Audit

### JSON Export Structure

```json
{
  "metadata": {
    "export_timestamp": "2025-01-14T14:30:22Z",
    "rater_version": "4.21.0",
    "pdf_source": "quote.pdf"
  },
  "policy": { ... },
  "vehicles": [ ... ],
  "drivers": [ ... ],
  "al_selection": { ... },
  "rating_breakdown": {
    "per_vehicle": [
      {
        "vehicle_index": 0,
        "factors": {
          "base_al": 850.00,
          "body_class": 1.15,
          "radius": 1.05,
          "driver": 1.02,
          "limit": 1.08
        },
        "rate_per_unit": 1250.45,
        "units": 6.00,
        "premium": 7502.70
      }
    ],
    "premium_subtotal": 12450.00,
    "fees": { ... },
    "taxes": { ... },
    "al_total": 13388.08
  },
  "reconciliation": { ... }
}
```

### CSV Export Structure

```csv
Timestamp,Insured,State,Program,Vehicle,BodyClass,Radius,Driver,Limit,RatePerUnit,Units,Premium,AL_Total,Reconciliation
2025-01-14 14:30:22,ABC Trucking LLC,TX,CW,2020 Ford Transit Van,Van - Light,Local 0-50,1.02,$1M CSL,1250.45,6.00,7502.70,13388.08,MATCH
```

### PDF Audit Report

**Contents:**
1. **Cover Page**
   - Title, date, policy info
   - Calculation summary

2. **Policy Information**
   - Insured details
   - Coverage period
   - State and program

3. **Vehicle Details**
   - Complete vehicle list
   - Units calculation for each

4. **Driver Details**
   - Driver information
   - MVR history
   - Experience summary

5. **Rating Breakdown**
   - Factor-by-factor calculation
   - Intermediate results
   - Minimum premium applications

6. **Fees and Taxes**
   - Itemized fees
   - Tax calculations with rates
   - State-specific rules applied

7. **Reconciliation**
   - Calculated vs printed comparison
   - Difference explanation
   - Status determination

8. **Appendix**
   - Factor tables used
   - Rating rules applied
   - Regulatory references

---

## Advanced Features

### OCR Configuration

**Enable OCR:**
```bash
# CLI
./romans-rater quote.pdf --ocr

# GUI
Settings → Enable OCR by default
```

**Confidence Threshold:**
- Default: 80%
- Adjustable in config.json
- Lower = more permissive, higher = stricter

**Tesseract Configuration:**
```bash
# Check Tesseract version
tesseract --version

# Test OCR on image
tesseract test.png output
```

### Custom Configuration

**File:** `data/config.json`

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
    "auto_open_browser": false
  },
  "exports": {
    "default_format": "json",
    "include_factors": true,
    "timestamp_format": "%Y%m%d_%H%M%S"
  }
}
```

### Integration Examples

**Python API:**
```python
from src.main import RomansRater

# Initialize
rater = RomansRater(
    data_dir="data/",
    db_path="data/calculations.db",
    config_path="data/config.json"
)

# Rate PDF
result = rater.rate_pdf("quote.pdf", use_ocr=False)

# Access results
print(f"AL Total: ${result.al_total:.2f}")
print(f"Status: {result.reconciliation.status}")
```

**REST API (Future):**
```bash
# Not yet implemented
# Planned for v4.22

POST /api/v1/rate
Content-Type: multipart/form-data

{
  "pdf": <file>,
  "use_ocr": false
}
```

---

## Troubleshooting

### Common Issues

#### PDF Parsing Fails

**Symptoms:**
- "Parse error" message
- Missing or incorrect data
- Empty vehicle list

**Solutions:**
1. Try with OCR enabled
2. Verify PDF is from CWIS system
3. Check PDF is not password-protected
4. Ensure PDF is not corrupted

#### Reconciliation Mismatch

**Symptoms:**
- Status shows "MISMATCH"
- Difference > $0.50

**Solutions:**
1. Verify rating tables are current
2. Check extracted data for errors
3. Manually review vehicle data
4. Check for rounding differences
5. Verify state/program selection

#### GUI Port Conflict

**Symptoms:**
- "Port already in use" error
- GUI doesn't open

**Solutions:**
```bash
# Use different port
./romans-rater --port 8081

# Find process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process if needed
```

#### Missing Rating Tables

**Symptoms:**
- "Rating tables not found" error
- Calculation fails

**Solutions:**
1. Standalone: Reinstall executable
2. Source: Place Excel files in `data/` directory
3. Verify file names match exactly
4. Check file permissions

### Error Messages

| Message | Meaning | Solution |
|---------|---------|----------|
| `Parse error: No text extracted` | PDF is image-based or empty | Use `--ocr` flag |
| `Rating error: State not found` | State not in rating tables | Verify state code, update tables |
| `Validation error: Missing VIN` | Required field missing | Check PDF format, manually add |
| `Database error: Locked` | SQLite file in use | Close other instances |
| `Export error: Permission denied` | Cannot write to exports dir | Check directory permissions |

### Logging

**Enable Verbose Logging:**
```bash
# CLI
./romans-rater quote.pdf --verbose

# GUI
Settings → Enable debug logging
```

**Log Location:**
```
data/logs/romans-rater.log
```

**Log Format:**
```
2025-01-14 14:30:22 INFO Starting Roman's Rater 4.21
2025-01-14 14:30:23 INFO Loading rating tables...
2025-01-14 14:30:24 DEBUG Loaded 50 state base rates
2025-01-14 14:30:25 INFO Rating tables loaded successfully
```

### Getting Help

**Documentation:**
- Quick Start: [quickstart.md](quickstart.md)
- API Reference: [api-reference.md](api-reference.md)
- Testing Guide: [testing-guide.md](testing-guide.md)

**Support:**
- GitHub Issues: https://github.com/dmedina5/romans-rater/issues
- Discussions: https://github.com/dmedina5/romans-rater/discussions

**Report a Bug:**
1. Check existing issues first
2. Provide PDF sample (redact sensitive data)
3. Include error log snippet
4. Specify OS and version
5. Describe expected vs actual behavior

---

**Complete User Guide** | Version 4.21.0 | Last Updated: January 2025
