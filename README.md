# Roman's Rater 4.21

**A browser-only, offline-first commercial auto liability insurance rating tool**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-4.21.0-purple.svg)](https://github.com/dmedina5/romans-rater)

## 🚀 Live Demo

**Access the application:** [https://dmedina5.github.io/romans-rater](https://dmedina5.github.io/romans-rater)

No installation required - runs entirely in your browser!

---

## 📋 Overview

Roman's Rater 4.21 is a specialized rating tool for commercial auto liability insurance that:

- **Parses CWIS Quote PDFs** to extract policy, vehicle, and driver data
- **Loads rating tables** from Excel workbooks (Cover Whale and Standard & Surplus)
- **Calculates AL base premiums** using dynamic program detection and factor chains
- **Applies state-specific taxes and fees** with admitted/non-admitted logic
- **Reconciles computed totals** against PDF-extracted values with tolerance checking
- **Exports audit reports** in JSON, CSV, and PDF formats

### Key Features

✅ **100% Browser-Only** - No backend, no servers, no data uploads
✅ **Offline-First** - Works without internet after initial load
✅ **Privacy-Focused** - All processing happens locally in your browser
✅ **Full Audit Trail** - Complete factor trace for transparency
✅ **WCAG AA Accessible** - Keyboard navigation, ARIA labels, screen reader support
✅ **Professional Reports** - Export to JSON, CSV, and branded PDF

---

## 🎯 Use Cases

- **Rate Validation** - Verify insurer-quoted premiums against rating tables
- **Audit Trail** - Generate detailed factor trace reports for compliance
- **Training** - Teach underwriters how rating factors are applied
- **Quality Assurance** - Compare multiple quotes for consistency
- **Documentation** - Export audit reports for underwriting files

---

## 🏃 Quick Start

### Option 1: Use GitHub Pages (Recommended)

Simply visit: **[https://dmedina5.github.io/romans-rater](https://dmedina5.github.io/romans-rater)**

### Option 2: Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dmedina5/romans-rater.git
   cd romans-rater
   ```

2. **Serve with a local web server:**
   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js http-server
   npx http-server -p 8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

> **Note:** You must use a web server (not `file://`) due to CORS restrictions with vendor libraries.

---

## 📖 How to Use

### Step 1: Upload Files

**Required:**
- One or more **CWIS Quote PDF(s)** (max 50MB each)
- **Cover Whale Rater Excel** (`2025 Cover Whale Rater Version 4.21.xlsx`)
- **State Taxes & Fees Excel** (`State Taxes and Fees 2025.xlsx`)

**Or** click **"Use Pre-loaded Tables"** to use embedded test data.

### Step 2: Parse PDFs

Click **"Parse PDFs"** to extract policy, vehicle, and driver data. The system will:
- Extract text from PDF pages
- Parse policy header (insured, dates, state)
- Extract vehicle schedule (VINs, classes, body types)
- Extract driver schedule (names, ages, experience, violations)
- Prompt for OCR if pages contain images

### Step 3: Load Rating Tables

Click **"Load Rating Tables"** to ingest Excel workbooks. The system will:
- Parse CW and SS rating tables by state
- Extract body class factors, radius factors, limit factors
- Load attribute bands (age, experience, MVR)
- Load state tax/fee rules

### Step 4: Calculate AL Base Premium

Navigate to the **"AL Base Rating"** tab:
- Select liability limit (pre-populated from PDF)
- Select radius bucket (pre-populated from PDF)
- Choose driver aggregation method (Mean, Worst, or Weighted)
- Click **"Recalculate Premium"**

The system will:
- Detect CW vs SS program automatically
- Apply factor chain: `Base × BodyClass × Radius × Limit × State × Driver`
- Display per-unit premiums and factor trace

### Step 5: Review Fees & Taxes

Navigate to the **"Fees & Taxes"** tab:
- Toggle admitted/non-admitted status
- Override broker fee if needed
- View itemized fee breakdown
- See taxable base and tax calculations

### Step 6: Review Results

Navigate to the **"Results"** tab to see:
- AL base premium calculation with factor breakdown
- Per-unit and per-driver details
- Full factor trace with calculation formula
- **Reconciliation** (if PDF has totals):
  - ✓ PASS / ⚠ WARNING / ✗ FAIL status
  - Component-by-component delta comparison
  - Tolerance checking (default ±$5.00)

### Step 7: Export Audit Report

Navigate to the **"Audit Export"** tab:
- **Export JSON** - Complete data for programmatic use
- **Export CSV** - Spreadsheet-friendly format
- **Export PDF** - Professional branded report

---

## 🏗️ Architecture

### Technology Stack

- **Vanilla JavaScript** (ES2020+) - No frameworks
- **PDF.js v3.11+** - Client-side PDF parsing
- **Tesseract.js v4.0+** - OCR for image-based PDFs
- **SheetJS v0.18+** - Excel workbook parsing
- **dayjs v1.11+** - Date manipulation
- **PapaParse v5.4+** - CSV generation
- **jsPDF v2.5+** - PDF report generation
- **Mocha/Chai** - Unit and integration testing

### File Structure

```
romans-rater/
├── index.html              # Main application entry point
├── assets/
│   ├── styles.css          # WCAG AA compliant styling
│   └── whale-glasses.svg   # Brand watermark
├── src/
│   ├── main.js             # Application bootstrap
│   ├── ui.js               # UI management and event handlers
│   ├── pdf-parse.js        # PDF text extraction and parsing
│   ├── ocr.js              # OCR fallback for image PDFs
│   ├── xlsx-ingest.js      # Excel workbook parsing
│   ├── program-map.js      # CW/SS program detection
│   ├── al-engine.js        # AL premium calculation
│   ├── fees-engine.js      # Taxes and fees calculation
│   ├── reconcile.js        # Computed vs PDF reconciliation
│   └── export.js           # JSON/CSV/PDF export
├── vendor/                 # Third-party libraries (bundled)
├── data/                   # Pre-baked JSON fallbacks
└── tests/
    ├── unit/               # Unit tests (180+ tests)
    └── integration/        # Integration tests
```

### Security & Privacy

**Content Security Policy (CSP):**
```html
default-src 'self';
script-src 'self' 'unsafe-inline';
worker-src 'self' blob:;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'none';
```

**Key Security Features:**
- ✅ No network requests after page load (`connect-src 'none'`)
- ✅ All data processing happens client-side
- ✅ No cookies, no tracking, no analytics
- ✅ No data sent to external servers
- ✅ All files stay on your device

---

## 🧪 Testing

### Run Unit Tests

Open in browser:
```
http://localhost:8000/tests/unit/runner.html
```

**Test Coverage:**
- PDF parsing (50+ tests)
- Excel ingestion (40+ tests)
- Program mapping (40+ tests)
- AL engine (50+ tests)
- Fees engine (40+ tests)
- Reconciliation (40+ tests)
- Export (30+ tests)

### Run Integration Tests

Open in browser:
```
http://localhost:8000/tests/integration/runner.html
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

**Open Source Libraries:**
- [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- [Tesseract.js](https://tesseract.projectnaptha.com/) by Naptha
- [SheetJS](https://sheetjs.com/) by SheetJS LLC
- [Day.js](https://day.js.org/) by iamkun
- [PapaParse](https://www.papaparse.com/) by Matt Holt
- [jsPDF](https://github.com/parallax/jsPDF) by James Hall

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/dmedina5/romans-rater/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dmedina5/romans-rater/discussions)

---

## 🗺️ Roadmap

**Completed (v4.21.0):**
- ✅ PDF parsing with OCR fallback
- ✅ Excel table ingestion (CW/SS)
- ✅ AL premium calculation
- ✅ Fees and taxes calculation
- ✅ Reconciliation with tolerance
- ✅ JSON/CSV/PDF export

**Future Enhancements:**
- 🔄 Support for additional states
- 🔄 Multi-policy batch processing
- 🔄 Historical rate comparisons
- 🔄 Custom factor overrides
- 🔄 Integration with rating systems APIs

---

## 📊 Project Stats

- **Lines of Code:** ~8,000
- **Test Coverage:** 180+ unit tests
- **Supported States:** 50+ (CW/SS combined)
- **File Size:** ~5MB (with vendor libraries)
- **Browser Support:** Chrome, Firefox, Safari, Edge (modern versions)

---

**Built with ❤️ for insurance professionals**

**Version:** 4.21.0
**Last Updated:** January 2025
