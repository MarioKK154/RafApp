import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { inventoryDisplayDescription, inventoryDisplayName } from '../utils/inventoryI18n';
import { 
    CubeIcon, 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    TagIcon,
    ShoppingCartIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    ShoppingBagIcon,
    ArchiveBoxIcon
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
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const baseURL = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    const resolveImageUrl = useCallback((path) => {
        if (!path) return '';
        if (typeof path !== 'string') return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
    }, [baseURL]);
    const location = useLocation();
    const { user } = useAuth();

    // Core Registry State
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Catalog filters (distinct category/subcategory pairs for the UI)
    const [categoryTree, setCategoryTree] = useState([]);
    
    // UI/Operational States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = !!isSuperuser;

    const fetchItems = useCallback(async (categoryParam, subcategoryParam) => {
        setIsLoading(true);
        setError('');
        try {
            // Align with backend: /inventory/catalog
            const response = await axiosInstance.get('/inventory/catalog', {
                params: {
                    limit: 1000,
                    ...(categoryParam ? { category: categoryParam } : {}),
                    ...(subcategoryParam ? { subcategory: subcategoryParam } : {}),
                },
            });
            setItems(response.data);
        } catch (err) {
            console.error("Catalog Sync Error:", err);
            setError('Operational Error: Failed to synchronize material database.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchFilters = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/inventory/catalog/filters');
            setCategoryTree(res.data || []);
        } catch (err) {
            console.error('Catalog filters fetch failed:', err);
        }
    }, []);

    // Read navigation state from URL (hard navigation via query params)
    const searchParams = new URLSearchParams(location.search);
    const selectedCategory = searchParams.get('category');
    const selectedSubcategory = searchParams.get('subcategory');

    // Reset sub-variant filter when changing category or subcategory
    useEffect(() => {
        setSelectedVariant(null);
    }, [selectedCategory, selectedSubcategory]);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    useEffect(() => {
        // Fetch items for the selected category/subcategory.
        // Without this, the UI can miss categories if the catalog endpoint caps results.
        fetchItems(selectedCategory, selectedSubcategory);
    }, [fetchItems, selectedCategory, selectedSubcategory]);

    // Base items for current category + subcategory (ignores search & variant)
    const baseItems = useMemo(() => {
        if (!selectedCategory || !selectedSubcategory) return [];
        return items.filter((item) => {
            const cat = (item.category || 'Uncategorized').trim();
            const rawSub = (item.subcategory || '').trim();
            const baseSub = rawSub.split('/')[0].trim();
            return cat === selectedCategory && baseSub === selectedSubcategory;
        });
    }, [items, selectedCategory, selectedSubcategory]);

    // Available variants (sub-subcategories) within current subcategory
    const variantOptions = useMemo(() => {
        const set = new Set();
        baseItems.forEach((item) => {
            const rawSub = (item.subcategory || '').trim();
            const parts = rawSub.split('/').map(p => p.trim()).filter(Boolean);
            if (parts.length > 1) {
                const variant = parts.slice(1).join(' / ');
                if (variant) set.add(variant);
            }
        });
        return Array.from(set).sort();
    }, [baseItems]);

    // Final visible items with search + optional variant filter applied
    const visibleItems = useMemo(() => {
        if (!selectedCategory || !selectedSubcategory) return [];
        const query = debouncedSearch ? debouncedSearch.toLowerCase() : '';

        return baseItems.filter((item) => {
            const rawSub = (item.subcategory || '').trim();
            const parts = rawSub.split('/').map(p => p.trim()).filter(Boolean);
            const variant = parts.length > 1 ? parts.slice(1).join(' / ') : null;

            if (selectedVariant && variant !== selectedVariant) return false;

            if (!query) return true;
            const nameMatch = item.name?.toLowerCase().includes(query)
                || item.name_en?.toLowerCase().includes(query);
            const descMatch = item.description?.toLowerCase().includes(query)
                || item.description_en?.toLowerCase().includes(query);
            return nameMatch || descMatch;
        });
    }, [baseItems, debouncedSearch, selectedCategory, selectedSubcategory, selectedVariant]);

    const triggerDelete = (item) => {
        if (!canManageCatalog) return;
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/catalog/${itemToDelete.id}`);
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

    const hasCategory = !!selectedCategory;
    const hasSubcategory = !!selectedSubcategory;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Catalog Header Protocol */}
            <header className="mb-6">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <CubeIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('global_inventory')}</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1">
                                {!hasCategory && !hasSubcategory && 'Select a category to drill down.'}
                                {hasCategory && !hasSubcategory && `Category: ${selectedCategory}`}
                                {hasCategory && hasSubcategory && `Category: ${selectedCategory} / ${selectedSubcategory}`}
                            </p>
                        </div>
                    </div>
                    {canManageCatalog && (
                        <button
                            onClick={() => navigate('/inventory/new')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('new_material')}
                        </button>
                    )}
                </div>
            </header>

            {/* Global search (kept for quick lookup) */}
            <div className="mb-6 max-w-xl relative group">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search by Material Designation or Specifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                />
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {error}
                </div>
            )}

            {/* LEVEL 1: Category Grid */}
            {!hasCategory && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {categoryTree.map(({ category }) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => navigate(`/inventory?category=${encodeURIComponent(category)}`)}
                            className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-8 flex items-center justify-between"
                        >
                            <div className="text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                    {t('category') || 'Category'}
                                </p>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                    {category}
                                </h2>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                <TagIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* LEVEL 2: Subcategory Grid */}
            {hasCategory && !hasSubcategory && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/inventory')}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-1 hover:text-indigo-600"
                    >
                        ← {t('back', { defaultValue: 'Back to categories' })}
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryTree
                            .find(c => c.category === selectedCategory)?.subcategories
                            .map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => navigate(`/inventory?category=${encodeURIComponent(selectedCategory)}&subcategory=${encodeURIComponent(sub)}`)}
                                    className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-8 flex items-center justify-between"
                                >
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                            {t('subcategory') || 'Subcategory'}
                                        </p>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                            {sub}
                                        </h2>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/40 rounded-2xl border border-amber-100 dark:border-amber-800">
                                        <CubeIcon className="h-6 w-6 text-amber-600" />
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* LEVEL 3: Item Grid for selected category + subcategory */}
            {hasCategory && hasSubcategory && (
                <>
                    <div className="mt-2 mb-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <button
                            type="button"
                            onClick={() => navigate(`/inventory?category=${encodeURIComponent(selectedCategory)}`)}
                            className="hover:text-indigo-600 flex items-center gap-1"
                        >
                            ← {t('back', { defaultValue: 'Back to subcategories' })}
                        </button>
                        <span>
                            {visibleItems.length} {t('records_indexed', { defaultValue: 'Items in subcategory' })}
                        </span>
                    </div>

                    {variantOptions.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedVariant(null)}
                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border transition ${
                                    !selectedVariant
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {t('all', { defaultValue: 'All types' })}
                            </button>
                            {variantOptions.map((variant) => (
                                <button
                                    key={variant}
                                    type="button"
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border transition ${
                                        selectedVariant === variant
                                            ? 'bg-emerald-500 text-white border-emerald-600'
                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                >
                                    {variant}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {visibleItems.length > 0 ? visibleItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/inventory/edit/${item.id}`)}
                        className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden cursor-pointer"
                    >
                        <div className="h-64 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-50 dark:border-gray-700/50 overflow-hidden">
                            {item.local_image_path ? (
                                <img
                                    src={resolveImageUrl(item.local_image_path)}
                                    alt={inventoryDisplayName(item, i18n.language)}
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 will-change-transform"
                                    onError={(e) => {
                                        if (e.currentTarget.dataset.fallbackApplied) return;
                                        e.currentTarget.dataset.fallbackApplied = '1';
                                        e.currentTarget.src = resolveImageUrl('/static/inventory_images/uncategorized.png');
                                    }}
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

                        {/* Bottom Actions */}
                        <div
                            className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {canManageCatalog ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => navigate(`/inventory/edit/${item.id}`)}
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
                                        to={`/inventory/edit/${item.id}`}
                                        className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                                    >
                                        Registry Hub <ChevronRightIcon className="h-3.5 w-3.5" />
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    to={`/inventory/edit/${item.id}`}
                                    className="ml-auto flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                                >
                                    Open Item <ChevronRightIcon className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No registry matches detected</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{t('adjust_filters_or_new_material')}</p>
                    </div>
                )}
                    </div>
                </>
            )}

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