// frontend/src/pages/TenantEditPage.jsx
// Uncondensed Version: Form for Superuser to edit a Tenant
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function TenantEditPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '', logo_url: '', background_image_url: '',
  });
  const [initialTenantData, setInitialTenantData] = useState(null); // To track changes
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperuser = currentUser && currentUser.is_superuser;

  // Effect for permission check and data fetching
  const fetchTenantData = useCallback(() => {
    if (!authIsLoading && isAuthenticated && isSuperuser && tenantId) {
      setIsLoadingData(true);
      setError('');
      axiosInstance.get(`/tenants/${tenantId}`)
        .then(response => {
          const tenant = response.data;
          setInitialTenantData(tenant);
          setFormData({
            name: tenant.name ?? '',
            logo_url: tenant.logo_url ?? '',
            background_image_url: tenant.background_image_url ?? '',
          });
        })
        .catch(err => {
          console.error("Error fetching tenant:", err);
          const errorMsg = err.response?.status === 404 ? 'Tenant not found.' : 'Failed to load tenant data.';
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !isSuperuser) {
      setError('Access Denied.');
      setIsLoadingData(false);
    } else if (!tenantId) {
        setError("Tenant ID is missing.");
        setIsLoadingData(false);
    }
  }, [tenantId, isAuthenticated, authIsLoading, isSuperuser, navigate]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperuser) { toast.error("No permission."); return; }
    setError('');
    setIsSubmitting(true);

    const updatePayload = {};
    if (formData.name !== initialTenantData.name) updatePayload.name = formData.name;
    if (formData.logo_url !== (initialTenantData.logo_url ?? '')) updatePayload.logo_url = formData.logo_url || null;
    if (formData.background_image_url !== (initialTenantData.background_image_url ?? '')) updatePayload.background_image_url = formData.background_image_url || null;

    if (Object.keys(updatePayload).length === 0) {
        toast.info("No changes detected to save.");
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await axiosInstance.put(`/tenants/${tenantId}`, updatePayload);
      toast.success(`Tenant "${response.data.name}" updated successfully!`);
      navigate('/tenants');
    } catch (err) {
      console.error("Error updating tenant:", err);
      const msg = err.response?.data?.detail || 'Failed to update tenant.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authIsLoading || isLoadingData) {
    return (<div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading tenant data..." size="lg" /></div>);
  }
  if (!isSuperuser || (error && (!initialTenantData || (initialTenantData && !initialTenantData.name)))) {
     return (<div className="container mx-auto p-6 text-center text-red-500">{error || "Access Denied."}<Link to="/tenants" className="text-blue-500 underline ml-2">Back to Tenant List</Link></div>);
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Tenant: {initialTenantData?.name}</h1>
      {error && !error.toLowerCase().includes('not found') && <p className="text-red-500 ...">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Tenant Name */}
        <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-red-500">*</span></label> <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm ..."/> </div>
        {/* Logo URL */}
        <div> <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL (Optional)</label> <input type="url" name="logo_url" id="logo_url" value={formData.logo_url} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border ..."/> </div>
        {/* Background Image URL */}
        <div> <label htmlFor="background_image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Background Image URL (Optional)</label> <input type="url" name="background_image_url" id="background_image_url" value={formData.background_image_url} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border ..."/> </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/tenants" className="px-4 py-2 border ...">Cancel</Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 ...' : ''}`}> {isSubmitting ? 'Saving...' : 'Save Changes'} </button> </div>
      </form>
    </div>
  );
}
export default TenantEditPage;