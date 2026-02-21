import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    PlusIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    UserCircleIcon, 
    EnvelopeIcon, 
    PhoneIcon,
    BuildingOfficeIcon,
    IdentificationIcon,
    MapPinIcon,
    AdjustmentsHorizontalIcon,
    ArrowDownTrayIcon,
    UserMinusIcon,
    CheckBadgeIcon,
    ShieldCheckIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function UserListPage() {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    
    // Registry States
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState(''); 
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser && (currentUser.role === 'admin' || isSuperuser);

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        setError('');
        axiosInstance.get('/users/', { params: { limit: 1000 } })
            .then(response => setUsers(response.data))
            .catch(() => {
                setError('Operational Error: Workforce registry synchronization failed.');
                toast.error('Error loading user list.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // SYNC FIX: Extract unique locations by checking both 'city' and 'location' fields
    const cities = useMemo(() => {
        const uniqueCities = new Set(users.map(u => u.location || u.city).filter(Boolean));
        return Array.from(uniqueCities).sort();
    }, [users]);

    // SYNC FIX: Filter logic now accounts for both field name variations
    const filteredUsers = useMemo(() => {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return users.filter(u => {
            const userLocation = u.location || u.city || '';
            const matchesSearch = !lowerSearch || (
                (u.full_name?.toLowerCase().includes(lowerSearch)) ||
                (u.email.toLowerCase().includes(lowerSearch)) ||
                (u.role.toLowerCase().includes(lowerSearch)) ||
                (u.employee_id?.toLowerCase().includes(lowerSearch)) ||
                (u.tenant?.name?.toLowerCase().includes(lowerSearch))
            );
            const matchesCity = !cityFilter || userLocation === cityFilter;
            return matchesSearch && matchesCity;
        });
    }, [users, debouncedSearchTerm, cityFilter]);

    const handleToggleActiveStatus = async (userToToggle) => {
        if (userToToggle.id === currentUser.id) {
            toast.error("Protocol Error: Self-deactivation prohibited.");
            return;
        }

        const action = userToToggle.is_active ? 'deactivate' : 'activate';
        if (!window.confirm(`CRITICAL: Confirm ${action} for user "${userToToggle.email}"?`)) return;

        try {
            await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: !userToToggle.is_active });
            toast.success(`User ${action}d successfully.`);
            fetchUsers();
        } catch (err) {
            toast.error(`Failed to modify user status.`);
        }
    };

    if (isLoading && users.length === 0) return <LoadingSpinner text="Synchronizing Workforce Registry..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <UserCircleIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">Users</h1>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                                {isSuperuser ? "GLOBAL WORKFORCE" : `TEAM MEMBERS / ${currentUser?.tenant?.name}`}
                            </p>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => navigate('/users/import')}
                            className="flex-1 md:flex-none h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition transform active:scale-95"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Import</span>
                        </button>
                        <button 
                            onClick={() => navigate('/users/new')}
                            className="flex-1 md:flex-none h-14 px-8 bg-gray-900 dark:bg-gray-800 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl transition transform active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none flex items-center gap-2"
                        >
                            <PlusIcon className="h-5 w-5" /> Add User
                        </button>
                    </div>
                )}
            </header>

            {/* Tactical Filter Console */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Name, ID, Role or Company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                    />
                </div>
                <div className="lg:col-span-3 relative">
                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 pointer-events-none" />
                    <select 
                        value={cityFilter} 
                        onChange={e => setCityFilter(e.target.value)} 
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none"
                    >
                        <option value="">All Locations</option>
                        {cities.map(city => <option key={city} value={city}>{city}</option>)}
                    </select>
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    <span className="text-gray-900 dark:text-gray-100">{filteredUsers.length} Users Found</span>
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">{error}</div>}

            {/* Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                    <div key={u.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col">
                        
                        <div className="p-8 pb-6 border-b border-gray-50 dark:border-gray-700/50 flex items-start gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="h-20 w-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    {u.profile_picture_url ? (
                                        <img src={u.profile_picture_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="font-black text-3xl italic">{(u.full_name || u.email).charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white dark:border-gray-800 shadow-sm ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter italic group-hover:text-indigo-600 transition-colors">
                                    {u.full_name || 'Unassigned User'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <ShieldCheckIcon className="h-3.5 w-3.5 text-indigo-500" />
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        {u.is_superuser ? 'Root Admin' : u.role?.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <HashtagIcon className="h-3 w-3 text-gray-400" />
                                    <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-tighter">
                                        {u.employee_id || 'ID-PENDING'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Personnel Telemetry Body */}
                        <div className="p-8 flex-grow space-y-4">
                            <DetailRow icon={<EnvelopeIcon />} label="Email" value={u.email} />
                            {/* SYNC FIX: Display location using either 'location' or 'city' field */}
                            <DetailRow icon={<MapPinIcon />} label="Location" value={u.location || u.city || 'Not Specified'} />
                            
                            {isSuperuser && u.tenant && (
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-[0.2em]">
                                    <BuildingOfficeIcon className="h-4 w-4" />
                                    Tenant: {u.tenant.name}
                                </div>
                            )}
                        </div>

                        {/* Operational Control Terminal */}
                        {isAdmin && (
                            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50">
                                <button 
                                    onClick={() => navigate(`/users/edit/${u.id}`)}
                                    className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-[0.2em] transition-all"
                                >
                                    <PencilIcon className="h-4 w-4" /> Edit Profile
                                </button>
                                
                                {!u.is_superuser && (
                                    <button 
                                        onClick={() => handleToggleActiveStatus(u)}
                                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                            u.is_active ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'
                                        }`}
                                    >
                                        {u.is_active ? <UserMinusIcon className="h-4 w-4" /> : <CheckBadgeIcon className="h-4 w-4" />}
                                        {u.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <UserCircleIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No users in registry</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust search filters or add a new user.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 text-indigo-500 h-4 w-4 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1.5">{label}</p>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200 truncate tracking-tight">
                    {value}
                </p>
            </div>
        </div>
    );
}

export default UserListPage;