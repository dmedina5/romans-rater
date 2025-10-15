"""
Attribute band loader for Roman's Rater 4.21

This module provides functions to load and work with attribute band definitions
(age, experience, MVR) used for driver factor calculations.
"""

from typing import Dict, List, Any, Optional


def load_attribute_bands(
    rating_tables_data=None
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Load attribute band definitions.

    If rating_tables_data is provided and contains attribute_lookups,
    use those. Otherwise, return default band definitions.

    Args:
        rating_tables_data: Optional RatingTablesData object from rating_table_loader

    Returns:
        Dictionary with keys: age_bands, experience_bands, mvr_bands
        Each value is a list of band definitions with structure:
        [
            {"label": "18-24", "min": 18, "max": 24},
            {"label": "25-34", "min": 25, "max": 34},
            ...
        ]
    """
    if rating_tables_data and hasattr(rating_tables_data, 'attribute_lookups'):
        # Use attribute lookups from rating tables if available
        lookups = rating_tables_data.attribute_lookups
        if lookups:
            return lookups

    # Return default bands
    return get_default_attribute_bands()


def get_default_attribute_bands() -> Dict[str, List[Dict[str, Any]]]:
    """
    Return default attribute band definitions.

    These match the bands specified in FR-013 and are used as fallback
    if Attribute Lookups sheet is missing or incomplete.

    Returns:
        Dictionary with age_bands, experience_bands, and mvr_bands
    """
    return {
        "age_bands": [
            {"label": "18-24", "min": 18, "max": 24},
            {"label": "25-34", "min": 25, "max": 34},
            {"label": "35-49", "min": 35, "max": 49},
            {"label": "50-64", "min": 50, "max": 64},
            {"label": "65+", "min": 65, "max": None},
        ],
        "experience_bands": [
            {"label": "0-2", "min": 0, "max": 2},
            {"label": "3-5", "min": 3, "max": 5},
            {"label": "6-10", "min": 6, "max": 10},
            {"label": "11+", "min": 11, "max": None},
        ],
        "mvr_bands": [
            {"label": "0", "min": 0, "max": 0},
            {"label": "1-2", "min": 1, "max": 2},
            {"label": "3-4", "min": 3, "max": 4},
            {"label": "5+", "min": 5, "max": None},
        ],
    }


def get_band_label(value: float, bands: List[Dict[str, Any]]) -> Optional[str]:
    """
    Get the band label for a given value.

    Args:
        value: The value to categorize (age, experience, MVR count)
        bands: List of band definitions from attribute lookups

    Returns:
        Band label (e.g., "25-34") or None if value doesn't fit any band

    Examples:
        >>> age_bands = get_default_attribute_bands()["age_bands"]
        >>> get_band_label(30, age_bands)
        "25-34"
        >>> get_band_label(70, age_bands)
        "65+"
    """
    for band in bands:
        min_val = band.get("min")
        max_val = band.get("max")

        # Check if value falls within band
        if min_val is not None and value < min_val:
            continue

        if max_val is not None and value > max_val:
            continue

        # Value is within band
        return band["label"]

    return None


def get_age_band(age: int, bands: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Get age band label for a given age.

    Args:
        age: Driver age
        bands: Optional custom age bands (uses defaults if not provided)

    Returns:
        Age band label (e.g., "25-34")

    Raises:
        ValueError: If age doesn't fit any band
    """
    if bands is None:
        bands = get_default_attribute_bands()["age_bands"]

    label = get_band_label(age, bands)
    if label is None:
        raise ValueError(f"Age {age} does not fit any defined age band")

    return label


def get_experience_band(
    years_exp: float,
    bands: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Get experience band label for given years of experience.

    Args:
        years_exp: Years of driving experience
        bands: Optional custom experience bands (uses defaults if not provided)

    Returns:
        Experience band label (e.g., "3-5")

    Raises:
        ValueError: If experience doesn't fit any band
    """
    if bands is None:
        bands = get_default_attribute_bands()["experience_bands"]

    label = get_band_label(years_exp, bands)
    if label is None:
        raise ValueError(
            f"Experience {years_exp} does not fit any defined experience band"
        )

    return label


def get_mvr_band(
    total_incidents: int,
    bands: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Get MVR band label for total number of incidents.

    Total incidents = accidents + violations + suspensions + major_violations
    (as defined in Driver.total_mvr_incidents())

    Args:
        total_incidents: Total MVR incidents count
        bands: Optional custom MVR bands (uses defaults if not provided)

    Returns:
        MVR band label (e.g., "1-2")

    Raises:
        ValueError: If incident count doesn't fit any band
    """
    if bands is None:
        bands = get_default_attribute_bands()["mvr_bands"]

    label = get_band_label(total_incidents, bands)
    if label is None:
        raise ValueError(
            f"MVR incidents {total_incidents} does not fit any defined MVR band"
        )

    return label


def validate_bands(bands: Dict[str, List[Dict[str, Any]]]) -> None:
    """
    Validate attribute band definitions.

    Checks that:
    - Required band types are present (age, experience, MVR)
    - Each band has required fields (label, min/max)
    - Bands are properly ordered
    - Bands cover expected ranges

    Args:
        bands: Dictionary of band definitions

    Raises:
        ValueError: If validation fails
    """
    required_types = ["age_bands", "experience_bands", "mvr_bands"]
    for band_type in required_types:
        if band_type not in bands:
            raise ValueError(f"Missing required band type: {band_type}")

        band_list = bands[band_type]
        if not band_list:
            raise ValueError(f"Band type {band_type} is empty")

        # Validate each band
        for i, band in enumerate(band_list):
            if "label" not in band:
                raise ValueError(
                    f"Band {i} in {band_type} missing required field 'label'"
                )

            # At least one of min/max should be defined
            if band.get("min") is None and band.get("max") is None:
                raise ValueError(
                    f"Band {i} in {band_type} must have at least 'min' or 'max' defined"
                )

            # Validate ordering (current band's min should not be less than previous band's min)
            if i > 0:
                prev_min = band_list[i - 1].get("min")
                curr_min = band.get("min")
                if prev_min is not None and curr_min is not None and curr_min < prev_min:
                    raise ValueError(
                        f"Bands in {band_type} are not properly ordered (band {i})"
                    )


def get_band_ranges_summary(bands: List[Dict[str, Any]]) -> str:
    """
    Get a human-readable summary of band ranges.

    Args:
        bands: List of band definitions

    Returns:
        String summary like "18-24, 25-34, 35-49, 50-64, 65+"
    """
    labels = [band["label"] for band in bands]
    return ", ".join(labels)
