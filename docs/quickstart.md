# Quick Start Guide

Get Roman's Rater 4.21 up and running in minutes.

## Table of Contents

1. [Installation](#installation)
2. [First Run](#first-run)
3. [Process Your First PDF](#process-your-first-pdf)
4. [Understanding Results](#understanding-results)
5. [Next Steps](#next-steps)

---

## Installation

### Option 1: Standalone Executable (Fastest)

**Windows:**
```bash
# 1. Download from GitHub Releases
# https://github.com/dmedina5/romans-rater/releases/latest

# 2. Extract ZIP file
# 3. Double-click romans-rater.exe
```

**macOS:**
```bash
# 1. Download from GitHub Releases
# 2. Extract tarball
tar -xzf romans-rater-macos.tar.gz

# 3. Run executable
./romans-rater
```

**Linux:**
```bash
# 1. Download from GitHub Releases
# 2. Extract tarball
tar -xzf romans-rater-linux.tar.gz

# 3. Make executable and run
chmod +x romans-rater
./romans-rater
```

### Option 2: From Source (Developers)

```bash
# 1. Clone repository
git clone https://github.com/dmedina5/romans-rater.git
cd romans-rater

# 2. Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run application
python src/main.py
```

---

## First Run

### Launch the Application

**GUI Mode (Default):**
```bash
# Standalone executable
./romans-rater

# From source
python src/main.py
```

The desktop interface will open in your default browser at `http://localhost:8080`.

**CLI Mode:**
```bash
# Process a PDF directly
./romans-rater path/to/quote.pdf

# With OCR for image-based PDFs
./romans-rater path/to/quote.pdf --ocr
```

### First-Time Setup

When you first launch Roman's Rater, you'll see the main interface with three sections:

1. **PDF Upload Area** - Drag & drop or click to upload
2. **Parsed Data Display** - Shows extracted policy information
3. **Results Panel** - Displays calculated premiums

**No configuration required!** Roman's Rater works offline with built-in rating tables.

---

## Process Your First PDF

### Step 1: Upload PDF

1. Click **"Upload PDF"** button or drag a CWIS quote PDF onto the upload area
2. Wait for parsing to complete (1-3 seconds)
3. Review the parsed data in the "Policy Information" section

### Step 2: Verify Extracted Data

The application automatically extracts:

**Policy Details:**
- Insured name and address
- Effective and expiration dates
- State and garaging address

**Vehicles:**
- VIN, year, make, model
- Body class (e.g., "Van - Light")
- Radius of operation (e.g., "Local 0-50")
- Vehicle value

**Drivers:**
- Name, license number, state
- Date of birth, years of experience
- MVR incidents (accidents, violations, suspensions)

**AL Selection:**
- Liability limit (e.g., $1,000,000)
- Coverage type (Combined Single Limit)

### Step 3: Calculate Premium

1. Review the parsed data for accuracy
2. Click **"Calculate Premium"** (or it calculates automatically)
3. View results in the "Rating Results" section

### Step 4: Review Results

The results panel shows:

```
Premium Breakdown
══════════════════════════════════════

Vehicle #1 - 2020 Ford Transit Van
  Rate per unit:           $1,250.00
  Units:                        6.00
  Premium:                 $7,500.00

Vehicle #2 - 2021 Chevrolet Express
  Rate per unit:           $1,100.00
  Units:                        4.50
  Premium:                 $4,950.00
──────────────────────────────────────
AL Premium Subtotal:       $12,450.00

Fees
──────────────────────────────────────
Policy Fee:                   $150.00
Per-Vehicle Fee:              $100.00
Fees Total:                   $250.00

Taxes
──────────────────────────────────────
SLT (Surplus Lines Tax):      $631.50
Stamp Tax:                     $31.58
Fire Marshal Fee:              $25.00
Taxes Total:                  $688.08
──────────────────────────────────────
AL Total:                  $13,388.08

Reconciliation
──────────────────────────────────────
Calculated Total:          $13,388.08
PDF Printed Total:         $13,388.00
Difference:                    $-0.08
Status:                    ✓ MATCH
```

### Step 5: Export Results

Click export options:
- **JSON**: Machine-readable format for integration
- **CSV**: Spreadsheet format for analysis
- **PDF**: Audit report with full calculation details

---

## Understanding Results

### Rate Calculation Formula

```
rate_per_unit = Base_AL
              × F_body_class
              × F_radius
              × F_driver
              × F_limit

Premium = rate_per_unit × units
```

### Key Concepts

**Units:**
- Represents vehicle count adjusted for usage
- Calculated from vehicle value and class
- Higher value vehicles = more units

**Factors:**
- **Base_AL**: State and program base rate (CW or SS)
- **F_body_class**: Vehicle type factor (van, truck, tractor)
- **F_radius**: Operating radius factor (local, intermediate, long haul)
- **F_driver**: Driver experience and MVR factor
- **F_limit**: Liability limit factor

**Minimum Premiums:**
- Per-unit minimum: $500
- Policy minimum: $1,000
- Enforced automatically

**Reconciliation:**
- Compares calculated total vs PDF printed total
- Tolerance: ±$0.50
- Status: MATCH, MISMATCH, or NO_PRINTED_TOTAL

---

## Next Steps

### Learn More

- **[User Guide](user-guide.md)** - Complete feature documentation
- **[API Reference](api-reference.md)** - Developer integration guide
- **[Testing Guide](testing-guide.md)** - Test suite documentation

### Common Tasks

**Process Multiple PDFs:**
```bash
# CLI mode processes one at a time
for pdf in quotes/*.pdf; do
    ./romans-rater "$pdf" --output results/
done
```

**Enable OCR for Image PDFs:**
1. Install Tesseract OCR:
   - Windows: https://github.com/UB-Mannheim/tesseract/wiki
   - macOS: `brew install tesseract`
   - Linux: `sudo apt install tesseract-ocr`

2. Use `--ocr` flag:
   ```bash
   ./romans-rater quote.pdf --ocr
   ```

**View Calculation History:**
- GUI: Click "History" tab
- Database: `data/calculations.db` (SQLite)
- Exports: `data/exports/` directory

### Troubleshooting

**PDF Parsing Fails:**
- Try with `--ocr` flag
- Ensure PDF is from CWIS system
- Check PDF is not password-protected

**Calculation Mismatch:**
- Verify rating tables are current (2025 edition)
- Check if state uses CW or SS program
- Review parsed data for extraction errors

**GUI Won't Start:**
- Check port 8080 is not in use
- Try different port: `romans-rater --port 8081`
- Check firewall settings

**Missing Rating Tables:**
- Standalone executables include tables
- Source installation: Place Excel files in `data/` directory
  - `2025_Cover_Whale_Rater_AL_only_version.xlsx`
  - `State_Taxes_and_Fees_2025.xlsx`

### Get Help

- **Issues**: https://github.com/dmedina5/romans-rater/issues
- **Documentation**: https://dmedina5.github.io/romans-rater/
- **Source Code**: https://github.com/dmedina5/romans-rater

---

**You're all set!** Roman's Rater is now ready to process CWIS quote PDFs and calculate AL premiums.
