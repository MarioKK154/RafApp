import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import CreateOfferFromCatalogModal from '../components/CreateOfferFromCatalogModal';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    BanknotesIcon,
    ListBulletIcon,
    TagIcon,
    WrenchScrewdriverIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    FolderIcon,
    FolderOpenIcon,
    DocumentPlusIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

/** Format a decimal eining value: 1.25 → "1.250 ein." */
const formatEining = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (isNaN(n)) return '—';
    return `${n.toFixed(2)} ein.`;
};

/** Format ISK/eining rate */
const formatISKRate = (value) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('is-IS', {
        style: 'currency',
        currency: 'ISK',
        maximumFractionDigits: 0,
    }).format(value) + '/ein.';
};

/** ar.is Eining: standard hours → time per unit. 0 = hourly rate; positive = u * 60 min per unit */
function einingDurationLabel(unitsPerHour) {
    if (unitsPerHour == null) return null;
    const u = Number(unitsPerHour);
    if (u === 0) return 'Hourly rate';
    if (u < 0) return null;
    const minPerUnit = u * 60;
    if (minPerUnit >= 60) {
        const hrs = minPerUnit / 60;
        return hrs >= 1 && Math.abs(hrs - Math.round(hrs)) < 0.01 ? `${Math.round(hrs)} hr` : `${hrs.toFixed(1)} hr`;
    }
    if (minPerUnit >= 1) {
        return minPerUnit >= 10 && Math.abs(minPerUnit - Math.round(minPerUnit)) < 0.1
            ? `${Math.round(minPerUnit)} min`
            : `${minPerUnit.toFixed(1)} min`;
    }
    return '< 1 min';
}

/** Full label for list: "Eining: X ein. (Y)" so values match ar.is standard labels */
function einingFullLabel(unitsPerHour) {
    if (unitsPerHour == null) return null;
    const u = Number(unitsPerHour);
    if (u === 0) return 'Eining: hourly rate';
    if (u < 0) return null;
    const timeLabel = einingDurationLabel(u);
    return timeLabel ? `${u.toFixed(2)} ein. (${timeLabel})` : null;
}

