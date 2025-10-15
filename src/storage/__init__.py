"""
Storage modules for Roman's Rater 4.21
"""

from .sqlite_store import (
    initialize_db,
    save_calculation,
    load_calculation,
    load_recent_calculations,
    delete_calculation,
    count_calculations,
    vacuum_database,
)
from .json_store import (
    save_calculation_json,
    save_calculation_json_timestamped,
    load_calculation_json,
    save_calculation_summary_json,
    save_batch_calculations_json,
    validate_json_file,
    get_json_metadata,
)

__all__ = [
    # SQLite storage
    "initialize_db",
    "save_calculation",
    "load_calculation",
    "load_recent_calculations",
    "delete_calculation",
    "count_calculations",
    "vacuum_database",
    # JSON storage
    "save_calculation_json",
    "save_calculation_json_timestamped",
    "load_calculation_json",
    "save_calculation_summary_json",
    "save_batch_calculations_json",
    "validate_json_file",
    "get_json_metadata",
]
