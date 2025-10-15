"""
Rating engine for Roman's Rater 4.21

This module implements the core rating algorithm:
rate_per_unit = Base_AL × F_state × F_vehicle × F_driver × F_limit

Implements FR-017 through FR-028 (premium calculation logic).
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

from ..models.policy import Policy
from ..models.calculation_result import CalculationResult
from ..loaders.rating_table_loader import RatingTablesData
from .factor_lookup import FactorLookupService
from ..exceptions import CalculationError, ValidationError


class RatingEngine:
    """
    Core rating engine that calculates AL premiums.

    Implements the factor-based rating algorithm with minimum premium enforcement.
    """

    def __init__(
        self,
        rating_tables: RatingTablesData,
        min_premium_policy: float = 1000.0,
        min_premium_per_unit: float = 500.0
    ):
        """
        Initialize rating engine.

        Args:
            rating_tables: Loaded rating tables
            min_premium_policy: Minimum policy premium (FR-024)
            min_premium_per_unit: Minimum per-unit premium (FR-024)
        """
        self.rating_tables = rating_tables
        self.factor_lookup = FactorLookupService(rating_tables)
        self.min_premium_policy = min_premium_policy
        self.min_premium_per_unit = min_premium_per_unit

    def calculate_premium(self, policy: Policy) -> Dict[str, Any]:
        """
        Calculate AL premium for policy.

        Implements the core rating algorithm:
        rate_per_unit = Base_AL × F_state × F_vehicle × F_driver × F_limit

        Args:
            policy: Policy to rate

        Returns:
            Dictionary with:
            {
                "per_vehicle_breakdown": [...],
                "premium_subtotal": float,
                "intermediate_factors": {...},
            }

        Raises:
            CalculationError: If calculation fails
            ValidationError: If policy data is invalid
        """
        # Validate policy has vehicles
        if not policy.vehicles:
            raise ValidationError("Policy must have at least one vehicle")

        # Validate vehicle classes (FR-031)
        for vehicle in policy.vehicles:
            self.factor_lookup.validate_vehicle_class(vehicle.vehicle_class)

        # Calculate per-vehicle premiums
        per_vehicle_breakdown = []
        total_premium = 0.0
        all_intermediate_factors = {}

        for idx, vehicle in enumerate(policy.vehicles):
            vehicle_premium = self._calculate_vehicle_premium(
                vehicle, policy, idx, all_intermediate_factors
            )
            per_vehicle_breakdown.append(vehicle_premium)
            total_premium += vehicle_premium["rate_per_unit"]

        # Apply minimum premium (FR-024)
        original_total = total_premium

        # Per-unit minimum
        for breakdown in per_vehicle_breakdown:
            if breakdown["rate_per_unit"] < self.min_premium_per_unit:
                breakdown["rate_per_unit"] = self.min_premium_per_unit
                breakdown["minimum_applied"] = True

        # Recalculate total after per-unit minimums
        total_premium = sum(b["rate_per_unit"] for b in per_vehicle_breakdown)

        # Policy minimum
        if total_premium < self.min_premium_policy:
            total_premium = self.min_premium_policy
            all_intermediate_factors["minimum_premium_applied"] = "policy"
        elif original_total != total_premium:
            all_intermediate_factors["minimum_premium_applied"] = "per_unit"

        # Store total premium in factors
        all_intermediate_factors["AL_Premium_Subtotal"] = round(total_premium, 2)
        all_intermediate_factors["per_vehicle_breakdown"] = per_vehicle_breakdown

        return {
            "per_vehicle_breakdown": per_vehicle_breakdown,
            "premium_subtotal": round(total_premium, 2),
            "intermediate_factors": all_intermediate_factors,
        }

    def _calculate_vehicle_premium(
        self,
        vehicle,
        policy: Policy,
        vehicle_idx: int,
        factors_accumulator: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate premium for a single vehicle.

        Implements: rate_per_unit = Base_AL × F_state × F_vehicle × F_driver × F_limit

        Args:
            vehicle: Vehicle to rate
            policy: Parent policy
            vehicle_idx: Index of vehicle in policy
            factors_accumulator: Dictionary to accumulate all factors

        Returns:
            Dictionary with vehicle breakdown and factors
        """
        # Get all factors for this vehicle
        factors = self.factor_lookup.get_all_factors_for_vehicle(vehicle, policy)

        # Calculate rate_per_unit
        # Note: F_state is implicitly included in program selection
        # The formula breaks down as:
        # rate_per_unit = Base_AL × F_body_class × F_radius × F_driver × F_limit

        rate_per_unit = (
            factors["base_al"] *
            factors["body_class"] *
            factors["radius"] *
            factors["driver"] *
            factors["limit"]
        )

        # Round to 2 decimal places
        rate_per_unit = round(rate_per_unit, 2)

        # Store factors in accumulator with vehicle prefix
        prefix = f"vehicle_{vehicle_idx}_"
        factors_accumulator[f"{prefix}program"] = factors["program"]
        factors_accumulator[f"{prefix}Base_AL"] = factors["base_al"]
        factors_accumulator[f"{prefix}F_body_class"] = factors["body_class"]
        factors_accumulator[f"{prefix}F_radius"] = factors["radius"]
        factors_accumulator[f"{prefix}F_driver"] = factors["driver"]
        factors_accumulator[f"{prefix}F_limit"] = factors["limit"]
        factors_accumulator[f"{prefix}rate_per_unit"] = rate_per_unit

        return {
            "vehicle_index": vehicle_idx,
            "vin": vehicle.vin,
            "class": vehicle.vehicle_class,
            "body_type": vehicle.body_type,
            "business_class": vehicle.business_class,
            "program": factors["program"],
            "base_al": factors["base_al"],
            "f_body_class": factors["body_class"],
            "f_radius": factors["radius"],
            "f_driver": factors["driver"],
            "f_limit": factors["limit"],
            "rate_per_unit": rate_per_unit,
            "minimum_applied": False,
        }

    def validate_policy_for_rating(self, policy: Policy) -> None:
        """
        Validate that policy has all data needed for rating.

        Args:
            policy: Policy to validate

        Raises:
            ValidationError: If policy is missing required data
        """
        errors = []

        # Check required fields
        if not policy.insured_name:
            errors.append("Insured name is required")

        if not policy.address or not policy.address.state:
            errors.append("Policy state is required")

        if not policy.effective_date:
            errors.append("Effective date is required")

        if not policy.expiration_date:
            errors.append("Expiration date is required")

        # Check date order
        if policy.effective_date and policy.expiration_date:
            if policy.expiration_date <= policy.effective_date:
                errors.append("Expiration date must be after effective date")

        # Check vehicles
        if not policy.vehicles:
            errors.append("At least one vehicle is required")

        for idx, vehicle in enumerate(policy.vehicles):
            if not vehicle.vin:
                errors.append(f"Vehicle {idx}: VIN is required")
            if not vehicle.vehicle_class:
                errors.append(f"Vehicle {idx}: Vehicle class is required")
            if not vehicle.body_type:
                errors.append(f"Vehicle {idx}: Body type is required")
            if not vehicle.business_class:
                errors.append(f"Vehicle {idx}: Business class is required")

        # Check drivers (FR-027: at least one non-excluded driver)
        if policy.drivers:
            eligible_drivers = [d for d in policy.drivers if not d.excluded]
            if not eligible_drivers:
                errors.append("At least one non-excluded driver is required")

            for idx, driver in enumerate(policy.drivers):
                if driver.excluded:
                    continue  # Skip excluded drivers

                if not driver.first_name or not driver.last_name:
                    errors.append(f"Driver {idx}: Name is required")
                if not driver.license_state:
                    errors.append(f"Driver {idx}: License state is required")
                if not driver.dob:
                    errors.append(f"Driver {idx}: Date of birth is required")
                if driver.years_exp < 0:
                    errors.append(f"Driver {idx}: Years of experience cannot be negative")

        # Check AL selection
        if not policy.al_selection:
            errors.append("AL coverage selection is required")
        elif not policy.al_selection.limit:
            errors.append("Coverage limit is required")

        if errors:
            raise ValidationError("Policy validation failed:\n" + "\n".join(f"- {e}" for e in errors))

    def calculate_reconciliation_delta(
        self,
        calculated_total: float,
        printed_total: Optional[float]
    ) -> Optional[float]:
        """
        Calculate reconciliation delta between calculated and printed totals.

        Args:
            calculated_total: Total calculated by rating engine
            printed_total: Total printed on original quote PDF

        Returns:
            Delta (calculated - printed) or None if no printed total
        """
        if printed_total is None:
            return None

        return round(calculated_total - printed_total, 2)

    def check_reconciliation_status(
        self,
        delta: Optional[float],
        tolerance: float = 0.50
    ) -> str:
        """
        Get reconciliation status.

        Args:
            delta: Reconciliation delta
            tolerance: Acceptable tolerance (default $0.50)

        Returns:
            Status: "match", "minor_diff", or "major_diff"
        """
        if delta is None:
            return "no_pdf_total"

        abs_delta = abs(delta)

        if abs_delta <= tolerance:
            return "match"
        elif abs_delta <= tolerance * 2:
            return "minor_diff"
        else:
            return "major_diff"


def calculate_full_premium(
    policy: Policy,
    rating_tables: RatingTablesData,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function to calculate premium with default settings.

    Args:
        policy: Policy to rate
        rating_tables: Rating tables data
        config: Optional configuration (min premiums, etc.)

    Returns:
        Premium calculation result

    Raises:
        CalculationError: If calculation fails
        ValidationError: If policy is invalid
    """
    # Extract config values
    min_policy = 1000.0
    min_per_unit = 500.0

    if config:
        min_policy = config.get("min_premiums", {}).get("policy", 1000.0)
        min_per_unit = config.get("min_premiums", {}).get("per_unit", 500.0)

    # Create engine and calculate
    engine = RatingEngine(rating_tables, min_policy, min_per_unit)
    engine.validate_policy_for_rating(policy)

    return engine.calculate_premium(policy)
