/**
 * Authentication Roles & Authorization Helpers
 *
 * Security Design:
 * - ADMIN_EMAIL is strictly frozen and checked.
 * - Client roles are verified authoritatively against the FastAPI backend
 *   via `/api/auth/verify-role` using cryptographic Firebase ID tokens.
 * - Any client-side DOM or local variable manipulation in DevTools/Inspect
 *   cannot bypass backend token verification or access protected endpoints.
 */

export const ADMIN_EMAIL = Object.freeze('teamredhawkz@gmail.com');
import { API_BASE_URL } from '../config/apiConfig.js';

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  ATTENDEE: 'ATTENDEE',
  USER: 'ATTENDEE',
  GUEST: 'GUEST'
});

/**
 * Check if the given Firebase user object has Admin privileges on client.
 * NOTE: All admin actions are re-verified by the backend using cryptographic JWTs.
 * @param {import('firebase/auth').User | null} user
 * @returns {boolean}
 */
export function isAdminUser(user) {
  if (!user || typeof user !== 'object') return false;
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return false;
  return email === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get standardized role string for user.
 * @param {import('firebase/auth').User | null} user
 * @returns {'ADMIN' | 'ATTENDEE' | 'GUEST'}
 */
export function getUserRole(user) {
  if (!user) return ROLES.GUEST;
  return isAdminUser(user) ? ROLES.ADMIN : ROLES.ATTENDEE;
}

const roleCache = new Map();

/**
 * Clear cached role determinations on logout.
 */
export function clearRoleCache() {
  roleCache.clear();
}

/**
 * Verify role authoritatively with backend.
 * Returns the server's signed role determination with in-memory session caching.
 * @param {string} token
 * @returns {Promise<{ authenticated: boolean, role: string, isAdmin: boolean }>}
 */
export async function verifyServerRole(token) {
  if (!token) {
    return {
      authenticated: false,
      role: ROLES.GUEST,
      isAdmin: false
    };
  }

  // Cache by token slice to avoid repeated HTTP calls on re-renders / navigation
  const cacheKey = token.slice(-32);
  if (roleCache.has(cacheKey)) {
    return roleCache.get(cacheKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-role`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (!res.ok) {
      const failed = {
        authenticated: false,
        role: ROLES.GUEST,
        isAdmin: false,
        error: `Server rejected verification: ${res.status}`
      };
      return failed;
    }

    const data = await res.json();
    const result = {
      authenticated: Boolean(data.authenticated),
      role: data.role === 'ADMIN' ? ROLES.ADMIN : ROLES.ATTENDEE,
      isAdmin: Boolean(data.isAdmin),
      email: data.email,
      uid: data.uid
    };
    roleCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Role verification network issue or timeout, using client fallback:', err);
    return {
      authenticated: false,
      role: ROLES.GUEST,
      isAdmin: false,
      error: err.message
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
