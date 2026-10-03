import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import io
import re
import logging
from typing import Optional, Dict, Any, List
from PIL import Image

logger = logging.getLogger("dandiya_backend.ocr")

_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
            logger.info("RapidOCR engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize RapidOCR: {e}")
            _ocr_engine = None
    return _ocr_engine


class OcrService:
    """
    Intelligent OCR Service specialized for Indian UPI Payment Screenshots.
    Extracts payment amounts, transaction references, and payee signatures.
    """

    @classmethod
    def process_receipt(cls, image_bytes: bytes) -> Dict[str, Any]:
        """
        Processes receipt image bytes through RapidOCR and parses financial fields.
        Returns:
            {
                "detected_amount": Optional[int],
                "confidence": float,
                "raw_text": str,
                "upi_reference": Optional[str],
                "payee_detected": bool,
                "all_detected_numbers": List[int]
            }
        """
        if not image_bytes:
            return {
                "detected_amount": None,
                "confidence": 0.0,
                "raw_text": "",
                "upi_reference": None,
                "payee_detected": False,
                "all_detected_numbers": []
            }

        # Validate that image_bytes can be opened
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Convert RGBA/P to RGB if necessary for ONNX
            if img.mode != "RGB":
                img = img.convert("RGB")
            
            # Downscale ultra-high resolution smartphone screenshots to max 1280px
            # This speeds up CPU ONNX inference by 3-5x while preserving crisp UPI digits
            max_dim = 1280
            if max(img.width, img.height) > max_dim:
                scale = max_dim / float(max(img.width, img.height))
                new_w = max(1, int(img.width * scale))
                new_h = max(1, int(img.height * scale))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Save normalized RGB bytes for OCR
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            clean_bytes = buf.getvalue()
        except Exception as e:
            logger.warning(f"Image decompression error in OCR: {e}")
            clean_bytes = image_bytes

        engine = get_ocr_engine()
        extracted_lines = []
        scores = []

        if engine:
            try:
                ocr_results, _ = engine(clean_bytes)
                if ocr_results:
                    for item in ocr_results:
                        # item format: [box_coordinates, text_str, confidence_float]
                        text = item[1].strip()
                        conf = float(item[2])
                        if text:
                            extracted_lines.append(text)
                            scores.append(conf)
            except Exception as e:
                logger.error(f"Error during RapidOCR execution: {e}")

        raw_text = "\n".join(extracted_lines)
        avg_confidence = (sum(scores) / len(scores)) if scores else 0.0

        # Parse financial fields from raw text lines
        parsed = cls._parse_financial_text(extracted_lines, raw_text)
        parsed["raw_text"] = raw_text
        parsed["confidence"] = round(avg_confidence, 2)
        return parsed

    @classmethod
    def _parse_financial_text(cls, lines: List[str], full_text: str) -> Dict[str, Any]:
        """
        Extracts amount, UTR / UPI reference, and payee name from OCR lines.
        """
        detected_amount: Optional[int] = None
        upi_ref: Optional[str] = None
        payee_detected = False
        all_detected_numbers: List[int] = []

        lower_full = full_text.lower()
        if any(keyword in lower_full for keyword in ["arpith", "arpit", "manohar", "red hawk", "redhawk"]):
            payee_detected = True

        # Search for UPI transaction reference / UTR
        utr_pattern = r"(?:upi\s*ref|upi\s*txn|transaction\s*id|utr|txn\s*id|ref\s*no)[\s\:\.\#-]*([A-Za-z0-9]{8,22})"
        utr_match = re.search(utr_pattern, full_text, re.IGNORECASE)
        if utr_match:
            upi_ref = utr_match.group(1).strip()
        else:
            # Fallback: standalone 12-digit number (standard Indian banking UTR)
            twelve_digit = re.search(r"\b([0-9]{12})\b", full_text)
            if twelve_digit:
                upi_ref = twelve_digit.group(1)

        # 1. High-confidence regex: Currency symbol preceding or succeeding amount
        # Note: OCR models frequently recognize the Indian Rupee symbol ₹ as 'B', 'R', 'F', or '₹'.
        # Also handles ₹897, ₹ 897.00, Rs. 897, INR 897, B897.00, R897.00, etc.
        currency_amount_patterns = [
            r"(?:₹|rs\.?|inr|[BRF])\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
            r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr)",
            r"(?:paid|amount|total|rs)\s*[:\-]?\s*([0-9]{2,5}(?:\.[0-9]{1,2})?)",
            r"\b([0-9]{2,5})\.00\b",
            r"\b([0-9]{2,5})\.[0-9]{2}\b",
        ]

        for pat in currency_amount_patterns:
            matches = re.finditer(pat, full_text, re.IGNORECASE)
            for m in matches:
                clean_num_str = m.group(1).replace(",", "")
                try:
                    val = int(float(clean_num_str))
                    if 50 <= val <= 100000:
                        all_detected_numbers.append(val)
                        if detected_amount is None:
                            detected_amount = val
                except ValueError:
                    continue

        # 2. Check individual lines for standalone currency amounts (e.g. line is just "897.00" or "897")
        for line in lines:
            cleaned = line.strip().replace(",", "")
            # Check for "₹897", "B897.00", "897.00", etc.
            m = re.match(r"^[₹BRF]?\s*([0-9]{2,5})(?:\.[0-9]{2})?$", cleaned, re.IGNORECASE)
            if m:
                try:
                    val = int(m.group(1))
                    if 50 <= val <= 100000:
                        all_detected_numbers.append(val)
                        if detected_amount is None:
                            detected_amount = val
                except ValueError:
                    pass

        # 3. Fallback: If amount was not preceded by currency symbol, look for valid ticket amounts
        if detected_amount is None:
            # Look for 3-4 digit integers in the text
            int_matches = re.findall(r"\b([0-9]{3,5})\b", full_text)
            for s in int_matches:
                try:
                    val = int(s)
                    # Filter out years like 2026, 2025, 2024
                    if val not in [2024, 2025, 2026, 2027]:
                        all_detected_numbers.append(val)
                        if detected_amount is None:
                            detected_amount = val
                except ValueError:
                    pass

        return {
            "detected_amount": detected_amount,
            "upi_reference": upi_ref,
            "payee_detected": payee_detected,
            "all_detected_numbers": list(set(all_detected_numbers))
        }
