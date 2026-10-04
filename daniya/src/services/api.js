import { auth } from '../firebase';
import { API_BASE_URL } from '../config/apiConfig.js';

/** Public frontend URL for pass/receipt links (production: set VITE_PUBLIC_APP_URL or VITE_PUBLIC_TICKET_BASE_URL). */
export function getPublicAppUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_PUBLIC_TICKET_BASE_URL;
  if (configured && String(configured).trim()) {
    return String(configured).trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

/**
 * Wait for Firebase Auth to finish restoring session on refresh/init.
 */
async function waitForAuthInit() {
  if (auth && typeof auth.authStateReady === 'function') {
    try {
      await auth.authStateReady();
    } catch (e) {
      // Gracefully continue
    }
  }
}

/**
 * Retrieve current Firebase user ID token for API authorization.
 */
async function getAuthToken() {
  if (!auth) return null;
  if (!auth.currentUser) {
    await waitForAuthInit();
  }
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) return token;
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token:', e);
    }
  }
  return null;
}

/**
 * Standard HTTP Request Wrapper with Firebase Bearer Auth.
 */
async function request(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  console.log(`%c[API 🚀] ${method} ${endpoint}`, 'color: #3b82f6; font-weight: bold;');

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errDetail = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        errDetail = errorJson.detail || errorJson.message || errDetail;
      } catch {
        // use status text
      }
      console.error(`%c[API 🔴 ${res.status}] ${method} ${endpoint}: ${errDetail}`, 'color: #ef4444; font-weight: bold;');
      const error = new Error(errDetail);
      error.status = res.status;
      throw error;
    }

    const data = await res.json();
    console.log(`%c[API 🟢 ${res.status}] ${method} ${endpoint}`, 'color: #10b981; font-weight: bold;', data);
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Health & Server Session
  checkHealth: () => request('/health'),
  verifyUserRole: () => request('/api/auth/verify-role'),
  getSessionInfo: () => request('/api/auth/session'),

  // Registrations (Step 1 -> Creates master pending record with backend expectedAmount)
  createRegistration: async (participants, paymentMethod = 'UPI (Official QR)') => {
    return await request('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({
        participants: participants.map(p => ({
          name: p.name.trim(),
          dob: p.dob,
          age: parseInt(p.age, 10) || undefined,
          idProofType: p.idProofType || 'Aadhaar Card (with DOB)'
        })),
        paymentMethod
      })
    });
  },

  getRegistration: (id) => request(`/api/registrations/${id}`),

  // Step 3 Authoritative Payment Proof Verification (Three-Way Amount Comparison)
  verifyPaymentProof: async (registrationId, enteredAmount, file) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('registration_id', registrationId);
    formData.append('entered_amount', parseInt(enteredAmount, 10));
    formData.append('receipt', file);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    const url = `${API_BASE_URL}/api/payments/verify-proof`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const errorJson = await res.json();
          errDetail = errorJson.detail || errorJson.message || errDetail;
        } catch {}
        const error = new Error(errDetail);
        error.status = res.status;
        throw error;
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Verification is taking longer than expected. Please try again.');
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      throw err;
    }
  },

  // Legacy fallback
  verifyPayment: async (registrationId, transactionRef = '', paymentMethod = 'UPI (Official QR)') => {
    return await request('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        registrationId,
        transactionRef,
        paymentMethod
      })
    });
  },

  // User tickets & registrations
  getMyRegistrations: async () => {
    const token = await getAuthToken();
    if (!token) return [];
    return await request('/api/my/registrations');
  },
  getMyTickets: async () => {
    const token = await getAuthToken();
    if (!token) return [];
    return await request('/api/my/tickets');
  },

  // Admin Dashboard
  getAdminStats: () => request('/api/admin/stats'),
  getAdminRegistrations: (paymentStatus = 'ALL', search = '') => {
    const params = new URLSearchParams();
    if (paymentStatus && paymentStatus !== 'ALL') params.append('payment_status', paymentStatus);
    if (search && search.trim()) params.append('search', search.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/admin/registrations${query}`);
  },
  getAdminRegistration: (id) => request(`/api/admin/registrations/${id}`),
  getAdminTickets: () => request('/api/admin/tickets'),
  getAdminTicket: (id) => request(`/api/admin/tickets/${id}`),

  // Admin Receipt URL builder
  getAdminReceiptUrl: (registrationId) => `${API_BASE_URL}/api/admin/registrations/${registrationId}/receipt`,

  // Admin Receipt Blob fetcher with Bearer Auth
  fetchAdminReceiptBlob: async (registrationId) => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/admin/registrations/${registrationId}/receipt`, {
      headers
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        detail = errJson.detail || detail;
      } catch {
        // ignore
      }
      if (res.status === 404) {
        throw new Error('Receipt unavailable');
      }
      throw new Error(detail || `Receipt fetch failed (${res.status})`);
    }
    return await res.blob();
  },

  // Download Master Excel (.xlsx) containing embedded screenshot images
  downloadMasterExcel: async () => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/admin/export-excel`, {
      headers
    });
    if (!res.ok) {
      throw new Error(`Master Excel export failed: ${res.statusText}`);
    }
    return await res.blob();
  }
};

export default api;
