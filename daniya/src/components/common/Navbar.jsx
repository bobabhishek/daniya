import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, MapPin, Sparkles, Menu, X, ShieldCheck, Ticket, 
  User as UserIcon, LogIn, LogOut, ChevronDown, CheckCircle2,
  Crown, ShieldAlert, PlusCircle, BookOpen
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
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleNavClick = (sectionId) => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    onNavigate(sectionId);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
    if (onNavigate) onNavigate('home');
  };

  const getUserInitial = () => {
    if (!user) return '?';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getDisplayName = () => {
    if (!user) return '';
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Attendee';
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
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* User Account / Auth Capsule */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`px-3 py-1.5 rounded-2xl border transition-all flex items-center gap-2.5 shadow-sm active:scale-[0.98] ${
                    isAdmin 
                      ? 'bg-gradient-to-r from-red-50 to-amber-50 border-red-200/90 hover:border-red-300' 
                      : 'bg-white hover:bg-amber-50/60 border-amber-200 hover:border-amber-300'
                  }`}
                  aria-expanded={isUserMenuOpen}
                  aria-label="User Account Menu"
                >
                  {/* Avatar with Live Green Status Indicator */}
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-2 ${
                      isAdmin ? 'bg-gradient-to-br from-red-700 to-rose-900 text-amber-200 ring-red-300' : 'bg-gradient-to-br from-amber-600 to-red-600 text-white ring-amber-200'
                    }`}>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getUserInitial()
                      )}
                    </div>
                    {/* Pulsing online status indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  {/* Name & Role Pill */}
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-800 max-w-[100px] truncate leading-tight">
                        {getDisplayName()}
                      </span>
                    </div>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-royal-crimson border border-red-200">
                        <Crown className="w-2.5 h-2.5 text-amber-600" />
                        <span>Organizer</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200">
                        <Ticket className="w-2.5 h-2.5 text-amber-600" />
                        <span>Attendee</span>
                      </span>
                    )}
                  </div>

                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu: Elevated Luxury Card */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-200/90 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                    
                    {/* User Profile Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-50/70 to-red-50/40 border-b border-amber-100/80">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                          isAdmin ? 'bg-royal-crimson text-amber-100' : 'bg-amber-600 text-white'
                        }`}>
                          {getUserInitial()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {user.displayName || 'Festival Guest'}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate" title={user.email}>
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-[10px] font-semibold text-emerald-700">Verified Identity</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Links */}
                    <div className="py-1.5 px-1.5 space-y-0.5">
                      
                      {/* My Passes & Bookings — for attendees */}
                      {!isAdmin && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenMyTickets) onOpenMyTickets();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-royal-crimson transition-all flex items-center gap-2.5"
                        >
                          <div className="w-6 h-6 rounded-lg bg-amber-100/70 flex items-center justify-center text-amber-700 shrink-0">
                            <Ticket className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <span className="block font-bold">My Passes &amp; Bookings</span>
                            <span className="block text-[10px] text-stone-400 font-normal">View QR entry pass &amp; receipts</span>
                          </div>
                        </button>
                      )}

                      {/* Admin User Option: Organizer Portal */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-red-50 hover:text-royal-crimson transition-all flex items-center gap-2.5"
                        >
                          <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-royal-crimson shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <span className="block font-bold text-royal-crimson">Organizer Control Center</span>
                            <span className="block text-[10px] text-stone-400 font-normal">Registrations, Audits &amp; Excel</span>
                          </div>
                        </button>
                      )}

                      {/* Book Pass CTA */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleNavClick('register');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-amber-800 transition-all flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                          <PlusCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold">Book More Passes</span>
                          <span className="block text-[10px] text-stone-400 font-normal">Add family or friends</span>
                        </div>
                      </button>

                      {/* Event Rules */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleNavClick('rules');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-stone-900 transition-all flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold">Rules &amp; Guidelines</span>
                          <span className="block text-[10px] text-stone-400 font-normal">Dress code &amp; entry terms</span>
                        </div>
                      </button>

                    </div>

                    {/* Divider & Sign Out Button */}
                    <div className="pt-1.5 mt-1 border-t border-stone-100 px-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-rose-100/70 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span>Sign Out of Account</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              /* Enhanced Logged Out "Sign In" Button */
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="px-4 py-2 text-xs font-bold text-royal-crimson hover:text-red-700 bg-amber-50/90 hover:bg-amber-100/90 rounded-xl border border-amber-300 shadow-xs hover:shadow transition-all flex items-center gap-2 group active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:rotate-12" />
                <span>Sign In / Join</span>
              </button>
            )}

            {/* If NORMAL USER or GUEST: Show "My Passes" button in navbar */}
            {!isAdmin && (
              <button
                type="button"
                onClick={onOpenMyTickets}
                title="View your confirmed passes"
                className="px-3.5 py-2 text-xs font-bold text-stone-700 hover:text-royal-crimson hover:bg-amber-50 rounded-xl border border-amber-200/90 transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-600" />
                <span>My Passes</span>
              </button>
            )}

            {/* If ADMIN: Show Organizer Portal button */}
            {user && isAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-3.5 py-2 text-xs font-bold text-royal-crimson hover:bg-red-50 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-royal-crimson" />
                <span>Organizer Portal</span>
              </button>
            )}

            {/* Main Action CTA: Register Now */}
            <button 
              type="button"
              onClick={() => handleNavClick('register')}
              className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              REGISTER NOW
            </button>

          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 hover:text-royal-crimson hover:bg-amber-50 border border-amber-200/80 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-[#FFFDF9] border-b border-amber-200 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          
          {/* User Profile in Mobile Menu */}
          {user ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-red-50/50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                  isAdmin ? 'bg-royal-crimson text-amber-100' : 'bg-amber-600 text-white'
                }`}>
                  {getUserInitial()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-800 truncate">{getDisplayName()}</p>
                  <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                  <div className="mt-0.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-royal-crimson bg-red-100 px-1.5 py-0.2 rounded-full">
                        <Crown className="w-2.5 h-2.5 text-amber-600" />
                        <span>ORGANIZER ADMIN</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full">
                        <Ticket className="w-2.5 h-2.5 text-amber-600" />
                        <span>ATTENDEE</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="py-1.5 px-2.5 text-xs text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1 font-bold shadow-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAuth && onOpenAuth('login');
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/90 text-royal-crimson font-bold text-sm flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
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

          {/* User Mobile Button: My Passes (Only for attendees) */}
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
                className="w-full py-2.5 text-xs font-bold text-royal-crimson bg-red-50 rounded-xl border border-red-200 text-center flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-royal-crimson" />
                <span>Open Organizer Dashboard</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
