import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Lock, Mail, ArrowLeft, ArrowRight, 
  Sparkles, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, ShieldAlert, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EVENT_CONFIG } from '../../config/eventConfig';
import { ADMIN_EMAIL } from '../../utils/authRoles';

export default function AdminAuthGate({ children, onBackToSite }) {
  const { user, loading, isAdmin, isServerVerified, login, signup, loginWithGoogle, logout } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // If auth state is still resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100/80 flex items-center justify-center text-amber-700 mb-4 animate-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="font-festive text-xl font-bold text-stone-800">
          Loading Organizer Session...
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          Validating authorization credentials.
        </p>
      </div>
    );
  }

  // 1. If authenticated and authoritatively VERIFIED as ADMIN: render children
  if (user && isAdmin) {
    return children;
  }

  // 2. If authenticated as a NORMAL USER / ATTENDEE: Show Tamper-Proof Access Denied Barrier
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] bg-mandala-pattern flex flex-col items-center justify-center p-4 sm:p-6 text-stone-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl border border-red-200/90 shadow-festive p-7 sm:p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center mb-4 border border-red-100 shadow-sm">
            <Lock className="w-8 h-8 text-red-600" />
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Access Restricted • Role Protected
          </span>

          <h2 className="mt-3 text-2xl font-extrabold text-stone-900 font-festive">
            ORGANIZER PORTAL ONLY
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
            You are signed in as <strong className="text-stone-900">{user.email}</strong>.
            This account is registered as a regular attendee and is not authorized to access event administration.
          </p>

          <div className="my-5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 text-left">
            <p className="font-bold flex items-center gap-1.5 text-stone-800">
              <ShieldAlert className="w-4 h-4 text-royal-crimson" />
              <span>Organizer Authorization Rule:</span>
            </p>
            <p className="mt-1 text-stone-600 text-[11px] leading-relaxed">
              Only the authorized administrator account (<span className="font-mono font-bold text-royal-crimson">{ADMIN_EMAIL}</span>) is granted permission to view master attendee records and financials.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={async () => {
                await logout();
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-royal-crimson hover:bg-red-700 transition-all text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch to Admin Account</span>
            </button>
            <button
              onClick={onBackToSite}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-all text-xs"
            >
              Back to Public Website
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. If unauthenticated: render the Organizer Gate login form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    let res;
    if (isSignUp) {
      if (!name.trim()) {
        setErrorMessage('Please enter organizer name.');
        setIsSubmitting(false);
        return;
      }
      res = await signup(email, password, name);
    } else {
      res = await login(email, password);
    }
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleSubmitting(true);
    const res = await loginWithGoogle();
    setIsGoogleSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] bg-mandala-pattern flex flex-col items-center justify-center p-4 sm:p-6 text-stone-900">
      
      {/* Return Button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={onBackToSite}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-royal-crimson transition-colors py-2 px-3 rounded-lg hover:bg-amber-100/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event Website</span>
        </button>
        <span className="text-[11px] font-extrabold text-amber-800 tracking-wider uppercase bg-amber-100/60 px-2.5 py-1 rounded-full border border-amber-200">
          Organizer Portal
        </span>
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border border-amber-200/90 shadow-festive overflow-hidden"
      >
        {/* Ornate Header */}
        <div className="bg-gradient-to-r from-red-800 via-rose-700 to-amber-700 p-6 sm:p-7 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="font-festive text-2xl font-bold tracking-wide">
            Organizer Access
          </h2>
          <p className="text-xs text-amber-100/90 mt-1 max-w-xs mx-auto">
            {EVENT_CONFIG.EVENT_NAME} &bull; Internal Operations Portal
          </p>
        </div>

        {/* Demo Admin Helper Callout */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-[11px]">
          <span className="text-stone-600">Admin Account:</span>
          <span className="font-mono font-bold text-royal-crimson">{ADMIN_EMAIL}</span>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-amber-100 bg-amber-50/30">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMessage(''); }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all relative ${
              !isSignUp ? 'text-royal-crimson bg-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Organizer Sign In
            {!isSignUp && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-crimson" />}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(''); }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all relative ${
              isSignUp ? 'text-royal-crimson bg-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Register Organizer
            {isSignUp && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-crimson" />}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm leading-snug">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            {isGoogleSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-white px-3 text-[11px] uppercase font-semibold text-stone-400">or with credentials</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Organizer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arpit / Event Head"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Organizer Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ADMIN_EMAIL}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 pt-2.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Organizer Account' : 'Authenticate & Enter Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
