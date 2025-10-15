"""
Unit tests for domain models
"""

import pytest
from datetime import date, datetime

from src.models.policy import Policy, Address, Vehicle, Driver, ALSelection
from src.models.rating_program import ProgramType, RatingProgram
from src.models.factor_table import FactorTable, StateTaxConfiguration
from src.models.calculation_result import CalculationResult


@pytest.mark.unit
class TestAddress:
    """Tests for Address model."""

    def test_create_address(self, sample_address):
        """Test creating a valid address."""
        assert sample_address.street == "123 Main St"
        assert sample_address.city == "Los Angeles"
        assert sample_address.state == "CA"
        assert sample_address.zip == "90001"

    def test_state_normalized_to_uppercase(self):
        """Test that state is normalized to uppercase."""
        address = Address(
            street="123 Main St",
            city="Los Angeles",
            state="ca",
            zip="90001"
        )
        assert address.state == "CA"

    def test_invalid_state_code(self):
        """Test that invalid state code raises error."""
        with pytest.raises(ValueError, match="State code must be 2 characters"):
            Address(
                street="123 Main St",
                city="Los Angeles",
                state="CAL",
                zip="90001"
            )


@pytest.mark.unit
class TestVehicle:
    """Tests for Vehicle model."""

    def test_create_vehicle(self, sample_vehicle):
        """Test creating a valid vehicle."""
        assert sample_vehicle.vin == "1HGBH41JXMN109186"
        assert sample_vehicle.year == 2020
        assert sample_vehicle.vehicle_class == "Class8"
        assert sample_vehicle.body_type == "Tractor"

    def test_vehicle_class_validation(self, sample_address):
        """Test that invalid vehicle class raises error."""
        with pytest.raises(ValueError, match="Invalid vehicle class"):
            Vehicle(
                vin="1HGBH41JXMN109186",
                year=2020,
                make_model="Test",
                vehicle_class="Class9",  # Invalid
                body_type="Tractor",
                business_class="For-Hire",
                garage=sample_address
            )

    def test_valid_vehicle_classes(self, sample_address):
        """Test all valid vehicle classes."""
        for vehicle_class in ["Class1", "Class6", "Class8"]:
            vehicle = Vehicle(
                vin="1HGBH41JXMN109186",
                year=2020,
                make_model="Test",
                vehicle_class=vehicle_class,
                body_type="Tractor",
                business_class="For-Hire",
                garage=sample_address
            )
            assert vehicle.vehicle_class == vehicle_class


@pytest.mark.unit
class TestDriver:
    """Tests for Driver model."""

    def test_create_driver(self, sample_driver):
        """Test creating a valid driver."""
        assert sample_driver.first_name == "John"
        assert sample_driver.last_name == "Smith"
        assert sample_driver.license_state == "CA"
        assert sample_driver.years_exp == 10.0

    def test_calculate_age(self, sample_driver):
        """Test age calculation."""
        # Driver born 05/15/1980
        age = sample_driver.calculate_age(date(2025, 1, 1))
        assert age == 44  # Not yet birthday in 2025

        age = sample_driver.calculate_age(date(2025, 6, 1))
        assert age == 45  # After birthday

    def test_total_mvr_incidents(self, sample_driver):
        """Test MVR incident calculation."""
        # Default sample driver: 0 accidents, 1 violation, 0 suspensions, 0 major
        assert sample_driver.total_mvr_incidents() == 1

        # Test with all incident types
        driver = Driver(
            first_name="Test",
            last_name="Driver",
            license_state="CA",
            license_no="D1234567",
            dob=date(1980, 1, 1),
            years_exp=10.0,
            accidents=2,
            violations=1,
            suspensions=1,
            major_violations=1,
            excluded=False
        )
        assert driver.total_mvr_incidents() == 5

    def test_excluded_driver(self, sample_driver):
        """Test excluded flag."""
        assert sample_driver.excluded is False

        excluded_driver = Driver(
            first_name="Excluded",
            last_name="Driver",
            license_state="CA",
            license_no="D9999999",
            dob=date(1990, 1, 1),
            years_exp=5.0,
            excluded=True
        )
        assert excluded_driver.excluded is True


@pytest.mark.unit
class TestPolicy:
    """Tests for Policy model."""

    def test_create_policy(self, sample_policy):
        """Test creating a valid policy."""
        assert sample_policy.insured_name == "ABC Trucking LLC"
        assert sample_policy.address.state == "CA"
        assert len(sample_policy.vehicles) == 1
        assert len(sample_policy.drivers) == 1

    def test_policy_with_multiple_vehicles(self, sample_address, sample_vehicle, sample_driver, sample_al_selection):
        """Test policy with multiple vehicles."""
        vehicle2 = Vehicle(
            vin="2HGBH41JXMN109187",
            year=2021,
            make_model="Test Truck",
            vehicle_class="Class6",
            body_type="Truck",
            business_class="For-Hire Local",
            garage=sample_address
        )

        policy = Policy(
            insured_name="Test Company",
            address=sample_address,
            effective_date=date(2025, 1, 1),
            expiration_date=date(2026, 1, 1),
            vehicles=[sample_vehicle, vehicle2],
            drivers=[sample_driver],
            al_selection=sample_al_selection
        )

        assert len(policy.vehicles) == 2

    def test_policy_date_validation(self, sample_address, sample_vehicle, sample_driver, sample_al_selection):
        """Test that expiration must be after effective date."""
        with pytest.raises(ValueError, match="Expiration date must be after effective date"):
            Policy(
                insured_name="Test",
                address=sample_address,
                effective_date=date(2025, 1, 1),
                expiration_date=date(2024, 12, 31),  # Before effective
                vehicles=[sample_vehicle],
                drivers=[sample_driver],
                al_selection=sample_al_selection
            )


