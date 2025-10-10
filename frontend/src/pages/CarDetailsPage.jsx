// frontend/src/pages/CarDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

function CarDetailsPage() {
    const { carId } = useParams();
    const [car, setCar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const isAdmin = user && (user.role === 'admin' || user.is_superuser);

    // State for service update form
    const [serviceNeeded, setServiceNeeded] = useState(false);
    const [serviceNotes, setServiceNotes] = useState('');
    
    // State for check-in/out form
    const [odometer, setOdometer] = useState('');
    const [notes, setNotes] = useState('');

    // State for tyre form
    const [tyreType, setTyreType] = useState('Summer');
    const [tyreBrand, setTyreBrand] = useState('');
    const [tyrePurchaseDate, setTyrePurchaseDate] = useState('');

    const fetchCar = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get(`/cars/${carId}`)
            .then(response => {
                setCar(response.data);
                setServiceNeeded(response.data.service_needed);
                setServiceNotes(response.data.service_notes || '');
            })
            .catch(() => toast.error("Failed to load car details."))
            .finally(() => setIsLoading(false));
    }, [carId]);

    useEffect(() => { fetchCar(); }, [fetchCar]);

    const handleServiceUpdate = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.put(`/cars/${carId}/service-status`, { service_needed: serviceNeeded, service_notes: serviceNotes });
            toast.success("Service status updated.");
            fetchCar();
        } catch (err) { toast.error("Failed to update service status."); }
    };

    const handleCheckOut = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post(`/cars/${carId}/checkout`, { odometer_reading: odometer ? parseInt(odometer) : null, notes });
            toast.success("Car checked out.");
            setOdometer(''); setNotes('');
            fetchCar();
        } catch (err) { toast.error(err.response?.data?.detail || "Failed to check out."); }
    };

    const handleCheckIn = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post(`/cars/${carId}/checkin`, { odometer_reading: odometer ? parseInt(odometer) : null, notes });
            toast.success("Car checked in.");
            setOdometer(''); setNotes('');
            fetchCar();
        } catch (err) { toast.error(err.response?.data?.detail || "Failed to check in."); }
    };

    const handleAddTyreSet = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post(`/cars/${carId}/tyres`, { type: tyreType, brand: tyreBrand, purchase_date: tyrePurchaseDate || null });
            toast.success("Tyre set added.");
            setTyreBrand(''); setTyrePurchaseDate('');
            fetchCar();
        } catch (err) { toast.error("Failed to add tyre set."); }
    };

    if (isLoading) { return <LoadingSpinner text="Loading car details..." />; }
    if (!car) { return <div className="text-center p-8">Car not found.</div>; }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold">{car.make} {car.model}</h1>
                    <p className="text-gray-500 font-mono text-lg">{car.license_plate}</p>
                </div>
                {isAdmin && <Link to={`/cars/edit/${car.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-md">Edit Car</Link>}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
                        <img src={car.image_url || '/default-car.png'} alt={`${car.make} ${car.model}`} className="w-full h-48 object-cover rounded-md mb-4" />
                        <h3 className="font-semibold">Status: {car.status.replace('_', ' ')}</h3>
                        <p className="text-sm">Currently with: {car.current_user?.full_name || 'In Stock'}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-sm space-y-2">
                         <h3 className="font-semibold text-lg mb-2">Vehicle Details</h3>
                         <p><strong>VIN:</strong> {car.vin || 'N/A'}</p>
                         <p><strong>Year:</strong> {car.year || 'N/A'}</p>
                         <p><strong>Purchased:</strong> {car.purchase_date ? new Date(car.purchase_date).toLocaleDateString() : 'N/A'}</p>
                         <p><strong>Last Oil Change:</strong> {car.last_oil_change_km ? `${car.last_oil_change_km} km` : 'N/A'}</p>
                         <p><strong>Next Oil Change Due:</strong> {car.next_oil_change_due_km ? `${car.next_oil_change_due_km} km` : 'N/A'}</p>
                         <p><strong>Service Needed:</strong> {car.service_needed ? <span className="text-red-500 font-bold">Yes</span> : 'No'}</p>
                         {car.service_notes && <p><strong>Service Notes:</strong> {car.service_notes}</p>}
                    </div>
                    {(car.status === 'Available' || (car.status === 'Checked Out' && car.current_user?.id === user.id)) && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                            <h3 className="font-semibold text-lg mb-2">{car.status === 'Available' ? 'Check Out Car' : 'Check In Car'}</h3>
                            <form onSubmit={car.status === 'Available' ? handleCheckOut : handleCheckIn} className="space-y-2">
                                <div><label>Odometer (km)</label><input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className="mt-1 block w-full rounded-md"/></div>
                                <div><label>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-md" rows="2"></textarea></div>
                                <button type="submit" className={`w-full px-4 py-2 text-white rounded-md ${car.status === 'Available' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                                    {car.status === 'Available' ? 'Confirm Check Out' : 'Confirm Check In'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Service Status</h2>
                        <form onSubmit={handleServiceUpdate} className="space-y-4">
                            <div className="flex items-center"><input type="checkbox" id="service_needed" checked={serviceNeeded} onChange={e => setServiceNeeded(e.target.checked)} className="h-4 w-4 rounded"/><label htmlFor="service_needed" className="ml-2">Service Needed?</label></div>
                            <div><label htmlFor="service_notes">Service Notes</label><textarea id="service_notes" value={serviceNotes} onChange={e => setServiceNotes(e.target.value)} rows="3" className="mt-1 block w-full rounded-md"></textarea></div>
                            <div className="text-right"><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Update Service Status</button></div>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Tyre Sets</h2>
                        <ul className="space-y-2 mb-4">
                            {car.tyre_sets.map(tyre => (
                                <li key={tyre.id} className="p-2 border rounded-md text-sm">
                                    <p><strong>Type:</strong> {tyre.type} {tyre.is_on_car && '(On Car)'}</p>
                                    <p><strong>Brand:</strong> {tyre.brand || 'N/A'}</p>
                                    <p><strong>Purchased:</strong> {tyre.purchase_date ? new Date(tyre.purchase_date).toLocaleDateString() : 'N/A'}</p>
                                </li>
                            ))}
                        </ul>
                        {isAdmin && (
                            <form onSubmit={handleAddTyreSet} className="space-y-2 pt-4 border-t">
                                <h3 className="font-semibold">Add New Tyre Set</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <select value={tyreType} onChange={e => setTyreType(e.target.value)} className="rounded-md"><option>Summer</option><option>Winter</option></select>
                                    <input type="text" placeholder="Brand" value={tyreBrand} onChange={e => setTyreBrand(e.target.value)} className="rounded-md"/>
                                    <input type="date" value={tyrePurchaseDate} onChange={e => setTyrePurchaseDate(e.target.value)} className="rounded-md"/>
                                </div>
                                <button type="submit" className="w-full mt-2 px-4 py-2 bg-gray-600 text-white rounded-md">Add Tyres</button>
                            </form>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">History Log</h2>
                        {car.history_logs && car.history_logs.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Action</th>
                                        <th className="px-4 py-2">User</th>
                                        <th className="px-4 py-2">Odometer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...car.history_logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                                        <tr key={log.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-2">{log.action.replace('_', ' ')}</td>
                                            <td className="px-4 py-2">{log.user.full_name}</td>
                                            <td className="px-4 py-2">{log.odometer_reading || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <p>No history records found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default CarDetailsPage;