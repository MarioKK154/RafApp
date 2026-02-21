import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    HashtagIcon
} from '@heroicons/react/24/outline';

function CustomerCreatePage() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Form State
    const [formData, setFormData] = useState({
        name: '', 
        address: '', 
        kennitala: '', 
        contact_person: '', 
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
                toast.error("Authentication required.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: Administrative privileges required.");
                navigate('/customers', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        setIsSaving(true);
        try {
            await axiosInstance.post('/customers/', formData);
            toast.success(`Customer "${formData.name}" registered in registry.`);
            navigate('/customers');
        } catch (err) {
            console.error("Customer Create Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to initialize customer record.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Verifying administrative credentials..." />;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-10">
                <Link 
                    to="/customers" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Customer Directory
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <UserGroupIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none uppercase tracking-tighter italic">
                            Initialize Client Registry
                        </h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                            Operational Infrastructure / CRM Node
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Primary Identity Section */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Legal Identity Parameters</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Full Legal Name / Company*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="Entity Name"
                                className="modern-input h-14" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Kennitala (ID Number)*</label>
                                <div className="relative">
                                    <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="kennitala" 
                                        value={formData.kennitala} 
                                        onChange={handleChange} 
                                        placeholder="000000-0000"
                                        className="modern-input h-14 pl-12 font-mono" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Primary Address</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        placeholder="Operational Base Location"
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
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Communication Registry</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Primary Contact Person</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    name="contact_person" 
                                    value={formData.contact_person} 
                                    onChange={handleChange} 
                                    placeholder="Designated Personnel Name"
                                    className="modern-input h-14 pl-12" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Phone Number</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="tel" 
                                        name="phone_number" 
                                        value={formData.phone_number} 
                                        onChange={handleChange} 
                                        placeholder="+354 --- ----"
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Electronic Mail</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        placeholder="communications@entity.is"
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
                            <DocumentTextIcon className="h-4 w-4 text-indigo-500" /> Internal Notes
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="8" 
                            placeholder="Special requirements, billing cycles, or access protocols..."
                            className="modern-input h-auto py-4 resize-none"
                        ></textarea>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                Processing Registry...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-5 w-5" />
                                Commit New Profile
                            </>
                        )}
                    </button>

                    {isSuperuser && (
                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[1.5rem] border border-orange-100 dark:border-orange-800/30 flex gap-3">
                            <ShieldCheckIcon className="h-6 w-6 text-orange-600 shrink-0" />
                            <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-black uppercase tracking-tight">
                                System Override: This profile will be initialized as a Global Asset visible across all tenant nodes.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default CustomerCreatePage;