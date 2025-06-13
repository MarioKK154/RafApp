// frontend/src/pages/TenantListPage.jsx
// Uncondensed Version: UI for Superusers to manage Tenants
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function TenantListPage() {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);

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

  // Fetch tenants function
  const fetchTenants = useCallback(() => {
    if (isSuperuser) { // Only fetch if the user is a superuser
      setIsLoading(true);
      setError('');
      axiosInstance.get('/tenants/')
        .then(response => {
          setTenants(response.data);
        })
        .catch(err => {
          console.error("Error fetching tenants:", err);
          const errorMsg = err.response?.data?.detail || 'Failed to load tenants.';
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isSuperuser]); // Dependency on isSuperuser

  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
        fetchTenants();
    }
  }, [fetchTenants, authIsLoading, isAuthenticated]);

  // Delete logic for tenants
  const handleDeleteClick = (tenant) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      // This will fail if users or projects are still linked, as per our backend logic
      await axiosInstance.delete(`/tenants/${tenantToDelete.id}`);
      toast.success(`Tenant "${tenantToDelete.name}" deleted successfully.`);
      fetchTenants(); // Refresh the list
    } catch (err) {
      console.error("Error deleting tenant:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to delete tenant.';
      toast.error(errorMsg);
    } finally {
      setIsDeleteModalOpen(false);
      setTenantToDelete(null);
    }
  };

  // --- Render Logic ---
  if (authIsLoading || (!isAuthenticated && !error) ) {
    return (<div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Verifying permissions..." size="lg" /></div>);
  }

  if (!isSuperuser) {
    return (<div className="container mx-auto p-6 text-center text-red-500"><p>{error || "Access Denied. Redirecting..."}</p></div>);
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Manage Tenants</h1>
        <Link
            to="/tenants/new" // We will create this page next
            className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 text-sm md:text-base"
        >
            Create New Tenant
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading tenants..." />
      ) : error ? (
        <div className="text-center py-10 text-red-500"><p>{error}</p></div>
      ) : tenants.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No tenants found. Create the first one!</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">ID</th>
                        <th scope="col" className="py-3 px-6">Company Name</th>
                        <th scope="col" className="py-3 px-6">Logo URL</th>
                        <th scope="col" className="py-3 px-6">Background URL</th>
                        <th scope="col" className="py-3 px-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tenants.map(tenant => (
                        <tr key={tenant.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">{tenant.id}</td>
                            <td className="py-4 px-6">{tenant.name}</td>
                            <td className="py-4 px-6 text-xs truncate max-w-xs" title={tenant.logo_url}>{tenant.logo_url || '-'}</td>
                            <td className="py-4 px-6 text-xs truncate max-w-xs" title={tenant.background_image_url}>{tenant.background_image_url || '-'}</td>
                            <td className="py-4 px-6 flex space-x-2">
                                <Link
                                    to={`/tenants/edit/${tenant.id}`} // We will create this page next
                                    className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDeleteClick(tenant)}
                                    className="font-medium text-red-600 dark:text-red-500 hover:underline"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setTenantToDelete(null); }}
        onConfirm={confirmDeleteTenant}
        title="Confirm Tenant Deletion"
      >
        Are you sure you want to permanently delete the tenant
        <strong className="font-semibold block mt-1"> "{tenantToDelete?.name}"</strong>?
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">WARNING: This will fail if there are any users or projects still associated with this tenant.</p>
      </Modal>
    </div>
  );
}

export default TenantListPage;