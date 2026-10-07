import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, User, Phone, Calendar, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { getParticipantCategory } from '../../utils/pricing';
import { formatToIndianDate } from '../../utils/indianDateUtils';
import { formatIndianPhone } from '../../utils/phoneUtils';
import StudentDiscountNotice from '../common/StudentDiscountNotice';

export default function StepReview({ participants, pricingBreakdown, onBack, onProceedToPayment, isSubmitting = false }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      
      {/* Step Heading */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-festive">
          Review Your Registration
        </h2>
        <p className="mt-2 text-stone-600 text-sm sm:text-base">
          Please confirm attendee names and date of birth before proceeding to payment.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-festive overflow-hidden">
        
        {/* Event Quick Header in Review */}
        <div className="bg-gradient-to-r from-amber-50 via-red-50/40 to-amber-50 p-6 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-royal-crimson tracking-wider">
              {EVENT_CONFIG.EVENT_EDITION}
            </span>
            <h3 className="font-festive font-extrabold text-stone-900 text-xl">
              {EVENT_CONFIG.EVENT_NAME}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-stone-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              {EVENT_CONFIG.DATE}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-600" />
              {EVENT_CONFIG.VENUE}
            </span>
          </div>
        </div>

        {/* Participants Table */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
              ATTENDEES &amp; PASS DETAILS ({participants.length})
            </h4>
            <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Venue Entry Age Verification
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-100 text-[11px] font-extrabold text-stone-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">#</th>
                  <th className="pb-3">Participant Name</th>
                  <th className="pb-3">DOB (DD/MM/YYYY) &amp; Age</th>
                  <th className="pb-3">Admission Verification</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right pr-2">Ticket Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...participants].sort((a, b) => (a.participantNumber || 0) - (b.participantNumber || 0)).map((p, idx) => {
                  const cat = getParticipantCategory(p.age);
                  const isStudent = cat.category === 'STUDENT';
                  const pNum = p.participantNumber || (idx + 1);

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-4 pl-2 font-bold text-stone-400">
                        {String(pNum).padStart(2, '0')}
                      </td>
                      <td className="py-4 font-bold text-stone-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{p.name}</span>
                        </div>
                        {p.phone && (
                          <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-1 font-normal">
                            <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{formatIndianPhone(p.phone)}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-stone-700">
                        <div className="font-bold text-xs text-stone-900 font-mono">
                          {p.dob ? formatToIndianDate(p.dob) : 'N/A'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {p.age} yrs as of today
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Physical ID at Entrance</span>
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          Standard Pass {isStudent ? '(Age ≤ 20)' : ''}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2 font-extrabold text-stone-900 text-base">
                        ₹{cat.price}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* BOLD PHYSICAL AGE PROOF REQUIREMENT BANNER */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-xs text-amber-950 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-black text-xs sm:text-sm text-stone-900 uppercase tracking-wide">
                MANDATORY PHYSICAL AGE PROOF AT VENUE ENTRANCE
              </p>
              <p className="mt-1 text-stone-700">
                <strong className="text-stone-900 font-bold">Physical Age Proof (Aadhaar Card or Government Photo ID displaying DOB)</strong> is strictly required for entry at the event venue for each attendee. Passes will be validated against physical ID cards at venue gates.
              </p>
            </div>
          </div>

          {/* Structured Calculation Breakdown */}
          <div className="mt-8 pt-6 border-t border-amber-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            <div className="space-y-2 text-xs sm:text-sm text-stone-600 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
              <div className="flex justify-between font-semibold">
                <span>TOTAL ATTENDEES:</span>
                <span className="font-extrabold text-stone-900">{pricingBreakdown.totalParticipants}</span>
              </div>
              <div className="flex justify-between">
                <span>STANDARD PASSES:</span>
                <span className="font-bold text-royal-crimson">{pricingBreakdown.totalParticipants} × ₹299 = ₹{pricingBreakdown.totalAmount}</span>
              </div>
            </div>

            <div className="text-right p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col justify-center">
              <span className="text-xs uppercase font-extrabold text-stone-500 tracking-wider">
                Total Payable Amount
              </span>
              <span className="text-4xl font-extrabold text-stone-900 mt-1">
                ₹{pricingBreakdown.totalAmount}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guaranteed Admission Passes with Physical ID Check
              </span>
            </div>

          </div>

          {/* Festive Student Discount Disclaimer */}
          <StudentDiscountNotice className="mt-6" />

          {/* Action Buttons */}
          <div className="mt-10 pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK TO EDIT PARTICIPANTS</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onProceedToPayment}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>INITIALIZING PAYMENT...</span>
                </>
              ) : (
                <>
                  <span>PROCEED TO PAYMENT (₹{pricingBreakdown.totalAmount})</span>
                  <ArrowRight className="w-5 h-5 text-amber-200" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
