#!/bin/bash
# Build script for macOS executable
# Run this on macOS with Python 3.11+ installed

set -e

echo "=============================================="
echo " Roman's Rater 4.21 - macOS Build"
echo "=============================================="
echo

# Check Python version
python3 --version || {
    echo "Error: Python 3 not found. Please install Python 3.11+"
    exit 1
}

# Install dependencies
echo "Installing dependencies..."
pip3 install -r requirements.txt

# Build executable
echo
echo "Building macOS executable..."
pyinstaller romans-rater.spec --clean

echo
echo "=============================================="
echo "Build complete!"
echo
echo "Executable location: dist/romans-rater"
echo
echo "To create .app bundle (optional):"
echo "  1. Rename dist/romans-rater to dist/romans-rater.app"
echo "  2. Move to Applications folder"
echo
echo "To test:"
echo "  ./dist/romans-rater"
echo "  ./dist/romans-rater path/to/quote.pdf"
echo "=============================================="
