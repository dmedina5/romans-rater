"""
Unit tests for tax calculator
"""

import pytest
from src.rating.tax_calculator import TaxCalculator, calculate_al_total


@pytest.mark.unit
class TestTaxCalculator:
    """Tests for TaxCalculator."""

    def test_calculate_taxes(self, sample_tax_config):
        """Test basic tax calculation."""
        calculator = TaxCalculator(sample_tax_config)

        fees = {
            "policy_fee": 50.0,
            "uw_fee": 75.0,
            "broker_fee": 100.0
        }

        taxes = calculator.calculate_taxes(premium_subtotal=2500.0, fees=fees)

        # Taxable base = 2500 + 50 + 75 + 100 = 2725
        # SLT = 2725 * 0.035 = 95.375
        # Stamp = 2725 * 0.003 = 8.175
        # Fire Marshal = 1.75
        # Other = 0.0
        # Total = 105.30

        assert taxes["taxable_base"] == 2725.0
        assert taxes["slt"] == pytest.approx(95.38, abs=0.01)
        assert taxes["stamp"] == pytest.approx(8.18, abs=0.01)
        assert taxes["fire_marshal"] == 1.75
        assert taxes["other"] == 0.0
        assert taxes["total"] == pytest.approx(105.31, abs=0.01)

    def test_calculate_taxes_admitted_state(self, sample_admitted_tax_config):
        """Test that admitted states have zero SLT and Stamp."""
        calculator = TaxCalculator(sample_admitted_tax_config)

        fees = {
            "policy_fee": 50.0,
            "uw_fee": 75.0,
            "broker_fee": 100.0
        }

        taxes = calculator.calculate_taxes(premium_subtotal=2500.0, fees=fees)

        assert taxes["slt"] == 0.0
        assert taxes["stamp"] == 0.0
        assert taxes["total"] == 0.0

    def test_non_taxable_fees(self):
        """Test with non-taxable fees."""
        from src.models.factor_table import StateTaxConfiguration

        tax_config = StateTaxConfiguration(
            state="TX",
            slt_percentage=0.048,
            stamp_percentage=0.006,
            fire_marshal_fee=0.0,
            other_fees=0.0,
            taxable_fees_mask={
                "policy_fee": False,  # Not taxable
                "uw_fee": False,      # Not taxable
                "broker_fee": False   # Not taxable
            },
            admitted=False
        )

        calculator = TaxCalculator(tax_config)

        fees = {
            "policy_fee": 50.0,
            "uw_fee": 75.0,
            "broker_fee": 100.0
        }

        taxes = calculator.calculate_taxes(premium_subtotal=2500.0, fees=fees)

        # Taxable base should only include premium (no fees)
        assert taxes["taxable_base"] == 2500.0

        # SLT = 2500 * 0.048 = 120.0
        # Stamp = 2500 * 0.006 = 15.0
        assert taxes["slt"] == 120.0
        assert taxes["stamp"] == 15.0

    def test_partial_taxable_fees(self):
        """Test with some fees taxable and some not."""
        from src.models.factor_table import StateTaxConfiguration

        tax_config = StateTaxConfiguration(
            state="TX",
            slt_percentage=0.05,
            stamp_percentage=0.005,
            fire_marshal_fee=0.0,
            other_fees=0.0,
            taxable_fees_mask={
                "policy_fee": True,   # Taxable
                "uw_fee": True,       # Taxable
                "broker_fee": False   # Not taxable
            },
            admitted=False
        )

        calculator = TaxCalculator(tax_config)

        fees = {
            "policy_fee": 50.0,
            "uw_fee": 75.0,
            "broker_fee": 100.0
        }

        taxes = calculator.calculate_taxes(premium_subtotal=2500.0, fees=fees)

        # Taxable base = 2500 + 50 + 75 = 2625 (broker fee excluded)
        assert taxes["taxable_base"] == 2625.0

        # SLT = 2625 * 0.05 = 131.25
        # Stamp = 2625 * 0.005 = 13.125
        assert taxes["slt"] == pytest.approx(131.25, abs=0.01)
        assert taxes["stamp"] == pytest.approx(13.13, abs=0.01)

    def test_fire_marshal_and_other_fees(self):
        """Test with Fire Marshal and other flat fees."""
        from src.models.factor_table import StateTaxConfiguration

        tax_config = StateTaxConfiguration(
            state="CA",
            slt_percentage=0.0,
            stamp_percentage=0.0,
            fire_marshal_fee=25.00,
            other_fees=10.00,
            taxable_fees_mask={},
            admitted=False
        )

        calculator = TaxCalculator(tax_config)

        taxes = calculator.calculate_taxes(premium_subtotal=2500.0, fees={})

        assert taxes["fire_marshal"] == 25.00
        assert taxes["other"] == 10.00
        assert taxes["total"] == 35.00


@pytest.mark.unit
class TestALTotalCalculation:
    """Tests for AL Total calculation."""

    def test_calculate_al_total(self):
        """Test AL Total calculation."""
        al_total = calculate_al_total(
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0
        )

        assert al_total == 2825.0

    def test_calculate_al_total_rounding(self):
        """Test that AL Total is properly rounded."""
        al_total = calculate_al_total(
            premium_subtotal=2500.555,
            fees_total=225.444,
            taxes_total=100.111
        )

        # Should round to 2 decimal places
        assert al_total == 2826.11

    def test_calculate_al_total_zero(self):
        """Test with zero values."""
        al_total = calculate_al_total(
            premium_subtotal=0.0,
            fees_total=0.0,
            taxes_total=0.0
        )

        assert al_total == 0.0
