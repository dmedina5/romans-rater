"""
Calculation result model for Roman's Rater 4.21

This module defines the output model for rating calculations,
used for audit trails and historical reference.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List
from decimal import Decimal


@dataclass
class CalculationResult:
    """
    Represents the output of a rating calculation.

    This model captures all inputs, intermediate factors, and final results
    for audit trail and compliance purposes.

    Attributes:
        id: Unique calculation ID (assigned by storage layer)
        timestamp: When calculation was performed
        policy_data: Snapshot of policy information
        vehicles: Snapshot of vehicle data
        drivers: Snapshot of driver data
        al_selection: Snapshot of AL coverage selection
        intermediate_factors: Dictionary of all rating factors
        premium_subtotal: AL Premium Subtotal before fees/taxes
        fees_total: Total fees (policy + UW + broker)
        taxes_total: Total taxes (SLT + Stamp + Fire Marshal + Other)
        al_total: Final AL Total (premium + fees + taxes)
        reconciliation_delta: Difference from PDF printed total
        metadata: Additional metadata (edition codes, rate dates, etc.)
    """
    timestamp: datetime
    policy_data: Dict[str, Any]
    vehicles: List[Dict[str, Any]]
    drivers: List[Dict[str, Any]]
    al_selection: Dict[str, Any]
    intermediate_factors: Dict[str, Any]
    premium_subtotal: float
    fees_total: float
    taxes_total: float
    al_total: float
    reconciliation_delta: Optional[float] = None
    id: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate calculation result fields."""
        # Round monetary values to 2 decimal places
        self.premium_subtotal = round(self.premium_subtotal, 2)
        self.fees_total = round(self.fees_total, 2)
        self.taxes_total = round(self.taxes_total, 2)
        self.al_total = round(self.al_total, 2)

        if self.reconciliation_delta is not None:
            self.reconciliation_delta = round(self.reconciliation_delta, 2)

        # Validate totals make sense
        expected_total = self.premium_subtotal + self.fees_total + self.taxes_total
        if abs(self.al_total - expected_total) > 0.01:  # Allow 1 cent rounding difference
            raise ValueError(
                f"AL Total ({self.al_total}) does not match sum of components "
                f"({expected_total})"
            )

    def is_reconciled(self, tolerance: float = 0.50) -> bool:
        """
        Check if calculation reconciles with PDF printed total.

        Args:
            tolerance: Maximum acceptable difference in dollars

        Returns:
            True if within tolerance or no PDF total available
        """
        if self.reconciliation_delta is None:
            return True  # No PDF total to compare against

        return abs(self.reconciliation_delta) <= tolerance

    def get_reconciliation_status(self, tolerance: float = 0.50) -> str:
        """
        Get reconciliation status as a string.

        Args:
            tolerance: Maximum acceptable difference

        Returns:
            Status string: "match", "minor_diff", or "major_diff"
        """
        if self.reconciliation_delta is None:
            return "no_pdf_total"

        abs_delta = abs(self.reconciliation_delta)

        if abs_delta <= tolerance:
            return "match"
        elif abs_delta <= tolerance * 2:  # Within 2x tolerance
            return "minor_diff"
        else:
            return "major_diff"

    def to_json_dict(self) -> Dict[str, Any]:
        """
        Convert to JSON-serializable dictionary.

        Returns:
            Dictionary representation for JSON export
        """
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "policy": self.policy_data,
            "vehicles": self.vehicles,
            "drivers": self.drivers,
            "al_selection": self.al_selection,
            "factors": self.intermediate_factors,
            "premium_subtotal": self.premium_subtotal,
            "fees_total": self.fees_total,
            "taxes_total": self.taxes_total,
            "al_total": self.al_total,
            "reconciliation_delta": self.reconciliation_delta,
            "reconciliation_status": self.get_reconciliation_status(),
            "metadata": self.metadata,
        }

    def get_factor(self, factor_name: str, default: Any = None) -> Any:
        """
        Get intermediate factor value by name.

        Args:
            factor_name: Name of factor (e.g., "Base_AL", "F_state")
            default: Default value if not found

        Returns:
            Factor value or default
        """
        return self.intermediate_factors.get(factor_name, default)

    def get_per_vehicle_breakdown(self) -> List[Dict[str, Any]]:
        """
        Extract per-vehicle breakdown from intermediate factors.

        Returns:
            List of dictionaries with vehicle-level details
        """
        breakdown = self.intermediate_factors.get("per_vehicle_breakdown", [])
        if not breakdown and self.vehicles:
            # Generate basic breakdown if not already present
            rate_per_unit = self.premium_subtotal / len(self.vehicles) if self.vehicles else 0
            breakdown = [
                {
                    "vehicle_index": i,
                    "vin": v.get("vin", ""),
                    "class": v.get("vehicle_class", ""),
                    "rate_per_unit": round(rate_per_unit, 2),
                }
                for i, v in enumerate(self.vehicles)
            ]
        return breakdown
