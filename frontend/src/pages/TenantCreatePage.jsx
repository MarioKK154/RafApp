// frontend/src/pages/TenantCreatePage.jsx
// Uncondensed Version: Form for Superuser to create a new Tenant
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function TenantCreatePage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    background_image_url: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperuser = currentUser && currentUser.is_superuser;

  // Effect for permission check and redirect
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in as a Superuser.");
        navigate('/login', { replace: true });
      } else if (!isSuperuser) {
        toast.error("Access Denied: This page is for Superusers only.");
        navigate('/', { replace: true }); // Redirect to home
      }
    }
  }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperuser) {
      toast.error("Unauthorized action.");
      return;
    }
    setError('');
    setIsSubmitting(true);

    const dataToSend = {
        name: formData.name,
        logo_url: formData.logo_url || null,
        background_image_url: formData.background_image_url || null,
    };

    try {
      const response = await axiosInstance.post('/tenants/', dataToSend);
      toast.success(`Tenant "${response.data.name}" created successfully!`);
      navigate('/tenants'); // Navigate to tenant list on success
    } catch (err) {
      console.error("Error creating tenant:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create tenant. Please check your inputs.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authIsLoading) {
    return (<div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Verifying permissions..." size="lg" /></div>);
  }

  if (!isAuthenticated || !isSuperuser) {
    return (<div className="container mx-auto p-6 text-center text-red-500"><p>{error || "Access Denied. Redirecting..."}</p></div>);
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Tenant</h1>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Tenant Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-red-500">*</span></label>
          <input
            type="text" name="name" id="name" required
            value={formData.name} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL (Optional)</label>
          <input
            type="url" name="logo_url" id="logo_url"
            value={formData.logo_url} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            placeholder="https://example.com/logo.png"
          />
        </div>

        {/* Background Image URL */}
        <div>
          <label htmlFor="background_image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Background Image URL (Optional)</label>
          <input
            type="url" name="background_image_url" id="background_image_url"
            value={formData.background_image_url} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            placeholder="https://example.com/background.jpg"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/tenants" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
             Cancel
           </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TenantCreatePage;