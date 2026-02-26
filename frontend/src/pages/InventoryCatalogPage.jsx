import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    CubeIcon, 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    TagIcon,
    DocumentTextIcon,
    ShoppingCartIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    HashtagIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Protocol: Debounce hook to ensure high-performance registry filtering.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function InventoryCatalogPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Core Registry State
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI/Operational States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/inventory/', { params: { limit: 1000 } });
            setItems(response.data);
        } catch (err) {
            console.error("Catalog Sync Error:", err);
            setError('Operational Error: Failed to synchronize material database.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const filteredItems = useMemo(() => {
        if (!debouncedSearch) return items;
        const query = debouncedSearch.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
    }, [items, debouncedSearch]);

    const triggerDelete = (item) => {
        if (!canManageCatalog) return;
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/${itemToDelete.id}`);
            toast.success(`Registry entry purged: "${itemToDelete.name}"`);
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Purge protocol failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading && items.length === 0) {
        return <LoadingSpinner text="Accessing Master Catalog Registry..." size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Catalog Header Protocol */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-indigo-600 rounded-2xl">
                            <CubeIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">{t('global_inventory')}</h1>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                                {isSuperuser ? "GLOBAL TECHNICAL ASSET REGISTRY" : "LOCALIZED PROCUREMENT DATABASE"}
                            </p>
                        </div>
                    </div>
                </div>

                {canManageCatalog && (
                    <button 
                        onClick={() => navigate('/inventory/catalog/new')}
                        className="h-14 px-8 bg-gray-900 dark:bg-gray-800 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl transition transform active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none flex items-center gap-2"
                    >
                        <PlusIcon className="h-5 w-5" /> 
                        {t('new_material')}
                    </button>
                )}
            </header>

            {/* Tactical Filtering Terminal */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Material Designation or Specifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] p-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    <span className="text-gray-900 dark:text-gray-100">{filteredItems.length} Materials Indexed</span>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {error}
                </div>
            )}

            {/* Registry Entry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredItems.length > 0 ? filteredItems.map(item => (
                    <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden">
                        
                        {/* Header Node */}
                        <div className="p-8 pb-6 border-b border-gray-50 dark:border-gray-700/50 flex justify-between items-start gap-4">
                            <div className="min-w-0">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.name}
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <HashtagIcon className="h-3.5 w-3.5 text-indigo-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                        Base Unit: <span className="text-gray-900 dark:text-gray-200">{item.unit || 'UNITS'}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <CubeIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>

                        {/* Technical Telemetry Body */}
                        <div className="p-8 flex-grow space-y-6">
                            <div className="flex items-start gap-4">
                                <DocumentTextIcon className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Technical Specs</p>
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                                        {item.description || 'Registry entry contains no supplementary technical specifications.'}
                                    </p>
                                </div>
                            </div>

                            {item.shop_url_1 && (
                                <a 
                                    href={item.shop_url_1} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors"
                                >
                                    <ShoppingBagIcon className="h-3.5 w-3.5" />
                                    Procurement Hub
                                </a>
                            )}
                        </div>

                        {/* Administrative Terminal */}
                        {canManageCatalog && (
                            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => navigate(`/inventory/catalog/edit/${item.id}`)}
                                        className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition transform active:scale-95"
                                        title="Modify Specs"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => triggerDelete(item)}
                                        className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition transform active:scale-95"
                                        title="Purge Entry"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <Link 
                                    to={`/inventory/catalog/edit/${item.id}`}
                                    className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                                >
                                    Registry Hub <ChevronRightIcon className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No registry matches detected</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust search parameters or initialize a new material node.</p>
                    </div>
                )}
            </div>

            {/* Registry Purge Confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteItem}
                title="Purge Catalog Entry"
                message={`CRITICAL: Are you sure you want to permanently remove "${itemToDelete?.name}" from the master catalog? This action affects global procurement availability across all tenant project nodes.`}
                confirmText="PURGE MATERIAL"
                type="danger"
            />
        </div>
    );
}

export default InventoryCatalogPage;