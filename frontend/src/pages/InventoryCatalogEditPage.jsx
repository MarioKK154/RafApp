import React, { useState, useEffect, useCallback } from 'react';
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
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function InventoryCatalogEditPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data States
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        shop_url_1: '',
        local_image_path: '',
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permissions: Admin, PM, or Superuser for master catalog management
    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Fetches current material specifications from the registry.
     */
    const fetchItemData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const response = await axiosInstance.get(`/inventory/${itemId}`);
            const item = response.data;
            setFormData({
                name: item.name ?? '',
                description: item.description ?? '',
                unit: item.unit ?? '',
                shop_url_1: item.shop_url_1 ?? '',
                local_image_path: item.local_image_path ?? '',
            });
        } catch (err) {
            console.error("Fetch Item Error:", err);
            toast.error('Failed to synchronize with material registry.');
            navigate('/inventory/catalog');
        } finally {
            setIsLoadingData(false);
        }
    }, [itemId, navigate]);

    useEffect(() => {
        fetchItemData();
    }, [fetchItemData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error("Security clearance required to modify master catalog.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.put(`/inventory/${itemId}`, formData);
            toast.success(`Specifications for "${formData.name}" updated.`);
            navigate('/inventory/catalog');
        } catch (err) {
            console.error("Catalog Update Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to sync registry updates.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return <LoadingSpinner text="Retrieving technical specifications..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigation */}
            <div className="mb-8">
                <Link 
                    to="/inventory/catalog" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Master Catalog
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <CubeIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                Edit Material Specs
                            </h1>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                <FingerPrintIcon className="h-3 w-3" />
                                Registry ID: {itemId}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Form Card */}
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                
                {/* Identity Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Global Material Name*</label>
                        <input 
                            type="text" 
                            name="name" 
                            required 
                            value={formData.name} 
                            onChange={handleChange} 
                            disabled={isSubmitting}
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 font-bold" 
                        />
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
                                disabled={isSubmitting}
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Internal Asset Path</label>
                        <div className="relative">
                            <PhotoIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                name="local_image_path" 
                                value={formData.local_image_path} 
                                onChange={handleChange} 
                                disabled={isSubmitting}
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 text-sm" 
                            />
                        </div>
                    </div>
                </div>

                {/* Technical Description Section */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Technical Specifications</label>
                    <div className="relative">
                        <DocumentTextIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <textarea 
                            name="description" 
                            rows="3" 
                            value={formData.description} 
                            onChange={handleChange} 
                            disabled={isSubmitting}
                            className="pl-10 pt-2.5 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </div>
                </div>

                {/* Procurement Section */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">External Procurement URL</label>
                    <div className="relative">
                        <ShoppingCartIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="url" 
                            name="shop_url_1" 
                            value={formData.shop_url_1} 
                            onChange={handleChange} 
                            disabled={isSubmitting}
                            className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 text-sm" 
                        />
                    </div>
                </div>

                {/* Action Interface */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <Link 
                        to="/inventory/catalog" 
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Discard Changes
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !canManageCatalog} 
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
                                Commit Specifications
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Warning / Usage context */}
            <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[2rem] border border-orange-100 dark:border-orange-800 flex gap-4">
                <InformationCircleIcon className="h-6 w-6 text-orange-600 shrink-0" />
                <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                    Audit Note: Modifications to catalog items will propagate to all future procurement cycles. 
                    This does not affect historical inventory logs already processed.
                </p>
            </div>
        </div>
    );
}

export default InventoryCatalogEditPage;