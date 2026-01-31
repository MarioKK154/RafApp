import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    WrenchScrewdriverIcon, 
    BanknotesIcon, 
    TagIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    FingerPrintIcon
} from '@heroicons/react/24/outline';

function LaborCatalogEditPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        description: '', 
        default_unit_price: '', 
        unit: '' 
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Fetches the specific catalog item details from the registry.
     */
    const fetchItem = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/labor-catalog/${itemId}`);
            setFormData({
                description: response.data.description || '',
                default_unit_price: response.data.default_unit_price || '',
                unit: response.data.unit || '',
            });
        } catch (err) {
            console.error("Fetch Item Error:", err);
            toast.error('Failed to retrieve catalog entry.');
            navigate('/labor-catalog');
        } finally {
            setIsLoading(false);
        }
    }, [itemId, navigate]);

    useEffect(() => { 
        fetchItem(); 
    }, [fetchItem]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.default_unit_price) {
            toast.warn("Required technical fields are missing.");
            return;
        }

        setIsSaving(true);
        try {
            await axiosInstance.put(`/labor-catalog/${itemId}`, {
                ...formData,
                default_unit_price: parseFloat(formData.default_unit_price)
            });
            toast.success('Registry updated successfully.');
            navigate('/labor-catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update catalog item.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text="Synchronizing with catalog registry..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link 
                    to="/labor-catalog" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Registry
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                Edit Service Details
                            </h1>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                <FingerPrintIcon className="h-3 w-3" />
                                Entry ID: {itemId}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Form Card */}
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                        Service Category Description*
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
                            placeholder="hour, item, etc."
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <Link 
                        to="/labor-catalog" 
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Discard Changes
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Committing...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Warning / Audit Notice */}
            <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800">
                <h3 className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <InformationCircleIcon className="h-4 w-4" /> Commercial Impact
                </h3>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80 leading-relaxed italic">
                    "Updating unit prices here will not retroactively change existing Commercial Offers. This rate will apply to all new Bill of Quantities (BoQ) items generated after this save."
                </p>
            </div>
        </div>
    );
}

export default LaborCatalogEditPage;