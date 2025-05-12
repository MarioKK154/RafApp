// frontend/src/pages/UserEditPage.jsx
// ABSOLUTELY FINAL Corrected Version - Strict Formatting, Expanded JSX in ALL returns
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    is_active: true,
    is_superuser: false,
  });
  const [initialUserData, setInitialUserData] = useState(null); // Store fetched user data
  const [isLoadingData, setIsLoadingData] = useState(true); // For fetching user to edit
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchUserData = useCallback(() => {
    if (!authIsLoading && isAuthenticated && isAdmin && userId) {
        setIsLoadingData(true);
        setError('');
        axiosInstance.get(`/users/${userId}`)
        .then(response => {
            const fetchedUser = response.data;
            setInitialUserData(fetchedUser);
            setFormData({
                email: fetchedUser.email ?? '',
                full_name: fetchedUser.full_name ?? '',
                role: fetchedUser.role ?? 'employee',
                is_active: fetchedUser.is_active ?? true,
                is_superuser: fetchedUser.is_superuser ?? false,
            });
        })
        .catch(err => {
            console.error("Error fetching user data:", err);
            const errorMsg = err.response?.status === 404 ? 'User not found.' : 'Failed to load user data.';
            setError(errorMsg);
            toast.error(errorMsg);
        })
        .finally(() => {
            setIsLoadingData(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login', { replace: true });
    } else if (!authIsLoading && !isAdmin) {
        setError('Access Denied. You do not have permission to edit users.');
        setIsLoadingData(false);
    } else if (!userId) { // Ensure userId is present
        setError("User ID is missing from URL.");
        setIsLoadingData(false);
    }
  }, [userId, isAuthenticated, authIsLoading, isAdmin, navigate]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
        toast.error("You do not have permission to save changes.");
        return;
    }
    setError('');
    setIsSubmitting(true);

    const updatePayload = {};
    if (formData.email !== (initialUserData?.email ?? '')) updatePayload.email = formData.email;
    if (formData.full_name !== (initialUserData?.full_name ?? '')) updatePayload.full_name = formData.full_name;
    if (formData.role !== (initialUserData?.role ?? '')) updatePayload.role = formData.role;
    if (formData.is_active !== (initialUserData?.is_active ?? true)) updatePayload.is_active = formData.is_active;
    if (formData.is_superuser !== (initialUserData?.is_superuser ?? false)) updatePayload.is_superuser = formData.is_superuser;


    if (Object.keys(updatePayload).length === 0) {
        toast.info("No changes detected to save.");
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await axiosInstance.put(`/users/${userId}`, updatePayload);
      toast.success(`User "${response.data.email}" updated successfully!`);
      navigate('/users');
    } catch (err) {
      console.error("Error updating user:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update user.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Logic ---

  if (authIsLoading || isLoadingData) {
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400">Loading user details...</p>
        </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>Please log in to continue.</p>
            <Link
                to="/login"
                className="text-blue-500 underline ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Login
            </Link>
        </div>
    );
  }

  if (!isAdmin) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied. You don't have permission to edit users."}</p>
            <Link
                to="/"
                className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
                Go Home
            </Link>
        </div>
     );
  }

  if (error && (!initialUserData || (initialUserData && formData.email === ''))) { // Check if form data not loaded due to fetch error
     return (
         <div className="container mx-auto p-6 text-center text-red-500">
             <p>{error}</p>
             <Link
                to="/users"
                className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
             >
                Back to User List
             </Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Edit User: {initialUserData?.full_name || initialUserData?.email || `ID ${userId}`}
      </h1>

      {error && !error.toLowerCase().includes('not found') && !error.toLowerCase().includes('access denied') && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
          <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
          <select name="role" id="role" required value={formData.role} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70">
              {ROLES_LIST.map(r => (<option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>))}
          </select>
        </div>
        {/* Is Active */}
        <div className="flex items-center">
          <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/>
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label>
        </div>
        {/* Is Superuser */}
        <div className="flex items-center">
          <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/>
          <label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Full Admin Privileges)</label>
        </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link to="/users" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserEditPage;