// frontend/src/pages/UserCreatePage.jsx
// Uncondensed Version: Added new user fields, role mandatory
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// Updated roles list - "employee" removed
const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician'];

function UserCreatePage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    employee_id: '', // New
    kennitala: '',   // New
    phone_number: '',// New
    location: '',    // New
    role: ROLES_LIST[0], // Default to the first role in the list (e.g., admin)
    is_active: true,
    is_superuser: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';

  useEffect(() => { /* ... (useEffect for redirect as before) ... */
    if (!authIsLoading) {
      if (!isAuthenticated) { toast.error("Must be logged in."); navigate('/login', { replace: true }); }
      else if (!isAdmin) { toast.error("Access Denied."); navigate('/', { replace: true }); }
    }
  }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

  const handleChange = (e) => { /* ... (handleChange as before) ... */
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value, }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) { toast.error("No permission."); return; }
    if (formData.password.length < 8) { toast.error('Password: Min 8 characters.'); return; }
    if (!formData.role) { toast.error('Role is required.'); return; } // Ensure role is selected

    setError(''); setIsSubmitting(true);
    const dataToSend = {
        email: formData.email,
        full_name: formData.full_name || null,
        password: formData.password,
        employee_id: formData.employee_id || null,
        kennitala: formData.kennitala || null,
        phone_number: formData.phone_number || null,
        location: formData.location || null,
        role: formData.role, // Now mandatory
        is_active: formData.is_active,
        is_superuser: formData.is_superuser,
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

  if (authIsLoading) {
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading form..." size="lg" /></div> );
  }
  if (!isAuthenticated || !isAdmin) { /* ... access denied or redirecting ... */ }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New User</h1>
      {error && <p className="text-red-500 ...">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Email, Full Name, Password inputs (as before) */}
        <div><label htmlFor="email">Email *</label><input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={isSubmitting} className="mt-1 ..."/></div>
        <div><label htmlFor="full_name">Full Name</label><input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmitting} className="mt-1 ..."/></div>
        <div><label htmlFor="password">Password *</label><input type="password" name="password" required value={formData.password} onChange={handleChange} disabled={isSubmitting} className="mt-1 ..." placeholder="Min 8 characters"/></div>

        {/* --- NEW INPUT FIELDS --- */}
        <div><label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label><input type="text" name="employee_id" id="employee_id" value={formData.employee_id} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm ... disabled:opacity-70"/></div>
        <div><label htmlFor="kennitala" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kennitala</label><input type="text" name="kennitala" id="kennitala" value={formData.kennitala} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/></div>
        <div><label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label><input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/></div>
        <div><label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label><input type="text" name="location" id="location" value={formData.location} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/></div>
        {/* --- END NEW INPUT FIELDS --- */}

        <div><label htmlFor="role" className="block ...">Role <span className="text-red-500">*</span></label><select name="role" id="role" required value={formData.role} onChange={handleChange} disabled={isSubmitting} className="mt-1 ...">{ROLES_LIST.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
        <div className="flex items-center"><input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 ..."/><label htmlFor="is_active" className="ml-2 ...">Active User</label></div>
        <div className="flex items-center"><input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmitting} className="h-4 w-4 ..."/><label htmlFor="is_superuser" className="ml-2 ...">Superuser</label></div>
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/users" className="px-4 py-2 border ...">Cancel</Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 ...' : ''}`}> {isSubmitting ? 'Creating...' : 'Create User'} </button> </div>
      </form>
    </div>
  );
}
export default UserCreatePage;