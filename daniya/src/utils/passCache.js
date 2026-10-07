export const PASSES_STORAGE_PREFIX = 'daniya_attendee_passes_';

export function getStoredPasses(uid, email) {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const keys = [];
    if (uid) keys.push(`${PASSES_STORAGE_PREFIX}${uid}`);
    if (email) keys.push(`${PASSES_STORAGE_PREFIX}${email.trim().toLowerCase()}`);

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Error reading stored passes from localStorage:', error);
  }

  return [];
}

export function saveStoredPasses(uid, email, passesList) {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(passesList)) return;

  try {
    const serialized = JSON.stringify(passesList);
    if (uid) window.localStorage.setItem(`${PASSES_STORAGE_PREFIX}${uid}`, serialized);
    if (email) window.localStorage.setItem(`${PASSES_STORAGE_PREFIX}${email.trim().toLowerCase()}`, serialized);
  } catch (error) {
    console.warn('Error persisting passes to localStorage:', error);
  }
}

export function clearStoredPasses(uid, email) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keys = new Set();
    if (uid) keys.add(`${PASSES_STORAGE_PREFIX}${uid}`);
    if (email) keys.add(`${PASSES_STORAGE_PREFIX}${email.trim().toLowerCase()}`);

    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('Error clearing stored passes from localStorage:', error);
  }
}

export function clearAllStoredPasses() {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(PASSES_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Error clearing all stored passes from localStorage:', error);
  }
}
