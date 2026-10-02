import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Ticket, Calendar, Clock, MapPin, User, Download, 
  ChevronRight, ArrowLeft, ShieldCheck, Sparkles 
} from 'lucide-react';
import TicketCard from './TicketCard';
import { EVENT_CONFIG } from '../../config/eventConfig';
import html2canvas from 'html2canvas';

export default function MyTicketsModal({ 
  isOpen, 
  onClose, 
  user, 
  registrations = [], 
  onNavigateToRegister 
}) {
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  if (!isOpen) return null;

  // Filter registrations belonging ONLY to this user
  const userRegistrations = registrations.filter(r => {
    if (!user) return false;
    const matchEmail = r.userEmail && r.userEmail.toLowerCase() === user.email?.toLowerCase();
    const matchUid = r.userId && r.userId === user.uid;
    return matchEmail || matchUid;
  });

  /**
   * Called by TicketCard as onDownloadSingle(ticket, ticketVisualRef).
   * ticketVisualRef.current is the cream-wrapped ticket body only — clean PNG output.
   */
  const handleDownloadSingle = useCallback(async (ticket, ticketVisualRef) => {
    const el = ticketVisualRef?.current;
    if (!el) {
      alert('Could not find ticket element. Please try again.');
      return;
    }
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#FFFDF9',
        scale: 2,
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-3xl shadow-2xl border border-amber-200/90 overflow-hidden z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-800 via-rose-700 to-amber-700 p-6 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {selectedRegistration && (
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Back to bookings list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                <Ticket className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="font-festive text-xl font-bold tracking-wide">
                  {selectedRegistration ? `Booking Passes: ${selectedRegistration.registrationId}` : 'My Festival Passes'}
                </h3>
                <p className="text-xs text-amber-100/90">
                  {user?.displayName || user?.email} &bull; {userRegistrations.length} {userRegistrations.length === 1 ? 'Booking' : 'Bookings'} Found
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-grow">
            
            {/* Case 1: Viewing Specific Registration Tickets */}
            {selectedRegistration ? (
              <div className="space-y-6">
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-stone-500 uppercase tracking-wider block text-[10px]">Registration ID</span>
                    <span className="font-mono font-bold text-sm text-stone-900">{selectedRegistration.registrationId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 uppercase tracking-wider block text-[10px]">Booked On</span>
                    <span className="font-semibold text-stone-800">{selectedRegistration.dateTime}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 uppercase tracking-wider block text-[10px]">Total Paid</span>
                    <span className="font-extrabold text-royal-crimson text-sm">₹{selectedRegistration.amount}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-500 uppercase tracking-wider block text-[10px]">Passes Issued</span>
                    <span className="font-bold text-emerald-700">{selectedRegistration.count} Entry Passes</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedRegistration.participants?.map((participantTicket, idx) => (
                    <TicketCard
                      key={participantTicket.ticketId || idx}
                      ticket={participantTicket}
                      registrationId={selectedRegistration.registrationId}
                      index={idx}
                      totalCount={selectedRegistration.participants.length}
                      onDownloadSingle={handleDownloadSingle}
                    />
                  ))}
                </div>
              </div>
            ) : userRegistrations.length === 0 ? (
              /* Case 2: Empty State - No registrations for this user */
              <div className="text-center py-12 px-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8" />
                </div>
                <h4 className="font-festive text-xl font-bold text-stone-900">
                  No Bookings Found Yet
                </h4>
                <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                  You haven't booked any passes under <strong>{user?.email}</strong> yet. Join Karkala's biggest Dandiya celebration today!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToRegister) onNavigateToRegister();
                  }}
                  className="mt-6 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md transition-all active:scale-95"
                >
                  Book Your Passes Now &rarr;
                </button>
              </div>
            ) : (
              /* Case 3: List of User's Registrations */
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Your Confirmed Bookings ({userRegistrations.length})
                </p>

                {userRegistrations.map((reg) => (
                  <div
                    key={reg.registrationId}
                    className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm">{reg.registrationId}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {reg.paymentStatus || 'PAID'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">
                        <strong className="text-stone-800">Attendees:</strong> {reg.participantsSummary}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Booked on {reg.dateTime} &bull; {reg.count} {reg.count === 1 ? 'Pass' : 'Passes'} (&le;20: {reg.under20Count || 0}, &gt;20: {reg.above20Count || 0})
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right sm:mr-2">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Total</span>
                        <span className="text-base font-extrabold text-royal-crimson">₹{reg.amount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRegistration(reg)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-800 bg-amber-100/80 hover:bg-amber-200/90 border border-amber-300 transition-colors flex items-center gap-1.5"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-700" />
                        <span>View Tickets</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
