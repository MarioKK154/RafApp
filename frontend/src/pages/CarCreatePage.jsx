import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    TruckIcon, 
    IdentificationIcon, 
    CalendarDaysIcon, 
    WrenchScrewdriverIcon, 
    PhotoIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CheckBadgeIcon,
    DocumentTextIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function CarCreatePage() {
    const navigate = useNavigate();
    
    // Form State
    const [formData, setFormData] = useState({
        make: '', model: '', year: '', license_plate: '', vin: '',
        purchase_date: '', last_oil_change_km: '', next_oil_change_due_km: '',
        service_needed: false, service_notes: ''
    });

    // File/Preview State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            ...formData,
            year: formData.year ? parseInt(formData.year, 10) : null,
            purchase_date: formData.purchase_date || null,
            last_oil_change_km: formData.last_oil_change_km ? parseInt(formData.last_oil_change_km, 10) : null,
            next_oil_change_due_km: formData.next_oil_change_due_km ? parseInt(formData.next_oil_change_due_km, 10) : null,
        };

        try {
            // Step 1: Create Vehicle Record
            const response = await axiosInstance.post('/cars/', payload);
            const carId = response.data.id;

            // Step 2: Upload Image if selected
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/cars/${carId}/image`, imageFormData);
            }

            toast.success(`Vehicle ${formData.license_plate} registered in fleet.`);
            navigate('/cars');
        } catch (err) {
            console.error("Vehicle Registration Error:", err);
            toast.error(err.response?.data?.detail || 'Failed to register vehicle.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8">
                <Link 
                    to="/cars" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Fleet
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <TruckIcon className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                        Register New Vehicle
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Metadata */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Identity & Legal Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <IdentificationIcon className="h-4 w-4" /> Vehicle Identity
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Make / Brand*</label>
                                <input type="text" name="make" required value={formData.make} onChange={handleChange} placeholder="e.g., Toyota" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Model*</label>
                                <input type="text" name="model" required value={formData.model} onChange={handleChange} placeholder="e.g., Hilux" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">License Plate*</label>
                                <input type="text" name="license_plate" required value={formData.license_plate} onChange={handleChange} placeholder="AB-123" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono font-bold uppercase" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Year</label>
                                <input type="number" name="year" value={formData.year} onChange={handleChange} placeholder="2024" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Purchase Date</label>
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">VIN (Chassis Number)</label>
                            <input type="text" name="vin" value={formData.vin} onChange={handleChange} placeholder="17-digit serial number" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono" />
                        </div>
                    </section>

                    {/* Maintenance Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-4 w-4" /> Maintenance Baseline
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Last Oil Change (km)</label>
                                <input type="number" name="last_oil_change_km" value={formData.last_oil_change_km} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Next Service Due (km)</label>
                                <input type="number" name="next_oil_change_due_km" value={formData.next_oil_change_due_km} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 border-orange-200" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <input 
                                type="checkbox" 
                                name="service_needed" 
                                id="service_needed" 
                                checked={formData.service_needed} 
                                onChange={handleChange} 
                                className="h-5 w-5 rounded-lg text-orange-600 focus:ring-orange-500 border-orange-300"
                            />
                            <label htmlFor="service_needed" className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                Flag for Immediate Service Inspection
                            </label>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Maintenance Notes</label>
                            <textarea name="service_notes" value={formData.service_notes} onChange={handleChange} rows="3" placeholder="Specific issues or scheduled repairs..." className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"></textarea>
                        </div>
                    </section>
                </div>

                {/* Right Column: Imagery & Submit */}
                <div className="space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PhotoIcon className="h-4 w-4" /> Vehicle Visual
                        </h2>
                        
                        <div className="relative aspect-[4/3] bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <TruckIcon className="h-12 w-12 text-gray-200 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">No image selected</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <input type="file" id="car-image" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="car-image" 
                                className="flex items-center justify-center w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors text-xs font-black text-gray-500 uppercase tracking-widest"
                            >
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                {selectedFile ? 'Change Photo' : 'Select Photo'}
                            </label>
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full inline-flex justify-center items-center h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Processing Registry...
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-2" />
                                Commit to Fleet
                            </>
                        )}
                    </button>

                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                Registry entries are isolated to your current tenant. VIN and License Plate will be verified against existing records to prevent duplication.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default CarCreatePage;