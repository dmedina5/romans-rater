# Testing Guide

Comprehensive testing documentation for Roman's Rater 4.21.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Test Coverage](#test-coverage)
5. [Unit Tests](#unit-tests)
6. [Integration Tests](#integration-tests)
7. [Fixtures and Test Data](#fixtures-and-test-data)
8. [Writing New Tests](#writing-new-tests)
9. [Continuous Integration](#continuous-integration)
10. [Performance Testing](#performance-testing)

---

## Overview

Roman's Rater 4.21 has a comprehensive test suite with 73 test cases covering all major features.

### Test Statistics

- **Total Tests**: 73
- **Test Coverage**: 85%
- **Test Files**: 8
- **Test Framework**: pytest
- **Coverage Tool**: pytest-cov

### Test Categories

1. **Unit Tests** (60 tests)
   - Models validation
   - Rating engine calculations
   - Factor lookups
   - Tax calculations
   - PDF parsing
   - Data loading

2. **Integration Tests** (13 tests)
   - End-to-end PDF processing
   - Database operations
   - Export functionality
   - CLI interface

---

## Running Tests

### Quick Start

```bash
# Run all tests
pytest

# With verbose output
pytest -v

# Run specific test file
pytest tests/test_rating_engine.py

# Run specific test
pytest tests/test_rating_engine.py::test_calculate_premium

# Stop on first failure
pytest -x

# Show print statements
pytest -s
```

### With Coverage

```bash
# Run with coverage report
pytest --cov=src

# Generate HTML coverage report
pytest --cov=src --cov-report=html

# Open coverage report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows

# Coverage with missing lines
pytest --cov=src --cov-report=term-missing
```

### Specific Test Categories

```bash
# Unit tests only
pytest tests/ -k "not integration"

# Integration tests only
pytest tests/ -k "integration"

# Tests for specific module
pytest tests/test_models.py

# Tests matching pattern
pytest -k "test_vehicle"
```

### Parallel Execution

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel (4 workers)
pytest -n 4

# Auto-detect CPU count
pytest -n auto
```

---

## Test Structure

### Directory Layout

```
tests/
├── conftest.py              # Shared fixtures
├── test_models.py           # Data model tests (26 tests)
├── test_rating_engine.py    # Rating engine tests (18 tests)
├── test_factor_lookup.py    # Factor lookup tests (8 tests)
├── test_tax_calculator.py   # Tax calculation tests (6 tests)
├── test_pdf_parser.py       # PDF parsing tests (5 tests)
├── test_loaders.py          # Data loader tests (4 tests)
├── test_integration.py      # End-to-end tests (6 tests)
└── fixtures/
    ├── sample_quote.pdf     # Test PDF
    ├── rating_tables.xlsx   # Test rating tables
    └── test_data.json       # Test data
```

### Test File Template

```python
"""Tests for [module name]."""
import pytest
from src.module import ClassName

def test_feature_name():
    """Test that [feature] works correctly."""
    # Arrange
    input_data = ...

    # Act
    result = function(input_data)

    # Assert
    assert result == expected
```

---

## Test Coverage

### Current Coverage by Module

| Module | Coverage | Lines | Missing |
|--------|----------|-------|---------|
| `src/models/` | 95% | 450 | 22 |
| `src/rating/` | 92% | 620 | 50 |
| `src/parsers/` | 78% | 380 | 84 |
| `src/loaders/` | 88% | 290 | 35 |
| `src/storage/` | 85% | 180 | 27 |
| `src/exports/` | 82% | 220 | 40 |
| `src/ui/` | 65% | 410 | 143 |
| **Total** | **85%** | **2,550** | **401** |

### Coverage Goals

- **Critical paths**: 95%+ (rating engine, calculations)
- **Data models**: 90%+ (validation, business logic)
- **Parsers**: 80%+ (many edge cases)
- **UI**: 60%+ (harder to test, lower priority)
- **Overall**: 85%+

---

## Unit Tests

### Model Tests

**File**: `tests/test_models.py` (26 tests)

```python
def test_vehicle_units_calculation(sample_vehicle):
    """Test that vehicle units are calculated correctly."""
    vehicle = sample_vehicle
    vehicle.value = 30000.0

    assert vehicle.units == 4.0  # 30000 / 7500

def test_driver_total_mvr_incidents(sample_driver):
    """Test MVR incident totaling."""
    driver = sample_driver
    driver.accidents = 2
    driver.violations = 1
    driver.suspensions = 1
    driver.major_violations = 0

    assert driver.total_mvr_incidents == 4

def test_policy_validation_missing_vehicles():
    """Test that policy validation catches missing vehicles."""
    policy = Policy(
        insured_name="Test",
        # ... other fields
        vehicles=[],  # Empty!
        drivers=[sample_driver]
    )

    with pytest.raises(ValidationError, match="at least one vehicle"):
        policy.validate()
```

### Rating Engine Tests

**File**: `tests/test_rating_engine.py` (18 tests)

```python
def test_calculate_premium_basic(sample_policy, sample_rating_tables):
    """Test basic premium calculation."""
    engine = RatingEngine(
        rating_tables=sample_rating_tables,
        tax_calculator=sample_tax_calculator
    )

    result = engine.calculate_premium(sample_policy)

    assert result.premium_subtotal > 0
    assert result.al_total > result.premium_subtotal
    assert len(result.per_vehicle_breakdown) == len(sample_policy.vehicles)

def test_minimum_premium_per_unit(sample_policy, sample_rating_tables):
    """Test that per-unit minimum is enforced."""
    engine = RatingEngine(
        rating_tables=sample_rating_tables,
        tax_calculator=sample_tax_calculator,
        min_premium_per_unit=5000.0  # High minimum
    )

    result = engine.calculate_premium(sample_policy)

    # All vehicles should have rate >= minimum
    for vehicle_premium in result.per_vehicle_breakdown:
        assert vehicle_premium.rate_per_unit >= 5000.0

def test_minimum_premium_policy(sample_policy, sample_rating_tables):
    """Test that policy minimum is enforced."""
    # Create policy with very low premium
    policy = create_low_premium_policy()

    engine = RatingEngine(
        rating_tables=sample_rating_tables,
        tax_calculator=sample_tax_calculator,
        min_premium_policy=1000.0
    )

    result = engine.calculate_premium(policy)

    assert result.premium_subtotal >= 1000.0
```

### Factor Lookup Tests

**File**: `tests/test_factor_lookup.py` (8 tests)

```python
def test_get_base_al_cw_program(sample_rating_tables):
    """Test base AL lookup for CW program."""
    lookup = FactorLookup(sample_rating_tables)

    base_al = lookup.get_base_al("TX", "CW")

    assert base_al == 850.00

def test_get_body_class_factor_van(sample_rating_tables):
    """Test body class factor for van."""
    lookup = FactorLookup(sample_rating_tables)

    factor = lookup.get_body_class_factor("Van - Light")

    assert factor == 1.15

def test_get_driver_factor_clean_mvr(sample_rating_tables):
    """Test driver factor for clean MVR."""
    lookup = FactorLookup(sample_rating_tables)

    factor = lookup.get_driver_factor(
        years_exp=15.0,
        mvr_incidents=0
    )

    assert factor == 1.00  # Best rating
```

### Tax Calculator Tests

**File**: `tests/test_tax_calculator.py` (6 tests)

```python
def test_calculate_slt(sample_tax_config):
    """Test SLT calculation."""
    calculator = TaxCalculator(sample_tax_config)

    slt = calculator.calculate_slt(
        taxable_base=10000.0,
        state="TX"
    )

    # TX SLT rate is 5.0%
    assert slt == 500.00

def test_calculate_taxes_complete(sample_tax_config):
    """Test complete tax calculation."""
    calculator = TaxCalculator(sample_tax_config)

    taxes = calculator.calculate_taxes(
        premium_subtotal=10000.0,
        fees={"policy_fee": 150.0},
        state="TX"
    )

    assert "slt" in taxes
    assert "stamp" in taxes
    assert "fire_marshal" in taxes
    assert taxes["slt"] > 0
```

---

## Integration Tests

**File**: `tests/test_integration.py` (6 tests)

### End-to-End PDF Processing

```python
def test_rate_pdf_complete_workflow(tmp_path):
    """Test complete PDF rating workflow."""
    # Setup
    rater = RomansRater(
        data_dir=Path("data"),
        db_path=tmp_path / "test.db"
    )

    # Execute
    result = rater.rate_pdf(
        pdf_path=Path("tests/fixtures/sample_quote.pdf"),
        use_ocr=False
    )

    # Verify
    assert result.policy.insured_name == "ABC Trucking LLC"
    assert len(result.policy.vehicles) == 2
    assert result.al_total > 0
    assert result.reconciliation.status in ["MATCH", "MISMATCH", "NO_PRINTED_TOTAL"]

def test_database_persistence(tmp_path):
    """Test that calculations are saved to database."""
    db_path = tmp_path / "test.db"
    initialize_db(db_path)

    # Save calculation
    calc_id = save_calculation(db_path, sample_result)

    # Retrieve
    retrieved = get_calculation(db_path, calc_id)

    assert retrieved.al_total == sample_result.al_total
    assert retrieved.policy.insured_name == sample_result.policy.insured_name

def test_export_json(tmp_path, sample_result):
    """Test JSON export."""
    output_path = tmp_path / "export.json"

    export_json(sample_result, output_path)

    assert output_path.exists()

    # Verify JSON is valid
    with open(output_path) as f:
        data = json.load(f)

    assert data["rating_result"]["al_total"] == sample_result.al_total
```

---

## Fixtures and Test Data

**File**: `tests/conftest.py`

### Shared Fixtures

```python
@pytest.fixture
def sample_address():
    """Create sample address."""
    return Address(
        street="123 Main St",
        city="Austin",
        state="TX",
        zip_code="78701"
    )

@pytest.fixture
def sample_vehicle():
    """Create sample vehicle."""
    return Vehicle(
        vin="1FTYR14U8YPA12345",
        year=2020,
        make="Ford",
        model="Transit Van",
        body_class="Van - Light",
        radius="Local 0-50",
        value=45000.0
    )

@pytest.fixture
def sample_driver():
    """Create sample driver."""
    return Driver(
        first_name="John",
        last_name="Smith",
        license_state="TX",
        license_no="12345678",
        dob=date(1980, 1, 1),
        years_exp=15.0,
        accidents=0,
        violations=0
    )

@pytest.fixture
def sample_al_selection():
    """Create sample AL selection."""
    return ALSelection(
        limit=1000000,
        coverage_type="CSL"
    )

@pytest.fixture
def sample_policy(sample_address, sample_vehicle, sample_driver, sample_al_selection):
    """Create sample policy."""
    return Policy(
        insured_name="ABC Trucking LLC",
        address=sample_address,
        effective_date=date(2025, 1, 1),
        expiration_date=date(2026, 1, 1),
        state="TX",
        vehicles=[sample_vehicle],
        drivers=[sample_driver],
        al_selection=sample_al_selection
    )

@pytest.fixture
def sample_rating_tables():
    """Load sample rating tables."""
    loader = RatingTablesLoader(Path("tests/fixtures/rating_tables.xlsx"))
    return loader.load()

@pytest.fixture
def sample_tax_config():
    """Load sample tax configuration."""
    loader = TaxConfigLoader(Path("tests/fixtures/tax_config.xlsx"))
    return loader.load()["TX"]
```

### Test Data Files

**Location**: `tests/fixtures/`

- `sample_quote.pdf` - Realistic CWIS quote PDF
- `rating_tables.xlsx` - Sample rating factors
- `tax_config.xlsx` - Sample tax rates
- `test_data.json` - Various test scenarios

---

## Writing New Tests

### Test Naming Convention

```python
# Good naming
def test_calculate_premium_with_multiple_vehicles():
    """Test premium calculation for policy with multiple vehicles."""

def test_validation_fails_for_missing_vin():
    """Test that validation catches missing VIN."""

# Bad naming
def test_1():
def test_stuff():
def test_it_works():
```

### Test Structure (AAA Pattern)

```python
def test_feature():
    """Test description."""
    # Arrange - Set up test data
    policy = create_test_policy()
    engine = RatingEngine(...)

    # Act - Execute the function
    result = engine.calculate_premium(policy)

    # Assert - Verify results
    assert result.al_total > 0
    assert result.reconciliation.status == "MATCH"
```

### Parametrized Tests

```python
@pytest.mark.parametrize("state,program,expected_base", [
    ("TX", "CW", 850.00),
    ("CA", "CW", 920.00),
    ("FL", "SS", 780.00),
])
def test_base_al_by_state(state, program, expected_base, sample_rating_tables):
    """Test base AL rates for different states."""
    lookup = FactorLookup(sample_rating_tables)

    base_al = lookup.get_base_al(state, program)

    assert base_al == expected_base
```

### Exception Testing

```python
def test_validation_error_for_invalid_vin():
    """Test that invalid VIN raises ValidationError."""
    vehicle = Vehicle(
        vin="INVALID",  # Too short
        # ... other fields
    )

    with pytest.raises(ValidationError, match="VIN must be 17 characters"):
        vehicle.validate()
```

### Mock Usage

```python
from unittest.mock import Mock, patch

def test_pdf_parser_with_mock():
    """Test PDF parser with mocked pdfplumber."""
    with patch('pdfplumber.open') as mock_open:
        mock_pdf = Mock()
        mock_page = Mock()
        mock_page.extract_text.return_value = "Sample text"
        mock_pdf.pages = [mock_page]
        mock_open.return_value.__enter__.return_value = mock_pdf

        parser = PDFParser(Path("test.pdf"))
        text = parser.extract_text()

        assert text == "Sample text"
```

---

## Continuous Integration

### GitHub Actions

**File**: `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.11', '3.12']

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

### Pre-commit Hooks

**File**: `.pre-commit-config.yaml`

```yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
```

---

## Performance Testing

### Benchmarking

```python
import time

def test_rating_performance(sample_policy, sample_rating_tables):
    """Test that rating completes within time limit."""
    engine = RatingEngine(sample_rating_tables, sample_tax_calculator)

    start = time.time()
    result = engine.calculate_premium(sample_policy)
    duration = time.time() - start

    # Should complete in under 100ms
    assert duration < 0.1

def test_pdf_parsing_performance():
    """Test PDF parsing speed."""
    parser = PDFParser(Path("tests/fixtures/sample_quote.pdf"))

    start = time.time()
    text = parser.extract_text()
    duration = time.time() - start

    # Should complete in under 2 seconds
    assert duration < 2.0
```

### Load Testing

```python
def test_concurrent_ratings(sample_policy, sample_rating_tables):
    """Test that engine handles concurrent requests."""
    from concurrent.futures import ThreadPoolExecutor

    engine = RatingEngine(sample_rating_tables, sample_tax_calculator)

    def rate():
        return engine.calculate_premium(sample_policy)

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(rate) for _ in range(100)]
        results = [f.result() for f in futures]

    # All calculations should succeed
    assert len(results) == 100
    assert all(r.al_total > 0 for r in results)
```

---

## Test Maintenance

### Running Tests Locally

```bash
# Before committing
pytest

# With coverage check
pytest --cov=src --cov-fail-under=85

# Quick smoke test
pytest -x --ff  # Stop on first failure, run failures first
```

### Updating Test Data

When rating tables change:

1. Update `tests/fixtures/rating_tables.xlsx`
2. Update expected values in tests
3. Run full test suite
4. Review failures and update assertions

### Debugging Failed Tests

```bash
# Run with debugger
pytest --pdb

# Show local variables on failure
pytest --showlocals

# Increase verbosity
pytest -vv
```

---

## Coverage Reports

### Generate Reports

```bash
# Terminal report
pytest --cov=src --cov-report=term-missing

# HTML report
pytest --cov=src --cov-report=html
open htmlcov/index.html

# XML report (for CI)
pytest --cov=src --cov-report=xml
```

### Coverage Badge

Add to README.md:

```markdown
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
```

---

## Best Practices

1. **Test First**: Write tests before implementation (TDD)
2. **One Assertion**: Focus each test on one behavior
3. **Clear Names**: Test names should describe what they test
4. **Fast Tests**: Keep tests fast (<100ms each)
5. **Independent**: Tests should not depend on each other
6. **Fixtures**: Use fixtures to avoid duplication
7. **Parametrize**: Use parametrize for similar tests
8. **Coverage**: Aim for 85%+ overall coverage
9. **CI**: Run tests on every commit
10. **Document**: Add docstrings to complex tests

---

**Complete Testing Guide** | [Quick Start](quickstart.md) | [User Guide](user-guide.md) | [API Reference](api-reference.md)
