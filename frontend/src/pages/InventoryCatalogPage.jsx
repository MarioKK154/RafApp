import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

/**
 * Debounce hook to keep the filtering performance smooth
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
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data States
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI States
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
            setError('Failed to synchronize material database.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    /**
     * Frontend filtering logic for immediate results
     */
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
            toast.success(`Material "${itemToDelete.name}" purged from registry.`);
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to remove material.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading && items.length === 0) {
        return <LoadingSpinner text="Accessing master catalog telemetry..." size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <CubeIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Master Catalog</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global technical asset registry" : "Approved materials database"}
                    </p>
                </div>

                {canManageCatalog && (
                    <button 
                        onClick={() => navigate('/inventory/catalog/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Register Material
                    </button>
                )}
            </header>

            {/* Global Controls */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Material Name or Specifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm outline-none"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4" /> {filteredItems.length} Materials Indexed
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-100">
                    {error}
                </div>
            )}

            {/* Material Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.length > 0 ? filteredItems.map(item => (
                    <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                        
                        {/* Material Branding & Unit */}
                        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-700 flex justify-between items-start">
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                    <TagIcon className="h-3 w-3" />
                                    Base Unit: {item.unit || 'pcs'}
                                </div>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <CubeIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>

                        {/* Description Body */}
                        <div className="p-6 flex-grow">
                            <div className="flex items-start gap-3">
                                <DocumentTextIcon className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                                    {item.description || 'No technical specifications provided for this entry.'}
                                </p>
                            </div>

                            {item.shop_url_1 && (
                                <a 
                                    href={item.shop_url_1} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:gap-2 transition-all"
                                >
                                    <ShoppingCartIcon className="h-3.5 w-3.5" />
                                    Procurement Link
                                </a>
                            )}
                        </div>

                        {/* Management Actions */}
                        {canManageCatalog && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate(`/inventory/catalog/edit/${item.id}`)}
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Edit Specifications"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => triggerDelete(item)}
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Purge Entry"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <Link 
                                    to={`/inventory/catalog/edit/${item.id}`}
                                    className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    Manage <ChevronRightIcon className="h-3 w-3" />
                                </Link>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No Matches Found</h3>
                        <p className="text-sm text-gray-500 mt-1">Adjust your search parameters or register a new material entry.</p>
                    </div>
                )}
            </div>

            {/* Registry Purge Confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteItem}
                title="Purge Catalog Entry"
                message={`Are you sure you want to permanently remove "${itemToDelete?.name}" from the master catalog? This action affects global procurement availability.`}
                confirmText="Purge Material"
                type="danger"
            />
        </div>
    );
}

export default InventoryCatalogPage;