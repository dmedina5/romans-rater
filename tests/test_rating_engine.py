"""
Unit tests for rating engine
"""

import pytest
from datetime import date

from src.rating.rating_engine import RatingEngine
from src.rating.factor_lookup import FactorLookupService
from src.exceptions import ValidationError, FactorNotFoundError


@pytest.mark.unit
class TestFactorLookupService:
    """Tests for FactorLookupService."""

    def test_get_program_for_state(self, sample_rating_tables):
        """Test getting program for state."""
        service = FactorLookupService(sample_rating_tables)

        assert service.get_program_for_state("CA").value == "CW"
        assert service.get_program_for_state("TX").value == "SS"

    def test_get_program_for_unknown_state(self, sample_rating_tables):
        """Test that unknown state raises error."""
        service = FactorLookupService(sample_rating_tables)

        with pytest.raises(FactorNotFoundError, match="rating_program"):
            service.get_program_for_state("XX")

    def test_get_base_al(self, sample_rating_tables):
        """Test getting Base AL factor."""
        service = FactorLookupService(sample_rating_tables)

        assert service.get_base_al("CW", "CA") == 2500.0
        assert service.get_base_al("SS", "TX") == 2800.0

    def test_get_body_class_factor(self, sample_rating_tables):
        """Test getting body/class factor."""
        service = FactorLookupService(sample_rating_tables)

        factor = service.get_body_class_factor(
            "CW", "Tractor", "Class8", "For-Hire Long Haul"
        )
        assert factor == 1.20

    def test_get_radius_factor(self, sample_rating_tables):
        """Test getting radius factor."""
        service = FactorLookupService(sample_rating_tables)

        assert service.get_radius_factor("CW", "0-50") == 0.90
        assert service.get_radius_factor("CW", "51-200") == 1.00

    def test_get_radius_factor_defaults_to_one(self, sample_rating_tables):
        """Test that missing radius factor defaults to 1.0."""
        service = FactorLookupService(sample_rating_tables)

        # Unknown radius bucket should default to 1.0
        assert service.get_radius_factor("CW", "unknown") == 1.0

    def test_get_driver_factor(self, sample_rating_tables, sample_driver):
        """Test getting driver factor."""
        service = FactorLookupService(sample_rating_tables)

        # Sample driver: age 44 (35-49 band), 10 years exp (6-10 band), 1 MVR incident (1-2 band)
        factor = service.get_driver_factor(
            "CW", sample_driver, date(2025, 1, 1)
        )

        # Should find factor for (CW, 35-49, 11+, 1-2) - wait, years_exp is 10 so 6-10 band
        # Actually 10 years is in "6-10" band, 1 incident is in "1-2" band
        assert factor == 1.15  # From fixture: ("CW", "25-34", "6-10", "1-2"): 1.15

    def test_get_limit_factor(self, sample_rating_tables):
        """Test getting limit factor."""
        service = FactorLookupService(sample_rating_tables)

        assert service.get_limit_factor("CW", "1000000/2000000") == 1.00
        assert service.get_limit_factor("CW", "2000000/4000000") == 1.25

    def test_validate_vehicle_class_valid(self, sample_rating_tables):
        """Test validating supported vehicle classes."""
        service = FactorLookupService(sample_rating_tables)

        # Should not raise for valid classes
        service.validate_vehicle_class("Class1")
        service.validate_vehicle_class("Class6")
        service.validate_vehicle_class("Class8")

    def test_validate_vehicle_class_invalid(self, sample_rating_tables):
        """Test that unsupported vehicle class raises error."""
        service = FactorLookupService(sample_rating_tables)

        with pytest.raises(FactorNotFoundError, match="Unsupported vehicle class"):
            service.validate_vehicle_class("Class9")


