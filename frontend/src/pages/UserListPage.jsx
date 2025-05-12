// frontend/src/pages/UserListPage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Determine roles for UI rendering
  const isManagerOrAdmin = currentUser && ['admin', 'project manager'].includes(currentUser.role);
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Fetch users function
  const fetchUsers = useCallback(() => {
    // Only fetch if user is Manager or Admin and auth check is done
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
      // Redirect to login if not authenticated
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !isManagerOrAdmin) {
        // If logged in but not Manager/Admin, set error
        setIsLoading(false); // Stop loading indicator
        setError('You do not have permission to view this page.');
    }
  }, [isAuthenticated, authIsLoading, isManagerOrAdmin, navigate]); // Added navigate

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Depend on the memoized fetchUsers

  // Handle Opening Delete Modal
  const handleDeleteClick = (userToDel) => {
    if (!isAdmin) {
        toast.error("You don't have permission to delete users.");
        return;
    }
    // Prevent admin from deleting themselves as an extra precaution
    if (currentUser && currentUser.id === userToDel.id) {
        toast.error("You cannot delete your own account via this interface.");
        return;
    }
    setUserToDelete(userToDel);
    setIsDeleteModalOpen(true);
  };

  // Actual Delete Action from Modal
  const confirmDeleteUser = async () => {
    if (!userToDelete || !isAdmin) return;
    try {
        // NOTE: Backend DELETE /users/{user_id} endpoint needs to be implemented
        // For now, this will likely fail if the endpoint doesn't exist.
        await axiosInstance.delete(`/users/${userToDelete.id}`);
        toast.success(`User "${userToDelete.email}" deleted successfully.`);
        fetchUsers(); // Refetch user list
    } catch (err) {
        console.error("Error deleting user:", err);
        const errorMsg = err.response?.data?.detail || 'Failed to delete user. (Ensure backend endpoint exists)';
        setError(errorMsg); // Set list-level error
        toast.error(errorMsg);
    } finally {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    }
  };

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading users...</p></div> );
  }

  if (!isAuthenticated) { // Should be redirected by useEffect
    return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">Please log in.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link></div> );
  }

  // If user is authenticated but doesn't have permission
  if (!isManagerOrAdmin) {
    return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">{error || 'Access Denied.'}</p><Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Home</Link></div> );
  }

  // If there was a fetch error (and not an access denied handled above)
  if (error) {
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
                            <td className="py-4 px-6">{listUser.role}</td>
                            <td className="py-4 px-6">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                    {listUser.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            {isAdmin && (
                                <td className="py-4 px-6 flex space-x-2">
                                    <Link
                                        to={`/users/edit/${listUser.id}`}
                                        className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline"
                                    >
                                        Edit
                                    </Link>
                                    {/* Delete button for Admin */}
                                    <button
                                        onClick={() => handleDeleteClick(listUser)}
                                        className="font-medium text-red-600 dark:text-red-500 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
        onConfirm={confirmDeleteUser}
        title="Confirm User Deletion"
      >
        Are you sure you want to delete the user
        <strong className="font-semibold"> "{userToDelete?.email}"</strong>?
        This action cannot be undone.
      </Modal>
    </div>
  );
}
export default UserListPage;