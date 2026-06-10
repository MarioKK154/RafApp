import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const { shopId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data States
    const [formData, setFormData] = useState({
        name: '', address: '', contact_person: '', contact_person_photo_url: '', phone_number: '', email: '', website: '', notes: ''
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
                contact_person_photo_url: shop.contact_person_photo_url || '',
                phone_number: shop.phone_number || '',
                email: shop.email || '',
                website: shop.website || '',
                notes: shop.notes || '',
            });
        } catch (err) {
            console.error("Fetch Vendor Error:", err);
            toast.error(t('failed_access_vendor'));
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
            toast.error(t('admin_req_update_vendor'));
            return;
        }

        setIsSaving(true);
        try {
            await axiosInstance.put(`/shops/${shopId}`, formData);
            toast.success(`${t('toast_registry_updated')} ${formData.name}`);
            navigate('/shops');
        } catch (err) {
            console.error("Update Vendor Error:", err);
            toast.error(err.response?.data?.detail || t('toast_failed_sync_updates'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text={t('retrieving_vendor_telemetry')} size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link to="/shops" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('supply_chain_directory')} </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <BuildingStorefrontIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                            {t('edit_vendor', { defaultValue: 'Edit Vendor' })}: {formData.name}
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
                                    className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('primary_headquarters_address')}</label>
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
                            <EnvelopeIcon className="h-4 w-4" /> {t('communication_logistics')}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('primary_contact_person')}</label>
                                <div className="relative flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {formData.contact_person_photo_url && (
                                            <img 
                                                src={formData.contact_person_photo_url} 
                                                alt="Contact" 
                                                className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" 
                                            />
                                        )}
                                        <label className="flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition">
                                            <CloudArrowUpIcon className="h-4 w-4" />
                                            <span>Photo</span>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        const formDataMedia = new FormData();
                                                        formDataMedia.append('file', file);
                                                        const res = await axiosInstance.post('/system/upload-media', formDataMedia, {
                                                            headers: { 'Content-Type': 'multipart/form-data' }
                                                        });
                                                        setFormData(prev => ({ ...prev, contact_person_photo_url: res.data.url }));
                                                        toast.success('Photo uploaded successfully');
                                                    } catch (err) {
                                                        toast.error('Failed to upload photo');
                                                    }
                                                }} 
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('support_phone')}</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('procurement_email')}</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">{t('digital_storefront_url')}</label>
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
                            <DocumentTextIcon className="h-4 w-4" /> {t('account_notes')}
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="6" 
                            placeholder={t('placeholder_billing_cycles')}
                            className="block w-full rounded-[1.5rem] border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving || !canManageShops}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                {t('syncing', { defaultValue: 'Syncing...' })}
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-5 w-5" />
                                {t('save_changes')}
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                {t('vendor_updates_logged')}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ShopEditPage;