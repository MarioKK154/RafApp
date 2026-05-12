import React, { useMemo, useState, useEffect, useRef } from 'react';
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
    CpuChipIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

function resolveLoginAssetUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    const base = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}

function LoginPage() {
    const { t } = useTranslation();
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [tenants, setTenants] = useState([]);
    const [tenantSearch, setTenantSearch] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [step, setStep] = useState('credentials');
    const [tempToken, setTempToken] = useState(null);
    const [totpCode, setTotpCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
    const tenantPickerRef = useRef(null);

    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        if (!tenantMenuOpen) return undefined;
        const onDoc = (ev) => {
            if (tenantPickerRef.current && !tenantPickerRef.current.contains(ev.target)) {
                setTenantMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [tenantMenuOpen]);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const loadTenants = async () => {
            try {
                const response = await axiosInstance.get('/auth/login-tenants');
                setTenants(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Tenant fetch failed:', error);
                toast.error('Could not load company list.');
                setTenants([]);
            }
        };
        loadTenants();
    }, []);

    const filteredTenants = useMemo(() => {
        const q = tenantSearch.trim().toLowerCase();
        if (!q) return tenants;
        return tenants.filter((tenant) => (tenant.name || '').toLowerCase().includes(q));
    }, [tenants, tenantSearch]);

    const selectedTenant = useMemo(
        () => tenants.find((tnt) => String(tnt.id) === String(selectedTenantId)) || null,
        [tenants, selectedTenantId],
    );

    const finalizeLogin = async (accessToken) => {
        await login(accessToken, { rememberMe: keepSignedIn });
        toast.success(t('auth_success', { defaultValue: 'Identity Verified. Accessing Registry...' }));
        navigate(from === '/' ? '/dashboard' : from, { replace: true });
    };

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTenantId) {
            toast.warn('Select company first.');
            return;
        }
        setIsLoading(true);

        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        params.append('tenant_id', selectedTenantId);
        params.append('keep_signed_in', keepSignedIn ? 'true' : 'false');

        try {
            const response = await axiosInstance.post('/auth/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (response.data.two_factor_required && response.data.temp_token) {
                setTempToken(response.data.temp_token);
                setTotpCode('');
                setStep('totp');
                toast.info(t('enter_totp', { defaultValue: 'Enter the code from your authenticator app.' }));
            } else if (response.data.access_token) {
                await finalizeLogin(response.data.access_token);
            } else {
                toast.error(t('auth_failed', { defaultValue: 'Unexpected login response.' }));
            }
        } catch (err) {
            console.error('Auth Error:', err);
            toast.error(err.response?.data?.detail || t('auth_failed', { defaultValue: 'Credential verification failed.' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleTotpSubmit = async (e) => {
        e.preventDefault();
        if (!tempToken) return;
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/token/complete-2fa', {
                temp_token: tempToken,
                totp_code: totpCode.replace(/\s/g, ''),
            });
            if (response.data.access_token) {
                await finalizeLogin(response.data.access_token);
            } else {
                toast.error(t('auth_failed', { defaultValue: 'Verification failed.' }));
            }
        } catch (err) {
            console.error('2FA Error:', err);
            toast.error(err.response?.data?.detail || t('auth_failed', { defaultValue: 'Invalid code.' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                
                <div className="text-center mb-10">
                    <div className="inline-flex p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
                        <img src={defaultLogo} alt="Logo" className="h-28 w-28 object-contain" />
                    </div>
                    
                    <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">
                        RafApp
                    </h1>
                    
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="h-px w-8 bg-indigo-100 dark:bg-gray-700" />
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                            {t('industrial_os', { defaultValue: 'INDUSTRIAL OS' })}
                        </p>
                        <span className="h-px w-8 bg-indigo-100 dark:bg-gray-700" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700">
                    {step === 'credentials' && (
                        <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <BuildingOffice2Icon className="h-3 w-3" /> {t('company', { defaultValue: 'Company' })}
                                </label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={tenantSearch}
                                        onChange={(e) => setTenantSearch(e.target.value)}
                                        placeholder={t('search_company', { defaultValue: 'Search company...' })}
                                        className="modern-input h-12 pl-11 text-sm"
                                    />
                                </div>
                                <div className="relative" ref={tenantPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => setTenantMenuOpen((o) => !o)}
                                        aria-haspopup="listbox"
                                        aria-expanded={tenantMenuOpen}
                                        className="modern-input h-14 font-bold w-full flex items-center gap-3 text-left"
                                    >
                                        {selectedTenant ? (
                                            <>
                                                {selectedTenant.logo_url ? (
                                                    <img
                                                        src={resolveLoginAssetUrl(selectedTenant.logo_url)}
                                                        alt=""
                                                        className="h-9 w-9 shrink-0 rounded-lg object-contain border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"
                                                    />
                                                ) : (
                                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                        <BuildingOffice2Icon className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <span className="truncate flex-1">{selectedTenant.name}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 flex-1">{t('select_company', { defaultValue: '-- SELECT COMPANY --' })}</span>
                                        )}
                                        <ChevronDownIcon className={`h-5 w-5 shrink-0 text-gray-400 transition ${tenantMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {tenantMenuOpen && (
                                        <ul
                                            role="listbox"
                                            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-1 shadow-xl"
                                        >
                                            <li role="presentation">
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={!selectedTenantId}
                                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/80"
                                                    onClick={() => {
                                                        setSelectedTenantId('');
                                                        setTenantMenuOpen(false);
                                                    }}
                                                >
                                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700" />
                                                    <span className="text-gray-500 dark:text-gray-400 font-semibold">
                                                        {t('select_company', { defaultValue: '-- SELECT COMPANY --' })}
                                                    </span>
                                                </button>
                                            </li>
                                            {filteredTenants.map((tenant) => {
                                                const selected = String(tenant.id) === String(selectedTenantId);
                                                const logoSrc = tenant.logo_url ? resolveLoginAssetUrl(tenant.logo_url) : '';
                                                return (
                                                    <li key={tenant.id} role="presentation">
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={selected}
                                                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/80 ${
                                                                selected ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                                                            }`}
                                                            onClick={() => {
                                                                setSelectedTenantId(String(tenant.id));
                                                                setTenantMenuOpen(false);
                                                            }}
                                                        >
                                                            {logoSrc ? (
                                                                <img
                                                                    src={logoSrc}
                                                                    alt=""
                                                                    className="h-9 w-9 shrink-0 rounded-lg object-contain border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"
                                                                />
                                                            ) : (
                                                                <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                                    <BuildingOffice2Icon className="h-5 w-5 text-gray-500" />
                                                                </div>
                                                            )}
                                                            <span className="truncate font-bold text-gray-900 dark:text-white">{tenant.name}</span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                            {filteredTenants.length === 0 && (
                                                <li className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                                    No companies match your search.
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                {selectedTenant && (
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                        {t('selected_company', { defaultValue: 'Selected' })}: {selectedTenant.name}
                                    </p>
                                )}
                            </div>

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

                            <label className="flex items-center gap-3 px-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={keepSignedIn}
                                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                                    className="h-5 w-5 rounded-lg text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                />
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {t('keep_signed_in', { defaultValue: 'Keep me signed in' })}
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
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
                    )}

                    {step === 'totp' && (
                        <form onSubmit={handleTotpSubmit} className="space-y-6">
                            <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                                {t('totp_instructions', {
                                    defaultValue: 'Two-factor verification is enabled for your account. Open your authenticator app and enter the 6-digit code.',
                                })}
                            </p>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <ShieldCheckIcon className="h-3 w-3" /> {t('totp_code', { defaultValue: 'Authenticator code' })}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    required
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    placeholder="000000"
                                    className="modern-input h-14 text-center tracking-[0.4em] text-lg font-black"
                                    maxLength={12}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || totpCode.replace(/\s/g, '').length < 6}
                                className="w-full h-14 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        {t('syncing', { defaultValue: 'Verifying...' })}
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheckIcon className="h-5 w-5" />
                                        {t('verify', { defaultValue: 'Verify and continue' })}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setStep('credentials'); setTempToken(null); setTotpCode(''); }}
                                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600"
                            >
                                {t('back_to_login', { defaultValue: 'Back to password' })}
                            </button>
                        </form>
                    )}

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
