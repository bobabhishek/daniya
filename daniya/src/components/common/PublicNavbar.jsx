import React, { useState } from 'react';
import { 
  Sparkles, Menu, X, LogIn, Ticket
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { ToranGarland, DandiyaSticksIcon } from './IndianFestiveMotifs';

export default function PublicNavbar({ 
  onNavigate, 
  currentView, 
  onOpenAuth 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId) => {
    setIsMobileMenuOpen(false);
    onNavigate(sectionId);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-amber-200/60 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[5rem] py-2 gap-3">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative h-11 sm:h-13 w-auto flex items-center justify-center p-1 bg-white rounded-xl border border-amber-100 shadow-sm group-hover:shadow-md transition-shadow shrink-0">
              <img 
                src={EVENT_CONFIG.ASSETS.LOGO} 
                alt={EVENT_CONFIG.EVENT_NAME}
                className="h-9 sm:h-11 w-auto object-contain max-w-[110px] sm:max-w-[130px]"
              />
            </div>
            <div className="hidden sm:block shrink-0">
              <span className="block font-festive text-lg sm:text-xl font-bold tracking-wide text-royal-crimson group-hover:text-amber-700 transition-colors whitespace-nowrap">
                {EVENT_CONFIG.EVENT_NAME}
              </span>
              <span className="block text-[11px] font-semibold text-amber-700 tracking-wider uppercase whitespace-nowrap">
                {EVENT_CONFIG.EVENT_EDITION}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-5 xl:space-x-8 shrink-0">
            <button 
              onClick={() => handleNavClick('home')}
              className={`text-sm font-semibold transition-colors ${currentView === 'home' ? 'text-royal-crimson border-b-2 border-royal-crimson pb-1' : 'text-stone-700 hover:text-royal-crimson'}`}
            >
              Home
            </button>
            <button 
              onClick={() => handleNavClick('event-details')}
              className="text-sm font-semibold text-stone-700 hover:text-royal-crimson transition-colors"
            >
              Event Details
            </button>
            <button 
              onClick={() => handleNavClick('rules')}
              className="text-sm font-semibold text-stone-700 hover:text-royal-crimson transition-colors"
            >
              Rules
            </button>
            <button 
              onClick={() => handleNavClick('register')}
              className={`text-sm font-semibold transition-colors ${currentView === 'register' ? 'text-royal-crimson border-b-2 border-royal-crimson pb-1' : 'text-stone-700 hover:text-royal-crimson'}`}
            >
              Register
            </button>
            <button 
              onClick={() => handleNavClick('my-passes')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
            >
              <Ticket className="w-4 h-4 text-royal-crimson" />
              <span>My Passes</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onOpenAuth('login', 'Sign In to Your Account', 'Access your passes, bookings, and receipt information.')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-royal-crimson hover:bg-amber-50 border border-stone-200 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-500" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => handleNavClick('register')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Book Passes (₹299)</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-amber-50 text-stone-700 hover:text-royal-crimson"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-amber-100 space-y-2 animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => handleNavClick('home')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-amber-50"
            >
              Home
            </button>
            <button
              onClick={() => handleNavClick('event-details')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-amber-50"
            >
              Event Details
            </button>
            <button
              onClick={() => handleNavClick('rules')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-amber-50"
            >
              Rules
            </button>
            <button
              onClick={() => handleNavClick('register')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-amber-50"
            >
              Register
            </button>
            <button
              onClick={() => handleNavClick('my-passes')}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-amber-950 hover:bg-amber-50 flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-royal-crimson" />
              <span>My Passes</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth('login', 'Sign In to Your Account', 'Access your passes, bookings, and receipt information.');
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-royal-crimson hover:bg-amber-50 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        )}

      </div>
      <ToranGarland className="opacity-85 -mt-0.5" />
    </nav>
  );
}
