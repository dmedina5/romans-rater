#!/bin/bash
# Roman's Rater 4.21 - Launcher Script

# Activate virtual environment
source venv/bin/activate

# Check if --help flag
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    python -m src.main --help
    exit 0
fi

# Run the web app (default) or CLI mode if PDF file provided
if [[ -z "$1" ]] || [[ "$1" == "--gui" ]]; then
    # Web GUI mode
    python app.py
else
    # CLI mode (PDF file provided)
    python -m src.main "$@"
fi
