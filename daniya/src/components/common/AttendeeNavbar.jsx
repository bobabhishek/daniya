import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, MapPin, Sparkles, Menu, X, Ticket, 
  User as UserIcon, LogOut, ChevronDown, CheckCircle2,
  PlusCircle, BookOpen
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { useAuth } from '../../context/AuthContext';
import { usePasses } from '../../context/PassesContext';

export default function AttendeeNavbar({ 
  onNavigate, 
  currentView, 
  onOpenMyPasses,
  onOpenAccount
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { passes } = usePasses();
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
    return 'A';
  };

  const getDisplayName = () => {
    if (!user) return '';
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Attendee';
  };

  const passCount = passes.reduce((acc, r) => acc + (r.count || r.participants?.length || 1), 0);

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

          {/* Desktop Navigation Links — Strictly Attendee Oriented */}
          <div className="hidden md:flex items-center space-x-6">
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
            
            {/* Primary "My Passes" Nav Tab — Prominent & Dedicated */}
            <button 
              onClick={() => onOpenMyPasses ? onOpenMyPasses() : handleNavClick('my-passes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                currentView === 'my-passes' 
                  ? 'bg-amber-100 text-royal-crimson shadow-xs' 
                  : 'text-amber-900 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200'
              }`}
            >
              <Ticket className="w-4 h-4 text-royal-crimson" />
              <span>My Passes</span>
              {passCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-royal-crimson text-white">
                  {passCount}
                </span>
              )}
            </button>

            {/* Account Tab */}
            <button 
              onClick={() => onOpenAccount ? onOpenAccount() : handleNavClick('account')}
              className={`text-sm font-semibold transition-colors ${currentView === 'account' ? 'text-royal-crimson border-b-2 border-royal-crimson pb-1' : 'text-stone-700 hover:text-royal-crimson'}`}
            >
              Account
            </button>
          </div>

          {/* Action CTAs & Account Dropdown */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* User Account Capsule */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="px-3 py-1.5 rounded-2xl border border-amber-200 bg-white hover:bg-amber-50/60 hover:border-amber-300 transition-all flex items-center gap-2.5 shadow-sm active:scale-[0.98]"
                aria-expanded={isUserMenuOpen}
                aria-label="Attendee Account Menu"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-2 bg-gradient-to-br from-amber-600 to-red-600 text-white ring-amber-200">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getUserInitial()
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>

                {/* Name & Role Pill */}
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-800 max-w-[100px] truncate leading-tight">
                      {getDisplayName()}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200">
                    <Ticket className="w-2.5 h-2.5 text-amber-600" />
                    <span>Attendee</span>
                  </span>
                </div>

                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white rounded-2xl shadow-2xl border border-amber-200 py-2.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                  
                  {/* User Profile Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50/70 to-red-50/40 border-b border-amber-100/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm bg-amber-600 text-white">
                        {getUserInitial()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {user?.displayName || 'Attendee'}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate" title={user?.email}>
                          {user?.email}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-semibold text-emerald-700">Verified Attendee</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1.5 px-1.5 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenMyPasses) onOpenMyPasses();
                        else handleNavClick('my-passes');
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

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenAccount) onOpenAccount();
                        else handleNavClick('account');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-amber-50 hover:text-royal-crimson transition-all flex items-center gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                        <UserIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <span className="block font-semibold">Account Profile</span>
                        <span className="block text-[10px] text-stone-400 font-normal">Manage your login details</span>
                      </div>
                    </button>

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
                  </div>

                  {/* Sign Out CTA */}
                  <div className="pt-1.5 px-1.5 border-t border-amber-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-2.5"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Direct Sign Out Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400" />
              <span>Sign Out</span>
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
            <div className="px-3 py-2 bg-amber-50/70 rounded-xl mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                {getUserInitial()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-stone-900 truncate">{getDisplayName()}</span>
                <span className="block text-[10px] text-stone-500 truncate">{user?.email}</span>
              </div>
            </div>

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
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenMyPasses) onOpenMyPasses();
                else handleNavClick('my-passes');
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-royal-crimson bg-amber-100/80 flex items-center justify-between"
            >
              <span>My Passes</span>
              {passCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-royal-crimson text-white">
                  {passCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenAccount) onOpenAccount();
                else handleNavClick('account');
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:bg-amber-50"
            >
              Account
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

      </div>
    </nav>
  );
}
