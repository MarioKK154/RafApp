// frontend/src/pages/UserCreatePage.jsx
// ABSOLUTELY FINAL Corrected Version - Strict Formatting, Expanded JSX in ALL returns
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function UserCreatePage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'employee', // Default role
    is_active: true,
    is_superuser: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';

  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in.");
        navigate('/login', { replace: true });
      } else if (!isAdmin) {
        toast.error("Access Denied: You do not have permission to create users.");
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) { toast.error("No permission."); return; }
    if (formData.password.length < 8) {
        const msg = 'Password must be at least 8 characters long.';
        setError(msg); toast.error(msg);
        return;
    }
    setError(''); setIsSubmitting(true);
    const dataToSend = {
        email: formData.email, full_name: formData.full_name, password: formData.password,
        role: formData.role, is_active: formData.is_active, is_superuser: formData.is_superuser,
    };
    try {
      const response = await axiosInstance.post('/users/', dataToSend);
      toast.success(`User "${response.data.email}" created successfully!`);
      navigate('/users');
    } catch (err) {
      console.error("Error creating user:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create user.';
      setError(errorMsg); toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied. Redirecting..."}</p>
            <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New User</h1>
      {error && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Email */}
        <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label><input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/></div>
        {/* Full Name */}
        <div><label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label><input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/></div>
        {/* Password */}
        <div><label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password <span className="text-red-500">*</span></label><input type="password" name="password" id="password" required value={formData.password} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="Min 8 characters"/></div>
        {/* Role */}
        <div><label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role <span className="text-red-500">*</span></label><select name="role" id="role" required value={formData.role} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70">{ROLES_LIST.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
        {/* Is Active */}
        <div className="flex items-center"><input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/><label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label></div>
        {/* Is Superuser */}
        <div className="flex items-center"><input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/><label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Full Admin Privileges)</label></div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/users" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Creating...' : 'Create User'} </button> </div>
      </form>
    </div>
  );
}
export default UserCreatePage;