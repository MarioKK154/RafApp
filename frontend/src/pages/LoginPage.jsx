import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import defaultLogo from '../assets/logo.png';
import { 
    LockClosedIcon, 
    EnvelopeIcon, 
    ShieldCheckIcon,
    ArrowPathIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';

function LoginPage() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Protocol: Redirect user to targeted destination or root dashboard
    const from = location.state?.from?.pathname || "/";

    /**
     * Authentication Protocol
     * FastAPI OAuth2 requires 'application/x-www-form-urlencoded'
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const params = new URLSearchParams();
        params.append('username', email); // Mapping email to 'username' for FastAPI
        params.append('password', password);

        try {
            const response = await axiosInstance.post('/auth/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Initialize Session
            login(response.data.access_token);
            
            toast.success(t('auth_success', { defaultValue: 'Identity Verified. Accessing Registry...' }));
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Auth Error:", err);
            toast.error(t('auth_failed', { defaultValue: 'Credential verification failed.' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative overflow-hidden">
            {/* Background Topology */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                
                {/* Protocol: Amplified Identity Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex p-6 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl shadow-indigo-200 dark:shadow-none border border-gray-100 dark:border-gray-800 mb-6 transition-transform hover:scale-105 duration-500">
                        {/* Increased Logo Scale */}
                        <img src={defaultLogo} alt="Logo" className="h-28 w-28 object-contain" />
                    </div>
                    
                    {/* Primary Identifier */}
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">
                        RafApp
                    </h1>
                    
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="h-px w-8 bg-indigo-100 dark:bg-gray-700"></span>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                            {t('industrial_os', { defaultValue: 'INDUSTRIAL OS' })}
                        </p>
                        <span className="h-px w-8 bg-indigo-100 dark:bg-gray-700"></span>
                    </div>
                </div>

                {/* Entry Terminal */}
                <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <EnvelopeIcon className="h-3 w-3" /> {t('email', { defaultValue: 'Access Email' })}
                            </label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="personnel@rafapp.is" 
                                className="modern-input h-14 font-bold" 
                            />
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <LockClosedIcon className="h-3 w-3" /> {t('security_key', { defaultValue: 'Security Key' })}
                            </label>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className="modern-input h-14" 
                            />
                        </div>

                        {/* Submission Action */}
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                        >
                            {isLoading ? (
                                <>
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" /> 
                                    {t('syncing', { defaultValue: 'Authorizing...' })}
                                </>
                            ) : (
                                <>
                                    <ShieldCheckIcon className="h-5 w-5" /> 
                                    {t('initialize_session', { defaultValue: 'Initialize Session' })}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Telemetry */}
                    <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                            <CpuChipIcon className="h-4 w-4" />
                            <p className="text-[9px] font-bold uppercase tracking-tighter">
                                {t('auth_protocol', { defaultValue: 'Auth Protocol' })}: <span className="text-green-500">{t('online', { defaultValue: 'Encrypted (SSL)' })}</span>
                            </p>
                        </div>
                    </div>
                </div>
                
                <p className="text-center mt-10 text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                    &copy; 2026 RafApp • All Systems Operational
                </p>
            </div>
        </div>
    );
}

export default LoginPage;