// frontend/src/pages/CarFleetPage.jsx
// Card layout + Basic Search

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, ArrowUpOnSquareIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/solid';

// Debounce hook (reuse if available globally, otherwise define here)
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function CarFleetPage() {
    const [cars, setCars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [carToDelete, setCarToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search

    const isAdmin = user && (user.role === 'admin' || user.is_superuser);

    const fetchCars = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/cars/') // Add search param later if needed on backend
            .then(response => setCars(response.data))
            .catch(() => {
                setError('Failed to load car fleet data.');
                toast.error('Failed to load car fleet data.');
            })
            .finally(() => setIsLoading(false));
    }, []); // Removed debouncedSearchTerm dependency for now (frontend filter)

    useEffect(() => { fetchCars(); }, [fetchCars]);

     // Filter cars based on search term (frontend filtering)
    const filteredCars = useMemo(() => {
        if (!debouncedSearchTerm) {
            return cars;
        }
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return cars.filter(car =>
            car.make.toLowerCase().includes(lowerSearch) ||
            car.model.toLowerCase().includes(lowerSearch) ||
            car.license_plate.toLowerCase().includes(lowerSearch) ||
            (car.vin && car.vin.toLowerCase().includes(lowerSearch))
        );
    }, [cars, debouncedSearchTerm]);


    const handleCheckout = async (carId) => {
        // Navigate to details page to checkout with odometer/notes
        navigate(`/cars/${carId}`);
        // Alternatively, implement a quick checkout modal here
        // try {
        //     await axiosInstance.post(`/cars/${carId}/checkout`, {}); // Send empty body for quick checkout
        //     toast.success('Car checked out successfully!');
        //     fetchCars();
        // } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check out car.'); }
    };

    const handleCheckin = async (carId) => {
         // Navigate to details page to checkin with odometer/notes
         navigate(`/cars/${carId}`);
        // Alternatively, implement a quick checkin modal here
        // try {
        //     await axiosInstance.post(`/cars/${carId}/checkin`, {}); // Send empty body for quick checkin
        //     toast.success('Car checked in successfully!');
        //     fetchCars();
        // } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check in car.'); }
    };

    const handleDeleteClick = (car) => {
        setCarToDelete(car);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        // ... (delete logic remains the same)
        if (!carToDelete) return;
        try {
            await axiosInstance.delete(`/cars/${carToDelete.id}`);
            toast.success(`Car "${carToDelete.make} ${carToDelete.model}" deleted.`);
            fetchCars();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete car.'); }
        finally {
            setIsDeleteModalOpen(false);
            setCarToDelete(null);
        }
    };

    const getStatusColor = (status) => {
        // ... (status color logic - adjust as needed)
         switch (status) {
            case 'Available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Checked Out': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'In Service': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'Needs Service': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'Retired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };


    if (isLoading && cars.length === 0) {
        return <LoadingSpinner text="Loading Car Fleet..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
             <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Car Fleet</h1>
                {isAdmin && ( // Only Admins can add/delete cars
                    <Link to="/cars/new" className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add New Car
                    </Link>
                )}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search by make, model, plate, VIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>


            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

             {/* Car Cards List */}
            {isLoading && cars.length > 0 && <LoadingSpinner text="Refreshing fleet..." />}
            {!isLoading && filteredCars.length > 0 ? (
                 <div className="space-y-4">
                    {filteredCars.map(car => (
                        <div key={car.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Image and Main Info */}
                                <div className="flex items-start gap-4 flex-grow min-w-[200px]">
                                     <img
                                        src={car.image_url || '/default-car.png'}
                                        alt={`${car.make} ${car.model}`}
                                        className="h-16 w-24 object-cover rounded flex-shrink-0 bg-gray-100 dark:bg-gray-700 p-1"
                                        onError={(e) => { e.target.onerror = null; e.target.src='/default-car.png' }}
                                    />
                                    <div>
                                         <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                             <Link to={`/cars/${car.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                                                 {car.make} {car.model}
                                             </Link>
                                         </h2>
                                         <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                                             {car.license_plate}
                                         </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                             VIN: {car.vin || 'N/A'}
                                         </p>
                                    </div>
                                </div>
                                {/* Status, User, and Actions */}
                                <div className="flex-shrink-0 text-right space-y-2 min-w-[150px]">
                                     <span className={`block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(car.status)}`}>
                                         {car.status.replace('_', ' ')}
                                     </span>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">
                                         With: {car.current_user?.full_name || '-'}
                                     </p>
                                     <div className="flex justify-end items-center space-x-3 mt-2">
                                        {/* Check-in/out Buttons - Link to details page for full flow */}
                                        {car.status === 'Available' && (
                                            <button onClick={() => navigate(`/cars/${car.id}`)} className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center" title="Check Out">
                                                <ArrowUpOnSquareIcon className="h-4 w-4 mr-1"/> Check Out
                                            </button>
                                        )}
                                        {car.status === 'Checked Out' && car.current_user?.id === user.id && (
                                             <button onClick={() => navigate(`/cars/${car.id}`)} className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center" title="Check In">
                                                <ArrowDownOnSquareIcon className="h-4 w-4 mr-1"/> Check In
                                            </button>
                                        )}
                                        {/* Admin Actions */}
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => navigate(`/cars/edit/${car.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center" title="Edit Car">
                                                    <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                                </button>
                                                <button onClick={() => handleDeleteClick(car)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium flex items-center" title="Delete Car">
                                                    <TrashIcon className="h-4 w-4 mr-1"/> Delete
                                                </button>
                                            </>
                                        )}
                                     </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 !isLoading && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Cars Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No cars match your search for "${searchTerm}".` : 'There are no cars in the fleet currently.'}
                     </p>
                 </div>
            )}


            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Car"
                    message={`Are you sure you want to delete the car "${carToDelete?.make} ${carToDelete?.model} (${carToDelete?.license_plate})"?`}
                />
            )}
        </div>
    );
}

export default CarFleetPage;