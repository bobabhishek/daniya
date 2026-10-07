import base64
import io
import logging
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from PIL import Image, ImageEnhance

from ..config import settings

logger = logging.getLogger("dandiya_backend.ocr")

HF_OCR_URL = "https://router.huggingface.co/v1/chat/completions"

_ocr_engine = None


def get_ocr_engine():
    """Legacy local OCR entry point retained only for dev/test fallback, never for production."""
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


class HuggingFaceHostedOCRProvider:
    """Hosted OCR provider using the Hugging Face Inference Providers router with HF_TOKEN."""

    @staticmethod
    def _extract_text_from_response(payload: Dict[str, Any]) -> str:
        choices = payload.get("choices") or []
        for choice in choices:
            message = choice.get("message") or {}
            content = message.get("content")
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                parts: List[str] = []
                for item in content:
                    if isinstance(item, dict):
                        text = item.get("text")
                        if isinstance(text, str):
                            parts.append(text)
                    elif isinstance(item, str):
                        parts.append(item)
                combined = "".join(parts).strip()
                if combined:
                    return combined
            if isinstance(message, str):
                return message.strip()
        return ""

    @classmethod
    def extract_text(cls, image_bytes: bytes) -> str:
        token = (settings.HF_TOKEN or "").strip()
        if not token:
            raise ValueError("HF_TOKEN is missing. Hosted OCR is disabled for safety.")

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        request_payload = {
            "model": settings.HF_OCR_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Read the entire receipt image and return the exact visible text. "
                                "Include the payment total, individual amounts, payee, and UPI/transaction details. "
                                "Return only raw OCR text with no markdown or explanations."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}",
                            },
                        },
                    ],
                }
            ],
            "max_tokens": 400,
            "temperature": 0.1,
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        timeout = httpx.Timeout(
            connect=5.0,
            read=float(settings.HF_OCR_TIMEOUT_SECONDS),
            write=10.0,
            pool=10.0,
        )

        with httpx.Client(timeout=timeout) as client:
            response = client.post(HF_OCR_URL, headers=headers, json=request_payload)
            response.raise_for_status()
            payload = response.json()

        text = cls._extract_text_from_response(payload)
        if not text:
            logger.warning("HF hosted OCR returned an empty text payload.")
        return text


