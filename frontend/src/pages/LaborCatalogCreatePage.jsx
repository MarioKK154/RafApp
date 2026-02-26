import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    WrenchScrewdriverIcon, 
    BanknotesIcon, 
    TagIcon, 
    ChevronLeftIcon,
    CheckBadgeIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

function LaborCatalogCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        description: '',
        default_unit_price: '',
        unit: 'hour'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.default_unit_price) {
            toast.warn("Please complete all required fields.");
            return;
        }

        setIsSaving(true);
        try {
            await axiosInstance.post('/labor-catalog/', {
                ...formData,
                default_unit_price: parseFloat(formData.default_unit_price)
            });
            toast.success('Service category registered successfully!');
            navigate('/labor-catalog');
        } catch (err) {
            console.error("Labor Catalog Create Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to initialize catalog item.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link 
                    to="/labor-catalog" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('back_to_catalog')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl">
                        <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                        {t('new_service')}
                    </h1>
                </div>
            </div>

            {/* Entry Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                        Service Description*
                    </label>
                    <div className="relative">
                        <TagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            name="description" 
                            required 
                            value={formData.description} 
                            onChange={handleChange} 
                            placeholder="e.g., Master Electrician Rate"
                            className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                        />
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400 ml-1">The name of the labor category as it will appear on commercial offers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                            Unit Price (ISK)*
                        </label>
                        <div className="relative">
                            <BanknotesIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="number" 
                                name="default_unit_price" 
                                required 
                                value={formData.default_unit_price} 
                                onChange={handleChange} 
                                min="0" 
                                step="1" 
                                placeholder="0"
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                            Billing Unit*
                        </label>
                        <input 
                            type="text" 
                            name="unit" 
                            required 
                            value={formData.unit} 
                            onChange={handleChange} 
                            placeholder="e.g., hour, visit, point"
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <Link 
                        to="/labor-catalog" 
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Cancel
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Syncing...
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

            {/* Visual Guide / Legend */}
            <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <WrenchScrewdriverIcon className="h-4 w-4" /> Usage Context
                </h3>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 leading-relaxed italic">
                    "Registered labor items serve as the master price list for Bill of Quantities (BoQ) generation and commercial bid creation. Ensure pricing aligns with current union rates and operational overhead."
                </p>
            </div>
        </div>
    );
}

export default LaborCatalogCreatePage;