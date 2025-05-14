// frontend/src/pages/UserListPage.jsx
// Uncondensed Version: Changed Delete to Activate/Deactivate (Soft Delete)
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
// Modal is removed for this soft delete approach, can be re-added for confirmation if desired
// import Modal from '../components/Modal';
import { toast } from 'react-toastify';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // State for delete modal is removed for now, can be added back for deactivate confirmation

  const isManagerOrAdmin = currentUser && ['admin', 'project manager'].includes(currentUser.role);
  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchUsers = useCallback(() => {
    if (!authIsLoading && isAuthenticated && isManagerOrAdmin) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/users/')
        .then(response => {
          setUsers(response.data);
        })
        .catch(err => {
          console.error("Error fetching users:", err);
          const errorMsg = err.response?.data?.detail || 'Failed to load users.';
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !isManagerOrAdmin) {
      setIsLoading(false);
      setError('You do not have permission to view this page.');
    }
  }, [isAuthenticated, authIsLoading, isManagerOrAdmin, navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- NEW: Handle Activate/Deactivate User Status ---
  const handleToggleActiveStatus = async (userToToggle) => {
    if (!isAdmin) {
      toast.error("You don't have permission to change user status.");
      return;
    }
    if (currentUser && currentUser.id === userToToggle.id && userToToggle.is_active) {
      toast.error("You cannot deactivate your own account through this interface.");
      return;
    }

    const newActiveStatus = !userToToggle.is_active;
    const actionText = newActiveStatus ? "activate" : "deactivate";

    // Optional: Add a confirmation modal here if desired
    // if (!window.confirm(`Are you sure you want to <span class="math-inline">\{actionText\} user "</span>{userToToggle.email}"?`)) {
    //   return;
    // }

    try {
      await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: newActiveStatus });
      toast.success(`User "${userToToggle.email}" ${actionText}d successfully.`);
      // Update the user in the local list
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userToToggle.id ? { ...u, is_active: newActiveStatus } : u
        )
      );
      // Or refetch all users: fetchUsers();
    } catch (err) {
      console.error(`Error ${actionText}ing user:`, err);
      const errorMsg = err.response?.data?.detail || `Failed to ${actionText} user.`;
      toast.error(errorMsg);
    }
  };
  // --- END NEW FUNCTION ---

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading users...</p></div> );
  }
  if (!isAuthenticated) {
    return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">Please log in.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link></div> );
  }
  if (!isManagerOrAdmin) {
    return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">{error || 'Access Denied.'}</p><Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Home</Link></div> );
  }
  if (error) { // General fetch error for user list
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>{error}</p></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Manage Users</h1>
        {isAdmin && (
          <Link
            to="/users/new"
            className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 text-sm md:text-base"
          >
            Create New User
          </Link>
        )}
      </div>

      {users.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">ID</th>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">Email</th>
                        <th scope="col" className="py-3 px-6">Employee ID</th>
                        <th scope="col" className="py-3 px-6">Kennitala</th>
                        <th scope="col" className="py-3 px-6">Phone</th>
                        <th scope="col" className="py-3 px-6">Location</th>
                        <th scope="col" className="py-3 px-6">Role</th>
                        <th scope="col" className="py-3 px-6">Status</th>
                        {isAdmin && <th scope="col" className="py-3 px-6">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {users.map(listUser => (
                        <tr key={listUser.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="py-4 px-6">{listUser.id}</td>
                            <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                {listUser.full_name || '-'}
                            </th>
                            <td className="py-4 px-6">{listUser.email}</td>
                            <td className="py-4 px-6">{listUser.employee_id || '-'}</td>
                            <td className="py-4 px-6">{listUser.kennitala || '-'}</td>
                            <td className="py-4 px-6">{listUser.phone_number || '-'}</td>
                            <td className="py-4 px-6">{listUser.location || '-'}</td>
                            <td className="py-4 px-6">{listUser.role}</td>
                            <td className="py-4 px-6">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                    {listUser.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            {isAdmin && (
                                <td className="py-4 px-6 flex items-center space-x-2"> {/* Changed to items-center for better alignment */}
                                    <Link
                                        to={`/users/edit/${listUser.id}`}
                                        className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                    {/* --- MODIFIED: Activate/Deactivate Button --- */}
                                    {listUser.id !== currentUser.id && ( // Prevent deactivating self via this button
                                        <button
                                            onClick={() => handleToggleActiveStatus(listUser)}
                                            className={`font-medium hover:underline ${listUser.is_active ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}
                                        >
                                            {listUser.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    )}
                                    {/* The hard DELETE endpoint is still available via API for admins if truly needed */}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      {/* Delete Modal is removed for now, can be re-added for deactivation confirmation */}
    </div>
  );
}
export default UserListPage;