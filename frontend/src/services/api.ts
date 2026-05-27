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
      // Redirect to login on 401 (expired/invalid token)
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Use a custom event to notify AuthContext
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      if (error.response?.data) {
        const data = error.response.data as { error?: string; message?: string };
        const message = data.error || data.message || error.message;
        return Promise.reject(new Error(message));
      }
    }
    return Promise.reject(error);
  },
);

export default api;
