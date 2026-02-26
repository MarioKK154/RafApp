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
    ShieldCheckIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';

function CarDetailsPage() {
    const { carId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [car, setCar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [serviceNeeded, setServiceNeeded] = useState(false);
    const [serviceNotes, setServiceNotes] = useState('');
    const [odometer, setOdometer] = useState('');
    const [usageNotes, setUsageNotes] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
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
        } catch (error) {
            console.error('Vehicle fetch failed:', error);
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
        } catch (error) {
            console.error('Service status update failed:', error);
            toast.error("Failed to update service status.");
        }
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
        } catch (error) {
            console.error('Car action failed:', error);
            toast.error(error.response?.data?.detail || "Log submission failed.");
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
        } catch (error) {
            console.error('Add tyre set failed:', error);
            toast.error("Failed to add tyre configuration.");
        }
    };

    if (isLoading) return <LoadingSpinner text="Connecting to vehicle ECU..." />;
    if (!car) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <Link to="/cars" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Fleet Registry
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <TruckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tighter italic">
                                {car.make} {car.model}
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <HashtagIcon className="h-3 w-3 text-indigo-500" />
                                <p className="text-indigo-600 dark:text-indigo-400 font-mono font-black tracking-widest text-sm">
                                    {car.license_plate}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {isAdmin && (
                    <Link to={`/cars/edit/${car.id}`} className="inline-flex items-center px-8 h-14 bg-gray-900 dark:bg-gray-800 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition transform active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none">
                        <PencilIcon className="h-4 w-4 mr-2" /> Edit Asset
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Asset Identity */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                        <div className="aspect-video overflow-hidden">
                            <img src={car.image_url || '/default-car.png'} alt="Vehicle" className="w-full h-full object-cover transition-transform hover:scale-105 duration-700" />
                        </div>
                        <div className="p-8">
                            <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${
                                car.status === 'Available' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                            }`}>
                                <span className="mr-2 flex h-2 w-2 rounded-full bg-current"></span>
                                {car.status.replace('_', ' ')}
                            </div>
                            <div className="space-y-4">
                                <DetailRow icon={<UserIcon />} label="Custodian" value={car.current_user?.full_name || 'Fleet Pool'} />
                                <DetailRow icon={<IdentificationIcon />} label="VIN Node" value={car.vin} mono />
                                <DetailRow icon={<CalendarDaysIcon />} label="Deployment Year" value={car.year} />
                                <DetailRow icon={<MapPinIcon />} label="Registry Date" value={car.purchase_date ? new Date(car.purchase_date).toLocaleDateString() : 'N/A'} />
                            </div>
                        </div>
                    </div>

                    {/* Check In/Out Interface - High Contrast Card */}
                    {(car.status === 'Available' || (car.status === 'Checked Out' && car.current_user?.id === user.id)) && (
                        <div className="bg-indigo-600 rounded-[2.5rem] shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {car.status === 'Available' ? <ArrowUpCircleIcon className="h-24 w-24" /> : <ArrowDownCircleIcon className="h-24 w-24" />}
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                                {car.status === 'Available' ? <ArrowUpCircleIcon className="h-6 w-6" /> : <ArrowDownCircleIcon className="h-6 w-6" />}
                                {car.status === 'Available' ? 'Initialize Trip' : 'Return Vehicle'}
                            </h3>
                            <div className="space-y-5 relative z-10">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-indigo-200 mb-2 ml-1 tracking-[0.1em]">Current Odometer (KM)</label>
                                    <input 
                                        type="number" 
                                        value={odometer} 
                                        onChange={e => setOdometer(e.target.value)} 
                                        className="w-full h-14 bg-indigo-700/50 border-2 border-indigo-400 rounded-2xl text-white font-bold placeholder-indigo-300 focus:ring-0 focus:border-white transition text-sm"
                                        placeholder="000,000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-indigo-200 mb-2 ml-1 tracking-[0.1em]">Trip Telemetry/Notes</label>
                                    <textarea 
                                        value={usageNotes} 
                                        onChange={e => setUsageNotes(e.target.value)} 
                                        className="w-full bg-indigo-700/50 border-2 border-indigo-400 rounded-2xl text-sm text-white font-bold placeholder-indigo-300 focus:ring-0 focus:border-white transition p-4"
                                        rows="3"
                                        placeholder="Describe destination or operational purpose..."
                                    ></textarea>
                                </div>
                                <button 
                                    onClick={() => handleCarAction(car.status === 'Available' ? 'out' : 'in')}
                                    disabled={isActionLoading}
                                    className="w-full h-14 bg-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-50 transition transform active:scale-95 disabled:opacity-50 shadow-lg"
                                >
                                    {isActionLoading ? 'Processing...' : 'Confirm Log Entry'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Maintenance & Logs */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Maintenance Interface */}
                    <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Maintenance Log</h2>
                        </div>
                        <form onSubmit={handleServiceUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border-2 border-orange-100 dark:border-orange-800/30">
                                    <input 
                                        type="checkbox" 
                                        id="service_needed" 
                                        checked={serviceNeeded} 
                                        onChange={e => setServiceNeeded(e.target.checked)} 
                                        className="h-6 w-6 rounded-lg text-orange-600 focus:ring-orange-500 border-orange-300 bg-white dark:bg-gray-700"
                                    />
                                    <label htmlFor="service_needed" className="text-[11px] font-black uppercase tracking-widest text-orange-800 dark:text-orange-400">
                                        Flag for inspection
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Oil Log</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{car.last_oil_change_km ? `${car.last_oil_change_km.toLocaleString()} KM` : 'N/A'}</p>
                                    </div>
                                    <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Service Due</p>
                                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{car.next_oil_change_due_km ? `${car.next_oil_change_due_km.toLocaleString()} KM` : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Repair/Service Details</label>
                                <textarea 
                                    value={serviceNotes} 
                                    onChange={e => setServiceNotes(e.target.value)} 
                                    rows="4" 
                                    className="modern-input h-auto py-4 resize-none"
                                    placeholder="Log mechanical updates or noted defects..."
                                ></textarea>
                                <div className="flex justify-end">
                                    <button type="submit" className="px-10 h-12 bg-gray-900 dark:bg-gray-700 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black transition shadow-lg">
                                        Synchronize
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Tyre Node */}
                    <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                                <TagIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Tyre Registry</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <ul className="space-y-4">
                                {car.tyre_sets.map(tyre => (
                                    <li key={tyre.id} className="p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{tyre.brand || 'Standard'} • {tyre.type}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                Registry: {tyre.purchase_date ? new Date(tyre.purchase_date).toLocaleDateString() : 'Historical'}
                                            </p>
                                        </div>
                                        {tyre.is_on_car && <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">Equipped</span>}
                                    </li>
                                ))}
                            </ul>
                            {isAdmin && (
                                <form onSubmit={handleAddTyreSet} className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Add Configuration</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* VISIBILITY FIX: Native select styled for dark mode */}
                                        <select value={tyreType} onChange={e => setTyreType(e.target.value)} className="modern-input bg-white dark:bg-gray-800">
                                            <option className="dark:bg-gray-800">Summer</option>
                                            <option className="dark:bg-gray-800">Winter</option>
                                            <option className="dark:bg-gray-800">All-Season</option>
                                        </select>
                                        <input type="text" placeholder="Brand Name" value={tyreBrand} onChange={e => setTyreBrand(e.target.value)} className="modern-input"/>
                                    </div>
                                    <input type="date" value={tyrePurchaseDate} onChange={e => setTyrePurchaseDate(e.target.value)} className="modern-input"/>
                                    <button type="submit" className="w-full h-12 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition">
                                        Register Tyre Set
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Operational History Log */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 md:p-10 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                                <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Usage History</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="py-5 px-10">Timestamp</th>
                                        <th className="py-5 px-6">Operational Event</th>
                                        <th className="py-5 px-6">Personnel</th>
                                        <th className="py-5 px-10 text-right">Odometer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {car.history_logs?.length > 0 ? (
                                        [...car.history_logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <td className="py-5 px-10 text-gray-500 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 font-bold text-[11px]">
                                                        <ClockIcon className="h-4 w-4 text-indigo-400" />
                                                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        log.action === 'checkout' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-black">
                                                            {log.user?.full_name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-tight">{log.user?.full_name || 'Fleet System'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-10 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                                                    {log.odometer_reading ? `${log.odometer_reading.toLocaleString()} KM` : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">No operational logs recorded.</td>
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

function DetailRow({ icon, label, value, mono = false }) {
    return (
        <div className="flex items-start gap-4 p-1">
            <div className="mt-1 text-indigo-500 h-4 w-4 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1.5">{label}</p>
                <p className={`text-sm font-black text-gray-800 dark:text-gray-100 truncate ${mono ? 'font-mono tracking-tighter' : ''}`}>
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}

export default CarDetailsPage;