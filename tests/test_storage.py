"""
Unit tests for storage modules
"""

import pytest
from datetime import datetime
from pathlib import Path

from src.storage.sqlite_store import (
    initialize_db, save_calculation, load_calculation,
    load_recent_calculations, delete_calculation, count_calculations
)
from src.storage.json_store import (
    save_calculation_json, load_calculation_json,
    save_calculation_json_timestamped, validate_json_file
)
from src.models.calculation_result import CalculationResult


@pytest.mark.integration
class TestSQLiteStore:
    """Tests for SQLite storage."""

    def test_initialize_db(self, temp_dir):
        """Test database initialization."""
        db_path = temp_dir / "test.db"

        initialize_db(db_path)

        assert db_path.exists()

    def test_save_and_load_calculation(self, temp_dir):
        """Test saving and loading a calculation."""
        db_path = temp_dir / "test.db"
        initialize_db(db_path)

        # Create a calculation result
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={"insured_name": "Test", "state": "CA"},
            vehicles=[{"vin": "123", "class": "Class8"}],
            drivers=[{"name": "John Smith"}],
            al_selection={"limit": "1000000/2000000"},
            intermediate_factors={"base_al": 2500.0},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )

        # Save
        calc_id = save_calculation(db_path, result)
        assert calc_id > 0

        # Load
        loaded = load_calculation(db_path, calc_id)
        assert loaded is not None
        assert loaded.id == calc_id
        assert loaded.premium_subtotal == 2500.0
        assert loaded.al_total == 2825.0

    def test_load_nonexistent_calculation(self, temp_dir):
        """Test loading a calculation that doesn't exist."""
        db_path = temp_dir / "test.db"
        initialize_db(db_path)

        loaded = load_calculation(db_path, 999)
        assert loaded is None

    def test_load_recent_calculations(self, temp_dir):
        """Test loading recent calculations."""
        db_path = temp_dir / "test.db"
        initialize_db(db_path)

        # Save multiple calculations
        for i in range(5):
            result = CalculationResult(
                timestamp=datetime.now(),
                policy_data={"insured_name": f"Test {i}"},
                vehicles=[],
                drivers=[],
                al_selection={},
                intermediate_factors={},
                premium_subtotal=1000.0 + i,
                fees_total=225.0,
                taxes_total=100.0,
                al_total=1325.0 + i,
            )
            save_calculation(db_path, result)

        # Load recent (limit 3)
        recent = load_recent_calculations(db_path, limit=3)
        assert len(recent) == 3

        # Should be in reverse chronological order
        assert recent[0].premium_subtotal == 1004.0  # Most recent

    def test_delete_calculation(self, temp_dir):
        """Test deleting a calculation."""
        db_path = temp_dir / "test.db"
        initialize_db(db_path)

        # Save a calculation
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )
        calc_id = save_calculation(db_path, result)

        # Delete
        deleted = delete_calculation(db_path, calc_id)
        assert deleted is True

        # Verify deleted
        loaded = load_calculation(db_path, calc_id)
        assert loaded is None

        # Delete again should return False
        deleted = delete_calculation(db_path, calc_id)
        assert deleted is False

    def test_count_calculations(self, temp_dir):
        """Test counting calculations."""
        db_path = temp_dir / "test.db"
        initialize_db(db_path)

        # Initially zero
        assert count_calculations(db_path) == 0

        # Save some calculations
        for i in range(3):
            result = CalculationResult(
                timestamp=datetime.now(),
                policy_data={},
                vehicles=[],
                drivers=[],
                al_selection={},
                intermediate_factors={},
                premium_subtotal=1000.0,
                fees_total=225.0,
                taxes_total=100.0,
                al_total=1325.0,
            )
            save_calculation(db_path, result)

        assert count_calculations(db_path) == 3


@pytest.mark.integration
class TestJSONStore:
    """Tests for JSON storage."""

    def test_save_and_load_calculation_json(self, temp_dir):
        """Test saving and loading JSON."""
        json_path = temp_dir / "test.json"

        # Create a calculation result
        result = CalculationResult(
            timestamp=datetime(2025, 1, 1, 12, 0, 0),
            policy_data={"insured_name": "Test", "state": "CA"},
            vehicles=[{"vin": "123", "class": "Class8"}],
            drivers=[{"name": "John Smith"}],
            al_selection={"limit": "1000000/2000000"},
            intermediate_factors={"base_al": 2500.0},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )

        # Save
        save_calculation_json(result, json_path, pretty=True)
        assert json_path.exists()

        # Load
        loaded = load_calculation_json(json_path)
        assert loaded.premium_subtotal == 2500.0
        assert loaded.al_total == 2825.0
        assert loaded.policy_data["insured_name"] == "Test"

    def test_save_calculation_json_timestamped(self, temp_dir):
        """Test saving with timestamped filename."""
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )

        # Save with timestamp
        json_path = save_calculation_json_timestamped(result, temp_dir, prefix="test")

        assert json_path.exists()
        assert "test_" in json_path.name
        assert json_path.suffix == ".json"

    def test_validate_json_file(self, temp_dir):
        """Test JSON file validation."""
        json_path = temp_dir / "test.json"

        # Create valid calculation
        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
        )
        save_calculation_json(result, json_path)

        # Should validate successfully
        assert validate_json_file(json_path) is True

        # Invalid file should return False
        invalid_path = temp_dir / "invalid.json"
        with open(invalid_path, 'w') as f:
            f.write("invalid json")

        assert validate_json_file(invalid_path) is False

    def test_json_preserves_reconciliation_data(self, temp_dir):
        """Test that reconciliation data is preserved in JSON."""
        json_path = temp_dir / "test.json"

        result = CalculationResult(
            timestamp=datetime.now(),
            policy_data={},
            vehicles=[],
            drivers=[],
            al_selection={},
            intermediate_factors={},
            premium_subtotal=2500.0,
            fees_total=225.0,
            taxes_total=100.0,
            al_total=2825.0,
            reconciliation_delta=0.25
        )

        save_calculation_json(result, json_path)
        loaded = load_calculation_json(json_path)

        assert loaded.reconciliation_delta == 0.25
        assert loaded.is_reconciled() is True
