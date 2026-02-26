import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
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
    CloudArrowUpIcon,
    FingerPrintIcon,
    InformationCircleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function ToolEditPage() {
    const { toolId } = useParams();
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
    const [currentImageUrl, setCurrentImageUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Permissions: Administrative clearance required for registry modification
    const isSuperuser = user?.is_superuser;
    const canManageTools = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Synchronize with Asset Registry
     */
    const fetchTool = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/tools/${toolId}`);
            const tool = response.data;
            setFormData({
                name: tool.name || '',
                brand: tool.brand || '',
                model: tool.model || '',
                description: tool.description || '',
                serial_number: tool.serial_number || '',
                purchase_date: tool.purchase_date ? tool.purchase_date.split('T')[0] : '',
            });
            setCurrentImageUrl(tool.image_url);
        } catch (err) {
            console.error("Asset Sync Error:", err);
            toast.error('Failed to access hardware registry.');
            navigate('/tools');
        } finally {
            setIsLoading(false);
        }
    }, [toolId, navigate]);

    useEffect(() => { fetchTool(); }, [fetchTool]);

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
            toast.error("Administrative privileges required for registry updates.");
            return;
        }

        setIsSaving(true);
        const payload = { ...formData, purchase_date: formData.purchase_date || null };

        try {
            // Step 1: Update metadata
            await axiosInstance.put(`/tools/${toolId}`, payload);

            // Step 2: Sync visual telemetry if changed
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/tools/${toolId}/image`, imageFormData);
            }

            toast.success(`Asset registry updated: ${formData.name}`);
            navigate('/tools');
        } catch (err) {
            console.error("Registry Update Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to commit registry changes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text="Retrieving technical specifications..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link to="/tools" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Hardware Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <WrenchScrewdriverIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            Modify Asset: {formData.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <FingerPrintIcon className="h-3 w-3" /> Registry ID: {toolId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Data Entry (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Identity Section */}
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
                                disabled={isSaving}
                                className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Manufacturer</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} disabled={isSaving} className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Model Identifier</label>
                                <input type="text" name="model" value={formData.model} onChange={handleChange} disabled={isSaving} className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Serial Number</label>
                            <div className="relative group">
                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} disabled={isSaving} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono text-xs font-bold" />
                            </div>
                        </div>
                    </section>

                    {/* Description Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <DocumentTextIcon className="h-4 w-4" /> Description & Maintenance Notes
                        </h2>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="4" 
                            disabled={isSaving}
                            className="block w-full rounded-[1.5rem] border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm"
                        ></textarea>
                    </section>
                </div>

                {/* Right Column: Visuals & Actions (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Image Preview & Upload Zone */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <PhotoIcon className="h-4 w-4" /> Visual Identity
                        </h2>
                        
                        <div className="relative h-40 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden shadow-inner group">
                            <img 
                                src={currentImageUrl || '/default-tool.png'} 
                                alt="Tool Telemetry" 
                                className={`h-full w-full object-contain p-4 transition-opacity duration-300 ${selectedFile ? 'opacity-20' : 'opacity-100'}`} 
                                onError={(e) => { e.target.src='/default-tool.png' }}
                            />
                            {selectedFile && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center animate-pulse">
                                    <CloudArrowUpIcon className="h-10 w-10 text-indigo-500" />
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">Pending Update</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-3 ml-1 tracking-widest">Update Asset File</label>
                            <input 
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="block w-full text-[10px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer" 
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-50 dark:border-gray-700">
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Acquisition Date</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} disabled={isSaving} className="pl-12 block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm font-bold" />
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
                                <CloudArrowUpIcon className="h-6 w-6 mr-2" />
                                Commit Changes
                            </>
                        )}
                    </button>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                            Modifications to asset specifications are logged in the historical audit trail. Visual telemetry updates may take a moment to propagate across global dashboards.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ToolEditPage;