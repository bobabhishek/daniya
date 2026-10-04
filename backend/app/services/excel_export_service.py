import io
import os
import logging
from typing import List, Dict, Any, Optional
from PIL import Image as PILImage
from openpyxl import Workbook
from openpyxl.drawing.image import Image as OpenpyxlImage
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from ..services.receipt_storage_service import ReceiptStorageService
from ..config import settings

logger = logging.getLogger("dandiya_backend.excel_export")


class ExcelExportService:
    """
    Service to generate the official Master Registrations Excel workbook (.xlsx).
    Physically embeds payment screenshot images directly into the worksheet
    so that the workbook is 100% self-contained and offline-accessible.
    """

    HEADERS = [
        "Registration ID",
        "Date/Time",
        "Booked By",
        "Participant(s)",
        "Attendee Details (Name, Age, DOB, ID Proof, Ticket ID)",
        "Count",
        "Under 20",
        "Above 20",
        "Amount",
        "Entered Amount",
        "Verified Amount",
        "Payment",
        "Verification",
        "UPI Ref / UTR",
        "Confidence",
        "Payment Screenshot",
        "Ticket Link(s)",
        "View Receipt"
    ]

    # Target thumbnail dimensions in pixels
    MAX_THUMB_WIDTH = 220
    MAX_THUMB_HEIGHT = 240

    @classmethod
    def generate_master_excel(
        cls,
        registrations: List[Dict[str, Any]],
        base_url: Optional[str] = None
    ) -> bytes:
        """
        Builds the Master Excel spreadsheet containing all registration rows.
        For verified registrations with stored receipts, thumbnail images are
        physically embedded into the Payment Screenshot column.
        Configurable public domain is used for ticket and receipt links.
        """
        app_url = (base_url or getattr(settings, "PUBLIC_APP_URL", "http://localhost:5173")).rstrip("/")
        wb = Workbook()
        ws = wb.active
        ws.title = "Master Registrations"
        ws.views.sheetView[0].showGridLines = True

        # Styles definition
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")  # Slate 800
        
        regular_font = Font(name="Calibri", size=10, color="0F172A")
        bold_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        paid_font = Font(name="Calibri", size=10, bold=True, color="166534")  # Green
        pending_font = Font(name="Calibri", size=10, bold=True, color="B45309")  # Amber
        failed_font = Font(name="Calibri", size=10, bold=True, color="991B1B")  # Red
        
        link_font = Font(name="Calibri", size=9, color="2563EB", underline="single")
        
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
        right_align = Alignment(horizontal="right", vertical="center")

        thin_side = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=thin_side, left=thin_side, right=thin_side, bottom=thin_side)

        # 1. Write Header Row
        ws.append(cls.HEADERS)
        ws.row_dimensions[1].height = 30

        for col_idx, header_title in enumerate(cls.HEADERS, start=1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = cell_border

        # Temporary in-memory buffers to keep image streams alive until wb.save completes
        image_streams = []

        # Find column indices dynamically
        screenshot_col_idx = cls.HEADERS.index("Payment Screenshot") + 1
        screenshot_col_letter = get_column_letter(screenshot_col_idx)

        # 2. Populate Registration Rows
        current_row = 2
        for reg in registrations:
            reg_id = reg.get("registrationId", "")
            date_time = reg.get("dateTime") or reg.get("uploadedAt") or reg.get("createdAt") or ""
            booked_by = f"{reg.get('userName', '')} ({reg.get('userEmail', '')})".strip(" ()") or "N/A"
            summary = reg.get("participantsSummary") or ""
            
            # Detailed breakdown of each participant
            participants = reg.get("participants") or []
            details_list = []
            for p_idx, p in enumerate(participants, start=1):
                p_name = p.get("name", "N/A")
                p_age = p.get("age", "")
                p_dob = p.get("dob", "")
                p_id_type = p.get("idProofType", "Aadhaar Card")
                p_ticket = p.get("ticketId") or "N/A"
                details_list.append(f"{p_idx}. {p_name} | Age: {p_age} | DOB: {p_dob} | ID: {p_id_type} | Ticket: {p_ticket}")
            attendee_details = "\n".join(details_list) if details_list else summary

            count = reg.get("count", reg.get("participantCount", 1))
            under20 = reg.get("under20Count", 0)
            above20 = reg.get("above20Count", 0)
            amount = reg.get("expectedAmount", reg.get("amount", reg.get("totalAmount", 0)))
            entered_amount = f"₹{reg.get('enteredAmount')}" if reg.get("enteredAmount") is not None else "N/A"
            verified_amount = f"₹{reg.get('ocrAmount', reg.get('verifiedAmount'))}" if (reg.get('ocrAmount') is not None or reg.get('verifiedAmount') is not None) else "N/A"
            payment_status = str(reg.get("paymentStatus", "PENDING")).upper()
            verification_status = str(reg.get("verificationStatus", "PENDING")).upper()
            upi_ref = reg.get("upiRef") or reg.get("transactionRef") or reg.get("transactionId") or "N/A"
            
            ocr_conf = reg.get("ocrConfidence") if reg.get("ocrConfidence") is not None else reg.get("confidence")
            if ocr_conf is not None:
                confidence_str = f"{int(ocr_conf * 100)}%" if isinstance(ocr_conf, float) and ocr_conf <= 1.0 else f"{ocr_conf}%"
            else:
                confidence_str = "N/A"

            ticket_ids = reg.get("ticketIds", [])
            if ticket_ids and len(ticket_ids) == 1:
                ticket_link = f"{app_url}/#/passes?ticket={ticket_ids[0]}"
            else:
                ticket_link = f"{app_url}/#/passes?reg={reg_id}"
            receipt_link = f"{app_url}/#/admin?receipt={reg_id}" if (verification_status == "VERIFIED" or payment_status == "PAID") else "N/A"

            # Base cell values matching HEADERS
            row_data = [
                reg_id,
                date_time,
                booked_by,
                summary,
                attendee_details,
                count,
                under20,
                above20,
                f"₹{amount}",
                entered_amount,
                verified_amount,
                payment_status,
                verification_status,
                upi_ref,
                confidence_str,
                "",  # Payment Screenshot placeholder (image is anchored here)
                ticket_link,
                receipt_link
            ]
            ws.append(row_data)

            # Style each cell in this row
            for col_i in range(1, len(cls.HEADERS) + 1):
                cell = ws.cell(row=current_row, column=col_i)
                cell.border = cell_border
                cell.font = regular_font
                cell.alignment = center_align

            # Specific column styling
            ws.cell(row=current_row, column=1).font = bold_font  # Reg ID
            ws.cell(row=current_row, column=3).alignment = left_align  # Booked by
            ws.cell(row=current_row, column=4).alignment = left_align  # Summary
            ws.cell(row=current_row, column=5).alignment = left_align  # Details
            ws.cell(row=current_row, column=9).font = bold_font  # Amount
            ws.cell(row=current_row, column=9).alignment = right_align

            # Payment Status Color
            c_pay = ws.cell(row=current_row, column=12)
            if payment_status == "PAID":
                c_pay.font = paid_font
            elif payment_status == "FAILED":
                c_pay.font = failed_font
            else:
                c_pay.font = pending_font

            # Verification Status Color
            c_ver = ws.cell(row=current_row, column=13)
            if verification_status == "VERIFIED":
                c_ver.font = paid_font
            elif verification_status == "FAILED" or verification_status == "MISMATCH":
                c_ver.font = failed_font
            else:
                c_ver.font = pending_font

            # Links styling
            c_tlink = ws.cell(row=current_row, column=17)
            c_tlink.alignment = left_align
            c_tlink.font = link_font

            c_rlink = ws.cell(row=current_row, column=18)
            c_rlink.alignment = left_align
            c_rlink.font = link_font if receipt_link != "N/A" else regular_font

            # 3. Check for Verified Payment Screenshot & Physically Embed Image
            has_embedded_image = False
            # Only embed verified receipts
            if verification_status == "VERIFIED" or payment_status == "PAID":
                receipt_path = ReceiptStorageService.get_receipt_path(reg_id)
                if receipt_path and os.path.isfile(receipt_path):
                    try:
                        with PILImage.open(receipt_path) as pil_img:
                            # Normalize RGB for consistent rendering
                            if pil_img.mode != "RGB":
                                pil_img = pil_img.convert("RGB")

                            orig_w, orig_h = pil_img.size
                            if orig_w > 0 and orig_h > 0:
                                # Scale proportionally
                                thumb_img = pil_img.copy()
                                thumb_img.thumbnail(
                                    (cls.MAX_THUMB_WIDTH, cls.MAX_THUMB_HEIGHT),
                                    PILImage.Resampling.LANCZOS
                                )

                                img_bio = io.BytesIO()
                                thumb_img.save(img_bio, format="JPEG", quality=85)
                                img_bio.seek(0)
                                image_streams.append(img_bio)

                                openpyxl_img = OpenpyxlImage(img_bio)
                                openpyxl_img.width = thumb_img.width
                                openpyxl_img.height = thumb_img.height

                                # Anchor image inside Payment Screenshot column for this row
                                cell_coord = f"{screenshot_col_letter}{current_row}"
                                ws.add_image(openpyxl_img, cell_coord)

                                # Set row height based on thumbnail height (approx 1 pt = 1.33 px)
                                row_pt = int(thumb_img.height * 0.75) + 14
                                ws.row_dimensions[current_row].height = max(row_pt, 45)
                                has_embedded_image = True
                    except Exception as e:
                        logger.error(f"Failed to embed receipt image for {reg_id}: {e}")

            if not has_embedded_image:
                ws.row_dimensions[current_row].height = 26

            current_row += 1

        # 4. Set Fixed Column Widths (optimized for readability and embedded images)
        column_widths = {
            "A": 16,  # Registration ID
            "B": 20,  # Date/Time
            "C": 26,  # Booked By
            "D": 26,  # Participant(s)
            "E": 44,  # Attendee Details
            "F": 10,  # Count
            "G": 10,  # Under 20
            "H": 10,  # Above 20
            "I": 13,  # Amount
            "J": 14,  # Entered Amount
            "K": 14,  # Verified Amount
            "L": 14,  # Payment
            "M": 14,  # Verification
            "N": 20,  # UPI Ref / UTR
            "O": 12,  # Confidence
            "P": 36,  # Payment Screenshot (fits ~220px image width comfortably)
            "Q": 34,  # Ticket Link(s)
            "R": 30   # View Receipt
        }
        for col_letter, width in column_widths.items():
            ws.column_dimensions[col_letter].width = width

        # 5. Save to In-Memory Bytes Buffer
        out_stream = io.BytesIO()
        wb.save(out_stream)
        excel_bytes = out_stream.getvalue()

        # Clean up image streams
        for s in image_streams:
            try:
                s.close()
            except Exception:
                pass

        logger.info(
            f"Generated Master Excel successfully: {len(registrations)} rows, "
            f"{len(image_streams)} embedded images, {len(excel_bytes)} bytes."
        )
        return excel_bytes
