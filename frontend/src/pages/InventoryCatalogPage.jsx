import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import InventoryCategoryModal from '../components/InventoryCategoryModal';
import InventoryMergeModal from '../components/InventoryMergeModal';
import InventoryCatalogShopFilters from '../components/InventoryCatalogShopFilters';
import PageHeader from '../components/PageHeader';
import { inventoryDisplayName, inventoryCategoryLine } from '../utils/inventoryI18n';
import {
    CubeIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    MagnifyingGlassIcon,
    TagIcon,
    ChevronRightIcon,
    ShoppingBagIcon,
    ArchiveBoxIcon,
    XMarkIcon,
    ChevronLeftIcon,
    Square3Stack3DIcon,
} from '@heroicons/react/24/outline';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// URL helpers
function enc(v) { return encodeURIComponent(v); }

// Icon colours per level
const MC_COLOURS = [
    'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800 text-indigo-600',
    'bg-violet-50 dark:bg-violet-900/40 border-violet-100 dark:border-violet-800 text-violet-600',
    'bg-sky-50 dark:bg-sky-900/40 border-sky-100 dark:border-sky-800 text-sky-600',
    'bg-teal-50 dark:bg-teal-900/40 border-teal-100 dark:border-teal-800 text-teal-600',
];

function CategoryCard({ title, subtitle, onClick, colourClass, icon: Icon }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-7 flex items-center justify-between text-left w-full"
        >
            <div>
                {subtitle && (
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">{subtitle}</p>
                )}
                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {title}
                </h2>
            </div>
            <div className={`p-3 rounded-2xl border ${colourClass} flex-shrink-0 ml-4`}>
                <Icon className="h-6 w-6" />
            </div>
        </button>
    );
}

function InventoryCatalogPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const baseURL = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    const resolveImageUrl = useCallback((path) => {
        if (!path) return '';
        if (typeof path !== 'string') return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
    }, [baseURL]);

    // --- URL state (3-level navigation) ---
    const sp = new URLSearchParams(location.search);
    const mcKey  = sp.get('mc')  || '';   // master category IS key
    const catKey = sp.get('cat') || '';   // subcategory IS key
    const subKey = sp.get('sub') || '';   // sub-subcategory IS key

    // --- Core state ---
    const [categoryTree, setCategoryTree] = useState([]);
    const [treeLoaded, setTreeLoaded] = useState(false);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [globalSearchItems, setGlobalSearchItems] = useState(null);
    const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
    const [catalogRefreshTrigger, setCatalogRefreshTrigger] = useState(0);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedShops, setSelectedShops] = useState(() => new Set());
    const [shopMatchMode, setShopMatchMode] = useState('any');

    // Superuser bulk ops
    const isSuperuser = user?.is_superuser;
    const canManageCatalog = !!isSuperuser;
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // --- Derived tree lookups ---
    const mcNode    = useMemo(() => categoryTree.find(c => c.category === mcKey), [categoryTree, mcKey]);
    const catNode   = useMemo(() => mcNode?.subcategories?.find(s => s.key === catKey), [mcNode, catKey]);
    const subNode   = useMemo(() => catNode?.subsubcategories?.find(s => s.key === subKey), [catNode, subKey]);

    // Decide if we need to show products:
    // - show products when we have catKey AND (subKey OR catNode has no sub-subcategories)
    const catHasSubsubs = useMemo(() => (catNode?.subsubcategories?.length ?? 0) > 0, [catNode]);
    // Show products when: catKey is set AND (no sub-subs OR a sub-sub is selected)
    // NOTE: catHasSubsubs is async (depends on categoryTree load). We always fetch items
    // when catKey is present and let the render layer decide what to display.
    const showProductsAtCat = !!(catKey && !catHasSubsubs);  // level 3: no sub-subs → show products
    const showProductsAtSub = !!(catKey && subKey);           // level 4: inside a sub-sub

    // --- Shop filter helpers ---
    const shopsKey = useMemo(() => [...selectedShops].sort().join(','), [selectedShops]);
    const toggleShop = useCallback((id) => {
        setSelectedShops(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    const buildCatalogParams = useCallback((base = {}) => {
        const params = { ...base };
        if (shopsKey) { params.shops = shopsKey; params.shop_match = shopMatchMode; }
        return params;
    }, [shopsKey, shopMatchMode]);

    // --- Fetch category tree ---
    const fetchFilters = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/inventory/catalog/filters', { params: { lang: i18n.language } });
            setCategoryTree(res.data || []);
            setTreeLoaded(true);
        } catch (err) {
            console.error('Catalog filters fetch failed:', err);
            setTreeLoaded(true); // mark loaded even on error so UI doesn't hang
        }
    }, [i18n.language]);

    useEffect(() => { fetchFilters(); }, [fetchFilters]);

    // --- Fetch items (only when we need products) ---
    const fetchItems = useCallback(async () => {
        if (!catKey) { setItems([]); return; }  // Only clear when no category selected at all
        setIsLoading(true); setError('');
        try {
            const params = buildCatalogParams({
                limit: 3000,
                master_category: mcKey || undefined,
                category: catKey || undefined,
                ...(subKey ? { subcategory: subKey } : {}),
            });
            const res = await axiosInstance.get('/inventory/catalog', { params });
            setItems(res.data || []);
        } catch (err) {
            console.error('Catalog fetch error:', err);
            setError('Failed to load products.');
            toast.error('Registry sync failed.');
        } finally { setIsLoading(false); }
    }, [buildCatalogParams, mcKey, catKey, subKey]);

    useEffect(() => {
        if (!debouncedSearch.trim()) fetchItems();
    }, [fetchItems, debouncedSearch, shopsKey, shopMatchMode]);

    // --- Global search ---
    useEffect(() => {
        const q = debouncedSearch.trim();
        if (!q) { setGlobalSearchItems(null); setGlobalSearchLoading(false); return; }
        const controller = new AbortController();
        setGlobalSearchLoading(true);
        (async () => {
            try {
                const res = await axiosInstance.get('/inventory/catalog', {
                    params: buildCatalogParams({ search: q, limit: 4000 }),
                    signal: controller.signal,
                });
                setGlobalSearchItems(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                if (controller.signal.aborted || err.code === 'ERR_CANCELED') return;
                toast.error('Search failed.');
                setGlobalSearchItems([]);
            } finally { if (!controller.signal.aborted) setGlobalSearchLoading(false); }
        })();
        return () => controller.abort();
    }, [debouncedSearch, buildCatalogParams, catalogRefreshTrigger]);

    // Reset brand when location changes
    useEffect(() => { setSelectedBrand(null); }, [mcKey, catKey, subKey]);

    // --- Filtered items for product grid ---
    const visibleItems = useMemo(() => {
        return items.filter(item => {
            if (selectedBrand && (item.brand || '').trim() !== selectedBrand) return false;
            return true;
        });
    }, [items, selectedBrand]);

    const brandOptions = useMemo(() => {
        const set = new Set();
        items.forEach(item => { const b = (item.brand || '').trim(); if (b) set.add(b); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [items]);

    // --- Superuser ops ---
    const toggleSelectItem = (id, e) => {
        e.stopPropagation();
        setSelectedItemIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const handleBulkEditCategory = async (payload) => {
        try { await axiosInstance.post('/inventory/catalog/bulk-edit', payload); toast.success('Categories updated.'); setSelectedItemIds(new Set()); fetchFilters(); fetchItems(); }
        catch { toast.error('Failed to update categories.'); }
    };
    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedItemIds.size} items permanently?`)) return;
        try { await axiosInstance.post('/inventory/catalog/bulk-delete', { item_ids: Array.from(selectedItemIds) }); toast.success('Items deleted.'); setSelectedItemIds(new Set()); fetchItems(); }
        catch { toast.error('Failed to delete items.'); }
    };
    const handleMergeItems = async (payload) => {
        try { await axiosInstance.post('/inventory/catalog/merge', payload); toast.success('Merged.'); setSelectedItemIds(new Set()); fetchItems(); }
        catch { toast.error('Failed to merge.'); }
    };
    const triggerDelete = (item) => { if (!canManageCatalog) return; setItemToDelete(item); setIsDeleteModalOpen(true); };
    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try { await axiosInstance.delete(`/inventory/catalog/${itemToDelete.id}`); toast.success(`Purged: "${itemToDelete.name}"`); fetchItems(); setCatalogRefreshTrigger(n => n + 1); }
        catch (err) { toast.error(err.response?.data?.detail || 'Purge failed.'); }
        finally { setIsDeleteModalOpen(false); setItemToDelete(null); }
    };

    // --- Breadcrumbs ---
    const breadcrumbs = useMemo(() => {
        const crumbs = [{ label: t('inventory'), path: '/inventory' }];
        if (mcKey && mcNode) crumbs.push({ label: mcNode.category_display, path: `/inventory?mc=${enc(mcKey)}` });
        if (catKey && catNode) crumbs.push({ label: catNode.label, path: `/inventory?mc=${enc(mcKey)}&cat=${enc(catKey)}` });
        if (subKey && subNode) crumbs.push({ label: subNode.label, path: null });
        return crumbs;
    }, [mcKey, catKey, subKey, mcNode, catNode, subNode, t]);

    const isGlobalSearch = debouncedSearch.trim().length > 0;

    // --- Product card ---
    const renderProductCard = (item) => (
        <div
            key={item.id}
            onClick={() => navigate(`/inventory/edit/${item.id}`)}
            className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden cursor-pointer"
        >
            <div className="h-56 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-50 dark:border-gray-700/50 overflow-hidden relative">
                {isSuperuser && (
                    <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={e => toggleSelectItem(item.id, e)}
                            className="h-6 w-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shadow-sm cursor-pointer" />
                    </div>
                )}
                {item.local_image_path ? (
                    <img src={resolveImageUrl(item.local_image_path)} alt={inventoryDisplayName(item, i18n.language)}
                        loading="lazy" decoding="async" draggable={false}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 will-change-transform"
                        onError={e => { if (e.currentTarget.dataset.fallbackApplied) return; e.currentTarget.dataset.fallbackApplied = '1'; e.currentTarget.src = resolveImageUrl('/static/inventory_images/uncategorized.png'); }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ArchiveBoxIcon className="h-14 w-14 text-gray-300 dark:text-gray-600" />
                    </div>
                )}
            </div>

            <div className="p-7 flex-grow flex flex-col">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate mb-1">
                    {inventoryCategoryLine(item, i18n.language)}
                </p>
                <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {inventoryDisplayName(item, i18n.language)}
                </h2>

                <div className="mt-auto pt-5 flex flex-wrap gap-2">
                    {item.shop_url_1 && (
                        <a href={item.shop_url_1} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors">
                            <ShoppingBagIcon className="h-3.5 w-3.5" /> Ronning
                        </a>
                    )}
                    {item.shop_url_2 && (
                        <a href={item.shop_url_2} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-100 transition-colors">
                            <ShoppingBagIcon className="h-3.5 w-3.5" /> Ískraft
                        </a>
                    )}
                    {item.shop_url_3 && (
                        <a href={item.shop_url_3} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900 hover:bg-amber-100 transition-colors">
                            <ShoppingBagIcon className="h-3.5 w-3.5" /> Reykjafell
                        </a>
                    )}
                </div>
            </div>

            <div className="px-7 py-5 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50" onClick={e => e.stopPropagation()}>
                {canManageCatalog ? (
                    <>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => navigate(`/inventory/edit/${item.id}`)}
                                className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition" title="Edit">
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => triggerDelete(item)}
                                className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <Link to={`/inventory/edit/${item.id}`} className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-2.5 transition-all">
                            Open <ChevronRightIcon className="h-3 w-3" />
                        </Link>
                    </>
                ) : (
                    <Link to={`/inventory/edit/${item.id}`} className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-2.5 transition-all">
                        Open <ChevronRightIcon className="h-3 w-3" />
                    </Link>
                )}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1600px] animate-in fade-in duration-500">
            <PageHeader
                icon={CubeIcon}
                title={t('global_inventory', { defaultValue: 'Hardware & Material Catalog' })}
                subtitle={t('global_inventory_subtitle', { defaultValue: 'SKUs, Electrical Supplies, Wholesale Pricing & Inventory Categories' })}
                stats={[
                    { label: `${filteredItems.length} ${t('items', { defaultValue: 'Items in view' })}`, dotColor: 'bg-green-400 animate-pulse' },
                ]}
                actions={
                    canManageCatalog && (
                        <button onClick={() => navigate('/inventory/new')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/30 transform active:scale-95 cursor-pointer">
                            <PlusIcon className="h-5 w-5" /> {t('new_material')}
                        </button>
                    )
                }
            />

            {/* Search + Shop filters */}
            <div className="mb-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-8 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text"
                        placeholder={t('catalog_search_full_db', { defaultValue: 'Search names, SKU, cable codes across the entire catalog…' })}
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold w-full" />
                </div>
                <div className="xl:col-span-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] p-5 shadow-sm">
                    <InventoryCatalogShopFilters selected={selectedShops} onToggleShop={toggleShop} shopMatch={shopMatchMode} onShopMatchChange={setShopMatchMode} />
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">{error}</div>
            )}

            {/* === GLOBAL SEARCH === */}
            {isGlobalSearch && (
                <>
                    <div className="mb-4 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <button type="button" onClick={() => setSearchTerm('')} className="hover:text-indigo-600 flex items-center gap-1">
                            <ChevronLeftIcon className="h-3 w-3" /> {t('clear_search', { defaultValue: 'Clear search' })}
                        </button>
                        <span className="text-gray-900 dark:text-gray-200">
                            {globalSearchLoading && t('searching')}
                            {!globalSearchLoading && globalSearchItems && `${globalSearchItems.length} ${t('results', { defaultValue: 'results' })}`}
                        </span>
                    </div>
                    {globalSearchLoading && <div className="py-16 flex justify-center"><LoadingSpinner text={t('searching')} size="md" /></div>}
                    {!globalSearchLoading && globalSearchItems && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                            {globalSearchItems.length > 0 ? globalSearchItems.map(item => renderProductCard(item)) : (
                                <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                                    <CubeIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_results')}</h3>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* === LEVEL 1: Master categories === */}
            {!isGlobalSearch && !mcKey && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    {categoryTree.map((node, idx) => (
                        <CategoryCard key={node.category}
                            title={node.category_display || node.category}
                            subtitle={t('category', { defaultValue: 'Category' })}
                            onClick={() => navigate(`/inventory?mc=${enc(node.category)}`)}
                            colourClass={MC_COLOURS[idx % MC_COLOURS.length]}
                            icon={Square3Stack3DIcon} />
                    ))}
                </div>
            )}

            {/* === LEVEL 2: Subcategories of master cat === */}
            {!isGlobalSearch && mcKey && !catKey && (
                <div className="mt-4">
                    <button type="button" onClick={() => navigate('/inventory')}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ChevronLeftIcon className="h-3.5 w-3.5" /> {t('back', { defaultValue: 'Back' })}
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(mcNode?.subcategories || []).map((sub, idx) => (
                            <CategoryCard key={sub.key}
                                title={sub.label}
                                subtitle={t('subcategory', { defaultValue: 'Subcategory' })}
                                onClick={() => navigate(`/inventory?mc=${enc(mcKey)}&cat=${enc(sub.key)}`)}
                                colourClass="bg-amber-50 dark:bg-amber-900/40 border-amber-100 dark:border-amber-800 text-amber-600"
                                icon={TagIcon} />
                        ))}
                    </div>
                </div>
            )}

            {/* === LEVEL 3: Sub-subcategories (if any), else products === */}
            {!isGlobalSearch && mcKey && catKey && !subKey && (
                <div className="mt-4">
                    <button type="button" onClick={() => navigate(`/inventory?mc=${enc(mcKey)}`)}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ChevronLeftIcon className="h-3.5 w-3.5" /> {t('back', { defaultValue: 'Back' })}
                    </button>

                    {/* Loading spinner while items fetch */}
                    {isLoading && <div className="py-16 flex justify-center"><LoadingSpinner text="Loading…" size="md" /></div>}

                    {!isLoading && (
                        <>
                            {/* Tree loaded + has sub-subs → show sub-sub category cards */}
                            {treeLoaded && catHasSubsubs && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                    {(catNode?.subsubcategories || []).map(ss => (
                                        <CategoryCard key={ss.key}
                                            title={ss.label}
                                            subtitle={t('type', { defaultValue: 'Type' })}
                                            onClick={() => navigate(`/inventory?mc=${enc(mcKey)}&cat=${enc(catKey)}&sub=${enc(ss.key)}`)}
                                            colourClass="bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800 text-emerald-600"
                                            icon={CubeIcon} />
                                    ))}
                                </div>
                            )}

                            {/* No sub-subs (confirmed by loaded tree) → show products */}
                            {treeLoaded && !catHasSubsubs && renderProductGrid(visibleItems, brandOptions, selectedBrand, setSelectedBrand, t, renderProductCard)}

                            {/* Tree not yet loaded but items arrived → show products optimistically */}
                            {!treeLoaded && renderProductGrid(visibleItems, brandOptions, selectedBrand, setSelectedBrand, t, renderProductCard)}
                        </>
                    )}
                </div>
            )}

            {/* === LEVEL 4: Products under a sub-subcategory === */}
            {!isGlobalSearch && mcKey && catKey && subKey && (
                <div className="mt-4">
                    <button type="button" onClick={() => navigate(`/inventory?mc=${enc(mcKey)}&cat=${enc(catKey)}`)}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ChevronLeftIcon className="h-3.5 w-3.5" /> {t('back', { defaultValue: 'Back' })}
                    </button>
                    {isLoading && <div className="py-16 flex justify-center"><LoadingSpinner text="Loading…" size="md" /></div>}
                    {!isLoading && renderProductGrid(visibleItems, brandOptions, selectedBrand, setSelectedBrand, t, renderProductCard)}
                </div>
            )}

            {/* === Superuser bulk action bar === */}
            {isSuperuser && selectedItemIds.size > 0 && (
                <div className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl bg-white dark:bg-gray-800 shadow-2xl rounded-full border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-50">
                    <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">{selectedItemIds.size} Selected</span>
                    <div className="flex space-x-3">
                        <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-full">Move / Edit Category</button>
                        {selectedItemIds.size > 1 && <button onClick={() => setIsMergeModalOpen(true)} className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm font-bold rounded-full">Merge</button>}
                        <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-bold rounded-full">Delete</button>
                        <button onClick={() => setSelectedItemIds(new Set())} className="px-3 py-2 text-gray-500 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
                    </div>
                </div>
            )}

            <InventoryCategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} selectedIds={Array.from(selectedItemIds)} onSave={handleBulkEditCategory} />
            <InventoryMergeModal isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)} selectedItems={items.filter(i => selectedItemIds.has(i.id))} onMerge={handleMergeItems} />
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteItem}
                title="Purge Catalog Entry" message={`Delete "${itemToDelete?.name}" permanently?`} confirmText="DELETE" type="danger" />
        </div>
    );
}

// Extracted product grid helper
function renderProductGrid(visibleItems, brandOptions, selectedBrand, setSelectedBrand, t, renderCard) {
    return (
        <>
            {brandOptions.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedBrand(null)}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border transition ${!selectedBrand ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100'}`}>
                        {t('all_brands', { defaultValue: 'All Brands' })}
                    </button>
                    {brandOptions.map(brand => (
                        <button key={brand} type="button" onClick={() => setSelectedBrand(brand)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border transition ${selectedBrand === brand ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 hover:text-indigo-700'}`}>
                            {brand}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>{visibleItems.length} {t('records_indexed', { defaultValue: 'items' })}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleItems.length > 0 ? visibleItems.map(item => renderCard(item)) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No items found</h3>
                    </div>
                )}
            </div>
        </>
    );
}

export default InventoryCatalogPage;