// ========================================================
// CampusHub 3.0 - Frontend API Client (services/api.js)
// Simple, clean wrapper around the Fetch API.
// Always includes credentials for session cookies.
// Works seamlessly in both local development and production.
// ========================================================

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    credentials: 'include' // Send HTTP-only session cookies
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    console.error(`API Error on ${endpoint}:`, error);
    throw new Error('Unable to connect to the server. Please verify the backend is running.');
  }
}

// --------------------------------------------------------
// Authentication Services
// --------------------------------------------------------
export const api = {
  // Auth
  getMe: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),

  // Events
  getEvents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return request(`/events${queryString ? `?${queryString}` : ''}`);
  },
  getEventById: (id) => request(`/events/${id}`),

  // Student Registrations
  registerForEvent: (eventId) => request('/registrations', { method: 'POST', body: JSON.stringify({ eventId }) }),
  getMyRegistrations: () => request('/registrations/my'),
  cancelRegistration: (id) => request(`/registrations/${id}/cancel`, { method: 'POST' }),
  getBookmarks: () => request('/bookmarks'),
  addBookmark: (eventId) => request(`/bookmarks/${eventId}`, { method: 'POST' }),
  removeBookmark: (eventId) => request(`/bookmarks/${eventId}`, { method: 'DELETE' }),
  getStudentStats: () => request('/student/stats'),

  // Admin Operations
  getAdminStats: () => request('/admin/stats'),
  getAdminRegistrations: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.event && params.event !== 'All') query.append('event', params.event);
    const queryString = query.toString();
    return request(`/admin/registrations${queryString ? `?${queryString}` : ''}`);
  },
  deleteRegistration: (id) => request(`/admin/registrations/${id}`, { method: 'DELETE' }),
  createEvent: (eventData) => request('/admin/events', { method: 'POST', body: JSON.stringify(eventData) }),
  updateEvent: (id, eventData) => request(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(eventData) }),
  deleteEvent: (id) => request(`/admin/events/${id}`, { method: 'DELETE' })
};
