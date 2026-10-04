import React, { forwardRef, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { getPublicAppUrl } from '../../services/api';

function buildVerificationUrl(ticketId) {
  const ticketBase = import.meta.env.VITE_PUBLIC_TICKET_BASE_URL;
  const base = ticketBase
    ? String(ticketBase).replace(/\/$/, '')
    : getPublicAppUrl();
  return `${base}/#/verify-ticket/${ticketId}`;
}

const TicketCard = forwardRef(function TicketCard(
  { ticket, registrationId, index, totalCount, onDownloadSingle },
  ref
) {
  const ticketVisualRef = useRef(null);
  const safeTicket = ticket || {};
  const ticketId = safeTicket.ticketId || `${registrationId || 'REG'}-T${String((index || 0) + 1).padStart(2, '0')}`;
  const participantName = safeTicket.name || safeTicket.participantName || `Participant ${(index || 0) + 1}`;
  const verificationValue = buildVerificationUrl(ticketId);
  const participantNumber = (index || 0) + 1;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 sm:my-6 px-1 sm:px-0" ref={ref}>

      <div
        ref={ticketVisualRef}
        className="bg-[#FFFDF9] p-1.5 sm:p-3 rounded-[24px] sm:rounded-[28px]"
      >
        <div className="relative rounded-3xl shadow-festive bg-gradient-to-r from-[#700910] via-[#8F121B] to-[#5C060D] text-white border-2 border-[#D4AF37]/80 overflow-visible">

          <div className="absolute inset-1.5 rounded-[22px] border border-[#F5E7B2]/40 pointer-events-none" />

          <div className="hidden sm:block absolute left-[32%] top-[-10px] w-5 h-5 rounded-full bg-[#FFFDF9] border border-amber-900/30 z-20" />
          <div className="hidden sm:block absolute left-[32%] bottom-[-10px] w-5 h-5 rounded-full bg-[#FFFDF9] border border-amber-900/30 z-20" />

          <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[260px]">

            {/* Left stub — ticket/reg IDs stacked above QR so nothing clips */}
            <div className="sm:col-span-5 p-5 sm:p-6 bg-[#4A040A]/60 sm:border-r-2 sm:border-dashed sm:border-[#D4AF37]/50 flex flex-col gap-4 relative">

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#D4AF37] text-stone-900 shadow-sm">
                    EVENT PASS
                  </span>
                  <span className="text-xs font-mono font-bold tracking-widest text-[#F5E7B2]">
                    PARTICIPANT {participantNumber}
                  </span>
                </div>

                <div className="font-festive font-black text-2xl sm:text-3xl text-[#F5E7B2] leading-tight tracking-wide drop-shadow-sm">
                  ₹{safeTicket.price || 299}
                </div>
                <p className="text-[10px] text-amber-200/80 uppercase font-bold tracking-wider">
                  Official Admission Pass
                </p>
              </div>

              <div className="py-3 px-3 rounded-xl bg-black/25 border border-[#D4AF37]/45 space-y-2 shrink-0">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-amber-200/80 font-extrabold mb-0.5">
                    TICKET ID
                  </p>
                  <p className="font-mono text-base sm:text-lg font-black text-white tracking-wide break-all leading-snug select-all">
                    {ticketId}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-amber-200/80 font-extrabold mb-0.5">
                    REG
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold text-amber-100 tracking-wide break-all select-all">
                    {registrationId}
                  </p>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 mt-auto pt-1">
                <div className="p-2 bg-white rounded-lg shadow-md shrink-0">
                  <QRCodeSVG
                    value={verificationValue}
                    size={72}
                    bgColor="#FFFFFF"
                    fgColor="#1C1C1C"
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="flex flex-col items-end text-right pb-1">
                  <div className="flex items-center gap-1 text-[11px] font-black text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>ENTRY CONFIRMED</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-widest mt-0.5">
                    VENUE: {EVENT_CONFIG.VENUE}
                  </span>
                </div>
              </div>

            </div>

            <div className="sm:col-span-7 p-5 sm:p-6 flex flex-col justify-between relative">

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
                    PARTICIPANT {participantNumber} NAME
                  </span>
                  <span className="font-festive font-extrabold text-lg sm:text-xl text-white tracking-wide">
                    {participantName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-amber-200/70 tracking-widest">AGE</span>
                    <span className="font-bold text-sm text-amber-100">{safeTicket.age ?? 20} yrs</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-amber-200/70 tracking-widest">EVENT LOCATION</span>
                    <span className="font-bold text-sm text-amber-100">{safeTicket.eventLocation || safeTicket.venue || EVENT_CONFIG.VENUE}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D4AF37]/30 flex flex-wrap items-center justify-between text-[11px] text-amber-100/90 gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {EVENT_CONFIG.DATE}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {EVENT_CONFIG.TIME}
                  </span>
                </div>
                <span className="flex items-center gap-1 font-bold text-white">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {EVENT_CONFIG.VENUE}
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center sm:justify-end w-full">
        <button
          type="button"
          onClick={() => onDownloadSingle(ticket, ticketVisualRef)}
          className="w-full sm:w-auto text-xs sm:text-sm font-bold text-royal-crimson hover:text-amber-800 bg-white hover:bg-amber-50 px-5 py-3 rounded-full border border-amber-300 shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-95 min-h-[44px]"
          title={`Download Pass for ${ticket.name}`}
        >
          <Download className="w-4 h-4 text-royal-crimson shrink-0" />
          <span>Download Pass ({ticket.name})</span>
        </button>
      </div>

    </div>
  );
});

export default TicketCard;
