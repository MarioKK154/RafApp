// frontend/src/pages/ShopCatalogPage.jsx
// F3: Global Material Shop Price Catalog — compare prices across suppliers per inventory item.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    BuildingStorefrontIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    ArrowTopRightOnSquareIcon,
    GlobeAltIcon,
    TagIcon,
    CurrencyDollarIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const formatISK = (v) =>
    v == null
        ? '—'
        : new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(v);

// Debounce hook
function useDebounce(value, delay) {
    const [deb, setDeb] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDeb(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return deb;
}

// ── Inline price cell ───────────────────────────────────────────────────────────
function PriceCell({ shopId, itemId, existing, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [price, setPrice] = useState(existing?.price ?? '');
    const [sku, setSku] = useState(existing?.sku ?? '');
    const [saving, setSaving] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        setPrice(existing?.price ?? '');
        setSku(existing?.sku ?? '');
    }, [existing]);

    const save = async () => {
        setSaving(true);
        try {
            await axiosInstance.put(
                `/api/shop-catalog/shops/${shopId}/items/${itemId}/price`,
                { price: price !== '' ? parseFloat(price) : null, sku: sku || null }
            );
            onSaved();
            setEditing(false);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to save price');
        } finally {
            setSaving(false);
        }
    };

    const clear = async () => {
        setSaving(true);
        try {
            await axiosInstance.delete(`/api/shop-catalog/shops/${shopId}/items/${itemId}/price`);
            onSaved();
            setEditing(false);
        } catch (e) {
            toast.error('Failed to clear price');
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <div ref={ref} className="flex flex-col gap-1 min-w-[120px]">
                <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="Price ISK"
                    className="w-full px-2 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                    autoFocus
                />
                <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="SKU (optional)"
                    className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <div className="flex gap-1 mt-0.5">
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold transition"
                    >
                        {saving ? <span className="animate-spin h-2 w-2 border border-white border-t-transparent rounded-full" /> : <CheckIcon className="h-3 w-3" />}
                        Save
                    </button>
                    {existing && (
                        <button
                            onClick={clear}
                            disabled={saving}
                            className="px-1.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 text-red-600 rounded-md text-[10px] transition"
                        >
                            <TrashIcon className="h-3 w-3" />
                        </button>
                    )}
                    <button
                        onClick={() => setEditing(false)}
                        className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-[10px] transition"
                    >
                        <XMarkIcon className="h-3 w-3" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setEditing(true)}
            className={`group flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition w-full justify-between
                ${existing?.price != null
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:border-emerald-400'
                    : 'border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'
                }`}
        >
            <span className="font-semibold">
                {existing?.price != null ? formatISK(existing.price) : '+ Add price'}
            </span>
            {existing?.sku && <span className="text-[9px] text-gray-400 font-mono">{existing.sku}</span>}
            <PencilIcon className="h-3 w-3 opacity-0 group-hover:opacity-70 flex-shrink-0 transition" />
        </button>
    );
}

