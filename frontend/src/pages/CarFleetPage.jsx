// frontend/src/pages/CarFleetPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

function CarFleetPage() {
    const [cars, setCars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [carToDelete, setCarToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const isAdmin = user && (user.role === 'admin' || user.is_superuser);

    const fetchCars = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/cars/')
            .then(response => setCars(response.data))
            .catch(() => {
                setError('Failed to load car fleet data.');
                toast.error('Failed to load car fleet data.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchCars(); }, [fetchCars]);

    const handleCheckout = async (carId) => {
        try {
            await axiosInstance.post(`/cars/${carId}/checkout`, {});
            toast.success('Car checked out successfully!');
            fetchCars();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check out car.'); }
    };

    const handleCheckin = async (carId) => {
        try {
            await axiosInstance.post(`/cars/${carId}/checkin`, {});
            toast.success('Car checked in successfully!');
            fetchCars();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check in car.'); }
    };

    const handleDeleteClick = (car) => {
        setCarToDelete(car);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
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

    if (isLoading) { return <LoadingSpinner text="Loading Car Fleet..." />; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Car Fleet</h1>
                {isAdmin && (
                    <Link to="/cars/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add New Car
                    </Link>
                )}
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-2">Image</th>
                            <th className="py-3 px-6">License Plate</th>
                            <th className="py-3 px-6">Make & Model</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Currently With</th>
                            <th className="py-3 px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cars.map(car => (
                            <tr key={car.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="p-2">
                                    <img src={car.image_url || '/default-car.png'} alt={`${car.make} ${car.model}`} className="h-12 w-20 object-cover rounded" onError={(e) => { e.target.onerror = null; e.target.src='/default-car.png' }}/>
                                </td>
                                <td className="py-4 px-6 font-mono">{car.license_plate}</td>
                                <td className="py-4 px-6 font-medium">
                                    <Link to={`/cars/${car.id}`} className="text-blue-600 hover:underline">{car.make} {car.model}</Link>
                                </td>
                                <td className="py-4 px-6">{car.status.replace('_', ' ')}</td>
                                <td className="py-4 px-6">{car.current_user?.full_name || '-'}</td>
                                <td className="py-4 px-6 flex items-center space-x-3">
                                    {car.status === 'Available' && (
                                        <button onClick={() => handleCheckout(car.id)} className="text-green-600 hover:underline">Check Out</button>
                                    )}
                                    {/* --- THIS IS THE FIX --- */}
                                    {car.status === 'Checked Out' && car.current_user?.id === user.id && (
                                        <button onClick={() => handleCheckin(car.id)} className="text-yellow-600 hover:underline">Check In</button>
                                    )}
                                    {isAdmin && (
                                        <>
                                            <Link to={`/cars/edit/${car.id}`} className="text-blue-600 hover:underline">Edit</Link>
                                            <button onClick={() => handleDeleteClick(car)} className="text-red-600 hover:underline">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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