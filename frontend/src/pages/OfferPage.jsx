import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inventoryDisplayDescription, inventoryDisplayName } from '../utils/inventoryI18n';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import InventoryCatalogShopFilters from '../components/InventoryCatalogShopFilters';
import { useInventoryCatalogShopFilter } from '../hooks/useInventoryCatalogShopFilter';
import { 
    PencilIcon, 
    TrashIcon, 
    PlusIcon, 
    BanknotesIcon, 
    DocumentTextIcon,
    BriefcaseIcon,
    UserIcon,
    EnvelopeIcon,
    MapPinIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    TagIcon,
    CheckBadgeIcon,
    NoSymbolIcon,
    ReceiptPercentIcon,
    PaperAirplaneIcon,
    FolderIcon,
    FolderOpenIcon,
} from '@heroicons/react/24/outline';

/**
 * Technical Currency Formatter for ISK (Icelandic Króna)
 */
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 kr.';
    return new Intl.NumberFormat('is-IS', { 
        style: 'currency', 
        currency: 'ISK', 
        maximumFractionDigits: 0 
    }).format(value);
};

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

const formatDateForInput = (dateString) => {
     if (!dateString) return '';
     try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
     } catch { return ''; }
};

/**
 * Custom ISK Icon placeholder since Heroicons lacks a kr. symbol
 */
const IskIcon = () => (
    <span className="text-[10px] font-black leading-none text-indigo-600 dark:text-indigo-400">kr.</span>
);

