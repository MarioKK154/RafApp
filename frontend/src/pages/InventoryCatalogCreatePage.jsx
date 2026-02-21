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
    InformationCircleIcon,
    HashtagIcon,
    ShoppingBagIcon
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

    const isSuperuser = user?.is_superuser;
    const canManageCatalog = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error("Administrative clearance required.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Note: The backend endpoint is usually /inventory/ (plural/singular check)
            await axiosInstance.post('/inventory/', formData);
            toast.success(`Material "${formData.name}" initialized in registry.`);
            
            // REDIRECT SYNC: Pointing back to the main Global Inventory Node
            navigate('/inventory'); 
        } catch (err) {
            console.error("Catalog Entry Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to register material.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Protocol */}
            <div className="mb-10">
                {/* BREADCRUMB SYNC: Updated link to point to /inventory */}
                <Link 
                    to="/inventory" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Terminate / Return to Global Inventory
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <CubeIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
                            Material Initialization
                        </h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                            GLOBAL LOGISTICS / REGISTRY ENTRY
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <TagIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Core Metadata</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Asset Title / Identifier*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="e.g. 3-Phase Circuit Breaker 16A"
                                className="modern-input h-14 font-black" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Base Measurement Unit</label>
                                <div className="relative">
                                    <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="unit" 
                                        value={formData.unit} 
                                        onChange={handleChange} 
                                        placeholder="pcs, m, kg, units"
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Visual Telemetry Path</label>
                                <div className="relative">
                                    <PhotoIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="local_image_path" 
                                        value={formData.local_image_path} 
                                        onChange={handleChange} 
                                        placeholder="assets/items/item_00.jpg"
                                        className="modern-input h-14 pl-12 font-mono text-xs" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Technical Specifications</label>
                            <textarea 
                                name="description" 
                                rows="4" 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder="Input manufacturer data..."
                                className="modern-input h-auto py-4 resize-none text-sm"
                            ></textarea>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <ShoppingBagIcon className="h-4 w-4 text-indigo-500" /> Procurement Hub
                        </label>
                        <input 
                            type="url" 
                            name="shop_url_1" 
                            value={formData.shop_url_1} 
                            onChange={handleChange} 
                            placeholder="https://vendor.is/..."
                            className="modern-input text-xs italic" 
                        />
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
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