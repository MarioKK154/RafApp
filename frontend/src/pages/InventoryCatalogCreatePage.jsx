import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { 
    CubeIcon, 
    TagIcon, 
    DocumentTextIcon, 
    PhotoIcon, 
    ShoppingCartIcon,
    ChevronLeftIcon,
    ArrowPathIcon,
    CheckBadgeIcon,
    InformationCircleIcon,
    HashtagIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';

function InventoryCatalogCreatePage() {
    const { t } = useTranslation();
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
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = !!isSuperuser;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error(t('admin_clearance_required'));
            return;
        }

        setIsSubmitting(true);
        try {
            // Align with backend inventory catalog endpoint
            await axiosInstance.post('/inventory/catalog', formData);
            toast.success(`${t('toast_material_initialized')} ${formData.name}`);
            
            // REDIRECT SYNC: Pointing back to the main Global Inventory Node
            navigate('/inventory'); 
        } catch (err) {
            console.error("Catalog Entry Error:", err);
            toast.error(err.response?.data?.detail || t('toast_failed_register_material'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Protocol */}
            <div className="mb-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                {/* BREADCRUMB SYNC: Updated link to point to /inventory */}
                <Link 
                    to="/inventory" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Terminate / Return to Global Inventory
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <CubeIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('new_material_page_title')}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <TagIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('core_metadata')}</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('asset_title_identifier_req')}</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder={t('placeholder_3_phase')}
                                className="modern-input h-14 font-black" 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('display_name_en_optional')}</label>
                            <input
                                type="text"
                                name="name_en"
                                value={formData.name_en}
                                onChange={handleChange}
                                placeholder={t('placeholder_shown_en')}
                                className="modern-input h-12"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('base_measurement_unit')}</label>
                                <div className="relative">
                                    <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="unit" 
                                        value={formData.unit} 
                                        onChange={handleChange} 
                                        placeholder={t('placeholder_units')}
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('visual_telemetry_path')}</label>
                                <div className="relative">
                                    <PhotoIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="local_image_path" 
                                        value={formData.local_image_path} 
                                        onChange={handleChange} 
                                        placeholder={t('placeholder_visual_path')}
                                        className="modern-input h-14 pl-12 font-mono text-xs" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('technical_specifications')}</label>
                            <textarea 
                                name="description" 
                                rows="4" 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder={t('placeholder_input_manufacturer')}
                                className="modern-input h-auto py-4 resize-none text-sm"
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('category_is_primary')}</label>
                                <input 
                                    type="text" 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    placeholder={t('placeholder_kaplar')}
                                    className="modern-input h-12" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('category_en')}</label>
                                <input 
                                    type="text" 
                                    name="category_en" 
                                    value={formData.category_en} 
                                    onChange={handleChange} 
                                    placeholder={t('placeholder_cables')}
                                    className="modern-input h-12" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('subcategory_is_primary')}</label>
                                <input 
                                    type="text" 
                                    name="subcategory" 
                                    value={formData.subcategory} 
                                    onChange={handleChange} 
                                    placeholder={t('placeholder_kraftkaplar')}
                                    className="modern-input h-12" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('subcategory_en')}</label>
                                <input 
                                    type="text" 
                                    name="subcategory_en" 
                                    value={formData.subcategory_en} 
                                    onChange={handleChange} 
                                    placeholder={t('placeholder_power_cables')}
                                    className="modern-input h-12" 
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <ShoppingBagIcon className="h-4 w-4 text-indigo-500" /> Procurement Links
                        </label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Ronning URL</label>
                                <input 
                                    type="url" 
                                    name="shop_url_1" 
                                    value={formData.shop_url_1} 
                                    onChange={handleChange} 
                                    placeholder="https://ronning.is/..."
                                    className="modern-input text-xs italic" 
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Iskraft URL</label>
                                <input 
                                    type="url" 
                                    name="shop_url_2" 
                                    value={formData.shop_url_2} 
                                    onChange={handleChange} 
                                    placeholder="https://iskraft.is/..."
                                    className="modern-input text-xs italic" 
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Reykjafell URL</label>
                                <input 
                                    type="url" 
                                    name="shop_url_3" 
                                    value={formData.shop_url_3} 
                                    onChange={handleChange} 
                                    placeholder="https://reykjafell.is/..."
                                    className="modern-input text-xs italic" 
                                />
                            </div>
                        </div>
                        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('supplier_article_codes_optional')}</p>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Rönning SKU</label>
                                <input
                                    type="text"
                                    name="ronning_sku"
                                    value={formData.ronning_sku}
                                    onChange={handleChange}
                                    className="modern-input text-xs font-mono h-10"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Ískraft SKU</label>
                                <input
                                    type="text"
                                    name="iskraft_sku"
                                    value={formData.iskraft_sku}
                                    onChange={handleChange}
                                    className="modern-input text-xs font-mono h-10"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Reykjafell SKU</label>
                                <input
                                    type="text"
                                    name="reykjafell_sku"
                                    value={formData.reykjafell_sku}
                                    onChange={handleChange}
                                    className="modern-input text-xs font-mono h-10"
                                />
                            </div>
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                    >
                        {isSubmitting ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Syncing...</>
                        ) : (
                            <><CheckBadgeIcon className="h-5 w-5" /> Commit to Master</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InventoryCatalogCreatePage;