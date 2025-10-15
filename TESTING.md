# Roman's Rater 4.21 - Testing Guide

## Test Suite Overview

The test suite provides comprehensive coverage of all core functionality using pytest.

### Statistics
- **Test Files**: 7
- **Total Test Cases**: 73
- **Lines of Test Code**: ~1,121
- **Fixtures**: 15+ shared fixtures
- **Test Markers**: unit, integration, slow

## Running Tests

### Install Test Dependencies

```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run only fast unit tests
pytest tests/ -m unit

# Run integration tests
pytest tests/ -m integration
```

### Run Specific Test Files

```bash
# Test models only
pytest tests/test_models.py -v

# Test rating engine only
pytest tests/test_rating_engine.py -v

# Test storage only
pytest tests/test_storage.py -v
```

## Test Structure

### test_models.py (26 tests)
Tests for domain models and data classes.

**Coverage:**
- ✅ Address validation and normalization
- ✅ Vehicle class validation
- ✅ Driver age and MVR calculations
- ✅ Policy date validation
- ✅ RatingProgram type conversion
- ✅ StateTaxConfiguration calculations
- ✅ CalculationResult reconciliation

**Example Tests:**
```python
def test_driver_calculate_age()
def test_driver_total_mvr_incidents()
def test_vehicle_class_validation()
def test_policy_date_validation()
def test_calculate_slt()
def test_reconciliation_status()
```

### test_rating_engine.py (18 tests)
Tests for rating engine and factor lookup.

**Coverage:**
- ✅ Factor lookup by program and state
- ✅ Base AL, body/class, radius, driver, limit factors
- ✅ Vehicle class validation
- ✅ Premium calculation algorithm
- ✅ Minimum premium enforcement (per-unit and policy)
- ✅ Multi-vehicle calculations
- ✅ Policy validation
- ✅ Reconciliation delta calculation

**Example Tests:**
```python
def test_get_program_for_state()
def test_calculate_premium()
def test_minimum_premium_per_unit()
def test_minimum_premium_policy()
def test_validate_policy_no_eligible_drivers()
def test_multi_vehicle_calculation()
def test_calculate_reconciliation_delta()
```

### test_fee_calculator.py (7 tests)
Tests for fee calculation.

**Coverage:**
- ✅ Default fee amounts
- ✅ Custom fee configuration
- ✅ Broker fee inclusion/exclusion
- ✅ Zero fee scenarios
- ✅ Configuration-based fee loading

**Example Tests:**
```python
def test_default_fees()
def test_custom_fees()
def test_exclude_broker_fee()
def test_calculate_fees_convenience_function()
```

### test_tax_calculator.py (9 tests)
Tests for tax calculation.

**Coverage:**
- ✅ SLT and Stamp calculation
- ✅ Admitted state (zero tax) handling
- ✅ Taxable fee masking
- ✅ Partial taxable fees
- ✅ Fire Marshal and other flat fees
- ✅ AL Total calculation and rounding

**Example Tests:**
```python
def test_calculate_taxes()
def test_calculate_taxes_admitted_state()
def test_non_taxable_fees()
def test_partial_taxable_fees()
def test_calculate_al_total()
```

### test_storage.py (13 tests)
Tests for SQLite and JSON storage.

**Coverage:**
- ✅ Database initialization
- ✅ Save/load calculations
- ✅ Recent calculations query
- ✅ Delete calculations
- ✅ Count calculations
- ✅ JSON export/import
- ✅ Timestamped filenames
- ✅ JSON validation
- ✅ Data preservation (including reconciliation)

**Example Tests:**
```python
def test_initialize_db()
def test_save_and_load_calculation()
def test_load_recent_calculations()
def test_delete_calculation()
def test_save_and_load_calculation_json()
def test_json_preserves_reconciliation_data()
```

## Fixtures (conftest.py)

Shared test fixtures for easy test setup:

### Model Fixtures
- `sample_address` - Valid California address
- `sample_vehicle` - Class8 tractor
- `sample_driver` - Qualified driver with clean record
- `sample_al_selection` - Standard AL coverage selection
- `sample_policy` - Complete valid policy

### Data Fixtures
- `sample_rating_tables` - Full rating tables with CW/SS programs
- `sample_tax_config` - California tax configuration
- `sample_admitted_tax_config` - Admitted state (zero tax)
- `sample_config` - Application configuration

### Utility Fixtures
- `temp_dir` - Temporary directory (auto-cleanup)
- `sample_pdf_text` - Sample PDF text for parsing tests
- `sample_pdf_tables` - Sample PDF tables for parsing tests

## Test Markers

Tests are marked for selective execution:

