"""
SQLite storage for Roman's Rater 4.21

This module provides local database storage for calculation results,
supporting audit trails and historical reference.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from contextlib import contextmanager

from ..models.calculation_result import CalculationResult
from ..exceptions import StorageError


# Database schema version
SCHEMA_VERSION = 1


def initialize_db(db_path: Path) -> None:
    """
    Initialize SQLite database with required tables.

    Creates the database file and tables if they don't exist.
    If database already exists, validates schema version.

    Args:
        db_path: Path to SQLite database file

    Raises:
        StorageError: If database initialization fails or schema is incompatible
    """
    try:
        # Ensure parent directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)

        with _get_connection(db_path) as conn:
            cursor = conn.cursor()

            # Create schema version table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Check current schema version
            cursor.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
            row = cursor.fetchone()
            current_version = row[0] if row else 0

            if current_version > SCHEMA_VERSION:
                raise StorageError(
                    f"Database schema version {current_version} is newer than "
                    f"application schema version {SCHEMA_VERSION}. "
                    "Please update the application."
                )

            # Create calculations table if needed
            if current_version == 0:
                _create_calculations_table(cursor)
                cursor.execute(
                    "INSERT INTO schema_version (version) VALUES (?)",
                    (SCHEMA_VERSION,)
                )
                conn.commit()

    except sqlite3.Error as e:
        raise StorageError(f"Failed to initialize database: {e}")


def _create_calculations_table(cursor: sqlite3.Cursor) -> None:
    """Create calculations table for storing rating results."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP NOT NULL,
            policy_data TEXT NOT NULL,
            vehicles TEXT NOT NULL,
            drivers TEXT NOT NULL,
            al_selection TEXT NOT NULL,
            intermediate_factors TEXT NOT NULL,
            premium_subtotal REAL NOT NULL,
            fees_total REAL NOT NULL,
            taxes_total REAL NOT NULL,
            al_total REAL NOT NULL,
            reconciliation_delta REAL,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for common queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_calculations_timestamp
        ON calculations(timestamp DESC)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_calculations_created_at
        ON calculations(created_at DESC)
    """)


@contextmanager
def _get_connection(db_path: Path):
    """
    Context manager for SQLite database connections.

    Ensures connections are properly closed and provides automatic
    transaction management.
    """
    conn = None
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row  # Enable column access by name
        yield conn
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        raise StorageError(f"Database error: {e}")
    finally:
        if conn:
            conn.close()


def save_calculation(db_path: Path, result: CalculationResult) -> int:
    """
    Save calculation result to database.

    Args:
        db_path: Path to SQLite database file
        result: CalculationResult to save

    Returns:
        Calculation ID (auto-generated)

    Raises:
        StorageError: If save operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO calculations (
                    timestamp,
                    policy_data,
                    vehicles,
                    drivers,
                    al_selection,
                    intermediate_factors,
                    premium_subtotal,
                    fees_total,
                    taxes_total,
                    al_total,
                    reconciliation_delta,
                    metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.timestamp.isoformat(),
                json.dumps(result.policy_data),
                json.dumps(result.vehicles),
                json.dumps(result.drivers),
                json.dumps(result.al_selection),
                json.dumps(result.intermediate_factors),
                result.premium_subtotal,
                result.fees_total,
                result.taxes_total,
                result.al_total,
                result.reconciliation_delta,
                json.dumps(result.metadata),
            ))

            calc_id = cursor.lastrowid
            conn.commit()

            return calc_id

    except sqlite3.Error as e:
        raise StorageError(f"Failed to save calculation: {e}")
    except (TypeError, ValueError) as e:
        raise StorageError(f"Invalid calculation data: {e}")


def load_calculation(db_path: Path, calc_id: int) -> Optional[CalculationResult]:
    """
    Load calculation result from database by ID.

    Args:
        db_path: Path to SQLite database file
        calc_id: Calculation ID to load

    Returns:
        CalculationResult or None if not found

    Raises:
        StorageError: If load operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id,
                    timestamp,
                    policy_data,
                    vehicles,
                    drivers,
                    al_selection,
                    intermediate_factors,
                    premium_subtotal,
                    fees_total,
                    taxes_total,
                    al_total,
                    reconciliation_delta,
                    metadata
                FROM calculations
                WHERE id = ?
            """, (calc_id,))

            row = cursor.fetchone()
            if not row:
                return None

            return _row_to_calculation_result(row)

    except sqlite3.Error as e:
        raise StorageError(f"Failed to load calculation: {e}")


def load_recent_calculations(
    db_path: Path,
    limit: int = 10
) -> List[CalculationResult]:
    """
    Load most recent calculation results.

    Args:
        db_path: Path to SQLite database file
        limit: Maximum number of results to return

    Returns:
        List of CalculationResult objects, ordered by timestamp (newest first)

    Raises:
        StorageError: If load operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    id,
                    timestamp,
                    policy_data,
                    vehicles,
                    drivers,
                    al_selection,
                    intermediate_factors,
                    premium_subtotal,
                    fees_total,
                    taxes_total,
                    al_total,
                    reconciliation_delta,
                    metadata
                FROM calculations
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))

            results = []
            for row in cursor.fetchall():
                results.append(_row_to_calculation_result(row))

            return results

    except sqlite3.Error as e:
        raise StorageError(f"Failed to load recent calculations: {e}")


def delete_calculation(db_path: Path, calc_id: int) -> bool:
    """
    Delete calculation result from database.

    Args:
        db_path: Path to SQLite database file
        calc_id: Calculation ID to delete

    Returns:
        True if calculation was deleted, False if not found

    Raises:
        StorageError: If delete operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM calculations WHERE id = ?", (calc_id,))
            deleted = cursor.rowcount > 0

            conn.commit()
            return deleted

    except sqlite3.Error as e:
        raise StorageError(f"Failed to delete calculation: {e}")


def count_calculations(db_path: Path) -> int:
    """
    Get total count of calculations in database.

    Args:
        db_path: Path to SQLite database file

    Returns:
        Total number of calculations

    Raises:
        StorageError: If count operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM calculations")
            return cursor.fetchone()[0]

    except sqlite3.Error as e:
        raise StorageError(f"Failed to count calculations: {e}")


def _row_to_calculation_result(row: sqlite3.Row) -> CalculationResult:
    """
    Convert database row to CalculationResult object.

    Args:
        row: SQLite row from calculations table

    Returns:
        CalculationResult object
    """
    return CalculationResult(
        id=row["id"],
        timestamp=datetime.fromisoformat(row["timestamp"]),
        policy_data=json.loads(row["policy_data"]),
        vehicles=json.loads(row["vehicles"]),
        drivers=json.loads(row["drivers"]),
        al_selection=json.loads(row["al_selection"]),
        intermediate_factors=json.loads(row["intermediate_factors"]),
        premium_subtotal=row["premium_subtotal"],
        fees_total=row["fees_total"],
        taxes_total=row["taxes_total"],
        al_total=row["al_total"],
        reconciliation_delta=row["reconciliation_delta"],
        metadata=json.loads(row["metadata"]) if row["metadata"] else {},
    )


def vacuum_database(db_path: Path) -> None:
    """
    Run VACUUM command to reclaim space and optimize database.

    Should be run periodically, especially after deleting many records.

    Args:
        db_path: Path to SQLite database file

    Raises:
        StorageError: If vacuum operation fails
    """
    try:
        with _get_connection(db_path) as conn:
            conn.execute("VACUUM")
            conn.commit()

    except sqlite3.Error as e:
        raise StorageError(f"Failed to vacuum database: {e}")
