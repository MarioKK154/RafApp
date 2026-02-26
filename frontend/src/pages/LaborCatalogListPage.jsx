import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    BanknotesIcon,
    ListBulletIcon,
    TagIcon,
    AdjustmentsHorizontalIcon,
    ArrowLeftIcon,
    WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

/**
 * Formats units to Icelandic Króna (ISK).
 */
const formatCurrencyISK = (value) => {
    if (value === null || value === undefined) return '0 kr.';
    return new Intl.NumberFormat('is-IS', { 
        style: 'currency', 
        currency: 'ISK', 
        maximumFractionDigits: 0 
    }).format(value);
};

function LaborCatalogListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Modal State
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Permissions: Superadmin has global root access to the master labor catalog
    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/labor-catalog/');
            setItems(response.data);
        } catch (err) {
            console.error("Labor catalog fetch error:", err);
            const backendMsg = err.response?.data?.detail;
            const fallback = t('sync_registry_failed');
            const message = backendMsg || fallback;
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => { 
        fetchItems(); 
    }, [fetchItems]);

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/labor-catalog/${itemToDelete.id}`);
            toast.success(`Removed: ${itemToDelete.description}`);
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to purge labor item.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading) return <LoadingSpinner text={t('accessing_service_rates')} />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <ListBulletIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">{t('labor_catalog')}</h1>
                    </div>
                </div>

                {canManageCatalog && (
                    <button 
                        onClick={() => navigate('/labor-catalog/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        {t('new_service')}
                    </button>
                )}
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="h-5 w-5" /> {error}
                </div>
            )}

            {/* Catalog Table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 font-black">
                            <tr>
                                <th className="py-5 px-8">{t('service_description')}</th>
                                <th className="py-5 px-6 text-right">{t('standard_rate')}</th>
                                <th className="py-5 px-6">{t('billing_unit')}</th>
                                {canManageCatalog && <th className="py-5 px-8 text-center">{t('management')}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {items.length > 0 ? items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                                <TagIcon className="h-4 w-4" />
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white">{item.description}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex items-center justify-end gap-1.5 text-indigo-600 dark:text-indigo-400 font-black">
                                            <BanknotesIcon className="h-4 w-4" />
                                            {formatCurrencyISK(item.default_unit_price)}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            {t('per_unit', { unit: item.unit || 'hour' })}
                                        </span>
                                    </td>
                                    {canManageCatalog && (
                                        <td className="py-5 px-8">
                                            <div className="flex justify-center items-center gap-3">
                                                <Link 
                                                    to={`/labor-catalog/edit/${item.id}`} 
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                                    title={t('edit_service_details')}
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </Link>
                                                <button 
                                                    onClick={() => handleDeleteClick(item)} 
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                                    title={t('purge_service')}
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canManageCatalog ? 4 : 3} className="py-20 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <WrenchScrewdriverIcon className="h-12 w-12 text-gray-900 dark:text-white mb-2" />
                                            <p className="text-lg font-black uppercase tracking-tighter italic">{t('registry_empty')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deletion confirmation handled by standardized modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteItem}
                title={t('remove_service_category')}
                message={t('remove_service_confirm', { name: itemToDelete?.description || '' })}
                confirmText={t('purge_service')}
                type="danger"
            />
        </div>
    );
}

export default LaborCatalogListPage;