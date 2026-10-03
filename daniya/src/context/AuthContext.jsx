import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  onAuthStateChanged
} from '../firebase';
import { isAdminUser, getUserRole, verifyServerRole, clearRoleCache, ROLES } from '../utils/authRoles';
import { useToast } from './ToastContext';

// Helper to format Firebase errors into friendly messages
export function formatAuthError(error) {
  if (!error) return '';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please check your Firebase console settings.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact event organizers.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your spelling or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later or reset your password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    default:
      return error.message || 'An unexpected authentication error occurred. Please try again.';
  }
}

export const AUTH_STATUS = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ERROR: 'ERROR'
});

export const ROLE_STATUS = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  RESOLVED: 'RESOLVED',
  ERROR: 'ERROR'
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.INITIALIZING);
  const [role, setRole] = useState(ROLES.GUEST);
  const [roleStatus, setRoleStatus] = useState(ROLE_STATUS.INITIALIZING);
  const [isServerVerified, setIsServerVerified] = useState(false);
  const { showToast } = useToast();

  const sessionGenRef = useRef(0);
  const cachedUidRef = useRef(null);

  // Authoritatively resolve user and role ONCE per session
  const resolveSession = useCallback(async (currentUser, currentGen) => {
    if (!currentUser) {
      if (sessionGenRef.current === currentGen) {
        setUser(null);
        setRole(ROLES.GUEST);
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
        setRoleStatus(ROLE_STATUS.RESOLVED);
        setIsServerVerified(false);
        cachedUidRef.current = null;
      }
      return;
    }

    // If session UID is already verified and cached in memory, do not re-verify
    if (cachedUidRef.current === currentUser.uid && sessionGenRef.current === currentGen) {
      setUser(currentUser);
      setAuthStatus(AUTH_STATUS.AUTHENTICATED);
      setRoleStatus(ROLE_STATUS.RESOLVED);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      if (sessionGenRef.current !== currentGen) return;

      if (token) {
        const verified = await verifyServerRole(token);
        if (sessionGenRef.current === currentGen) {
          const isKnownAdmin = isAdminUser(currentUser);
          const resolvedRole = (verified && verified.role === ROLES.ADMIN) || isKnownAdmin ? ROLES.ADMIN : ROLES.ATTENDEE;
          setUser(currentUser);
          setRole(resolvedRole);
          setAuthStatus(AUTH_STATUS.AUTHENTICATED);
          setRoleStatus(ROLE_STATUS.RESOLVED);
          setIsServerVerified(Boolean(verified.authenticated) || isKnownAdmin);
          cachedUidRef.current = currentUser.uid;
          return;
        }
      }
    } catch (err) {
      console.warn("Server role verification issue:", err);
    }

    // Fallback if network unreachable or slow: accurately check if admin
    if (sessionGenRef.current === currentGen) {
      const isKnownAdmin = isAdminUser(currentUser);
      setUser(currentUser);
      setRole(isKnownAdmin ? ROLES.ADMIN : ROLES.ATTENDEE);
      setAuthStatus(AUTH_STATUS.AUTHENTICATED);
      setRoleStatus(ROLE_STATUS.RESOLVED);
      setIsServerVerified(isKnownAdmin);
      cachedUidRef.current = currentUser.uid;
    }
  }, []);

  // Initialize Firebase Auth subscription ONCE on mount
  useEffect(() => {
    sessionGenRef.current += 1;
    const currentGen = sessionGenRef.current;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      await resolveSession(currentUser, currentGen);
    }, (error) => {
      console.error("Firebase auth state error:", error);
      setAuthStatus(AUTH_STATUS.ERROR);
      setRoleStatus(ROLE_STATUS.ERROR);
    });

    return () => unsubscribe();
  }, [resolveSession]);

  // Sign up with Email and Password
  const signup = async (email, password, displayName) => {
    try {
      sessionGenRef.current += 1;
      const currentGen = sessionGenRef.current;
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && displayName.trim()) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        userCredential.user.displayName = displayName.trim();
      }
      
      await resolveSession(userCredential.user, currentGen);

      showToast({
        title: 'Account Created! ✨',
        message: `Welcome ${displayName || 'Attendee'}! Your passes will be saved to your account.`,
        type: 'success'
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign in with Email and Password
  const login = async (email, password) => {
    try {
      sessionGenRef.current += 1;
      const currentGen = sessionGenRef.current;
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      await resolveSession(userCredential.user, currentGen);

      const isOrganizer = userCredential.user.email?.toLowerCase() === 'teamredhawkz@gmail.com';
      showToast({
        title: isOrganizer ? 'Organizer Logged In 👑' : 'Welcome Back! 🎉',
        message: isOrganizer 
          ? 'Organizer credentials authenticated. Administrative dashboard ready.'
          : `Namaste, ${userCredential.user.displayName || userCredential.user.email.split('@')[0]}! Ready for Dandiya?`,
        type: isOrganizer ? 'security' : 'success'
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign in / Sign up with Google Popup
  const loginWithGoogle = async () => {
    try {
      sessionGenRef.current += 1;
      const currentGen = sessionGenRef.current;
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      await resolveSession(userCredential.user, currentGen);

      const isOrganizer = userCredential.user.email?.toLowerCase() === 'teamredhawkz@gmail.com';
      showToast({
        title: isOrganizer ? 'Organizer Verified 👑' : 'Google Sign-In Successful 🎉',
        message: `Welcome ${userCredential.user.displayName || 'to Dandiya 2026'}!`,
        type: isOrganizer ? 'security' : 'success'
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast({
        title: 'Reset Link Sent 📬',
        message: 'Please check your email inbox to reset your password.',
        type: 'info'
      });
      return { success: true, message: 'Password reset link sent to your email.' };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign out — complete invalidation of user, role, and cached credentials
  const logout = async () => {
    try {
      sessionGenRef.current += 1;
      cachedUidRef.current = null;
      clearRoleCache();
      
      const prevName = user?.displayName || user?.email?.split('@')[0] || 'Attendee';
      await firebaseSignOut(auth);

      setUser(null);
      setRole(ROLES.GUEST);
      setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
      setRoleStatus(ROLE_STATUS.RESOLVED);
      setIsServerVerified(false);

      showToast({
        title: 'Signed Out Successfully 👋',
        message: `Goodbye ${prevName}. See you on the Dandiya dance floor!`,
        type: 'info'
      });

      return { success: true };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  const isAdmin = role === ROLES.ADMIN;
  const isAttendee = role === ROLES.ATTENDEE;
  const isGuest = role === ROLES.GUEST;
  const isAuthenticated = authStatus === AUTH_STATUS.AUTHENTICATED;
  const loading = authStatus === AUTH_STATUS.INITIALIZING || roleStatus === ROLE_STATUS.INITIALIZING;

  const value = Object.freeze({
    user,
    authStatus,
    role,
    roleStatus,
    isAdmin,
    isAttendee,
    isGuest,
    isAuthenticated,
    loading,
    isServerVerified,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
    refreshSession: () => resolveSession(user, sessionGenRef.current)
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
