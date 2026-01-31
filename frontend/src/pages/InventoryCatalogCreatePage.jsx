import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function InventoryCatalogCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        shop_url_1: '',
        local_image_path: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permissions: Admin, PM, or Superuser can expand the master catalog
    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error("Administrative clearance required to modify master catalog.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post('/inventory/', formData);
            toast.success(`Material "${formData.name}" initialized in registry.`);
            navigate('/inventory/catalog');
        } catch (err) {
            console.error("Catalog Entry Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to register material.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link 
                    to="/inventory/catalog" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Master Catalog
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <CubeIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                            Register Material
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Add a new technical asset to the global materials list.</p>
                    </div>
                </div>
            </div>

            {/* Entry Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                
                {/* Primary Identification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Material Name*</label>
                        <div className="relative group">
                            <CubeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="e.g., 3-Phase Circuit Breaker 16A"
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 font-bold" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Base Unit</label>
                        <div className="relative">
                            <TagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                name="unit" 
                                value={formData.unit} 
                                onChange={handleChange} 
                                placeholder="pcs, m, kg..."
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Image Reference</label>
                        <div className="relative">
                            <PhotoIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                name="local_image_path" 
                                value={formData.local_image_path} 
                                onChange={handleChange} 
                                placeholder="assets/items/item_01.jpg"
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 text-sm" 
                            />
                        </div>
                    </div>
                </div>

                {/* Technical Description */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Technical Specifications</label>
                    <div className="relative">
                        <DocumentTextIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <textarea 
                            name="description" 
                            rows="3" 
                            value={formData.description} 
                            onChange={handleChange} 
                            placeholder="Power rating, dimensions, manufacturer data..."
                            className="pl-10 pt-2.5 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </div>
                </div>

                {/* Procurement Link */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Procurement URL</label>
                    <div className="relative">
                        <ShoppingCartIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="url" 
                            name="shop_url_1" 
                            value={formData.shop_url_1} 
                            onChange={handleChange} 
                            placeholder="https://vendor-store.is/product/..."
                            className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 text-sm" 
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <Link 
                        to="/inventory/catalog" 
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Cancel
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Syncing Registry...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-5 w-5 mr-2" />
                                Commit to Catalog
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Visual Context / Legend */}
            <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 flex gap-4">
                <InformationCircleIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                    Warning: Catalog items are shared registry assets. Modifications here will appear across all Project Bill of Quantities (BoQ) and shopping lists.
                </p>
            </div>
        </div>
    );
}

export default InventoryCatalogCreatePage;