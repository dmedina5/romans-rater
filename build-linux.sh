#!/bin/bash
# Build script for Linux executable
# Run this on Linux with Python 3.11+ installed

set -e

echo "=============================================="
echo " Roman's Rater 4.21 - Linux Build"
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
echo "Building Linux executable..."
pyinstaller romans-rater.spec --clean

echo
echo "=============================================="
echo "Build complete!"
echo
echo "Executable location: dist/romans-rater"
echo
echo "To make portable:"
echo "  cd dist"
echo "  tar -czf romans-rater-linux-x64.tar.gz romans-rater"
echo
echo "To test:"
echo "  ./dist/romans-rater"
echo "  ./dist/romans-rater path/to/quote.pdf"
echo "=============================================="
