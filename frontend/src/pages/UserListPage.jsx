// frontend/src/pages/UserListPage.jsx
// Card layout + Basic Search

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal'; // Assuming you still have this for future delete
import { PlusIcon, PencilIcon, MagnifyingGlassIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/solid';

// Debounce hook (reuse if available globally)
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

    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_superuser);

    const fetchUsers = useCallback(() => {
        setIsLoading(true);
        setError('');
        axiosInstance.get('/users/', { params: { limit: 200 } }) // Fetch a reasonable limit
            .then(response => setUsers(response.data))
            .catch(() => {
                setError('Failed to fetch users.');
                // toast.error('Failed to fetch users.'); // Can be noisy
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Filter users based on search term (frontend filtering)
    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm) {
            return users;
        }
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return users.filter(user =>
            (user.full_name && user.full_name.toLowerCase().includes(lowerSearch)) ||
            user.email.toLowerCase().includes(lowerSearch) ||
            user.role.toLowerCase().includes(lowerSearch) ||
            (user.employee_id && user.employee_id.toLowerCase().includes(lowerSearch))
        );
    }, [users, debouncedSearchTerm]);

    const handleToggleActiveStatus = async (userToToggle) => {
        const action = userToToggle.is_active ? 'deactivate' : 'activate';
        const newStatus = !userToToggle.is_active;

        if (userToToggle.is_superuser && !newStatus) {
            toast.warn("Superusers cannot be deactivated.");
            return;
        }

        if (!window.confirm(`Are you sure you want to ${action} user "${userToToggle.email}"?`)) return;

        try {
            await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: newStatus });
            toast.success(`User ${action}d successfully.`);
            fetchUsers(); // Refresh the list
        } catch (err) {
            toast.error(`Failed to ${action} user.`);
        }
    };


    if (isLoading && users.length === 0) {
        return <LoadingSpinner text="Loading users..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Users</h1>
                {isAdmin && (
                    <div className="flex gap-3">
                         <button onClick={() => navigate('/users/import')} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out text-sm">
                             Import Users
                         </button>
                         <button onClick={() => navigate('/users/new')} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                            <PlusIcon className="h-5 w-5 mr-2" /> Add User
                        </button>
                    </div>
                )}
            </div>

            {/* Search Bar */}
             <div className="mb-6">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, email, role, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* User Cards List */}
            {isLoading && users.length > 0 && <LoadingSpinner text="Refreshing users..." />}
            {!isLoading && filteredUsers.length > 0 ? (
                <div className="space-y-4">
                    {filteredUsers.map(listUser => (
                        <div key={listUser.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                           <div className="p-5 flex flex-wrap justify-between items-center gap-4">
                                {/* User Info */}
                                <div className="flex items-center gap-4 flex-grow min-w-[250px]">
                                    {listUser.profile_picture_url ? (
                                        <img src={listUser.profile_picture_url} alt={listUser.full_name || listUser.email} className="h-12 w-12 rounded-full object-cover flex-shrink-0"/>
                                    ) : (
                                        <UserCircleIcon className="h-12 w-12 text-gray-400 flex-shrink-0"/>
                                    )}
                                    <div>
                                         <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 truncate">
                                             {listUser.full_name || 'N/A'}
                                         </h2>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                                             <EnvelopeIcon className="h-4 w-4"/> {listUser.email}
                                          </p>
                                          {listUser.phone_number && (
                                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                                  <PhoneIcon className="h-3 w-3"/> {listUser.phone_number}
                                              </p>
                                          )}
                                    </div>
                                </div>
                                {/* Role, Status & Actions */}
                                <div className="flex-shrink-0 text-right space-y-2 min-w-[150px]">
                                     <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                         {listUser.is_superuser ? 'Superuser' : listUser.role.replace('_', ' ')}
                                     </p>
                                     <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                         {listUser.is_active ? 'Active' : 'Inactive'}
                                     </span>

                                     {/* --- CORRECTED JSX STRUCTURE --- */}
                                     {isAdmin && (
                                         <div className="flex justify-end items-center space-x-3 mt-2">
                                            {/* Deactivate/Activate Button */}
                                            {currentUser && listUser.id !== currentUser.id && !listUser.is_superuser && (
                                                <button onClick={() => handleToggleActiveStatus(listUser)} className={`text-xs font-medium flex items-center ${listUser.is_active ? 'text-orange-600 hover:underline' : 'text-green-600 hover:underline'}`}>
                                                    {listUser.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                            )}
                                             <button onClick={() => navigate(`/users/edit/${listUser.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium flex items-center" title="Edit User">
                                                 <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                             </button>
                                             {/* Delete button placeholder */}
                                         </div> // This closes the inner flex div for actions
                                     )}
                                     {/* --- END CORRECTION --- */}
                                </div> {/* This closes the outer flex-shrink div */}
                            </div> {/* This closes the p-5 flex div */}
                        </div> // This closes the main card div
                    ))}
                </div>
            ) : (
                 !isLoading && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Users Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No users match your search for "${searchTerm}".` : 'There are no users matching the current criteria.'}
                     </p>
                 </div>
            )}
        </div>
    );
}

export default UserListPage;