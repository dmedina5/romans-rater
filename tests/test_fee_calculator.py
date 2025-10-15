"""
Unit tests for fee calculator
"""

import pytest
from src.rating.fee_calculator import FeeCalculator, calculate_fees


@pytest.mark.unit
class TestFeeCalculator:
    """Tests for FeeCalculator."""

    def test_default_fees(self):
        """Test default fee amounts."""
        calculator = FeeCalculator()

        fees = calculator.calculate_fees()

        assert fees["policy_fee"] == 50.0
        assert fees["uw_fee"] == 75.0
        assert fees["broker_fee"] == 100.0
        assert fees["total"] == 225.0

    def test_custom_fees(self):
        """Test custom fee amounts."""
        calculator = FeeCalculator(
            policy_fee=100.0,
            uw_fee=150.0,
            broker_fee=200.0
        )

        fees = calculator.calculate_fees()

        assert fees["policy_fee"] == 100.0
        assert fees["uw_fee"] == 150.0
        assert fees["broker_fee"] == 200.0
        assert fees["total"] == 450.0

    def test_exclude_broker_fee(self):
        """Test excluding broker fee."""
        calculator = FeeCalculator()

        fees = calculator.calculate_fees(include_broker_fee=False)

        assert fees["broker_fee"] == 0.0
        assert fees["total"] == 125.0  # policy + uw only

    def test_zero_fees(self):
        """Test with zero fees."""
        calculator = FeeCalculator(
            policy_fee=0.0,
            uw_fee=0.0,
            broker_fee=0.0
        )

        fees = calculator.calculate_fees()

        assert fees["total"] == 0.0

    def test_calculate_fees_convenience_function(self):
        """Test convenience function with config."""
        config = {
            "fees": {
                "policy": 60.0,
                "uw": 80.0,
                "broker": 110.0
            }
        }

        fees = calculate_fees(config)

        assert fees["policy_fee"] == 60.0
        assert fees["uw_fee"] == 80.0
        assert fees["broker_fee"] == 110.0
        assert fees["total"] == 250.0

    def test_calculate_fees_no_config(self):
        """Test convenience function with no config uses defaults."""
        fees = calculate_fees()

        assert fees["total"] == 225.0
