import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    ShieldCheckIcon,
    ArrowTopRightOnSquareIcon,
    NoSymbolIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Debounce Hook: Optimizes UI responsiveness during registry searches
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Registry Data States
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Search & Protocol States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [shopToDelete, setShopToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageShops = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Protocol: Synchronize Vendor Registry with Backend
     */
    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/shops/', { params: { limit: 1000 } });
            setShops(response.data);
        } catch (err) {
            console.error("Vendor Registry Sync Error:", err);
            setError(t('vendor_sync_failed', { defaultValue: 'Failed to synchronize vendor database.' }));
            toast.error(t('connection_lost', { defaultValue: 'Connection to supply chain lost.' }));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchShops(); }, [fetchShops]);

    /**
     * Operational logic: Multi-vector frontend filtering
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
            toast.success(t('vendor_purged', { defaultValue: `Vendor "${shopToDelete.name}" purged from registry.`, name: shopToDelete.name }));
            fetchShops();
        } catch (err) {
            toast.error(err.response?.data?.detail || t('purge_failed', { defaultValue: 'Purge protocol failed.' }));
        } finally {
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
        }
    };

    if (isLoading && shops.length === 0) {
        return <LoadingSpinner text={t('syncing')} size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header: Identity & Procurement Actions */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight italic">
                            {t('vendors', { defaultValue: 'Vendors' })}
                        </h1>
                    </div>
                </div>

                {canManageShops && (
                    <button 
                        onClick={() => navigate('/shops/new')}
                        className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4 stroke-[3px]" /> 
                        {t('create_new')}
                    </button>
                )}
                </div>
            </header>

            {/* Tactical Control Console */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    {filteredShops.length} {t('records_indexed', { defaultValue: 'Nodes Indexed' })}
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-2">
                    <NoSymbolIcon className="h-4 w-4" /> {error}
                </div>
            )}

            {/* Procurement Node Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShops.length > 0 ? filteredShops.map(shop => (
                    <div key={shop.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        {/* Node Identity */}
                        <div className="p-8 pb-6 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                {shop.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <MapPinIcon className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="truncate">{shop.address || t('direct_shipping', { defaultValue: 'Direct Logistics Only' })}</span>
                            </div>
                        </div>

                        {/* Telemetry Body: Contacts */}
                        <div className="p-8 flex-grow space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1.5">{t('account_manager', { defaultValue: 'Account Lead' })}</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{shop.contact_person || '---'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                {shop.phone_number && (
                                    <a href={`tel:${shop.phone_number}`} className="flex-1 flex items-center justify-center gap-2 h-11 bg-gray-50 dark:bg-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 rounded-xl transition-all">
                                        <PhoneIcon className="h-4 w-4" />
                                        {t('call', { defaultValue: 'Call' })}
                                    </a>
                                )}
                                {shop.email && (
                                    <a href={`mailto:${shop.email}`} className="flex-1 flex items-center justify-center gap-2 h-11 bg-gray-50 dark:bg-gray-700 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 rounded-xl transition-all">
                                        <EnvelopeIcon className="h-4 w-4" />
                                        {t('email', { defaultValue: 'Email' })}
                                    </a>
                                )}
                            </div>

                            {shop.website && (
                                <a 
                                    href={shop.website.startsWith('http') ? shop.website : `//${shop.website}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full h-12 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none"
                                >
                                    <GlobeAltIcon className="h-4 w-4" />
                                    {t('visit_website', { defaultValue: 'Digital Storefront' })}
                                    <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-50" />
                                </a>
                            )}

                            {shop.notes && (
                                <div className="mt-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-l-4 border-indigo-500 italic text-[11px] text-gray-500 dark:text-gray-400 group-hover:bg-indigo-50/30 transition-colors">
                                    "{shop.notes}"
                                </div>
                            )}
                        </div>

                        {/* Root Administrative Command Strip */}
                        {canManageShops && (
                            <div className="px-8 py-5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate(`/shops/edit/${shop.id}`)} 
                                        className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition hover:scale-110"
                                        title={t('edit')}
                                    >
                                        <PencilIcon className="h-4 w-4 stroke-[2.5px]" />
                                    </button>
                                    <button 
                                        onClick={() => triggerDelete(shop)} 
                                        className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition hover:scale-110"
                                        title={t('delete')}
                                    >
                                        <TrashIcon className="h-4 w-4 stroke-[2.5px]" />
                                    </button>
                                </div>
                                {isSuperuser && (
                                    <div className="flex items-center gap-1 text-[8px] font-black text-orange-600 uppercase tracking-tighter opacity-60">
                                        <ShieldCheckIcon className="h-3 w-3" /> {t('root_control', { defaultValue: 'Root Control' })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <div className="inline-flex p-6 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                            <BuildingStorefrontIcon className="h-12 w-12 text-gray-200" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_data')}</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{t('adjust_filters')}</p>
                    </div>
                )}
            </div>

            {/* Confirmation: Purge Node */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('purge_vendor', { defaultValue: 'Decommission Vendor node' })}
                message={t('purge_vendor_msg', { 
                    defaultValue: `CRITICAL: Permanently remove "${shopToDelete?.name}" from the global supply chain registry? This node deletion is irreversible.`,
                    name: shopToDelete?.name 
                })}
                confirmText={t('delete')}
                type="danger"
            />
        </div>
    );
}

export default ShopListPage;