import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    AdjustmentsHorizontalIcon, 
    PlusIcon, 
    TrashIcon, 
    PencilSquareIcon, 
    ShieldCheckIcon,
    BuildingOfficeIcon,
    PhotoIcon,
    FingerPrintIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

function TenantListPage() {
    const { t } = useTranslation();
    const [tenants, setTenants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [tenantToDelete, setTenantToDelete] = useState(null);

    const isSuperuser = currentUser?.is_superuser;

    /**
     * Security Guard: Only Root (Superuser) may access the infrastructure registry.
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error(t('root_auth_required'));
                navigate('/login', { replace: true });
            } else if (!isSuperuser) {
                toast.error(t('access_denied_tenant'));
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

    const fetchTenants = useCallback(async () => {
        if (!isSuperuser) return;
        
        setIsLoading(true);
        setError('');
        try {
            // Using safe limit for technical listing
            const response = await axiosInstance.get('/tenants/', { params: { limit: 100 } });
            setTenants(response.data);
        } catch (err) {
            console.error("Infrastructure Sync Error:", err);
            const errorMsg = err.response?.data?.detail || t('tenant_sync_failed');
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperuser, t]);

    useEffect(() => {
        if (!authIsLoading && isAuthenticated) {
            fetchTenants();
        }
    }, [fetchTenants, authIsLoading, isAuthenticated]);

    const triggerDelete = (tenant) => {
        setTenantToDelete(tenant);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteTenant = async () => {
        if (!tenantToDelete) return;
        try {
            await axiosInstance.delete(`/tenants/${tenantToDelete.id}`);
            toast.success(t('tenant_decommissioned', { name: tenantToDelete.name }));
            fetchTenants(); 
        } catch (err) {
            console.error("Decommission Error:", err);
            toast.error(err.response?.data?.detail || t('node_rejection_linked'));
        } finally {
            setIsDeleteModalOpen(false);
            setTenantToDelete(null);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('authenticating_root')} size="lg" />;
    if (!isSuperuser) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Infrastructure Header */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-orange-600 rounded-xl shadow-lg shadow-orange-100 dark:shadow-none">
                            <AdjustmentsHorizontalIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">{t('tenant_registry_title')}</h1>
                    </div>
                </div>

                <button 
                    onClick={() => navigate('/tenants/new')}
                    className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                >
                    <PlusIcon className="h-5 w-5 mr-1.5" /> 
                    {t('new_tenant')}
                </button>
                </div>
            </header>

            {/* Warning Context for Superusers */}
            <div className="mb-8 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800 flex gap-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 shrink-0" />
                <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                    {t('root_node_protection')}
                </p>
            </div>

            {isLoading ? (
                <LoadingSpinner text={t('syncing_technical_nodes')} />
            ) : error ? (
                <div className="text-center py-20 bg-red-50 text-red-700 rounded-[2.5rem] border border-red-100 font-bold uppercase tracking-widest text-xs">
                    {error}
                </div>
            ) : tenants.length === 0 ? (
                <div className="py-32 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter italic">{t('registry_empty')}</h3>
                    <p className="text-sm text-gray-400 mt-1">{t('no_tenant_nodes')}</p>
                </div>
            ) : (
                /* Technical Data Table */
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="py-5 px-8">{t('identifier')}</th>
                                    <th className="py-5 px-6">{t('company_organization')}</th>
                                    <th className="py-5 px-6">{t('brand_assets')}</th>
                                    <th className="py-5 px-8 text-right">{t('registry_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {tenants.map(tenant => (
                                    <tr key={tenant.id} className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-colors">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                                    <FingerPrintIcon className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <span className="font-mono font-bold text-xs text-gray-500">#{tenant.id}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-600 p-1 flex-shrink-0 shadow-sm">
                                                    <img 
                                                        src={tenant.logo_url || '/default-logo.png'} 
                                                        alt="" 
                                                        className="h-full w-full object-contain grayscale group-hover:grayscale-0 transition-all"
                                                        onError={(e) => { e.target.onerror = null; e.target.src = '/default-logo.png'; }}
                                                    />
                                                </div>
                                                <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{tenant.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <PhotoIcon className="h-3 w-3" /> Logo: <span className="text-indigo-500 truncate max-w-[120px]">{tenant.logo_url ? t('logo_configured') : t('logo_null')}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <AdjustmentsHorizontalIcon className="h-3 w-3" /> UI: <span className="text-indigo-500 truncate max-w-[120px]">{tenant.background_image_url ? t('ui_custom') : t('ui_default')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => navigate(`/tenants/edit/${tenant.id}`)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition"
                                                    title={t('edit_node')}
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button 
                                                    onClick={() => triggerDelete(tenant)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                                    title={t('decommission_node')}
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                                <div className="h-8 w-[1px] bg-gray-100 dark:bg-gray-700 mx-2"></div>
                                                <Link 
                                                    to={`/tenants/edit/${tenant.id}`}
                                                    className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:gap-2 transition-all"
                                                >
                                                    {t('manage')} <ChevronRightIcon className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Root-Level Deletion Confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setTenantToDelete(null); }}
                onConfirm={confirmDeleteTenant}
                title={t('node_decommission_alert')}
                message={t('node_decommission_msg', { name: tenantToDelete?.name })}
                confirmText={t('purge_node')}
                type="danger"
            />
        </div>
    );
}

export default TenantListPage;