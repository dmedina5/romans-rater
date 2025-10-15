"""
PDF parser for Roman's Rater 4.21

This module extracts text and tabular data from auto liability quote PDFs
using pdfplumber as the primary parser, with PyMuPDF as fallback.
"""

from pathlib import Path
from typing import Dict, Any, Optional, List
import pdfplumber
import fitz  # PyMuPDF

from ..exceptions import ParserError, OCRError


class PDFParser:
    """
    PDF parser that extracts text and tables from quote PDFs.

    Uses pdfplumber as primary parser with PyMuPDF as fallback.
    """

    def __init__(self, pdf_path: Path):
        """
        Initialize PDF parser.

        Args:
            pdf_path: Path to PDF file

        Raises:
            ParserError: If PDF file not found or cannot be opened
        """
        if not pdf_path.exists():
            raise ParserError(f"PDF file not found: {pdf_path}")

        self.pdf_path = pdf_path
        self._text_content: Optional[str] = None
        self._tables: Optional[List[List[List[str]]]] = None

    def extract_text(self, use_ocr: bool = False) -> str:
        """
        Extract all text from PDF.

        Args:
            use_ocr: If True and text extraction fails, attempt OCR

        Returns:
            Extracted text content

        Raises:
            ParserError: If text extraction fails
            OCRError: If OCR is required but fails
        """
        if self._text_content is not None:
            return self._text_content

        # Try pdfplumber first
        try:
            text = self._extract_text_pdfplumber()
            if text and len(text.strip()) > 50:  # Reasonable amount of text
                self._text_content = text
                return text
        except Exception as e:
            # Log but continue to fallback
            pass

        # Try PyMuPDF as fallback
        try:
            text = self._extract_text_pymupdf()
            if text and len(text.strip()) > 50:
                self._text_content = text
                return text
        except Exception as e:
            # Log but continue to OCR if requested
            pass

        # If both failed and OCR requested, try OCR
        if use_ocr:
            try:
                text = self._extract_text_ocr()
                self._text_content = text
                return text
            except Exception as e:
                raise OCRError(f"OCR extraction failed: {e}")

        raise ParserError(
            "Failed to extract text from PDF. The PDF may be image-based. "
            "Try enabling OCR."
        )

    def _extract_text_pdfplumber(self) -> str:
        """Extract text using pdfplumber."""
        text_parts = []

        with pdfplumber.open(self.pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        return "\n\n".join(text_parts)

    def _extract_text_pymupdf(self) -> str:
        """Extract text using PyMuPDF as fallback."""
        text_parts = []

        doc = fitz.open(self.pdf_path)
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = page.get_text()
                if page_text:
                    text_parts.append(page_text)
        finally:
            doc.close()

        return "\n\n".join(text_parts)

    def _extract_text_ocr(self) -> str:
        """
        Extract text using OCR (pytesseract + PyMuPDF for image rendering).

        Raises:
            OCRError: If OCR processing fails
        """
        try:
            import pytesseract
            from PIL import Image
            import io
        except ImportError:
            raise OCRError(
                "OCR dependencies not available. "
                "Install pytesseract and Pillow: pip install pytesseract Pillow"
            )

        # Check if Tesseract is installed
        try:
            pytesseract.get_tesseract_version()
        except Exception:
            raise OCRError(
                "Tesseract not installed. "
                "Install from: https://github.com/tesseract-ocr/tesseract"
            )

        text_parts = []
        doc = fitz.open(self.pdf_path)

        try:
            for page_num in range(len(doc)):
                page = doc[page_num]

                # Render page to image (150 DPI for good OCR quality)
                pix = page.get_pixmap(matrix=fitz.Matrix(150/72, 150/72))
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))

                # Perform OCR
                ocr_data = pytesseract.image_to_data(
                    img,
                    output_type=pytesseract.Output.DICT
                )

                # Check OCR confidence (FR-009: 80% threshold)
                confidences = [
                    int(conf) for conf in ocr_data['conf'] if conf != '-1'
                ]
                if confidences:
                    avg_confidence = sum(confidences) / len(confidences)
                    if avg_confidence < 80:
                        raise OCRError(
                            f"OCR confidence too low: {avg_confidence:.1f}% "
                            f"(threshold: 80%)"
                        )

                # Extract text
                page_text = pytesseract.image_to_string(img)
                if page_text:
                    text_parts.append(page_text)

        finally:
            doc.close()

        if not text_parts:
            raise OCRError("No text extracted from OCR")

        return "\n\n".join(text_parts)

    def extract_tables(self) -> List[List[List[str]]]:
        """
        Extract all tables from PDF.

        Returns:
            List of tables (one per page), where each table is a list of rows,
            and each row is a list of cell values

        Raises:
            ParserError: If table extraction fails
        """
        if self._tables is not None:
            return self._tables

        try:
            tables = []

            with pdfplumber.open(self.pdf_path) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        # Clean up table data
                        for table in page_tables:
                            cleaned_table = [
                                [cell.strip() if cell else "" for cell in row]
                                for row in table
                            ]
                            tables.append(cleaned_table)

            self._tables = tables
            return tables

        except Exception as e:
            raise ParserError(f"Failed to extract tables from PDF: {e}")

    def get_page_count(self) -> int:
        """
        Get number of pages in PDF.

        Returns:
            Page count
        """
        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                return len(pdf.pages)
        except Exception as e:
            raise ParserError(f"Failed to get page count: {e}")

    def extract_text_from_region(
        self,
        page_num: int,
        x0: float,
        y0: float,
        x1: float,
        y1: float
    ) -> str:
        """
        Extract text from a specific region of a page.

        Useful for extracting specific fields when their location is known.

        Args:
            page_num: Page number (0-indexed)
            x0, y0: Top-left corner coordinates
            x1, y1: Bottom-right corner coordinates

        Returns:
            Text from specified region

        Raises:
            ParserError: If extraction fails or page not found
        """
        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                if page_num >= len(pdf.pages):
                    raise ParserError(f"Page {page_num} not found in PDF")

                page = pdf.pages[page_num]
                bbox = (x0, y0, x1, y1)
                cropped = page.crop(bbox)
                text = cropped.extract_text()

                return text.strip() if text else ""

        except Exception as e:
            raise ParserError(f"Failed to extract text from region: {e}")

    def search_text(self, pattern: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
        """
        Search for text pattern in PDF.

        Args:
            pattern: Text pattern to search for
            case_sensitive: Whether to perform case-sensitive search

        Returns:
            List of matches with page number and context

        Raises:
            ParserError: If search fails
        """
        matches = []

        try:
            text = self.extract_text()
            lines = text.split('\n')

            search_pattern = pattern if case_sensitive else pattern.lower()

            for line_num, line in enumerate(lines):
                search_line = line if case_sensitive else line.lower()
                if search_pattern in search_line:
                    matches.append({
                        "line_number": line_num,
                        "line": line.strip(),
                        "context": self._get_context(lines, line_num, 2)
                    })

            return matches

        except Exception as e:
            raise ParserError(f"Failed to search text: {e}")

    def _get_context(self, lines: List[str], line_num: int, context_lines: int) -> List[str]:
        """Get surrounding lines for context."""
        start = max(0, line_num - context_lines)
        end = min(len(lines), line_num + context_lines + 1)
        return [lines[i].strip() for i in range(start, end)]

    def get_metadata(self) -> Dict[str, Any]:
        """
        Extract PDF metadata.

        Returns:
            Dictionary with metadata (title, author, creation date, etc.)
        """
        try:
            doc = fitz.open(self.pdf_path)
            metadata = doc.metadata
            doc.close()
            return metadata
        except Exception:
            return {}

    def is_image_based(self) -> bool:
        """
        Check if PDF is image-based (requires OCR).

        Returns:
            True if PDF appears to be image-based
        """
        try:
            text = self.extract_text(use_ocr=False)
            # If very little text extracted, likely image-based
            return len(text.strip()) < 100
        except ParserError:
            return True


def parse_pdf(pdf_path: Path, use_ocr: bool = False) -> Dict[str, Any]:
    """
    Convenience function to parse PDF and return all extracted data.

    Args:
        pdf_path: Path to PDF file
        use_ocr: Whether to use OCR for image-based PDFs

    Returns:
        Dictionary with text, tables, and metadata

    Raises:
        ParserError: If parsing fails
    """
    parser = PDFParser(pdf_path)

    return {
        "text": parser.extract_text(use_ocr=use_ocr),
        "tables": parser.extract_tables(),
        "page_count": parser.get_page_count(),
        "metadata": parser.get_metadata(),
        "is_image_based": parser.is_image_based(),
    }
