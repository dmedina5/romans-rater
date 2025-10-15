"""
JSON file storage for Roman's Rater 4.21

This module provides JSON export functionality for calculation results,
enabling easy sharing and archival of rating outputs.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..models.calculation_result import CalculationResult
from ..exceptions import ExportError


def save_calculation_json(
    result: CalculationResult,
    output_path: Path,
    pretty: bool = True
) -> None:
    """
    Save calculation result to JSON file.

    Args:
        result: CalculationResult to export
        output_path: Path to output JSON file
        pretty: If True, format JSON with indentation for readability

    Raises:
        ExportError: If file write fails
    """
    try:
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert to JSON-serializable dictionary
        data = result.to_json_dict()

        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                json.dump(data, f, ensure_ascii=False)

    except (OSError, IOError) as e:
        raise ExportError(f"Failed to write JSON file: {e}")
    except (TypeError, ValueError) as e:
        raise ExportError(f"Failed to serialize calculation to JSON: {e}")


def save_calculation_json_timestamped(
    result: CalculationResult,
    output_dir: Path,
    prefix: str = "calculation"
) -> Path:
    """
    Save calculation result to timestamped JSON file.

    Generates filename like: calculation_20250114_143022.json

    Args:
        result: CalculationResult to export
        output_dir: Directory to save file in
        prefix: Filename prefix (default: "calculation")

    Returns:
        Path to created JSON file

    Raises:
        ExportError: If file write fails
    """
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp_str}.json"
    output_path = output_dir / filename

    save_calculation_json(result, output_path, pretty=True)

    return output_path


def load_calculation_json(json_path: Path) -> CalculationResult:
    """
    Load calculation result from JSON file.

    Args:
        json_path: Path to JSON file

    Returns:
        CalculationResult object

    Raises:
        ExportError: If file read or parsing fails
    """
    if not json_path.exists():
        raise ExportError(f"JSON file not found: {json_path}")

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Reconstruct CalculationResult from dictionary
        return CalculationResult(
            id=data.get("id"),
            timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else datetime.now(),
            policy_data=data["policy"],
            vehicles=data["vehicles"],
            drivers=data["drivers"],
            al_selection=data["al_selection"],
            intermediate_factors=data["factors"],
            premium_subtotal=data["premium_subtotal"],
            fees_total=data["fees_total"],
            taxes_total=data["taxes_total"],
            al_total=data["al_total"],
            reconciliation_delta=data.get("reconciliation_delta"),
            metadata=data.get("metadata", {}),
        )

    except (OSError, IOError) as e:
        raise ExportError(f"Failed to read JSON file: {e}")
    except (KeyError, ValueError, TypeError) as e:
        raise ExportError(f"Invalid JSON format: {e}")


def save_calculation_summary_json(
    result: CalculationResult,
    output_path: Path
) -> None:
    """
    Save a simplified summary of calculation result to JSON file.

    This creates a more compact JSON file with only key results,
    excluding intermediate factors and detailed breakdowns.

    Args:
        result: CalculationResult to export
        output_path: Path to output JSON file

    Raises:
        ExportError: If file write fails
    """
    try:
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Create summary dictionary
        summary = {
            "id": result.id,
            "timestamp": result.timestamp.isoformat() if result.timestamp else None,
            "policy": {
                "insured_name": result.policy_data.get("insured_name", ""),
                "state": result.policy_data.get("state", ""),
                "effective_date": result.policy_data.get("effective_date", ""),
            },
            "vehicle_count": len(result.vehicles),
            "driver_count": len(result.drivers),
            "limit": result.al_selection.get("limit", ""),
            "program": result.metadata.get("program", ""),
            "results": {
                "premium_subtotal": result.premium_subtotal,
                "fees_total": result.fees_total,
                "taxes_total": result.taxes_total,
                "al_total": result.al_total,
            },
            "reconciliation": {
                "status": result.get_reconciliation_status(),
                "delta": result.reconciliation_delta,
            },
        }

        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

    except (OSError, IOError) as e:
        raise ExportError(f"Failed to write JSON summary: {e}")
    except (TypeError, ValueError) as e:
        raise ExportError(f"Failed to serialize summary to JSON: {e}")


def save_batch_calculations_json(
    results: list[CalculationResult],
    output_path: Path,
    pretty: bool = True
) -> None:
    """
    Save multiple calculation results to a single JSON file.

    Args:
        results: List of CalculationResult objects
        output_path: Path to output JSON file
        pretty: If True, format JSON with indentation

    Raises:
        ExportError: If file write fails
    """
    try:
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert all results to dictionaries
        data = {
            "count": len(results),
            "exported_at": datetime.now().isoformat(),
            "calculations": [result.to_json_dict() for result in results],
        }

        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                json.dump(data, f, ensure_ascii=False)

    except (OSError, IOError) as e:
        raise ExportError(f"Failed to write batch JSON file: {e}")
    except (TypeError, ValueError) as e:
        raise ExportError(f"Failed to serialize calculations to JSON: {e}")


def validate_json_file(json_path: Path) -> bool:
    """
    Validate that a JSON file contains a valid calculation result.

    Args:
        json_path: Path to JSON file to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        load_calculation_json(json_path)
        return True
    except ExportError:
        return False


def get_json_metadata(json_path: Path) -> Optional[dict]:
    """
    Extract metadata from a calculation JSON file without loading the full result.

    Returns basic information like timestamp, insured name, totals.

    Args:
        json_path: Path to JSON file

    Returns:
        Dictionary with metadata or None if file invalid

    Raises:
        ExportError: If file read fails
    """
    if not json_path.exists():
        raise ExportError(f"JSON file not found: {json_path}")

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        metadata = {
            "id": data.get("id"),
            "timestamp": data.get("timestamp"),
            "insured_name": data.get("policy", {}).get("insured_name", ""),
            "al_total": data.get("al_total"),
            "reconciliation_status": data.get("reconciliation_status"),
        }

        return metadata

    except (OSError, IOError) as e:
        raise ExportError(f"Failed to read JSON file: {e}")
    except (ValueError, TypeError, KeyError):
        return None
