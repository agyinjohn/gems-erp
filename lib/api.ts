import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gems_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gems_token');
      localStorage.removeItem('gems_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Public API — no auth token, no redirect — for storefront use
export const publicApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
