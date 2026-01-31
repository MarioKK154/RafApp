import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { 
    WrenchScrewdriverIcon, 
    TagIcon, 
    IdentificationIcon, 
    DocumentTextIcon, 
    CalendarIcon, 
    PhotoIcon,
    ChevronLeftIcon,
    ArrowPathIcon,
    PlusIcon,
    InformationCircleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function ToolCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Form States
    const [formData, setFormData] = useState({ 
        name: '', 
        brand: '', 
        model: '', 
        description: '', 
        serial_number: '', 
        purchase_date: '' 
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Permissions: Administrative access required for registry expansion
    const isSuperuser = user?.is_superuser;
    const canManageTools = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageTools) {
            toast.error("Security clearance required to register new hardware assets.");
            return;
        }

        setIsSaving(true);
        const payload = { ...formData, purchase_date: formData.purchase_date || null };

        try {
            // Step 1: Initialize tool record in registry
            const response = await axiosInstance.post('/tools/', payload);
            const newToolId = response.data.id;

            // Step 2: Upload visual telemetry if file exists
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/tools/${newToolId}/image`, imageFormData);
            }

            toast.success(`Asset "${formData.name}" successfully registered.`);
            navigate('/tools');
        } catch (err) {
            console.error("Asset Creation Error:", err);
            toast.error(err.response?.data?.detail || 'Registry initialization failed.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link 
                    to="/tools" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Hardware Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <WrenchScrewdriverIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase">
                            Register Asset
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Add high-value hardware to the operational inventory.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Primary Data Entry: 8 Columns */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <TagIcon className="h-4 w-4" /> Technical Identity
                        </h2>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Asset Name*</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="e.g., Heavy Duty Impact Drill"
                                className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Manufacturer / Brand</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g., Milwaukee" className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Model Number</label>
                                <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g., M18 FUEL" className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Unique Serial Identifier</label>
                            <div className="relative group">
                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="S/N: 0000-0000-0000" className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono text-xs font-bold" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <DocumentTextIcon className="h-4 w-4" /> Description & Specs
                        </h2>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="4" 
                            placeholder="Voltage, battery requirements, case contents, or special handling notes..."
                            className="block w-full rounded-[1.5rem] border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </section>
                </div>

                {/* Logistics & Sidebar: 4 Columns */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Purchase Timestamp</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm font-bold" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Visual Telemetry (Image)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 dark:border-gray-700 border-dashed rounded-2xl hover:border-indigo-400 transition-colors group">
                                <div className="space-y-1 text-center">
                                    <PhotoIcon className="mx-auto h-10 w-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                    <div className="flex text-xs text-gray-600 dark:text-gray-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-black text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                            <span>Upload Asset File</span>
                                            <input id="file-upload" name="image" type="file" onChange={handleFileChange} accept="image/*" className="sr-only" />
                                        </label>
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                        {selectedFile ? selectedFile.name : "PNG, JPG up to 5MB"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving || !canManageTools}
                        className="w-full inline-flex justify-center items-center h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Syncing Registry...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="h-6 w-6 mr-2" />
                                Initialize Asset
                            </>
                        )}
                    </button>

                    {isSuperuser && (
                        <div className="p-5 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800 flex gap-3">
                            <ShieldCheckIcon className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                                System Root Control: You are registering this tool at the global infrastructure level.
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

export default ToolCreatePage;