import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BuildingOfficeIcon, 
    PhotoIcon, 
    LinkIcon, 
    ShieldCheckIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    PaintBrushIcon
} from '@heroicons/react/24/outline';

function TenantCreatePage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        logo_url: '',
        background_image_url: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = currentUser?.is_superuser;

    /**
     * Security Protocol: Ensure only System Root can initialize new tenant nodes.
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Root authentication required.");
                navigate('/login', { replace: true });
            } else if (!isSuperuser) {
                toast.error("Access Denied: Node initialization restricted to Root Admins.");
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isSuperuser) return;

        setError('');
        setIsSubmitting(true);

        const dataToSend = {
            name: formData.name,
            logo_url: formData.logo_url || null,
            background_image_url: formData.background_image_url || null,
        };

        try {
            const response = await axiosInstance.post('/tenants/', dataToSend);
            toast.success(`Infrastructure Node "${response.data.name}" online.`);
            navigate('/tenants');
        } catch (err) {
            console.error("Tenant Creation Error:", err);
            const errorMsg = err.response?.data?.detail || 'Node rejection: Please verify input telemetry.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Synchronizing Root Credentials..." size="lg" />;
    if (!isAuthenticated || !isSuperuser) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link 
                    to="/tenants" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-orange-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-100 dark:shadow-none">
                        <ShieldCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase">
                            Initialize Tenant
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Create a new isolated operational environment.</p>
                    </div>
                </div>
            </div>

            

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Identity Form */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <BuildingOfficeIcon className="h-4 w-4" /> Organization Details
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Company / Entity Name*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="Full legal organization name..."
                                disabled={isSubmitting}
                                className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 font-bold" 
                            />
                        </div>

                        <div className="space-y-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <PaintBrushIcon className="h-4 w-4" /> Visual Identity
                            </h2>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Logo URL</label>
                                <div className="relative group">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    <input 
                                        type="url" 
                                        name="logo_url" 
                                        value={formData.logo_url} 
                                        onChange={handleChange} 
                                        placeholder="https://brand.is/logo.svg"
                                        disabled={isSubmitting}
                                        className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 text-sm" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Dashboard Background URL</label>
                                <div className="relative group">
                                    <PhotoIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                    <input 
                                        type="url" 
                                        name="background_image_url" 
                                        value={formData.background_image_url} 
                                        onChange={handleChange} 
                                        placeholder="https://brand.is/bg.jpg"
                                        disabled={isSubmitting}
                                        className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-orange-500 text-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar: Warning & Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-orange-50 dark:bg-orange-900/10 p-6 md:p-8 rounded-[2rem] border border-orange-100 dark:border-orange-800 space-y-4">
                        <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                            <h3 className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none">
                                Node Impact
                            </h3>
                        </div>
                        <p className="text-[10px] text-orange-600 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                            Initializing a new tenant creates a primary data silo. No historical projects, users, or assets from existing tenants will be accessible from this node.
                        </p>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full inline-flex justify-center items-center h-14 bg-gray-900 dark:bg-orange-600 hover:bg-black dark:hover:bg-orange-700 text-white font-black rounded-3xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Processing Registry...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-2" />
                                Initialize Node
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-red-100">
                            {error}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default TenantCreatePage;