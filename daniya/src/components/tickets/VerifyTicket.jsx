import React, { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Loader2, ShieldCheck,
  Calendar, MapPin, Clock, User, Hash, CreditCard
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

/**
 * VerifyTicket – QR gate scanner page.
 *
 * Reached via:  #/verify-ticket/:ticketId
 * The QR on each ticket encodes:
 *   <origin>/verify-ticket/KD-XXXXXX-T01
 *
 * Fetches ticket data from the backend and renders a clean human-readable
 * PASS VERIFICATION screen.
 * Does NOT download JSON, show raw DB fields, or expose internal data.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchTicketFromBackend(ticketId) {
  const res = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticketId)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('TICKET_NOT_FOUND');
    throw new Error(`HTTP_ERROR_${res.status}`);
  }
  return res.json();
}

function passLabel(ticket) {
  if (!ticket) return 'Event Pass';
  if (ticket.category === 'STUDENT') return 'Student Pass';
  return 'Regular Pass';
}

function isValid(ticket) {
  return ticket &&
    (ticket.paymentStatus === 'PAID' || ticket.paymentStatus === 'VERIFIED');
}

export default function VerifyTicket({ ticketId }) {
  const [pageStatus, setPageStatus] = useState('loading'); // 'loading'|'valid'|'invalid'|'error'
  const [ticket, setTicket]         = useState(null);
  const [errMsg, setErrMsg]         = useState('');

  useEffect(() => {
    if (!ticketId) {
      setPageStatus('invalid');
      setErrMsg('No ticket ID provided.');
      return;
    }
    setPageStatus('loading');
    fetchTicketFromBackend(ticketId)
      .then((data) => {
        setTicket(data);
        setPageStatus(isValid(data) ? 'valid' : 'invalid');
      })
      .catch((err) => {
        if (err.message === 'TICKET_NOT_FOUND') {
          setPageStatus('invalid');
          setErrMsg('This ticket does not exist or has not been issued.');
        } else {
          setPageStatus('error');
          setErrMsg('Could not reach the verification server. Please check your connection and try again.');
        }
      });
  }, [ticketId]);

  return (
    <div className="min-h-screen bg-[#0d0608] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm mx-auto">

        {/* ── Loading ── */}
        {pageStatus === 'loading' && (
          <div className="text-center text-white space-y-4 py-16">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-amber-400" />
            <p className="text-sm font-semibold text-stone-400 uppercase tracking-widest">
              Verifying ticket…
            </p>
          </div>
        )}

        {/* ── Network / server error ── */}
        {pageStatus === 'error' && (
          <div className="rounded-3xl border-2 border-red-700/60 bg-[#1a0404] p-8 text-center space-y-4 shadow-2xl">
            <XCircle className="w-14 h-14 mx-auto text-red-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-wide">
              Verification Failed
            </h2>
            <p className="text-sm text-stone-400">{errMsg}</p>
          </div>
        )}

        {/* ── INVALID / NOT FOUND ── */}
        {pageStatus === 'invalid' && (
          <div className="rounded-3xl border-2 border-red-700/60 bg-[#1a0404] p-8 text-center space-y-4 shadow-2xl">
            <XCircle className="w-14 h-14 mx-auto text-red-500" />
            <h2 className="text-2xl font-black text-red-400 uppercase tracking-widest">
              INVALID TICKET
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              {errMsg ||
                'This ticket is invalid, unpaid, or does not belong to a valid registration.'}
            </p>
            <div className="mt-4 px-4 py-2 rounded-xl bg-red-900/30 border border-red-700/50 text-xs text-red-300 font-mono break-all">
              {ticketId || 'Unknown ID'}
            </div>
          </div>
        )}

        {/* ── VALID PASS ── */}
        {pageStatus === 'valid' && ticket && (
          <div className="rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/70">

            {/* Header band */}
            <div className="bg-gradient-to-r from-[#700910] via-[#8F121B] to-[#5C060D] px-6 py-5 text-center">
              <p className="text-[10px] font-extrabold tracking-widest uppercase text-amber-300/80 mb-1">
                {EVENT_CONFIG.EVENT_ORGANIZER}
              </p>
              <h1 className="text-xl font-black text-[#F5E7B2] tracking-wide font-festive drop-shadow">
                ENTRY PASS
              </h1>
              <p className="text-[10px] text-amber-200/70 mt-0.5 italic">
                {EVENT_CONFIG.EVENT_NAME} · Gate Verification
              </p>
              <div className="mt-3 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
            </div>

            {/* Pass body */}
            <div className="bg-[#1a0407] px-6 py-6 space-y-4">

              <VerifyRow
                icon={<User className="w-4 h-4 text-amber-400" />}
                label="Participant"
                value={ticket.name?.toUpperCase()}
                highlight
              />

              <VerifyRow
                icon={<span className="text-amber-400 text-sm font-bold leading-none">~</span>}
                label="Age"
                value={`${ticket.age} Years`}
              />

              <div className="h-[1px] bg-[#D4AF37]/20" />

              <VerifyRow
                icon={<Hash className="w-4 h-4 text-amber-400" />}
                label="Ticket ID"
                value={ticket.ticketId}
                mono
              />

              <VerifyRow
                icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
                label="Registration ID"
                value={ticket.registrationId}
                mono
              />

              <VerifyRow
                icon={<CreditCard className="w-4 h-4 text-amber-400" />}
                label="Pass"
                value={passLabel(ticket)}
              />

              <div className="h-[1px] bg-[#D4AF37]/20" />

              <VerifyRow
                icon={<Calendar className="w-4 h-4 text-amber-400" />}
                label="Event"
                value={ticket.eventName || EVENT_CONFIG.EVENT_NAME}
              />

              <VerifyRow
                icon={<Clock className="w-4 h-4 text-amber-400" />}
                label="Date"
                value={ticket.eventDate || EVENT_CONFIG.DATE}
              />

              <VerifyRow
                icon={<MapPin className="w-4 h-4 text-amber-400" />}
                label="Gate"
                value={ticket.gate || 'Gate 3'}
              />

              <VerifyRow
                icon={<CreditCard className="w-4 h-4 text-emerald-400" />}
                label="Payment"
                value={
                  ticket.paymentStatus === 'PAID' || ticket.paymentStatus === 'VERIFIED'
                    ? 'PAID / VERIFIED'
                    : ticket.paymentStatus
                }
                valueClass="text-emerald-400 font-black"
              />

              <div className="h-[1px] bg-[#D4AF37]/30" />

              {/* Status badge */}
              <div className="flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-emerald-900/30 border border-emerald-700/40">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <span className="text-lg font-black text-emerald-400 tracking-widest uppercase">
                  ENTRY VALID
                </span>
              </div>

            </div>

            {/* Footer band */}
            <div className="bg-[#0d0204] px-6 py-3 text-center">
              <p className="text-[10px] text-stone-600 uppercase tracking-widest">
                Official Admission Verification · {EVENT_CONFIG.EVENT_NAME}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

/** Single info row inside the verification card */
function VerifyRow({ icon, label, value, highlight = false, mono = false, valueClass = '' }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
          {label}
        </p>
        <p
          className={[
            'text-sm font-bold break-all',
            highlight ? 'text-white text-base' : 'text-[#F5E7B2]',
            mono ? 'font-mono tracking-widest' : '',
            valueClass
          ].join(' ')}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
