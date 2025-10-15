"""
Policy-related domain models for Roman's Rater 4.21

This module defines the core domain entities for representing insurance policies,
including addresses, vehicles, drivers, and AL coverage selections.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional
import re


@dataclass
class Address:
    """
    Represents a physical address.

    Attributes:
        street: Street address
        city: City name
        state: Two-letter state code (e.g., "FL", "CA")
        zip: ZIP code
    """
    street: str
    city: str
    state: str
    zip: str

    def __post_init__(self):
        """Validate address fields."""
        if not self.state or len(self.state) != 2:
            raise ValueError(f"State code must be 2 characters, got: {self.state}")
        self.state = self.state.upper()

        if self.zip and not re.match(r'^\d{5}(-\d{4})?$', self.zip):
            raise ValueError(f"Invalid ZIP code format: {self.zip}")


@dataclass
class Policy:
    """
    Represents an insurance policy being rated.

    Attributes:
        insured_name: Name of insured party
        address: Policy address (determines rating program and taxes)
        effective_date: Policy effective date (used to select rate edition)
        expiration_date: Policy expiration date
        vehicles: List of vehicles covered under policy
        drivers: List of drivers authorized to drive policy vehicles
        al_selection: Auto liability coverage selections
    """
    insured_name: str
    address: Address
    effective_date: date
    expiration_date: date
    vehicles: List['Vehicle'] = field(default_factory=list)
    drivers: List['Driver'] = field(default_factory=list)
    al_selection: Optional['ALSelection'] = None

    def __post_init__(self):
        """Validate policy dates."""
        if self.effective_date >= self.expiration_date:
            raise ValueError(
                f"Effective date {self.effective_date} must be before "
                f"expiration date {self.expiration_date}"
            )


@dataclass
class Vehicle:
    """
    Represents a commercial vehicle covered under the policy.

    Attributes:
        vin: Vehicle Identification Number
        year: Model year
        make_model: Make and model (e.g., "Freightliner Cascadia")
        vehicle_class: Vehicle class (Class1, Class6, or Class8)
        body_type: Body type (e.g., "TRACTOR", "BOXTRUCK")
        business_class: Business class (e.g., "AUTOHAULER", "HOTSHOT", "GENERAL")
        garage: Garage address
    """
    vin: str
    year: int
    make_model: str
    vehicle_class: str
    body_type: str
    business_class: str
    garage: Address

    VALID_CLASSES = {"Class1", "Class6", "Class8"}

    def __post_init__(self):
        """Validate vehicle class."""
        if self.vehicle_class not in self.VALID_CLASSES:
            raise ValueError(
                f"Invalid vehicle class: {self.vehicle_class}. "
                f"Must be one of {self.VALID_CLASSES}"
            )

        if self.year < 1900 or self.year > datetime.now().year + 2:
            raise ValueError(f"Invalid vehicle year: {self.year}")


@dataclass
class Driver:
    """
    Represents a person authorized to drive policy vehicles.

    Attributes:
        first_name: Driver's first name
        last_name: Driver's last name
        license_state: State of driver's license
        license_no: Driver's license number
        dob: Date of birth
        years_exp: Years of driving experience
        accidents: Number of accidents
        violations: Number of violations
        suspensions: Number of license suspensions
        major_violations: Number of major violations
        excluded: Whether driver is excluded from coverage
    """
    first_name: str
    last_name: str
    license_state: str
    license_no: str
    dob: date
    years_exp: float
    accidents: int = 0
    violations: int = 0
    suspensions: int = 0
    major_violations: int = 0
    excluded: bool = False

    def calculate_age(self, as_of_date: Optional[date] = None) -> int:
        """
        Calculate driver's age as of a given date.

        Args:
            as_of_date: Date to calculate age as of (defaults to today)

        Returns:
            Age in years
        """
        if as_of_date is None:
            as_of_date = date.today()

        age = as_of_date.year - self.dob.year

        # Adjust if birthday hasn't occurred yet this year
        if (as_of_date.month, as_of_date.day) < (self.dob.month, self.dob.day):
            age -= 1

        return age

    def total_mvr_incidents(self) -> int:
        """
        Calculate total MVR incidents for factor lookup.

        Returns:
            Total incidents = accidents + violations + suspensions + major_violations
        """
        return self.accidents + self.violations + self.suspensions + self.major_violations

    def __post_init__(self):
        """Validate driver fields."""
        if not self.license_state or len(self.license_state) != 2:
            raise ValueError(f"License state must be 2 characters: {self.license_state}")
        self.license_state = self.license_state.upper()

        if self.years_exp < 0:
            raise ValueError(f"Years of experience cannot be negative: {self.years_exp}")

        for field, value in [
            ("accidents", self.accidents),
            ("violations", self.violations),
            ("suspensions", self.suspensions),
            ("major_violations", self.major_violations),
        ]:
            if value < 0:
                raise ValueError(f"{field} cannot be negative: {value}")


@dataclass
class ALSelection:
    """
    Represents auto liability coverage choices.

    Attributes:
        limit: Limit type (e.g., "CSL_1M", "CSL_750K", "Split_BI_PD")
        program_override: Optional override for CW/SS program selection
        radius_bucket: Operating radius bucket (e.g., "0-50", "51-200", "201-500", "500+")
    """
    limit: str
    program_override: Optional[str] = None
    radius_bucket: Optional[str] = None

    VALID_PROGRAMS = {"CW", "SS"}
    VALID_RADIUS_BUCKETS = {"0-50", "51-200", "201-500", "500+"}

    def __post_init__(self):
        """Validate AL selection fields."""
        if self.program_override and self.program_override not in self.VALID_PROGRAMS:
            raise ValueError(
                f"Invalid program override: {self.program_override}. "
                f"Must be one of {self.VALID_PROGRAMS}"
            )

        if self.radius_bucket and self.radius_bucket not in self.VALID_RADIUS_BUCKETS:
            raise ValueError(
                f"Invalid radius bucket: {self.radius_bucket}. "
                f"Must be one of {self.VALID_RADIUS_BUCKETS}"
            )
