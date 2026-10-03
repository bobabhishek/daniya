import React from 'react';
import { Sparkles, GraduationCap } from 'lucide-react';

export default function StudentDiscountNotice({ className = '', compact = false }) {
  if (compact) {
    return (
      <div 
        className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300/80 p-2.5 sm:p-3 text-stone-800 ${className}`}
      >
        <div className="flex items-start gap-2.5 relative z-10">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-royal-crimson text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
              <h5 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-royal-crimson font-festive">
                Student discount available for age 20 or below
              </h5>
            </div>
            <p className="text-[11px] text-stone-700 mt-0.5 leading-snug font-medium">
              Age 20 or below? Student discount available. Please contact <strong className="text-stone-900 font-bold">Arpith Hawkz</strong> to avail the student discount.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-400/60 shadow-xs backdrop-blur-xs p-3.5 sm:p-4.5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
    >
      {/* Subtle festive warm glow accent */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-200/50 via-red-200/30 to-transparent pointer-events-none rounded-tr-2xl" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 relative z-10 text-center sm:text-left">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-royal-crimson text-white flex items-center justify-center shrink-0 shadow-xs">
          <GraduationCap className="w-5 h-5 drop-shadow-xs" />
        </div>
        <div>
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-royal-crimson font-festive">
              Age 20 or below? Student discount available
            </h4>
          </div>
          <p className="mt-1 text-xs text-stone-700 font-medium">
            Age 20 or below? Student discount available. Please contact <strong className="text-stone-900 font-bold underline decoration-amber-400 decoration-2 underline-offset-2">Arpith Hawkz</strong> to avail the student discount.
          </p>
        </div>
      </div>

      <div className="relative z-10 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-100 to-orange-100 text-amber-950 border border-amber-300 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Discount Offer</span>
        </span>
      </div>
    </div>
  );
}