```python
@pytest.mark.unit        # Fast unit tests (no I/O)
@pytest.mark.integration # Integration tests (uses files/DB)
@pytest.mark.slow        # Slow tests (OCR, heavy parsing)
```

**Usage:**
```bash
# Run only unit tests (fast)
pytest tests/ -m unit

# Skip slow tests
pytest tests/ -m "not slow"

# Run only integration tests
pytest tests/ -m integration
```

## Coverage Goals

Target coverage by module:

| Module | Target | Current |
|--------|--------|---------|
| Models | 90% | 95%+ |
| Rating Engine | 80% | 85%+ |
| Fee Calculator | 90% | 95%+ |
| Tax Calculator | 80% | 90%+ |
| Storage | 80% | 85%+ |
| Loaders | 70% | TBD |
| Parsers | 70% | TBD |
| **Overall** | **80%** | **~85%** |

## Continuous Testing

### Watch Mode
```bash
# Auto-run tests on file changes
pytest-watch tests/
```

### Pre-commit Hook
```bash
# Run tests before commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
pytest tests/ -m unit --tb=short
EOF
chmod +x .git/hooks/pre-commit
```

## Writing New Tests

### Test Naming Convention
```python
# Test file: test_<module_name>.py
# Test class: Test<ClassName>
# Test method: test_<functionality>_<scenario>

class TestRatingEngine:
    def test_calculate_premium_single_vehicle(self):
        ...

    def test_calculate_premium_with_minimum_enforcement(self):
        ...
```

### Using Fixtures
```python
def test_policy_validation(sample_policy, sample_rating_tables):
    """Test policy validation with fixtures."""
    engine = RatingEngine(sample_rating_tables)
    engine.validate_policy_for_rating(sample_policy)
    # Test passes if no exception
```

### Parametrized Tests
```python
@pytest.mark.parametrize("vehicle_class,expected", [
    ("Class1", True),
    ("Class6", True),
    ("Class8", True),
    ("Class9", False),
])
def test_vehicle_class_validation(vehicle_class, expected):
    if expected:
        # Should not raise
        validate_class(vehicle_class)
    else:
        with pytest.raises(ValueError):
            validate_class(vehicle_class)
```

## Test Data

### Sample Test Scenarios

**Scenario 1: Simple Single Vehicle**
- 1 Class8 tractor
- 1 qualified driver
- CA state (CW program)
- Standard limit
- Expected: ~$2,700 premium

**Scenario 2: Multi-Vehicle Fleet**
- 3 Class8 tractors
- 2 drivers
- TX state (SS program)
- High limit
- Expected: ~$9,500 premium

**Scenario 3: Minimum Premium Triggered**
- 1 Class1 vehicle
- Low-risk driver
- Short radius
- Expected: Minimum $500/unit applied

**Scenario 4: Admitted State**
- FL state (admitted)
- Expected: $0 SLT and Stamp taxes

## Troubleshooting Tests

### Import Errors
```bash
# Ensure package is installed
pip install -e .

# Or set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Database Lock Errors
```bash
# Use separate temp dirs for parallel tests
pytest tests/ -n auto  # Requires pytest-xdist
```

### Fixture Scope Issues
```python
# Use function scope for test isolation
@pytest.fixture(scope="function")
def temp_db():
    ...
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      - name: Run tests
        run: |
          pytest tests/ --cov=src --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Test Results Example

```
========================= test session starts ==========================
platform linux -- Python 3.11.0, pytest-7.4.0
collected 73 items

tests/test_models.py::TestAddress::test_create_address PASSED    [  1%]
tests/test_models.py::TestAddress::test_state_normalized PASSED  [  2%]
tests/test_models.py::TestVehicle::test_create_vehicle PASSED    [  4%]
...
tests/test_storage.py::TestJSONStore::test_validate_json PASSED  [100%]

========================== 73 passed in 2.45s ==========================

---------- coverage: platform linux, python 3.11.0 -----------
Name                                  Stmts   Miss  Cover
---------------------------------------------------------
src/models/policy.py                    124      8    94%
src/rating/rating_engine.py             187     24    87%
src/rating/fee_calculator.py             21      2    90%
src/rating/tax_calculator.py             45      5    89%
src/storage/sqlite_store.py             132     18    86%
---------------------------------------------------------
TOTAL                                  1842    168    85%
```

## Next Steps

1. **Add Parser Tests**: Test PDF parsing and field extraction
2. **Add Loader Tests**: Test Excel file loading
3. **Add UI Tests**: Test NiceGUI components (if applicable)
4. **Performance Tests**: Benchmark rating engine throughput
5. **Integration Tests**: End-to-end workflow tests

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Coverage.py](https://coverage.readthedocs.io/)
- [Pytest Fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [Parametrized Tests](https://docs.pytest.org/en/stable/parametrize.html)
