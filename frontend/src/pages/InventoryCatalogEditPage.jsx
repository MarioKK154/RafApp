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
    InformationCircleIcon,
    HashtagIcon,
    ShoppingBagIcon,
    ShieldCheckIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

function InventoryCatalogEditPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        shop_url_1: '',
        local_image_path: '',
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

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
                    description: item.description ?? '',
                    unit: item.unit ?? '',
                    shop_url_1: item.shop_url_1 ?? '',
                    local_image_path: item.local_image_path ?? '',
                });
            }
        } catch (err) {
            console.error("Registry Sync Failure:", err);
            toast.error('Failed to synchronize with material registry.');
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
            toast.error("Clearance Level Insufficient.");
            return;
        }

        setIsSubmitting(true);
        try {
            // FIXED: Path aligned with backend @router.put("/catalog/{item_id}")
            await axiosInstance.put(`/inventory/catalog/${itemId}`, formData);
            toast.success(`Registry node updated: ${formData.name}`);
            navigate('/inventory'); 
        } catch (err) {
            console.error("Update Failure:", err);
            toast.error(err.response?.data?.detail || 'Failed to sync registry updates.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return <LoadingSpinner text="Synchronizing Material Registry..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <div className="mb-10">
                <Link 
                    to="/inventory" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Terminate Edit / Return to Registry
                </Link>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <CubeIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tighter italic">
                                Modify Specification Node
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Primary Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <TagIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Core Specification</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Global Asset Descriptor*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                disabled={isSubmitting}
                                className="modern-input h-14 font-black" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Base Logistics Unit</label>
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
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Internal Asset Visual Path</label>
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
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Technical Telemetry / Details</label>
                            <div className="relative">
                                <DocumentTextIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                                <textarea 
                                    name="description" 
                                    rows="5" 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    disabled={isSubmitting}
                                    className="modern-input h-auto py-4 pl-12 resize-none text-sm leading-relaxed"
                                    placeholder="Input manufacturer specifications..."
                                ></textarea>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <ShoppingBagIcon className="h-4 w-4 text-indigo-500" /> Procurement Link
                        </label>
                        <div className="space-y-1">
                            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Master Vendor URL</label>
                            <input 
                                type="url" 
                                name="shop_url_1" 
                                value={formData.shop_url_1} 
                                onChange={handleChange} 
                                disabled={isSubmitting}
                                placeholder="https://vendor.is/..."
                                className="modern-input text-xs italic" 
                            />
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting || !canManageCatalog}
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                    >
                        {isSubmitting ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Updating...</>
                        ) : (
                            <><CheckBadgeIcon className="h-5 w-5" /> Commit Specs</>
                        )}
                    </button>

                    <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[1.5rem] border border-orange-100 dark:border-orange-800/30 flex gap-3">
                        <InformationCircleIcon className="h-6 w-6 text-orange-600 shrink-0" />
                        <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-black uppercase tracking-tight">
                            Critical Alert: Modifications to the Master Catalog affect all project BoQ templates and future procurement requests system-wide.
                        </p>
                    </div>

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