import React, { useState, useEffect } from 'react';
import PublicNavbar from './components/common/PublicNavbar';
import AttendeeNavbar from './components/common/AttendeeNavbar';
import Footer from './components/common/Footer';
import Hero from './components/landing/Hero';
import EventDetails from './components/landing/EventDetails';
import Rules from './components/landing/Rules';
import RegistrationWizard from './components/wizard/RegistrationWizard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAuthGate from './components/admin/AdminAuthGate';
import AuthModal from './components/auth/AuthModal';
import AccountModal from './components/auth/AccountModal';
import MyTicketsModal from './components/tickets/MyTicketsModal';
import VerifyTicket from './components/tickets/VerifyTicket';
import { useAuth } from './context/AuthContext';
import { EVENT_CONFIG } from './config/eventConfig';
import api from './services/api';
import { Sparkles, Crown, ArrowLeft } from 'lucide-react';

export default function App() {
  const { user, isAdmin, isAttendee, isGuest, loading: authLoading, logout } = useAuth();

  // Navigation view: 'home' | 'event-details' | 'rules' | 'register' | 'my-passes' | 'account' | 'admin' | 'admin-preview' | 'verify-ticket'
  const [currentView, setCurrentView] = useState('home');
  const [verifyTicketId, setVerifyTicketId] = useState('');

  const [registrations, setRegistrations] = useState([]);
  const [passesDeepLink, setPassesDeepLink] = useState({ reg: null, ticket: null });

  // Global Auth Modal configuration
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    mode: 'login',
    title: '',
    subtitle: ''
  });

  // User Modals
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Pending user intent before login
  const [pendingAction, setPendingAction] = useState(null);

  const handleOpenAuth = (mode = 'login', title = '', subtitle = '') => {
    setAuthModalConfig({
      isOpen: true,
      mode,
      title,
      subtitle
    });
  };

  const handleCloseAuth = () => {
    setAuthModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Admin data is now refreshed in the dashboard itself to avoid duplicate network calls
  // and overly slow admin loads during redirect / route changes.

  // Resolve pending intent after login
  useEffect(() => {
    if (user && pendingAction === 'register') {
      setPendingAction(null);
      window.location.hash = '#/register';
      setCurrentView('register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (user && pendingAction === 'my-passes') {
      setPendingAction(null);
      setIsMyTicketsOpen(true);
    }
  }, [user, pendingAction]);

  // Auto-close private attendee modals on logout
  useEffect(() => {
    if (!user) {
      setIsMyTicketsOpen(false);
      setIsAccountModalOpen(false);
    }
  }, [user]);

  // Authoritative Hash Router & Navigation Synchronization
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      // QR Scan public verification route
      if (hash.startsWith('#/verify-ticket/')) {
        const tid = hash.replace('#/verify-ticket/', '').split('?')[0];
        setVerifyTicketId(tid);
        setCurrentView('verify-ticket');
        return;
      }

      // Admin routes
      if (hash.startsWith('#/admin-preview')) {
        if (isAdmin) {
          setCurrentView('admin-preview');
        } else {
          window.location.hash = '';
          setCurrentView('home');
        }
        return;
      }

      if (hash.startsWith('#/admin') || window.location.pathname === '/admin') {
        if (authLoading) return; // wait until auth resolves
        if (isAdmin) {
          setCurrentView('admin');
        } else if (!user) {
          window.location.hash = '';
          setCurrentView('home');
          handleOpenAuth('login', 'Sign In as Organizer', 'Enter organizer credentials to access the administrative portal.');
        } else {
          // Normal attendee attempting to access admin route: strictly forbidden
          window.location.hash = '';
          setCurrentView('home');
        }
        return;
      }

      // Attendee My Passes route
      if (hash.startsWith('#/passes') || hash.startsWith('#/my-passes')) {
        const query = hash.includes('?') ? hash.split('?')[1] : '';
        const params = new URLSearchParams(query);
        setPassesDeepLink({
          reg: params.get('reg'),
          ticket: params.get('ticket'),
        });

        if (isAdmin) {
          setCurrentView('admin');
        } else if (!user && !authLoading) {
          setIsMyTicketsOpen(false);
          setCurrentView('home');
          setPendingAction('my-passes');
          handleOpenAuth('login', 'Sign In to View My Passes', 'Sign in to access your verified entry passes and bookings.');
        } else if (user) {
          setCurrentView('home');
          setIsMyTicketsOpen(true);
        }
        return;
      }

      // Attendee Account route
      if (hash.startsWith('#/account')) {
        if (!user && !authLoading) {
          setCurrentView('home');
          handleOpenAuth('login', 'Sign In to View Account', 'Sign in to manage your festival profile.');
        } else if (user) {
          setCurrentView('home');
          setIsAccountModalOpen(true);
        }
        return;
      }

      // Register route
      if (hash.startsWith('#/register')) {
        setCurrentView('register');
        return;
      }

      // Public / Default Home route
      setCurrentView('home');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdmin, user, authLoading]);

  // Deterministic navigation helper
  const handleNavigate = (target) => {
    if (target === 'register') {
      window.location.hash = '#/register';
      setCurrentView('register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'home') {
      window.location.hash = '';
      setCurrentView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'event-details' || target === 'rules') {
      if (currentView !== 'home') {
        window.location.hash = '';
        setCurrentView('home');
        setTimeout(() => {
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (target === 'my-passes') {
      if (!user) {
        setPendingAction('my-passes');
        handleOpenAuth('login', 'Sign In to View My Passes', 'Sign in to access your verified entry passes and bookings.');
        return;
      }
      setIsMyTicketsOpen(true);
    } else if (target === 'account') {
      if (!user) {
        handleOpenAuth('login', 'Sign In to View Account', 'Sign in to manage your festival profile.');
        return;
      }
      setIsAccountModalOpen(true);
    }
  };

  const handleRegistrationCreated = (newRegistration) => {
    setRegistrations(prev => [newRegistration, ...prev]);
  };

  // When user logs in, if they had a pendingAction like 'my-passes', immediately open My Passes!
  useEffect(() => {
    if (user && pendingAction === 'my-passes') {
      setPassesDeepLink({ reg: null, ticket: null });
      setIsMyTicketsOpen(true);
      setPendingAction(null);
    }
  }, [user, pendingAction]);

  // 1. Authentication Loading State ONLY for private admin route, never blocking public site
  if (authLoading && currentView === 'admin') {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative h-16 w-auto flex items-center justify-center p-2 bg-white rounded-2xl border border-amber-200 shadow-md mb-4 animate-pulse">
          <img src={EVENT_CONFIG.ASSETS.LOGO} alt={EVENT_CONFIG.EVENT_NAME} className="h-12 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2 text-royal-crimson font-festive text-2xl font-bold">
          <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
          <span>{EVENT_CONFIG.EVENT_NAME}</span>
        </div>
        <p className="text-xs text-stone-500 mt-2 font-medium tracking-wide">
          Verifying organizer session...
        </p>
      </div>
    );
  }

  // 2. Fullscreen Public QR Verification Gate Scanner
  if (currentView === 'verify-ticket') {
    return <VerifyTicket ticketId={verifyTicketId} />;
  }

  // 3. AUTHENTICATED ADMIN EXPERIENCE
  if (isAdmin && currentView !== 'admin-preview') {
    return (
      <AdminAuthGate onBackToSite={() => { window.location.hash = '#/admin-preview'; setCurrentView('admin-preview'); }}>
        <AdminDashboard
          registrations={registrations}
          onBackToSite={() => { window.location.hash = '#/admin-preview'; setCurrentView('admin-preview'); }}
        />
      </AdminAuthGate>
    );
  }

  // 4. ADMIN PREVIEW MODE (When Admin views public site)
  const isAdminPreview = isAdmin && currentView === 'admin-preview';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-stone-800">

      {/* Top Banner when in Admin Public Site Preview Mode */}
      {isAdminPreview && (
        <aside aria-label="Admin Preview Controls" className="bg-stone-950 text-white px-4 py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-amber-500/40 sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold text-amber-300 uppercase tracking-wider">ORGANIZER PREVIEW MODE</span>
            <span className="text-stone-400 hidden sm:inline">&bull; Viewing public site as Administrator</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { window.location.hash = '#/admin'; setCurrentView('admin'); }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Admin Portal</span>
            </button>
            <button
              onClick={async () => { await logout(); window.location.hash = ''; }}
              className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* DETERMINISTIC NAVBAR:
          - If Authenticated Attendee: Dedicated AttendeeNavbar (Home, Event Details, Rules, Register, My Passes, Account, Sign Out)
          - If Anonymous Guest: Dedicated PublicNavbar (Home, Event Details, Rules, Register, Sign In)
      */}
      {isAttendee ? (
        <AttendeeNavbar
          onNavigate={handleNavigate}
          currentView={currentView}
          onOpenMyPasses={() => {
            setPassesDeepLink({ reg: null, ticket: null });
            setIsMyTicketsOpen(true);
          }}
          onOpenAccount={() => setIsAccountModalOpen(true)}
        />
      ) : (
        <PublicNavbar
          onNavigate={handleNavigate}
          currentView={currentView}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-grow">
        {currentView === 'home' ? (
          <>
            <Hero
              onRegisterClick={() => handleNavigate('register')}
              onExploreClick={() => handleNavigate('event-details')}
            />
            <EventDetails
              onRegisterClick={() => handleNavigate('register')}
            />
            <Rules
              onProceedToRegister={() => handleNavigate('register')}
            />
          </>
        ) : (
          <RegistrationWizard
            onRegistrationCreated={handleRegistrationCreated}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </main>

      {/* Attendee / Public Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenMyTickets={() => {
          if (!user) {
            setPendingAction('my-passes');
            handleOpenAuth('login', 'Sign In to View My Passes', 'Sign in to access your verified entry passes and bookings.');
            return;
          }
          setPassesDeepLink({ reg: null, ticket: null });
          setIsMyTicketsOpen(true);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalConfig.isOpen}
        onClose={handleCloseAuth}
        initialMode={authModalConfig.mode}
        customTitle={authModalConfig.title}
        customSubtitle={authModalConfig.subtitle}
      />

      {/* Attendee Account Modal */}
      {isAttendee && (
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onOpenMyPasses={() => {
            setIsAccountModalOpen(false);
            setIsMyTicketsOpen(true);
          }}
          onNavigateToRegister={() => {
            setIsAccountModalOpen(false);
            handleNavigate('register');
          }}
        />
      )}

      {/* Attendee Personalized Tickets Modal */}
      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => {
          setIsMyTicketsOpen(false);
          setPassesDeepLink({ reg: null, ticket: null });
        }}
        user={user}
        initialRegistrationId={passesDeepLink.reg}
        initialTicketId={passesDeepLink.ticket}
        onNavigateToRegister={() => handleNavigate('register')}
      />

    </div>
  );
}