@pytest.mark.unit
class TestRatingProgram:
    """Tests for RatingProgram model."""

    def test_create_rating_program(self):
        """Test creating a rating program."""
        program = RatingProgram(state="CA", program=ProgramType.CW)
        assert program.state == "CA"
        assert program.program == ProgramType.CW

    def test_program_type_conversion(self):
        """Test string to ProgramType conversion."""
        program = RatingProgram(state="TX", program="SS")
        assert program.program == ProgramType.SS

    def test_is_cw(self):
        """Test is_cw() method."""
        cw_program = RatingProgram(state="CA", program=ProgramType.CW)
        ss_program = RatingProgram(state="TX", program=ProgramType.SS)

        assert cw_program.is_cw() is True
        assert ss_program.is_cw() is False

    def test_is_ss(self):
        """Test is_ss() method."""
        cw_program = RatingProgram(state="CA", program=ProgramType.CW)
        ss_program = RatingProgram(state="TX", program=ProgramType.SS)

        assert cw_program.is_ss() is False
        assert ss_program.is_ss() is True


@pytest.mark.unit
class TestStateTaxConfiguration:
    """Tests for StateTaxConfiguration model."""

    def test_create_tax_config(self, sample_tax_config):
        """Test creating a tax configuration."""
        assert sample_tax_config.state == "CA"
        assert sample_tax_config.slt_percentage == 0.035
        assert sample_tax_config.stamp_percentage == 0.003

    def test_calculate_slt(self, sample_tax_config):
        """Test SLT calculation."""
        slt = sample_tax_config.calculate_slt(1000.0)
        assert slt == 35.0  # 1000 * 0.035

    def test_calculate_stamp(self, sample_tax_config):
        """Test Stamp calculation."""
        stamp = sample_tax_config.calculate_stamp(1000.0)
        assert stamp == 3.0  # 1000 * 0.003

    def test_admitted_state_no_taxes(self, sample_admitted_tax_config):
        """Test that admitted states return zero taxes."""
        assert sample_admitted_tax_config.admitted is True
        assert sample_admitted_tax_config.calculate_slt(1000.0) == 0.0
        assert sample_admitted_tax_config.calculate_stamp(1000.0) == 0.0

    def test_is_fee_taxable(self, sample_tax_config):
        """Test fee taxability check."""
        assert sample_tax_config.is_fee_taxable("policy_fee") is True
        assert sample_tax_config.is_fee_taxable("uw_fee") is True
        assert sample_tax_config.is_fee_taxable("broker_fee") is True

    def test_invalid_percentage(self):
        """Test that invalid percentages raise error."""
        with pytest.raises(ValueError, match="must be between 0 and 1"):
            StateTaxConfiguration(
                state="CA",
                slt_percentage=1.5,  # Invalid (> 1)
                stamp_percentage=0.003
            )


@pytest.mark.unit
class TestCalculationResult:
    """Tests for CalculationResult model."""

    def test_create_calculation_result(self):
        """Test creating a calculation result."""
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={"insured_name": "Test", "state": "CA"},
            vehicles=[{"vin": "123", "class": "Class8"}],
            drivers=[{"name": "John Smith"}],
            al_selection={"limit": "1000000/2000000"},
            intermediate_factors={"base_al": 2500.0},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )

        assert result.premium_subtotal == 2500.0
        assert result.fees_total == 225.0
        assert result.al_total == 2825.0

    def test_reconciliation_status(self):
        """Test reconciliation status calculation."""
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
            reconciliation_delta=0.25  # Within 0.50 tolerance
        )

        assert result.is_reconciled() is True
        assert result.get_reconciliation_status() == "match"

    def test_reconciliation_minor_diff(self):
        """Test minor difference reconciliation."""
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
            reconciliation_delta=0.75  # Between 0.50 and 1.00
        )

        assert result.is_reconciled() is False
        assert result.get_reconciliation_status() == "minor_diff"

    def test_to_json_dict(self):
        """Test JSON serialization."""
        result = CalculationResult(
            timestamp=datetime(2025, 1, 1, 12, 0, 0),
            policy_data={"insured_name": "Test"},
            vehicles=[{"vin": "123"}],
            drivers=[{"name": "John"}],
            al_selection={"limit": "1000000/2000000"},
            intermediate_factors={"base_al": 2500.0},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )

        json_dict = result.to_json_dict()

        assert json_dict["premium_subtotal"] == 2500.0
        assert json_dict["al_total"] == 2825.0
        assert json_dict["timestamp"] == "2025-01-01T12:00:00"
        assert "policy" in json_dict
        assert "factors" in json_dict
