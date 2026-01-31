import React, { useState, useEffect, useCallback } from 'react';
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
    FingerPrintIcon
} from '@heroicons/react/24/outline';

/**
 * Standardizes date strings for HTML5 date inputs.
 */
const formatDate = (dateString) => dateString ? dateString.split('T')[0] : '';

function CarEditPage() {
    const { carId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    // Data State
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

    // Permissions: Superadmin has global root access
    const isSuperuser = currentUser?.is_superuser;
    const canManageFleet = currentUser && (currentUser.role === 'admin' || isSuperuser);

    const fetchCar = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/cars/${carId}`);
            const car = response.data;
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
        } catch (err) {
            toast.error('Failed to synchronize with vehicle registry.');
            navigate('/cars');
        } finally {
            setIsLoading(false);
        }
    }, [carId, navigate]);

    useEffect(() => { fetchCar(); }, [fetchCar]);

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
        if (!canManageFleet) {
            toast.error("Administrative privileges required.");
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
            // Update Metadata
            await axiosInstance.put(`/cars/${carId}`, payload);
            
            // Update Image if changed
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/cars/${carId}/image`, imageFormData);
            }
            
            toast.success(`Asset updated: ${formData.license_plate}`);
            navigate('/cars');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to sync updates.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text="Accessing vehicle telemetry..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link to="/cars" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Fleet Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <PencilSquareIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                            Edit Asset: {formData.make} {formData.model}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold tracking-tighter text-sm">
                                {formData.license_plate}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <FingerPrintIcon className="h-3 w-3" /> ID: {carId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Data Entry */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Identity & Legal Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <IdentificationIcon className="h-4 w-4" /> Registration & Identity
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Make / Brand</label>
                                <input type="text" name="make" required value={formData.make} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Model</label>
                                <input type="text" name="model" required value={formData.model} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">License Plate</label>
                                <input type="text" name="license_plate" required value={formData.license_plate} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Manufacture Year</label>
                                <input type="number" name="year" value={formData.year} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Purchase Date</label>
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">VIN (Chassis Number)</label>
                            <input type="text" name="vin" value={formData.vin} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-mono" />
                        </div>
                    </section>

                    {/* Maintenance Section */}
                    <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-4 w-4" /> Service Logs
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
                                Active Service Alert
                            </label>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Technician Notes</label>
                            <textarea name="service_notes" value={formData.service_notes} onChange={handleChange} rows="3" className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"></textarea>
                        </div>
                    </section>
                </div>

                {/* Right Column: Visual Registry & Action */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <PhotoIcon className="h-4 w-4" /> Visual Identity
                        </h2>
                        
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <img 
                                src={previewUrl || currentImageUrl || '/default-car.png'} 
                                alt="Vehicle" 
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/default-car.png'; }}
                            />
                            {previewUrl && (
                                <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded shadow-lg">
                                    New Selection
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <input type="file" id="car-image-update" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="car-image-update" 
                                className="flex items-center justify-center w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors text-xs font-black text-gray-500 uppercase tracking-widest"
                            >
                                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                {selectedFile ? 'Change Selection' : 'Upload New Photo'}
                            </label>
                        </div>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSaving || !canManageFleet}
                        className="w-full inline-flex justify-center items-center h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-6 w-6 mr-2 animate-spin" />
                                Syncing Registry...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-6 w-6 mr-2" />
                                Commit Updates
                            </>
                        )}
                    </button>

                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex gap-2">
                            <DocumentMagnifyingGlassIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                Registry updates are logged for audit compliance. If the License Plate or VIN is modified, global logistics records will be updated automatically.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default CarEditPage;