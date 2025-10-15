"""
Fee calculator for Roman's Rater 4.21

Calculates policy fees, UW fees, and broker fees (FR-029, FR-030).
"""

from typing import Dict, Any, Optional


class FeeCalculator:
    """Calculates fees for AL policies."""

    def __init__(
        self,
        policy_fee: float = 50.0,
        uw_fee: float = 75.0,
        broker_fee: float = 100.0
    ):
        """
        Initialize fee calculator.

        Args:
            policy_fee: Policy fee amount (default $50)
            uw_fee: Underwriting fee amount (default $75)
            broker_fee: Broker fee amount (default $100)
        """
        self.policy_fee = policy_fee
        self.uw_fee = uw_fee
        self.broker_fee = broker_fee

    def calculate_fees(
        self,
        num_vehicles: int = 1,
        include_broker_fee: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate all fees.

        Args:
            num_vehicles: Number of vehicles (affects some fees)
            include_broker_fee: Whether to include broker fee

        Returns:
            Dictionary with fee breakdown
        """
        fees = {
            "policy_fee": self.policy_fee,
            "uw_fee": self.uw_fee,
            "broker_fee": self.broker_fee if include_broker_fee else 0.0,
        }

        fees["total"] = round(
            fees["policy_fee"] + fees["uw_fee"] + fees["broker_fee"],
            2
        )

        return fees


def calculate_fees(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Convenience function to calculate fees.

    Args:
        config: Optional configuration with fee amounts

    Returns:
        Fee calculation result
    """
    policy_fee = 50.0
    uw_fee = 75.0
    broker_fee = 100.0

    if config and "fees" in config:
        policy_fee = config["fees"].get("policy", 50.0)
        uw_fee = config["fees"].get("uw", 75.0)
        broker_fee = config["fees"].get("broker", 100.0)

    calculator = FeeCalculator(policy_fee, uw_fee, broker_fee)
    return calculator.calculate_fees()
