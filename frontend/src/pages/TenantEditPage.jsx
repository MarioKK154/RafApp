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
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function TenantEditPage() {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Data States
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        background_image_url: '',
        background_image_urls: [],
    });
    const [initialTenantData, setInitialTenantData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                });
            } catch (err) {
                console.error("Infrastructure Sync Error:", err);
                const errorMsg = err.response?.status === 404 ? 'Tenant node not found.' : 'Failed to synchronize node telemetry.';
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

        if (Object.keys(updatePayload).length === 0) {
            toast.info("No modifications detected. Synchronization bypassed.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await axiosInstance.put(`/tenants/${tenantId}`, updatePayload);
            toast.success(`Infrastructure Node "${response.data.name}" updated.`);
            navigate('/tenants');
        } catch (err) {
            console.error("Node Update Error:", err);
            const msg = err.response?.data?.detail || 'Failed to commit node updates.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Accessing Root Node..." size="lg" />;
    if (error && !initialTenantData) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <h2 className="text-xl font-black text-red-600 uppercase tracking-tighter">{error}</h2>
            <Link to="/tenants" className="mt-4 text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest">Return to Registry</Link>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link to="/tenants" className="flex items-center text-xs font-black text-gray-400 hover:text-orange-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-100 dark:shadow-none">
                        <ShieldCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            Configure Node: {initialTenantData?.name}
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
                            <BuildingOfficeIcon className="h-4 w-4" /> Node Identity
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Company / Entity Name*</label>
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

                        <div className="space-y-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <PaintBrushIcon className="h-4 w-4" /> Branding Telemetry
                            </h2>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Logo</label>
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
                                        <span className="text-xs font-bold">{formData.logo_url ? 'Replace logo' : 'Upload logo'}</span>
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
                                                    toast.error(err.response?.data?.detail || 'Logo upload failed.');
                                                }
                                                e.target.value = '';
                                            }}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Background photo(s)</label>
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
                                        <span className="text-xs font-bold">Add background image(s)</span>
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
                                                        toast.error(err.response?.data?.detail || 'Background upload failed.');
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
                </div>

                {/* Right Column: Preview & Actions */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live Preview Card */}
                    <section className="bg-gray-900 p-6 rounded-[2.5rem] border border-gray-800 space-y-4 overflow-hidden shadow-2xl">
                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-center">Live Asset Preview</h3>
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
                        <p className="text-[9px] text-gray-500 text-center font-bold uppercase italic tracking-tighter">Verified Node appearance for tenant users</p>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full inline-flex justify-center items-center h-14 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-3xl shadow-lg shadow-orange-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Syncing Registry...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-6 w-6 mr-2" />
                                Commit Node Changes
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                            Global Impact: Modifications to Logo and Background URLs are cached but will appear immediately upon the next user session initialization.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default TenantEditPage;