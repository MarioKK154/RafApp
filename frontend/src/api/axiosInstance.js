// frontend/src/api/axiosInstance.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const AUTH_LOGOUT_EVENT = 'rafapp:auth-logout';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const path = window.location.pathname || '';
      const onLogin = path === '/login' || path.startsWith('/login');
      if (!onLogin) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authRememberMe');
        window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { reason: 'session' } }));
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
