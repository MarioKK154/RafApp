import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import IntegrationsSettings from '../components/IntegrationsSettings';
import PageHeader from '../components/PageHeader';
import { 
    UserIcon, 
    KeyIcon, 
    PhotoIcon, 
    IdentificationIcon, 
    DevicePhoneMobileIcon,
    MapPinIcon,
    ShieldCheckIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    UserCircleIcon,
    FingerPrintIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';

function AccountSettingsPage() {
    const { t } = useTranslation();
    const { user, isAuthenticated, isLoading: authIsLoading, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    const [totpSetupPayload, setTotpSetupPayload] = useState(null);
    const [totpActivateCode, setTotpActivateCode] = useState('');
    const [totpBusy, setTotpBusy] = useState(false);
    const [totpDisablePassword, setTotpDisablePassword] = useState('');
    const [totpDisableCode, setTotpDisableCode] = useState('');

    // Password Terminal State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Show/Hide Password States
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showDisableTotpPassword, setShowDisableTotpPassword] = useState(false);

    // Visual Identity State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Subscription Billing states
    const [invoices, setInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

    // PayPal checkout modal states
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
    const [paypalClientId, setPaypalClientId] = useState('sb');
    const [paypalLoaded, setPaypalLoaded] = useState(false);
    const [paymentStep, setPaymentStep] = useState('input'); // 'input' | 'processing' | 'success'

    const fetchTenantInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
            const res = await axiosInstance.get('/system/my-tenant/invoices');
            setInvoices(res.data || []);
        } catch (err) {
            console.error("Failed to load tenant invoices", err);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'admin' || user.is_superuser)) {
            fetchTenantInvoices();
        }
    }, [user]);

    useEffect(() => {
        const fetchAndLoadPaypal = async () => {
            let cid = 'sb';
            try {
                const res = await axiosInstance.get('/system/paypal-client-id');
                if (res.data && res.data.client_id) {
                    cid = res.data.client_id;
                }
            } catch (err) {
                console.warn("Failed to retrieve paypal client_id, falling back to sandbox (sb)", err);
            }
            setPaypalClientId(cid);

            const scriptId = "paypal-js-sdk";
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement("script");
            script.id = scriptId;
            script.src = `https://www.paypal.com/sdk/js?client-id=${cid}&currency=ISK`;
            script.async = true;
            script.onload = () => {
                setPaypalLoaded(true);
            };
            script.onerror = () => {
                console.error("Failed to load PayPal SDK script.");
            };
            document.body.appendChild(script);
        };
        
        if (user && (user.role === 'admin' || user.is_superuser)) {
            fetchAndLoadPaypal();
        }

        return () => {
            const script = document.getElementById("paypal-js-sdk");
            if (script) {
                script.remove();
            }
        };
    }, [user]);

    useEffect(() => {
        if (!selectedInvoiceForPayment || !paypalLoaded) return;

        const timer = setTimeout(() => {
            const container = document.getElementById("paypal-button-container");
            if (container && window.paypal) {
                container.innerHTML = "";
                window.paypal.Buttons({
                    style: {
                        layout: 'vertical',
                        color:  'gold',
                        shape:  'rect',
                        label:  'paypal'
                    },
                    createOrder: async (data, actions) => {
                        try {
                            const res = await axiosInstance.post(`/system/my-tenant/invoices/${selectedInvoiceForPayment.id}/paypal-order`);
                            return res.data.order_id;
                        } catch (err) {
                            toast.error("Failed to initiate PayPal Order.");
                            throw err;
                        }
                    },
                    onApprove: async (data, actions) => {
                        setPaymentStep('processing');
                        try {
                            const res = await axiosInstance.post(`/system/my-tenant/invoices/${selectedInvoiceForPayment.id}/paypal-capture`, {
                                order_id: data.orderID
                            });
                            if (res.data && res.data.status === 'COMPLETED') {
                                setPaymentStep('success');
                                toast.success(t('payment_success', { defaultValue: "Payment processed via PayPal successfully!" }));
                                fetchTenantInvoices();
                                setTimeout(() => {
                                    setSelectedInvoiceForPayment(null);
                                    setPaymentStep('input');
                                }, 2000);
                            } else {
                                toast.warning(`PayPal payment state: ${res.data.status}`);
                                setPaymentStep('input');
                            }
                        } catch (err) {
                            toast.error(err.response?.data?.detail || "PayPal transaction capture failed.");
                            setPaymentStep('input');
                        }
                    },
                    onError: (err) => {
                        console.error("PayPal Checkout Error:", err);
                        toast.error("An error occurred during PayPal checkout.");
                        setPaymentStep('input');
                    }
                }).render("#paypal-button-container");
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [selectedInvoiceForPayment, paypalLoaded]);

    const handleOpenPaymentModal = (invoice) => {
        setSelectedInvoiceForPayment(invoice);
        setPaymentStep('input');
    };

    const handleDownloadInvoicePdf = async (invoiceId) => {
        try {
            const res = await axiosInstance.get(`/system/invoices/${invoiceId}/pdf`, {
                responseType: 'blob'
            });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `rafapp-invoice-${invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast.error("Failed to download invoice PDF.");
        }
    };

    /**
     * Protocol: Security Boundary Check
     */
    useEffect(() => {
        if (!authIsLoading && !isAuthenticated) {
            toast.error(t('auth_required', { defaultValue: 'Security clearance required.' }));
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authIsLoading, navigate, t]);

    /**
     * Protocol: Credential Rotation Logic
     */
    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword.length < 8) {
            toast.error(t('password_too_short', { defaultValue: 'Security keys must be at least 8 characters.' }));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error(t('passwords_mismatch', { defaultValue: 'Key confirmation mismatch.' }));
            return;
        }

        setIsSubmittingPassword(true);
        try {
            await axiosInstance.post('/users/me/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success(t('security_updated', { defaultValue: 'Credentials updated. Re-authentication required.' }));
            
            // Security protocol: Force logout after credential change
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 2000);
        } catch (error) {
            console.error('Password update failed:', error);
            toast.error(error.response?.data?.detail || t('update_failed'));
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    /**
     * Protocol: Visual Assets Handling
     */
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(t('file_too_large', { defaultValue: 'Asset exceeds 5MB threshold.' }));
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        try {
            const response = await axiosInstance.post('/users/me/profile-picture', formData);
            updateUser(response.data);
            toast.success(t('avatar_updated', { defaultValue: 'Visual identity synchronized.' }));
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error('Profile photo upload failed:', error);
            toast.error(t('upload_failed', { defaultValue: 'Registry sync failed.' }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleTotpStartSetup = async () => {
        setTotpBusy(true);
        try {
            const res = await axiosInstance.post('/users/me/totp/setup');
            setTotpSetupPayload(res.data);
            setTotpActivateCode('');
            toast.success(t('totp_scan_hint', { defaultValue: 'Add the account to your authenticator app using the QR link or manual secret, then confirm with a code.' }));
        } catch (error) {
            console.error('TOTP setup failed:', error);
            toast.error(error.response?.data?.detail || t('update_failed'));
        } finally {
            setTotpBusy(false);
        }
    };

    const handleTotpConfirmSetup = async (e) => {
        e.preventDefault();
        if (totpActivateCode.replace(/\s/g, '').length < 6) return;
        setTotpBusy(true);
        try {
            const res = await axiosInstance.post('/users/me/totp/verify-setup', { code: totpActivateCode.replace(/\s/g, '') });
            updateUser(res.data);
            setTotpSetupPayload(null);
            setTotpActivateCode('');
            toast.success(t('totp_enabled', { defaultValue: 'Two-factor authentication is now enabled.' }));
        } catch (error) {
            console.error('TOTP verify setup failed:', error);
            toast.error(error.response?.data?.detail || t('update_failed'));
        } finally {
            setTotpBusy(false);
        }
    };

    const handleTotpDisable = async (e) => {
        e.preventDefault();
        setTotpBusy(true);
        try {
            const res = await axiosInstance.post('/users/me/totp/disable', {
                password: totpDisablePassword,
                totp_code: totpDisableCode.replace(/\s/g, ''),
            });
            updateUser(res.data);
            setTotpDisablePassword('');
            setTotpDisableCode('');
            toast.success(t('totp_disabled', { defaultValue: 'Two-factor authentication has been disabled.' }));
        } catch (error) {
            console.error('TOTP disable failed:', error);
            toast.error(error.response?.data?.detail || t('update_failed'));
        } finally {
            setTotpBusy(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('syncing')} size="lg" />;

    return (
        <>
            <div className="container mx-auto p-4 md:p-8 max-w-[1600px] animate-in fade-in duration-500">
            <PageHeader
                icon={UserIcon}
                title={t('account_settings', { defaultValue: 'Account & Security Settings' })}
                subtitle={t('profile_management', { defaultValue: 'Personal Profile, Security Credentials & Company Subscriptions' })}
                stats={[
                    { label: user?.role ? user.role.toUpperCase() : 'USER', dotColor: 'bg-green-400 animate-pulse' },
                    { label: user?.email || '', icon: <UserIcon className="h-4 w-4 text-indigo-300" /> },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Information & Security Matrix (Left) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Personnel Registry Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('personal_registry', { defaultValue: 'Personnel Records' })}</h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoItem label={t('full_name')} value={user.full_name} icon={<UserIcon className="h-4 w-4" />} />
                            <InfoItem label={t('email')} value={user.email} icon={<EnvelopeIcon className="h-4 w-4" />} />
                            <InfoItem label={t('role', { defaultValue: 'Company Role' })} value={user.role} badge />
                            <InfoItem label={t('employee_id', { defaultValue: 'Employee ID' })} value={user.employee_id} icon={<IdentificationIcon className="h-4 w-4" />} />
                            <InfoItem label={t('kennitala', { defaultValue: 'National ID' })} value={user.kennitala} icon={<ShieldCheckIcon className="h-4 w-4" />} />
                            <InfoItem label={t('phone', { defaultValue: 'Phone' })} value={user.phone_number} icon={<DevicePhoneMobileIcon className="h-4 w-4" />} />
                            <div className="md:col-span-2">
                                <InfoItem label={t('location', { defaultValue: 'Assigned Base' })} value={user.location} icon={<MapPinIcon className="h-4 w-4" />} />
                            </div>
                        </div>
                    </div>

                    {/* Security Credential Rotation Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <KeyIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('security_credentials', { defaultValue: 'Encryption Keys' })}</h2>
                        </div>
                        <form onSubmit={handlePasswordChangeSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('current_password', { defaultValue: 'Active Password' })}</label>
                                <div className="relative">
                                    <input 
                                        type={showCurrentPassword ? "text" : "password"} 
                                        required 
                                        value={currentPassword} 
                                        onChange={(e) => setCurrentPassword(e.target.value)} 
                                        className="modern-input pr-12" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                        title={showCurrentPassword ? "Hide password" : "Show password"}
                                    >
                                        {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('new_password', { defaultValue: 'Target Password' })}</label>
                                    <div className="relative">
                                        <input 
                                            type={showNewPassword ? "text" : "password"} 
                                            required 
                                            value={newPassword} 
                                            onChange={(e) => setNewPassword(e.target.value)} 
                                            className="modern-input pr-12"
                                            placeholder="MIN. 8 CHARS"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword((prev) => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                            title={showNewPassword ? "Hide password" : "Show password"}
                                        >
                                            {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('confirm_password', { defaultValue: 'Verify Protocol' })}</label>
                                    <div className="relative">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            required 
                                            value={confirmNewPassword} 
                                            onChange={(e) => setConfirmNewPassword(e.target.value)} 
                                            className="modern-input pr-12" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                            title={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingPassword} 
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingPassword ? (
                                        <><ArrowPathIcon className="h-5 w-5 animate-spin mr-3" /> {t('syncing')}</>
                                    ) : (
                                        <><ShieldCheckIcon className="h-5 w-5 mr-3" /> {t('update_credentials', { defaultValue: 'Update Security Keys' })}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <FingerPrintIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                {t('two_factor', { defaultValue: 'Two-factor authentication' })}
                            </h2>
                        </div>
                        <div className="p-8 space-y-6">
                            {user.totp_enabled ? (
                                <>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold uppercase tracking-tight">
                                        {t('totp_status_on', { defaultValue: 'Your account signs in with your password plus a code from an authenticator app.' })}
                                    </p>
                                    <form onSubmit={handleTotpDisable} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('current_password')}</label>
                                            <div className="relative">
                                                <input
                                                    type={showDisableTotpPassword ? "text" : "password"}
                                                    required
                                                    value={totpDisablePassword}
                                                    onChange={(e) => setTotpDisablePassword(e.target.value)}
                                                    className="modern-input pr-12"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDisableTotpPassword((prev) => !prev)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                                    title={showDisableTotpPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showDisableTotpPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">
                                                {t('totp_code', { defaultValue: 'Authenticator code' })}
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                required
                                                value={totpDisableCode}
                                                onChange={(e) => setTotpDisableCode(e.target.value)}
                                                className="modern-input tracking-widest font-mono"
                                                placeholder="000000"
                                                maxLength={12}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={totpBusy}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                                        >
                                            {totpBusy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : null}
                                            {t('disable_totp', { defaultValue: 'Disable 2FA' })}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {t('totp_intro', {
                                            defaultValue:
                                                'Add a second step at sign-in using any TOTP authenticator app (Google Authenticator, Microsoft Authenticator, etc.).',
                                        })}
                                    </p>
                                    {!totpSetupPayload && (
                                        <button
                                            type="button"
                                            disabled={totpBusy}
                                            onClick={handleTotpStartSetup}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                                        >
                                            {totpBusy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
                                            {t('start_totp_setup', { defaultValue: 'Begin setup' })}
                                        </button>
                                    )}
                                    {totpSetupPayload && (
                                        <form onSubmit={handleTotpConfirmSetup} className="space-y-4 pt-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('totp_manual_secret', { defaultValue: 'Manual setup secret' })}</p>
                                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 font-mono text-xs break-all text-gray-900 dark:text-gray-100">
                                                {totpSetupPayload.secret}
                                            </div>
                                            <a
                                                href={totpSetupPayload.otpauth_uri}
                                                className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 underline"
                                            >
                                                {t('open_in_authenticator', { defaultValue: 'Open otpauth link (mobile)' })}
                                            </a>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">
                                                    {t('totp_confirm_code', { defaultValue: 'Confirm with 6-digit code' })}
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    required
                                                    value={totpActivateCode}
                                                    onChange={(e) => setTotpActivateCode(e.target.value)}
                                                    className="modern-input tracking-widest font-mono text-center text-lg font-black"
                                                    maxLength={12}
                                                    placeholder="000000"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-3 pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={totpBusy}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                                                >
                                                    {totpBusy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : null}
                                                    {t('activate_totp', { defaultValue: 'Verify and enable' })}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={totpBusy}
                                                    onClick={() => { setTotpSetupPayload(null); setTotpActivateCode(''); }}
                                                    className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 dark:hover:text-white"
                                                >
                                                    {t('cancel', { defaultValue: 'Cancel' })}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Subscription & Billing Invoices Panel */}
                    {(user.role === 'admin' || user.is_superuser) && (
                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden text-left mb-8">
                            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-indigo-600 text-lg">💳</span>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                        Subscription & Billing Invoices
                                    </h2>
                                </div>
                            </div>
                            <div className="p-8 space-y-4">
                                {isLoadingInvoices ? (
                                    <p className="text-xs text-gray-400 italic">Loading invoices...</p>
                                ) : invoices.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No subscription invoices found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {invoices.map((inv) => (
                                            <div key={inv.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <span>{((inv.amount || 0) * 1.24).toLocaleString()} ISK</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">(Incl. 24% VSK)</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                            inv.status === 'Paid' 
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                : inv.status === 'Overdue'
                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                        }`}>
                                                            {inv.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-1">{inv.description || 'Monthly Subscription Fee'}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">Due Date: {inv.due_date} | Base: {inv.amount.toLocaleString()} ISK + VSK</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadInvoicePdf(inv.id)}
                                                        className="px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center gap-1.5"
                                                    >
                                                        PDF
                                                    </button>
                                                    {inv.status !== 'Paid' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenPaymentModal(inv)}
                                                            className="px-4 py-2 bg-[#0096FF] hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow shadow-blue-500/25"
                                                        >
                                                            Pay Bill (PayPal)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <IntegrationsSettings canManage={user.role === 'admin' || user.is_superuser || user.role === 'project manager'} />
                </div>

                {/* Visual Identity Terminal (Right) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center">
                        <div className="w-full flex items-center gap-3 mb-8">
                            <PhotoIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('visual_identity', { defaultValue: 'System Avatar' })}</h2>
                        </div>
                        
                        <div className="relative group">
                            <div className="w-56 h-56 rounded-full p-2 border-2 border-indigo-100 dark:border-indigo-900/50 border-dashed animate-in zoom-in duration-700">
                                <img 
                                    src={previewUrl || user.profile_picture_url || '/default-avatar.png'} 
                                    alt="Identity Preview" 
                                    className="w-full h-full rounded-full object-cover shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                                    onError={(e) => { e.target.src='/default-avatar.png' }}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-full flex flex-col items-center justify-center">
                                        <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">{t('syncing')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 w-full space-y-3">
                            <input type="file" id="profilePicInput" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="profilePicInput" 
                                className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
                            >
                                <PhotoIcon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    {selectedFile ? t('change_asset', { defaultValue: 'Replace Asset' }) : t('choose_photo', { defaultValue: 'Choose Visual' })}
                                </span>
                            </label>
                            
                            {selectedFile && (
                                <button 
                                    onClick={handleUpload} 
                                    disabled={isUploading} 
                                    className="w-full h-12 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                                >
                                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                    {t('commit_asset', { defaultValue: 'Commit Visualization' })}
                                </button>
                            )}
                        </div>
                        <p className="mt-6 text-[8px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">{t('format_limit_5mb', { defaultValue: 'Format: JPG/PNG/GIF • limit: 5MB' })}</p>
                    </div>

                    {/* Root Privilege Indicator */}
                    {user.is_superuser && (
                        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldCheckIcon className="h-20 w-20" />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative">
                                <ShieldCheckIcon className="h-5 w-5 text-indigo-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest">{t('root_access', { defaultValue: 'Root Authority' })}</h3>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-bold uppercase tracking-tight relative">
                                {t('root_warning', { defaultValue: 'System-wide administrative privileges active. Cross-tenant visibility and registry override enabled.' })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* PayPal Premium Payment Modal */}
        {selectedInvoiceForPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl max-w-md w-full overflow-hidden p-8 text-left space-y-6">
                    {paymentStep === 'input' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b pb-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">PayPal Secure Checkout</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">RafApp Subscription Service</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedInvoiceForPayment(null)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg font-black"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center text-xs">
                                <div>
                                    <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest">Amount to Pay</span>
                                    <span className="text-lg font-black text-indigo-950 dark:text-white">
                                        {((selectedInvoiceForPayment.amount || 0) * 1.24).toLocaleString()} ISK
                                    </span>
                                    <span className="block text-[8px] text-indigo-400 font-bold uppercase mt-0.5">
                                        (Subtotal: {selectedInvoiceForPayment.amount.toLocaleString()} ISK + 24% VSK)
                                    </span>
                                </div>
                                <span className="px-3 py-1 bg-white dark:bg-gray-800 text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider">
                                    SECURE
                                </span>
                            </div>

                            <div className="space-y-4">
                                {!paypalLoaded ? (
                                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                        <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading PayPal SDK...</p>
                                    </div>
                                ) : (
                                    <div id="paypal-button-container" className="w-full relative z-10 min-h-[150px]"></div>
                                )}
                            </div>
                        </div>
                    )}

                    {paymentStep === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider text-center">Processing SECURE PayPal Checkout...</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">Do not close this window or refresh the page.</p>
                        </div>
                    )}

                    {paymentStep === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 text-3xl animate-bounce">
                                ✓
                            </div>
                            <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest text-center">Payment Confirmed!</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Subscription invoice has been successfully paid.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}

/**
 * Technical Component: Profile Data Point
 */
function InfoItem({ label, value, icon, badge = false }) {
    return (
        <div className="group">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{label}</p>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors">
                {icon && <span className="text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
                <span className={`text-sm font-bold truncate ${badge ? 'uppercase tracking-tighter text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {value || '---'}
                </span>
            </div>
        </div>
    );
}

export default AccountSettingsPage;