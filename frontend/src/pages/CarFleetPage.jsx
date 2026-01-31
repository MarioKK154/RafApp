import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    ArrowPathRoundedSquareIcon, // Check-in/out vibe
    TruckIcon,
    UserIcon,
    IdentificationIcon,
    WrenchIcon,
    BuildingOfficeIcon,
    ArrowRightCircleIcon
} from '@heroicons/react/24/outline';

/**
 * Debounce hook to optimize frontend search filtering.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function CarFleetPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data States
    const [cars, setCars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // UI/Filter States
    const [carToDelete, setCarToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Permissions: Admin or Superuser for fleet management
    const isSuperuser = user?.is_superuser;
    const canManageFleet = user && (user.role === 'admin' || isSuperuser);

    const fetchCars = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetching global list (Backend handles tenant isolation unless superuser)
            const response = await axiosInstance.get('/cars/', { params: { limit: 500 } });
            setCars(response.data);
        } catch (err) {
            console.error("Fleet fetch error:", err);
            setError('Failed to synchronize with fleet registry.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchCars(); }, [fetchCars]);

    /**
     * Frontend Search Logic
     */
    const filteredCars = useMemo(() => {
        if (!debouncedSearchTerm) return cars;
        const query = debouncedSearchTerm.toLowerCase();
        return cars.filter(car =>
            car.make.toLowerCase().includes(query) ||
            car.model.toLowerCase().includes(query) ||
            car.license_plate.toLowerCase().includes(query) ||
            (car.vin && car.vin.toLowerCase().includes(query))
        );
    }, [cars, debouncedSearchTerm]);

    const triggerDelete = (car) => {
        setCarToDelete(car);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!carToDelete) return;
        try {
            await axiosInstance.delete(`/cars/${carToDelete.id}`);
            toast.success(`Vehicle ${carToDelete.license_plate} removed from fleet.`);
            fetchCars();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Deletion failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setCarToDelete(null);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Checked Out': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'In Service': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Needs Service': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'Retired': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            default: return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30';
        }
    };

    if (isLoading && cars.length === 0) return <LoadingSpinner text="Retrieving fleet status..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <TruckIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Fleet Registry</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global vehicle asset management" : `Company vehicles for ${user?.tenant?.name}`}
                    </p>
                </div>

                {canManageFleet && (
                    <button 
                        onClick={() => navigate('/cars/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Register Vehicle
                    </button>
                )}
            </header>

            {/* Global Search & Stats */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by Brand, Model, Plate or VIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400 shadow-sm">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> {cars.filter(c => c.status === 'Available').length} Ready</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> {cars.filter(c => c.status === 'Checked Out').length} Active</span>
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold">{error}</div>}

            {/* Fleet Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCars.length > 0 ? filteredCars.map(car => (
                    <div key={car.id} className="group relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                        
                        {/* Vehicle Image / Placeholder */}
                        <div className="aspect-[16/9] bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                            <img
                                src={car.image_url || '/default-car.png'}
                                alt={`${car.make} ${car.model}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=Vehicle+Image+Pending'; }}
                            />
                            <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${getStatusStyle(car.status)}`}>
                                    {car.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">
                                        {car.make} {car.model}
                                    </h2>
                                    <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                        {car.license_plate}
                                    </p>
                                </div>
                                <Link 
                                    to={`/cars/${car.id}`} 
                                    className="p-2 text-gray-400 hover:text-indigo-600 transition"
                                    title="View Logs & Details"
                                >
                                    <ArrowRightCircleIcon className="h-8 w-8" />
                                </Link>
                            </div>

                            <div className="space-y-2.5 mb-6">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <IdentificationIcon className="h-4 w-4 text-gray-400" />
                                    <span className="font-bold">VIN:</span>
                                    <span className="truncate">{car.vin || 'Not Registered'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                    <span className="font-bold">Custodian:</span>
                                    <span>{car.current_user?.full_name || 'Fleet Pool (Available)'}</span>
                                </div>
                                {isSuperuser && car.tenant && (
                                    <div className="flex items-center gap-2 text-[10px] text-orange-600 font-black uppercase tracking-tighter pt-1">
                                        <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                        {car.tenant.name}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-gray-700">
                                {car.status === 'Available' ? (
                                    <button 
                                        onClick={() => navigate(`/cars/${car.id}`)}
                                        className="flex-1 inline-flex justify-center items-center h-10 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-black rounded-xl hover:bg-green-100 transition uppercase tracking-widest"
                                    >
                                        <ArrowPathRoundedSquareIcon className="h-4 w-4 mr-1.5" /> Start Trip
                                    </button>
                                ) : car.current_user?.id === user.id ? (
                                    <button 
                                        onClick={() => navigate(`/cars/${car.id}`)}
                                        className="flex-1 inline-flex justify-center items-center h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-black rounded-xl hover:bg-orange-100 transition uppercase tracking-widest"
                                    >
                                        <ArrowPathRoundedSquareIcon className="h-4 w-4 mr-1.5" /> Check-in
                                    </button>
                                ) : (
                                    <div className="flex-1 h-10 bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase rounded-xl italic">
                                        Vehicle in Use
                                    </div>
                                )}

                                {canManageFleet && (
                                    <>
                                        <button 
                                            onClick={() => navigate(`/cars/edit/${car.id}`)}
                                            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition"
                                            title="Edit Metadata"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => triggerDelete(car)}
                                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"
                                            title="Purge Vehicle"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <TruckIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No vehicles found</h3>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting your search criteria or register a new asset.</p>
                    </div>
                )}
            </div>

            {/* Deletion confirmation handled by standardized modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Vehicle Asset"
                message={`Are you sure you want to delete ${carToDelete?.license_plate} (${carToDelete?.make})? This will permanently remove its historical data from the active registry.`}
                confirmText="Permanently Remove"
                type="danger"
            />
        </div>
    );
}

export default CarFleetPage;