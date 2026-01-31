// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    EnvelopeIcon, 
    LockClosedIcon, 
    ShieldCheckIcon,
    // CHANGED: From Square to Rectangle
    ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: authIsLoading } = useAuth();

    useEffect(() => {
        if (!authIsLoading && isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, authIsLoading, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        const loginData = new URLSearchParams();
        loginData.append('username', email.trim());
        loginData.append('password', password);

        try {
            const response = await axiosInstance.post('/auth/token', loginData, {
                headers: { 'Content-Type': 'application/x-form-urlencoded' }
            });
            const accessToken = response.data.access_token;
            login(accessToken);
            toast.success('Authentication established.');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Invalid credentials. Access denied.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Verifying session integrity..." size="lg" />;
    if (isAuthenticated) return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-xl">
                        <ShieldCheckIcon className="h-12 w-12 text-white" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                    <header className="mb-8 text-center">
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">RafApp Login</h1>
                        <p className="text-sm text-gray-500 mt-2 font-medium">Authorized Access Only</p>
                    </header>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                            <div className="relative group">
                                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-200 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 h-12"
                                    placeholder="admin@rafapp.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative group">
                                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-200 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 h-12"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Authenticating...' : 'Establish Access'}
                            {!isSubmitting && <ArrowLeftOnRectangleIcon className="h-5 w-5" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;