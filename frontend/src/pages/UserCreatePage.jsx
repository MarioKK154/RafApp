// frontend/src/pages/UserCreatePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

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

  // Check if current logged-in user is admin
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Redirect if not admin or not authenticated (after auth check)
  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      navigate('/login');
    } else if (!authIsLoading && !isAdmin) {
      setError('You do not have permission to create users.');
      // Optional: redirect non-admins away after a delay or display message permanently
      // navigate('/');
    }
  }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Extra check
    // Basic password validation example (add more complexity as needed)
    if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
    }
    setError('');
    setIsSubmitting(true);

    // Use UserCreateAdmin schema structure for payload
    const dataToSend = {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role,
        is_active: formData.is_active,
        is_superuser: formData.is_superuser,
    };

    try {
      // Call the backend endpoint for admin user creation
      await axiosInstance.post('/users/', dataToSend);
      navigate('/users'); // Navigate to user list on success
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.response?.data?.detail || 'Failed to create user.');
      setIsSubmitting(false); // Re-enable form on error
    }
  };

  // Available roles
  const roles = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

  // Render Logic
  if (authIsLoading) return <p>Loading...</p>;

  // If not admin, show error or redirect (handled by useEffect, but show message if error state set)
  if (!isAdmin) {
     return (
         <div className="container mx-auto p-6 text-center text-red-500">
             {error || 'Access Denied.'} <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link>
         </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New User</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Email */}
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label>
            <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 ..." />
        </div>
         {/* Full Name */}
        <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 ..." />
        </div>
         {/* Password */}
         <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password <span className="text-red-500">*</span></label>
            <input type="password" name="password" id="password" required value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 ..." placeholder="Min 8 characters"/>
         </div>
        {/* Role */}
        <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select name="role" id="role" required value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 ...">
                {roles.map(role => ( <option key={role} value={role}>{role}</option> ))}
            </select>
        </div>
        {/* Is Active */}
        <div className="flex items-center">
            <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="..." />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label>
        </div>
         {/* Is Superuser */}
        <div className="flex items-center">
            <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} className="h-4 w-4 ..." />
            <label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Grants Admin Privileges)</label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/users" className="px-4 py-2 border ...">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserCreatePage;