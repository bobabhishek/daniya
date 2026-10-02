import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Retrieve current Firebase user ID token for API authorization.
 */
async function getAuthToken() {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
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
      const error = new Error(errDetail);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    // Re-throw with network context
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Registrations
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

  // Payments
  verifyPayment: async (registrationId, transactionRef = '', paymentMethod = 'UPI (Official QR)', simulateSuccess = true) => {
    return await request('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({
        registrationId,
        transactionRef,
        paymentMethod,
        simulateSuccess
      })
    });
  },

  // User tickets & registrations
  getMyRegistrations: () => request('/api/my/registrations'),
  getMyTickets: () => request('/api/my/tickets'),

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
  getAdminTicket: (id) => request(`/api/admin/tickets/${id}`)
};

export default api;
