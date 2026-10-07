import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { mergeRegistrationsWithTickets } from '../utils/mergePassRecords';
import { getStoredPasses, saveStoredPasses, clearStoredPasses } from '../utils/passCache';

const PassesContext = createContext(null);

export function PassesProvider({ children }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [passes, setPasses] = useState(() => getStoredPasses(user?.uid, user?.email));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedUidRef = useRef(null);
  const inFlightFetchRef = useRef(null);

  // Authoritative fetch from backend with in-flight deduplication and local persistence
  const fetchPasses = useCallback(async (forceFresh = false) => {
    if (!user) {
      setPasses([]);
      loadedUidRef.current = null;
      setLoading(false);
      return [];
    }

    if (!forceFresh && loadedUidRef.current === (user.uid || user.email)) {
      return null;
    }

    // Return existing in-flight promise if one is already running
    if (inFlightFetchRef.current) {
      return inFlightFetchRef.current;
    }

    setLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      try {
        const [records, tickets] = await Promise.all([
          api.getMyRegistrations(),
          api.getMyTickets(),
        ]);

        const merged = mergeRegistrationsWithTickets(
          Array.isArray(records) ? records : [],
          Array.isArray(tickets) ? tickets : []
        );

        if (merged.length === 0) {
          clearStoredPasses(user.uid, user.email);
          setPasses([]);
          loadedUidRef.current = user.uid || user.email;
          return [];
        }

        setPasses((prev) => {
          const combinedMap = new Map();

          merged.forEach((r) => combinedMap.set(r.registrationId, r));

          prev.forEach((r) => {
            if (!combinedMap.has(r.registrationId)) {
              combinedMap.set(r.registrationId, r);
            }
          });

          const finalPasses = Array.from(combinedMap.values());
          saveStoredPasses(user.uid, user.email, finalPasses);
          return finalPasses;
        });

        loadedUidRef.current = user.uid || user.email;
        return merged;
      } catch (err) {
        console.warn('Failed to load user passes from server:', err);
        const cached = getStoredPasses(user?.uid, user?.email);
        if (cached.length > 0) {
          setPasses(cached);
        } else {
          setError(err.message || 'Could not retrieve tickets from server.');
        }
        return cached;
      } finally {
        setLoading(false);
        inFlightFetchRef.current = null;
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  }, [user?.uid, user?.email]);

  // Sync with auth changes: hydrate from cache immediately, then fetch
  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAuthenticated) {
      setPasses([]);
      loadedUidRef.current = null;
      setLoading(false);
      setError(null);
    } else {
      // Instant cache hydration
      const cached = getStoredPasses(user.uid, user.email);
      if (cached.length > 0) {
        setPasses((prev) => (prev.length === 0 ? cached : prev));
      }
      if (loadedUidRef.current !== (user.uid || user.email)) {
        fetchPasses(true);
      }
    }
  }, [user?.uid, user?.email, authLoading, isAuthenticated, fetchPasses]);

  // Clear passes on logout
  const clearPasses = useCallback(() => {
    setPasses([]);
    loadedUidRef.current = null;
    inFlightFetchRef.current = null;
    setError(null);
    setLoading(false);
  }, []);

  // Append freshly verified registration immediately and persist to local storage
  const addVerifiedRegistration = useCallback((newRegistration) => {
    if (!newRegistration) return;
    const normalized = mergeRegistrationsWithTickets([newRegistration], [])[0] || newRegistration;
    if (user?.uid || user?.email) {
      loadedUidRef.current = user.uid || user.email;
    }
    setPasses((prev) => {
      const exists = prev.some((r) => r.registrationId === normalized.registrationId);
      const updated = exists
        ? prev.map((r) => (r.registrationId === normalized.registrationId ? { ...r, ...normalized } : r))
        : [normalized, ...prev];
      saveStoredPasses(user?.uid, user?.email, updated);
      return updated;
    });
  }, [user?.uid, user?.email]);

  const refreshPasses = useCallback(() => fetchPasses(true), [fetchPasses]);

  const value = React.useMemo(() => ({
    passes,
    loading,
    error,
    refreshPasses,
    clearPasses,
    addVerifiedRegistration
  }), [passes, loading, error, refreshPasses, clearPasses, addVerifiedRegistration]);

  return (
    <PassesContext.Provider value={value}>
      {children}
    </PassesContext.Provider>
  );
}

export function usePasses() {
  const context = useContext(PassesContext);
  if (!context) {
    throw new Error('usePasses must be used within a PassesProvider');
  }
  return context;
}

export default PassesContext;
