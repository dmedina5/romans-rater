@echo off
REM Build script for Windows executable
REM Run this on Windows with Python 3.11+ installed

echo =============================================
echo  Roman's Rater 4.21 - Windows Build
echo =============================================
echo.

REM Check Python version
python --version
if %errorlevel% neq 0 (
    echo Error: Python not found. Please install Python 3.11+
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

REM Build executable
echo.
echo Building Windows executable...
pyinstaller romans-rater.spec --clean
if %errorlevel% neq 0 (
    echo Error: Build failed
    exit /b 1
)

echo.
echo =============================================
echo Build complete!
echo.
echo Executable location: dist\romans-rater.exe
echo.
echo To test:
echo   dist\romans-rater.exe
echo   dist\romans-rater.exe path\to\quote.pdf
echo =============================================
