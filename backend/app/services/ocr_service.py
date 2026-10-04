import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import io
import re
import logging
from typing import Optional, Dict, Any, List
from PIL import Image, ImageEnhance

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
            logger.error(f"Failed to initialize RapidOCR engine: {e}", exc_info=True)
            _ocr_engine = None
    return _ocr_engine


class OcrService:
    """
    Authoritative OCR Service specialized for Indian UPI Payment Screenshots.
    Extracts payment amounts, transaction references, and payee signatures.
    """

    @classmethod
    def process_receipt(cls, image_bytes: bytes, expected_amount: Optional[int] = None) -> Dict[str, Any]:
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

        # Validate that image_bytes can be decompressed and normalized
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Scale ultra-high-res smartphone screenshots to max 1600px
            max_dim = 1600
            if max(img.width, img.height) > max_dim:
                scale = max_dim / float(max(img.width, img.height))
                new_w = max(1, int(img.width * scale))
                new_h = max(1, int(img.height * scale))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            elif min(img.width, img.height) < 200:
                # Upscale tiny screenshots/crops so RapidOCR detection model can resolve digits
                scale = 2.0
                new_w = int(img.width * scale)
                new_h = int(img.height * scale)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Save lossless PNG bytes for OCR input to avoid JPEG compression ringing
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            clean_bytes = buf.getvalue()
        except Exception as e:
            logger.warning(f"Image decompression error in OCR: {e}")
            clean_bytes = image_bytes

        engine = get_ocr_engine()
        extracted_lines: List[str] = []
        scores: List[float] = []

        if engine:
            try:
                ocr_results, _ = engine(clean_bytes)
                if ocr_results:
                    for item in ocr_results:
                        text = item[1].strip()
                        conf = float(item[2])
                        if text:
                            extracted_lines.append(text)
                            scores.append(conf)
                
                # If no text detected on first pass, attempt high-contrast enhanced pass
                if not extracted_lines:
                    try:
                        contrast_img = ImageEnhance.Contrast(img).enhance(1.4)
                        contrast_img = ImageEnhance.Sharpness(contrast_img).enhance(1.5)
                        c_buf = io.BytesIO()
                        contrast_img.save(c_buf, format="PNG")
                        retry_results, _ = engine(c_buf.getvalue())
                        if retry_results:
                            for item in retry_results:
                                text = item[1].strip()
                                conf = float(item[2])
                                if text:
                                    extracted_lines.append(text)
                                    scores.append(conf)
                    except Exception as retry_err:
                        logger.debug(f"Contrast enhancement retry skipped: {retry_err}")
            except Exception as e:
                logger.error(f"Error during RapidOCR execution: {e}", exc_info=True)

        raw_text = "\n".join(extracted_lines)
        avg_confidence = (sum(scores) / len(scores)) if scores else 0.0

        # Parse financial fields from raw text lines
        parsed = cls._parse_financial_text(extracted_lines, raw_text, expected_amount=expected_amount)
        parsed["raw_text"] = raw_text
        parsed["confidence"] = round(avg_confidence, 2)

        logger.info(
            f"RapidOCR Finished: detected={parsed.get('detected_amount')}, "
            f"expected={expected_amount}, conf={parsed.get('confidence')}, "
            f"numbers={parsed.get('all_detected_numbers')}, raw_length={len(raw_text)}"
        )
        logger.debug(f"RapidOCR Raw Text:\n{raw_text}")

        return parsed

    @classmethod
    def _parse_financial_text(
        cls,
        lines: List[str],
        full_text: str,
        expected_amount: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Extracts amount, UTR / UPI reference, and payee name from OCR lines.
        """
        upi_ref: Optional[str] = None
        payee_detected = False
        candidates: List[tuple] = []  # (priority, int_value, matched_text)
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
            twelve_digit = re.search(r"\b([0-9]{12})\b", full_text)
            if twelve_digit:
                upi_ref = twelve_digit.group(1)

        def clean_num(s: str) -> Optional[int]:
            if not s:
                return None
            cleaned = s.replace(",", "").strip()
            try:
                val = int(float(cleaned))
                if 50 <= val <= 100000:
                    return val
            except ValueError:
                pass
            return None

        # -------------------------------------------------------------------------
        # Priority 1: High-confidence explicit currency symbol or financial keyword
        # Handles: ₹299, ₹ 299, Rs. 299, Rs 299, INR 299, 299/-, Paid ₹299, Amount: 299
        # -------------------------------------------------------------------------
        p1_patterns = [
            r"(?:₹|\u20b9|\u20a8|rs\.?|inr|re\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
            r"([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:₹|\u20b9|\u20a8|rs\.?|inr|re\.?|/-)",
            r"(?:paid|amount|total|sum|debited|transferred|sent|payment of|rupees)\s*[:\-]?\s*(?:₹|\u20b9|\u20a8|rs\.?|inr|[?*#~]|\b[bBrRfFnN]\b)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
        ]
        for pat in p1_patterns:
            for m in re.finditer(pat, full_text, re.IGNORECASE):
                val = clean_num(m.group(1))
                if val is not None:
                    candidates.append((1, val, m.group(0)))
                    all_detected_numbers.append(val)

        # -------------------------------------------------------------------------
        # Priority 2: Common OCR substitutions / character mistakes for ₹ or decimals
        # In RapidOCR (PP-OCR), the Indian Rupee symbol ₹ is frequently recognized as
        # 'B', 'n', 'R', 'F', 'T', 'z', '?', '*', '~', or '¥'.
        # Handles: B299.00, n299, ?299, 299.00, 1,299.00
        # -------------------------------------------------------------------------
        p2_patterns = [
            r"(?:[?*#~¥£$€]|\b[bBnNrRfFtTzZ])\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
            r"\b([0-9]{1,3}(?:,[0-9]{3})*)\.([0-9]{2})\b",
        ]
        for pat in p2_patterns:
            for m in re.finditer(pat, full_text, re.IGNORECASE):
                val = clean_num(m.group(1))
                if val is not None:
                    candidates.append((2, val, m.group(0)))
                    all_detected_numbers.append(val)

        # -------------------------------------------------------------------------
        # Priority 3: Standalone lines in OCR output
        # UPI apps display the payment amount as a prominent standalone block:
        # e.g. "299", "₹299", "299.00", "1,299"
        # -------------------------------------------------------------------------
        line_pattern = r"^[₹\u20b9\u20a8?*#~¥£$€bBnNrRfFtTzZ]?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{2,5})(?:\.[0-9]{2})?\s*(?:/-)?$"
        for line in lines:
            cleaned_line = line.strip()
            m = re.match(line_pattern, cleaned_line, re.IGNORECASE)
            if m:
                val = clean_num(m.group(1))
                if val is not None:
                    candidates.append((3, val, cleaned_line))
                    all_detected_numbers.append(val)

        # -------------------------------------------------------------------------
        # Priority 4: Standalone numbers in scrubbed text
        # Filter out years (2020-2035), timestamps (10:15), dates (04/10/2026),
        # and long reference/phone numbers (6+ digits).
        # -------------------------------------------------------------------------
        scrubbed = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", " ", full_text)
        scrubbed = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", " ", scrubbed)
        scrubbed = re.sub(r"\b\d{6,}\b", " ", scrubbed)

        for m in re.finditer(r"\b([0-9]{2,5})\b", scrubbed):
            val = clean_num(m.group(1))
            if val is not None and not (2020 <= val <= 2035):
                candidates.append((4, val, m.group(0)))
                all_detected_numbers.append(val)

        # Unique ordered list of all detected numbers
        unique_nums = list(dict.fromkeys(all_detected_numbers))

        detected_amount: Optional[int] = None
        if candidates:
            # Sort candidates by priority (1 is highest)
            candidates.sort(key=lambda x: x[0])
            # If expected_amount was provided and matches a high-confidence candidate (priority <= 3)
            # from the receipt, select that candidate from the receipt
            if expected_amount is not None:
                for prio, val, _ in candidates:
                    if val == expected_amount and prio <= 3:
                        detected_amount = val
                        break
            if detected_amount is None:
                detected_amount = candidates[0][1]

        return {
            "detected_amount": detected_amount,
            "upi_reference": upi_ref,
            "payee_detected": payee_detected,
            "all_detected_numbers": unique_nums
        }
