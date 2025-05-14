// frontend/src/api/axiosInstance.js
// Uncondensed and Manually Checked
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Axios Interceptor: Sending request with headers:', config.headers); // DEBUG LOG
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional response interceptor (as provided before for 401 handling)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Axios Interceptor: Unauthorized request (401). Token might be invalid or expired.");
      // Optionally, trigger a global logout event here
      // localStorage.removeItem('accessToken');
      // if (window.location.pathname !== '/login') { // Avoid redirect loop
      //    window.location.href = '/login';
      // }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;