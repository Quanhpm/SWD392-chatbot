import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data as { error?: string; message?: string } | undefined;
      const accountDeactivated = error.response?.status === 403
        && errorData?.error === 'This account has been deactivated.';
      // Clear stale client state for invalid/expired tokens and deactivated accounts.
      if (error.response?.status === 401 || accountDeactivated) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      if (error.response?.data) {
        const message = errorData?.error || errorData?.message || error.message;
        return Promise.reject(new Error(message));
      }
    }
    return Promise.reject(error);
  },
);

export default api;
