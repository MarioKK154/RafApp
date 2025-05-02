// frontend/src/api/axiosInstance.js
import axios from 'axios';

// Define the base URL for your backend API
const API_BASE_URL = 'http://localhost:8000'; // Adjust if your backend runs elsewhere

// Create a new Axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the token from localStorage (or your state management) before each request
    const token = localStorage.getItem('accessToken');

    // If a token exists, add the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Important: return the config object so the request can proceed
    return config;
  },
  (error) => {
    // Handle request error here
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor (e.g., for global error handling)
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    // Example: Handle 401 Unauthorized globally (e.g., force logout)
    if (error.response && error.response.status === 401) {
        console.error("Unauthorized request - logging out user potentially.");
        // Here you might trigger a logout action from your AuthContext
        // Be careful with direct context usage here, maybe use events or check on component level
        localStorage.removeItem('accessToken'); // Basic logout action
        // window.location.href = '/login'; // Force redirect - might be disruptive
    }
    return Promise.reject(error);
  }
);


export default axiosInstance;