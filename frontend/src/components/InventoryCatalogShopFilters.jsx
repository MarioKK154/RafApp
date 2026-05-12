import React from 'react';
import { useTranslation } from 'react-i18next';

const SHOP_DEFS = [
    { id: 'ronning', label: 'Ronning', active: 'bg-indigo-600 text-white border-indigo-600' },
    { id: 'iskraft', label: 'Ískraft', active: 'bg-emerald-600 text-white border-emerald-600' },
    { id: 'reykjafell', label: 'Reykjafell', active: 'bg-amber-600 text-white border-amber-600' },
];

/**
 * Multi-select supplier filters for /inventory/catalog API (shops + shop_match).
 * `selected` is a Set of shop ids: ronning | iskraft | reykjafell
 */
export default function InventoryCatalogShopFilters({
    selected,
    onToggleShop,
    shopMatch,
    onShopMatchChange,
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {t('catalog_shop_filters', { defaultValue: 'Suppliers' })}
            </p>
            <div className="flex flex-wrap gap-2">
                {SHOP_DEFS.map(({ id, label, active }) => {
                    const on = selected.has(id);
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onToggleShop(id)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition ${
                                on
                                    ? active
                                    : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
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
