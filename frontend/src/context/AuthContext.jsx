// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
// Import the configured axios instance
import axiosInstance from '../api/axiosInstance';

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user data using the token (via axiosInstance)
  const fetchUser = async (currentToken) => {
    console.log('AuthContext: fetchUser called with token:', currentToken);
    // We still check currentToken here, because the interceptor only adds
    // the header if a token exists in localStorage when the request is made.
    // If fetchUser is called right after login before the token state might
    // have fully propagated, checking here ensures we don't make the call needlessly.
    // However, the interceptor is the primary mechanism for adding the header.
    if (!currentToken) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
    }
    try {
      // Use axiosInstance - the interceptor will add the token header
      const response = await axiosInstance.get('/users/me'); // Path relative to baseURL

      console.log('AuthContext: fetchUser success, setting user:', response.data);
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('AuthContext: fetchUser error:', error);
      // The response interceptor might handle 401s globally,
      // but we still need to clear local state here.
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('accessToken'); // Ensure localStorage is cleared on fetch error too
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to run on initial load to check existing token
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      console.log('AuthContext: useEffect found token in localStorage, calling fetchUser...');
      // Set token state immediately, fetchUser will use it via localStorage or state trigger
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      console.log('AuthContext: useEffect found no token in localStorage.');
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Login function
  const login = (newToken) => {
    console.log('AuthContext: login function called, setting token, calling fetchUser...');
    localStorage.setItem('accessToken', newToken); // Set token for interceptor/persistence
    setToken(newToken); // Update state
    fetchUser(newToken); // Fetch user (interceptor will use the new token from localStorage)
  };

  // Logout function
  const logout = () => {
    console.log('AuthContext: logout function called.');
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Value provided by the context
  const value = {
    token,
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context easily in other components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};