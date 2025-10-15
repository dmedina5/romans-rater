"""
Rating program models for Roman's Rater 4.21

This module defines models for CW (Cover Whale) and SS (Specialty Standard)
rating program selection and configuration.
"""

from dataclasses import dataclass
from enum import Enum


class ProgramType(str, Enum):
    """Rating program types."""
    CW = "CW"  # Cover Whale (admitted states)
    SS = "SS"  # Specialty Standard (non-admitted states)


@dataclass
class RatingProgram:
    """
    Represents the rating program (CW or SS) used for a state.

    The rating program determines which factor tables are used for lookups.

    Attributes:
        state: Two-letter state code
        program: Rating program type (CW or SS)
    """
    state: str
    program: ProgramType

    def __post_init__(self):
        """Validate rating program fields."""
        if not self.state or len(self.state) != 2:
            raise ValueError(f"State code must be 2 characters: {self.state}")
        self.state = self.state.upper()

        # Convert string to enum if needed
        if isinstance(self.program, str):
            try:
                self.program = ProgramType(self.program.upper())
            except ValueError:
                raise ValueError(
                    f"Invalid program type: {self.program}. "
                    f"Must be one of {[p.value for p in ProgramType]}"
                )

    def is_cw(self) -> bool:
        """Check if this is a CW program."""
        return self.program == ProgramType.CW

    def is_ss(self) -> bool:
        """Check if this is an SS program."""
        return self.program == ProgramType.SS
