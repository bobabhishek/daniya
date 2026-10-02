import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Hero from './components/landing/Hero';
import EventDetails from './components/landing/EventDetails';
import Rules from './components/landing/Rules';
import RegistrationWizard from './components/wizard/RegistrationWizard';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminAuthGate from './components/admin/AdminAuthGate';
import AuthModal from './components/auth/AuthModal';
import MyTicketsModal from './components/tickets/MyTicketsModal';
import VerifyTicket from './components/tickets/VerifyTicket';
import { INITIAL_MOCK_REGISTRATIONS } from './data/mockRegistrations';
import { useAuth } from './context/AuthContext';
import api from './services/api';

export default function App() {
  const { user, isAdmin } = useAuth();

  // Navigation view: 'home' | 'register' | 'admin' | 'verify-ticket'
  const [currentView, setCurrentView] = useState('home');
  // Ticket ID parsed from hash when view is 'verify-ticket'
  const [verifyTicketId, setVerifyTicketId] = useState('');

  // Master registrations state (starts with 13 realistic mock records + dynamically accepts new ones)
  const [registrations, setRegistrations] = useState(() => {
    try {
      const saved = localStorage.getItem('dandiya_registrations');
      return saved ? JSON.parse(saved) : INITIAL_MOCK_REGISTRATIONS;
    } catch {
      return INITIAL_MOCK_REGISTRATIONS;
    }
  });

  // Global Auth Modal configuration
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    mode: 'login',
    title: '',
    subtitle: ''
  });

  // User Tickets Modal state
  const [isMyTicketsOpen, setIsMyTicketsOpen] = useState(false);

  // Pending user intent before login (e.g. user clicked "Register Now" while unauthenticated)
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

  // Sync registrations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dandiya_registrations', JSON.stringify(registrations));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [registrations]);

  // Sync registrations with FastAPI backend when user is logged in
  useEffect(() => {
    async function syncBackendData() {
      if (isAdmin) {
        try {
          const adminRegs = await api.getAdminRegistrations();
          if (adminRegs && Array.isArray(adminRegs) && adminRegs.length > 0) {
            setRegistrations(adminRegs);
          }
        } catch (e) {
          // local fallback active
        }
      } else if (user) {
        try {
          const userRegs = await api.getMyRegistrations();
          if (userRegs && Array.isArray(userRegs) && userRegs.length > 0) {
            setRegistrations(prev => {
              const userIds = new Set(userRegs.map(r => r.registrationId));
              const others = prev.filter(r => !userIds.has(r.registrationId));
              return [...userRegs, ...others];
            });
          }
        } catch (e) {
          // local fallback active
        }
      }
    }
    syncBackendData();
  }, [user, isAdmin]);

  // If user signs in or signs up and had a pending "register" action, immediately direct them to registration
  useEffect(() => {
    if (user && pendingAction === 'register') {
      setPendingAction(null);
      window.location.hash = '#/register';
      setCurrentView('register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [user, pendingAction]);

  // Sync hash routing e.g. #/admin, #/verify-ticket/:id
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin' || window.location.pathname === '/admin') {
        setCurrentView('admin');
      } else if (hash === '#/register') {
        setCurrentView('register');
      } else if (hash.startsWith('#/verify-ticket/')) {
        // QR scan route — extract ticket ID after the prefix
        const tid = hash.replace('#/verify-ticket/', '').split('?')[0];
        setVerifyTicketId(tid);
        setCurrentView('verify-ticket');
      } else {
        setCurrentView('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (target) => {
    if (target === 'register') {
      // RBAC Requirement: User must be signed in or signed up before booking tickets
      if (!user) {
        setPendingAction('register');
        handleOpenAuth(
          'signup',
          'Sign In or Sign Up to Book Tickets',
          'Please sign in or create an account first. Your admission passes, payment receipts, and age verification documents will be safely saved to your profile.'
        );
        return;
      }
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
    }
  };

  const handleOpenAdmin = () => {
    window.location.hash = '#/admin';
    setCurrentView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSite = () => {
    window.location.hash = '';
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegistrationCreated = (newRegistration) => {
    setRegistrations(prev => [newRegistration, ...prev]);
  };

  // If in Admin view (guarded by AdminAuthGate with strict role check)
  if (currentView === 'admin') {
    return (
      <AdminAuthGate onBackToSite={handleBackToSite}>
        <AdminDashboard
          registrations={registrations}
          onBackToSite={handleBackToSite}
        />
      </AdminAuthGate>
    );
  }

  // QR gate scanner verification page — fullscreen, no nav chrome
  if (currentView === 'verify-ticket') {
    return <VerifyTicket ticketId={verifyTicketId} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-stone-800">
      
      {/* Primary Festive Navbar */}
      <Navbar
        onNavigate={handleNavigate}
        currentView={currentView}
        onOpenAdmin={handleOpenAdmin}
        onOpenAuth={handleOpenAuth}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
      />

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
            onOpenAdmin={handleOpenAdmin}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAdmin={handleOpenAdmin}
        onOpenMyTickets={() => setIsMyTicketsOpen(true)}
      />

      {/* Global Interactive Authentication Modal */}
      <AuthModal
        isOpen={authModalConfig.isOpen}
        onClose={handleCloseAuth}
        initialMode={authModalConfig.mode}
        customTitle={authModalConfig.title}
        customSubtitle={authModalConfig.subtitle}
      />

      {/* User's Personalized Tickets Modal (Normal User view) */}
      <MyTicketsModal
        isOpen={isMyTicketsOpen}
        onClose={() => setIsMyTicketsOpen(false)}
        user={user}
        registrations={registrations}
        onNavigateToRegister={() => handleNavigate('register')}
      />

    </div>
  );
}
