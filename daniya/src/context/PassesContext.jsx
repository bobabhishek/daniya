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

  // Authoritative fetch from backend: runs once per authenticated user session
  const fetchPasses = useCallback(async (forceFresh = false) => {
    if (!user) {
      setPasses([]);
      loadedUidRef.current = null;
      setLoading(false);
      return [];
    }

    if (!forceFresh && loadedUidRef.current === user.uid) {
      return passes;
    }

    setLoading(true);
    setError(null);
    try {
      const [records, tickets] = await Promise.all([
        api.getMyRegistrations(),
        api.getMyTickets(),
      ]);

      const merged = mergeRegistrationsWithTickets(
        Array.isArray(records) ? records : [],
        Array.isArray(tickets) ? tickets : []
      );

      setPasses(merged);
      loadedUidRef.current = user.uid;
      return merged;
    } catch (err) {
      console.warn('Failed to load user passes from server:', err);
      setError(err.message || 'Could not retrieve tickets from server.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sync with auth changes: clear immediately on logout, fetch once on login
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
  }, [user, authLoading, isAuthenticated, fetchPasses]);

  // Explicitly clear passes on logout
  const clearPasses = useCallback(() => {
    setPasses([]);
    loadedUidRef.current = null;
    setError(null);
    setLoading(false);
  }, []);

  // Append freshly verified registration immediately so My Passes shows it with zero latency
  const addVerifiedRegistration = useCallback((newRegistration) => {
    if (!newRegistration) return;
    setPasses((prev) => {
      const exists = prev.some((r) => r.registrationId === newRegistration.registrationId);
      if (exists) {
        return prev.map((r) =>
          r.registrationId === newRegistration.registrationId ? { ...r, ...newRegistration } : r
        );
      }
      return [newRegistration, ...prev];
    });
  }, []);

  const refreshPasses = useCallback(() => fetchPasses(true), [fetchPasses]);

  const value = Object.freeze({
    passes,
    loading,
    error,
    refreshPasses,
    clearPasses,
    addVerifiedRegistration
  });

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
