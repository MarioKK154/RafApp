import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    PhoneIcon, 
    EnvelopeIcon, 
    GlobeAltIcon, 
    MapPinIcon,
    BuildingStorefrontIcon,
    UserIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

/**
 * Debounce hook to optimize frontend filtering during rapid typing
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function ShopListPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data States
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Search & Selection States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [shopToDelete, setShopToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageShops = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/shops/', { params: { limit: 1000 } });
            setShops(response.data);
        } catch (err) {
            console.error("Vendor Registry Sync Error:", err);
            setError('Failed to synchronize vendor database.');
            toast.error('Connection to supply chain lost.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchShops(); }, [fetchShops]);

    /**
     * Immediate Frontend Filtering
     */
    const filteredShops = useMemo(() => {
        if (!debouncedSearch) return shops;
        const query = debouncedSearch.toLowerCase();
        return shops.filter(shop =>
            shop.name.toLowerCase().includes(query) ||
            (shop.address && shop.address.toLowerCase().includes(query)) ||
            (shop.contact_person && shop.contact_person.toLowerCase().includes(query))
        );
    }, [shops, debouncedSearch]);

    const triggerDelete = (shop) => {
        if (!canManageShops) return;
        setShopToDelete(shop);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;
        try {
            await axiosInstance.delete(`/shops/${shopToDelete.id}`);
            toast.success(`Vendor "${shopToDelete.name}" purged from registry.`);
            fetchShops();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Purge protocol failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
        }
    };

    if (isLoading && shops.length === 0) {
        return <LoadingSpinner text="Accessing vendor registry..." size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Supply Chain</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global Vendor Management" : "Approved suppliers & procurement endpoints"}
                    </p>
                </div>

                {canManageShops && (
                    <button 
                        onClick={() => navigate('/shops/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Register Vendor
                    </button>
                )}
            </header>

            {/* Controls */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Vendor Name, Contact or Location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4" /> {filteredShops.length} Vendors Indexed
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShops.length > 0 ? filteredShops.map(shop => (
                    <div key={shop.id} className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                        
                        {/* Vendor Name & Status */}
                        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                {shop.name}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <MapPinIcon className="h-3.5 w-3.5" />
                                {shop.address || 'Direct Shipping Only'}
                            </div>
                        </div>

                        {/* Contact Information Body */}
                        <div className="p-6 flex-grow space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Account Manager</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{shop.contact_person || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {shop.phone_number && (
                                    <a href={`tel:${shop.phone_number}`} className="flex-1 flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
                                        <PhoneIcon className="h-4 w-4 text-indigo-500" />
                                        Call
                                    </a>
                                )}
                                {shop.email && (
                                    <a href={`mailto:${shop.email}`} className="flex-1 flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
                                        <EnvelopeIcon className="h-4 w-4 text-indigo-500" />
                                        Email
                                    </a>
                                )}
                            </div>

                            {shop.website && (
                                <a 
                                    href={shop.website.startsWith('http') ? shop.website : `//${shop.website}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block p-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] text-center rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none"
                                >
                                    Visit Digital Storefront
                                </a>
                            )}

                            {shop.notes && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl italic text-xs text-gray-500 dark:text-gray-400 border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 transition-colors">
                                    "{shop.notes}"
                                </div>
                            )}
                        </div>

                        {/* Management Interface */}
                        {canManageShops && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate(`/shops/edit/${shop.id}`)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Modify Registry"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => triggerDelete(shop)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Purge Vendor"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                {isSuperuser && (
                                    <div className="flex items-center gap-1 text-[8px] font-black text-orange-600 uppercase tracking-tighter">
                                        <ShieldCheckIcon className="h-3 w-3" /> Root Control
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <BuildingStorefrontIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Registry Null</h3>
                        <p className="text-sm text-gray-400 mt-1">No vendors match your active search criteria.</p>
                    </div>
                )}
            </div>

            {/* Deletion confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Vendor Entry"
                message={`Permanently remove "${shopToDelete?.name}" from the global supply chain registry? This action cannot be reversed.`}
                confirmText="Purge Record"
                type="danger"
            />
        </div>
    );
}

export default ShopListPage;