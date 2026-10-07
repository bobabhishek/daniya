/**
 * Centralized API base URL resolver.
 * Safe across Vite runtime, Vite production builds, and Node test environments.
 */
export function getApiBaseUrl() {
  const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const envUrl = metaEnv.VITE_API_URL || procEnv.VITE_API_URL;

  if (envUrl && String(envUrl).trim()) {
    return String(envUrl).trim().replace(/\/$/, '');
  }
  if (metaEnv.PROD) {
    console.warn('VITE_API_URL is not set in this build. Please configure VITE_API_URL in production.');
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();
