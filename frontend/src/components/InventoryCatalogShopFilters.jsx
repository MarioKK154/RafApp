import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * Multi-select supplier filters for /inventory/catalog API (shops + shop_match).
 * `selected` is a Set of shop ids/names.
 */
export default function InventoryCatalogShopFilters({
    selected,
    onToggleShop,
    shopMatch,
    onShopMatchChange,
}) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isSuperuser = user?.is_superuser;

    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newShopName, setNewShopName] = useState('');
    const [newShopUrl, setNewShopUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchShops = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/shop-catalog/shops');
            setShops(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch global shops:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    const handleAddShopSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = newShopName.trim();
        if (!trimmedName) {
            toast.error("Supplier name is required.");
            return;
        }
        setIsSaving(true);
        try {
            await axiosInstance.post('/shop-catalog/shops', {
                name: trimmedName,
                website_url: newShopUrl.trim() || null,
            });
            toast.success(`Supplier "${trimmedName}" added successfully.`);
            setNewShopName('');
            setNewShopUrl('');
            setIsAdding(false);
            await fetchShops();
        } catch (err) {
            console.error("Failed to create shop:", err);
            toast.error(err.response?.data?.detail || "Failed to add supplier.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {t('catalog_shop_filters', { defaultValue: 'Suppliers' })}
                </p>
                {isSuperuser && !isAdding && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-colors"
                    >
                        <PlusIcon className="h-3 w-3 animate-pulse" /> Add Supplier
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleAddShopSubmit} className="p-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5 animate-in slide-in-from-top duration-200">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">New Supplier Details</div>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Supplier Name *"
                            required
                            disabled={isSaving}
                            value={newShopName}
                            onChange={(e) => setNewShopName(e.target.value)}
                            className="modern-input h-8 text-[11px] px-2.5 rounded-lg"
                        />
                        <input
                            type="url"
                            placeholder="Website URL (optional)"
                            disabled={isSaving}
                            value={newShopUrl}
                            onChange={(e) => setNewShopUrl(e.target.value)}
                            className="modern-input h-8 text-[11px] px-2.5 rounded-lg"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => { setIsAdding(false); setNewShopName(''); setNewShopUrl(''); }}
                            className="p-1 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 rounded border border-gray-200 dark:border-gray-700 transition"
                        >
                            <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1"
                        >
                            {isSaving ? 'Saving...' : <><CheckIcon className="h-3.5 w-3.5" /> Apply</>}
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="text-xs text-gray-400 italic">Loading suppliers...</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {shops.map((shop) => {
                        const shopId = shop.id;
                        const on = selected.has(String(shopId)) || selected.has(shop.name.toLowerCase());
                        
                        let activeColor = 'bg-indigo-600 text-white border-indigo-600';
                        const sName = shop.name.toLowerCase();
                        if (sName.includes('ronning') || sName.includes('rönning')) {
                            activeColor = 'bg-indigo-600 text-white border-indigo-600';
                        } else if (sName.includes('iskraft')) {
                            activeColor = 'bg-emerald-600 text-white border-emerald-600';
                        } else if (sName.includes('reykjafell')) {
                            activeColor = 'bg-amber-600 text-white border-amber-600';
                        }

                        return (
                            <button
                                key={shopId}
                                type="button"
                                onClick={() => onToggleShop(String(shopId))}
                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition ${
                                    on
                                        ? activeColor
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {shop.name}
                            </button>
                        );
                    })}
                </div>
            )}
            
            {selected.size > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        {t('catalog_shop_match', { defaultValue: 'Match' })}
                    </span>
                    <button
                        type="button"
                        onClick={() => onShopMatchChange('any')}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            shopMatch === 'any'
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                        {t('catalog_shop_any', { defaultValue: 'Any shop' })}
                    </button>
                    <button
                        type="button"
                        onClick={() => onShopMatchChange('all')}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            shopMatch === 'all'
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-600'
                        }`}
                        title={t('catalog_shop_all_hint', {
                            defaultValue: 'Only rows linked to every selected supplier (merged)',
                        })}
                    >
                        {t('catalog_shop_all', { defaultValue: 'All shops (merged)' })}
                    </button>
                </div>
            )}
        </div>
    );
}
