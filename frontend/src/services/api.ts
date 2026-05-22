import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.data) {
      const data = error.response.data as { error?: string; message?: string };
      const message = data.error || data.message || error.message;
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

export default api;
