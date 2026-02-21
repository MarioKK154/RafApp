import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    InformationCircleIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

function CarCreatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    // Form State
    const [formData, setFormData] = useState({
        make: '', 
        model: '', 
        year: new Date().getFullYear(), 
        license_plate: '', 
        vin: '',
        purchase_date: '', 
        last_oil_change_km: '', 
        next_oil_change_due_km: '',
        service_needed: false, 
        service_notes: '',
        status: 'Available'
    });

    // File/Preview State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Logic: Universal Input Handler
     */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    /**
     * Logic: Asset Visualization Handler
     */
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(t('file_too_large', { defaultValue: 'File exceeds 5MB limit.' }));
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    /**
     * Protocol: Commit Vehicle to Global Fleet Registry
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        // Sanitize Payload: Ensure technical numbers are integers
        const payload = {
            ...formData,
            year: formData.year ? parseInt(formData.year, 10) : null,
            purchase_date: formData.purchase_date || null,
            last_oil_change_km: formData.last_oil_change_km ? parseInt(formData.last_oil_change_km, 10) : 0,
            next_oil_change_due_km: formData.next_oil_change_due_km ? parseInt(formData.next_oil_change_due_km, 10) : 0,
            license_plate: formData.license_plate.toUpperCase().trim()
        };

        try {
            // Sequence 1: Register Core Metadata
            const response = await axiosInstance.post('/cars/', payload);
            const carId = response.data.id;

            // Sequence 2: Upload Visual Identity if attached
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/cars/${carId}/image`, imageFormData);
            }

            toast.success(t('car_registered_success', { 
                defaultValue: `Vehicle ${formData.license_plate} committed to fleet.`,
                plate: formData.license_plate 
            }));
            navigate('/cars');
        } catch (err) {
            console.error("Fleet Registration Error:", err);
            toast.error(err.response?.data?.detail || t('registration_failed', { defaultValue: 'Registration protocol failed.' }));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <header className="mb-10">
                <Link 
                    to="/cars" 
                    className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-4 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> {t('cars')}
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <TruckIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                            {t('register_new_vehicle', { defaultValue: 'Register New Vehicle' })}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Fleet Integration Terminal</p>
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Technical Metadata */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Section: Vehicle Identity */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-4">
                            <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                {t('vehicle_identity', { defaultValue: 'Infrastructure Identification' })}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label={t('make', { defaultValue: 'Make / Manufacturer' })}>
                                <input type="text" name="make" required value={formData.make} onChange={handleChange} placeholder="e.g., Toyota" className="modern-input" />
                            </Field>
                            <Field label={t('model', { defaultValue: 'Model' })}>
                                <input type="text" name="model" required value={formData.model} onChange={handleChange} placeholder="e.g., Hilux" className="modern-input" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Field label={t('license_plate', { defaultValue: 'License Plate' })}>
                                <input type="text" name="license_plate" required value={formData.license_plate} onChange={handleChange} placeholder="AB-123" className="modern-input font-mono font-black uppercase" />
                            </Field>
                            <Field label={t('year', { defaultValue: 'Year' })}>
                                <input type="number" name="year" value={formData.year} onChange={handleChange} className="modern-input" />
                            </Field>
                            <Field label={t('purchase_date', { defaultValue: 'Acquisition Date' })}>
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="modern-input text-xs font-bold" />
                            </Field>
                        </div>

                        <Field label={t('vin', { defaultValue: 'VIN (Serial Number)' })}>
                            <input type="text" name="vin" value={formData.vin} onChange={handleChange} placeholder="17-DIGIT CHASSIS ID" className="modern-input font-mono" />
                        </Field>
                    </section>

                    {/* Section: Maintenance Baseline */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 pb-4">
                            <WrenchScrewdriverIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                {t('maintenance_baseline', { defaultValue: 'Service Parameters' })}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label={t('last_oil_change', { defaultValue: 'Last Oil Change (km)' })}>
                                <input type="number" name="last_oil_change_km" value={formData.last_oil_change_km} onChange={handleChange} className="modern-input" />
                            </Field>
                            <Field label={t('next_service_due', { defaultValue: 'Next Service Threshold (km)' })}>
                                <input type="number" name="next_oil_change_due_km" value={formData.next_oil_change_due_km} onChange={handleChange} className="modern-input border-orange-100 dark:border-orange-900/30" />
                            </Field>
                        </div>

                        <div className="flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800 transition-all">
                            <input 
                                type="checkbox" 
                                name="service_needed" 
                                id="service_needed" 
                                checked={formData.service_needed} 
                                onChange={handleChange} 
                                className="h-6 w-6 rounded-lg text-orange-600 focus:ring-orange-500 border-orange-300 cursor-pointer"
                            />
                            <label htmlFor="service_needed" className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest cursor-pointer">
                                {t('flag_for_service', { defaultValue: 'Flag for Immediate Technical Inspection' })}
                            </label>
                        </div>

                        <Field label={t('maintenance_notes', { defaultValue: 'Service History / Notes' })}>
                            <textarea name="service_notes" value={formData.service_notes} onChange={handleChange} rows="3" placeholder={t('notes_placeholder', { defaultValue: 'Specify scheduled repairs or known faults...' })} className="modern-input h-auto py-4 text-sm" />
                        </Field>
                    </section>
                </div>

                {/* Right Column: Visual Identity & Commit */}
                <div className="space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PhotoIcon className="h-4 w-4" /> {t('vehicle_visual', { defaultValue: 'Asset Photo' })}
                        </h2>
                        
                        <div className="relative aspect-[4/3] bg-gray-50 dark:bg-gray-900 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden group">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6">
                                    <TruckIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('no_image', { defaultValue: 'No Asset Visualization' })}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors pointer-events-none" />
                        </div>

                        <div className="mt-6">
                            <input type="file" id="car-image" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="car-image" 
                                className="flex items-center justify-center w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-gray-600 transition-all text-[10px] font-black text-gray-500 dark:text-gray-300 uppercase tracking-widest shadow-sm"
                            >
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                {selectedFile ? t('change_photo') : t('select_photo')}
                            </label>
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="w-full inline-flex justify-center items-center h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-3 animate-spin" /> 
                                {t('syncing')}
                            </>
                        ) : (
                            <>
                                <CheckBadgeIcon className="h-6 w-6 mr-3" />
                                {t('commit_to_fleet', { defaultValue: 'Commit to Fleet Registry' })}
                            </>
                        )}
                    </button>

                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-3">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                {t('fleet_security_note', { defaultValue: 'Records are tenant-isolated. VIN and License validation will trigger during the commitment phase to ensure registry integrity.' })}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

/**
 * Technical Component: Localized Input Field
 */
function Field({ label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>
            {children}
        </div>
    );
}

export default CarCreatePage;