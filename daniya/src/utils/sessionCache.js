import { clearAllStoredPasses } from './passCache.js';

export const SESSION_CACHE_KEY = 'daniya_auth_session';
export const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

export function isSessionExpired(session) {
  if (!session) return true;
  const lastActiveAt = Number(session.lastActiveAt || Date.now());
  return Date.now() - lastActiveAt > SESSION_TIMEOUT_MS;
}

export function getCachedSession() {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && (parsed.email || parsed.displayName)) {
      if (isSessionExpired(parsed)) {
        window.localStorage.removeItem(SESSION_CACHE_KEY);
        clearAllStoredPasses();
        return null;
      }
      return parsed;
    }
  } catch (error) {
    // ignore corrupted cache
  }

  return null;
}

export function setCachedSession(session) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (session) {
      window.localStorage.setItem(
        SESSION_CACHE_KEY,
        JSON.stringify({
          ...session,
          lastActiveAt: Date.now()
        })
      );
      return;
    }

    window.localStorage.removeItem(SESSION_CACHE_KEY);
    clearAllStoredPasses();
  } catch (error) {
    // ignore storage quota issues
  }
}
