import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BuildingOfficeIcon, 
    PhotoIcon, 
    ShieldCheckIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    FingerPrintIcon,
    PaintBrushIcon,
    InformationCircleIcon,
    UsersIcon,
    BriefcaseIcon,
    WrenchScrewdriverIcon,
    TruckIcon,
    UserGroupIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

function TenantEditPage() {
    const { t } = useTranslation();

    const { tenantId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Data States
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        background_image_url: '',
        background_image_urls: [],
        base_hourly_rate: 6500.0,
        enabled_features: [],
    });
    const [initialTenantData, setInitialTenantData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Invoice and Subscription billing states
    const [invoices, setInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        amount: 23600,
        due_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'Pending',
        description: 'Monthly SaaS subscription fee'
    });

    const isSuperuser = currentUser?.is_superuser;

    /**
     * Synchronize with Infrastructure Registry
     */
    const fetchTenantData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && isSuperuser && tenantId) {
            setIsLoadingData(true);
            setError('');
            try {
                const response = await axiosInstance.get(`/tenants/${tenantId}`);
                const tenant = response.data;
                setInitialTenantData(tenant);
                setFormData({
                    name: tenant.name ?? '',
                    logo_url: tenant.logo_url ?? '',
                    background_image_url: tenant.background_image_url ?? '',
                    background_image_urls: Array.isArray(tenant.background_image_urls) ? tenant.background_image_urls : [],
                    base_hourly_rate: tenant.base_hourly_rate ?? 6500.0,
                    enabled_features: Array.isArray(tenant.enabled_features) ? tenant.enabled_features : [],
                });

                // Calculate default amount based on active user count
                const users = tenant.user_count || 0;
                let defaultAmount = 16390;
                if (users <= 10) {
                    const extra = Math.max(0, users - 2);
                    const total = 16390 + extra * 3190;
                    defaultAmount = Math.min(41910, total);
                } else if (users <= 25) {
                    const extra = Math.max(0, users - 10);
                    const total = 43890 + extra * 2750;
                    defaultAmount = Math.min(85140, total);
                } else if (users <= 65) {
                    const extra = Math.max(0, users - 25);
                    const total = 82390 + extra * 2200;
                    defaultAmount = Math.min(170390, total);
                } else {
                    const extra = Math.max(0, users - 65);
                    defaultAmount = 164890 + extra * 1650;
                }

                setNewInvoice(prev => ({
                    ...prev,
                    amount: defaultAmount,
                    description: `Monthly Subscription SaaS fee (${users} active user(s))`
                }));
            } catch (err) {
                console.error("Infrastructure Sync Error:", err);
                const errorMsg = err.response?.status === 404 ? t('toast_tenant_not_found') : t('toast_tenant_sync_failed');
                setError(errorMsg);
                toast.error(errorMsg);
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        } else if (!authIsLoading && !isSuperuser) {
            navigate('/', { replace: true });
        }
    }, [tenantId, isAuthenticated, authIsLoading, isSuperuser, navigate]);

    useEffect(() => {
        fetchTenantData();
    }, [fetchTenantData]);

    const fetchInvoices = useCallback(async () => {
        if (!tenantId) return;
        setIsLoadingInvoices(true);
        try {
            const res = await axiosInstance.get(`/tenants/${tenantId}/invoices`);
            setInvoices(res.data || []);
        } catch (err) {
            console.error("Failed to load invoices", err);
        } finally {
            setIsLoadingInvoices(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            fetchInvoices();
        }
    }, [tenantId, fetchInvoices]);

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                tenant_id: parseInt(tenantId, 10),
                amount: parseFloat(newInvoice.amount),
                due_date: newInvoice.due_date,
                status: newInvoice.status,
                provider: 'stripe',
                description: newInvoice.description
            };
            await axiosInstance.post(`/tenants/${tenantId}/invoices`, payload);
            toast.success("Invoice generated successfully!");
            fetchInvoices();
            const users = initialTenantData?.user_count || 0;
            let defaultAmount = 16390;
            if (users <= 10) {
                const extra = Math.max(0, users - 2);
                const total = 16390 + extra * 3190;
                defaultAmount = Math.min(41910, total);
            } else if (users <= 25) {
                const extra = Math.max(0, users - 10);
                const total = 43890 + extra * 2750;
                defaultAmount = Math.min(85140, total);
            } else if (users <= 65) {
                const extra = Math.max(0, users - 25);
                const total = 82390 + extra * 2200;
                defaultAmount = Math.min(170390, total);
            } else {
                const extra = Math.max(0, users - 65);
                defaultAmount = 164890 + extra * 1650;
            }

            setNewInvoice({
                amount: defaultAmount,
                due_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
                status: 'Pending',
                description: `Monthly Subscription SaaS fee (${users} active user(s))`
            });
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate invoice");
        }
    };

    const handleMarkInvoicePaid = async (invoiceId) => {
        try {
            await axiosInstance.post(`/tenants/invoices/${invoiceId}/pay`);
            toast.success("Invoice successfully marked as Paid!");
            fetchInvoices();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to mark invoice as paid");
        }
    };

    const handleChange = (e) => {
    const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isSuperuser) return;

        setError('');
        setIsSubmitting(true);

        // Delta Detection: Only send modified fields
        const updatePayload = {};
        if (formData.name !== initialTenantData.name) updatePayload.name = formData.name;
        if (formData.logo_url !== (initialTenantData.logo_url ?? '')) updatePayload.logo_url = formData.logo_url || null;
        if (formData.background_image_url !== (initialTenantData.background_image_url ?? '')) updatePayload.background_image_url = formData.background_image_url || null;
        const initialBgUrls = Array.isArray(initialTenantData.background_image_urls) ? initialTenantData.background_image_urls : [];
        if (JSON.stringify(formData.background_image_urls || []) !== JSON.stringify(initialBgUrls)) updatePayload.background_image_urls = formData.background_image_urls || [];
        if (parseFloat(formData.base_hourly_rate) !== initialTenantData.base_hourly_rate) updatePayload.base_hourly_rate = parseFloat(formData.base_hourly_rate) || 0.0;
        const initialFeatures = Array.isArray(initialTenantData.enabled_features) ? initialTenantData.enabled_features : [];
        if (JSON.stringify(formData.enabled_features || []) !== JSON.stringify(initialFeatures)) updatePayload.enabled_features = formData.enabled_features || [];

        if (Object.keys(updatePayload).length === 0) {
            toast.info(t('toast_no_modifications'));
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await axiosInstance.put(`/tenants/${tenantId}`, updatePayload);
            toast.success(`${t('toast_tenant_updated')} \"${response.data.name}\" updated.`);
            navigate('/tenants');
        } catch (err) {
            console.error("Node Update Error:", err);
            const msg = err.response?.data?.detail || t('toast_tenant_update_failed');
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text={t('accessing_root_node')} size="lg" />;
    if (error && !initialTenantData) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <h2 className="text-xl font-black text-red-600 uppercase tracking-tighter">{error}</h2>
            <Link to="/tenants" className="mt-4 text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest">{t('return_to_registry')}</Link>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link to="/tenants" className="flex items-center text-xs font-black text-gray-400 hover:text-orange-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('back_to_tenants')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-100 dark:shadow-none">
                        <ShieldCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            {t('configure_node')} {initialTenantData?.name}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <FingerPrintIcon className="h-3 w-3" /> Registry ID: {tenantId}
                        </div>
                    </div>
                </div>
            </div>

            

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form Entry */}
                <div className="lg:col-span-7 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4" /> {t('node_identity')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('company_entity_name')}</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Base Hourly Rate (ISK)</label>
                                <input 
                                    type="number" 
                                    name="base_hourly_rate" 
                                    required 
                                    value={formData.base_hourly_rate} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold" 
                                />
                            </div>
                        </div>

                        <div className="space-y-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <PaintBrushIcon className="h-4 w-4" /> {t('branding_telemetry')}
                            </h2>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('logo_label')}</label>
                                <div className="flex flex-wrap items-center gap-4">
                                    {formData.logo_url && (
                                        <div className="relative">
                                            <img
                                                src={formData.logo_url.startsWith('http') ? formData.logo_url : `${axiosInstance.defaults.baseURL || ''}${formData.logo_url}`}
                                                alt="Logo"
                                                className="h-16 w-16 object-contain rounded-xl border border-gray-200 dark:border-gray-600"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                        <PhotoIcon className="h-5 w-5 text-gray-500" />
                                        <span className="text-xs font-bold">{formData.logo_url ? t('replace_logo') : t('upload_logo')}</span>
                                        <input
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.svg,.webp"
                                            className="sr-only"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file || !tenantId) return;
                                                try {
                                                    const fd = new FormData();
                                                    fd.append('file', file);
                                                    const res = await axiosInstance.post(`/tenants/${tenantId}/upload-logo`, fd, {
                                                        headers: { 'Content-Type': 'multipart/form-data' },
                                                    });
                                                    if (res.data?.url) setFormData(prev => ({ ...prev, logo_url: res.data.url }));
                                                } catch (err) {
                                                    console.error('Logo upload failed:', err);
                                                    toast.error(err.response?.data?.detail || t('toast_logo_upload_failed'));
                                                }
                                                e.target.value = '';
                                            }}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('background_photos')}</label>
                                <div className="space-y-3">
                                    {(formData.background_image_urls || []).length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.background_image_urls.map((url, idx) => (
                                                <div key={idx} className="relative group">
                                                    <img
                                                        src={url.startsWith('http') ? url : `${axiosInstance.defaults.baseURL || ''}${url}`}
                                                        alt=""
                                                        className="h-20 w-28 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            background_image_urls: (prev.background_image_urls || []).filter((_, i) => i !== idx),
                                                        }))}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remove"
                                                    >
                                                        <span className="text-xs">×</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                        <PhotoIcon className="h-5 w-5 text-gray-500" />
                                        <span className="text-xs font-bold">{t('add_background_images')}</span>
                                        <input
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp"
                                            multiple
                                            className="sr-only"
                                            onChange={async (e) => {
                                                const files = e.target.files ? Array.from(e.target.files) : [];
                                                for (const file of files) {
                                                    try {
                                                        const fd = new FormData();
                                                        fd.append('file', file);
                                                        const res = await axiosInstance.post(`/tenants/${tenantId}/upload-background`, fd, {
                                                            headers: { 'Content-Type': 'multipart/form-data' },
                                                        });
                                                        if (res.data?.url) setFormData(prev => ({
                                                            ...prev,
                                                            background_image_urls: [...(prev.background_image_urls || []), res.data.url],
                                                        }));
                                                    } catch (err) {
                                                        console.error('Background upload failed:', err);
                                                        toast.error(err.response?.data?.detail || t('toast_bg_upload_failed'));
                                                    }
                                                }
                                                e.target.value = '';
                                            }}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Module Configuration */}
                    <section className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                            <WrenchScrewdriverIcon className="h-4 w-4 text-orange-600" /> Module Configuration
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { key: 'fleet', label: 'Fleet Management' },
                                { key: 'tools', label: 'Tool Inventory' },
                                { key: 'tutorials', label: 'Tutorials & Standards' },
                                { key: 'payroll', label: 'HR & Payroll' },
                                { key: 'rates', label: 'Service Rates' },
                                { key: 'risk', label: 'Risk Library' }
                            ].map(({ key, label }) => {
                                const isChecked = (formData.enabled_features || []).includes(key);
                                return (
                                    <label key={key} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-all">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => {
                                                    const current = prev.enabled_features || [];
                                                    const updated = checked 
                                                        ? [...current, key]
                                                        : current.filter(k => k !== key);
                                                    return { ...prev, enabled_features: updated };
                                                });
                                            }}
                                        />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Right Column: Preview & Actions */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live Preview Card */}
                    <section className="bg-gray-900 p-6 rounded-[2.5rem] border border-gray-800 space-y-4 overflow-hidden shadow-2xl">
                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-center">{t('live_asset_preview')}</h3>
                        <div className="relative h-40 rounded-2xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center overflow-hidden">
                            {(formData.background_image_urls?.length > 0 ? formData.background_image_urls[0] : formData.background_image_url) && (
                                <img
                                    src={formData.background_image_urls?.length > 0
                                        ? (formData.background_image_urls[0].startsWith('http') ? formData.background_image_urls[0] : `${axiosInstance.defaults.baseURL || ''}${formData.background_image_urls[0]}`)
                                        : formData.background_image_url
                                    }
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            )}
                            <div className="relative z-10 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                {formData.logo_url ? (
                                    <img
                                        src={formData.logo_url.startsWith('http') ? formData.logo_url : `${axiosInstance.defaults.baseURL || ''}${formData.logo_url}`}
                                        alt="Logo Preview"
                                        className="h-12 object-contain"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <BuildingOfficeIcon className="h-12 w-12 text-gray-600" />
                                )}
                            </div>
                        </div>
                        <p className="text-[9px] text-gray-500 text-center font-bold uppercase italic tracking-tighter">{t('verified_node_appearance')}</p>
                    </section>

                    {/* Stats Section */}
                    {/* Stats Section */}
                    {initialTenantData && (
                        <section className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 text-left">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                <ChartBarIcon className="h-4 w-4" /> Node Telemetry
                            </h3>
                            
                            {/* Registry Meta */}
                            <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl">
                                <div>Created: <span className="text-gray-800 dark:text-gray-200">{new Date(initialTenantData.created_at).toLocaleDateString()}</span></div>
                                <div>Billing: {initialTenantData.has_overdue_invoices ? (
                                    <span className="text-red-500 font-black">Overdue ({initialTenantData.overdue_amount} ISK)</span>
                                ) : (
                                    <span className="text-emerald-500 font-black">Good Standing</span>
                                )}</div>
                                <div>Discount: <span className="text-indigo-500">{initialTenantData.discount_percent ? `${initialTenantData.discount_percent}%` : 'None'}</span></div>
                                <div>Status: <span className="text-emerald-500">Active</span></div>
                            </div>

                            {/* Resource Counters */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                    <UsersIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{initialTenantData.user_count || 0}</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Users</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                    <BriefcaseIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{initialTenantData.project_count || 0}</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Projects</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                    <UserGroupIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{initialTenantData.customer_count || 0}</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Clients</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl text-center border border-gray-100 dark:border-gray-700">
                                    <TruckIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{initialTenantData.car_count || 0}</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Fleet</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-2xl text-center border border-gray-100 dark:border-gray-700 col-span-2">
                                    <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{initialTenantData.tool_count || 0}</div>
                                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Tools Assigned</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Subscription & Invoices Panel */}
                    {initialTenantData && (
                        <section className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 text-left">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                <span className="text-indigo-600">💳</span> Subscription & Billing Invoices
                            </h3>

                            {/* Invoices List */}
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {isLoadingInvoices ? (
                                    <p className="text-[10px] text-gray-400 italic">Loading invoices...</p>
                                ) : invoices.length === 0 ? (
                                    <p className="text-[10px] text-gray-400 italic">No invoices issued yet.</p>
                                ) : (
                                    invoices.map((inv) => (
                                        <div key={inv.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <span>{((inv.amount || 0) * 1.24).toLocaleString()} ISK</span>
                                                    <span className="text-[8px] text-gray-400 font-normal">(Incl. 24% VSK)</span>
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
                                                <p className="text-[9px] text-gray-500 mt-0.5">{inv.description || 'Monthly Subscription'}</p>
                                                <p className="text-[8px] text-gray-400 font-mono mt-0.5">Due: {inv.due_date} | Base: {inv.amount.toLocaleString()} ISK + VSK</p>
                                            </div>
                                            {inv.status !== 'Paid' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMarkInvoicePaid(inv.id)}
                                                    className="px-3 py-1.5 bg-[#0096FF] hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition shadow"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Generate Invoice Form */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Issue New Invoice</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[8px] font-black text-gray-500 uppercase mb-0.5">Amount (ISK)</label>
                                        <input
                                            type="number"
                                            value={newInvoice.amount}
                                            onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                                            className="block w-full h-8 px-2 rounded-xl text-xs border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-gray-500 uppercase mb-0.5">Due Date</label>
                                        <input
                                            type="date"
                                            value={newInvoice.due_date}
                                            onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                                            className="block w-full h-8 px-2 rounded-xl text-xs border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-0.5">Description</label>
                                    <input
                                        type="text"
                                        value={newInvoice.description}
                                        onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                                        className="block w-full h-8 px-2 rounded-xl text-xs border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold"
                                        placeholder="Monthly SaaS fee"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[8px] font-black text-gray-500 uppercase mb-0.5">Initial Status</label>
                                        <select
                                            value={newInvoice.status}
                                            onChange={e => setNewInvoice({ ...newInvoice, status: e.target.value })}
                                            className="block w-full h-8 px-2 rounded-xl text-xs border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateInvoice}
                                        className="self-end h-8 px-4 bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition"
                                    >
                                        Generate Invoice
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full inline-flex justify-center items-center h-14 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-3xl shadow-lg shadow-orange-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                {t('syncing_node')}
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-6 w-6 mr-2" />
                                {t('commit_node_changes')}
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                            {t('global_impact_tenant')}
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default TenantEditPage;