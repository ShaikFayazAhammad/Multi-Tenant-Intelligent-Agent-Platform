import io
import os
import re
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class DocumentParseError(Exception):
    """Raised when document parsing fails."""
    pass

class DocumentParser:
    """
    Unified multi-format document parser.
    Extracts clean, normalized text from PDFs, CSVs, TXT, MD, and JSON files.
    """

    @staticmethod
    def clean_text(text: str) -> str:
        """Strip null bytes, control characters, and normalize repeated whitespace."""
        if not text:
            return ""
        # Remove null bytes and unprintable control characters except tabs and newlines
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", text)
        # Normalize multiple spaces per line
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        # Normalize excessive line breaks (> 2 newlines into 2)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    @classmethod
    def parse_pdf(cls, content: bytes, filename: str) -> Dict[str, Any]:
        """Extract text from PDF pages using pypdf."""
        try:
            from pypdf import PdfReader
        except ImportError:
            raise DocumentParseError("pypdf is not installed. Please install pypdf to process PDF files.")

        try:
            stream = io.BytesIO(content)
            reader = PdfReader(stream)
            num_pages = len(reader.pages)
            if num_pages == 0:
                raise DocumentParseError(f"PDF '{filename}' contains 0 pages.")

            extracted_pages: List[str] = []
            warnings: List[str] = []

            for idx, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text() or ""
                    cleaned_page = cls.clean_text(page_text)
                    if cleaned_page:
                        extracted_pages.append(f"--- Page {idx + 1} ---\n{cleaned_page}")
                except Exception as page_err:
                    warnings.append(f"Failed to extract page {idx + 1}: {str(page_err)}")

            full_text = "\n\n".join(extracted_pages).strip()

            if not full_text:
                raise DocumentParseError(
                    f"PDF '{filename}' does not contain extractable text. "
                    "It may be a scanned image or protected document."
                )

            return {
                "text": full_text,
                "char_count": len(full_text),
                "page_count": num_pages,
                "file_type": "pdf",
                "warnings": warnings,
            }

        except DocumentParseError:
            raise
        except Exception as e:
            logger.error(f"Error parsing PDF '{filename}': {e}", exc_info=True)
            raise DocumentParseError(f"Failed to parse PDF '{filename}': {str(e)}")

    @classmethod
    def parse_text_file(cls, content: bytes, filename: str, file_type: str = "txt") -> Dict[str, Any]:
        """Decode plain text, markdown, CSV, or JSON bytes using utf-8 with fallback encodings."""
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
        decoded_text = None

        for enc in encodings:
            try:
                decoded_text = content.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue

        if decoded_text is None:
            # Fallback with replacement
            decoded_text = content.decode("utf-8", errors="replace")

        cleaned = cls.clean_text(decoded_text)
        if not cleaned:
            raise DocumentParseError(f"File '{filename}' contains no readable text content.")

        return {
            "text": cleaned,
            "char_count": len(cleaned),
            "page_count": 1,
            "file_type": file_type,
            "warnings": [],
        }

    @classmethod
    def extract_text(
        cls,
        content: bytes,
        filename: str,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Inspect file extension and content type, then extract text accordingly.
        """
        ext = os.path.splitext(filename.lower())[1]

        if ext == ".pdf" or (content_type and "pdf" in content_type.lower()):
            return cls.parse_pdf(content, filename)
        elif ext in [".txt", ".log"]:
            return cls.parse_text_file(content, filename, file_type="txt")
        elif ext in [".md", ".markdown"]:
            return cls.parse_text_file(content, filename, file_type="markdown")
        elif ext == ".csv":
            return cls.parse_text_file(content, filename, file_type="csv")
        elif ext == ".json":
            return cls.parse_text_file(content, filename, file_type="json")
        else:
            # Check magic bytes for PDF
            if content.startswith(b"%PDF-"):
                return cls.parse_pdf(content, filename)
            # Default fallback to text decoder
            return cls.parse_text_file(content, filename, file_type=ext.lstrip(".") or "txt")
