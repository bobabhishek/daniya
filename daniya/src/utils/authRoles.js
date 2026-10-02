/**
 * Authentication Roles & Authorization Helpers
 *
 * Current Frontend Demo Rule:
 * - teamredhawkz@gmail.com => ADMIN / ORGANIZER
 * - Any other authenticated email => NORMAL USER
 * - Unauthenticated => GUEST
 *
 * NOTE: This is structured modularly so it can be swapped seamlessly with
 * backend/Firebase custom claims (e.g. decodedToken.admin === true) or
 * Firestore role documents in the future.
 */

export const ADMIN_EMAIL = 'teamredhawkz@gmail.com';

/**
 * Check if the given Firebase user has Admin / Organizer privileges.
 * @param {import('firebase/auth').User | null} user
 * @returns {boolean}
 */
export function isAdminUser(user) {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get the standardized role string for the current user.
 * @param {import('firebase/auth').User | null} user
 * @returns {'ADMIN' | 'USER' | 'GUEST'}
 */
export function getUserRole(user) {
  if (!user) return 'GUEST';
  return isAdminUser(user) ? 'ADMIN' : 'USER';
}
