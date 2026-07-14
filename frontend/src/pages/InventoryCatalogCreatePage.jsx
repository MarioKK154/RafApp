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
        master_category: '',
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
    
    const [existingFilters, setExistingFilters] = useState([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    
    const [showNewMaster, setShowNewMaster] = useState(false);
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [showNewSubcategory, setShowNewSubcategory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = !!isSuperuser;

    React.useEffect(() => {
        if (!canManageCatalog) {
            toast.error("Superadmin clearance level required.");
            navigate('/inventory');
        }
    }, [canManageCatalog, navigate]);

    React.useEffect(() => {
        const fetchFilters = async () => {
            setIsLoadingFilters(true);
            try {
                const res = await axiosInstance.get('/inventory/catalog/filters');
                setExistingFilters(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error("Failed to load catalog filters:", err);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        if (canManageCatalog) {
            fetchFilters();
        }
    }, [canManageCatalog]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMasterChange = (e) => {
        const val = e.target.value;
        if (val === 'NEW') {
            setShowNewMaster(true);
            setFormData(prev => ({ 
                ...prev, 
                master_category: '', 
                category: '', 
                category_en: '', 
                subcategory: '', 
                subcategory_en: '' 
            }));
            setShowNewCategory(true);
            setShowNewSubcategory(true);
        } else {
            setShowNewMaster(false);
            setFormData(prev => ({ 
                ...prev, 
                master_category: val, 
                category: '', 
                category_en: '', 
                subcategory: '', 
                subcategory_en: '' 
            }));
            setShowNewCategory(false);
            setShowNewSubcategory(false);
        }
    };

    const handleCategoryChange = (e) => {
        const val = e.target.value;
        const selectedMasterNode = existingFilters.find(f => f.category === formData.master_category);
        const availableCategories = selectedMasterNode ? selectedMasterNode.subcategories : [];

        if (val === 'NEW') {
            setShowNewCategory(true);
            setFormData(prev => ({ 
                ...prev, 
                category: '', 
                category_en: '', 
                subcategory: '', 
                subcategory_en: '' 
            }));
            setShowNewSubcategory(true);
        } else {
            setShowNewCategory(false);
            const node = availableCategories.find(c => c.key === val);
            setFormData(prev => ({
                ...prev,
                category: val,
                category_en: node ? node.label : val,
                subcategory: '',
                subcategory_en: ''
            }));
            setShowNewSubcategory(false);
        }
    };

    const handleSubcategoryChange = (e) => {
        const val = e.target.value;
        const selectedMasterNode = existingFilters.find(f => f.category === formData.master_category);
        const availableCategories = selectedMasterNode ? selectedMasterNode.subcategories : [];
        const selectedCategoryNode = availableCategories.find(c => c.key === formData.category);
        const availableSubsubcategories = selectedCategoryNode ? selectedCategoryNode.subsubcategories : [];

        if (val === 'NEW') {
            setShowNewSubcategory(true);
            setFormData(prev => ({ ...prev, subcategory: '', subcategory_en: '' }));
        } else {
            setShowNewSubcategory(false);
            const node = availableSubsubcategories.find(s => s.key === val);
            setFormData(prev => ({
                ...prev,
                subcategory: val,
                subcategory_en: node ? node.label : val
            }));
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingPhoto(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axiosInstance.post('/inventory/catalog/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = res.data?.url;
            if (url) {
                setFormData(prev => ({ ...prev, local_image_path: url }));
                toast.success('Material image uploaded successfully!');
            }
        } catch (err) {
            console.error("Image upload failed:", err);
            toast.error(err.response?.data?.detail || 'Failed to upload image.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error(t('admin_clearance_required'));
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post('/inventory/catalog', formData);
            toast.success(`${t('toast_material_initialized')} ${formData.name}`);
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
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
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
                                    <label className="h-14 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-600 transition text-[10px] font-black uppercase tracking-widest select-none shrink-0">
                                        {isUploadingPhoto ? 'Uploading...' : 'Upload File'}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handlePhotoUpload} 
                                            className="hidden" 
                                            disabled={isUploadingPhoto}
                                        />
                                    </label>
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

                        {/* 3-Level Category Selector */}
                        <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Material Categorization</h3>
                            
                            {/* Master Category (Level 1) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Master Category (Level 1)</label>
                                    <select 
                                        name="master_category_select"
                                        value={showNewMaster ? 'NEW' : formData.master_category} 
                                        onChange={handleMasterChange}
                                        className="modern-input h-14 font-black"
                                    >
                                        <option value="">-- Select Master Category --</option>
                                        {existingFilters.map(f => (
                                            <option key={f.category} value={f.category}>{f.category_display || f.category}</option>
                                        ))}
                                        <option value="NEW" className="text-indigo-600 font-bold">+ Create New Category...</option>
                                    </select>
                                </div>
                                {showNewMaster && (
                                    <div className="space-y-1 animate-in slide-in-from-left duration-200">
                                        <label className="block text-[10px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">New Master Category Name</label>
                                        <input 
                                            type="text" 
                                            name="master_category" 
                                            value={formData.master_category} 
                                            onChange={handleChange} 
                                            placeholder="e.g. Strengir"
                                            className="modern-input h-14 font-black border-indigo-200 focus:border-indigo-500" 
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Category / Subcategory (Level 2) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Category / Subcategory (Level 2)</label>
                                    <select 
                                        name="category_select"
                                        value={showNewCategory ? 'NEW' : formData.category} 
                                        onChange={handleCategoryChange}
                                        disabled={!formData.master_category && !showNewMaster}
                                        className="modern-input h-14 font-black"
                                    >
                                        <option value="">-- Select Category --</option>
                                        {(() => {
                                            const selectedMasterNode = existingFilters.find(f => f.category === formData.master_category);
                                            const availableCategories = selectedMasterNode ? selectedMasterNode.subcategories : [];
                                            return availableCategories.map(c => (
                                                <option key={c.key} value={c.key}>{c.key} ({c.label})</option>
                                            ));
                                        })()}
                                        {(formData.master_category || showNewMaster) && (
                                            <option value="NEW" className="text-indigo-600 font-bold">+ Create New Subcategory...</option>
                                        )}
                                    </select>
                                </div>
                                {showNewCategory && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left duration-200 col-span-1">
                                        <div className="space-y-1">
                                            <label className="block text-[8px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">Category Key (EN)</label>
                                            <input 
                                                type="text" 
                                                name="category" 
                                                value={formData.category} 
                                                onChange={handleChange} 
                                                placeholder="e.g. Power cables"
                                                className="modern-input h-14 font-black border-indigo-200 focus:border-indigo-500" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[8px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">Category Display (IS)</label>
                                            <input 
                                                type="text" 
                                                name="category_en" 
                                                value={formData.category_en} 
                                                onChange={handleChange} 
                                                placeholder="e.g. Aflstrengir"
                                                className="modern-input h-14 border-indigo-200 focus:border-indigo-500" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Subcategory / Sub-subcategory (Level 3) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Sub-subcategory (Level 3 - Optional)</label>
                                    <select 
                                        name="subcategory_select"
                                        value={showNewSubcategory ? 'NEW' : formData.subcategory} 
                                        onChange={handleSubcategoryChange}
                                        disabled={!formData.category && !showNewCategory}
                                        className="modern-input h-14 font-black"
                                    >
                                        <option value="">-- Select Sub-subcategory (None) --</option>
                                        {(() => {
                                            const selectedMasterNode = existingFilters.find(f => f.category === formData.master_category);
                                            const availableCategories = selectedMasterNode ? selectedMasterNode.subcategories : [];
                                            const selectedCategoryNode = availableCategories.find(c => c.key === formData.category);
                                            const availableSubsubcategories = selectedCategoryNode ? selectedCategoryNode.subsubcategories : [];
                                            return availableSubsubcategories.map(s => (
                                                <option key={s.key} value={s.key}>{s.key} ({s.label})</option>
                                            ));
                                        })()}
                                        {(formData.category || showNewCategory) && (
                                            <option value="NEW" className="text-indigo-600 font-bold">+ Create New Sub-subcategory...</option>
                                        )}
                                    </select>
                                </div>
                                {showNewSubcategory && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left duration-200 col-span-1">
                                        <div className="space-y-1">
                                            <label className="block text-[8px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">Sub-subcat Key (EN)</label>
                                            <input 
                                                type="text" 
                                                name="subcategory" 
                                                value={formData.subcategory} 
                                                onChange={handleChange} 
                                                placeholder="e.g. Copper power cables"
                                                className="modern-input h-14 font-black border-indigo-200 focus:border-indigo-500" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[8px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">Sub-subcat Display (IS)</label>
                                            <input 
                                                type="text" 
                                                name="subcategory_en" 
                                                value={formData.subcategory_en} 
                                                onChange={handleChange} 
                                                placeholder="e.g. Kopar aflstrengir"
                                                className="modern-input h-14 border-indigo-200 focus:border-indigo-500" 
                                            />
                                        </div>
                                    </div>
                                )}
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