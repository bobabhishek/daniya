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
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'UNDER_20' | 'ABOVE_20'
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
  const stats = useMemo(() => {
    let totalRegs = registrations.length;
    let totalParticipants = 0;
    let under20 = 0;
    let above20 = 0;
    let revenue = 0;
    let paidCount = 0;

    registrations.forEach(r => {
      totalParticipants += r.count;
      under20 += r.under20Count || 0;
      above20 += r.above20Count || 0;
      if (r.paymentStatus === 'PAID') {
        revenue += r.amount;
        paidCount++;
      }
    });

    return {
      totalRegs,
      totalParticipants,
      under20,
      above20,
      revenue,
      paidCount
    };
  }, [registrations]);

  // Filter & Sort Logic
  const filteredRegistrations = useMemo(() => {
    return registrations
      .filter(item => {
        // Search match
        const matchesSearch = 
          item.registrationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.participantsSummary.toLowerCase().includes(searchTerm.toLowerCase());

        // Payment status filter
        const matchesPayment = paymentFilter === 'ALL' || item.paymentStatus === paymentFilter;

        // Age category filter
        let matchesCategory = true;
        if (categoryFilter === 'UNDER_20') {
          matchesCategory = item.under20Count > 0;
        } else if (categoryFilter === 'ABOVE_20') {
          matchesCategory = item.above20Count > 0;
        }

        return matchesSearch && matchesPayment && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
        if (sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
        if (sortBy === 'OLDEST') return a.registrationId.localeCompare(b.registrationId);
        // Default NEWEST
        return b.registrationId.localeCompare(a.registrationId);
      });
  }, [registrations, searchTerm, paymentFilter, categoryFilter, sortBy]);

  // Download Master Excel (.xlsx) with physically embedded screenshots
  const handleExportMasterExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await api.downloadMasterExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Dandiya_Master_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Backend Master Excel export unavailable, falling back to CSV:', err);
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
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'payments') {
            setPaymentFilter('PAID');
          } else if (tab === 'registrations') {
            setPaymentFilter('ALL');
          }
        }}
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
            Master Registration Overview &bull; 1 Completed Registration = 1 Master Row
          </p>
        </div>

        {/* 6 Dynamic Statistic Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          
          <div className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">TOTAL REGISTRATIONS</span>
            <p className="text-2xl font-extrabold text-stone-900 mt-1">{stats.totalRegs}</p>
            <span className="text-[10px] text-stone-500">Master Orders</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">TOTAL PARTICIPANTS</span>
            <p className="text-2xl font-extrabold text-stone-900 mt-1">{stats.totalParticipants}</p>
            <span className="text-[10px] text-stone-500">Issued Passes</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-sm bg-emerald-50/20">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">≤20 PARTICIPANTS</span>
            <p className="text-2xl font-extrabold text-emerald-800 mt-1">{stats.under20}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">@ ₹199 / pass</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-200/90 shadow-sm bg-red-50/20">
            <span className="text-[10px] uppercase font-bold text-royal-crimson block tracking-wider">&gt;20 PARTICIPANTS</span>
            <p className="text-2xl font-extrabold text-royal-crimson mt-1">{stats.above20}</p>
            <span className="text-[10px] text-red-600 font-semibold">@ ₹299 / pass</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm bg-amber-50/30">
            <span className="text-[10px] uppercase font-bold text-amber-800 block tracking-wider">TOTAL REVENUE</span>
            <p className="text-2xl font-extrabold text-stone-900 mt-1">₹{stats.revenue.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-amber-700 font-semibold">Net Collections</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">SUCCESSFUL PAYMENTS</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.paidCount}</p>
            <span className="text-[10px] text-stone-500">PAID Orders</span>
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
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none"
              >
                <option value="ALL">All Payments</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-stone-400 uppercase text-[10px]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="UNDER_20">Has ≤20 (Student)</option>
                <option value="ABOVE_20">Has &gt;20 (Adult)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="AMOUNT_DESC">Amount: High to Low</option>
                <option value="AMOUNT_ASC">Amount: Low to High</option>
              </select>
            </div>

          </div>

        </div>

        {/* Master Excel View Table */}
        <div className="bg-white rounded-3xl border border-amber-200/90 shadow-festive overflow-hidden">
          
          <div className="p-4 sm:p-5 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-festive font-extrabold text-stone-900 text-lg">
                MASTER EXCEL VIEW
              </h2>
              <p className="text-xs text-stone-500">
                Displaying {filteredRegistrations.length} of {registrations.length} Master Rows (1 Registration = 1 Master Row)
              </p>
            </div>

            <div className="text-xs font-bold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full">
              Automated Dynamic Calculations
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
