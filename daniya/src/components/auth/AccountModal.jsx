import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Mail, ShieldCheck, Ticket, Calendar, 
  MapPin, LogOut, PlusCircle, CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePasses } from '../../context/PassesContext';
import { EVENT_CONFIG } from '../../config/eventConfig';

export default function AccountModal({ isOpen, onClose, onOpenMyPasses, onNavigateToRegister }) {
  const { user, logout } = useAuth();
  const { passes } = usePasses();

  if (!isOpen) return null;

  const totalTickets = passes.reduce((acc, r) => acc + (r.count || r.participants?.length || 1), 0);

  const handleSignOut = async () => {
    onClose();
    await logout();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden z-10"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 p-6 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black mb-2 shadow-inner">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <h3 className="text-xl font-bold font-festive">
              {user?.displayName || 'Attendee Profile'}
            </h3>
            <p className="text-xs text-amber-200 truncate max-w-xs mx-auto">
              {user?.email}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-semibold border border-emerald-400/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Verified Attendee Account</span>
            </div>
          </div>

          {/* Account Details & Stats */}
          <div className="p-6 space-y-4">
            
            {/* Dandiya Pass Summary Card */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-royal-crimson">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-stone-500">Your Booked Passes</span>
                  <span className="block text-lg font-black text-stone-900">
                    {totalTickets} {totalTickets === 1 ? 'Pass' : 'Passes'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenMyPasses) onOpenMyPasses();
                }}
                className="px-3 py-1.5 rounded-xl bg-royal-crimson hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                View Passes
              </button>
            </div>

            {/* Event Info */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span><strong>Date:</strong> {EVENT_CONFIG.EVENT_DATE} ({EVENT_CONFIG.EVENT_TIME})</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span><strong>Venue:</strong> {EVENT_CONFIG.EVENT_VENUE}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToRegister) onNavigateToRegister();
                }}
                className="w-full py-2.5 rounded-xl border border-amber-300 text-royal-crimson hover:bg-amber-50 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Book Additional Passes for Family / Friends</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
