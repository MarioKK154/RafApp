import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    PaintBrushIcon
} from '@heroicons/react/24/outline';

function TenantCreatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        background_image_url: '',
        background_image_urls: [],
    });
    const [logoFile, setLogoFile] = useState(null);
    const [backgroundFiles, setBackgroundFiles] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = currentUser?.is_superuser;

    /**
     * Security Protocol: Ensure only System Root can initialize new tenant nodes.
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error(t('root_auth_required'));
                navigate('/login', { replace: true });
            } else if (!isSuperuser) {
                toast.error(t('access_denied_root_admins'));
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isSuperuser) return;

        setError('');
        setIsSubmitting(true);

        try {
            const createPayload = { name: formData.name };
            const response = await axiosInstance.post('/tenants/', createPayload);
            const tenantId = response.data.id;

            if (logoFile) {
                const fd = new FormData();
                fd.append('file', logoFile);
                await axiosInstance.post(`/tenants/${tenantId}/upload-logo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            for (let i = 0; i < backgroundFiles.length; i++) {
                const fd = new FormData();
                fd.append('file', backgroundFiles[i]);
                await axiosInstance.post(`/tenants/${tenantId}/upload-background`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            toast.success(`${t('toast_tenant_online')} \"${response.data.name}\" online.`);
            navigate('/tenants');
        } catch (err) {
            console.error('Tenant creation error:', err);
            const errorMsg = err.response?.data?.detail || t('node_rejection_verify');
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('sync_root_credentials')} size="lg" />;
    if (!isAuthenticated || !isSuperuser) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link 
                    to="/tenants" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-orange-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('back_to_tenants')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600 rounded-2xl">
                        <ShieldCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            {t('new_tenant')}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">{t('create_new_isolated_env')}</p>
                    </div>
                </div>
            </div>

            

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Identity Form */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4" /> {t('organization_details')}
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('company_entity_name')}</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder={t('company_name_placeholder')}
                                disabled={isSubmitting}
                                className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold" 
                            />
                        </div>

                        <div className="space-y-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <PaintBrushIcon className="h-4 w-4" /> Visual Identity
                            </h2>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('logo_label')}</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                        <PhotoIcon className="h-5 w-5 text-gray-500" />
                                        <span className="text-xs font-bold">{t('choose_logo_image')}</span>
                                        <input
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.svg,.webp"
                                            className="sr-only"
                                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    {logoFile && <span className="text-xs text-gray-500 dark:text-gray-400">{logoFile.name}</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">{t('background_photos')}</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                        <PhotoIcon className="h-5 w-5 text-gray-500" />
                                        <span className="text-xs font-bold">{t('add_background_images')}</span>
                                        <input
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp"
                                            multiple
                                            className="sr-only"
                                            onChange={(e) => setBackgroundFiles(prev => [...prev, ...(e.target.files ? Array.from(e.target.files) : [])])}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    {backgroundFiles.length > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {backgroundFiles.length} {t('files_selected')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Warning & Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-orange-50 dark:bg-orange-900/10 p-6 md:p-8 rounded-[2rem] border border-orange-100 dark:border-orange-800 space-y-4">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                            <h3 className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none">
                                {t('node_impact')}
                            </h3>
                        </div>
                        <p className="text-[10px] text-orange-600 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                            {t('initializing_new_tenant_impact')}
                        </p>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full inline-flex justify-center items-center h-14 bg-gray-900 dark:bg-orange-600 hover:bg-black dark:hover:bg-orange-700 text-white font-black rounded-3xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                {t('processing_registry_tenant')}
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-2" />
                                {t('create_tenant')}
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default TenantCreatePage;