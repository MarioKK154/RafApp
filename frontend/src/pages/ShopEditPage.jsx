import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
    BuildingStorefrontIcon, 
    MapPinIcon, 
    UserIcon, 
    PhoneIcon, 
    EnvelopeIcon, 
    GlobeAltIcon, 
    DocumentTextIcon,
    ChevronLeftIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    FingerPrintIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function ShopEditPage() {
    const { shopId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data States
    const [formData, setFormData] = useState({
        name: '', address: '', contact_person: '', phone_number: '', email: '', website: '', notes: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Permissions Check
    const isSuperuser = user?.is_superuser;
    const canManageShops = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Synchronize with Vendor Registry
     */
    const fetchShop = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/shops/${shopId}`);
            const shop = response.data;
            setFormData({
                name: shop.name || '',
                address: shop.address || '',
                contact_person: shop.contact_person || '',
                phone_number: shop.phone_number || '',
                email: shop.email || '',
                website: shop.website || '',
                notes: shop.notes || '',
            });
        } catch (err) {
            console.error("Fetch Vendor Error:", err);
            toast.error('Failed to access vendor registry.');
            navigate('/shops');
        } finally {
            setIsLoading(false);
        }
    }, [shopId, navigate]);

    useEffect(() => { fetchShop(); }, [fetchShop]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageShops) {
            toast.error("Administrative privileges required to update vendor data.");
            return;
        }

        setIsSaving(true);
        try {
            await axiosInstance.put(`/shops/${shopId}`, formData);
            toast.success(`Registry updated: ${formData.name}`);
            navigate('/shops');
        } catch (err) {
            console.error("Update Vendor Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to sync registry updates.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text="Retrieving vendor telemetry..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link to="/shops" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Supply Chain Directory
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none uppercase tracking-tight">
                            Edit Vendor: {formData.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <FingerPrintIcon className="h-3 w-3" /> Registry ID: {shopId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Data Entry (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Identity Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <BuildingStorefrontIcon className="h-4 w-4" /> Vendor Identity
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Legal Entity Name*</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Primary Headquarters / Address</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Communication Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <EnvelopeIcon className="h-4 w-4" /> Communication & Logistics
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Primary Contact Person</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Support Phone</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Procurement Email</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Digital Storefront (URL)</label>
                                <div className="relative">
                                    <GlobeAltIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://..." className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Actions & Notes (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <DocumentTextIcon className="h-4 w-4" /> Account Notes
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="6" 
                            placeholder="Billing cycles, discounts, preferred shipping methods..."
                            className="block w-full rounded-[1.5rem] border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving || !canManageShops}
                        className="w-full inline-flex justify-center items-center h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Syncing Registry...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-6 w-6 mr-2" />
                                Commit Updates
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                Updates to vendor profiles are logged. Modifications to procurement URLs will affect all linked inventory items immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ShopEditPage;