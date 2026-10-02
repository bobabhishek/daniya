import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { isAdminUser, getUserRole } from '../utils/authRoles';

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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase Auth state change on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error("Firebase auth state error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up with Email and Password
  const signup = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && displayName.trim()) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
        // Force refresh user object in state
        setUser({ ...userCredential.user, displayName: displayName.trim() });
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign in with Email and Password
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign in / Sign up with Google Popup
  const loginWithGoogle = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: 'Password reset link sent to your email.' };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error, message: formatAuthError(error) };
    }
  };

  const isAdmin = isAdminUser(user);
  const role = getUserRole(user);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    role,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    logout
  };

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
