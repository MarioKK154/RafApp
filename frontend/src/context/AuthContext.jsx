// frontend/src/context/AuthContext.jsx
// Uncondensed and Manually Checked - Latest Version with Debug Logs
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; // Use our configured instance
import { toast } from 'react-toastify'; // For logout toast

const AuthContext = createContext(null);
console.log("AuthContext.jsx: Context created at module level");

export const AuthProvider = ({ children }) => {
  console.log("AuthProvider: Component rendering or re-rendering");

  // Initialize state from localStorage only once
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('accessToken');
    console.log("AuthProvider initial useState for token, from localStorage:", storedToken ? "Token found" : "No token");
    return storedToken;
  });
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const hasToken = !!localStorage.getItem('accessToken');
    console.log("AuthProvider initial useState for isAuthenticated:", hasToken);
    return hasToken;
  });
  // isLoading will be true until the initial user fetch attempt is complete
  const [isLoading, setIsLoading] = useState(true);


  const fetchUser = useCallback(async (currentToken) => {
    console.log('AuthContext: fetchUser CALLED with token:', currentToken ? "Exists" : "NULL");
    if (!currentToken) {
        console.log('AuthContext: fetchUser - no token provided, clearing auth state.');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false); // Stop loading if no token
        localStorage.removeItem('accessToken'); // Ensure it's cleared
        return;
    }

    // Don't reset isLoading to true here if it's part of an ongoing process
    // The initial isLoading(true) should cover the first fetch.
    // Subsequent calls might happen if token changes.

    try {
      console.log('AuthContext: fetchUser - attempting to GET /users/me');
      const response = await axiosInstance.get('/users/me'); // Interceptor adds the currentToken implicitly
      console.log('AuthContext: fetchUser - SUCCESS, user data:', response.data);
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('AuthContext: fetchUser - ERROR:', error.response?.status, error.response?.data?.detail || error.message);
      // Clear auth state if fetching user fails (e.g., token invalid)
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('accessToken');
      // Do not toast here; let components handle UI feedback if needed on load.
    } finally {
      console.log('AuthContext: fetchUser - finally block, setting isLoading to false.');
      setIsLoading(false);
    }
  }, []); // fetchUser itself has no dependencies on component state

  // Effect to run on initial mount to check existing token or when token changes
  useEffect(() => {
    console.log("AuthProvider: Initial useEffect for token check. Token from state:", token ? "Exists" : "NULL");
    if (token) {
      // If token exists (from localStorage initially, or set by login), fetch user
      fetchUser(token);
    } else {
      // No token, so not authenticated, and no user to fetch. Stop loading.
      console.log("AuthProvider: Initial useEffect - no token, ensuring isLoading is false.");
      setIsLoading(false);
      setIsAuthenticated(false); // Ensure this is explicitly false
      setUser(null); // Ensure user is null
    }
  }, [token, fetchUser]); // Re-run if token changes or fetchUser (callback ref) changes


  const login = useCallback(async (newToken) => {
    console.log('AuthContext: login function CALLED with newToken:', newToken ? "Exists" : "NULL");
    if (newToken) {
        localStorage.setItem('accessToken', newToken);
        setIsLoading(true); // Indicate loading while we fetch the user
        setToken(newToken); // This will trigger the useEffect above to call fetchUser
    } else {
        console.error("AuthContext: login function called with no token!");
        // Handle case where login is called without a token (should not happen)
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
    }
  }, []); // login itself doesn't depend on other stateful items from context

  const logout = useCallback(() => {
    console.log('AuthContext: logout function CALLED.');
    localStorage.removeItem('accessToken');
    setToken(null); // This will trigger useEffect, which will call fetchUser(null)
    setUser(null);  // Also explicitly set user and isAuthenticated for immediate UI update
    setIsAuthenticated(false);
    // Do not navigate here; let components or Navbar handle navigation
    toast.info("You have been logged out.");
  }, []);

  const value = { token, user, isAuthenticated, isLoading, login, logout };
  console.log("AuthProvider: Providing context value:", { token: !!value.token, user: !!value.user, isAuthenticated: value.isAuthenticated, isLoading: value.isLoading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};