@pytest.mark.unit
class TestRatingEngine:
    """Tests for RatingEngine."""

    def test_calculate_premium(self, sample_policy, sample_rating_tables):
        """Test basic premium calculation."""
        engine = RatingEngine(sample_rating_tables, min_premium_policy=1000.0, min_premium_per_unit=500.0)

        result = engine.calculate_premium(sample_policy)

        assert "premium_subtotal" in result
        assert "per_vehicle_breakdown" in result
        assert "intermediate_factors" in result
        assert result["premium_subtotal"] > 0

    def test_minimum_premium_per_unit(self, sample_policy, sample_rating_tables):
        """Test that minimum premium per unit is enforced."""
        # Set high minimum
        engine = RatingEngine(sample_rating_tables, min_premium_policy=1000.0, min_premium_per_unit=5000.0)

        result = engine.calculate_premium(sample_policy)

        # Each vehicle should be at least $5000
        for vehicle in result["per_vehicle_breakdown"]:
            assert vehicle["rate_per_unit"] >= 5000.0

    def test_minimum_premium_policy(self, sample_policy, sample_rating_tables):
        """Test that minimum policy premium is enforced."""
        # Set high policy minimum
        engine = RatingEngine(sample_rating_tables, min_premium_policy=10000.0, min_premium_per_unit=500.0)

        result = engine.calculate_premium(sample_policy)

        # Total should be at least $10,000
        assert result["premium_subtotal"] >= 10000.0

    def test_validate_policy_no_vehicles(self, sample_policy, sample_rating_tables):
        """Test that policy must have vehicles."""
        engine = RatingEngine(sample_rating_tables)

        sample_policy.vehicles = []

        with pytest.raises(ValidationError, match="at least one vehicle"):
            engine.validate_policy_for_rating(sample_policy)

    def test_validate_policy_no_eligible_drivers(self, sample_policy, sample_rating_tables):
        """Test that policy must have at least one non-excluded driver."""
        engine = RatingEngine(sample_rating_tables)

        # Exclude all drivers
        for driver in sample_policy.drivers:
            driver.excluded = True

        with pytest.raises(ValidationError, match="at least one non-excluded driver"):
            engine.validate_policy_for_rating(sample_policy)

    def test_validate_policy_missing_fields(self, sample_policy, sample_rating_tables):
        """Test validation of required fields."""
        engine = RatingEngine(sample_rating_tables)

        # Remove insured name
        sample_policy.insured_name = ""

        with pytest.raises(ValidationError, match="Insured name is required"):
            engine.validate_policy_for_rating(sample_policy)

    def test_validate_policy_invalid_date_range(self, sample_policy, sample_rating_tables):
        """Test that expiration must be after effective."""
        engine = RatingEngine(sample_rating_tables)

        # Make expiration before effective (bypass model validation for test)
        sample_policy.expiration_date = date(2024, 12, 31)

        with pytest.raises(ValidationError, match="Expiration date must be after effective date"):
            engine.validate_policy_for_rating(sample_policy)

    def test_calculate_reconciliation_delta(self, sample_rating_tables):
        """Test reconciliation delta calculation."""
        engine = RatingEngine(sample_rating_tables)

        delta = engine.calculate_reconciliation_delta(2825.50, 2825.00)
        assert delta == 0.50

        delta = engine.calculate_reconciliation_delta(2825.00, 2826.00)
        assert delta == -1.00

        delta = engine.calculate_reconciliation_delta(2825.00, None)
        assert delta is None

    def test_check_reconciliation_status(self, sample_rating_tables):
        """Test reconciliation status determination."""
        engine = RatingEngine(sample_rating_tables)

        # Match (within tolerance)
        assert engine.check_reconciliation_status(0.25, tolerance=0.50) == "match"
        assert engine.check_reconciliation_status(-0.25, tolerance=0.50) == "match"

        # Minor diff (between 1x and 2x tolerance)
        assert engine.check_reconciliation_status(0.75, tolerance=0.50) == "minor_diff"

        # Major diff (over 2x tolerance)
        assert engine.check_reconciliation_status(2.00, tolerance=0.50) == "major_diff"

        # No PDF total
        assert engine.check_reconciliation_status(None, tolerance=0.50) == "no_pdf_total"

    def test_multi_vehicle_calculation(self, sample_policy, sample_rating_tables, sample_vehicle):
        """Test calculation with multiple vehicles."""
        # Add a second vehicle
        vehicle2 = sample_vehicle
        vehicle2.vin = "2HGBH41JXMN109187"
        sample_policy.vehicles.append(vehicle2)

        engine = RatingEngine(sample_rating_tables)
        result = engine.calculate_premium(sample_policy)

        assert len(result["per_vehicle_breakdown"]) == 2
        assert result["premium_subtotal"] > 0

    def test_per_vehicle_breakdown_structure(self, sample_policy, sample_rating_tables):
        """Test that per-vehicle breakdown has correct structure."""
        engine = RatingEngine(sample_rating_tables)
        result = engine.calculate_premium(sample_policy)

        breakdown = result["per_vehicle_breakdown"][0]

        # Check all required fields
        assert "vehicle_index" in breakdown
        assert "vin" in breakdown
        assert "class" in breakdown
        assert "program" in breakdown
        assert "base_al" in breakdown
        assert "f_body_class" in breakdown
        assert "f_radius" in breakdown
        assert "f_driver" in breakdown
        assert "f_limit" in breakdown
        assert "rate_per_unit" in breakdown

    def test_intermediate_factors_stored(self, sample_policy, sample_rating_tables):
        """Test that intermediate factors are properly stored."""
        engine = RatingEngine(sample_rating_tables)
        result = engine.calculate_premium(sample_policy)

        factors = result["intermediate_factors"]

        # Check vehicle-specific factors are stored
        assert "vehicle_0_program" in factors
        assert "vehicle_0_Base_AL" in factors
        assert "vehicle_0_F_body_class" in factors
        assert "vehicle_0_F_driver" in factors
        assert "AL_Premium_Subtotal" in factors
