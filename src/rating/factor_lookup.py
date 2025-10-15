"""
Factor lookup service for Roman's Rater 4.21

This module provides factor lookup functionality from rating tables,
handling CW/SS program selection and state-specific factors.
"""

from typing import Optional, Tuple
from datetime import date

from ..loaders.rating_table_loader import RatingTablesData
from ..loaders.attribute_loader import get_age_band, get_experience_band, get_mvr_band
from ..models.policy import Policy, Vehicle, Driver
from ..models.rating_program import ProgramType
from ..exceptions import FactorNotFoundError, create_factor_not_found_error


class FactorLookupService:
    """
    Service for looking up rating factors from tables.

    Handles program selection (CW/SS) and factor retrieval with fallback logic.
    """

    def __init__(self, rating_tables: RatingTablesData):
        """
        Initialize factor lookup service.

        Args:
            rating_tables: Loaded rating tables data
        """
        self.rating_tables = rating_tables

    def get_program_for_state(self, state: str) -> ProgramType:
        """
        Get rating program (CW or SS) for a state.

        Args:
            state: Two-letter state code

        Returns:
            ProgramType (CW or SS)

        Raises:
            FactorNotFoundError: If state not found in rating plan
        """
        state = state.upper()

        if state not in self.rating_tables.rating_plan_by_state:
            raise create_factor_not_found_error(
                factor_type="rating_program",
                lookup_key=state,
                program=None,
                state=state
            )

        return self.rating_tables.rating_plan_by_state[state]

    def get_base_al(self, program: str, state: str) -> float:
        """
        Get Base AL premium for program and state.

        Args:
            program: Rating program (CW or SS)
            state: State code

        Returns:
            Base AL premium

        Raises:
            FactorNotFoundError: If base AL not found
        """
        key = (program, state.upper())

        if key not in self.rating_tables.base_al_factors:
            raise create_factor_not_found_error(
                factor_type="base_al",
                lookup_key=state,
                program=program,
                state=state
            )

        return self.rating_tables.base_al_factors[key]

    def get_body_class_factor(
        self,
        program: str,
        body_type: str,
        vehicle_class: str,
        business_class: str
    ) -> float:
        """
        Get body/class factor.

        Args:
            program: Rating program (CW or SS)
            body_type: Body type (e.g., "Tractor")
            vehicle_class: Vehicle class (Class1, Class6, Class8)
            business_class: Business class (e.g., "For-Hire Long Haul")

        Returns:
            Body/class factor

        Raises:
            FactorNotFoundError: If factor not found
        """
        key = (program, body_type, vehicle_class, business_class)

        if key not in self.rating_tables.body_class_factors:
            raise create_factor_not_found_error(
                factor_type="body_class",
                lookup_key=f"{body_type}/{vehicle_class}/{business_class}",
                program=program
            )

        return self.rating_tables.body_class_factors[key]

    def get_radius_factor(
        self,
        program: str,
        radius_bucket: str
    ) -> float:
        """
        Get radius factor.

        Args:
            program: Rating program (CW or SS)
            radius_bucket: Radius bucket (0-50, 51-200, 201-500, 500+)

        Returns:
            Radius factor (typically 1.0 for neutral)

        Raises:
            FactorNotFoundError: If factor not found
        """
        key = (program, radius_bucket)

        if key not in self.rating_tables.radius_factors:
            # Radius is optional; default to 1.0 if not found
            return 1.0

        return self.rating_tables.radius_factors[key]

    def get_driver_factor(
        self,
        program: str,
        driver: Driver,
        as_of_date: Optional[date] = None
    ) -> float:
        """
        Get driver factor based on age, experience, and MVR.

        Args:
            program: Rating program (CW or SS)
            driver: Driver object
            as_of_date: Date to calculate age (defaults to policy effective date)

        Returns:
            Driver factor

        Raises:
            FactorNotFoundError: If factor not found
        """
        # Calculate age
        age = driver.calculate_age(as_of_date)

        # Calculate total MVR incidents
        total_mvr = driver.total_mvr_incidents()

        # Get bands
        try:
            age_band = get_age_band(age, self.rating_tables.attribute_lookups.get("age_bands"))
            exp_band = get_experience_band(
                driver.years_exp,
                self.rating_tables.attribute_lookups.get("experience_bands")
            )
            mvr_band = get_mvr_band(
                total_mvr,
                self.rating_tables.attribute_lookups.get("mvr_bands")
            )
        except ValueError as e:
            raise FactorNotFoundError(f"Failed to determine driver bands: {e}")

        # Look up factor
        key = (program, age_band, exp_band, mvr_band)

        if key not in self.rating_tables.driver_factors:
            raise create_factor_not_found_error(
                factor_type="driver",
                lookup_key=f"{age_band}/{exp_band}/{mvr_band}",
                program=program
            )

        return self.rating_tables.driver_factors[key]

    def get_limit_factor(
        self,
        program: str,
        limit: str
    ) -> float:
        """
        Get limit factor.

        Args:
            program: Rating program (CW or SS)
            limit: Coverage limit (e.g., "1000000/2000000")

        Returns:
            Limit factor

        Raises:
            FactorNotFoundError: If factor not found
        """
        key = (program, limit)

        if key not in self.rating_tables.limit_factors:
            raise create_factor_not_found_error(
                factor_type="limit",
                lookup_key=limit,
                program=program
            )

        return self.rating_tables.limit_factors[key]

    def get_all_factors_for_vehicle(
        self,
        vehicle: Vehicle,
        policy: Policy
    ) -> dict:
        """
        Get all factors needed to rate a single vehicle.

        Convenience method that looks up all factors for a vehicle.

        Args:
            vehicle: Vehicle to rate
            policy: Policy containing state and AL selection

        Returns:
            Dictionary with all factors:
            {
                "program": "CW" or "SS",
                "base_al": float,
                "body_class": float,
                "radius": float,
                "driver": float,
                "limit": float,
            }

        Raises:
            FactorNotFoundError: If any required factor not found
        """
        # Get program for state
        program_type = self.get_program_for_state(policy.address.state)
        program = program_type.value

        # Override if specified in AL selection
        if policy.al_selection and policy.al_selection.program_override:
            program = policy.al_selection.program_override

        # Base AL
        base_al = self.get_base_al(program, policy.address.state)

        # Body/class factor
        body_class = self.get_body_class_factor(
            program,
            vehicle.body_type,
            vehicle.vehicle_class,
            vehicle.business_class
        )

        # Radius factor
        radius_bucket = (
            policy.al_selection.radius_bucket
            if policy.al_selection and policy.al_selection.radius_bucket
            else "0-50"  # Default
        )
        radius = self.get_radius_factor(program, radius_bucket)

        # Driver factor (use average if multiple non-excluded drivers)
        eligible_drivers = [d for d in policy.drivers if not d.excluded]
        if not eligible_drivers:
            raise FactorNotFoundError("No eligible drivers found for rating")

        driver_factors = [
            self.get_driver_factor(program, driver, policy.effective_date)
            for driver in eligible_drivers
        ]
        avg_driver_factor = sum(driver_factors) / len(driver_factors)

        # Limit factor
        limit = policy.al_selection.limit if policy.al_selection else "1000000/2000000"
        limit_factor = self.get_limit_factor(program, limit)

        return {
            "program": program,
            "base_al": base_al,
            "body_class": body_class,
            "radius": radius,
            "driver": avg_driver_factor,
            "limit": limit_factor,
        }

    def validate_vehicle_class(self, vehicle_class: str) -> None:
        """
        Validate that a vehicle class is supported.

        Args:
            vehicle_class: Vehicle class to validate

        Raises:
            FactorNotFoundError: If vehicle class is not supported (FR-031)
        """
        valid_classes = {"Class1", "Class6", "Class8"}

        if vehicle_class not in valid_classes:
            raise FactorNotFoundError(
                f"Unsupported vehicle class: {vehicle_class}. "
                f"Supported classes: {', '.join(sorted(valid_classes))}. "
                "Manual underwriting required for this vehicle."
            )
