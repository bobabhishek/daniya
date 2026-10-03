import React, { useState } from 'react';
import { 
  ShieldCheck, Crown, Users, DollarSign, Ticket, FileSpreadsheet, 
  Eye, LogOut, RefreshCw, Sparkles, Menu, X, ArrowUpRight
} from 'lucide-react';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { useAuth } from '../../context/AuthContext';

export default function AdminNavbar({
  activeTab = 'dashboard',
  onSelectTab,
  onOpenPreview,
  onExportExcel,
  isExporting = false,
  onRefreshData
}) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    window.location.hash = '';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Stats', icon: Crown },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'payments', label: 'Payment Audits', icon: DollarSign },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#1c1917] text-stone-100 border-b border-amber-500/30 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand & Dedicated Organizer Badge */}
          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-auto flex items-center justify-center p-1 bg-white/10 backdrop-blur-md rounded-xl border border-amber-400/40 shadow-inner">
              <img 
                src={EVENT_CONFIG.ASSETS.LOGO} 
                alt={EVENT_CONFIG.EVENT_NAME}
                className="h-10 w-auto object-contain max-w-[120px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-festive text-xl font-bold tracking-wide text-amber-300">
                  {EVENT_CONFIG.EVENT_NAME}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-400/60 shadow-xs">
                  <Crown className="w-3 h-3 text-amber-300" />
                  <span>ORGANIZER / ADMIN</span>
                </span>
              </div>
              <span className="block text-[11px] font-semibold text-amber-400/80 tracking-wider uppercase">
                {EVENT_CONFIG.EVENT_EDITION} • MANAGEMENT PORTAL
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 bg-stone-900/80 p-1.5 rounded-2xl border border-stone-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab && onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md' 
                      : 'text-stone-300 hover:text-amber-300 hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-950' : 'text-amber-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Quick Export Excel Action */}
            <button
              onClick={onExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition-all hover:scale-[1.02]"
              title="Download Master Excel with Embedded Receipt Screenshots"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>
          </div>

          {/* Right Section: Identity, Site Preview & Sign Out */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* Refresh Data button */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-300 border border-stone-700 transition-all"
                title="Refresh Live Registrations"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Public Site Preview CTA */}
            <button
              onClick={onOpenPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-300 hover:text-white bg-stone-800/90 hover:bg-stone-700 border border-stone-700/80 transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Public Preview</span>
              <ArrowUpRight className="w-3 h-3 text-stone-400" />
            </button>

            {/* Admin User Capsule */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-xs text-white ring-2 ring-amber-400/40">
                A
              </div>
              <div className="text-left hidden md:block">
                <span className="block text-xs font-bold text-stone-200 leading-tight">
                  Organizer Admin
                </span>
                <span className="block text-[10px] text-amber-400/90 leading-tight">
                  teamredhawkz@gmail.com
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-all"
              title="Sign Out of Organizer Dashboard"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-stone-800 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 bg-stone-900 rounded-xl border border-stone-800 mb-3">
              <span className="block text-xs font-bold text-amber-300">Organizer Admin</span>
              <span className="block text-[11px] text-stone-400">teamredhawkz@gmail.com</span>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onSelectTab) onSelectTab(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all ${
                    isActive ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onExportExcel) onExportExcel();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Master Excel</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenPreview) onOpenPreview();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-stone-300 hover:bg-stone-800"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Public Preview Site</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:bg-rose-950/40"
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
