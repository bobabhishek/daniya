import React, { forwardRef, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

/**
 * TicketCard
 *
 * Two separate refs:
 * - Forwarded `ref` (outer wrapper) — used by parent for scroll/identification only
 * - Internal `ticketVisualRef` (ticket body only) — passed back via onDownloadSingle(ticket, ref)
 *   and used by html2canvas. This captures ONLY the ticket, no black background, no buttons.
 *
 * QR URL is configurable via VITE_PUBLIC_TICKET_BASE_URL env var:
 *   - Local LAN testing:  VITE_PUBLIC_TICKET_BASE_URL=http://192.168.X.X:5173
 *   - Production:         VITE_PUBLIC_TICKET_BASE_URL=https://your-domain.com
 */

function buildVerificationUrl(ticketId) {
  const base = import.meta.env.VITE_PUBLIC_TICKET_BASE_URL
    ? import.meta.env.VITE_PUBLIC_TICKET_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`;
  return `${base}/#/verify-ticket/${ticketId}`;
}

const TicketCard = forwardRef(function TicketCard(
  { ticket, registrationId, index, totalCount, onDownloadSingle },
  ref
) {
  const ticketVisualRef = useRef(null);
  const verificationValue = buildVerificationUrl(ticket.ticketId);

  return (
    <div className="w-full max-w-3xl mx-auto my-6" ref={ref}>

      {/* === TICKET VISUAL — html2canvas captures this element only === */}
      {/* Cream background ensures the download has no black background */}
      <div
        ref={ticketVisualRef}
        style={{ backgroundColor: '#FFFDF9', padding: '12px', borderRadius: '28px' }}
      >
        <div className="relative rounded-3xl overflow-hidden shadow-festive bg-gradient-to-r from-[#700910] via-[#8F121B] to-[#5C060D] text-white border-2 border-[#D4AF37]/80">

          {/* Ornate Gold Trim Inner Border */}
          <div className="absolute inset-1.5 rounded-[22px] border border-[#F5E7B2]/40 pointer-events-none" />

          {/* Notches */}
          <div className="hidden sm:block absolute left-[26%] top-[-10px] w-5 h-5 rounded-full bg-[#FFFDF9] border border-amber-900/30 z-20" />
          <div className="hidden sm:block absolute left-[26%] bottom-[-10px] w-5 h-5 rounded-full bg-[#FFFDF9] border border-amber-900/30 z-20" />

          <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[220px]">

            {/* Left Stub */}
            <div className="sm:col-span-4 p-5 sm:p-6 bg-[#4A040A]/60 sm:border-r-2 sm:border-dashed sm:border-[#D4AF37]/50 flex flex-col justify-between relative">

              <div>
                <div className="flex items-center gap-2 mb-2">
                  {/* Always EVENT PASS — student discount handled separately via contact */}
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#D4AF37] text-stone-900 shadow-sm">
                    EVENT PASS
                  </span>
                  <span className="text-[10px] font-mono tracking-widest text-[#F5E7B2]">
                    #{String(index + 1).padStart(2, '0')}/{String(totalCount).padStart(2, '0')}
                  </span>
                </div>

                <div className="font-festive font-black text-2xl text-[#F5E7B2] leading-tight tracking-wide drop-shadow-sm">
                  ₹{ticket.price || 299}
                </div>
                <p className="text-[10px] text-amber-200/80 uppercase font-semibold tracking-wider">
                  Official Admission Pass
                </p>
              </div>

              <div className="my-4 py-2 border-y border-[#D4AF37]/30 flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-amber-200/70 font-semibold">TICKET ID</p>
                  <p className="font-mono text-xs font-black text-white tracking-widest truncate">
                    {ticket.ticketId}
                  </p>
                  <p className="text-[8px] font-mono text-stone-400">REG: {registrationId}</p>
                </div>

                {/* QR Code — encodes verification URL only, not raw JSON */}
                <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                  <QRCodeSVG
                    value={verificationValue}
                    size={64}
                    bgColor="#FFFFFF"
                    fgColor="#1C1C1C"
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>ENTRY CONFIRMED</span>
              </div>

            </div>

            {/* Right Body */}
            <div className="sm:col-span-8 p-5 sm:p-6 flex flex-col justify-between relative">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="block text-[10px] uppercase font-bold tracking-widest text-amber-300">
                    {EVENT_CONFIG.EVENT_ORGANIZER} PRESENTS
                  </span>
                  <h3 className="font-festive font-extrabold text-2xl sm:text-3xl text-[#FFFDF9] tracking-wide drop-shadow-md">
                    {EVENT_CONFIG.EVENT_NAME}
                  </h3>
                  <p className="text-xs font-serif italic text-amber-200">
                    Garba &amp; Dandiya Raas Mahotsav
                  </p>
                </div>

                <div className="h-12 w-auto p-1 bg-white/95 rounded-xl border border-[#D4AF37] shadow-sm shrink-0">
                  <img
                    src={EVENT_CONFIG.ASSETS.LOGO}
                    alt="Event Logo"
                    className="h-10 w-auto object-contain"
                  />
                </div>
              </div>

              <div className="my-4 p-3.5 rounded-xl bg-black/25 border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-amber-200/70 tracking-widest">
                    PARTICIPANT NAME
                  </span>
                  <span className="font-festive font-extrabold text-lg sm:text-xl text-white tracking-wide">
                    {ticket.name}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-amber-200/70 tracking-widest">AGE</span>
                    <span className="font-bold text-sm text-amber-100">{ticket.age} yrs</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-amber-200/70 tracking-widest">GATE</span>
                    <span className="font-bold text-sm text-amber-100">GATE 3</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D4AF37]/30 flex flex-wrap items-center justify-between text-[11px] text-amber-100/90 gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {EVENT_CONFIG.DATE}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {EVENT_CONFIG.TIME}
                  </span>
                </div>
                <span className="flex items-center gap-1 font-semibold text-white">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {EVENT_CONFIG.VENUE}
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* === END TICKET VISUAL === */}

      {/* Download button is OUTSIDE ticketVisualRef — not captured in the PNG */}
      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={() => onDownloadSingle(ticket, ticketVisualRef)}
          className="text-xs font-bold text-royal-crimson hover:text-amber-800 bg-white hover:bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200 shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Pass ({ticket.name})</span>
        </button>
      </div>

    </div>
  );
});

export default TicketCard;
