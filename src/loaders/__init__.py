"""
Data loaders for Roman's Rater 4.21
"""

from .rating_table_loader import (
    load_rating_tables,
    RatingTablesData,
)
from .tax_config_loader import load_tax_config
from .attribute_loader import (
    load_attribute_bands,
    get_default_attribute_bands,
    get_age_band,
    get_experience_band,
    get_mvr_band,
)

__all__ = [
    # Rating table loader
    "load_rating_tables",
    "RatingTablesData",
    # Tax config loader
    "load_tax_config",
    # Attribute loader
    "load_attribute_bands",
    "get_default_attribute_bands",
    "get_age_band",
    "get_experience_band",
    "get_mvr_band",
]
