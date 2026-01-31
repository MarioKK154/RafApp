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
    ShieldCheckIcon
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
            toast.success(`Customer "${formData.name}" registered successfully.`);
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
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link 
                    to="/customers" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Directory
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <UserGroupIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                            Register New Customer
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Initialize a new commercial or private client profile.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Primary Identity Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <IdentificationIcon className="h-4 w-4" /> Legal Identity
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Customer / Company Name*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="Full Legal Name"
                                className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Kennitala (SSN)*</label>
                                <input 
                                    type="text" 
                                    name="kennitala" 
                                    value={formData.kennitala} 
                                    onChange={handleChange} 
                                    placeholder="000000-0000"
                                    className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12 font-mono" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Primary Address</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        placeholder="Billing / Home Address"
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact & Logistics Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4" /> Communication Details
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Contact Person</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    name="contact_person" 
                                    value={formData.contact_person} 
                                    onChange={handleChange} 
                                    placeholder="Name of primary contact"
                                    className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Phone Number</label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input 
                                        type="tel" 
                                        name="phone_number" 
                                        value={formData.phone_number} 
                                        onChange={handleChange} 
                                        placeholder="+354 ..."
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Email Address</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        placeholder="client@example.com"
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 h-12" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Notes & Submit */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <DocumentTextIcon className="h-4 w-4" /> Internal Notes
                        </label>
                        <textarea 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="6" 
                            placeholder="Special billing instructions, gate codes, or client preferences..."
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full inline-flex justify-center items-center h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-2" />
                                Create Profile
                            </>
                        )}
                    </button>

                    {isSuperuser && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800 flex gap-2">
                            <ShieldCheckIcon className="h-5 w-5 text-orange-600 shrink-0" />
                            <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                                Root Mode: This customer will be visible system-wide across all tenant project associations.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default CustomerCreatePage;