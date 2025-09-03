// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [isLoading, setIsLoading] = useState(true);

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
            const response = await axiosInstance.get('/users/me');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('accessToken');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchUser(token);
        } else {
            setIsLoading(false);
        }
    }, [token, fetchUser]);

    const login = useCallback(async (newToken) => {
        if (newToken) {
            localStorage.setItem('accessToken', newToken);
            setIsLoading(true);
            setToken(newToken);
        } else {
            localStorage.removeItem('accessToken');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        toast.info("You have been logged out.");
    }, []);

    const updateUser = useCallback((updatedUserData) => {
        setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
    }, []);

    const value = { token, user, isAuthenticated, isLoading, login, logout, updateUser };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};