import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
    TruckIcon, 
    PencilSquareIcon, 
    IdentificationIcon, 
    CalendarDaysIcon, 
    WrenchScrewdriverIcon, 
    PhotoIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    DocumentMagnifyingGlassIcon,
    FingerPrintIcon,
    HashtagIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Protocol: Standardize date strings for HTML5 inputs.
 * Safety: Returns empty string if value is null or not a string.
 */
const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';
    return dateString.split('T')[0];
};

function CarEditPage() {
    const { t } = useTranslation();
    const { carId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    // Core Registry State
    const [formData, setFormData] = useState({
        make: '', model: '', year: '', license_plate: '', vin: '',
        purchase_date: '', last_oil_change_km: '', next_oil_change_due_km: '',
        service_needed: false, service_notes: ''
    });
    
    const [currentImageUrl, setCurrentImageUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Permission Node
    const isSuperuser = currentUser?.is_superuser;
    const canManageFleet = currentUser && (currentUser.role === 'admin' || isSuperuser);

    const fetchCar = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/cars/${carId}`);
            const car = response.data;
            if (car) {
                setFormData({
                    make: car.make || '',
                    model: car.model || '',
                    year: car.year || '',
                    license_plate: car.license_plate || '',
                    vin: car.vin || '',
                    purchase_date: formatDate(car.purchase_date),
                    last_oil_change_km: car.last_oil_change_km || '',
                    next_oil_change_due_km: car.next_oil_change_due_km || '',
                    service_needed: car.service_needed || false,
                    service_notes: car.service_notes || '',
                });
                setCurrentImageUrl(car.image_url);
            }
        } catch (err) {
            console.error("Telemetry Sync Error:", err);
            toast.error(t('toast_failed_sync_car'));
            navigate('/cars');
        } finally {
            setIsLoading(false);
        }
    }, [carId, navigate]);

    useEffect(() => { 
        if (carId) fetchCar(); 
    }, [carId, fetchCar]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageFleet) {
            toast.error(t('toast_admin_req'));
            return;
        }

        setIsSaving(true);
        const payload = {
            ...formData,
            year: formData.year ? parseInt(formData.year, 10) : null,
            purchase_date: formData.purchase_date || null,
            last_oil_change_km: formData.last_oil_change_km ? parseInt(formData.last_oil_change_km, 10) : null,
            next_oil_change_due_km: formData.next_oil_change_due_km ? parseInt(formData.next_oil_change_due_km, 10) : null,
        };

        try {
            await axiosInstance.put(`/cars/${carId}`, payload);
            
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/cars/${carId}/image`, imageFormData);
            }
            
            toast.success(`${t('toast_asset_updated')} ${formData.license_plate}`);
            navigate(`/cars/${carId}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || t('toast_failed_sync_updates'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text={t('accessing_vehicle_telemetry')} />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <Link to={carId ? `/cars/${carId}` : "/cars"} className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> {t('terminate_edit_return')}
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <PencilSquareIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                {t('edit_asset', { defaultValue: 'Edit Asset' })}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <HashtagIcon className="h-3 w-3 text-indigo-500" />
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black tracking-widest text-sm uppercase">
                                    {formData.license_plate || t('unregistered')}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <FingerPrintIcon className="h-3 w-3" /> {t('car_id')} {carId}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Data Entry */}
                <div className="lg:col-span-8 space-y-8">
                    
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('identity_parameters')}</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('make_label')}</label>
                                <input type="text" name="make" required value={formData.make} onChange={handleChange} className="modern-input" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('model_label')}</label>
                                <input type="text" name="model" required value={formData.model} onChange={handleChange} className="modern-input" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('license_plate_label')}</label>
                                <input type="text" name="license_plate" required value={formData.license_plate} onChange={handleChange} className="modern-input font-mono uppercase text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('year_label')}</label>
                                <input type="number" name="year" value={formData.year} onChange={handleChange} className="modern-input" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('registry_date')}</label>
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="modern-input" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('vin_number')}</label>
                            <input type="text" name="vin" value={formData.vin} onChange={handleChange} className="modern-input font-mono" />
                        </div>
                    </section>

                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <WrenchScrewdriverIcon className="h-5 w-5 text-orange-500" />
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t('maintenance_parameters')}</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('last_oil_log')}</label>
                                <input type="number" name="last_oil_change_km" value={formData.last_oil_change_km} onChange={handleChange} className="modern-input" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('next_service_km')}</label>
                                <input type="number" name="next_oil_change_due_km" value={formData.next_oil_change_due_km} onChange={handleChange} className="modern-input border-orange-200 dark:border-orange-900/50" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                            <input 
                                type="checkbox" 
                                name="service_needed" 
                                id="service_needed" 
                                checked={formData.service_needed} 
                                onChange={handleChange} 
                                className="h-6 w-6 rounded-lg text-orange-600 focus:ring-orange-500 border-orange-300 dark:bg-gray-700"
                            />
                            <label htmlFor="service_needed" className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400"> {t('global_service_flag')} </label>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('technical_notes')}</label>
                            <textarea name="service_notes" value={formData.service_notes} onChange={handleChange} rows="4" className="modern-input h-auto py-4 resize-none"></textarea>
                        </div>
                    </section>
                </div>

                {/* Right Column: Visual Profile & Save */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <PhotoIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('asset_photo')}</h2>
                        </div>
                        
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                            {(previewUrl || currentImageUrl) ? (
                                <img 
                                    src={previewUrl || currentImageUrl} 
                                    alt="Vehicle" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = '/default-car.png'; }}
                                />
                            ) : (
                                <div className="text-center">
                                    <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase mt-2">{t('no_image_cap')}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <input type="file" id="car-image-update" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="car-image-update" 
                                className="flex items-center justify-center w-full h-14 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer transition-all text-[10px] font-black text-gray-500 uppercase tracking-widest"
                            >
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" /> {t('upload_new_photo')}
                            </label>
                        </div>
                    </section>

                    <button
                        type="submit"
                        disabled={isSaving || !canManageFleet}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> {t('syncing')}</>
                        ) : (
                            <><ShieldCheckIcon className="h-5 w-5" /> {t('save_changes')}</>
                        )}
                    </button>

                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-3">
                            <DocumentMagnifyingGlassIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-black uppercase tracking-tight">
                                {t('registry_updates_final')}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default CarEditPage;