"""
Pytest configuration and shared fixtures for Roman's Rater 4.21 tests
"""

import pytest
from datetime import date, datetime
from pathlib import Path
import tempfile
import shutil

from src.models.policy import Policy, Address, Vehicle, Driver, ALSelection
from src.models.rating_program import ProgramType, RatingProgram
from src.models.factor_table import FactorTable, StateTaxConfiguration
from src.loaders.rating_table_loader import RatingTablesData


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path)


@pytest.fixture
def sample_address():
    """Sample address for testing."""
    return Address(
        street="123 Main St",
        city="Los Angeles",
        state="CA",
        zip="90001"
    )


@pytest.fixture
def sample_vehicle(sample_address):
    """Sample vehicle for testing."""
    return Vehicle(
        vin="1HGBH41JXMN109186",
        year=2020,
        make_model="Freightliner Cascadia",
        vehicle_class="Class8",
        body_type="Tractor",
        business_class="For-Hire Long Haul",
        garage=sample_address
    )


@pytest.fixture
def sample_driver():
    """Sample driver for testing."""
    return Driver(
        first_name="John",
        last_name="Smith",
        license_state="CA",
        license_no="D1234567",
        dob=date(1980, 5, 15),
        years_exp=10.0,
        accidents=0,
        violations=1,
        suspensions=0,
        major_violations=0,
        excluded=False
    )


@pytest.fixture
def sample_al_selection():
    """Sample AL selection for testing."""
    return ALSelection(
        limit="1000000/2000000",
        program_override=None,
        radius_bucket="0-50"
    )


@pytest.fixture
def sample_policy(sample_address, sample_vehicle, sample_driver, sample_al_selection):
    """Sample complete policy for testing."""
    return Policy(
        insured_name="ABC Trucking LLC",
        address=sample_address,
        effective_date=date(2025, 1, 1),
        expiration_date=date(2026, 1, 1),
        vehicles=[sample_vehicle],
        drivers=[sample_driver],
        al_selection=sample_al_selection
    )


@pytest.fixture
def sample_rating_tables():
    """Sample rating tables data for testing."""
    data = RatingTablesData()

    # Rating plan by state
    data.rating_plan_by_state = {
        "CA": ProgramType.CW,
        "TX": ProgramType.SS,
        "FL": ProgramType.SS,
    }

    # Base AL factors
    data.base_al_factors = {
        ("CW", "CA"): 2500.0,
        ("SS", "TX"): 2800.0,
        ("SS", "FL"): 2600.0,
    }

    # Body/class factors
    data.body_class_factors = {
        ("CW", "Tractor", "Class8", "For-Hire Long Haul"): 1.20,
        ("CW", "Truck", "Class6", "For-Hire Local"): 1.10,
        ("SS", "Tractor", "Class8", "For-Hire Long Haul"): 1.25,
        ("SS", "Truck", "Class6", "For-Hire Local"): 1.15,
    }

    # Radius factors
    data.radius_factors = {
        ("CW", "0-50"): 0.90,
        ("CW", "51-200"): 1.00,
        ("CW", "201-500"): 1.10,
        ("CW", "500+"): 1.20,
        ("SS", "0-50"): 0.85,
        ("SS", "51-200"): 1.00,
        ("SS", "201-500"): 1.15,
        ("SS", "500+"): 1.25,
    }

    # Driver factors (age_band, exp_band, mvr_band)
    data.driver_factors = {
        ("CW", "25-34", "6-10", "0"): 1.00,
        ("CW", "25-34", "6-10", "1-2"): 1.15,
        ("CW", "35-49", "11+", "0"): 0.90,
        ("CW", "35-49", "11+", "1-2"): 1.05,
        ("SS", "25-34", "6-10", "0"): 1.05,
        ("SS", "25-34", "6-10", "1-2"): 1.20,
        ("SS", "35-49", "11+", "0"): 0.95,
        ("SS", "35-49", "11+", "1-2"): 1.10,
    }

    # Limit factors
    data.limit_factors = {
        ("CW", "1000000/2000000"): 1.00,
        ("CW", "2000000/4000000"): 1.25,
        ("SS", "1000000/2000000"): 1.05,
        ("SS", "2000000/4000000"): 1.30,
    }

    # Attribute lookups
    data.attribute_lookups = {
        "age_bands": [
            {"label": "18-24", "min": 18, "max": 24},
            {"label": "25-34", "min": 25, "max": 34},
            {"label": "35-49", "min": 35, "max": 49},
            {"label": "50-64", "min": 50, "max": 64},
            {"label": "65+", "min": 65, "max": None},
        ],
        "experience_bands": [
            {"label": "0-2", "min": 0, "max": 2},
            {"label": "3-5", "min": 3, "max": 5},
            {"label": "6-10", "min": 6, "max": 10},
            {"label": "11+", "min": 11, "max": None},
        ],
        "mvr_bands": [
            {"label": "0", "min": 0, "max": 0},
            {"label": "1-2", "min": 1, "max": 2},
            {"label": "3-4", "min": 3, "max": 4},
            {"label": "5+", "min": 5, "max": None},
        ],
    }

    # Metadata
    data.edition_code = "2025-01"
    data.rate_date = date(2025, 1, 1)

    return data


