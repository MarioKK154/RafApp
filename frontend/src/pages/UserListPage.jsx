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
    BuildingOfficeIcon, // For Tenant display
    IdentificationIcon // For Employee ID
} from '@heroicons/react/24/outline';

// Debounce hook for smooth searching
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function UserListPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser && (currentUser.role === 'admin' || isSuperuser);

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        setError('');
        // Superadmin fetches all users; Tenant Admin fetches their tenant's users
        axiosInstance.get('/users/', { params: { limit: 500 } })
            .then(response => setUsers(response.data))
            .catch(() => {
                setError('Failed to fetch users. Please check your connection.');
                toast.error('Error loading user list.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Enhanced Search: Name, Email, Role, Employee ID, and Tenant Name
    const filteredUsers = useMemo(() => {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        if (!lowerSearch) return users;

        return users.filter(u =>
            (u.full_name?.toLowerCase().includes(lowerSearch)) ||
            (u.email.toLowerCase().includes(lowerSearch)) ||
            (u.role.toLowerCase().includes(lowerSearch)) ||
            (u.employee_id?.toLowerCase().includes(lowerSearch)) ||
            (u.tenant?.name?.toLowerCase().includes(lowerSearch))
        );
    }, [users, debouncedSearchTerm]);

    const handleToggleActiveStatus = async (userToToggle) => {
        if (userToToggle.id === currentUser.id) {
            toast.error("You cannot deactivate your own account.");
            return;
        }

        const action = userToToggle.is_active ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} "${userToToggle.email}"?`)) return;

        try {
            await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: !userToToggle.is_active });
            toast.success(`User ${action}d successfully.`);
            fetchUsers();
        } catch (err) {
            toast.error(`Failed to ${action} user.`);
        }
    };

    if (isLoading && users.length === 0) {
        return <LoadingSpinner text="Loading workforce..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {isSuperuser ? "Global workforce management" : `Team members for ${currentUser?.tenant?.name}`}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => navigate('/users/import')}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            Import
                        </button>
                        <button 
                            onClick={() => navigate('/users/new')}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" /> Add User
                        </button>
                    </div>
                )}
            </div>

            {/* Search and Filters */}
            <div className="relative mb-8 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    placeholder="Search by name, ID, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition"
                />
            </div>

            {error && <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">{error}</div>}

            {/* User Cards Grid */}
            {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {/* Profile Info */}
                                <div className="flex-shrink-0">
                                    {u.profile_picture_url ? (
                                        <img src={u.profile_picture_url} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"/>
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <UserCircleIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                            {u.full_name || 'Unnamed User'}
                                        </h2>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-1 space-y-1">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                                            <EnvelopeIcon className="h-4 w-4" /> {u.email}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <IdentificationIcon className="h-4 w-4" /> {u.employee_id || 'No ID'}
                                            </p>
                                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {u.is_superuser ? 'Superuser' : u.role}
                                            </p>
                                        </div>

                                        {/* Superadmin specific info */}
                                        {isSuperuser && u.tenant && (
                                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1 mt-1">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" /> {u.tenant.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                {isAdmin && (
                                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
                                        <button 
                                            onClick={() => navigate(`/users/edit/${u.id}`)}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            <PencilIcon className="h-3.5 w-3.5 mr-1.5" /> Edit
                                        </button>
                                        {!u.is_superuser && (
                                            <button 
                                                onClick={() => handleToggleActiveStatus(u)}
                                                className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition ${
                                                    u.is_active 
                                                    ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/10' 
                                                    : 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/10'
                                                }`}
                                            >
                                                {u.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <UserCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No users found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
                </div>
            )}
        </div>
    );
}

export default UserListPage;