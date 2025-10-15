"""
Roman's Rater 4.21 - Setup Configuration
Offline Auto Liability Insurance Rating System
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="romans-rater",
    version="4.21.0",
    author="Roman's Rater Team",
    description="Offline desktop application for verifying commercial auto liability insurance premium calculations",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.11",
    install_requires=[
        "pdfplumber>=0.10.0",
        "PyMuPDF>=1.23.0",
        "pytesseract>=0.3.10",
        "openpyxl>=3.1.0",
        "pandas>=2.0.0",
        "nicegui>=1.4.0",
        "python-dateutil>=2.8.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "mypy>=1.5.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "romans-rater=main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Financial and Insurance Industry",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Office/Business :: Financial",
    ],
)
