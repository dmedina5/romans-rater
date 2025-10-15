"""
Exception hierarchy for Roman's Rater 4.21

This module defines all custom exceptions used throughout the application,
organized in a hierarchical structure for easier error handling.
"""


class RomansRaterError(Exception):
    """
    Base exception for all Roman's Rater errors.

    All custom exceptions in the application inherit from this class,
    making it easy to catch all application-specific errors.
    """
    pass


class ParserError(RomansRaterError):
    """
    Raised when PDF parsing fails.

    Examples:
        - Cannot extract required fields from PDF
        - PDF format is unrecognized or corrupted
        - Table structure doesn't match expected format
    """
    pass


class FactorNotFoundError(RomansRaterError):
    """
    Raised when a required rating factor cannot be found.

    Examples:
        - Body/class/business-class combination not in factor tables
        - State not found in rating program mapping
        - Invalid limit type
    """
    pass


class ValidationError(RomansRaterError):
    """
    Raised when data validation fails.

    Examples:
        - No eligible drivers found (all excluded)
        - Invalid vehicle class
        - Missing required fields
        - Invalid date ranges
    """
    pass


class LoaderError(RomansRaterError):
    """
    Raised when loading rating tables or tax config fails.

    Examples:
        - Excel workbook file not found
        - Required sheet missing from workbook
        - Invalid data format in workbook
        - Macro detection in workbook
        - No valid rate edition found for policy date
    """
    pass


class StorageError(RomansRaterError):
    """
    Raised when database or file storage operations fail.

    Examples:
        - Cannot connect to SQLite database
        - Cannot write to file system
        - Invalid calculation ID
        - Corrupt database file
    """
    pass


class ConfigurationError(RomansRaterError):
    """
    Raised when application configuration is invalid.

    Examples:
        - config.json missing or malformed
        - Invalid configuration values
        - Missing required configuration keys
    """
    pass


class CalculationError(RomansRaterError):
    """
    Raised when rating calculation fails.

    Examples:
        - Division by zero in calculations
        - Invalid factor values
        - Circular dependencies in calculations
        - Numerical overflow
    """
    pass


class ExportError(RomansRaterError):
    """
    Raised when export operations fail.

    Examples:
        - Cannot generate audit PDF
        - Cannot write JSON/CSV file
        - Invalid export format
        - Missing data required for export
    """
    pass


class OCRError(RomansRaterError):
    """
    Raised when OCR processing fails.

    Examples:
        - Tesseract not installed
        - OCR confidence too low
        - Cannot process image-based PDF
    """
    pass


# Convenience function for creating detailed error messages
def create_validation_error(field: str, value: any, expected: str) -> ValidationError:
    """
    Create a detailed validation error message.

    Args:
        field: Name of the field that failed validation
        value: The invalid value
        expected: Description of expected value

    Returns:
        ValidationError with formatted message
    """
    return ValidationError(
        f"Validation failed for '{field}': got '{value}', expected {expected}"
    )


def create_factor_not_found_error(
    factor_type: str,
    lookup_key: any,
    program: str = None,
    state: str = None
) -> FactorNotFoundError:
    """
    Create a detailed factor not found error message.

    Args:
        factor_type: Type of factor (e.g., "body_class", "radius")
        lookup_key: The key that was not found
        program: Rating program (CW or SS)
        state: State code

    Returns:
        FactorNotFoundError with formatted message
    """
    message = f"Factor not found: {factor_type} with key '{lookup_key}'"

    if program:
        message += f" for program '{program}'"
    if state:
        message += f" in state '{state}'"

    return FactorNotFoundError(message)
