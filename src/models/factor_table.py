"""
Factor table and state tax configuration models for Roman's Rater 4.21

This module defines models for rating factor tables and state-specific
tax configurations.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, Any, Optional


@dataclass
class FactorTable:
    """
    Represents a collection of rating factors.

    Attributes:
        program: Rating program (CW or SS)
        state: State code (optional, for state-specific tables)
        edition_code: Edition identifier
        rate_date: Effective date of this edition
        factor_type: Type of factors in this table (e.g., "body_class", "radius", "driver")
        factors: Dictionary of factor values
    """
    program: str
    state: Optional[str]
    edition_code: str
    rate_date: date
    factor_type: str
    factors: Dict[Any, float] = field(default_factory=dict)

    def __post_init__(self):
        """Validate factor table fields."""
        if self.program not in {"CW", "SS"}:
            raise ValueError(f"Invalid program: {self.program}. Must be 'CW' or 'SS'")

        if self.state and len(self.state) != 2:
            raise ValueError(f"State code must be 2 characters: {self.state}")

        if self.state:
            self.state = self.state.upper()

    def get_factor(self, key: Any, default: Optional[float] = None) -> Optional[float]:
        """
        Get factor value by key.

        Args:
            key: Factor lookup key (can be string, tuple, etc.)
            default: Default value if key not found

        Returns:
            Factor value or default
        """
        return self.factors.get(key, default)

    def has_factor(self, key: Any) -> bool:
        """Check if factor exists for given key."""
        return key in self.factors


@dataclass
class StateTaxConfiguration:
    """
    Represents tax and fee rules for a state.

    Attributes:
        state: Two-letter state code
        slt_percentage: Surplus Lines Tax percentage (e.g., 0.035 for 3.5%)
        stamp_percentage: Stamp tax percentage
        fire_marshal_fee: Fire Marshal flat fee
        other_fees: Other flat fees
        taxable_fees_mask: Dict indicating which fees are taxable (policy_fee, uw_fee, broker_fee)
        admitted: Whether this is an admitted state (if True, SLT/Stamp = $0)
    """
    state: str
    slt_percentage: float
    stamp_percentage: float
    fire_marshal_fee: float = 0.0
    other_fees: float = 0.0
    taxable_fees_mask: Dict[str, bool] = field(default_factory=dict)
    admitted: bool = False

    def __post_init__(self):
        """Validate state tax configuration."""
        if not self.state or len(self.state) != 2:
            raise ValueError(f"State code must be 2 characters: {self.state}")
        self.state = self.state.upper()

        # Validate percentages are in valid range
        for field_name, value in [
            ("slt_percentage", self.slt_percentage),
            ("stamp_percentage", self.stamp_percentage),
        ]:
            if value < 0 or value > 1:
                raise ValueError(
                    f"{field_name} must be between 0 and 1 (percentage as decimal), "
                    f"got: {value}"
                )

        # Validate fees are non-negative
        for field_name, value in [
            ("fire_marshal_fee", self.fire_marshal_fee),
            ("other_fees", self.other_fees),
        ]:
            if value < 0:
                raise ValueError(f"{field_name} cannot be negative: {value}")

        # Initialize default taxable fees mask if empty
        if not self.taxable_fees_mask:
            self.taxable_fees_mask = {
                "policy_fee": True,
                "uw_fee": True,
                "broker_fee": True,
            }

    def calculate_slt(self, taxable_base: float) -> float:
        """
        Calculate Surplus Lines Tax.

        Args:
            taxable_base: Premium + taxable fees

        Returns:
            SLT amount (0 if admitted state)
        """
        if self.admitted:
            return 0.0
        return taxable_base * self.slt_percentage

    def calculate_stamp(self, taxable_base: float) -> float:
        """
        Calculate Stamp tax.

        Args:
            taxable_base: Premium + taxable fees

        Returns:
            Stamp amount (0 if admitted state)
        """
        if self.admitted:
            return 0.0
        return taxable_base * self.stamp_percentage

    def is_fee_taxable(self, fee_name: str) -> bool:
        """
        Check if a specific fee is included in taxable base.

        Args:
            fee_name: Name of fee (policy_fee, uw_fee, broker_fee)

        Returns:
            True if fee should be included in SLT/Stamp calculation
        """
        return self.taxable_fees_mask.get(fee_name, False)
