import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
    TruckIcon, 
    PencilIcon, 
    CalendarDaysIcon, 
    UserIcon, 
    IdentificationIcon, 
    WrenchScrewdriverIcon, 
    MapPinIcon,
    ArrowUpCircleIcon,
    ArrowDownCircleIcon,
    ClipboardDocumentListIcon,
    TagIcon,
    ClockIcon,
    ChevronLeftIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function CarDetailsPage() {
    const { carId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Core State
    const [car, setCar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Service State
    const [serviceNeeded, setServiceNeeded] = useState(false);
    const [serviceNotes, setServiceNotes] = useState('');
    
    // Usage State (Check-in/out)
    const [odometer, setOdometer] = useState('');
    const [usageNotes, setUsageNotes] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Tyre State
    const [tyreType, setTyreType] = useState('Summer');
    const [tyreBrand, setTyreBrand] = useState('');
    const [tyrePurchaseDate, setTyrePurchaseDate] = useState('');

    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    const fetchCar = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/cars/${carId}`);
            const data = response.data;
            setCar(data);
            setServiceNeeded(data.service_needed);
            setServiceNotes(data.service_notes || '');
        } catch (err) {
            toast.error("Vehicle registry access denied or not found.");
            navigate('/cars');
        } finally {
            setIsLoading(false);
        }
    }, [carId, navigate]);

    useEffect(() => { fetchCar(); }, [fetchCar]);

    const handleServiceUpdate = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.put(`/cars/${carId}/service-status`, { 
                service_needed: serviceNeeded, 
                service_notes: serviceNotes 
            });
            toast.success("Maintenance registry updated.");
            fetchCar();
        } catch (err) { toast.error("Failed to update service status."); }
    };

    const handleCarAction = async (actionType) => {
        if (!odometer) {
            toast.warn("Odometer reading is required for log accuracy.");
            return;
        }
        setIsActionLoading(true);
        try {
            const endpoint = actionType === 'out' ? 'checkout' : 'checkin';
            await axiosInstance.post(`/cars/${carId}/${endpoint}`, { 
                odometer_reading: parseInt(odometer, 10), 
                notes: usageNotes 
            });
            toast.success(actionType === 'out' ? "Trip started." : "Vehicle returned to pool.");
            setOdometer(''); 
            setUsageNotes('');
            fetchCar();
        } catch (err) { 
            toast.error(err.response?.data?.detail || "Log submission failed."); 
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddTyreSet = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post(`/cars/${carId}/tyres`, { 
                type: tyreType, 
                brand: tyreBrand, 
                purchase_date: tyrePurchaseDate || null 
            });
            toast.success("Tyre set registered.");
            setTyreBrand(''); 
            setTyrePurchaseDate('');
            fetchCar();
        } catch (err) { toast.error("Failed to add tyre configuration."); }
    };

    if (isLoading) return <LoadingSpinner text="Connecting to vehicle ECU..." />;
    if (!car) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link to="/cars" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Fleet Registry
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <TruckIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                                {car.make} {car.model}
                            </h1>
                            <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold tracking-tighter mt-1">
                                {car.license_plate}
                            </p>
                        </div>
                    </div>
                </div>
                {isAdmin && (
                    <Link to={`/cars/edit/${car.id}`} className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg">
                        <PencilIcon className="h-4 w-4 mr-2" /> Edit Asset
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Vehicle Identity */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <img src={car.image_url || '/default-car.png'} alt="Vehicle" className="w-full h-56 object-cover" />
                        <div className="p-6">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${
                                car.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                                {car.status.replace('_', ' ')}
                            </div>
                            <div className="space-y-3">
                                <DetailRow icon={<UserIcon />} label="Current Custodian" value={car.current_user?.full_name || 'Fleet Pool'} />
                                <DetailRow icon={<IdentificationIcon />} label="VIN" value={car.vin} mono />
                                <DetailRow icon={<CalendarDaysIcon />} label="Manufacturer Year" value={car.year} />
                                <DetailRow icon={<MapPinIcon />} label="Acquisition Date" value={car.purchase_date ? new Date(car.purchase_date).toLocaleDateString() : 'N/A'} />
                            </div>
                        </div>
                    </div>

                    {/* Check In/Out Interface */}
                    {(car.status === 'Available' || (car.status === 'Checked Out' && car.current_user?.id === user.id)) && (
                        <div className="bg-indigo-600 rounded-3xl shadow-xl p-6 text-white">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                                {car.status === 'Available' ? <ArrowUpCircleIcon className="h-6 w-6" /> : <ArrowDownCircleIcon className="h-6 w-6" />}
                                {car.status === 'Available' ? 'Initialize Trip' : 'Return Vehicle'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-indigo-200 mb-1 ml-1">Odometer (KM)</label>
                                    <input 
                                        type="number" 
                                        value={odometer} 
                                        onChange={e => setOdometer(e.target.value)} 
                                        className="w-full bg-indigo-700 border-none rounded-2xl text-white placeholder-indigo-400 focus:ring-2 focus:ring-white transition"
                                        placeholder="Enter reading..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-indigo-200 mb-1 ml-1">Trip Notes</label>
                                    <textarea 
                                        value={usageNotes} 
                                        onChange={e => setUsageNotes(e.target.value)} 
                                        className="w-full bg-indigo-700 border-none rounded-2xl text-sm text-white placeholder-indigo-400 focus:ring-2 focus:ring-white transition"
                                        rows="2"
                                        placeholder="Destination or purpose..."
                                    ></textarea>
                                </div>
                                <button 
                                    onClick={() => handleCarAction(car.status === 'Available' ? 'out' : 'in')}
                                    disabled={isActionLoading}
                                    className="w-full py-3 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isActionLoading ? 'Processing...' : 'Confirm Action'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Maintenance & Logs */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Maintenance Management */}
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-6">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Maintenance Status</h2>
                        </div>
                        <form onSubmit={handleServiceUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800">
                                    <input 
                                        type="checkbox" 
                                        id="service_needed" 
                                        checked={serviceNeeded} 
                                        onChange={e => setServiceNeeded(e.target.checked)} 
                                        className="h-6 w-6 rounded-lg text-orange-600 focus:ring-orange-500 border-orange-300"
                                    />
                                    <label htmlFor="service_needed" className="text-sm font-bold text-orange-800 dark:text-orange-300">
                                        Flag for Service Inspection
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Last Oil Change</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{car.last_oil_change_km ? `${car.last_oil_change_km} KM` : 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Service Due At</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{car.next_oil_change_due_km ? `${car.next_oil_change_due_km} KM` : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Maintenance History / Notes</label>
                                <textarea 
                                    value={serviceNotes} 
                                    onChange={e => setServiceNotes(e.target.value)} 
                                    rows="4" 
                                    className="w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                    placeholder="Enter details about recent repairs or upcoming needs..."
                                ></textarea>
                                <div className="text-right">
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                                        Save Status
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Tyre Registry */}
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-6">
                            <TagIcon className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Tyre Registry</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ul className="space-y-3">
                                {car.tyre_sets.map(tyre => (
                                    <li key={tyre.id} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center group hover:bg-gray-50 transition">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{tyre.brand || 'Generic'} - {tyre.type}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                Purchased: {tyre.purchase_date ? new Date(tyre.purchase_date).toLocaleDateString() : 'Unknown'}
                                            </p>
                                        </div>
                                        {tyre.is_on_car && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">Active</span>}
                                    </li>
                                ))}
                            </ul>
                            {isAdmin && (
                                <form onSubmit={handleAddTyreSet} className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Add New Set</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <select value={tyreType} onChange={e => setTyreType(e.target.value)} className="rounded-xl border-gray-200 text-sm">
                                            <option>Summer</option><option>Winter</option><option>All-Season</option>
                                        </select>
                                        <input type="text" placeholder="Brand" value={tyreBrand} onChange={e => setTyreBrand(e.target.value)} className="rounded-xl border-gray-200 text-sm"/>
                                    </div>
                                    <input type="date" value={tyrePurchaseDate} onChange={e => setTyrePurchaseDate(e.target.value)} className="w-full rounded-xl border-gray-200 text-sm"/>
                                    <button type="submit" className="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition">
                                        Register Tyre Set
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Historical Usage Log */}
                    
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Usage History</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="py-4 px-8">Timestamp</th>
                                        <th className="py-4 px-6">Event</th>
                                        <th className="py-4 px-6">User</th>
                                        <th className="py-4 px-6 text-right">Odometer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {car.history_logs?.length > 0 ? (
                                        [...car.history_logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="py-4 px-8 text-gray-500 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <ClockIcon className="h-3 w-3" />
                                                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">
                                                    {log.action.replace('_', ' ')}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-indigo-400" />
                                                        <span className="font-bold text-gray-900 dark:text-white">{log.user?.full_name || 'System'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                                                    {log.odometer_reading ? `${log.odometer_reading.toLocaleString()} KM` : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-12 text-center text-gray-400 italic">No usage logs recorded for this asset.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Helper component for structured detail rows
 */
function DetailRow({ icon, label, value, mono = false }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-indigo-500 h-4 w-4 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                <p className={`text-sm font-bold text-gray-700 dark:text-gray-200 truncate ${mono ? 'font-mono tracking-tighter' : ''}`}>
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}

export default CarDetailsPage;