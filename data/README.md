# Sample Data Files for Roman's Rater

This directory contains sample Excel workbook files for testing the Roman's Rater application.

## Files

### 1. 2025 Cover Whale Rater AL only version.xlsx

Contains rating plan data and attribute lookup tables with 5 sheets:

- **Rating Plan by State**: Maps states to programs (CW or SS)
  - 8 states included: FL, CA, TX, AL, AZ, GA, NC, TN

- **AL SS Tables**: Body/class/business-class factors for SS program states
  - 13 sample rows covering various vehicle configurations
  - Columns: state, body_type, class, business_class, factor

- **AL CW Tables**: Body/class/business-class factors for CW program states
  - 11 sample rows covering various vehicle configurations
  - Columns: state, body_type, class, business_class, factor

- **Attribute Lookups**: Driver attribute lookup tables
  - Age bands (6 categories from 18+ with factors)
  - Experience bands (5 categories with factors)
  - MVR bands (5 categories based on violation count with factors)

- **Attribute Calculations**: Formula definitions for composite calculations

### 2. State Taxes and Fees 2025.xlsx

Contains state tax and fee data with 1 sheet:

- **Taxes and Fees**: Tax percentages and fees by state
  - 8 states included: FL, CA, TX, AL, AZ, GA, NC, TN
  - Columns:
    - state: 2-letter state code
    - slt_pct: Surplus lines tax percentage (decimal format)
    - stamp_pct: Stamp tax percentage (decimal format)
    - fire_marshal_fee: Flat fee amount
    - admitted: TRUE/FALSE indicator

## Regenerating Files

To regenerate these sample files, run:

```bash
source venv/bin/activate
python generate_sample_data.py
```

To verify the file structure:

```bash
source venv/bin/activate
python verify_sample_data.py
```

## Data Characteristics

- **Programs**:
  - SS (Standard State): FL, CA, AZ, GA, TN
  - CW (Cover Whale): TX, AL, NC

- **Body Types**: TRACTOR, STRAIGHT

- **Classes**: Class6, Class7, Class8

- **Business Classes**: AUTOHAULER, GENERAL

- **Factors**: Realistic multipliers ranging from 0.70 to 2.35

- **Taxes**: Representative percentages and fees for each state
