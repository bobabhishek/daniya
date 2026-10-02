import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Lock, User as UserIcon, Eye, EyeOff, 
  Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAIL } from '../../utils/authRoles';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialMode = 'login', 
  customTitle, 
  customSubtitle,
  onSuccess 
}) {
  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState(initialMode);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  // Reset form when switching tabs or closing
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleClose = () => {
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  // Common success handler with automatic role-based redirect
  const handleAuthSuccess = (authenticatedUser) => {
    const isOrganizer = authenticatedUser?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    handleClose();

    // If logging in as the event organizer, automatically redirect to the Organizer Dashboard
    if (isOrganizer) {
      window.location.hash = '#/admin';
    }

    if (onSuccess) {
      onSuccess(authenticatedUser, isOrganizer);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address to receive reset instructions.');
        return;
      }
      setIsSubmitting(true);
      const res = await resetPassword(email);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMessage('Please enter a valid email.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify.');
        return;
      }

      setIsSubmitting(true);
      const res = await signup(email, password, name);
      setIsSubmitting(false);

      if (res.success) {
        handleAuthSuccess(res.user);
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('Please provide both email and password.');
        return;
      }

      setIsSubmitting(true);
      const res = await login(email, password);
      setIsSubmitting(false);

      if (res.success) {
        handleAuthSuccess(res.user);
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsGoogleSubmitting(true);
    const res = await loginWithGoogle();
    setIsGoogleSubmitting(false);

    if (res.success) {
      handleAuthSuccess(res.user);
    } else {
      setErrorMessage(res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window: Stable, compact, fits any viewport cleanly */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-[420px] bg-[#FFFDF9] rounded-3xl shadow-2xl border border-amber-200/90 overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Ornate festive top banner */}
          <div className="bg-gradient-to-r from-red-800 via-rose-700 to-amber-700 py-4 px-6 text-white text-center relative shrink-0">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Festive Crest Icon */}
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner mb-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>

            <h3 className="font-festive text-xl font-bold tracking-wide">
              {customTitle || (mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password')}
            </h3>
            <p className="text-xs text-amber-100/90 mt-0.5 max-w-xs mx-auto">
              {customSubtitle || (mode === 'login' 
                ? 'Sign in to access your festival passes and bookings' 
                : mode === 'signup' 
                ? 'Register to book passes and view your tickets anytime' 
                : 'Enter your registered email for password recovery')}
            </p>
          </div>

          {/* Form Tabs (Login vs Signup) - perfectly balanced 50% / 50% */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-amber-200/60 bg-amber-50/40 shrink-0">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`w-1/2 py-2.5 text-xs sm:text-sm font-bold transition-all relative focus:outline-none ${
                  mode === 'login' 
                    ? 'text-royal-crimson bg-[#FFFDF9]' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sign In
                {mode === 'login' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-crimson" />
                )}
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`w-1/2 py-2.5 text-xs sm:text-sm font-bold transition-all relative focus:outline-none ${
                  mode === 'signup' 
                    ? 'text-royal-crimson bg-[#FFFDF9]' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Create Account
                {mode === 'signup' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-crimson" />
                )}
              </button>
            </div>
          )}

          {/* Body / Form Content: Scrollable if small screen, compact inputs */}
          <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
            
            {/* Feedback notifications */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-snug">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-snug">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            {mode !== 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="w-full py-2 px-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-60 focus:outline-none"
                >
                  {isGoogleSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-1.5">
                  <div className="border-t border-stone-200 w-full" />
                  <span className="bg-[#FFFDF9] px-2.5 text-[10px] uppercase font-semibold text-stone-400">or continue with email</span>
                </div>
              </>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Full Name (for Signup) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-300"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-300"
                  />
                </div>
              </div>

              {/* Password field */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                      Password <span className="text-red-500">*</span>
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[11px] font-semibold text-royal-crimson hover:underline focus:outline-none"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (for Signup) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-300"
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleSubmitting}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 mt-1 focus:outline-none text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' ? 'Sign In to Account' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom alternate links */}
            <div className="text-center pt-1">
              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-semibold text-royal-crimson hover:underline focus:outline-none"
                >
                  ← Back to Sign In
                </button>
              ) : mode === 'login' ? (
                <p className="text-xs text-stone-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-royal-crimson hover:underline focus:outline-none"
                  >
                    Sign up now
                  </button>
                </p>
              ) : (
                <p className="text-xs text-stone-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-royal-crimson hover:underline focus:outline-none"
                  >
                    Sign in here
                  </button>
                </p>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
