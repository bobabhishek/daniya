import React from 'react';
import { Calendar, Clock, MapPin, Sparkles, ChevronRight, Award, Flame, Users } from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import StudentDiscountNotice from '../common/StudentDiscountNotice';

export default function Hero({ onRegisterClick, onExploreClick }) {
  return (
    <section className="relative overflow-hidden bg-mandala-pattern pt-8 pb-16 md:pt-12 md:pb-24 border-b border-amber-100">
      {/* Soft warm festive radial glow behind hero */}
      <div className="absolute inset-0 bg-festive-hero-glow pointer-events-none" />

      {/* Tasteful Decorative Floating Dandiya Motif Icons */}
      <div className="absolute top-12 left-8 md:left-24 opacity-25 pointer-events-none transform -rotate-12 animate-pulse">
        <div className="w-16 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 rounded-full shadow-sm" />
        <div className="w-16 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-rose-600 rounded-full mt-2 ml-4 rotate-45" />
      </div>
      <div className="absolute top-20 right-8 md:right-24 opacity-25 pointer-events-none transform rotate-45 animate-pulse">
        <div className="w-20 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-red-500 rounded-full" />
        <div className="w-20 h-1.5 bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 rounded-full mt-2 ml-2 -rotate-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          
          {/* Top Festive Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs md:text-sm font-bold shadow-sm mb-6 animate-in fade-in zoom-in-95 duration-500">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Presented by {EVENT_CONFIG.EVENT_ORGANIZER}</span>
          </div>

          {/* Uploaded Primary Event Logo Showcase */}
          <div className="relative mb-6 group">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-200/40 via-red-200/30 to-amber-200/40 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-white/90 p-4 md:p-6 rounded-2xl border border-amber-200 shadow-festive max-w-xs md:max-w-md mx-auto">
              <img 
                src={EVENT_CONFIG.ASSETS.LOGO} 
                alt={EVENT_CONFIG.EVENT_NAME}
                className="w-full h-auto object-contain max-h-36 md:max-h-48 drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          </div>

          {/* Configurable Event Title & Tagline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-stone-900 tracking-tight font-festive break-words">
            <span className="bg-gradient-to-r from-royal-crimson via-red-700 to-amber-600 bg-clip-text text-transparent">
              {EVENT_CONFIG.EVENT_NAME}
            </span>
          </h1>

          <p className="mt-3 sm:mt-4 text-base sm:text-xl md:text-2xl text-stone-700 font-medium max-w-2xl font-display italic">
            "{EVENT_CONFIG.EVENT_TAGLINE}"
          </p>

          <p className="mt-2 sm:mt-3 text-xs sm:text-base text-stone-600 max-w-xl">
            Join thousands of revellers for an unforgettable night of traditional Garba, energetic Dandiya Raas, live DJs, and royal festivities.
          </p>

          {/* Quick Event Metadata Chips */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-3xl">
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-royal-crimson shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Date</p>
                <p className="text-xs sm:text-sm font-bold text-stone-800">{EVENT_CONFIG.DATE}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Time</p>
                <p className="text-xs sm:text-sm font-bold text-stone-800">{EVENT_CONFIG.TIME}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Venue</p>
                <p className="text-xs sm:text-sm font-bold text-stone-800 truncate">{EVENT_CONFIG.VENUE}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-200 shadow-sm flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Celebration</p>
                <p className="text-xs sm:text-sm font-bold text-stone-800">Garba and Dandiya</p>
              </div>
            </div>
          </div>

          {/* Regular Pricing Highlight Pill */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 py-2 px-5 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-sm">
            <span className="text-xs uppercase font-extrabold text-amber-800 tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              Standard Entry Pass:
            </span>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-extrabold text-royal-crimson text-base">
                ₹299
              </span>
              <span className="text-xs text-stone-500 font-medium">/ attendee pass</span>
            </div>
          </div>

          {/* Premium Festive Student Discount Notice */}
          <div className="mt-4 max-w-xl w-full">
            <StudentDiscountNotice />
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto px-8 py-4 rounded-full text-base font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-festive hover:shadow-red-500/30 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-wide"
            >
              <span>REGISTER NOW</span>
              <ChevronRight className="w-5 h-5 text-amber-200" />
            </button>

            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-bold text-stone-700 hover:text-royal-crimson bg-white hover:bg-amber-50/60 border border-amber-300 shadow-sm transition-all"
            >
              VIEW EVENT DETAILS
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
