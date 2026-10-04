import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { mergeRegistrationsWithTickets } from '../utils/mergePassRecords';

const PassesContext = createContext(null);

export function PassesProvider({ children }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedUidRef = useRef(null);
  const inFlightFetchRef = useRef(null);

  // Authoritative fetch from backend with in-flight deduplication
  const fetchPasses = useCallback(async (forceFresh = false) => {
    if (!user?.uid) {
      setPasses([]);
      loadedUidRef.current = null;
      setLoading(false);
      return [];
    }

    if (!forceFresh && loadedUidRef.current === user.uid) {
      return null;
    }

    // Return existing in-flight promise if one is already running to avoid duplicate requests
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

        setPasses((prev) => {
          const serverMap = new Map(merged.map((r) => [r.registrationId, r]));
          const combined = [...merged];
          // Preserve any locally verified registrations not yet indexed by server
          for (const existing of prev) {
            if (existing && !serverMap.has(existing.registrationId)) {
              combined.unshift(existing);
            }
          }
          return combined;
        });

        loadedUidRef.current = user.uid;
        return merged;
      } catch (err) {
        console.warn('Failed to load user passes from server:', err);
        setError(err.message || 'Could not retrieve tickets from server.');
        return [];
      } finally {
        setLoading(false);
        inFlightFetchRef.current = null;
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  }, [user?.uid]);

  // Sync with auth changes: clear on logout, fetch once when user UID changes
  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAuthenticated) {
      setPasses([]);
      loadedUidRef.current = null;
      setLoading(false);
      setError(null);
    } else if (loadedUidRef.current !== user.uid) {
      fetchPasses(true);
    }
  }, [user?.uid, authLoading, isAuthenticated, fetchPasses]);

  // Explicitly clear passes on logout
  const clearPasses = useCallback(() => {
    setPasses([]);
    loadedUidRef.current = null;
    inFlightFetchRef.current = null;
    setError(null);
    setLoading(false);
  }, []);

  // Append freshly verified registration immediately so My Passes shows it with zero latency
  const addVerifiedRegistration = useCallback((newRegistration) => {
    if (!newRegistration) return;
    const normalized = mergeRegistrationsWithTickets([newRegistration], [])[0] || newRegistration;
    if (user?.uid) {
      loadedUidRef.current = user.uid;
    }
    setPasses((prev) => {
      const exists = prev.some((r) => r.registrationId === normalized.registrationId);
      if (exists) {
        return prev.map((r) =>
          r.registrationId === normalized.registrationId ? { ...r, ...normalized } : r
        );
      }
      return [normalized, ...prev];
    });
  }, [user?.uid]);

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
