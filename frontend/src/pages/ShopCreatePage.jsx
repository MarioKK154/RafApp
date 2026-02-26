import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
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
    CheckBadgeIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function ShopCreatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data State
    const [formData, setFormData] = useState({
        name: '', 
        address: '', 
        contact_person: '', 
        phone_number: '', 
        email: '', 
        website: '', 
        notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Permissions: Administrative access required for registry modifications
    const isSuperuser = user?.is_superuser;
    const canManageShops = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageShops) {
            toast.error(t('admin_required_vendor'));
            return;
        }

        setIsSaving(true);
        try {
            await axiosInstance.post('/shops/', formData);
            toast.success(t('vendor_registered', { name: formData.name }));
            navigate('/shops');
        } catch (err) {
            console.error("Vendor Creation Error:", err);
            toast.error(err.response?.data?.detail || t('vendor_create_failed'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link 
                    to="/shops" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('supply_chain_directory')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl">
                        <BuildingStorefrontIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            {t('new_vendor')}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">{t('new_vendor_subtitle')}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content: 8 Columns */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Identity Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <BuildingStorefrontIcon className="h-4 w-4" /> {t('vendor_identity')}
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('legal_entity_name')}*</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="Full company name..."
                                    className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('address_label')}</label>
                                <div className="relative group">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        placeholder="Physical street address..."
                                        className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Communication Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <EnvelopeIcon className="h-4 w-4" /> {t('communication_logistics')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('account_manager')}</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Direct contact name" className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('contact_phone')}</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="+354..." className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('primary_email')}</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="procurement@vendor.is" className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('website_url')}</label>
                                <div className="relative">
                                    <GlobeAltIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://..." className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar: 4 Columns */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <DocumentTextIcon className="h-4 w-4" /> {t('internal_notes')}
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="6" 
                            placeholder="Special agreements, account numbers, or preferred shipping terms..."
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
                                {t('processing_registry')}
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-2" />
                                {t('commit_to_directory')}
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                            {t('new_vendor_note')}
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ShopCreatePage;