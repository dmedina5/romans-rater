# Roman's Rater 4.21

**Offline Desktop Application for Commercial Auto Liability Insurance Rating**

Roman's Rater 4.21 is a desktop tool that parses CWIS quote PDFs, calculates premiums using state-specific rating factors (CW or SS programs), applies fees and taxes per state rules, and provides audit trails for compliance.

## Features

- **PDF Parsing**: Extract policy, vehicle, and driver data from CWIS quote PDFs
- **Rating Engine**: Calculate AL premiums using factor-based rating (Base_AL × F_state × F_vehicle × F_driver × F_limit)
- **Multi-State Support**: Handle 50 US states with program-specific (CW/SS) rating tables
- **Fees & Taxes**: Apply state-specific tax rates (SLT, Stamp, Fire Marshal)
- **Reconciliation**: Compare calculated totals against PDF printed values (±$0.50 tolerance)
- **Audit Trail**: Export calculations to JSON, CSV, and PDF formats
- **OCR Fallback**: Handle image-based PDFs with Tesseract OCR
- **Offline Operation**: No network dependencies - fully standalone

## Requirements

- **Python**: 3.11 or higher
- **Operating System**: Windows 10+, Linux (Ubuntu 20.04+), or macOS 12+
- **Data Files**:
  - `2025 Cover Whale Rater AL only version.xlsx`
  - `State Taxes and Fees 2025.xlsx`

## Installation

### Option 1: Standalone Executable (Recommended)

Download pre-built executables for your platform:

**Windows:**
```bash
# Download from GitHub Releases
# https://github.com/dmedina5/romans-rater/releases/latest

# Extract and run
romans-rater.exe
```

**macOS:**
```bash
# Download from GitHub Releases
# https://github.com/dmedina5/romans-rater/releases/latest

# Extract and run
./romans-rater
```

**Linux:**
```bash
# Download from GitHub Releases
# https://github.com/dmedina5/romans-rater/releases/latest

# Extract and run
chmod +x romans-rater
./romans-rater
```

**No Python installation required!** Executables include everything needed.

### Option 2: From Source

```bash
# Clone repository
git clone https://github.com/dmedina5/romans-rater.git
cd romans-rater

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (for OCR fallback)
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# macOS:
brew install tesseract

# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
```

### Option 3: Build Your Own Executable

See [BUILD.md](BUILD.md) for detailed instructions on building standalone executables for Windows, macOS, and Linux.

### Place Data Files

```bash
mkdir -p data
cp /path/to/2025_Cover_Whale_Rater_AL_only_version.xlsx data/
cp /path/to/State_Taxes_and_Fees_2025.xlsx data/
```

## Quick Start

```bash
# Run application
python src/main.py

# Or with installed package
romans-rater
```

## Usage

1. **Upload PDF**: Click "Upload PDF" to select a CWIS quote
2. **Review Parsed Data**: Verify extracted policy, vehicle, and driver information
3. **Calculate Premium**: Click "Recalculate" to run rating engine
4. **Review Results**: Check AL Total and reconciliation status
5. **Export**: Generate JSON, CSV, or audit PDF for compliance

See [docs/user_guide.md](docs/user_guide.md) for detailed workflows.

## Development

### Running Tests

```bash
# All tests
pytest

# Unit tests only
pytest tests/unit/

# Integration tests
pytest tests/integration/

# With coverage
pytest --cov=src --cov-report=html
```

### Type Checking

```bash
mypy src/
```

### Code Formatting

```bash
black src/
flake8 src/
```

### Building Executable

See [BUILD.md](BUILD.md) for complete instructions.

**Quick build:**
```bash
# Windows
build-windows.bat

# macOS
./build-macos.sh

# Linux
./build-linux.sh
```

Executables will be in `dist/` directory.

## Project Structure

```
romans-rater/
├── src/
│   ├── parsers/       # PDF parsing and OCR
│   ├── loaders/       # Excel workbook data loaders
│   ├── models/        # Domain entities
│   ├── rating/        # Rating engine (core logic)
│   ├── fees/          # Fees and taxes calculation
│   ├── exports/       # Export and audit generation
│   ├── storage/       # Local persistence
│   ├── ui/            # User interface (NiceGUI)
│   └── main.py        # Application entry point
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── fixtures/      # Test data
├── data/              # Excel workbooks and config
└── docs/              # Documentation
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
  "ocr_confidence_threshold": 0.80
}
```

## Architecture

- **Language**: Python 3.11+
- **UI**: NiceGUI (Python-native web framework)
- **PDF Processing**: pdfplumber, PyMuPDF, pytesseract
- **Data Loading**: openpyxl, pandas
- **Storage**: SQLite3 (local database)
- **Packaging**: PyInstaller (standalone executable)

## License

MIT License - See LICENSE file for details

## Support

For issues, feature requests, or questions, please open an issue in the repository.

## Documentation

- [User Guide](docs/user_guide.md) - Complete usage instructions
- [Specification](specs/001-roman-s-rater/spec.md) - Detailed requirements
- [Technical Plan](specs/001-roman-s-rater/plan.md) - Architecture and design
- [Quickstart](specs/001-roman-s-rater/quickstart.md) - Development workflows

---

**Version**: 4.21.0
**Status**: MVP Foundation Complete