// ── Add shop modal ───────────────────────────────────────────────────────────────
function AddShopModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axiosInstance.post('/api/shop-catalog/shops', { name, website_url: url || null });
            toast.success(`Shop "${res.data.name}" added!`);
            onCreated(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create shop');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600">
                    <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="h-5 w-5 text-white" />
                        <h2 className="text-sm font-black text-white">Add New Shop</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-indigo-200 hover:text-white rounded-lg transition">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Shop Name *</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Pólar"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Website URL</label>
                        <div className="relative">
                            <GlobeAltIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="url"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://example.is"
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm transition disabled:opacity-50">
                            {saving ? '...' : 'Add Shop'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────────
export default function ShopCatalogPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isSuperuser = user?.is_superuser;

    const [shops, setShops] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [categories, setCategories] = useState([]);
    const [showAddShop, setShowAddShop] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 50;

    const debouncedSearch = useDebounce(search, 400);

    const fetchShops = useCallback(async () => {
        try {
            const r = await axiosInstance.get('/api/shop-catalog/shops');
            setShops(r.data || []);
        } catch { /* silently fail */ }
    }, []);

    const fetchItems = useCallback(async (resetSkip = false) => {
        const currentSkip = resetSkip ? 0 : skip;
        if (resetSkip) setSkip(0);
        setLoading(true);
        try {
            const params = new URLSearchParams({ skip: currentSkip, limit: LIMIT });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (categoryFilter) params.set('category', categoryFilter);
            const r = await axiosInstance.get(`/api/shop-catalog/items?${params}`);
            const data = r.data || [];
            if (resetSkip) {
                setItems(data);
            } else {
                setItems(prev => [...prev, ...data]);
            }
            setHasMore(data.length === LIMIT);

            // Extract unique categories for filter
            if (resetSkip && !categoryFilter && !debouncedSearch) {
                const cats = [...new Set(data.map(i => i.category).filter(Boolean))].sort();
                if (cats.length) setCategories(cats);
            }
        } catch (e) {
            toast.error('Failed to load items');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, categoryFilter, skip]);

    useEffect(() => { fetchShops(); }, [fetchShops]);
    useEffect(() => { fetchItems(true); }, [debouncedSearch, categoryFilter]);

    const handlePriceRefresh = () => fetchItems(true);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Page header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
                <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                            <BuildingStorefrontIcon className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Shop Price Catalog</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Compare material prices across {shops.length} supplier{shops.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search items…"
                                className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm w-56"
                            />
                        </div>
                        {/* Category filter */}
                        {categories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <button
                            onClick={() => fetchItems(true)}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition"
                            title="Refresh"
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                        </button>
                        {isSuperuser && (
                            <button
                                onClick={() => setShowAddShop(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Add Shop
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Shop chips */}
            {shops.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-3">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">Shops:</span>
                        {shops.map(shop => (
                            <a
                                key={shop.id}
                                href={shop.website_url || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition
                                    ${shop.website_url
                                        ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer'
                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-default'
                                    }`}
                            >
                                <BuildingStorefrontIcon className="h-3 w-3" />
                                {shop.name}
                                {shop.website_url && <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5 opacity-60" />}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Main price comparison table */}
            <div className="max-w-screen-2xl mx-auto px-6 py-6">
                {loading && items.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <BuildingStorefrontIcon className="h-16 w-16 mb-4 opacity-30" />
                        <p className="text-lg font-semibold">No items found</p>
                        <p className="text-sm">Try adjusting your search or category filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-4 text-left text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest min-w-[200px]">
                                        Item
                                    </th>
                                    <th className="px-3 py-4 text-left text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                                        Category
                                    </th>
                                    <th className="px-3 py-4 text-left text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                                        Unit
                                    </th>
                                    {shops.map(shop => (
                                        <th key={shop.id} className="px-3 py-4 text-center text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest min-w-[130px]">
                                            <div className="flex items-center justify-center gap-1">
                                                <BuildingStorefrontIcon className="h-3.5 w-3.5" />
                                                {shop.name}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-3 py-4 text-center text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest min-w-[80px]">
                                        Best
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                {items.map(item => {
                                    // Build price lookup: shopId → ShopItemPriceRead
                                    const priceByShop = {};
                                    (item.shop_prices || []).forEach(p => { priceByShop[p.shop_id] = p; });

                                    // Find best (lowest) price
                                    const nonNullPrices = (item.shop_prices || [])
                                        .filter(p => p.price != null)
                                        .map(p => p.price);
                                    const bestPrice = nonNullPrices.length ? Math.min(...nonNullPrices) : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <TagIcon className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-xs leading-tight">
                                                            {item.name}
                                                        </p>
                                                        {item.name_en && item.name_en !== item.name && (
                                                            <p className="text-[10px] text-gray-400">{item.name_en}</p>
                                                        )}
                                                        {item.brand && (
                                                            <p className="text-[10px] text-gray-400">{item.brand}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                                                {item.category || '—'}
                                                {item.subcategory && (
                                                    <div className="text-[10px] text-gray-400">{item.subcategory}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                                {item.unit || '—'}
                                            </td>
                                            {shops.map(shop => {
                                                const existing = priceByShop[shop.id];
                                                const isBest = existing?.price != null && existing.price === bestPrice && nonNullPrices.length > 1;
                                                return (
                                                    <td key={shop.id} className={`px-3 py-3 ${isBest ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                                        <PriceCell
                                                            shopId={shop.id}
                                                            itemId={item.id}
                                                            existing={existing}
                                                            onSaved={handlePriceRefresh}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center">
                                                {bestPrice != null && nonNullPrices.length > 1 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-full">
                                                        {formatISK(bestPrice)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Load more */}
                        {hasMore && (
                            <div className="flex justify-center py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <button
                                    onClick={() => {
                                        setSkip(prev => prev + LIMIT);
                                        fetchItems(false);
                                    }}
                                    disabled={loading}
                                    className="px-6 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition disabled:opacity-50"
                                >
                                    {loading ? 'Loading…' : 'Load more items'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddShop && (
                <AddShopModal
                    onClose={() => setShowAddShop(false)}
                    onCreated={(newShop) => {
                        setShops(prev => [...prev, newShop]);
                        setShowAddShop(false);
                    }}
                />
            )}
        </div>
    );
}
