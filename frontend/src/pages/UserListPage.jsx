// frontend/src/pages/UserListPage.jsx
// Final Version: All users can view, only admins can act.

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function UserListPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Permission checks:
    // Anyone authenticated can view the page.
    // Specific actions are checked by 'isAdmin'.
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_superuser);

    const fetchUsers = useCallback(() => {
        // Any authenticated user can fetch the list. The backend will scope it to their tenant.
        if (!authIsLoading && isAuthenticated) {
            setIsLoading(true); 
            setError('');
            axiosInstance.get('/users/')
                .then(response => { 
                    setUsers(response.data); 
                })
                .catch(err => { 
                    console.error("Error fetching users:", err); 
                    setError('Failed to load users.'); 
                    toast.error('Failed to load users.');
                })
                .finally(() => { 
                    setIsLoading(false); 
                });
        } else if (!authIsLoading && !isAuthenticated) { 
            navigate('/login', {replace: true}); 
        }
    }, [isAuthenticated, authIsLoading, navigate]);

    useEffect(() => { 
        fetchUsers(); 
    }, [fetchUsers]);

    const handleToggleActiveStatus = async (userToToggle) => {
        if (!isAdmin) { 
            toast.error("You do not have permission to perform this action."); 
            return; 
        }
        if (currentUser && currentUser.id === userToToggle.id && userToToggle.is_active) { 
            toast.error("Cannot deactivate your own account."); 
            return; 
        }
        const newActiveStatus = !userToToggle.is_active;
        const actionText = newActiveStatus ? "activated" : "deactivated";
        try {
            await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: newActiveStatus });
            toast.success(`User "${userToToggle.email}" ${actionText}.`);
            setUsers(prevUsers => prevUsers.map(u => u.id === userToToggle.id ? { ...u, is_active: newActiveStatus } : u));
        } catch (err) { 
            console.error(`Error ${actionText}ing user:`, err); 
            toast.error(err.response?.data?.detail || `Failed to ${actionText} user.`); 
        }
    };
    
    if (authIsLoading || isLoading) {
        return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading users..." size="lg" /></div> );
    }
    if (!isAuthenticated) {
        return <div className="min-h-screen flex flex-col justify-center items-center"><p className="text-red-600">Please log in to view users.</p></div>
    }
    if (error) {
        return <div className="text-center py-10 text-red-500"><p>{error}</p></div>
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Users</h1>
                {/* Create/Import buttons are guarded by the 'isAdmin' check */}
                {isAdmin && (
                    <div className="flex space-x-2">
                        <Link to="/users/new" className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 text-sm">Create New User</Link>
                        <Link to="/users/import" className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 text-sm">Import Users (CSV)</Link>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="py-3 px-6">Name</th>
                            <th scope="col" className="py-3 px-6">Email</th>
                            <th scope="col" className="py-3 px-6">Role</th>
                            <th scope="col" className="py-3 px-6">Status</th>
                            {/* Actions column is guarded by 'isAdmin' */}
                            {isAdmin && <th scope="col" className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(listUser => (
                            <tr key={listUser.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">{listUser.full_name || '-'}</th>
                                <td className="py-4 px-6">{listUser.email}</td>
                                <td className="py-4 px-6">{listUser.role}</td>
                                <td className="py-4 px-6"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{listUser.is_active ? 'Active' : 'Inactive'}</span></td>
                                {/* Action buttons are guarded by 'isAdmin' */}
                                {isAdmin && (
                                    <td className="py-4 px-6 flex items-center space-x-2">
                                        <Link to={`/users/edit/${listUser.id}`} className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline">Edit</Link>
                                        {/* Show button only if it's not the current user AND the target user is NOT a superuser */}
                                        {currentUser && listUser.id !== currentUser.id && !listUser.is_superuser && (
                                            <button onClick={() => handleToggleActiveStatus(listUser)} className={`font-medium hover:underline ${listUser.is_active ? 'text-orange-600' : 'text-green-600'}`}>
                                                {listUser.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserListPage;