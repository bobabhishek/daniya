import React, { useState } from 'react';
import { 
  Sparkles, Menu, X, LogIn, Ticket
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';

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
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative h-14 w-auto flex items-center justify-center p-1 bg-white rounded-xl border border-amber-100 shadow-sm group-hover:shadow-md transition-shadow">
              <img 
                src={EVENT_CONFIG.ASSETS.LOGO} 
                alt={EVENT_CONFIG.EVENT_NAME}
                className="h-12 w-auto object-contain max-w-[140px]"
              />
            </div>
            <div className="hidden sm:block">
              <span className="block font-festive text-xl font-bold tracking-wide text-royal-crimson group-hover:text-amber-700 transition-colors">
                {EVENT_CONFIG.EVENT_NAME}
              </span>
              <span className="block text-xs font-semibold text-amber-700 tracking-wider uppercase">
                {EVENT_CONFIG.EVENT_EDITION}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
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
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('login', 'Sign In to Your Account', 'Access your passes, bookings, and receipt information.')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-royal-crimson hover:bg-amber-50 border border-stone-200 transition-all"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-500" />
              <span>Sign In</span>
            </button>

            <button
              onClick={() => handleNavClick('register')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Book Passes (₹299)</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
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
          <div className="md:hidden py-4 border-t border-amber-100 space-y-2 animate-in fade-in slide-in-from-top-2">
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
    </nav>
  );
}
