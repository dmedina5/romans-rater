"""
Field extractor for Roman's Rater 4.21

This module extracts structured data from PDF text and tables,
converting raw PDF content into Policy, Vehicle, and Driver objects.
"""

import re
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple

from ..models.policy import Policy, Address, Vehicle, Driver, ALSelection
from ..exceptions import ParserError, ValidationError


class FieldExtractor:
    """
    Extracts structured fields from parsed PDF data.

    Converts raw text and tables into domain models.
    """

    def __init__(self, text: str, tables: List[List[List[str]]]):
        """
        Initialize field extractor.

        Args:
            text: Full text content from PDF
            tables: Extracted tables from PDF
        """
        self.text = text
        self.tables = tables
        self.lines = [line.strip() for line in text.split('\n') if line.strip()]

    def extract_policy(self) -> Policy:
        """
        Extract complete policy information from PDF.

        Returns:
            Policy object with all fields populated

        Raises:
            ParserError: If required fields cannot be extracted
        """
        # Extract basic policy info
        insured_name = self._extract_insured_name()
        address = self._extract_address()
        effective_date = self._extract_effective_date()
        expiration_date = self._extract_expiration_date()

        # Extract vehicles, drivers, and AL selection
        vehicles = self._extract_vehicles()
        drivers = self._extract_drivers()
        al_selection = self._extract_al_selection()

        # Create policy object
        try:
            policy = Policy(
                insured_name=insured_name,
                address=address,
                effective_date=effective_date,
                expiration_date=expiration_date,
                vehicles=vehicles,
                drivers=drivers,
                al_selection=al_selection,
            )
            return policy
        except Exception as e:
            raise ParserError(f"Failed to create policy object: {e}")

    def _extract_insured_name(self) -> str:
        """Extract insured name from text."""
        patterns = [
            r"(?:Named Insured|Insured Name)[:\s]+(.+)",
            r"(?:Insured)[:\s]+(.+)",
            r"(?:Company Name|Business Name)[:\s]+(.+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, self.text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up (stop at certain delimiters)
                name = re.split(r'(?:Date|Policy|Address)', name, flags=re.IGNORECASE)[0].strip()
                if name:
                    return name

        raise ParserError("Could not extract insured name from PDF")

    def _extract_address(self) -> Address:
        """Extract insured address from text."""
        # Look for address patterns
        patterns = [
            r"(?:Address)[:\s]+(.+?)\n",
            r"(?:Mailing Address)[:\s]+(.+?)\n",
            r"(?:Street)[:\s]+(.+?)\n",
        ]

        address_text = None
        for pattern in patterns:
            match = re.search(pattern, self.text, re.IGNORECASE | re.DOTALL)
            if match:
                address_text = match.group(1).strip()
                break

        if not address_text:
            raise ParserError("Could not extract address from PDF")

        # Parse address components
        # Try to split into street, city, state, zip
        parts = [p.strip() for p in address_text.split(',')]

        if len(parts) < 2:
            raise ParserError(f"Could not parse address: {address_text}")

        street = parts[0]
        city = parts[1] if len(parts) > 1 else ""

        # Extract state and zip from last part
        state_zip_pattern = r"([A-Z]{2})\s*(\d{5}(?:-\d{4})?)"
        state = ""
        zip_code = ""

        for part in parts[1:]:
            match = re.search(state_zip_pattern, part)
            if match:
                state = match.group(1)
                zip_code = match.group(2)
                # Remove state/zip from city if present
                city = re.sub(state_zip_pattern, "", city).strip()
                break

        if not state:
            raise ParserError(f"Could not extract state from address: {address_text}")

        return Address(
            street=street,
            city=city,
            state=state,
            zip=zip_code,
        )

    def _extract_effective_date(self) -> date:
        """Extract policy effective date."""
        patterns = [
            r"(?:Effective Date|Eff\. Date|Effective)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(?:Policy Period)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        ]

        for pattern in patterns:
            match = re.search(pattern, self.text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                return self._parse_date(date_str)

        raise ParserError("Could not extract effective date from PDF")

    def _extract_expiration_date(self) -> date:
        """Extract policy expiration date."""
        patterns = [
            r"(?:Expiration Date|Exp\. Date|Expires)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(?:Policy Period)[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+(?:to|through|-)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        ]

        for pattern in patterns:
            match = re.search(pattern, self.text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                return self._parse_date(date_str)

        raise ParserError("Could not extract expiration date from PDF")

    def _parse_date(self, date_str: str) -> date:
        """Parse date string in various formats."""
        formats = [
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%m/%d/%y",
            "%m-%d-%y",
            "%Y-%m-%d",
            "%d/%m/%Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        raise ParserError(f"Could not parse date: {date_str}")

    def _extract_vehicles(self) -> List[Vehicle]:
        """Extract all vehicles from PDF tables."""
        vehicles = []

        # Look for vehicle table in extracted tables
        vehicle_table = self._find_table_by_header(
            ["vin", "year", "make", "model", "class", "body"]
        )

        if not vehicle_table:
            raise ParserError("Could not find vehicle table in PDF")

        # Parse each row as a vehicle
        for row in vehicle_table[1:]:  # Skip header row
            if not row or not any(row):
                continue  # Skip empty rows

            try:
                vehicle = self._parse_vehicle_row(row)
                vehicles.append(vehicle)
            except Exception as e:
                # Log but continue with other vehicles
                pass

        if not vehicles:
            raise ParserError("No vehicles found in PDF")

        return vehicles

    def _parse_vehicle_row(self, row: List[str]) -> Vehicle:
        """Parse a single vehicle row from table."""
        # Expected columns (order may vary):
        # VIN, Year, Make/Model, Class, Body Type, Business Class, Garage Address

        # Try to identify columns
        vin = ""
        year = 0
        make_model = ""
        vehicle_class = ""
        body_type = ""
        business_class = ""

        for cell in row:
            cell = cell.strip()
            if not cell:
                continue

            # VIN: 17 characters
            if len(cell) == 17 and re.match(r'^[A-HJ-NPR-Z0-9]{17}$', cell.upper()):
                vin = cell.upper()
            # Year: 4 digits
            elif re.match(r'^\d{4}$', cell) and 1900 <= int(cell) <= 2100:
                year = int(cell)
            # Class: ClassX format
            elif re.match(r'^Class[1368]$', cell, re.IGNORECASE):
                vehicle_class = cell
            # Body type keywords
            elif any(keyword in cell.lower() for keyword in ['tractor', 'truck', 'van', 'trailer']):
                if not make_model:
                    make_model = cell
                body_type = cell
            # Business class keywords
            elif any(keyword in cell.lower() for keyword in ['for-hire', 'private', 'rental']):
                business_class = cell

        # Validation
        if not vin:
            raise ValidationError("VIN required for vehicle")
        if not year:
            raise ValidationError("Year required for vehicle")
        if not vehicle_class:
            # Default to Class8 if not found
            vehicle_class = "Class8"

        # Use default garage address (same as policy address)
        # This will be set by caller if needed
        garage = Address(street="", city="", state="", zip="")

        return Vehicle(
            vin=vin,
            year=year,
            make_model=make_model or "Unknown",
            vehicle_class=vehicle_class,
            body_type=body_type or "Unknown",
            business_class=business_class or "For-Hire Long Haul",
            garage=garage,
        )

    def _extract_drivers(self) -> List[Driver]:
        """Extract all drivers from PDF tables."""
        drivers = []

        # Look for driver table
        driver_table = self._find_table_by_header(
            ["driver", "license", "dob", "experience", "accidents", "violations"]
        )

        if not driver_table:
            # Drivers may be optional in some PDFs
            return drivers

        # Parse each row as a driver
        for row in driver_table[1:]:  # Skip header row
            if not row or not any(row):
                continue

            try:
                driver = self._parse_driver_row(row)
                drivers.append(driver)
            except Exception as e:
                # Log but continue
                pass

        return drivers

    def _parse_driver_row(self, row: List[str]) -> Driver:
        """Parse a single driver row from table."""
        # Expected columns: Name, License State, License No, DOB, Years Exp,
        # Accidents, Violations, Suspensions, Major Violations, Excluded

        first_name = ""
        last_name = ""
        license_state = ""
        license_no = ""
        dob = None
        years_exp = 0.0
        accidents = 0
        violations = 0
        suspensions = 0
        major_violations = 0
        excluded = False

        # Parse cells
        for i, cell in enumerate(row):
            cell = cell.strip()
            if not cell:
                continue

            # Name (first cell, typically)
            if i == 0 and ' ' in cell:
                parts = cell.split()
                first_name = parts[0]
                last_name = ' '.join(parts[1:])
            # State code (2 letters)
            elif len(cell) == 2 and cell.isalpha():
                license_state = cell.upper()
            # License number
            elif re.match(r'^[A-Z0-9-]+$', cell, re.IGNORECASE) and len(cell) > 5:
                license_no = cell
            # DOB (date)
            elif re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell):
                try:
                    dob = self._parse_date(cell)
                except:
                    pass
            # Numeric values
            elif cell.isdigit():
                num = int(cell)
                if 0 <= num <= 100:
                    # Could be experience, accidents, violations, etc.
                    # Use heuristics based on position or header
                    if years_exp == 0:
                        years_exp = float(num)
                    elif accidents == 0:
                        accidents = num
                    elif violations == 0:
                        violations = num
            # Excluded flag
            elif cell.lower() in ['yes', 'y', 'excluded', 'true']:
                excluded = True

        # Validation
        if not first_name or not last_name:
            raise ValidationError("Driver name required")
        if not license_state:
            raise ValidationError("License state required")
        if not dob:
            raise ValidationError("DOB required for driver")

        return Driver(
            first_name=first_name,
            last_name=last_name,
            license_state=license_state,
            license_no=license_no or "UNKNOWN",
            dob=dob,
            years_exp=years_exp,
            accidents=accidents,
            violations=violations,
            suspensions=suspensions,
            major_violations=major_violations,
            excluded=excluded,
        )

    def _extract_al_selection(self) -> ALSelection:
        """Extract AL coverage selection."""
        # Look for limit in text
        limit_pattern = r"(?:Limit|Coverage|AL)[:\s]+\$?(\d{1,3}(?:,\d{3})*(?:/\$\d{1,3}(?:,\d{3})*)?)"

        match = re.search(limit_pattern, self.text, re.IGNORECASE)
        if match:
            limit = match.group(1).replace(',', '')
        else:
            # Default limit
            limit = "1000000/2000000"

        # Look for program override
        program_override = None
        if re.search(r'\bCW\b', self.text):
            program_override = "CW"
        elif re.search(r'\bSS\b', self.text):
            program_override = "SS"

        # Look for radius
        radius_pattern = r"(?:Radius)[:\s]+(\d+(?:-\d+)?|\d+\+)"
        radius_bucket = None
        match = re.search(radius_pattern, self.text, re.IGNORECASE)
        if match:
            radius_str = match.group(1)
            # Convert to standard bucket format
            if '0' in radius_str or '50' in radius_str:
                radius_bucket = "0-50"
            elif '51' in radius_str or '200' in radius_str:
                radius_bucket = "51-200"
            elif '201' in radius_str or '500' in radius_str:
                radius_bucket = "201-500"
            elif '500+' in radius_str or '501' in radius_str:
                radius_bucket = "500+"

        return ALSelection(
            limit=limit,
            program_override=program_override,
            radius_bucket=radius_bucket,
        )

    def _find_table_by_header(self, keywords: List[str]) -> Optional[List[List[str]]]:
        """
        Find table that contains specified keywords in header row.

        Args:
            keywords: List of keywords to search for in header

        Returns:
            Table (list of rows) or None if not found
        """
        for table in self.tables:
            if not table or not table[0]:
                continue

            # Check first row for keywords
            header_row = [cell.lower() for cell in table[0]]
            header_text = ' '.join(header_row)

            # Check if enough keywords match
            matches = sum(1 for keyword in keywords if keyword.lower() in header_text)
            if matches >= len(keywords) // 2:  # At least half match
                return table

        return None

    def extract_printed_total(self) -> Optional[float]:
        """
        Extract the printed total from PDF for reconciliation.

        Returns:
            Printed total amount or None if not found
        """
        patterns = [
            r"(?:Total Premium|Total AL|Grand Total)[:\s]+\$?([\d,]+\.?\d*)",
            r"(?:Total Due|Amount Due)[:\s]+\$?([\d,]+\.?\d*)",
        ]

        for pattern in patterns:
            match = re.search(pattern, self.text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    return float(amount_str)
                except ValueError:
                    continue

        return None