function LaborCatalogListPage() {
    const { t, i18n } = useTranslation();
    const apiLang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'is';
    const navigate = useNavigate();
    const { user } = useAuth();

    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [expandedMain, setExpandedMain] = useState(null);
    const [selectedMain, setSelectedMain] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [error, setError] = useState('');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importUpdateExisting, setImportUpdateExisting] = useState(false);
    const [tenantBasePriceInput, setTenantBasePriceInput] = useState('');
    const [applyingBasePrice, setApplyingBasePrice] = useState(false);
    const [modifiers, setModifiers] = useState([]);
    // F2: offer creation from catalog
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    
    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);
    const canImportAndCreate = isSuperuser;
    const canExportData = user?.can_export_data || user?.role === 'admin' || isSuperuser;

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        setError('');
        try {
            const res = await axiosInstance.get('/labor-catalog/categories', { params: { lang: apiLang } });
            setCategories(res.data || []);
        } catch (err) {
            console.error('Categories fetch error:', err);
            setError(err.response?.data?.detail || t('sync_registry_failed'));
            toast.error(err.response?.data?.detail || 'Failed to load categories.');
        } finally {
            setCategoriesLoading(false);
        }
    }, [t, apiLang]);

    const fetchItems = useCallback(async (mainCat, subCat) => {
        setItemsLoading(true);
        setError('');
        try {
            const params = { limit: 5000, lang: apiLang };
            if (mainCat != null) params.main_category = mainCat === '' ? '' : mainCat;
            if (subCat != null) params.sub_category = subCat === '' ? '' : subCat;
            const res = await axiosInstance.get('/labor-catalog/', { params });
            setItems(res.data || []);
        } catch (err) {
            console.error('Labor catalog fetch error:', err);
            setError(err.response?.data?.detail || t('sync_registry_failed'));
            toast.error(err.response?.data?.detail || 'Failed to load items.');
            setItems([]);
        } finally {
            setItemsLoading(false);
        }
    }, [t, apiLang]);

    useEffect(() => {
        fetchCategories();
        // Fetch modifiers
        axiosInstance.get('/labor-catalog/modifiers').then(res => setModifiers(res.data)).catch(console.error);
        // Fetch tenant base rate
        if (user?.tenant_id) {
            axiosInstance.get(`/tenants/${user.tenant_id}`).then(res => {
                if (res.data.base_hourly_rate) setTenantBasePriceInput(String(res.data.base_hourly_rate));
            }).catch(console.error);
        }
    }, [fetchCategories, user]);

    // First paint: nothing loads until both main + sub are chosen — users see an empty list.
    // Auto-select the first subcategory when categories arrive so the catalog is visible immediately.
    useEffect(() => {
        if (categoriesLoading || categories.length === 0) return;
        if (selectedMain !== null && selectedSub !== null) return;
        const first = categories[0];
        const mainKey = first.main_category ?? '';
        const subs = first.sub_categories || [];
        if (subs.length === 0) return;
        const subKey = subs[0].sub_category ?? '';
        setExpandedMain(mainKey);
        setSelectedMain(mainKey);
        setSelectedSub(subKey);
    }, [categories, categoriesLoading, selectedMain, selectedSub]);

    useEffect(() => {
        if (selectedMain !== null && selectedSub !== null) {
            fetchItems(selectedMain, selectedSub);
        } else {
            setItems([]);
        }
    }, [selectedMain, selectedSub, fetchItems]);

    const handleSelectSub = (mainCat, subCat) => {
        setSelectedMain(mainCat);
        setSelectedSub(subCat);
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/labor-catalog/${itemToDelete.id}`);
            toast.success(`Removed: ${itemToDelete.description}`);
            fetchCategories();
            if (selectedMain !== null && selectedSub !== null) {
                fetchItems(selectedMain, selectedSub);
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to purge labor item.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const selectedLabel = () => {
        if (selectedMain === null || selectedSub === null) return null;
        const main = categories.find((c) => (c.main_category || '') === (selectedMain || ''));
        if (!main) return [selectedMain || '(Uncategorized)', selectedSub || '(Uncategorized)'].join(' → ');
        const sub = main.sub_categories?.find((s) => (s.sub_category || '') === (selectedSub || ''));
        return [
            main.display_name || main.main_category || '(Uncategorized)',
            sub?.display_name ?? sub?.sub_category ?? selectedSub ?? '(Uncategorized)',
        ].join(' → ');
    };

    if (categoriesLoading) return <LoadingSpinner text={t('accessing_service_rates')} />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="mb-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <ListBulletIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('labor_catalog')}</h1>
                </div>
                {(canImportAndCreate || canManageCatalog) && (
                    <div className="flex flex-wrap items-center gap-3">
                        {canManageCatalog && (
                            <button
                                onClick={() => {
                                    setSelectedItemIds(new Set());
                                    setIsOfferModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                            >
                                <DocumentPlusIcon className="h-5 w-5" />
                                Create new offer
                            </button>
                        )}
                        {canImportAndCreate && (
                            <>
                                <label className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer">
                                    <ArrowDownTrayIcon className="h-5 w-5 mr-1.5" />
                                    {t('import_ar_is') || 'Import ar.is'}
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx"
                                        className="sr-only"
                                        disabled={importing}
                                        onChange={async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f) return;
                                            setImporting(true);
                                            setImportResult(null);
                                            try {
                                                const form = new FormData();
                                                form.append('file', f);
                                                const res = await axiosInstance.post('/labor-catalog/import-ar-is', form, {
                                                    params: { skip_duplicates: !importUpdateExisting },
                                                    headers: { 'Content-Type': 'multipart/form-data' },
                                                });
                                                setImportResult(res.data);
                                                const v = res.data.variants_added ?? 0;
                                                toast.success(`Imported: ${res.data.created} created, ${res.data.updated ?? 0} updated, ${res.data.skipped} skipped${v ? `, ${v} variants` : ''}`);
                                                fetchCategories();
                                                if (selectedMain !== null && selectedSub !== null) {
                                                    fetchItems(selectedMain, selectedSub);
                                                }
                                            } catch (err) {
                                                toast.error(err.response?.data?.detail || 'Import failed.');
                                                setImportResult(null);
                                            } finally {
                                                setImporting(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={importUpdateExisting}
                                        onChange={(e) => setImportUpdateExisting(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Update existing items</span>
                                </label>
                                <label className="inline-flex items-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition cursor-pointer" title="Work load ratios (location/condition multipliers)">
                                    <ArrowDownTrayIcon className="h-5 w-5 mr-1.5" />
                                    Import work load ratios
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        className="sr-only"
                                        disabled={importing}
                                        onChange={async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f) return;
                                            setImporting(true);
                                            try {
                                                const form = new FormData();
                                                form.append('file', f);
                                                const res = await axiosInstance.post('/labor-catalog/import-work-load-ratios', form, {
                                                    headers: { 'Content-Type': 'multipart/form-data' },
                                                });
                                                toast.success(`Work load ratios: ${res.data.created} created, ${res.data.updated} updated`);
                                            } catch (err) {
                                                toast.error(err.response?.data?.detail || 'Import failed.');
                                            } finally {
                                                setImporting(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </label>
                                <label className="inline-flex items-center px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer" title="Main categories (provisional basis)">
                                    <ArrowDownTrayIcon className="h-5 w-5 mr-1.5" />
                                    Import main categories
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        className="sr-only"
                                        disabled={importing}
                                        onChange={async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f) return;
                                            setImporting(true);
                                            try {
                                                const form = new FormData();
                                                form.append('file', f);
                                                const res = await axiosInstance.post('/labor-catalog/import-main-categories', form, {
                                                    headers: { 'Content-Type': 'multipart/form-data' },
                                                });
                                                toast.success(`Main categories: ${res.data.created} created, ${res.data.updated} updated`);
                                            } catch (err) {
                                                toast.error(err.response?.data?.detail || 'Import failed.');
                                            } finally {
                                                setImporting(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </label>
                                <button
                                    type="button"
                                    disabled={importing}
                                    onClick={async () => {
                                        setImporting(true);
                                        try {
                                            const res = await axiosInstance.post('/labor-catalog/consolidate');
                                            toast.success(`Consolidated: ${res.data.merged_groups} groups merged, ${res.data.deleted_items} duplicates removed, ${res.data.variants_created} variants created.`);
                                            fetchCategories();
                                            if (selectedMain !== null && selectedSub !== null) fetchItems(selectedMain, selectedSub);
                                        } catch (err) {
                                            toast.error(err.response?.data?.detail || 'Consolidate failed.');
                                        } finally {
                                            setImporting(false);
                                        }
                                    }}
                                    className="saas-btn-primary inline-flex items-center px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                                    title="Merge duplicate items (same name + category) into one; each duplicate becomes a condition variant"
                                >
                                    <ArrowPathIcon className="h-5 w-5 mr-1.5" />
                                    Consolidate catalog
                                </button>
                                <button
                                    onClick={() => navigate('/labor-catalog/new')}
                                    className="saas-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase tracking-widest rounded-xl"
                                >
                                    <PlusIcon className="h-5 w-5" /> {t('new_service')}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </header>

            {/* Tenant: apply one base price to all non-hourly items */}
            {canManageCatalog && (
                <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-black text-violet-700 dark:text-violet-300 uppercase tracking-widest mb-1">Base Electrician Hourly Rate (ISK)</label>
                            <p className="text-xs text-violet-600 dark:text-violet-400 mb-2">Set one base hourly rate (e.g. 6500) to act as the baseline for all labor calculations and items.</p>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={tenantBasePriceInput}
                                onChange={(e) => setTenantBasePriceInput(e.target.value)}
                                placeholder="e.g. 6500"
                                className="w-full max-w-[140px] rounded-xl border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-bold text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={applyingBasePrice || !tenantBasePriceInput.trim()}
                            onClick={async () => {
                                const price = parseFloat(tenantBasePriceInput);
                                if (isNaN(price) || price < 0) {
                                    toast.error('Enter a valid rate (e.g. 6500).');
                                    return;
                                }
                                setApplyingBasePrice(true);
                                try {
                                    const res = await axiosInstance.post('/labor-catalog/apply-tenant-base-price', { price });
                                    toast.success(`Saved Base Rate. Applied to ${res.data.updated} catalog items.`);
                                    if (selectedMain !== null && selectedSub !== null) fetchItems(selectedMain, selectedSub);
                                } catch (err) {
                                    toast.error(err.response?.data?.detail || 'Apply failed.');
                                } finally {
                                    setApplyingBasePrice(false);
                                }
                            }}
                            className="saas-btn-primary px-6 py-2.5 disabled:opacity-50 rounded-xl text-sm transition"
                        >
                            {applyingBasePrice ? 'Applying…' : 'Save & Apply'}
                        </button>
                    </div>
                    
                    {modifiers.length > 0 && (
                        <div className="mt-4 border-t border-violet-200 dark:border-violet-800 pt-4">
                            <h4 className="text-xs font-bold text-violet-800 dark:text-violet-200 mb-3">ar.is Labor Surcharges (Álagshlutföll) System</h4>
                            <div className="flex flex-wrap gap-2">
                                {modifiers.map(m => (
                                    <span key={m.id} className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-800 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                        {m.description} 
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded ${m.ratio > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                            {m.ratio > 0 ? '+' : ''}{(m.ratio * 100).toFixed(0)}%
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-2xl text-sm font-bold flex items-center gap-2">
                    {error}
                </div>
            )}

            {importResult && (
                <div
                    className={`mb-6 p-4 rounded-2xl text-sm ${
                        importResult.error_count || importResult.errors?.length
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                    }`}
                >
                    <p className="font-bold">Import result</p>
                    <p>
                        Created: {importResult.created} · Skipped: {importResult.skipped} · Updated: {importResult.updated || 0}
                    </p>
                    {(importResult.error_count || importResult.errors?.length) > 0 && (
                        <>
                            <p className="text-amber-700 dark:text-amber-300 mt-1 font-semibold">
                                {importResult.error_count ?? importResult.errors?.length} row(s) had errors.
                            </p>
                            {importResult.error_sample?.length > 0 && (
                                <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg text-xs font-mono overflow-x-auto">
                                    <p className="font-bold mb-1">Sample errors (first 5):</p>
                                    {importResult.error_sample.map((msg, i) => (
                                        <p key={i} className="text-red-700 dark:text-red-300 break-all">
                                            {msg}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Category menu (sidebar) */}
                <aside className="lg:w-72 flex-shrink-0 saas-card overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 glass-panel">
                        <h2 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {t('category') || 'Categories'}
                        </h2>
                    </div>
                    <nav className="max-h-[60vh] overflow-y-auto">
                        {categories.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No categories yet.</p>
                        ) : (
                            <ul className="py-2">
                                {categories.map((cat) => {
                                    const mainKey = cat.main_category ?? '';
                                    const isExpanded = expandedMain === mainKey;
                                    const subs = cat.sub_categories || [];
                                    return (
                                        <li key={mainKey || 'uncat'} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedMain(isExpanded ? null : mainKey)}
                                                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                                            >
                                                <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white truncate">
                                                    {isExpanded ? (
                                                        <FolderOpenIcon className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                                                    ) : (
                                                        <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                    )}
                                                    {cat.display_name || cat.main_category || '(Uncategorized)'}
                                                </span>
                                                <ChevronRightIcon
                                                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                />
                                            </button>
                                            {isExpanded && (
                                                <ul className="bg-gray-50/50 dark:bg-gray-900/30 pb-2">
                                                    {subs.map((sub) => {
                                                        const subKey = sub.sub_category ?? '';
                                                        const isSelected =
                                                            selectedMain === mainKey && selectedSub === subKey;
                                                        return (
                                                            <li key={subKey || 'uncat'}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectSub(mainKey, subKey)}
                                                                    className={`w-full flex items-center justify-between gap-2 pl-10 pr-4 py-2.5 text-left transition ${
                                                                        isSelected
                                                                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-semibold'
                                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                                                    }`}
                                                                >
                                                                    <span className="truncate">
                                                                        {sub.display_name || sub.sub_category || '(Uncategorized)'}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                                        {sub.count}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </nav>
                </aside>

                {/* Items panel */}
                <main className="flex-1 min-w-0 saas-card overflow-hidden">
                    {selectedMain === null || selectedSub === null ? (
                        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                            <FolderOpenIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
                                {t('category') || 'Select a category'} → {t('subcategory', 'subcategory') || 'subcategory'}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                Expand a main category in the menu, then click a subcategory to see its items.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                                <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 truncate">
                                    {selectedLabel()}
                                </h2>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {items.length} {t('items', 'items')}
                                </span>
                            </div>
                            {itemsLoading ? (
                                <div className="flex justify-center py-16">
                                    <LoadingSpinner text="" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className={`w-full text-sm text-left min-w-[500px] ${!canExportData ? 'protect-data' : ''}`}>
                                        <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 font-black">
                                            <tr>
                                                {canManageCatalog && <th className="py-4 px-3 w-8"></th>}
                                                <th className="py-4 px-6">{t('service_description')}</th>
                                                <th className="py-4 px-4">{t('conditions', 'Conditions')}</th>
                                                <th className="py-4 px-4 text-right" title="ar.is reference work units (Einingar)">Eining (ein.)</th>
                                                <th className="py-4 px-4 text-right" title="Your company rate per Eining (ISK/ein.)">ISK/ein.</th>
                                                <th className="py-4 px-4">Tímahlutfall</th>
                                                {canManageCatalog && (
                                                    <th className="py-4 px-6 text-center w-24">{t('management')}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {items.length > 0 ? (
                                                items.map((item) => {
                                                    const isSelected = selectedItemIds.has(item.id);
                                                    return (
                                                    <tr
                                                        key={item.id}
                                                        onClick={() => navigate(`/labor-catalog/edit/${item.id}`)}
                                                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                                    >
                                                        {canManageCatalog && (
                                                            <td className="py-4 px-3" onClick={e => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        const next = new Set(selectedItemIds);
                                                                        if (e.target.checked) next.add(item.id);
                                                                        else next.delete(item.id);
                                                                        setSelectedItemIds(next);
                                                                    }}
                                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <TagIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                                <span className="font-medium text-gray-900 dark:text-white">
                                                                    {item.description}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-gray-500 dark:text-gray-400 text-xs">
                                                            {item.conditions || '—'}
                                                        </td>
                                                        <td className="py-4 px-4 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {formatEining(item.reference_price)}
                                                        </td>
                                                        <td className="py-4 px-4 text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                            {item.tenant_price ? formatISKRate(item.tenant_price) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                        </td>
                                                        <td className="py-4 px-4 text-[10px] text-gray-500 dark:text-gray-400">
                                                            {einingFullLabel(item.units_per_hour) || '—'}
                                                        </td>
                                                        {canManageCatalog && (
                                                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex justify-center gap-1">
                                                                    <Link
                                                                        to={`/labor-catalog/edit/${item.id}`}
                                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                                                        title={
                                                                            isSuperuser
                                                                                ? t('edit_service_details')
                                                                                : t('set_your_price') || 'Set your price'
                                                                        }
                                                                    >
                                                                        <PencilIcon className="h-5 w-5" />
                                                                    </Link>
                                                                    {isSuperuser && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                                                            title={t('purge_service')}
                                                                        >
                                                                            <TrashIcon className="h-5 w-5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={canManageCatalog ? 7 : 5}
                                                        className="py-16 text-center text-gray-500 dark:text-gray-400"
                                                    >
                                                        No items in this category.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* F2: Floating action bar when items are selected */}
            {canManageCatalog && selectedItemIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 bg-indigo-700 dark:bg-indigo-800 text-white rounded-2xl shadow-2xl border border-indigo-500 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-2">
                        <CheckIcon className="h-5 w-5 text-indigo-200" />
                        <span className="font-bold">{selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected</span>
                        <span className="text-indigo-300 text-sm ml-2">
                            Total: {formatEining(items.filter(i => selectedItemIds.has(i.id)).reduce((sum, i) => sum + (i.reference_price || 0), 0))}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsOfferModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-white text-indigo-700 font-black rounded-xl hover:bg-indigo-50 transition"
                    >
                        <DocumentPlusIcon className="h-5 w-5" />
                        Create Offer
                    </button>
                    <button
                        onClick={() => setSelectedItemIds(new Set())}
                        className="px-4 py-2 text-indigo-200 hover:text-white text-sm font-medium transition"
                    >
                        Clear
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteItem}
                title={t('remove_service_category')}
                message={t('remove_service_confirm', { name: itemToDelete?.description || '' })}
                confirmText={t('purge_service')}
                type="danger"
            />

            {/* F2: Create Offer from Catalog Modal */}
            {isOfferModalOpen && (
                <CreateOfferFromCatalogModal
                    selectedItems={items.filter(i => selectedItemIds.has(i.id))}
                    onClose={() => setIsOfferModalOpen(false)}
                    onCreated={(offerId) => {
                        setSelectedItemIds(new Set());
                        setIsOfferModalOpen(false);
                        navigate(`/offers/${offerId}`);
                    }}
                />
            )}
        </div>
    );
}

export default LaborCatalogListPage;
