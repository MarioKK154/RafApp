import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { inventoryDisplayName } from '../utils/inventoryI18n';
import { 
    CircleStackIcon, 
    MagnifyingGlassIcon, 
    PlusIcon, 
    ChevronRightIcon,
    CubeIcon,
    AdjustmentsHorizontalIcon,
    ShoppingCartIcon,
    ArchiveBoxIcon,
    ShoppingBagIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';

function GlobalInventoryPage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);
    const baseURL = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    const resolveImageUrl = useCallback((path) => {
        if (!path) return '';
        if (typeof path !== 'string') return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
    }, [baseURL]);

    /**
     * Protocol: Synchronize with /inventory/catalog registry
     */
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            // FIXED: Path synchronized with backend router @router.get("/catalog")
            const response = await axiosInstance.get('/inventory/catalog', { 
                params: { search: searchTerm, limit: 1000 } 
            });
            setItems(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Registry sync failure:', error);
            toast.error(t('error_loading_inventory', { defaultValue: 'Connection to registry lost.' }));
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]); // `t` is intentionally omitted to avoid re-fetching on every render

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    if (isLoading && items.length === 0) return <LoadingSpinner text={t('syncing')} />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="mb-12">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <CircleStackIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('inventory')}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/shopping-list"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            <ShoppingCartIcon className="h-5 w-5" /> {t('shopping_list', { defaultValue: 'Procurement' })}
                        </Link>
                        {canManageInventory && (
                            <Link
                                to="/inventory/new"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95"
                            >
                                <PlusIcon className="h-5 w-5" /> {t('create_new')}
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Tactical Filtering Terminal */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    <span className="text-gray-900 dark:text-gray-100">{items.length} SKUs Active</span>
                </div>
            </div>

            {/* Registry Grid — same card layout as category catalog drill-down */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {items.length > 0 ? items.map(item => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/inventory/edit/${item.id}`)}
                        className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden cursor-pointer animate-in zoom-in-95 duration-300"
                    >
                        <div className="h-64 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-50 dark:border-gray-700/50 overflow-hidden">
                            {item.local_image_path ? (
                                <img
                                    src={resolveImageUrl(item.local_image_path)}
                                    alt={inventoryDisplayName(item, i18n.language)}
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                    onError={(e) => {
                                        if (e.currentTarget.dataset.fallbackApplied) return;
                                        e.currentTarget.dataset.fallbackApplied = '1';
                                        e.currentTarget.src = resolveImageUrl('/static/inventory_images/uncategorized.png');
                                    }}
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 will-change-transform"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ArchiveBoxIcon className="h-14 w-14 text-gray-300 dark:text-gray-600" />
                                </div>
                            )}
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {inventoryDisplayName(item, i18n.language)}
                            </h2>

                            <div className="mt-auto pt-6">
                                <div className="flex flex-wrap gap-2">
                                    {item.shop_url_1 && (
                                        <a
                                            href={item.shop_url_1}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors"
                                        >
                                            <ShoppingBagIcon className="h-3.5 w-3.5" />
                                            Ronning
                                        </a>
                                    )}
                                    {item.shop_url_2 && (
                                        <a
                                            href={item.shop_url_2}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-100 transition-colors"
                                        >
                                            <ShoppingBagIcon className="h-3.5 w-3.5" />
                                            Iskraft
                                        </a>
                                    )}
                                    {item.shop_url_3 && (
                                        <a
                                            href={item.shop_url_3}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900 hover:bg-amber-100 transition-colors"
                                        >
                                            <ShoppingBagIcon className="h-3.5 w-3.5" />
                                            Reykjavell
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {canManageInventory ? (
                                <div className="flex w-full items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/inventory/edit/${item.id}`)}
                                        className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition transform active:scale-95"
                                        title={t('edit')}
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <Link
                                        to={`/inventory/edit/${item.id}`}
                                        className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                                    >
                                        {t('edit')} <ChevronRightIcon className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            ) : (
                                <Link
                                    to={`/inventory/edit/${item.id}`}
                                    className="ml-auto flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                                >
                                    {t('open', { defaultValue: 'Open item' })} <ChevronRightIcon className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_data')}</h3>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GlobalInventoryPage;