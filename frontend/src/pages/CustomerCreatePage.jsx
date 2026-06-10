import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    UserGroupIcon, 
    IdentificationIcon, 
    MapPinIcon, 
    UserIcon, 
    PhoneIcon, 
    EnvelopeIcon, 
    DocumentTextIcon, 
    ChevronLeftIcon,
    CheckBadgeIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    HashtagIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

function CustomerCreatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Form State
    const [formData, setFormData] = useState({
        name: '', 
        address: '', 
        kennitala: '', 
        contact_person: '', 
        contact_person_photo_url: '',
        phone_number: '', 
        email: '', 
        notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Permissions: Admin or Superuser for CRM management
    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error(t('auth_required'));
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error(t('access_denied_admin'));
                navigate('/customers', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            let newVal = value;
            if (name === 'kennitala') {
                let cleaned = newVal.replace(/\D/g, '');
                if (cleaned.length > 6) {
                    newVal = cleaned.substring(0, 6) + '-' + cleaned.substring(6, 10);
                } else {
                    newVal = cleaned;
                }
            }
            return { ...prev, [name]: newVal };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        setIsSaving(true);
        try {
            await axiosInstance.post('/customers/', formData);
            toast.success(t('toast_client_added'));
            navigate('/customers');
        } catch (err) {
            console.error("Customer Create Error:", err);
            toast.error(err.response?.data?.detail || t('toast_client_add_failed'));
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('verifying_admin')} />;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link 
                    to="/customers" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('back_to_customers')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('new_client')}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Primary Identity Section */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('legal_identity_parameters')}</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('full_legal_name')}</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder={t('entity_name_placeholder')}
                                className="modern-input h-14" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('kennitala')}</label>
                                <div className="relative">
                                    <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="kennitala" 
                                        value={formData.kennitala} 
                                        onChange={handleChange} 
                                        placeholder={t('kennitala_placeholder')}
                                        className="modern-input h-14 pl-12 font-mono" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('primary_address')}</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        placeholder={t('operational_base_location')}
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <PhoneIcon className="h-5 w-5 text-emerald-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('communication_registry')}</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('primary_contact_person')}</label>
                                <div className="relative flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            name="contact_person" 
                                            value={formData.contact_person} 
                                            onChange={handleChange} 
                                            placeholder={t('designated_personnel_name')}
                                            className="modern-input h-14 pl-12" 
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {formData.contact_person_photo_url && (
                                            <img 
                                                src={formData.contact_person_photo_url} 
                                                alt="Contact" 
                                                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" 
                                            />
                                        )}
                                        <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('phone_number')}</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="tel" 
                                        name="phone_number" 
                                        value={formData.phone_number} 
                                        onChange={handleChange} 
                                        placeholder={t('phone_number_placeholder')}
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('electronic_mail')}</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        placeholder={t('electronic_mail_placeholder')}
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <DocumentTextIcon className="h-4 w-4 text-indigo-500" /> {t('internal_notes')}
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="8" 
                            placeholder={t('internal_notes_placeholder')}
                            className="modern-input h-auto py-4 resize-none"
                        ></textarea>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> {t('processing_registry', { defaultValue: 'Processing...' })}</>
                        ) : (
                            <><CheckBadgeIcon className="h-5 w-5" /> {t('commit_new_profile', { defaultValue: 'Commit New Profile' })}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CustomerCreatePage;