@pytest.fixture
def sample_tax_config():
    """Sample state tax configuration for testing."""
    return StateTaxConfiguration(
        state="CA",
        slt_percentage=0.035,
        stamp_percentage=0.003,
        fire_marshal_fee=1.75,
        other_fees=0.0,
        taxable_fees_mask={
            "policy_fee": True,
            "uw_fee": True,
            "broker_fee": True,
        },
        admitted=False
    )


@pytest.fixture
def sample_admitted_tax_config():
    """Sample admitted state tax configuration (zero taxes)."""
    return StateTaxConfiguration(
        state="FL",
        slt_percentage=0.0,
        stamp_percentage=0.0,
        fire_marshal_fee=0.0,
        other_fees=0.0,
        taxable_fees_mask={
            "policy_fee": False,
            "uw_fee": False,
            "broker_fee": False,
        },
        admitted=True
    )


@pytest.fixture
def sample_config():
    """Sample application configuration."""
    return {
        "min_premiums": {
            "policy": 1000.0,
            "per_unit": 500.0
        },
        "reconciliation_tolerance": 0.50,
        "ocr_confidence_threshold": 0.80,
    }


@pytest.fixture
def sample_pdf_text():
    """Sample PDF text for testing field extraction."""
    return """
    COMMERCIAL AUTO LIABILITY QUOTE

    Named Insured: ABC Trucking LLC
    Address: 123 Main St, Los Angeles, CA 90001

    Policy Period: 01/01/2025 to 01/01/2026

    Coverage Limit: $1,000,000 / $2,000,000
    Radius: 0-50 miles
    Program: CW

    VEHICLE SCHEDULE
    VIN                Year  Make/Model              Class   Body      Business Class
    1HGBH41JXMN109186  2020  Freightliner Cascadia   Class8  Tractor   For-Hire Long Haul

    DRIVER SCHEDULE
    Name         License    DOB        Exp  Accidents  Violations
    John Smith   D1234567   05/15/1980  10   0          1

    PREMIUM BREAKDOWN
    AL Premium Subtotal:  $2,700.00
    Policy Fee:           $50.00
    UW Fee:               $75.00
    Broker Fee:           $100.00
    Fees Total:           $225.00
    SLT Tax:              $102.38
    Stamp Tax:            $8.78
    Fire Marshal:         $1.75
    Taxes Total:          $112.91

    TOTAL PREMIUM:        $3,037.91
    """


@pytest.fixture
def sample_pdf_tables():
    """Sample PDF tables for testing."""
    return [
        # Vehicle table
        [
            ["VIN", "Year", "Make/Model", "Class", "Body", "Business Class"],
            ["1HGBH41JXMN109186", "2020", "Freightliner Cascadia", "Class8", "Tractor", "For-Hire Long Haul"],
        ],
        # Driver table
        [
            ["Name", "License", "DOB", "Exp", "Accidents", "Violations"],
            ["John Smith", "D1234567", "05/15/1980", "10", "0", "1"],
        ],
    ]


# Test markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, no external dependencies)"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests (may use files/database)"
    )
    config.addinivalue_line(
        "markers", "slow: Slow tests (e.g., OCR, heavy parsing)"
    )