class OcrService:
    """
    Authoritative OCR Service specialized for Indian UPI Payment Screenshots.
    Hosted HF OCR is the production path; local RapidOCR remains a strict dev/test fallback only.
    """

    @staticmethod
    def _process_receipt_local(image_bytes: bytes, expected_amount: Optional[int] = None) -> Dict[str, Any]:
        """Local RapidOCR pipeline retained only for development/test fallback and explicit rollback."""
        if not image_bytes:
            return {
                "detected_amount": None,
                "confidence": 0.0,
                "raw_text": "",
                "upi_reference": None,
                "payee_detected": False,
                "all_detected_numbers": []
            }

        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")

            max_dim = 720
            if max(img.width, img.height) > max_dim:
                scale = max_dim / float(max(img.width, img.height))
                new_w = max(1, int(img.width * scale))
                new_h = max(1, int(img.height * scale))
                img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
            elif min(img.width, img.height) < 200:
                scale = 2.0
                new_w = int(img.width * scale)
                new_h = int(img.height * scale)
                img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            clean_bytes = buf.getvalue()
        except Exception as e:
            logger.warning(f"Image decompression error in OCR: {e}")
            clean_bytes = image_bytes

        engine = get_ocr_engine()
        extracted_lines: List[str] = []
        scores: List[float] = []

        if engine:
            try:
                ocr_results, _ = engine(clean_bytes, use_cls=False)
                if ocr_results:
                    for item in ocr_results:
                        text = item[1].strip()
                        conf = float(item[2])
                        if text:
                            extracted_lines.append(text)
                            scores.append(conf)

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
        parsed = OcrService._parse_financial_text(extracted_lines, raw_text, expected_amount=expected_amount)
        parsed["raw_text"] = raw_text
        parsed["confidence"] = round(avg_confidence, 2)
        logger.info(
            f"Local RapidOCR Finished: detected={parsed.get('detected_amount')}, "
            f"expected={expected_amount}, conf={parsed.get('confidence')}, "
            f"numbers={parsed.get('all_detected_numbers')}, raw_length={len(raw_text)}"
        )
        logger.debug(f"Local RapidOCR Raw Text:\n{raw_text}")
        return parsed

    @classmethod
    def process_receipt(cls, image_bytes: bytes, expected_amount: Optional[int] = None) -> Dict[str, Any]:
        """
        Processes receipt image bytes through the hosted HF OCR provider in production.
        Local RapidOCR remains available for explicit dev/test fallback only.
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

        t_prepare_start = time.perf_counter()
        try:
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")

            max_dim = 1024
            if max(img.width, img.height) > max_dim:
                scale = max_dim / float(max(img.width, img.height))
                new_w = max(1, int(img.width * scale))
                new_h = max(1, int(img.height * scale))
                img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
            elif min(img.width, img.height) < 200:
                scale = 2.0
                new_w = int(img.width * scale)
                new_h = int(img.height * scale)
                img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=92)
            clean_bytes = buf.getvalue()
        except Exception as e:
            logger.warning(f"Image decompression error in OCR: {e}")
            clean_bytes = image_bytes
        t_prepare_ms = (time.perf_counter() - t_prepare_start) * 1000
        logger.info(f"[OCR] image preparation: {t_prepare_ms:.1f} ms")

        provider = (getattr(settings, "OCR_PROVIDER", "auto") or "auto").strip().lower()
        if provider == "rapidocr":
            logger.info("OCR_PROVIDER=rapidocr; using local RapidOCR pipeline.")
            return cls._process_receipt_local(image_bytes, expected_amount=expected_amount)

        if provider == "auto":
            provider = "huggingface" if (settings.HF_TOKEN or "").strip() else "rapidocr"

        if provider == "rapidocr":
            logger.info("OCR_PROVIDER resolved to rapidocr; using local RapidOCR pipeline.")
            return cls._process_receipt_local(image_bytes, expected_amount=expected_amount)

        token = (settings.HF_TOKEN or "").strip()
        is_production = (settings.ENVIRONMENT or "").lower() == "production"

        if not token:
            if settings.HF_OCR_USE_LOCAL_FALLBACK and not is_production:
                logger.info("HF_TOKEN missing; using local RapidOCR fallback for development/test compatibility.")
                return cls._process_receipt_local(image_bytes, expected_amount=expected_amount)
            logger.warning("HF_TOKEN missing. Hosted OCR is disabled; failing closed to protect verification integrity.")
            return {
                "detected_amount": None,
                "confidence": 0.0,
                "raw_text": "",
                "upi_reference": None,
                "payee_detected": False,
                "all_detected_numbers": []
            }

        try:
            t_hf_start = time.perf_counter()
            raw_text = HuggingFaceHostedOCRProvider.extract_text(clean_bytes)
            t_hf_ms = (time.perf_counter() - t_hf_start) * 1000
            logger.info(f"[OCR] HF API request: {t_hf_ms:.1f} ms")
        except Exception as exc:
            if settings.HF_OCR_USE_LOCAL_FALLBACK and not is_production:
                logger.warning(f"Hosted HF OCR failed in dev/test; falling back to local RapidOCR: {exc}")
                return cls._process_receipt_local(image_bytes, expected_amount=expected_amount)
            logger.warning(f"Hosted Hugging Face OCR failed safely: {exc}", exc_info=True)
            return {
                "detected_amount": None,
                "confidence": 0.0,
                "raw_text": "",
                "upi_reference": None,
                "payee_detected": False,
                "all_detected_numbers": []
            }

        extracted_lines = [line.strip() for line in re.split(r"\r?\n", raw_text) if line.strip()]
        t_parse_start = time.perf_counter()
        parsed = cls._parse_financial_text(extracted_lines, raw_text, expected_amount=expected_amount)
        t_parse_ms = (time.perf_counter() - t_parse_start) * 1000
        logger.info(f"[OCR] HF response parsing: {t_parse_ms:.1f} ms")

        parsed["raw_text"] = raw_text
        parsed["confidence"] = 0.98 if raw_text else 0.0
        t_extract_ms = (time.perf_counter() - t_parse_start) * 1000
        logger.info(f"[OCR] amount extraction: {t_extract_ms:.1f} ms")

        logger.info(
            f"Hosted HF OCR Finished: detected={parsed.get('detected_amount')}, "
            f"expected={expected_amount}, conf={parsed.get('confidence')}, "
            f"numbers={parsed.get('all_detected_numbers')}, raw_length={len(raw_text)}"
        )
        logger.debug(f"Hosted HF OCR Raw Text:\n{raw_text}")

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
        # Handles: ₹299, ₹ 299, Rs. 299, Rs 299, INR 299, 299/-, Paid ₹299, Amount: 299, Rs. 1196, ₹2,990
        # -------------------------------------------------------------------------
        p1_patterns = [
            r"(?:₹|\u20b9|\u20a8|rs\.?|inr|re\.?)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
            r"([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:₹|\u20b9|\u20a8|rs\.?|inr|re\.?|/-)",
            r"(?:paid|amount|total|sum|debited|transferred|sent|payment of|rupees)\s*[:\-]?\s*(?:₹|\u20b9|\u20a8|rs\.?|inr|[?*#~]|\b[bBrRfFnN]\b)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
        ]
        for pat in p1_patterns:
            for m in re.finditer(pat, full_text, re.IGNORECASE):
                val = clean_num(m.group(1))
                if val is not None:
                    candidates.append((1, val, m.group(0)))
                    all_detected_numbers.append(val)

        # -------------------------------------------------------------------------
        # Priority 2: Common OCR substitutions / character mistakes for ₹ or decimals
        # Common receipt OCR output can include values like B299.00, n299, ?299, 299.00,
        # 1,299.00, or 1196.00 when the currency marker is imperfectly recognized.
        # -------------------------------------------------------------------------
        p2_patterns = [
            r"(?:[?*#~¥£$€]|\b[bBnNrRfFtTzZ])\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)",
            r"\b([0-9]+(?:,[0-9]{3})*)\.([0-9]{2})\b",
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
        # e.g. "299", "₹299", "299.00", "1,299", "1196"
        # -------------------------------------------------------------------------
        line_pattern = r"^[₹\u20b9\u20a8?*#~¥£$€bBnNrRfFtTzZ]?\s*([0-9]+(?:,[0-9]{3})*|[0-9]{2,5})(?:\.[0-9]{2})?\s*(?:/-)?$"
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
            # If expected_amount was provided and matches any candidate found on the receipt,
            # select that verified amount from the receipt
            if expected_amount is not None:
                for prio, val, _ in candidates:
                    if val == expected_amount:
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
