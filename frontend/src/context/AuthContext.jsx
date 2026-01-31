import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetches the current user profile from the backend.
     * This will now include 'is_superuser' and 'tenant_id' thanks to our backend updates.
     */
    const fetchUser = useCallback(async (currentToken) => {
        if (!currentToken) {
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            localStorage.removeItem('accessToken');
            return;
        }

        try {
            // This endpoint hits our updated User schema in the backend
            const response = await axiosInstance.get('/users/me');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            console.error("Authentication error:", error);
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('accessToken');
            // We only show a toast if there was a token but it's now invalid
            if (currentToken) {
                toast.error("Session expired. Please log in again.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect to validate token on mount or token change
    useEffect(() => {
        if (token) {
            fetchUser(token);
        } else {
            setIsLoading(false);
        }
    }, [token, fetchUser]);

    /**
     * Handles the login process by storing the token and initiating a user fetch.
     */
    const login = useCallback(async (newToken) => {
        if (newToken) {
            localStorage.setItem('accessToken', newToken);
            setIsLoading(true);
            setToken(newToken);
            // fetchUser will be triggered by the useEffect above
        } else {
            localStorage.removeItem('accessToken');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, []);

    /**
     * Clears all auth state and local storage.
     */
    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        toast.info("You have been logged out.");
    }, []);

    /**
     * Useful for updating the current user's state (e.g., after changing profile settings)
     * without requiring a full re-fetch.
     */
    const updateUser = useCallback((updatedUserData) => {
        setUser(prevUser => (prevUser ? { ...prevUser, ...updatedUserData } : updatedUserData));
    }, []);

    const value = { 
        token, 
        user, 
        isAuthenticated, 
        isLoading, 
        login, 
        logout, 
        updateUser 
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};