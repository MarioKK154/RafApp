// frontend/src/pages/UserListPage.jsx
// Uncondensed: Focus on Activate/Deactivate, Modal ready for potential future hard delete
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal'; // Keep for potential future hard delete
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // For potential future hard delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const isManagerOrAdmin = currentUser && ['admin', 'project manager'].includes(currentUser.role);
  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchUsers = useCallback(() => {
    if (!authIsLoading && isAuthenticated && isManagerOrAdmin) {
      setIsLoading(true); setError('');
      axiosInstance.get('/users/')
        .then(response => { setUsers(response.data); })
        .catch(err => { console.error("Error fetching users:", err); setError('Failed to load users.'); toast.error('Failed to load users.');})
        .finally(() => { setIsLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) { navigate('/login', {replace: true}); }
    else if (!authIsLoading && !isManagerOrAdmin) { setIsLoading(false); setError('Permission denied.'); }
  }, [isAuthenticated, authIsLoading, isManagerOrAdmin, navigate]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActiveStatus = async (userToToggle) => {
    if (!isAdmin) { toast.error("No permission."); return; }
    if (currentUser && currentUser.id === userToToggle.id && userToToggle.is_active) { toast.error("Cannot deactivate self."); return; }
    const newActiveStatus = !userToToggle.is_active;
    const actionText = newActiveStatus ? "activate" : "deactivate";
    try {
      await axiosInstance.put(`/users/${userToToggle.id}`, { is_active: newActiveStatus });
      toast.success(`User "${userToToggle.email}" ${actionText}d.`);
      setUsers(prevUsers => prevUsers.map(u => u.id === userToToggle.id ? { ...u, is_active: newActiveStatus } : u));
    } catch (err) { console.error(`Error ${actionText}ing user:`, err); toast.error(err.response?.data?.detail || `Failed to ${actionText} user.`); }
  };

  // Placeholder for hard delete if re-enabled
  // const handleDeleteClick = (userToDel) => { /* ... set userToDelete, setIsDeleteModalOpen(true) ... */ };
  // const confirmDeleteUser = async () => { /* ... API call to DELETE /users/{id}, toasts, fetchUsers ... */ };


  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading users..." size="lg" /></div> );
}
  if (!isAuthenticated) { /* ... not authenticated ... */ }
  if (!isManagerOrAdmin) { /* ... access denied ... */ }
  if (error) { /* ... fetch error ... */ }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Manage Users</h1>
        {isAdmin && ( <Link to="/users/new" className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 text-sm">Create New User</Link> )}
        {isAdmin && (
              <Link
                to="/users/import"
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 text-sm"
              >
                Import Users (CSV)
              </Link>
            )}
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {users.length === 0 && !error ? ( <p>No users found.</p> ) : (
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
                            <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">{listUser.full_name || '-'}</th>
                            <td className="py-4 px-6">{listUser.email}</td>
                            <td className="py-4 px-6">{listUser.employee_id || '-'}</td>
                            <td className="py-4 px-6">{listUser.kennitala || '-'}</td>
                            <td className="py-4 px-6">{listUser.phone_number || '-'}</td>
                            <td className="py-4 px-6">{listUser.location || '-'}</td>
                            <td className="py-4 px-6">{listUser.role}</td>
                            <td className="py-4 px-6"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{listUser.is_active ? 'Active' : 'Inactive'}</span></td>
                            {isAdmin && (
                                <td className="py-4 px-6 flex items-center space-x-2">
                                    <Link to={`/users/edit/${listUser.id}`} className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline">Edit</Link>
                                    {currentUser && listUser.id !== currentUser.id && (
                                        <button onClick={() => handleToggleActiveStatus(listUser)} className={`font-medium hover:underline ${listUser.is_active ? 'text-orange-600 dark:text-orange-500' : 'text-green-600 dark:text-green-500'}`}>
                                            {listUser.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    )}
                                    {/* To enable hard delete with modal:
                                    <button onClick={() => handleDeleteClick(listUser)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                                    */}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
      {/* Modal for hard delete - define confirmDeleteUser and handleDeleteClick if used 
      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }} onConfirm={confirmDeleteUser} title="Confirm User Deletion">
        Are you sure you want to permanently delete user <strong className="font-semibold">"{userToDelete?.email}"</strong>? This action cannot be undone.
      </Modal>
      */}
    </div>
  );
}
export default UserListPage;