import React, { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { CheckCircle2, Ticket, ShieldCheck, Sparkles } from 'lucide-react';
import TicketCard from '../tickets/TicketCard';
import { useAuth } from '../../context/AuthContext';

export default function StepSuccess({ registration, onReset, onOpenAdmin }) {
  const { isAdmin } = useAuth();
  const ticketsRef = useRef(null);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#DC2626', '#EA580C', '#10B981', '#F59E0B']
      });
    } catch (e) {
      console.log('Confetti trigger:', e);
    }
  }, []);

  /**
   * handleDownloadSingle is called by TicketCard with (ticket, ticketVisualRef).
   * ticketVisualRef.current points to the cream-wrapped ticket body ONLY —
   * no navbar, no button, no black page background is captured.
   */
  const handleDownloadSingle = useCallback(async (ticket, ticketVisualRef) => {
    const el = ticketVisualRef?.current;
    if (!el) {
      alert('Could not find ticket element to capture. Please try again.');
      return;
    }
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#FFFDF9',  // cream, matches the wrapper background
        scale: 2,                     // high-resolution export
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `${ticket.ticketId}-${ticket.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not download ticket image. Please try again.');
    }
  }, []);



  const scrollToTickets = () => {
    ticketsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      
      {/* Success Celebration Card */}
      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-festive p-8 sm:p-10 text-center relative overflow-hidden">
        
        {/* Festive background accents */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500" />
        
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-100 mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Booking Confirmed
        </span>

        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-stone-900 font-festive">
          REGISTRATION SUCCESSFUL
        </h2>

        <p className="mt-2 text-stone-600 text-sm sm:text-base max-w-md mx-auto">
          Your entry passes have been issued. Present your digital ticket pass at the venue entrance.
        </p>

        {/* Confirmation Metadata Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Registration ID</span>
            <p className="font-mono font-extrabold text-sm sm:text-base text-stone-900 tracking-wider">
              {registration.registrationId}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Participants</span>
            <p className="font-extrabold text-sm sm:text-base text-stone-900">
              {registration.count} {registration.count === 1 ? 'Person' : 'People'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Amount Paid</span>
            <p className="font-extrabold text-sm sm:text-base text-royal-crimson">
              ₹{registration.amount}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Payment Status</span>
            <p className="font-extrabold text-sm sm:text-base text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>PAID</span>
            </p>
          </div>

        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={scrollToTickets}
            className="px-6 py-3 rounded-full text-sm font-bold text-stone-800 bg-amber-100/70 hover:bg-amber-200/80 transition-colors flex items-center gap-2"
          >
            <Ticket className="w-4 h-4 text-amber-800" />
            <span>VIEW TICKETS BELOW</span>
          </button>
        </div>

        {/* Confirmation Status Footer Note */}
        <div className="mt-6 pt-4 border-t border-amber-100 flex items-center justify-center gap-2 text-xs text-stone-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          {isAdmin ? (
            <>
              <span>This registration has been added to the master dashboard.</span>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-royal-crimson hover:underline font-bold"
              >
                View in Admin Dashboard &rarr;
              </button>
            </>
          ) : (
            <span>Your booking is saved to your account. You can view your tickets anytime from <strong>My Passes</strong>.</span>
          )}
        </div>

      </div>

      {/* Generated Tickets Section */}
      <div ref={ticketsRef} className="mt-14 printable-tickets-area">
        <div className="text-center mb-6">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-700">
            Official Entry Passes ({registration.participants?.length})
          </span>
          <h3 className="text-2xl font-extrabold text-stone-900 font-festive">
            Your Personalized Event Tickets
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Each participant has a unique Ticket ID and verifiable QR code.
          </p>
        </div>

        {/* List of Tickets */}
        <div className="space-y-6">
          {registration.participants?.map((participantTicket, idx) => (
            <TicketCard
              key={participantTicket.ticketId || idx}
              ticket={participantTicket}
              registrationId={registration.registrationId}
              index={idx}
              totalCount={registration.participants.length}
              onDownloadSingle={handleDownloadSingle}
            />
          ))}
        </div>

        {/* Book Another Group CTA */}
        <div className="mt-12 text-center no-print pb-12">
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-3 rounded-full text-sm font-bold text-stone-600 hover:text-royal-crimson bg-white hover:bg-amber-50 border border-stone-200 shadow-sm transition-colors"
          >
            + Register Another Group
          </button>
        </div>

      </div>

    </div>
  );
}
