import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
    UserGroupIcon, 
    IdentificationIcon, 
    MapPinIcon, 
    UserIcon, 
    PhoneIcon, 
    EnvelopeIcon, 
    DocumentTextIcon, 
    ChevronLeftIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    FingerPrintIcon,
    InformationCircleIcon,
    HashtagIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function CustomerEditPage() {
    const { customerId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Data State
    const [formData, setFormData] = useState({
        name: '', 
        address: '', 
        kennitala: '', 
        contact_person: '', 
        phone_number: '', 
        email: '', 
        notes: ''
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Permissions Node
    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    /**
     * Protocol: Security Guard
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Session expired. Access denied.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Clearance Level Insufficient.");
                navigate('/customers', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    /**
     * Logic: Fetch client data from registry
     */
    const fetchCustomer = useCallback(async () => {
        if (!isAdmin || !customerId) return;
        
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/customers/${customerId}`);
            const cust = response.data;
            if (cust) {
                setFormData({
                    name: cust.name || '',
                    address: cust.address || '',
                    kennitala: cust.kennitala || '',
                    contact_person: cust.contact_person || '',
                    phone_number: cust.phone_number || '',
                    email: cust.email || '',
                    notes: cust.notes || '',
                });
            }
        } catch (err) {
            console.error("Registry Sync Error:", err);
            toast.error('Failed to retrieve customer record.');
            navigate('/customers');
        } finally {
            setIsLoading(false);
        }
    }, [customerId, isAdmin, navigate]);

    useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        setIsSaving(true);
        try {
            await axiosInstance.put(`/customers/${customerId}`, formData);
            toast.success(`Registry node updated: ${formData.name}`);
            navigate('/customers');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Update synchronization failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading || isLoading) return <LoadingSpinner text="Synchronizing client registry..." />;
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <div className="mb-10">
                <Link 
                    to="/customers" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Terminate Edit / Return to Directory
                </Link>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <UserGroupIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tighter italic">
                                Modify Client Node
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <FingerPrintIcon className="h-3 w-3 text-indigo-500" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Registry ID: <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm tracking-normal">{customerId}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Primary Identity Node */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Registry Identity</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Legal Entity Name*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                className="modern-input h-14 font-black" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Kennitala (Tax ID)*</label>
                                <div className="relative">
                                    <HashtagIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="kennitala" 
                                        value={formData.kennitala} 
                                        onChange={handleChange} 
                                        className="modern-input h-14 pl-12 font-mono" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Registered Address</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Communication Node */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <PhoneIcon className="h-5 w-5 text-emerald-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Contact Channels</h2>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Primary Point of Contact</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    name="contact_person" 
                                    value={formData.contact_person} 
                                    onChange={handleChange} 
                                    className="modern-input h-14 pl-12" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Mobile / Telephone</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="tel" 
                                        name="phone_number" 
                                        value={formData.phone_number} 
                                        onChange={handleChange} 
                                        className="modern-input h-14 pl-12 font-bold" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Registry Email</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        className="modern-input h-14 pl-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Tactical Sidebar */}
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
                            className="modern-input h-auto py-4 resize-none text-sm"
                            placeholder="Specify billing nuances, site access keys, or behavioral preferences..."
                        ></textarea>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                    >
                        {isSaving ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Syncing Registry...</>
                        ) : (
                            <><CloudArrowUpIcon className="h-5 w-5" /> Commit Changes</>
                        )}
                    </button>

                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-3">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-black uppercase tracking-tight">
                                Registry Audit Trace: Modifications to this node are permanent. All project associations linked to this client will be updated across the OS.
                            </p>
                        </div>
                    </div>
                    
                    {isSuperuser && (
                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[1.5rem] border border-orange-100 dark:border-orange-800 flex gap-3">
                            <ShieldCheckIcon className="h-6 w-6 text-orange-600 shrink-0" />
                            <p className="text-[10px] text-orange-700 dark:text-orange-300 font-black uppercase tracking-tight leading-relaxed">
                                Root Clearance: Global Customer properties detected. Changes will affect cross-tenant analytics.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default CustomerEditPage;