import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    CubeIcon, 
    TagIcon, 
    DocumentTextIcon, 
    PhotoIcon, 
    ShoppingCartIcon,
    ChevronLeftIcon,
    ArrowPathIcon,
    CheckBadgeIcon,
    FingerPrintIcon,
    InformationCircleIcon,
    HashtagIcon,
    ShoppingBagIcon,
    ShieldCheckIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

function InventoryCatalogEditPage() {
    const { t } = useTranslation();
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        category: '',
        subcategory: '',
        category_en: '',
        subcategory_en: '',
        description: '',
        description_en: '',
        unit: '',
        shop_url_1: '',
        shop_url_2: '',
        shop_url_3: '',
        ronning_sku: '',
        iskraft_sku: '',
        reykjafell_sku: '',
        local_image_path: '',
        warehouse_quantity: '',
        master_category: '',
        brand: '',
        voltage: '',
        amperage: '',
        ip_rating: '',
        ar_labor_tasks_list: '',
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isEditingShop1, setIsEditingShop1] = useState(false);
    const [isEditingShop2, setIsEditingShop2] = useState(false);
    const [isEditingShop3, setIsEditingShop3] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = !!isSuperuser;

    /**
     * Protocol: Sync with /inventory/catalog/{item_id}
     */
    const fetchItemData = useCallback(async () => {
        if (!itemId) return;
        setIsLoadingData(true);
        try {
            // FIXED: Path aligned with backend @router.get("/catalog/{item_id}")
            const response = await axiosInstance.get(`/inventory/catalog/${itemId}`);
            const item = response.data;
            if (item) {
                setFormData({
                    name: item.name ?? '',
                    name_en: item.name_en ?? '',
                    category: item.category ?? '',
                    subcategory: item.subcategory ?? '',
                    category_en: item.category_en ?? '',
                    subcategory_en: item.subcategory_en ?? '',
                    description: item.description ?? '',
                    description_en: item.description_en ?? '',
                    unit: item.unit ?? '',
                    shop_url_1: item.shop_url_1 ?? '',
                    shop_url_2: item.shop_url_2 ?? '',
                    shop_url_3: item.shop_url_3 ?? '',
                    ronning_sku: item.ronning_sku ?? '',
                    iskraft_sku: item.iskraft_sku ?? '',
                    reykjafell_sku: item.reykjafell_sku ?? '',
                    local_image_path: item.local_image_path ?? '',
                    master_category: item.master_category ?? '',
                    brand: item.brand ?? '',
                    voltage: item.voltage ?? '',
                    amperage: item.amperage ?? '',
                    ip_rating: item.ip_rating ?? '',
                    ar_labor_tasks_list: item.ar_labor_tasks_list ?? '',
                    warehouse_quantity:
                        item.warehouse_quantity != null ? String(item.warehouse_quantity) : '',
                });
            }
        } catch (err) {
            console.error("Registry Sync Failure:", err);
            toast.error(t('toast_failed_sync_material_registry'));
            navigate('/inventory'); 
        } finally {
            setIsLoadingData(false);
        }
    }, [itemId, navigate]);

    useEffect(() => {
        if (itemId) fetchItemData();
    }, [itemId, fetchItemData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error(t('clearance_level_insufficient'));
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = { ...formData };
            if (payload.warehouse_quantity === '' || payload.warehouse_quantity == null) {
                delete payload.warehouse_quantity;
            } else {
                payload.warehouse_quantity = parseFloat(payload.warehouse_quantity);
            }
            // FIXED: Path aligned with backend @router.put("/catalog/{item_id}")
            await axiosInstance.put(`/inventory/catalog/${itemId}`, payload);
            toast.success(`${t('toast_registry_node_updated')} ${formData.name}`);
            navigate('/inventory'); 
        } catch (err) {
            console.error("Update Failure:", err);
            toast.error(err.response?.data?.detail || t('toast_failed_sync_registry_updates'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return <LoadingSpinner text={t('synchronizing_material_registry')} size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                    <Link 
                        to="/inventory" 
                        className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                    >
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Terminate Edit / Return to Registry
                    </Link>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <CubeIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                    {t('modify_spec', { defaultValue: 'Modify Specification' })}
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <FingerPrintIcon className="h-3 w-3 text-indigo-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Registry ID: <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm tracking-normal">{itemId}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Primary Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <TagIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('core_specification')}</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('global_asset_descriptor_req')}</label>
                            {isSuperuser ? (
                                <input 
                                    type="text" 
                                    name="name" 
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="modern-input h-14 font-black" 
                                />
                            ) : (
                                <div className="h-14 flex items-center px-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-black text-gray-800 dark:text-gray-100 cursor-default select-none">
                                    {formData.name || '—'}
                                </div>
                            )}
                        </div>

                        {isSuperuser && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('base_logistics_unit')}</label>
                                    <div className="relative">
                                        <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            name="unit" 
                                            value={formData.unit} 
                                            onChange={handleChange} 
                                            disabled={isSubmitting}
                                            className="modern-input h-14 pl-12" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('internal_asset_visual_path')}</label>
                                    <div className="relative">
                                        <PhotoIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            name="local_image_path" 
                                            value={formData.local_image_path} 
                                            onChange={handleChange} 
                                            disabled={isSubmitting}
                                            className="modern-input h-14 pl-12 font-mono text-xs" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">
                                        Central warehouse quantity
                                    </label>
                                    <input
                                        type="number"
                                        name="warehouse_quantity"
                                        min="0"
                                        step="any"
                                        value={formData.warehouse_quantity}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input h-14 font-mono text-sm"
                                        placeholder="0"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                        Stock held centrally before issuing to projects (admin / superuser).
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('technical_telemetry_details')}</label>
                            <div className="relative">
                                <DocumentTextIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                                {isSuperuser ? (
                                    <textarea 
                                        name="description" 
                                        rows="5" 
                                        value={formData.description} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-auto py-4 pl-12 resize-none text-sm leading-relaxed"
                                        placeholder={t('placeholder_input_manufacturer_specs')}
                                    ></textarea>
                                ) : (
                                    <div className="modern-input h-auto py-4 pl-12 text-sm leading-relaxed bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl cursor-default select-none min-h-[4rem] flex items-start">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {formData.description || t('registry_entry_no_specs')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isSuperuser && (
                            <div className="space-y-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('english_ui_language')}</p>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('display_name_en')}</label>
                                    <input
                                        type="text"
                                        name="name_en"
                                        value={formData.name_en}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input h-12"
                                        placeholder={t('placeholder_optional_en_ui')}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('technical_details_en')}</label>
                                    <textarea
                                        name="description_en"
                                        rows={4}
                                        value={formData.description_en}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input h-auto py-3 resize-none text-sm"
                                        placeholder={t('placeholder_optional_translation')}
                                    />
                                </div>
                            </div>
                        )}

                        {isSuperuser && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Category (IS / primary)</label>
                                    <input 
                                        type="text" 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Category (EN)</label>
                                    <input 
                                        type="text" 
                                        name="category_en" 
                                        value={formData.category_en} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                        placeholder={t('placeholder_en_label_menus')}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Subcategory (IS / primary)</label>
                                    <input 
                                        type="text" 
                                        name="subcategory" 
                                        value={formData.subcategory} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Subcategory (EN)</label>
                                    <input 
                                        type="text" 
                                        name="subcategory_en" 
                                        value={formData.subcategory_en} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        placeholder={t('placeholder_en_label_full_path')}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {isSuperuser && (
                        <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                            <div className="flex items-center gap-3">
                                <DocumentTextIcon className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('engineering_logistics_telemetry')}</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('brand_label')}</label>
                                    <input 
                                        type="text" 
                                        name="brand" 
                                        value={formData.brand} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('voltage_label')}</label>
                                    <input 
                                        type="text" 
                                        name="voltage" 
                                        value={formData.voltage} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('amperage_label')}</label>
                                    <input 
                                        type="text" 
                                        name="amperage" 
                                        value={formData.amperage} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('ip_rating_label')}</label>
                                    <input 
                                        type="text" 
                                        name="ip_rating" 
                                        value={formData.ip_rating} 
                                        onChange={handleChange} 
                                        disabled={isSubmitting}
                                        className="modern-input h-12" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('master_category_label')}</label>
                                <input 
                                    type="text" 
                                    name="master_category" 
                                    value={formData.master_category} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="modern-input h-12" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-purple-400 uppercase mb-2 ml-1 tracking-widest">{t('ar_labor_tasks_array')}</label>
                                <textarea 
                                    name="ar_labor_tasks_list" 
                                    rows="3" 
                                    value={formData.ar_labor_tasks_list} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="modern-input h-auto py-4 resize-none text-sm leading-relaxed border-purple-200 dark:border-purple-900/50"
                                    placeholder={t('placeholder_ar_labor')}
                                ></textarea>
                            </div>
                        </section>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-between ml-1">
                            <span className="flex items-center gap-2">
                                <ShoppingBagIcon className="h-4 w-4 text-indigo-500" /> Procurement Links
                            </span>
                            {!isSuperuser && (
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    View-only – managed by system root
                                </span>
                            )}
                        </label>
                        <div className="space-y-3">
                            {/* Jóhann Rönning */}
                            <div className="space-y-1">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Jóhann Rönning</label>
                                {isSuperuser ? (
                                    isEditingShop1 ? (
                                        <input
                                            type="url"
                                            name="shop_url_1"
                                            value={formData.shop_url_1}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                            placeholder="https://ronning.is/..."
                                            className="modern-input text-xs italic"
                                            onBlur={() => !isSubmitting && setIsEditingShop1(false)}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {formData.shop_url_1 ? (
                                                <a
                                                    href={formData.shop_url_1}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                                >
                                                    johann ronning
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingShop1(true)}
                                                className="text-[9px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em]"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div>
                                        {formData.shop_url_1 ? (
                                            <a
                                                href={formData.shop_url_1}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                            >
                                                johann ronning
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Iskraft */}
                            <div className="space-y-1">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Iskraft</label>
                                {isSuperuser ? (
                                    isEditingShop2 ? (
                                        <input
                                            type="url"
                                            name="shop_url_2"
                                            value={formData.shop_url_2}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                            placeholder="https://iskraft.is/..."
                                            className="modern-input text-xs italic"
                                            onBlur={() => !isSubmitting && setIsEditingShop2(false)}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {formData.shop_url_2 ? (
                                                <a
                                                    href={formData.shop_url_2}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                                >
                                                    iskraft
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingShop2(true)}
                                                className="text-[9px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em]"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div>
                                        {formData.shop_url_2 ? (
                                            <a
                                                href={formData.shop_url_2}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                            >
                                                iskraft
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reykjafell */}
                            <div className="space-y-1">
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Reykjafell</label>
                                {isSuperuser ? (
                                    isEditingShop3 ? (
                                        <input
                                            type="url"
                                            name="shop_url_3"
                                            value={formData.shop_url_3}
                                            onChange={handleChange}
                                            disabled={isSubmitting}
                                            placeholder="https://reykjafell.is/..."
                                            className="modern-input text-xs italic"
                                            onBlur={() => !isSubmitting && setIsEditingShop3(false)}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {formData.shop_url_3 ? (
                                                <a
                                                    href={formData.shop_url_3}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                            >
                                                reykjafell
                                            </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingShop3(true)}
                                                className="text-[9px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em]"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div>
                                        {formData.shop_url_3 ? (
                                            <a
                                                href={formData.shop_url_3}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em]"
                                            >
                                                reykjafell
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">{t('no_link_configured')}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {isSuperuser && (
                            <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('supplier_article_codes')}</p>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Rönning SKU</label>
                                    <input
                                        type="text"
                                        name="ronning_sku"
                                        value={formData.ronning_sku}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input text-xs font-mono h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Ískraft SKU</label>
                                    <input
                                        type="text"
                                        name="iskraft_sku"
                                        value={formData.iskraft_sku}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input text-xs font-mono h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Reykjafell SKU</label>
                                    <input
                                        type="text"
                                        name="reykjafell_sku"
                                        value={formData.reykjafell_sku}
                                        onChange={handleChange}
                                        disabled={isSubmitting}
                                        className="modern-input text-xs font-mono h-10"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    {isSuperuser && (
                        <>
                            <button
                                type="submit"
                                disabled={isSubmitting || !canManageCatalog}
                                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <><ArrowPathIcon className="h-5 w-5 animate-spin" /> {t('syncing')}</>
                                ) : (
                                    <><CheckBadgeIcon className="h-5 w-5" /> {t('save_changes')}</>
                                )}
                            </button>

                            <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[1.5rem] border border-orange-100 dark:border-orange-800/30 flex gap-3">
                                <InformationCircleIcon className="h-6 w-6 text-orange-600 shrink-0" />
                                <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-black uppercase tracking-tight">
                                    Critical Alert: Modifications to the Master Catalog affect all project BoQ templates and future procurement requests system-wide.
                                </p>
                            </div>
                        </>
                    )}

                    {isSuperuser && (
                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800/30 flex gap-3">
                            <ShieldCheckIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-tight leading-relaxed">
                                Root Mode: Global Material modification authorized.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default InventoryCatalogEditPage;