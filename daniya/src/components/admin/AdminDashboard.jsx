import React, { useState, useMemo } from 'react';
import { 
  Users, DollarSign, Ticket, ShieldCheck, Search, Filter, 
  ArrowUpDown, Download, Eye, FileText, ArrowLeft, RefreshCw, 
  CheckCircle2, Clock, AlertTriangle, ChevronRight, Sparkles, LogOut,
  Loader2, FileCheck, ShieldAlert
} from 'lucide-react';
import RegistrationRecordModal from './RegistrationRecordModal';
import TicketPreviewModal from './TicketPreviewModal';
import AdminReceiptViewerModal from './AdminReceiptViewerModal';
import AdminNavbar from '../common/AdminNavbar';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { useAuth } from '../../context/AuthContext';
import api, { getPublicAppUrl } from '../../services/api';

export default function AdminDashboard({ registrations: registrationsProp = [], onBackToSite }) {
  const { user, logout } = useAuth();
  const [registrations, setRegistrations] = useState(registrationsProp);
  const [isExporting, setIsExporting] = useState(false);
  const [securityBlocked, setSecurityBlocked] = useState(false);

  // Search, filter, and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'FAILED'
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'

  // Modal inspection states
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [ticketPreviewRecord, setTicketPreviewRecord] = useState(null);
  const [viewingReceiptRecord, setViewingReceiptRecord] = useState(null);

  React.useEffect(() => {
    let active = true;
    async function refreshFromBackend() {
      try {
        const data = await api.getAdminRegistrations();
        if (active && Array.isArray(data)) {
          setRegistrations(data);
        }
      } catch (err) {
        if (active && (err.status === 403 || err.status === 401)) {
          setSecurityBlocked(true);
        }
        console.warn('Could not refresh admin registrations from backend:', err);
      }
    }
    refreshFromBackend();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    setRegistrations(registrationsProp);
  }, [registrationsProp]);

  // Receipt deep link (e.g. #/admin?receipt=KD-000001)
  React.useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/receipt=([^&]+)/);
    if (!match?.[1]) return;

    const regId = decodeURIComponent(match[1]);
    const found = registrations.find((r) => r.registrationId === regId);
    if (found) {
      setViewingReceiptRecord(found);
      return;
    }

    let active = true;
    api.getAdminRegistration(regId)
      .then((record) => {
        if (active && record) setViewingReceiptRecord(record);
      })
      .catch((err) => console.warn('Receipt deep link registration fetch failed:', err));

    return () => { active = false; };
  }, [registrations]);

  // Dynamic calculations from current registrations
  // Dynamic calculations from current registrations
  const stats = useMemo(() => {
    let totalRegs = registrations.length;
    let totalParticipants = 0;
    let revenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    registrations.forEach(r => {
      totalParticipants += (r.count || r.participants?.length || 1);
      if (r.paymentStatus === 'PAID') {
        revenue += (r.expectedAmount || r.amount || 0);
        paidCount++;
      } else if (r.paymentStatus === 'FAILED') {
        failedCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalRegs,
      totalParticipants,
      revenue,
      paidCount,
      pendingCount,
      failedCount
    };
  }, [registrations]);

  // Filter & Sort Logic
  const filteredRegistrations = useMemo(() => {
    return registrations
      .filter(item => {
        // Search match
        const matchesSearch = 
          !searchTerm ||
          item.registrationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.participantsSummary?.toLowerCase().includes(searchTerm.toLowerCase());

        // Payment status filter
        const matchesPayment = paymentFilter === 'ALL' || item.paymentStatus === paymentFilter;

        return matchesSearch && matchesPayment;
      })
      .sort((a, b) => {
        const amtA = a.expectedAmount || a.amount || 0;
        const amtB = b.expectedAmount || b.amount || 0;
        if (sortBy === 'AMOUNT_DESC') return amtB - amtA;
        if (sortBy === 'AMOUNT_ASC') return amtA - amtB;
        if (sortBy === 'OLDEST') return (a.registrationId || '').localeCompare(b.registrationId || '');
        // Default NEWEST
        return (b.registrationId || '').localeCompare(a.registrationId || '');
      });
  }, [registrations, searchTerm, paymentFilter, sortBy]);

  // Download Master Excel (.xlsx) with physically embedded screenshots
  // Master Excel (.xlsx) Export with physically embedded receipt images
  const handleExportMasterExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await api.downloadMasterExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `Taal_Pe_Nacho_Re_Master_Registrations_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Backend Master Excel export issue, falling back to client-side CSV:', err);
      // Fallback to CSV so admin is never blocked
      handleExportCSV();
    } finally {
      setIsExporting(false);
    }
  };

  // Fallback Export to Master CSV file with formula injection prevention
  const handleExportCSV = () => {
    const headers = [
      "Registration ID",
      "Date/Time",
      "Participant(s)",
      "Count",
      "Amount",
      "Payment",
      "Ticket Link(s)",
      "View Receipt"
    ];

    const sanitize = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (['=', '+', '-', '@'].includes(str.charAt(0))) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const origin = getPublicAppUrl();

    const rows = filteredRegistrations.map(r => {
      const regId = r.registrationId;
      const ticketLink = `${origin}/#/passes?reg=${regId}`;
      const receiptLink = (r.verificationStatus === 'VERIFIED' || r.paymentStatus === 'PAID')
        ? `${origin}/#/admin?receipt=${regId}`
        : 'N/A';

      return [
        sanitize(regId),
        sanitize(r.dateTime || r.uploadedAt || ''),
        sanitize(r.participantsSummary || ''),
        r.count,
        r.expectedAmount || r.amount,
        sanitize(r.paymentStatus),
        sanitize(ticketLink),
        sanitize(receiptLink)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dandiya_Master_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (securityBlocked) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-royal-crimson flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-festive text-2xl font-bold text-stone-900">
          Security Alert: Administrative Access Forbidden
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mt-2 leading-relaxed">
          The server rejected this session with HTTP 403 Forbidden. Client-side DOM or local variable manipulation in DevTools cannot bypass cryptographic server authorization policies.
        </p>
        <button
          onClick={onBackToSite}
          className="mt-6 px-6 py-2.5 bg-royal-crimson text-white font-bold text-xs rounded-xl shadow hover:bg-red-700 transition-all"
        >
          Return to Public Site
        </button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('dashboard');

  const refreshAdminData = async () => {
    try {
      const data = await api.getAdminRegistrations();
      if (Array.isArray(data)) {
        setRegistrations(data);
      }
    } catch (err) {
      console.warn('Could not refresh admin registrations:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1917]/5 text-stone-900 pb-20">
      
      {/* Dedicated Organizer / Admin Navigation Bar */}
      <AdminNavbar
        onOpenPreview={onBackToSite}
        onExportExcel={handleExportMasterExcel}
        isExporting={isExporting}
        onRefreshData={refreshAdminData}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Dashboard Title & Subtitle */}
        <div className="mb-8">
          <span className="text-xs uppercase font-extrabold tracking-widest text-royal-crimson bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Internal Operations View
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-stone-900 font-festive">
            EVENT REGISTRATION DASHBOARD
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Master Registration Overview &bull; 1 Completed Registration = 1 Master Row &bull; Click any stat card to filter
          </p>
        </div>

        {/* 5 Interactive Dynamic Statistic Cards (Click Any Card to Filter Table) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
          
          {/* Card 1: Total Registrations */}
          <div 
            onClick={() => {
              setPaymentFilter('ALL');
              setSearchTerm('');
            }}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
              paymentFilter === 'ALL'
                ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white border-amber-200/90 shadow-sm hover:border-amber-400 hover:shadow-md'
            }`}
            title="Click to view all registrations"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">TOTAL REGISTRATIONS</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paymentFilter === 'ALL' ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'}`}>
                {paymentFilter === 'ALL' ? 'ALL' : 'VIEW ALL'}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">{stats.totalRegs}</p>
            <span className="text-[11px] text-stone-500 font-medium">Master Bookings</span>
          </div>

          {/* Card 2: Total Participants / Issued Passes */}
          <div 
            onClick={() => {
              setPaymentFilter('ALL');
            }}
            className="p-4 sm:p-5 rounded-2xl border bg-white border-amber-200/90 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer select-none active:scale-[0.98]"
            title="Total attendees across all bookings"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">TOTAL PARTICIPANTS</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                ₹299 / PASS
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">{stats.totalParticipants}</p>
            <span className="text-[11px] text-stone-500 font-medium">Issued Passes</span>
          </div>

          {/* Card 3: Successful Payments (PAID) */}
          <div 
            onClick={() => setPaymentFilter('PAID')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
              paymentFilter === 'PAID'
                ? 'bg-emerald-500/15 border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white border-emerald-200/80 shadow-sm hover:border-emerald-400 hover:shadow-md'
            }`}
            title="Click to filter table by PAID orders only"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">SUCCESSFUL PAYMENTS</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paymentFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {paymentFilter === 'PAID' ? 'FILTERED' : 'PAID ONLY'}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">{stats.paidCount}</p>
            <span className="text-[11px] text-emerald-700 font-semibold">Verified Orders</span>
          </div>

          {/* Card 4: Pending / Unverified Orders */}
          <div 
            onClick={() => setPaymentFilter('PENDING')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
              paymentFilter === 'PENDING'
                ? 'bg-amber-500/20 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white border-amber-200/80 shadow-sm hover:border-amber-400 hover:shadow-md'
            }`}
            title="Click to filter table by PENDING orders awaiting verification"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">PENDING AUDITS</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${paymentFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {paymentFilter === 'PENDING' ? 'FILTERED' : 'AUDIT'}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-2">{stats.pendingCount}</p>
            <span className="text-[11px] text-stone-500 font-medium">Awaiting Proof Verification</span>
          </div>

          {/* Card 5: Total Revenue Collections */}
          <div 
            onClick={() => setPaymentFilter('PAID')}
            className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
              paymentFilter === 'PAID'
                ? 'bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-400/40'
                : 'bg-white border-amber-200/90 shadow-sm hover:border-amber-400 hover:shadow-md'
            }`}
            title="Total verified collections from paid registrations (Click to view Paid)"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">TOTAL REVENUE</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                NET
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">₹{stats.revenue.toLocaleString('en-IN')}</p>
            <span className="text-[11px] text-emerald-700 font-semibold">Net Collections</span>
          </div>

        </div>

        {/* Search, Filter, and Sorting Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Registration ID or Participant Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Payment Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-stone-400 uppercase text-[10px]">Payment:</span>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Payments</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="AMOUNT_DESC">Amount: High to Low</option>
                <option value="AMOUNT_ASC">Amount: Low to High</option>
              </select>
            </div>

            {/* Clear filter indicator button if filtered */}
            {paymentFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setPaymentFilter('ALL')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset to all orders"
              >
                <span>Clear Filter ({paymentFilter})</span>
                <span className="text-amber-700 font-extrabold">&times;</span>
              </button>
            )}

          </div>

        </div>

        {/* Master Excel View Table */}
        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-festive overflow-hidden">
          
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/80 via-emerald-50/30 to-amber-50/80 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-festive font-extrabold text-stone-900 text-lg sm:text-xl tracking-wide">
                  MASTER EXCEL VIEW
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Self-Contained .XLSX + Images
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Displaying {filteredRegistrations.length} of {registrations.length} Master Rows (1 Registration = 1 Master Row)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:inline-block text-xs font-bold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
                Automated Dynamic Calculations
              </div>

              {/* PRIMARY DOWNLOAD MASTER EXCEL BUTTON */}
              <button
                type="button"
                onClick={handleExportMasterExcel}
                disabled={isExporting}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 border border-emerald-400/50 cursor-pointer disabled:opacity-60"
                title="Download complete Master Excel spreadsheet with embedded payment receipt images and in-depth details"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>GENERATING MASTER EXCEL...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>DOWNLOAD MASTER EXCEL (.XLSX)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-amber-200/80 text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-3">Registration</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Participants</th>
                  <th className="py-3.5 px-2 text-right">Expected</th>
                  <th className="py-3.5 px-2 text-right">Entered</th>
                  <th className="py-3.5 px-2 text-right">Verified Amount</th>
                  <th className="py-3.5 px-2 text-center">Payment</th>
                  <th className="py-3.5 px-2 text-center">Verification</th>
                  <th className="py-3.5 px-2 text-center">UPI Ref</th>
                  <th className="py-3.5 px-2 text-center">Confidence</th>
                  <th className="py-3.5 px-2 whitespace-nowrap">Uploaded Time</th>
                  <th className="py-3.5 px-3 text-center">Receipt</th>
                  <th className="py-3.5 px-2 text-center">Passes</th>
                  <th className="py-3.5 px-2 text-center">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRegistrations.map((row) => (
                  <tr key={row.registrationId} className="hover:bg-amber-50/30 transition-colors">
                    
                    {/* Registration ID */}
                    <td className="py-3.5 px-3 font-mono font-bold text-stone-900 text-xs">
                      {row.registrationId}
                    </td>

                    {/* Participant(s) Summary */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-stone-900 line-clamp-1 text-xs" title={row.participantsSummary}>
                        {row.participantsSummary}
                      </p>
                      <span className="text-[10px] text-stone-400">
                        {row.count} {row.count === 1 ? 'attendee' : 'attendees'}
                      </span>
                    </td>

                    {/* Expected Amount */}
                    <td className="py-3.5 px-2 text-right font-extrabold text-stone-900 text-xs font-mono">
                      ₹{row.expectedAmount ?? row.amount}
                    </td>

                    {/* Entered Amount */}
                    <td className="py-3.5 px-2 text-right font-bold text-stone-800 text-xs font-mono">
                      ₹{row.enteredAmount ?? row.amount}
                    </td>

                    {/* OCR Amount */}
                    <td className="py-3.5 px-2 text-right font-extrabold text-emerald-700 text-xs font-mono">
                      {row.ocrAmount ? `₹${row.ocrAmount}` : <span className="text-stone-400 font-normal">-</span>}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
                        row.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.paymentStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {row.paymentStatus}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-2 text-center">
                      {row.verificationStatus === 'VERIFIED' || row.paymentStatus === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>VERIFIED</span>
                        </span>
                      ) : row.verificationStatus === 'REJECTED' || row.verificationStatus === 'FAILED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-red-50 text-red-700 border border-red-200">
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          PENDING
                        </span>
                      )}
                    </td>

                    {/* UPI Reference */}
                    <td className="py-3.5 px-2 text-center font-mono text-[11px] text-stone-600">
                      {row.upiTransactionId || row.transactionId || '-'}
                    </td>

                    {/* OCR Confidence */}
                    <td className="py-3.5 px-2 text-center text-xs font-semibold text-stone-700">
                      {row.ocrConfidence !== undefined && row.ocrConfidence !== null 
                        ? `${(row.ocrConfidence * 100).toFixed(0)}%` 
                        : '-'}
                    </td>

                    {/* Uploaded Time / Date */}
                    <td className="py-3.5 px-2 text-stone-600 whitespace-nowrap text-[11px]">
                      {row.uploadedAt || row.dateTime}
                    </td>

                    {/* VIEW RECEIPT Button */}
                    <td className="py-3.5 px-3 text-center">
                      {(row.verificationStatus === 'VERIFIED' || row.paymentStatus === 'PAID' || row.receiptPath) ? (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptRecord(row)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-royal-crimson hover:bg-red-700 transition-colors inline-flex items-center gap-1 shadow-2xs whitespace-nowrap active:scale-95"
                          title="View verified payment receipt"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-amber-200" />
                          <span>VIEW RECEIPT</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">No receipt</span>
                      )}
                    </td>

                    {/* View Tickets Button */}
                    <td className="py-3.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setTicketPreviewRecord(row)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
                        title="View Individual Ticket Passes"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-700" />
                        <span>Passes</span>
                      </button>
                    </td>

                    {/* Audit / Registration Record Button */}
                    <td className="py-3.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(row)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 hover:text-royal-crimson transition-colors inline-flex items-center gap-1"
                        title="Open Complete Registration Audit Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRegistrations.length === 0 && (
            <div className="py-12 text-center text-stone-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">No registrations match your search filters.</p>
            </div>
          )}

        </div>

      </main>

      {/* Modals */}
      {selectedRecord && (
        <RegistrationRecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onOpenTickets={(r) => {
            setSelectedRecord(null);
            setTicketPreviewRecord(r);
          }}
          onViewReceipt={(r) => {
            setViewingReceiptRecord(r);
          }}
        />
      )}

      {ticketPreviewRecord && (
        <TicketPreviewModal
          record={ticketPreviewRecord}
          onClose={() => setTicketPreviewRecord(null)}
        />
      )}

      {viewingReceiptRecord && (
        <AdminReceiptViewerModal
          isOpen={Boolean(viewingReceiptRecord)}
          record={viewingReceiptRecord}
          onClose={() => setViewingReceiptRecord(null)}
        />
      )}

    </div>
  );
}
