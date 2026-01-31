import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    WrenchScrewdriverIcon,
    TagIcon,
    AdjustmentsHorizontalIcon,
    ArrowLeftIcon
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
            setError('Failed to synchronize with the labor registry.');
            toast.error('Could not load service catalog.');
        } finally {
            setIsLoading(false);
        }
    }, []);

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

    if (isLoading) return <LoadingSpinner text="Accessing service rates and catalog..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Labor Catalog</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global master price list" : `Service rates for ${user?.tenant?.name}`}
                    </p>
                </div>

                {canManageCatalog && (
                    <button 
                        onClick={() => navigate('/labor-catalog/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Register Service
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
                                <th className="py-5 px-8">Service Description</th>
                                <th className="py-5 px-6 text-right">Standard Rate</th>
                                <th className="py-5 px-6">Billing Unit</th>
                                {canManageCatalog && <th className="py-5 px-8 text-center">Management</th>}
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
                                            Per {item.unit || 'Hour'}
                                        </span>
                                    </td>
                                    {canManageCatalog && (
                                        <td className="py-5 px-8">
                                            <div className="flex justify-center items-center gap-3">
                                                <Link 
                                                    to={`/labor-catalog/edit/${item.id}`} 
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                                    title="Edit Service Details"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </Link>
                                                <button 
                                                    onClick={() => handleDeleteClick(item)} 
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                                    title="Remove Service"
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
                                            <p className="text-lg font-black uppercase tracking-tighter italic">Registry Empty</p>
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
                title="Remove Service Category"
                message={`Are you sure you want to delete "${itemToDelete?.description}"? This will remove the default pricing for this service type across the company.`}
                confirmText="Purge Service"
                type="danger"
            />
        </div>
    );
}

export default LaborCatalogListPage;