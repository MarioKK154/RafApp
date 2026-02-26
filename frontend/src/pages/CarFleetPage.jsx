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
    ArrowPathRoundedSquareIcon,
    TruckIcon,
    UserIcon,
    IdentificationIcon,
    WrenchIcon,
    BuildingOfficeIcon,
    ArrowRightCircleIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Protocol: Debounce search to prevent unnecessary registry re-renders.
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

    const [cars, setCars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [carToDelete, setCarToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = user?.is_superuser;
    const canManageFleet = user && (user.role === 'admin' || isSuperuser);

    const fetchCars = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/cars/', { params: { limit: 500 } });
            setCars(response.data);
        } catch (err) {
            console.error("Fleet sync error:", err);
            setError('Operational Error: Failed to synchronize with fleet registry.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchCars(); }, [fetchCars]);

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
            toast.success(`Asset ${carToDelete.license_plate} purged from registry.`);
            fetchCars();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Purge protocol failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setCarToDelete(null);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:border-green-800';
            case 'Checked Out': return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800';
            case 'In Service': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
            case 'Needs Service': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800';
            default: return 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800';
        }
    };

    if (isLoading && cars.length === 0) return <LoadingSpinner text="Synchronizing Fleet Data..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Fleet Header */}
            <header className="mb-12">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <TruckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">Cars</h1>
                        </div>
                    </div>
                </div>

                {canManageFleet && (
                    <button 
                        onClick={() => navigate('/cars/new')}
                        className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition transform active:scale-95 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center gap-2"
                    >
                        <PlusIcon className="h-5 w-5" /> 
                        Register New Asset
                    </button>
                )}
                </div>
            </header>

            {/* Tactical Search Terminal */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Filter by Make, Model, Plate or Chassis VIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem]"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] p-4 flex items-center justify-around text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-gray-900 dark:text-gray-100">{cars.filter(c => c.status === 'Available').length} Ready</span>
                    </div>
                    <div className="h-4 w-px bg-gray-100 dark:bg-gray-700"></div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                        <span className="text-gray-900 dark:text-gray-100">{cars.filter(c => c.status === 'Checked Out').length} Active</span>
                    </div>
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">{error}</div>}

            {/* Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredCars.length > 0 ? filteredCars.map(car => (
                    <div key={car.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                        
                        {/* High-Resolution Profile Preview */}
                        <div className="aspect-[16/10] bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                            <img
                                src={car.image_url || '/default-car.png'}
                                alt={`${car.make} ${car.model}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/600x400?text=Vehicle+Asset+Pending'; }}
                            />
                            <div className="absolute top-6 left-6">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl border ${getStatusStyle(car.status)}`}>
                                    {car.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Telemetry Summary */}
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter italic">
                                        {car.make} {car.model}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <HashtagIcon className="h-3.5 w-3.5 text-indigo-500" />
                                        <p className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-widest uppercase leading-none">
                                            {car.license_plate}
                                        </p>
                                    </div>
                                </div>
                                <Link 
                                    to={`/cars/${car.id}`} 
                                    className="p-2 text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors transform group-hover:scale-110 duration-300"
                                    title="Access Operational Hub"
                                >
                                    <ArrowRightCircleIcon className="h-10 w-10" />
                                </Link>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <IdentificationIcon className="h-4 w-4" />
                                        <span>Chassis VIN</span>
                                    </div>
                                    <span className="text-gray-900 dark:text-gray-200 font-mono tracking-tighter">{car.vin ? car.vin.slice(-8) : 'MISSING'}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" />
                                        <span>Current Custodian</span>
                                    </div>
                                    <span className="text-gray-900 dark:text-gray-200 truncate max-w-[140px]">{car.current_user?.full_name?.split(' ')[0] || 'Fleet Pool'}</span>
                                </div>
                                {isSuperuser && car.tenant && (
                                    <div className="pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center gap-2 text-[9px] text-orange-600 font-black uppercase tracking-widest">
                                        <BuildingOfficeIcon className="h-4 w-4" />
                                        {car.tenant.name}
                                    </div>
                                )}
                            </div>

                            {/* Tactical Actions Terminal */}
                            <div className="flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-gray-700/50">
                                <Link 
                                    to={`/cars/${car.id}`}
                                    className={`flex-1 flex justify-center items-center h-12 text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow-sm border ${
                                        car.status === 'Available' 
                                        ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' 
                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800'
                                    }`}
                                >
                                    {car.status === 'Available' ? (
                                        <><ArrowPathRoundedSquareIcon className="h-4 w-4 mr-2" /> Initialize Trip</>
                                    ) : (
                                        <><WrenchIcon className="h-4 w-4 mr-2" /> View Operations</>
                                    )}
                                </Link>

                                {canManageFleet && (
                                    <>
                                        <button 
                                            onClick={() => navigate(`/cars/edit/${car.id}`)}
                                            className="p-3 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition"
                                            title="Edit Metadata"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => triggerDelete(car)}
                                            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                            title="Purge Asset"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <TruckIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No vehicles detected in sector</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust search filters or register a new vehicle asset.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Vehicle Asset"
                message={`CRITICAL: Are you sure you want to permanently delete ${carToDelete?.license_plate}? This will purge its historical logs from the active registry.`}
                confirmText="PERMANENTLY REMOVE"
                type="danger"
            />
        </div>
    );
}

export default CarFleetPage;