/** Catalog unit label: eining (units per hour) → e.g. "15 min", "Hourly rate" */
function einingDurationLabel(unitsPerHour) {
    if (unitsPerHour == null) return null;
    const u = Number(unitsPerHour);
    if (u === 0) return 'Hourly rate';
    if (u < 0) return null;
    const minPerUnit = 60 / u;
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

/** Catalog unit options for custom labor (match catalog: hour, unit, lump) */
const LABOR_UNIT_OPTIONS = [
    { value: 'hour', label: 'Per hour' },
    { value: 'unit', label: 'Per unit' },
    { value: 'lump', label: 'Lump sum' },
];

function OfferPage() {
    const { i18n } = useTranslation();
    const laborApiLang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'is';
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data States
    const [offer, setOffer] = useState(null);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [laborCatalog, setLaborCatalog] = useState([]);
    const [workLoadRatios, setWorkLoadRatios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // UI States
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [headerFormData, setHeaderFormData] = useState({ client_name: '', client_address: '', client_email: '', expiry_date: '' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Line Item Entry States
    const [newItemType, setNewItemType] = useState('Labor');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('hour');
    const [newItemInventoryId, setNewItemInventoryId] = useState('');
    const [selectedLaborCatalogId, setSelectedLaborCatalogId] = useState('');

    // Labor catalog browser (like Labor Catalog tab)
    const [laborCategories, setLaborCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [expandedMain, setExpandedMain] = useState(null);
    const [selectedMain, setSelectedMain] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [categoryItems, setCategoryItems] = useState([]);
    const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState(null); // one labor item chosen for adding
    const [itemVariants, setItemVariants] = useState([]); // condition variants for selected item
    const [selectedVariant, setSelectedVariant] = useState(null); // chosen variant when item has variants
    const [variantsLoading, setVariantsLoading] = useState(false);
    const [addQty, setAddQty] = useState(1);
    const [showCustomLaborForm, setShowCustomLaborForm] = useState(false);

    // Material category browser (from Shop inventory) – mimic labor catalog style
    const [materialExpandedMain, setMaterialExpandedMain] = useState(null);
    const [materialSelectedMain, setMaterialSelectedMain] = useState(null);
    const [materialSelectedSub, setMaterialSelectedSub] = useState(null);

    const materialCategories = useMemo(() => {
        if (!Array.isArray(inventoryCatalog) || inventoryCatalog.length === 0) return [];
        const treeMap = new Map();
        inventoryCatalog.forEach((item) => {
            const main = item.category || '(Uncategorized)';
            const sub = item.subcategory || '(Uncategorized)';
            if (!treeMap.has(main)) {
                treeMap.set(main, new Map());
            }
            const subMap = treeMap.get(main);
            subMap.set(sub, (subMap.get(sub) || 0) + 1);
        });
        return Array.from(treeMap.entries()).map(([main_category, subMap]) => ({
            main_category,
            sub_categories: Array.from(subMap.entries()).map(([sub_category, count]) => ({
                sub_category,
                count,
            })),
        }));
    }, [inventoryCatalog]);

    const materialCategoryItems = useMemo(() => {
        if (!materialSelectedMain || !materialSelectedSub) return [];
        return (inventoryCatalog || []).filter((i) => {
            const main = i.category || '(Uncategorized)';
            const sub = i.subcategory || '(Uncategorized)';
            return main === materialSelectedMain && sub === materialSelectedSub;
        });
    }, [inventoryCatalog, materialSelectedMain, materialSelectedSub]);

    const isSuperuser = user?.is_superuser;
    const canManageOffer = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);
    const canEditOffer = canManageOffer && offer?.status === 'Draft';

    const {
        selectedShops,
        toggleShop,
        shopMatchMode,
        setShopMatchMode,
        buildCatalogParams,
    } = useInventoryCatalogShopFilter();

    useEffect(() => {
        if (!offerId) return;
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const offerRes = await axiosInstance.get(`/offers/${offerId}`);
                if (cancelled) return;
                const data = offerRes.data;
                setOffer(data);
                setHeaderFormData({
                    client_name: data.client_name || '',
                    client_address: data.client_address || '',
                    client_email: data.client_email || '',
                    expiry_date: formatDateForInput(data.expiry_date),
                });
            } catch (err) {
                console.error('Offer fetch failed:', err);
                if (!cancelled) {
                    setError('Failed to load offer.');
                    setOffer(null);
                    toast.error('Could not load offer.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [offerId]);

    useEffect(() => {
        if (!offerId) return;
        let cancelled = false;
        (async () => {
            try {
                const [laborRes, ratiosRes] = await Promise.allSettled([
                    axiosInstance.get('/labor-catalog/', { params: { limit: 5000, lang: laborApiLang } }),
                    axiosInstance.get('/labor-catalog/work-load-ratios', { params: { active_only: false } }),
                ]);
                if (cancelled) return;
                const laborData = laborRes.status === 'fulfilled' ? laborRes.value?.data : null;
                const ratiosData = ratiosRes.status === 'fulfilled' ? ratiosRes.value?.data : null;
                setLaborCatalog(Array.isArray(laborData) ? laborData : []);
                setWorkLoadRatios(Array.isArray(ratiosData) ? ratiosData : []);
            } catch (_) {
                if (!cancelled) {
                    setLaborCatalog([]);
                    setWorkLoadRatios([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [offerId, laborApiLang]);

    useEffect(() => {
        if (!offerId) return;
        let cancelled = false;
        (async () => {
            try {
                const invRes = await axiosInstance.get('/inventory/catalog', {
                    params: buildCatalogParams({ limit: 4000 }),
                });
                if (cancelled) return;
                const invData = invRes?.data;
                setInventoryCatalog(Array.isArray(invData) ? invData : []);
                setMaterialExpandedMain(null);
                setMaterialSelectedMain(null);
                setMaterialSelectedSub(null);
                setNewItemInventoryId('');
            } catch (_) {
                if (!cancelled) setInventoryCatalog([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [offerId, buildCatalogParams]);

    const fetchLaborCategories = useCallback(async () => {
        setCategoriesLoading(true);
        try {
            const res = await axiosInstance.get('/labor-catalog/categories', { params: { lang: laborApiLang } });
            setLaborCategories(res.data || []);
        } catch (_) {
            setLaborCategories([]);
        } finally {
            setCategoriesLoading(false);
        }
    }, [laborApiLang]);

    const fetchCategoryItems = useCallback(async (mainCat, subCat) => {
        setCategoryItemsLoading(true);
        try {
            const params = { limit: 5000, lang: laborApiLang };
            if (mainCat != null) params.main_category = mainCat === '' ? '' : mainCat;
            if (subCat != null) params.sub_category = subCat === '' ? '' : subCat;
            const res = await axiosInstance.get('/labor-catalog/', { params });
            setCategoryItems(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setCategoryItems([]);
        } finally {
            setCategoryItemsLoading(false);
        }
    }, [laborApiLang]);

    useEffect(() => {
        if (canEditOffer && newItemType === 'Labor' && !showCustomLaborForm) {
            fetchLaborCategories();
        }
    }, [canEditOffer, newItemType, showCustomLaborForm, fetchLaborCategories]);

    useEffect(() => {
        if (selectedMain !== null && selectedSub !== null) {
            fetchCategoryItems(selectedMain, selectedSub);
        } else {
            setCategoryItems([]);
        }
    }, [selectedMain, selectedSub, fetchCategoryItems]);

    // When user selects an item, fetch its condition variants (item → variants)
    useEffect(() => {
        if (!selectedCatalogItem?.id) {
            setItemVariants([]);
            setSelectedVariant(null);
            return;
        }
        setSelectedVariant(null);
        setVariantsLoading(true);
        axiosInstance.get(`/labor-catalog/${selectedCatalogItem.id}/conditions`, { params: { lang: laborApiLang } }).then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            setItemVariants(list);
        }).catch(() => setItemVariants([])).finally(() => setVariantsLoading(false));
    }, [selectedCatalogItem?.id, laborApiLang]);

    const offerRatioCodes = useMemo(() => {
        if (!offer?.work_load_ratio_codes) return [];
        try {
            const parsed = typeof offer.work_load_ratio_codes === 'string' ? JSON.parse(offer.work_load_ratio_codes) : offer.work_load_ratio_codes;
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
    }, [offer?.work_load_ratio_codes]);

    const ratioMultiplier = useMemo(() => {
        const sum = (workLoadRatios || [])
            .filter((r) => offerRatioCodes.includes(r.code))
            .reduce((acc, r) => acc + (r.ratio ?? 0), 0);
        return 1 + sum;
    }, [workLoadRatios, offerRatioCodes]);

    // When work conditions change, recompute effective price for selected labor item
    useEffect(() => {
        if (newItemType !== 'Labor' || !selectedLaborCatalogId) return;
        const selectedItem = (laborCatalog || []).find(item => item.id.toString() === selectedLaborCatalogId);
        if (!selectedItem) return;
        const basePrice = selectedItem.tenant_price ?? selectedItem.reference_price ?? 0;
        const effectivePrice = basePrice * ratioMultiplier;
        setNewItemPrice(effectivePrice.toString());
    }, [ratioMultiplier, selectedLaborCatalogId, newItemType, laborCatalog]);

    const handleHeaderChange = (e) => setHeaderFormData({...headerFormData, [e.target.name]: e.target.value});

    const handleSaveHeader = async () => {
        try {
            const payload = { ...headerFormData, expiry_date: headerFormData.expiry_date || null };
            const response = await axiosInstance.put(`/offers/${offerId}`, payload);
            setOffer(response.data);
            setIsEditingHeader(false);
            toast.success('Commercial metadata updated.');
        } catch (error) {
            console.error('Header save failed:', error);
            toast.error('Metadata update failed.');
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const response = await axiosInstance.put(`/offers/${offerId}`, { status: newStatus });
            setOffer(response.data);
            toast.success(`Bid transition: ${newStatus}`);
        } catch (error) {
            console.error('Status change failed:', error);
            toast.error('State transition rejected.');
        }
    };

    const handleWorkRatioToggle = async (code, checked) => {
        const ratio = (workLoadRatios || []).find((r) => r.code === code);
        let next;
        if (checked) {
            const sameType = ratio?.ratio_type != null ? (workLoadRatios || []).filter((r) => r.ratio_type === ratio.ratio_type).map((r) => r.code) : [];
            next = offerRatioCodes.filter((c) => !sameType.includes(c));
            next = [...next, code];
        } else {
            next = offerRatioCodes.filter((c) => c !== code);
        }
        try {
            const res = await axiosInstance.put(`/offers/${offerId}`, { work_load_ratio_codes: JSON.stringify(next) });
            setOffer(res.data);
        } catch (err) {
            toast.error('Failed to update work conditions.');
        }
    };

    const reloadOfferFromServer = useCallback(async () => {
        if (!offerId) return;
        try {
            const offerRes = await axiosInstance.get(`/offers/${offerId}`);
            const data = offerRes.data;
            setOffer(data);
            setHeaderFormData({
                client_name: data.client_name || '',
                client_address: data.client_address || '',
                client_email: data.client_email || '',
                expiry_date: formatDateForInput(data.expiry_date),
            });
        } catch (err) {
            console.error('Offer refresh failed:', err);
        }
    }, [offerId]);

    const handleLaborCatalogChange = (e) => {
        const itemId = e.target.value;
        setSelectedLaborCatalogId(itemId);
        const selectedItem = laborCatalog.find(item => item.id.toString() === itemId);
        if (selectedItem) {
            setNewItemDesc(selectedItem.description);
            const basePrice = selectedItem.tenant_price ?? selectedItem.reference_price ?? 0;
            const effectivePrice = basePrice * ratioMultiplier;
            setNewItemPrice(effectivePrice.toString());
            setNewItemUnit(selectedItem.unit || 'hour');
        } else {
            setNewItemDesc(''); setNewItemPrice(''); setNewItemUnit('hour');
        }
    };

    const handleAddLineFromCatalog = async () => {
        if (!selectedCatalogItem) return;
        const hasVariants = itemVariants.length > 0;
        if (hasVariants && !selectedVariant) {
            toast.error('Select an item variant first.');
            return;
        }
        const basePrice = selectedCatalogItem.tenant_price ?? selectedCatalogItem.reference_price ?? 0;
        const effectivePrice = basePrice * ratioMultiplier;
        const qty = Number(addQty) || 1;
        const description = hasVariants && selectedVariant
            ? `${selectedCatalogItem.description} – ${selectedVariant.condition_description}`
            : selectedCatalogItem.description;
        const payload = {
            item_type: 'Labor',
            description,
            quantity: qty,
            unit_price: effectivePrice,
            inventory_item_id: null,
        };
        try {
            await axiosInstance.post(`/offers/${offerId}/items`, payload);
            toast.success('Line added to offer.');
            setSelectedCatalogItem(null);
            setSelectedVariant(null);
            setAddQty(1);
            reloadOfferFromServer();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add line.');
        }
    };

    const handleAddCustomLaborLine = async (e) => {
        e.preventDefault();
        const qty = Number(newItemQty) || 1;
        const price = parseFloat(newItemPrice);
        if (!newItemDesc.trim()) {
            toast.error('Enter a description.');
            return;
        }
        if (price < 0 || isNaN(price)) {
            toast.error('Enter a valid unit price.');
            return;
        }
        const payload = {
            item_type: 'Labor',
            description: newItemDesc.trim(),
            quantity: qty,
            unit_price: price,
            inventory_item_id: null,
        };
        try {
            await axiosInstance.post(`/offers/${offerId}/items`, payload);
            toast.success('Custom labor line added.');
            setNewItemDesc('');
            setNewItemQty(1);
            setNewItemPrice('');
            setNewItemUnit('hour');
            setShowCustomLaborForm(false);
            reloadOfferFromServer();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add line.');
        }
    };

    const handleAddLineItem = async (e) => {
        e.preventDefault();
        const payload = {
            item_type: newItemType,
            description: newItemDesc,
            quantity: parseFloat(newItemQty),
            unit_price: parseFloat(newItemPrice),
            inventory_item_id: newItemType === 'Material' ? parseInt(newItemInventoryId) : null,
        };

        try {
            await axiosInstance.post(`/offers/${offerId}/items`, payload);
            toast.success('Line item appended.');
            setNewItemDesc(''); setNewItemQty(1); setNewItemPrice(''); 
            setNewItemInventoryId(''); setSelectedLaborCatalogId('');
            reloadOfferFromServer();
        } catch (error) {
            console.error('Add line item failed:', error);
            toast.error('Failed to append line item.');
        }
    };

    const handleRemoveLineItem = async (itemId) => {
        try {
            await axiosInstance.delete(`/offers/items/${itemId}`);
            toast.success('Item purged from bid.');
            reloadOfferFromServer();
        } catch (error) {
            console.error('Remove line item failed:', error);
            toast.error('Removal failed.');
        }
    };

    const confirmDeleteOffer = async () => {
        try {
            await axiosInstance.delete(`/offers/${offerId}`);
            toast.success(`Proposal ${offer?.offer_number} decommissioned.`);
            navigate(`/projects/edit/${offer?.project_id}`);
        } catch (error) {
            console.error('Delete offer failed:', error);
            toast.error("Purge protocol failed.");
        }
    };

    // Derived analytics (guard: offer may be null before load or after failed fetch)
    const lineItems = offer?.line_items ?? [];
    const laborTotal = useMemo(() => lineItems.filter(i => i.item_type === 'Labor').reduce((sum, i) => sum + i.total_price, 0) || 0, [lineItems]);
    const materialTotal = useMemo(() => lineItems.filter(i => i.item_type === 'Material').reduce((sum, i) => sum + i.total_price, 0) || 0, [lineItems]);

    if (isLoading) return <LoadingSpinner text="Compiling financial telemetry..." size="lg" />;
    if (!offer) return <div className="p-32 text-center font-black uppercase text-gray-400 tracking-widest italic">Registry ID Not Found</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header: Identity & Navigation */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-2xl">
                    {error}
                </div>
            )}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <Link to={`/projects/edit/${offer.project_id}`} className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                            <ChevronLeftIcon className="h-3 w-3 mr-1" /> Site Infrastructure
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <BanknotesIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">
                                    {offer.offer_number}
                                </h1>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2 italic">
                                    Commercial Proposal: {offer.title}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                            offer.status === 'Draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                            offer.status === 'Accepted' ? 'bg-green-50 text-green-700 border-green-100' : 
                            offer.status === 'Sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                            {offer.status}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Issued: {formatDate(offer.issue_date)}
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const response = await axiosInstance.get(`/offers/${offerId}/pdf`, {
                                        responseType: 'blob',
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `offer-${offer.offer_number || offerId}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    window.URL.revokeObjectURL(url);
                                } catch (err) {
                                    console.error('Offer export failed:', err);
                                    toast.error('Failed to export offer.');
                                }
                            }}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            <DocumentTextIcon className="h-4 w-4" /> Export PDF
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Bid Logic (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Financial Summary Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard label="Labor Subtotal" value={formatCurrency(laborTotal)} icon={<UserIcon />} />
                        <SummaryCard label="Material Subtotal" value={formatCurrency(materialTotal)} icon={<TagIcon />} />
                        <SummaryCard label="Proposal Valuation" value={formatCurrency(offer.total_amount)} icon={<CheckBadgeIcon />} highlight />
                    </div>

                    {/* Technical Line Items Table */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Technical Breakdown</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="py-5 px-8">Scope / Description</th>
                                        <th className="py-5 px-4 text-right">Qty</th>
                                        <th className="py-5 px-6 text-right">Unit Rate</th>
                                        <th className="py-5 px-8 text-right">Line Total</th>
                                        {canEditOffer && <th className="py-5 px-6"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {lineItems.map(item => (
                                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="py-5 px-8">
                                                <p className="font-bold text-gray-900 dark:text-white tracking-tight">{item.description}</p>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border mt-1 ${
                                                        item.item_type === 'Labor'
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700'
                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
                                                    }`}
                                                >
                                                    {item.item_type}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-right font-mono font-bold text-gray-600">{item.quantity}</td>
                                            <td className="py-5 px-6 text-right text-gray-400 font-medium italic">{formatCurrency(item.unit_price)}</td>
                                            <td className="py-5 px-8 text-right font-black text-gray-900 dark:text-white">{formatCurrency(item.total_price)}</td>
                                            {canEditOffer && (
                                                <td className="py-5 px-6 text-center">
                                                    <button onClick={() => handleRemoveLineItem(item.id)} className="p-2 text-gray-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {lineItems.length === 0 && (
                                        <tr><td colSpan="5" className="py-20 text-center text-gray-400 italic font-medium">Registry empty: No commercial lines defined.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Add to offer (Draft only): Labor catalog browser + Material + Custom labor */}
                    {canEditOffer && (
                        <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <PlusIcon className="h-5 w-5 text-indigo-600" /> Add line to offer
                            </h3>

                            {/* Tabs: Labor (catalog) | Material | Custom labor */}
                            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <button
                                    type="button"
                                    onClick={() => { setNewItemType('Labor'); setShowCustomLaborForm(false); setSelectedCatalogItem(null); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${newItemType === 'Labor' && !showCustomLaborForm ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    Labor (catalog)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setNewItemType('Material'); setShowCustomLaborForm(false); setSelectedCatalogItem(null); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${newItemType === 'Material' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    Material
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setNewItemType('Labor'); setShowCustomLaborForm(true); setSelectedCatalogItem(null); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition ${showCustomLaborForm ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    Custom labor line
                                </button>
                            </div>

                            <div className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Material supplier filter (Material tab browser)
                                </p>
                                <InventoryCatalogShopFilters
                                    selected={selectedShops}
                                    onToggleShop={toggleShop}
                                    shopMatch={shopMatchMode}
                                    onShopMatchChange={setShopMatchMode}
                                />
                            </div>

                            {/* Custom labor form: description, qty, unit (catalog-aligned), unit price */}
                            {showCustomLaborForm && (
                                <form onSubmit={handleAddCustomLaborLine} className="space-y-4 p-4 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 mb-6">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Use the same units as catalog (per hour, per unit, or lump sum) so lines stay consistent.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-6">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Description</label>
                                            <input type="text" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} className="modern-input" placeholder="e.g. Special installation" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Quantity</label>
                                            <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} min="0.01" step="any" className="modern-input text-center font-mono" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Unit</label>
                                            <select value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)} className="modern-input">
                                                {LABOR_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Unit price (ISK)</label>
                                            <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} min="0" step="1" className="modern-input text-right font-mono" required />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm">Add line</button>
                                        <button type="button" onClick={() => setShowCustomLaborForm(false)} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm">Cancel</button>
                                    </div>
                                </form>
                            )}

                            {/* Material: Shop inventory browser with categories (mimic labor catalog layout) */}
                            {newItemType === 'Material' && (
                                <form onSubmit={handleAddLineItem} className="space-y-4 p-4 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                                        Select material from Shop inventory
                                    </p>

                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Category sidebar (Shop categories) */}
                                        <aside className="lg:w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                    Categories
                                                </h4>
                                            </div>
                                            <nav className="max-h-[40vh] overflow-y-auto">
                                                {materialCategories.length === 0 ? (
                                                    <p className="p-4 text-sm text-gray-500">
                                                        No materials available in Shop inventory.
                                                    </p>
                                                ) : (
                                                    <ul className="py-2">
                                                        {materialCategories.map((cat) => {
                                                            const mainKey = cat.main_category ?? '';
                                                            const isExpanded = materialExpandedMain === mainKey;
                                                            const subs = cat.sub_categories || [];
                                                            return (
                                                                <li
                                                                    key={mainKey || 'uncat'}
                                                                    className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setMaterialExpandedMain(isExpanded ? null : mainKey)
                                                                        }
                                                                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                                                                    >
                                                                        <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white truncate text-sm">
                                                                            {isExpanded ? (
                                                                                <FolderOpenIcon className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                                                                            ) : (
                                                                                <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                                            )}
                                                                            {cat.main_category || '(Uncategorized)'}
                                                                        </span>
                                                                        <ChevronRightIcon
                                                                            className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                                                                                isExpanded ? 'rotate-90' : ''
                                                                            }`}
                                                                        />
                                                                    </button>
                                                                    {isExpanded && (
                                                                        <ul className="bg-white/50 dark:bg-gray-800/50 pb-2">
                                                                            {subs.map((sub) => {
                                                                                const subKey = sub.sub_category ?? '';
                                                                                const isSelected =
                                                                                    materialSelectedMain === mainKey &&
                                                                                    materialSelectedSub === subKey;
                                                                                return (
                                                                                    <li key={subKey || 'uncat'}>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setMaterialSelectedMain(mainKey);
                                                                                                setMaterialSelectedSub(subKey);
                                                                                                setNewItemInventoryId('');
                                                                                            }}
                                                                                            className={`w-full flex justify-between gap-2 pl-10 pr-4 py-2.5 text-left text-sm transition ${
                                                                                                isSelected
                                                                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-semibold'
                                                                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                                                                            }`}
                                                                                        >
                                                                                            <span className="truncate">
                                                                                                {sub.sub_category || '(Uncategorized)'}
                                                                                            </span>
                                                                                            <span className="text-xs font-bold text-gray-400">
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

                                        {/* Items in selected category + Add line to offer */}
                                        <main className="flex-1 min-w-0">
                                            {materialSelectedMain === null || materialSelectedSub === null ? (
                                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
                                                    <FolderOpenIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                                        Select a category → subcategory
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {materialCategoryItems.length === 0 ? (
                                                        <p className="py-6 text-center text-gray-500 text-sm">
                                                            No materials in this subcategory.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-2 mb-4">
                                                            {materialCategoryItems.map((item) => {
                                                                const isSelected = newItemInventoryId === item.id.toString();
                                                                const hasShops = item.shop_url_1 || item.shop_url_2 || item.shop_url_3;
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            setNewItemInventoryId(item.id.toString());
                                                                            setNewItemDesc(inventoryDisplayName(item, i18n.language));
                                                                            setNewItemPrice(item.unit_price ?? 0);
                                                                        }}
                                                                        className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                                                                            isSelected
                                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                                                : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                                        }`}
                                                                    >
                                                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                                                            {inventoryDisplayName(item, i18n.language)}
                                                                        </p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
                                                                            {item.unit || 'unit'}{' '}
                                                                            {item.category
                                                                                ? `• ${item.category}${
                                                                                      item.subcategory
                                                                                          ? ` / ${item.subcategory}`
                                                                                          : ''
                                                                                  }`
                                                                                : ''}
                                                                        </p>
                                                                        {inventoryDisplayDescription(item, i18n.language) && (
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                                                {inventoryDisplayDescription(item, i18n.language)}
                                                                            </p>
                                                                        )}
                                                                        {hasShops && (
                                                                            <div
                                                                                className="mt-3 flex flex-wrap gap-2"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {item.shop_url_1 && (
                                                                                    <a
                                                                                        href={item.shop_url_1}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                                                                    >
                                                                                        johann ronning
                                                                                    </a>
                                                                                )}
                                                                                {item.shop_url_2 && (
                                                                                    <a
                                                                                        href={item.shop_url_2}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                                                                    >
                                                                                        iskraft
                                                                                    </a>
                                                                                )}
                                                                                {item.shop_url_3 && (
                                                                                    <a
                                                                                        href={item.shop_url_3}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                                                                    >
                                                                                        reykjafell
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                        <div className="md:col-span-4">
                                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                                                Qty
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newItemQty}
                                                                onChange={(e) => setNewItemQty(e.target.value)}
                                                                min="0.01"
                                                                step="any"
                                                                className="modern-input text-center font-mono"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="md:col-span-4">
                                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                                                                Unit price
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newItemPrice}
                                                                onChange={(e) => setNewItemPrice(e.target.value)}
                                                                min="0"
                                                                step="1"
                                                                className="modern-input text-right font-mono"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="md:col-span-4 flex items-end">
                                                            <button
                                                                type="submit"
                                                                disabled={!newItemInventoryId}
                                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
                                                            >
                                                                Add line
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </main>
                                    </div>
                                </form>
                            )}

                            {/* Labor from catalog: category browser + items + work load ratios + Add line to offer */}
                            {newItemType === 'Labor' && !showCustomLaborForm && (
                            <>
                                    {/* Work load ratios: multi-select with exclusivity by ratio_type (e.g. one floor only) */}
                                    {(workLoadRatios || []).filter(r => r.is_active !== false).length > 0 && (
                                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
                                            <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-3">Work load ratios (select one per group where applicable; e.g. one floor)</p>
                                            <div className="flex flex-wrap gap-3">
                                                {(workLoadRatios || []).filter(r => r.is_active !== false).map((r) => {
                                                    const checked = offerRatioCodes.includes(r.code);
                                                    const sameTypeSelected = r.ratio_type != null && offerRatioCodes.some((c) => {
                                                        const other = (workLoadRatios || []).find((x) => x.code === c);
                                                        return other && other.ratio_type === r.ratio_type && other.code !== r.code;
                                                    });
                                                    const disabled = !checked && sameTypeSelected;
                                                    return (
                                                        <label key={r.id} className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                disabled={disabled}
                                                                onChange={(e) => !disabled && handleWorkRatioToggle(r.code, e.target.checked)}
                                                                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                            />
                                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.description}</span>
                                                            <span className="text-xs text-amber-600 dark:text-amber-400">(+{((r.ratio ?? 0) * 100).toFixed(0)}%)</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Category sidebar (like Labor Catalog tab) */}
                                        <aside className="lg:w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Categories</h4>
                                            </div>
                                            <nav className="max-h-[40vh] overflow-y-auto">
                                                {categoriesLoading ? (
                                                    <p className="p-4 text-sm text-gray-500">Loading…</p>
                                                ) : !laborCategories.length ? (
                                                    <p className="p-4 text-sm text-gray-500">No categories. Import labor catalog first.</p>
                                                ) : (
                                                    <ul className="py-2">
                                                        {laborCategories.map((cat) => {
                                                            const mainKey = cat.main_category ?? '';
                                                            const isExpanded = expandedMain === mainKey;
                                                            const subs = cat.sub_categories || [];
                                                            return (
                                                                <li key={mainKey || 'uncat'} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                                                    <button type="button" onClick={() => setExpandedMain(isExpanded ? null : mainKey)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                                                                        <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white truncate text-sm">
                                                                            {isExpanded ? <FolderOpenIcon className="h-5 w-5 text-indigo-500 flex-shrink-0" /> : <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                                                                            {cat.display_name || cat.main_category || '(Uncategorized)'}
                                                                        </span>
                                                                        <ChevronRightIcon className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                    </button>
                                                                    {isExpanded && (
                                                                        <ul className="bg-white/50 dark:bg-gray-800/50 pb-2">
                                                                            {subs.map((sub) => {
                                                                                const subKey = sub.sub_category ?? '';
                                                                                const isSelected = selectedMain === mainKey && selectedSub === subKey;
                                                                                return (
                                                                                    <li key={subKey || 'uncat'}>
                                                                                        <button type="button" onClick={() => { setSelectedMain(mainKey); setSelectedSub(subKey); setSelectedCatalogItem(null); }} className={`w-full flex justify-between gap-2 pl-10 pr-4 py-2.5 text-left text-sm transition ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                                                                                            <span className="truncate">{sub.display_name || sub.sub_category || '(Uncategorized)'}</span>
                                                                                            <span className="text-xs font-bold text-gray-400">{sub.count}</span>
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

                                        {/* Items in selected category + selection + Add line to offer */}
                                        <main className="flex-1 min-w-0">
                                            {selectedMain === null || selectedSub === null ? (
                                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
                                                    <FolderOpenIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Select a category → subcategory</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {categoryItemsLoading ? (
                                                        <p className="py-8 text-center text-gray-500">Loading items…</p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-2">
                                                            {(categoryItems || []).map((item) => {
                                                                const basePrice = item.tenant_price ?? item.reference_price ?? 0;
                                                                const effectivePrice = basePrice * ratioMultiplier;
                                                                const isSelected = selectedCatalogItem?.id === item.id;
                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => setSelectedCatalogItem(isSelected ? null : item)}
                                                                        className={`p-4 rounded-xl border cursor-pointer transition text-left ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                                                    >
                                                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{item.description}</p>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                            {formatCurrency(basePrice)} {item.unit ? `/ ${item.unit}` : '/ hr'}
                                                                            {einingDurationLabel(item.units_per_hour) && <span className="ml-2 text-indigo-600 dark:text-indigo-400">({einingDurationLabel(item.units_per_hour)})</span>}
                                                                            {ratioMultiplier !== 1 && <span className="ml-2">→ {formatCurrency(effectivePrice)} with conditions</span>}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                            {(categoryItems || []).length === 0 && <p className="py-6 text-center text-gray-500 text-sm">No items in this subcategory.</p>}
                                                        </div>
                                                    )}
                                                    {selectedCatalogItem && (
                                                        <div className="mt-6 space-y-4">
                                                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                                                                <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase mb-1">Item</p>
                                                                <p className="font-bold text-gray-900 dark:text-white">{selectedCatalogItem.description}</p>
                                                            </div>
                                                            {/* Item variants: category → subcategory → item → variants */}
                                                            {variantsLoading && (
                                                                <p className="text-sm text-gray-500">Loading variants…</p>
                                                            )}
                                                            {!variantsLoading && itemVariants.length > 0 && (
                                                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                                                                    <p className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase mb-2">Select variant</p>
                                                                    <div className="space-y-2 max-h-[20vh] overflow-y-auto">
                                                                        {itemVariants.map((v) => {
                                                                            const isSelected = selectedVariant?.id === v.id;
                                                                            return (
                                                                                <div
                                                                                    key={v.id}
                                                                                    onClick={() => setSelectedVariant(isSelected ? null : v)}
                                                                                    className={`p-3 rounded-xl border cursor-pointer transition text-left ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                                                                >
                                                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{v.condition_description}</p>
                                                                                    {v.units_per_hour != null && (
                                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{einingDurationLabel(v.units_per_hour)}</p>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-wrap items-end gap-4">
                                                                <div className="w-24">
                                                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Quantity</label>
                                                                    <input type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} min="0.01" step="any" className="modern-input text-center font-mono h-11" />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddLineFromCatalog}
                                                                    disabled={itemVariants.length > 0 && !selectedVariant}
                                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm"
                                                                >
                                                                    Add line to offer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </main>
                                    </div>
                                </>
                            )}
                        </section>
                    )}
                </div>

                {/* Right Column: Administration (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Client Information Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Client Metadata
                            </h2>
                            {canEditOffer && !isEditingHeader && (
                                <button onClick={() => setIsEditingHeader(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {isEditingHeader ? (
                            <div className="space-y-4">
                                <input type="text" name="client_name" value={headerFormData.client_name} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Legal Entity Name" />
                                <input type="text" name="client_address" value={headerFormData.client_address} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Service Address" />
                                <input type="email" name="client_email" value={headerFormData.client_email} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Billing Email" />
                                <input type="date" name="expiry_date" value={headerFormData.expiry_date} onChange={handleHeaderChange} className="modern-input h-10" />
                                <div className="flex gap-2 pt-4">
                                    <button onClick={handleSaveHeader} className="flex-1 h-10 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl">Commit</button>
                                    <button onClick={() => setIsEditingHeader(false)} className="flex-1 h-10 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-xl">Abort</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <DetailItem icon={<UserIcon />} label="Recipient" value={offer.client_name || 'N/A'} />
                                <DetailItem icon={<MapPinIcon />} label="Address" value={offer.client_address || 'Service address not provided'} />
                                <DetailItem icon={<EnvelopeIcon />} label="Email" value={offer.client_email || 'No billing email'} />
                                
                                <div className="mt-10 pt-6 border-t border-gray-50 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-xl"><CalendarDaysIcon className="h-5 w-5 text-orange-400" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Validity Boundary</p>
                                        <p className="text-sm font-black text-orange-600">{formatDate(offer.expiry_date)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Command Center */}
                    {canManageOffer && (
                        <div className="bg-white/95 dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300 flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4" /> Management Command
                            </h3>
                            <div className="space-y-3">
                                {offer.status === 'Draft' && (
                                    <button onClick={() => handleStatusChange('Sent')} className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95">
                                        <PaperAirplaneIcon className="h-5 w-5" /> Dispatch Proposal
                                    </button>
                                )}
                                {offer.status === 'Sent' && (
                                    <>
                                        <button onClick={() => handleStatusChange('Accepted')} className="w-full flex items-center justify-center gap-2 h-14 bg-green-600 hover:bg-green-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition transform active:scale-95 shadow-lg shadow-green-500/20">
                                            <CheckBadgeIcon className="h-5 w-5" /> Confirm Acceptance
                                        </button>
                                        <button onClick={() => handleStatusChange('Rejected')} className="w-full flex items-center justify-center gap-2 h-14 bg-red-600 hover:bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition transform active:scale-95 shadow-lg shadow-red-500/20">
                                            <NoSymbolIcon className="h-5 w-5" /> Log Rejection
                                        </button>
                                    </>
                                )}
                                {(offer.status === 'Accepted' || offer.status === 'Rejected') && (
                                    <button onClick={() => handleStatusChange('Draft')} className="w-full flex items-center justify-center gap-2 h-14 bg-gray-800 hover:bg-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition border border-gray-700">
                                        <ArrowPathIcon className="h-5 w-5" /> Revert to Draft State
                                    </button>
                                )}
                                <button onClick={() => setIsDeleteModalOpen(true)} className="w-full flex items-center justify-center gap-2 h-14 bg-transparent border-2 border-red-900/50 hover:bg-red-900/20 text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition">
                                    <TrashIcon className="h-5 w-5" /> Purge Commercial Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteOffer}
                title="Purge Commercial Bid"
                message={`CRITICAL: Permanent deactivation of proposal ${offer.offer_number}. All financial line items and historical audit records linked to this bid will be destroyed. This operation is irreversible.`}
                confirmText="Decommission Bid"
                type="danger"
            />
        </div>
    );
}

/**
 * Technical Sub-Components
 */
function SummaryCard({ label, value, icon, highlight = false }) {
    return (
        <div className={`p-6 rounded-[2rem] border shadow-sm transition-transform hover:-translate-y-1 ${highlight ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className={`p-2 rounded-xl w-fit mb-4 ${highlight ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                {React.cloneElement(icon, { className: `h-5 w-5 ${highlight ? 'text-white' : 'text-indigo-600'}` })}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-100' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-xl font-black ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</p>
        </div>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-50 transition-colors">
                {React.cloneElement(icon, { className: "h-4 w-4 text-gray-400 group-hover:text-indigo-600" })}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
            </div>
        </div>
    );
}

export default OfferPage;