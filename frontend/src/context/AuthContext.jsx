import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axiosInstance, { AUTH_LOGOUT_EVENT } from '../api/axiosInstance';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

const IMPERSONATION_ORIGINAL_TOKEN = 'impersonationOriginalToken';
const IMPERSONATION_LOG_ID = 'impersonationLogId';
const STORAGE_REMEMBER = 'authRememberMe';
const IDLE_NO_REMEMBER_MS = 30 * 60 * 1000;
const IDLE_REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [isLoading, setIsLoading] = useState(true);
    const lastActivityRef = useRef(Date.now());

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
            localStorage.removeItem(STORAGE_REMEMBER);
            sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN);
            sessionStorage.removeItem(IMPERSONATION_LOG_ID);
            return;
        }

        try {
            // This endpoint hits our updated User schema in the backend
            const response = await axiosInstance.get('/users/me');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            const is401 = error.response?.status === 401;
            console.error("Authentication error:", error);
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('accessToken');
            localStorage.removeItem(STORAGE_REMEMBER);
            if (currentToken && !is401) {
                toast.error("Session expired. Please log in again.");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logoutImpl = useCallback((reason) => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem(STORAGE_REMEMBER);
        sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN);
        sessionStorage.removeItem(IMPERSONATION_LOG_ID);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        if (reason === 'session') {
            toast.error('Session expired. Please log in again.', { toastId: 'session-expired' });
        } else if (reason === 'idle') {
            toast.warning('Signed out due to inactivity.', { toastId: 'idle-logout' });
        } else if (reason !== 'silent') {
            toast.info('You have been logged out.');
        }
    }, []);

    const logoutRef = useRef(logoutImpl);
    logoutRef.current = logoutImpl;

    /**
     * Clears all auth state and local storage.
     */
    const logout = useCallback((reason) => {
        logoutImpl(reason);
    }, [logoutImpl]);

    /**
     * Handles the login process by storing the token and initiating a user fetch.
     * options.rememberMe controls idle timeout behavior (paired with JWT lifetime on server).
     */
    const login = useCallback(async (newToken, options = {}) => {
        const rememberMe = Boolean(options.rememberMe);
        if (newToken) {
            localStorage.setItem('accessToken', newToken);
            localStorage.setItem(STORAGE_REMEMBER, rememberMe ? 'true' : 'false');
            lastActivityRef.current = Date.now();
            setIsLoading(true);
            setToken(newToken);
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem(STORAGE_REMEMBER);
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
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

    useEffect(() => {
        const onSessionInvalid = () => {
            logoutRef.current?.('session');
        };
        window.addEventListener(AUTH_LOGOUT_EVENT, onSessionInvalid);
        return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onSessionInvalid);
    }, []);

    /**
     * Start impersonating another user (superuser only). Stores original token for restore.
     */
    const startImpersonation = useCallback((response) => {
        const { access_token, original_token, impersonation_log_id } = response;
        if (!access_token || !original_token || impersonation_log_id == null) return;
        sessionStorage.setItem(IMPERSONATION_ORIGINAL_TOKEN, original_token);
        sessionStorage.setItem(IMPERSONATION_LOG_ID, String(impersonation_log_id));
        localStorage.setItem('accessToken', access_token);
        lastActivityRef.current = Date.now();
        setIsLoading(true);
        setToken(access_token);
        toast.info(`Now viewing as ${response.impersonated_user?.full_name || response.impersonated_user?.email}.`);
    }, []);

    /**
     * End impersonation: notify backend, restore superuser token, refetch.
     */
    const stopImpersonation = useCallback(async () => {
        const originalToken = sessionStorage.getItem(IMPERSONATION_ORIGINAL_TOKEN);
        const logId = sessionStorage.getItem(IMPERSONATION_LOG_ID);
        if (!originalToken || !logId) {
            sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN);
            sessionStorage.removeItem(IMPERSONATION_LOG_ID);
            if (originalToken) {
                localStorage.setItem('accessToken', originalToken);
                setIsLoading(true);
                setToken(originalToken);
            }
            return;
        }
        try {
            await axiosInstance.post('/admin/impersonation/end', { impersonation_log_id: parseInt(logId, 10) }, {
                headers: { Authorization: `Bearer ${originalToken}` },
            });
        } catch (err) {
            console.error('End impersonation failed:', err);
            toast.error(err.response?.data?.detail || 'Failed to end impersonation.');
        }
        sessionStorage.removeItem(IMPERSONATION_ORIGINAL_TOKEN);
        sessionStorage.removeItem(IMPERSONATION_LOG_ID);
        localStorage.setItem('accessToken', originalToken);
        lastActivityRef.current = Date.now();
        setIsLoading(true);
        setToken(originalToken);
        toast.info('Impersonation ended. Restored to your account.');
    }, []);

    useEffect(() => {
        if (!token) return;
        const mark = () => { lastActivityRef.current = Date.now(); };
        const opts = { passive: true };
        const evs = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove'];
        evs.forEach((ev) => window.addEventListener(ev, mark, opts));
        const onVis = () => {
            if (document.visibilityState === 'visible') mark();
        };
        document.addEventListener('visibilitychange', onVis);

        const intervalId = window.setInterval(() => {
            if (!localStorage.getItem('accessToken')) return;
            const remember = localStorage.getItem(STORAGE_REMEMBER) === 'true';
            const limit = remember ? IDLE_REMEMBER_MS : IDLE_NO_REMEMBER_MS;
            if (Date.now() - lastActivityRef.current >= limit) {
                logoutRef.current?.('idle');
            }
        }, 15000);

        return () => {
            evs.forEach((ev) => window.removeEventListener(ev, mark, opts));
            document.removeEventListener('visibilitychange', onVis);
            window.clearInterval(intervalId);
        };
    }, [token]);

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
        updateUser,
        startImpersonation,
        stopImpersonation,
        isImpersonating: !!(user?.impersonated_by_email),
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