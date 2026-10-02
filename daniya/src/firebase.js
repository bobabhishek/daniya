// Import the functions you need from the SDKs
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updateProfile,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAJhJrkjDbC5wYnqfZes3tPe5EJAc5zns",
  authDomain: "dhandiya-hawkz.firebaseapp.com",
  projectId: "dhandiya-hawkz",
  storageBucket: "dhandiya-hawkz.firebasestorage.app",
  messagingSenderId: "476479209204",
  appId: "1:476479209204:web:03a61b1caffbe200fda8a1",
  measurementId: "G-0MH1GK29YT"
};

// Initialize Firebase (guarding against multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
const auth = getAuth(app);

// Configure Auth Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Analytics conditionally (safeguards SSR, private browsing, and test environments)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Graceful fallback if analytics cannot initialize
  });
}

export { 
  app, 
  auth, 
  googleProvider, 
  analytics,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  onAuthStateChanged
};

export default app;
