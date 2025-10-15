"""
Tax calculator for Roman's Rater 4.21

Calculates state taxes: SLT, Stamp, Fire Marshal, Other (FR-032 through FR-035).
"""

from typing import Dict, Any

from ..models.factor_table import StateTaxConfiguration
from ..exceptions import CalculationError


class TaxCalculator:
    """Calculates state taxes and fees."""

    def __init__(self, tax_config: StateTaxConfiguration):
        """
        Initialize tax calculator.

        Args:
            tax_config: State-specific tax configuration
        """
        self.tax_config = tax_config

    def calculate_taxes(
        self,
        premium_subtotal: float,
        fees: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculate all taxes.

        Implements FR-032 through FR-035:
        - SLT = (Premium + Taxable Fees) × SLT%
        - Stamp = (Premium + Taxable Fees) × Stamp%
        - Fire Marshal = flat fee
        - Other = flat fee

        Args:
            premium_subtotal: AL Premium Subtotal
            fees: Dictionary with policy_fee, uw_fee, broker_fee

        Returns:
            Dictionary with tax breakdown
        """
        # Calculate taxable base (premium + taxable fees)
        taxable_base = premium_subtotal

        if self.tax_config.is_fee_taxable("policy_fee"):
            taxable_base += fees.get("policy_fee", 0.0)
        if self.tax_config.is_fee_taxable("uw_fee"):
            taxable_base += fees.get("uw_fee", 0.0)
        if self.tax_config.is_fee_taxable("broker_fee"):
            taxable_base += fees.get("broker_fee", 0.0)

        # Calculate taxes
        slt = self.tax_config.calculate_slt(taxable_base)
        stamp = self.tax_config.calculate_stamp(taxable_base)
        fire_marshal = self.tax_config.fire_marshal_fee
        other = self.tax_config.other_fees

        total = round(slt + stamp + fire_marshal + other, 2)

        return {
            "taxable_base": round(taxable_base, 2),
            "slt": round(slt, 2),
            "stamp": round(stamp, 2),
            "fire_marshal": round(fire_marshal, 2),
            "other": round(other, 2),
            "total": total,
        }


def calculate_al_total(
    premium_subtotal: float,
    fees_total: float,
    taxes_total: float
) -> float:
    """
    Calculate final AL Total.

    AL Total = Premium Subtotal + Fees Total + Taxes Total

    Args:
        premium_subtotal: AL Premium Subtotal
        fees_total: Total fees
        taxes_total: Total taxes

    Returns:
        AL Total
    """
    return round(premium_subtotal + fees_total + taxes_total, 2)
