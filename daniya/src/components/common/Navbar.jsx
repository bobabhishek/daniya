import React, { useState } from 'react';
import { 
  Calendar, MapPin, Sparkles, Menu, X, ShieldCheck, Ticket, 
  User as UserIcon, LogIn, LogOut, ChevronDown 
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ 
  onNavigate, 
  currentView, 
  onOpenAdmin, 
  onOpenAuth, 
  onOpenMyTickets 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const handleNavClick = (sectionId) => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    onNavigate(sectionId);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
  };

  const getUserInitial = () => {
    if (!user) return '?';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-amber-200/60 shadow-sm transition-all">
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
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            
            {/* User Account / Auth Button */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-amber-50/80 hover:bg-amber-100/80 rounded-xl border border-amber-200/90 transition-all flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-royal-crimson text-amber-100 flex items-center justify-center font-bold text-xs shadow-sm">
                    {getUserInitial()}
                  </div>
                  <span className="max-w-[110px] truncate">{user.displayName || user.email.split('@')[0]}</span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-100 text-royal-crimson">
                      Admin
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-amber-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-800 truncate">{user.displayName || 'Event Attendee'}</p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                      <p className="text-[10px] font-semibold text-amber-700 mt-0.5 uppercase tracking-wider">
                        Role: {isAdmin ? 'Event Organizer (Admin)' : 'Attendee'}
                      </p>
                    </div>

                    {/* Normal User Option: My Passes */}
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (onOpenMyTickets) onOpenMyTickets();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-royal-crimson flex items-center gap-2"
                      >
                        <Ticket className="w-4 h-4 text-amber-600" />
                        <span>My Passes &amp; Bookings</span>
                      </button>
                    )}

                    {/* Admin User Option: Organizer Portal */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-royal-crimson flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Organizer Dashboard</span>
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:text-royal-crimson hover:bg-amber-50 rounded-xl border border-amber-200/80 transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                <span>Sign In</span>
              </button>
            )}

            {/* If NORMAL USER: Show "My Passes" button in navbar */}
            {user && !isAdmin && (
              <button
                onClick={onOpenMyTickets}
                title="View your confirmed passes"
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-royal-crimson hover:bg-amber-50 rounded-xl border border-amber-200/80 transition-all flex items-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                <span>My Passes</span>
              </button>
            )}

            {/* If ADMIN: Show Organizer Portal button */}
            {user && isAdmin && (
              <button
                onClick={onOpenAdmin}
                title="Open Organizer / Arpit Admin Dashboard"
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-royal-crimson hover:bg-amber-50 rounded-xl border border-amber-200/80 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Organizer Portal</span>
              </button>
            )}

            {/* Primary CTA */}
            <button
              onClick={() => handleNavClick('register')}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md hover:shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              <span>REGISTER NOW</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-stone-700 hover:bg-amber-50 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-royal-crimson" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-[#FFFDF9] border-b border-amber-200 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          
          {/* User Profile in Mobile Menu */}
          {user ? (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-royal-crimson text-amber-100 flex items-center justify-center font-bold text-xs shrink-0">
                  {getUserInitial()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 truncate">{user.displayName || 'Event Attendee'}</p>
                  <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                  <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider">
                    {isAdmin ? 'Admin Organizer' : 'Attendee'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth && onOpenAuth('login');
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50/80 text-royal-crimson font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Create Account</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-3 py-2 text-base font-semibold text-stone-800 hover:bg-amber-50 rounded-lg"
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('event-details')}
            className="w-full text-left px-3 py-2 text-base font-semibold text-stone-800 hover:bg-amber-50 rounded-lg"
          >
            Event Details
          </button>
          <button
            onClick={() => handleNavClick('rules')}
            className="w-full text-left px-3 py-2 text-base font-semibold text-stone-800 hover:bg-amber-50 rounded-lg"
          >
            Rules &amp; Guidelines
          </button>

          {/* Normal User Mobile Button: My Passes */}
          {user && !isAdmin && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenMyTickets) onOpenMyTickets();
              }}
              className="w-full text-left px-3 py-2 text-base font-semibold text-stone-800 hover:bg-amber-50 rounded-lg flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-amber-600" />
              <span>My Passes &amp; Bookings</span>
            </button>
          )}
          
          <div className="pt-2 border-t border-amber-100 flex flex-col gap-2">
            <button
              onClick={() => handleNavClick('register')}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-amber-600 shadow text-center flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              <span>REGISTER NOW</span>
            </button>

            {/* Organizer Portal in Mobile (Only for authenticated ADMIN) */}
            {user && isAdmin && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full py-2 text-xs font-semibold text-stone-600 bg-amber-50/60 rounded-lg border border-amber-200 text-center flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Organizer Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
