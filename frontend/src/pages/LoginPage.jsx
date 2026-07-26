import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import defaultLogo from '../assets/logo.png';
import FlagIcon from '../components/FlagIcon';
import { 
    LockClosedIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    CpuChipIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    ArrowLeftIcon,
    LanguageIcon,
    EyeIcon,
    EyeSlashIcon,
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
    const { t, i18n } = useTranslation();
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [tenants, setTenants] = useState([]);
    const [tenantSearch, setTenantSearch] = useState('');
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [step, setStep] = useState('credentials');
    const [tempToken, setTempToken] = useState(null);
    const [totpCode, setTotpCode] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
    const [isSubdomainLocked, setIsSubdomainLocked] = useState(false);
    const tenantPickerRef = useRef(null);

    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error(t('enter_email', { defaultValue: 'Please enter your email address.' }));
            return;
        }
        setIsLoading(true);
        try {
            const res = await axiosInstance.post('/auth/forgot-password', {
                email: forgotEmail,
                tenant_id: selectedTenantId ? Number(selectedTenantId) : null
            });
            setForgotSuccessMsg(res.data.message);
            toast.success(t('forgot_link_sent', { defaultValue: 'Password reset link dispatched!' }));
        } catch (err) {
            toast.error(err.response?.data?.detail || t('error_sending_reset', { defaultValue: 'Failed to request password reset.' }));
        } finally {
            setIsLoading(false);
        }
    };

    const from = location.state?.from?.pathname || '/';

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language?.startsWith('en') ? 'is' : 'en');
    };

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
                const tenantsList = Array.isArray(response.data) ? response.data : [];
                setTenants(tenantsList);

                // Subdomain auto-selection
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    const sub = parts[0].toLowerCase();
                    if (sub !== 'www' && sub !== 'api') {
                        const matched = tenantsList.find(
                            (tnt) => 
                                (tnt.subdomain && tnt.subdomain.toLowerCase() === sub) ||
                                (tnt.name || '').toLowerCase().replace(/\s+/g, '') === sub ||
                                (tnt.name || '').toLowerCase().includes(sub)
                        );
                        if (matched) {
                            setSelectedTenantId(String(matched.id));
                            setIsSubdomainLocked(true);
                        }
                    }
                }
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
        const targetPath = (!from || from === '/' || from === '/login') ? '/dashboard' : from;
        navigate(targetPath, { replace: true });
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
        <div className="min-h-screen flex flex-col items-center justify-start pt-20 md:pt-24 pb-12 px-4 bg-gray-50 dark:bg-gray-900 relative overflow-y-auto">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Top Bar Header Navigation */}
            <header className="w-full fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
                {!isSubdomainLocked ? (
                    <button onClick={() => navigate('/')} className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition px-4 py-2 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs font-bold text-xs uppercase tracking-widest">
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>{t('back', { defaultValue: 'Back' })}</span>
                    </button>
                ) : (
                    <div />
                )}
                <button onClick={toggleLanguage} className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition px-3.5 py-2 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs font-bold text-xs uppercase tracking-widest">
                    <FlagIcon lang={i18n.language?.toLowerCase().startsWith('en') ? 'is' : 'en'} className="w-4 h-3 rounded-[2px] shadow-sm shrink-0" />
                    <span>{i18n.language?.toLowerCase().startsWith('en') ? 'IS' : 'EN'}</span>
                </button>
            </header>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700 my-auto">
                
                <div className="text-center mb-6 pt-2">
                    <div className="inline-flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 mb-4 shadow-sm h-24 w-24">
                        <img 
                            src={(isSubdomainLocked && selectedTenant && selectedTenant.logo_url) ? resolveLoginAssetUrl(selectedTenant.logo_url) : defaultLogo} 
                            alt="Company Logo" 
                            className="h-16 w-16 object-contain p-0.5" 
                        />
                    </div>
                    
                    {isSubdomainLocked && selectedTenant ? (
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase leading-tight">
                            {selectedTenant.name}
                        </h1>
                    ) : (
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">
                            RafApp
                        </h1>
                    )}
                    
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="h-px w-8 bg-indigo-100 dark:bg-gray-700" />
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                            {isSubdomainLocked && selectedTenant?.subdomain 
                                ? `${selectedTenant.subdomain}.rafapp.is` 
                                : t('industrial_os', { defaultValue: 'INDUSTRIAL OS' })}
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
                                <div className="relative" ref={tenantPickerRef}>
                                    {isSubdomainLocked ? (
                                        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between shadow-xs">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {selectedTenant && selectedTenant.logo_url ? (
                                                    <img
                                                        src={resolveLoginAssetUrl(selectedTenant.logo_url)}
                                                        alt=""
                                                        className="h-10 w-10 shrink-0 rounded-xl object-contain border border-gray-200 dark:border-gray-700 bg-white p-1"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                        <BuildingOffice2Icon className="h-5 w-5" />
                                                    </div>
                                                )}
                                                <div className="truncate">
                                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                                                        {selectedTenant ? selectedTenant.name : 'Loading...'}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {selectedTenant?.subdomain ? `${selectedTenant.subdomain}.rafapp.is` : 'Enterprise Subdomain'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50 shrink-0">
                                                <ShieldCheckIcon className="h-3.5 w-3.5" /> Locked
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <div className="relative flex items-center">
                                                    {selectedTenant && selectedTenant.logo_url && !tenantSearch ? (
                                                        <img
                                                            src={resolveLoginAssetUrl(selectedTenant.logo_url)}
                                                            alt=""
                                                            className="absolute left-3.5 h-7 w-7 rounded-lg object-contain border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 pointer-events-none"
                                                        />
                                                    ) : (
                                                        <MagnifyingGlassIcon className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                                                    )}
                                                    <input
                                                        type="text"
                                                        value={tenantMenuOpen ? tenantSearch : (selectedTenant ? selectedTenant.name : tenantSearch)}
                                                        onFocus={() => setTenantMenuOpen(true)}
                                                        onChange={(e) => {
                                                            setTenantSearch(e.target.value);
                                                            setTenantMenuOpen(true);
                                                            if (!e.target.value) {
                                                                setSelectedTenantId('');
                                                            }
                                                        }}
                                                        placeholder={selectedTenant ? selectedTenant.name : t('search_company', { defaultValue: 'Search or select company...' })}
                                                        className="modern-input h-14 pl-12 pr-10 text-sm font-bold w-full"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setTenantMenuOpen((o) => !o)}
                                                        className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                        tabIndex={-1}
                                                    >
                                                        <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${tenantMenuOpen ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                                {tenantMenuOpen && (
                                                    <ul
                                                        role="listbox"
                                                        className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 shadow-2xl"
                                                    >
                                                        {filteredTenants.length === 0 ? (
                                                            <li className="px-4 py-3 text-xs text-gray-400 font-semibold text-center">
                                                                {t('no_matching_companies', { defaultValue: 'No matching companies found' })}
                                                            </li>
                                                        ) : (
                                                            filteredTenants.map((tenant) => {
                                                                const selected = String(tenant.id) === String(selectedTenantId);
                                                                const logoSrc = tenant.logo_url ? resolveLoginAssetUrl(tenant.logo_url) : '';
                                                                return (
                                                                    <li key={tenant.id} role="presentation">
                                                                        <button
                                                                            type="button"
                                                                            role="option"
                                                                            aria-selected={selected}
                                                                            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-indigo-50/70 dark:hover:bg-gray-700/80 transition ${
                                                                                selected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-black' : 'text-gray-800 dark:text-gray-200 font-bold'
                                                                            }`}
                                                                            onClick={() => {
                                                                                setSelectedTenantId(String(tenant.id));
                                                                                setTenantSearch('');
                                                                                setTenantMenuOpen(false);
                                                                            }}
                                                                        >
                                                                            {logoSrc ? (
                                                                                <img
                                                                                    src={logoSrc}
                                                                                    alt=""
                                                                                    className="h-8 w-8 shrink-0 rounded-lg object-contain border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-0.5"
                                                                                />
                                                                            ) : (
                                                                                <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 text-gray-500">
                                                                                    <BuildingOffice2Icon className="h-4 w-4" />
                                                                                </div>
                                                                            )}
                                                                            <span className="truncate flex-1">{tenant.name}</span>
                                                                            {selected && <ShieldCheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        </>
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
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="••••••••" 
                                        className="modern-input h-14 pr-12 font-bold" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={keepSignedIn}
                                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                                        className="h-4 w-4 rounded-md text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {t('keep_signed_in', { defaultValue: 'Keep me signed in' })}
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotEmail(email);
                                        setForgotSuccessMsg('');
                                        setStep('forgot');
                                    }}
                                    className="text-indigo-500 hover:text-indigo-400 transition"
                                >
                                    {t('forgot_password_link', { defaultValue: 'Gleymdir þú lykilorði?' })}
                                </button>
                            </div>

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

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate('/', { state: { openRequestAccess: true } })}
                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition"
                                >
                                    {t('request_access', { defaultValue: 'Request Access / Contact Us' })}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'forgot' && (
                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">
                                    {t('forgot_password_title', { defaultValue: 'Endursetja Lykilorð' })}
                                </h3>
                                <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                                    {t('forgot_password_desc', { defaultValue: 'Sláðu inn netfangið þitt til að fá sendan hlekk í tölvupósti til að endursetja lykilorðið.' })}
                                </p>
                            </div>

                            {forgotSuccessMsg ? (
                                <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs font-bold space-y-3">
                                    <p>{forgotSuccessMsg}</p>
                                    <button
                                        type="button"
                                        onClick={() => setStep('credentials')}
                                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition"
                                    >
                                        {t('back_to_login', { defaultValue: 'Aftur í innskráningu' })}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <EnvelopeIcon className="h-3 w-3" /> {t('email_address', { defaultValue: 'Email address' })}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="nafn@fyrirtaeki.is"
                                            className="modern-input h-14"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                                {t('sending', { defaultValue: 'Sendir...' })}
                                            </>
                                        ) : (
                                            <>
                                                <EnvelopeIcon className="h-5 w-5" />
                                                {t('send_reset_link_btn', { defaultValue: 'Senda hlekk í tölvupósti' })}
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep('credentials')}
                                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition"
                                    >
                                        {t('cancel_back', { defaultValue: 'Hætta við / Aftur í innskráningu' })}
                                    </button>
                                </>
                            )}
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
