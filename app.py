#!/usr/bin/env python3
"""
Roman's Rater 4.21 - Application Entry Point

This is the main entry point for the NiceGUI web application.
Run this file directly to start the web interface.
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.ui import launch_gui
from src.main import _load_config

# Determine paths
app_dir = Path(__file__).parent
data_dir = app_dir / "data"
db_path = data_dir / "calculations.db"
config_path = data_dir / "config.json"

# Load config
config = _load_config(config_path)

# Launch GUI
if __name__ == "__main__":
    print("=" * 60)
    print("Roman's Rater 4.21")
    print("Auto Liability Rating Engine")
    print("=" * 60)
    print()
    print("Starting web interface...")
    print("Open your browser to: http://localhost:8080")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()

    launch_gui(data_dir, db_path, config)
