// frontend/src/pages/InventoryCreatePage.jsx
// Uncondensed Version: Added local_image_path input
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';


function InventoryCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    quantity_needed: 0,
    unit: '',
    location: '',
    low_stock_threshold: '',
    shop_url_1: '',
    shop_url_2: '',
    shop_url_3: '',
    local_image_path: '',
  });
  const [error, setError] = useState(''); // For form submission errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);

  // Effect for redirecting if not authenticated or not permitted
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in to access this page.");
        navigate('/login', { replace: true });
      } else if (!canManageInventory) {
        toast.error("Access Denied: You do not have permission to add inventory items.");
        navigate('/inventory', { replace: true }); // Or to home
      }
    }
  }, [isAuthenticated, authIsLoading, canManageInventory, navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageInventory) { // Double-check permission
        toast.error("You do not have permission to perform this action.");
        return;
    }
    setError('');
    setIsSubmitting(true);

    const dataToSend = {
      name: formData.name,
      description: formData.description || null,
      quantity: parseFloat(formData.quantity) || 0,
      quantity_needed: parseFloat(formData.quantity_needed) || 0,
      unit: formData.unit || null,
      location: formData.location || null,
      low_stock_threshold: formData.low_stock_threshold === '' || formData.low_stock_threshold === null ? null : parseFloat(formData.low_stock_threshold),
      shop_url_1: formData.shop_url_1 || null,
      shop_url_2: formData.shop_url_2 || null,
      shop_url_3: formData.shop_url_3 || null,
      local_image_path: formData.local_image_path || null,
    };

    try {
      const response = await axiosInstance.post('/inventory/', dataToSend);
      toast.success(`Inventory item "${response.data.name}" created successfully!`);
      navigate('/inventory');
    } catch (err) {
      console.error("Error creating inventory item:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create item. Please check your inputs.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Logic ---

  // Show loading if auth state is still being determined
  if (authIsLoading) {
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading form..." size="lg" /></div> );
  }

  // If not authenticated or not admin/pm, useEffect handles redirection.
  // This return is a fallback or for the brief moment before redirect.
  if (!isAuthenticated || !canManageInventory) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied. Redirecting..."}</p>
            {/* Link might not be reachable if redirect is too fast */}
            <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link>
        </div>
    );
  }

  // Main form content for authorized users
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Add New Inventory Item</h1>

      {/* Display form submission errors if any */}
      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Item Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea name="description" id="description" rows="2" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"></textarea>
        </div>
        {/* Quantity (In Stock) */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity (In Stock)</label>
          <input type="number" name="quantity" id="quantity" step="any" value={formData.quantity} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Quantity Needed */}
        <div>
          <label htmlFor="quantity_needed" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity Needed</label>
          <input type="number" name="quantity_needed" id="quantity_needed" step="any" value={formData.quantity_needed} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit (e.g., pcs, m, kg)</label>
          <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
          <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* Low Stock Threshold */}
        <div>
          <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label>
          <input type="number" name="low_stock_threshold" id="low_stock_threshold" step="any" placeholder="Optional" value={formData.low_stock_threshold} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/>
        </div>
        {/* --- NEW: Local Image Path Input --- */}
        <div>
          <label htmlFor="local_image_path" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Local Image Path (Optional)</label>
          <input
            type="text"
            name="local_image_path"
            id="local_image_path"
            value={formData.local_image_path}
            onChange={handleChange}
            disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            placeholder="e.g., images/item_abc.jpg"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Relative path from a designated static image folder on the server.</p>
        </div>
        {/* Shop URLs */}
        <div>
          <label htmlFor="shop_url_1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 1</label>
          <input type="url" name="shop_url_1" id="shop_url_1" value={formData.shop_url_1} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://..."/>
        </div>
        <div>
          <label htmlFor="shop_url_2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 2</label>
          <input type="url" name="shop_url_2" id="shop_url_2" value={formData.shop_url_2} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://..."/>
        </div>
        <div>
          <label htmlFor="shop_url_3" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 3</label>
          <input type="url" name="shop_url_3" id="shop_url_3" value={formData.shop_url_3} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://..."/>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/inventory" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
             Cancel
           </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InventoryCreatePage;