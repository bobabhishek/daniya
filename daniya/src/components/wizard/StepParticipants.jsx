import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  User, 
  Phone,
  Sparkles, 
  GraduationCap, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getParticipantCategory } from '../../utils/pricing';
import { calculateAgeFromDob, formatToIndianDate } from '../../utils/indianDateUtils';
import { cleanIndianPhone } from '../../utils/phoneUtils';
import IndianDobInput from '../common/IndianDobInput';
import StudentDiscountNotice from '../common/StudentDiscountNotice';

const normalizePhoneNumber = (value = '') => (value || '').replace(/\D/g, '').slice(0, 10);

export default function StepParticipants({
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  pricingBreakdown,
  onProceed,
  validationError,
  user,
  onOpenAuth
}) {
  // Handle Date of Birth change with automatic Age calculation strictly in DD/MM/YYYY
  const handleDobChange = (participantId, dobValue) => {
    onUpdateParticipant(participantId, 'dob', dobValue);
    const calculatedAge = calculateAgeFromDob(dobValue);
    onUpdateParticipant(participantId, 'age', calculatedAge);
  };

  // Add new participant to top and smoothly focus viewport to top
  const handleAddNewParticipant = () => {
    onAddParticipant();
    setTimeout(() => {
      const topAnchor = document.getElementById('participants-list-top');
      if (topAnchor) {
        topAnchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 40);
  };

  return (
    <div className="w-full">
      
      {/* Wizard Step Heading */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-festive">
          Who's joining the celebration?
        </h2>
        <p className="mt-2 text-stone-600 text-sm sm:text-base">
          Add attendee details. Enter Date of Birth strictly in <strong>DD/MM/YYYY</strong> for pass registration and venue admission verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Participant Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Account / Auth Banner */}
          {user ? (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-royal-crimson text-amber-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </div>
                <div>
                  <p className="font-bold text-stone-800">
                    Booking as <span className="text-royal-crimson">{user.displayName || user.email}</span>
                  </p>
                  <p className="text-[11px] text-stone-500">Tickets will be linked to your account</p>
                </div>
              </div>
              {participants[0] && !participants[0].name && user.displayName && (
                <button
                  type="button"
                  onClick={() => onUpdateParticipant(participants[0].id, 'name', user.displayName)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100/70 text-royal-crimson font-bold rounded-xl border border-amber-300 text-xs transition-colors shrink-0 shadow-xs"
                >
                  Use my name for Participant 01
                </button>
              )}
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-dashed border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-700">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Want tickets saved to your profile? <strong>Sign in</strong> for easy access anytime.</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-xl bg-royal-crimson hover:bg-red-700 text-white font-bold text-xs transition-all shrink-0 shadow-sm self-start sm:self-auto"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}

          {/* BOLD PHYSICAL AGE PROOF NOTICE AT VENUE ENTRY BANNER */}
          <div className="bg-gradient-to-r from-amber-50 via-red-50/40 to-amber-50 border-2 border-amber-300/90 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5 text-stone-800">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <ShieldCheck className="w-5 h-5 text-royal-crimson" />
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-black uppercase tracking-wider text-royal-crimson text-xs sm:text-xs">
                MANDATORY VENUE ENTRY VERIFICATION
              </p>
              <p className="mt-1 text-stone-700 leading-relaxed text-xs">
                <strong className="text-stone-900 font-bold">Physical Age Proof (Aadhaar Card or Government Photo ID with DOB) will be strictly verified at venue entry.</strong> Online document upload is not required — simply ensure the entered Date of Birth matches your physical ID card on event night.
              </p>
            </div>
          </div>

          {/* Premium Festive Student Discount Disclaimer */}
          <StudentDiscountNotice />

          {/* Validation Banner at Top of list if error exists */}
          {validationError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs sm:text-sm flex items-start gap-3 shadow-md"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-extrabold uppercase tracking-wide text-red-900 text-xs">Please Complete Required Fields</p>
                <p className="mt-0.5">{validationError}</p>
              </div>
            </motion.div>
          )}

          {/* Top Anchor for Smooth Scroll */}
          <div id="participants-list-top" className="scroll-mt-32" />

          {/* Top Quick Bar: Attendee Count & + Add Button (Prevents having to scroll down) */}
          <div className="flex items-center justify-between p-3.5 bg-white/95 rounded-2xl border border-amber-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                Attendees ({participants.length})
              </span>
              {participants.length > 1 && (
                <span className="hidden sm:inline-flex text-[10px] text-amber-900 font-bold bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                  Newest on top (Descending)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddNewParticipant}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Add Participant</span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {participants.map((participant, index) => {
              const categoryInfo = getParticipantCategory(participant.age);
              const isStudent = categoryInfo.category === 'STUDENT';
              const isAdult = categoryInfo.category === 'ADULT';
              const pNum = index + 1;
              const isLatest = index === 0 && participants.length > 1;

              return (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-3xl border border-amber-200/90 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-7 relative overflow-hidden"
                >
                  {/* Subtle decorative corner accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent pointer-events-none rounded-tr-3xl" />

                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-red-50 text-royal-crimson font-festive font-black text-sm flex items-center justify-center border border-red-100 shadow-2xs">
                        {String(pNum).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-stone-900 text-sm sm:text-base tracking-wide uppercase font-festive">
                            PARTICIPANT {String(pNum).padStart(2, '0')}
                          </h3>
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                              Newest
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400">Personal info &amp; ticket pass tier</p>
                      </div>
                    </div>

                    {/* Remove Button (disabled if only 1 participant) */}
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveParticipant(participant.id)}
                        className="text-stone-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Remove Participant"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Fields Grid: Name, Phone Number, DOB (DD/MM/YYYY), and Auto-Calculated Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    
                    {/* Full Name Input */}
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          placeholder="e.g. Aarav Sharma"
                          value={participant.name || ''}
                          onChange={(e) => onUpdateParticipant(participant.id, 'name', e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Phone Number Input */}
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Phone Number <span className="text-red-500">*</span></span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          10-Digit Mobile
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-stone-400 pointer-events-none">
                          <Phone className="w-4 h-4 text-stone-400" />
                          <span className="text-xs font-bold text-stone-500 border-r border-stone-200 pr-1.5">+91</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="e.g. 9876543210"
                          value={participant.phone || participant.phoneNumber || ''}
                          maxLength={14}
                          onChange={(e) => {
                            const cleaned = cleanIndianPhone(e.target.value);
                            onUpdateParticipant(participant.id, 'phone', cleaned);
                            onUpdateParticipant(participant.id, 'phoneNumber', cleaned);
                          }}
                          className="w-full pl-16 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium font-mono"
                        />
                      </div>
                      {(participant.phone || participant.phoneNumber) && (participant.phone || participant.phoneNumber).length === 10 && (
                        <p className="mt-1 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Mobile: <strong>+91 {participant.phone || participant.phoneNumber}</strong></span>
                        </p>
                      )}
                    </div>

                    {/* Date of Birth (DOB) - Strict Indian Format DD/MM/YYYY */}
                    <div className="sm:col-span-12">
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Date of Birth (DOB) <span className="text-red-500">*</span></span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          DD/MM/YYYY
                        </span>
                      </label>

                      {/* Custom 3-box DD/MM/YYYY input */}
                      <IndianDobInput
                        value={participant.dob}
                        onChange={(newDob) => handleDobChange(participant.id, newDob)}
                        id={`dob-${participant.id}`}
                      />

                      {participant.dob && (
                        <p className="mt-1 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>DOB: <strong>{formatToIndianDate(participant.dob)}</strong> (DD/MM/YYYY)</span>
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Real-Time Age & Pricing Tier Badge */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 font-semibold">Calculated Age:</span>
                      {participant.age !== '' && participant.age !== undefined ? (
                        <span className="font-extrabold text-stone-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                          {participant.dob ? `${formatToIndianDate(participant.dob)} • ` : ''}{participant.age} Years (as of today)
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Enter DOB (DD/MM/YYYY) to calculate</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-royal-crimson border border-red-300">
                        <Sparkles className="w-3.5 h-3.5 text-royal-crimson" />
                        REGULAR PASS • ₹299
                      </span>
                    </div>
                  </div>

                  {/* Student Discount Notice inside participant card if age <= 20 */}
                  {isStudent && (
                    <StudentDiscountNotice compact className="mt-3" />
                  )}

                  {/* BOLD PHYSICAL VENUE VERIFICATION REMINDER NOTICE */}
                  <div className="mt-4 pt-3.5 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-600 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/90">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-extrabold text-stone-900 uppercase tracking-wide block sm:inline mr-1">
                        Venue Verification Notice:
                      </span>
                      <span>
                        <strong className="text-stone-900">Physical age proof (Aadhaar or Government ID with DOB)</strong> must be presented for this participant at venue entry. Please ensure entered Date of Birth matches your physical document.
                      </span>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Bottom + ADD PARTICIPANT Button (Alternative access) */}
          <button
            type="button"
            onClick={handleAddNewParticipant}
            className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] group shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span>+ ADD ANOTHER PARTICIPANT (ADDS TO TOP)</span>
          </button>

        </div>

        {/* Right Column: Permanently Stable Sticky Registration Summary (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 self-start z-20">
          <div className="bg-white rounded-3xl border-2 border-amber-200/90 shadow-festive p-5 sm:p-6 backdrop-blur-sm">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-amber-100">
              <h3 className="font-festive font-extrabold text-stone-900 text-lg tracking-wide">
                REGISTRATION SUMMARY
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                Live Pricing
              </span>
            </div>

            {/* Counts Breakdown */}
            <div className="py-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Total Participants</span>
                <span className="font-extrabold text-stone-900 text-base">
                  {pricingBreakdown.totalParticipants}
                </span>
              </div>

              <div className="flex items-center justify-between text-stone-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Regular Event Pass</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-800">{pricingBreakdown.totalParticipants}</span>
                  <span className="text-xs text-stone-500 ml-1">× ₹299</span>
                </div>
              </div>
            </div>

            {/* BOLD Entry Age Verification Policy Callout */}
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-xs text-amber-950 space-y-1.5 mb-4 shadow-2xs">
              <div className="flex items-center gap-1.5 font-black text-amber-950 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 text-royal-crimson shrink-0" />
                <span>Venue Entry Age Verification</span>
              </div>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                <strong className="text-stone-900">Physical Age Proof (Aadhaar or Govt ID)</strong> will be strictly verified at venue entrance. No document upload is required online.
              </p>
            </div>

            {/* Subtotals & Formula */}
            <div className="py-3 px-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Standard Rate:</span>
                <span className="font-bold text-stone-800">₹299 / attendee pass</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Pass Calculation:</span>
                <span className="font-bold text-stone-800">{pricingBreakdown.totalParticipants} × ₹299</span>
              </div>
            </div>

            {/* Student Discount Notice in Sidebar */}
            <StudentDiscountNotice compact className="mt-4" />

            {/* Total Section with Animated Counter */}
            <div className="mt-5 pt-4 border-t border-amber-200">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="block text-xs uppercase font-extrabold text-stone-400 tracking-wider">
                    Total Amount
                  </span>
                  <span className="text-[11px] text-stone-500">Includes all applicable fees</span>
                </div>
                <div className="text-right">
                  <motion.div
                    key={pricingBreakdown.totalAmount}
                    initial={{ scale: 1.15, color: '#C2410C' }}
                    animate={{ scale: 1, color: '#1C1917' }}
                    transition={{ duration: 0.3 }}
                    className="text-3xl font-extrabold tracking-tight"
                  >
                    ₹{pricingBreakdown.totalAmount}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Proceed to Review Button */}
            <button
              type="button"
              onClick={onProceed}
              className="mt-5 w-full py-3.5 sm:py-4 rounded-2xl text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wide"
            >
              <span>CONTINUE TO REVIEW</span>
              <ArrowRight className="w-5 h-5 text-amber-200" />
            </button>

            <p className="mt-2.5 text-center text-[11px] text-stone-400">
              Physical ID &amp; DOB will be verified at venue entrance.
            </p>
          </div>
        </div>

      </div>

      {/* Floating Sticky Mobile Summary Bar for Small Screens (Never need to scroll up/down on phone) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-amber-300 p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 lg:hidden">
        <div>
          <span className="block text-[10px] uppercase font-bold text-stone-400">
            Total ({pricingBreakdown.totalParticipants} {pricingBreakdown.totalParticipants === 1 ? 'Pass' : 'Passes'})
          </span>
          <span className="text-xl font-black text-stone-900">
            ₹{pricingBreakdown.totalAmount}
          </span>
        </div>
        <button
          type="button"
          onClick={onProceed}
          className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-red-600 to-amber-600 shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <span>CONTINUE TO REVIEW &rarr;</span>
        </button>
      </div>

    </div>
  );
}
