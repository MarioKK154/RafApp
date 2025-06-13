// frontend/src/pages/InventoryEditPage.jsx
// Uncondensed Version: Added local_image_path input
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date for input:", dateString, e);
        return '';
    }
};

function InventoryEditPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '', description: '', quantity: 0, quantity_needed: 0, unit: '',
    location: '', low_stock_threshold: '', shop_url_1: '', shop_url_2: '', shop_url_3: '', local_image_path: '',
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);

  const fetchItemData = useCallback(() => {
    if (!authIsLoading && isAuthenticated && itemId) {
      if (!canManageInventory) { // Check permission before fetching
        setError('You do not have permission to edit inventory items.');
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      setError('');
      axiosInstance.get(`/inventory/${itemId}`)
        .then(response => {
          const item = response.data;
          setFormData({
            name: item.name ?? '', description: item.description ?? '',
            quantity: item.quantity ?? 0, quantity_needed: item.quantity_needed ?? 0,
            unit: item.unit ?? '', location: item.location ?? '',
            low_stock_threshold: item.low_stock_threshold ?? '',
            shop_url_1: item.shop_url_1 ?? '', shop_url_2: item.shop_url_2 ?? '', shop_url_3: item.shop_url_3 ?? '', local_image_path: item.local_image_path ?? '',
          });
        })
        .catch(err => {
          console.error("Error fetching inventory item data:", err);
          const errorMsg = err.response?.status === 404 ? 'Inventory item not found.' : 'Failed to load item data.';
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !itemId) {
        setError("Item ID is missing.");
        setIsLoadingData(false);
    }
  }, [itemId, isAuthenticated, authIsLoading, canManageInventory, navigate]);

  useEffect(() => {
    fetchItemData();
  }, [fetchItemData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageInventory) {
        toast.error("You don't have permission to edit items.");
        return;
    }
    setError('');
    setIsSubmitting(true);
    const dataToSend = {
      name: formData.name, // Name is required by schema
      description: formData.description || null,
      quantity: parseFloat(formData.quantity) || 0,
      quantity_needed: parseFloat(formData.quantity_needed) || 0,
      unit: formData.unit || null,
      location: formData.location || null,
      low_stock_threshold: formData.low_stock_threshold === '' || formData.low_stock_threshold === null ? null : parseFloat(formData.low_stock_threshold),
      shop_url_1: formData.shop_url_1 || null,
      shop_url_2: formData.shop_url_2 || null,
      shop_url_3: formData.shop_url_3 || null,
      local_image_path: formData.local_image_path || null, // Includes the current formData value
    };

    try {
      const response = await axiosInstance.put(`/inventory/${itemId}`, dataToSend);
      toast.success(`Item "${response.data.name}" updated successfully!`);
      navigate('/inventory');
    } catch (err) {
      console.error("Error updating item:", err);
      const msg = err.response?.data?.detail || 'Failed to update item. Please check your inputs.';
      setError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingData) {
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading item details..." size="lg" /></div> );
  }

  if (!isAuthenticated) {
    // This case should ideally be handled by redirection in useEffect
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-red-600 mb-4">Please log in to continue.</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link>
        </div>
    );
  }

  if (!canManageInventory) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied. You don't have permission to edit inventory items."}</p>
            <Link to="/inventory" className="text-blue-500 underline ml-2">Back to Inventory</Link>
        </div>
     );
  }

  if (error && (error.includes('not found') || error.includes('Failed to load'))) {
     return (
         <div className="container mx-auto p-6 text-center text-red-500">
             {error}
             <Link to="/inventory" className="text-blue-500 underline ml-2">Back to Inventory</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Inventory Item: {formData.name || "Loading..."}</h1>

      {error && !error.toLowerCase().includes('not found') && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
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
        {/* Quantity */}
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
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
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
          <input type="number" name="low_stock_threshold" id="low_stock_threshold" step="any" value={formData.low_stock_threshold} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="Optional"/>
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
          <input type="url" name="shop_url_1" id="shop_url_1" value={formData.shop_url_1} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://example.com/shop1"/>
        </div>
        <div>
          <label htmlFor="shop_url_2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 2</label>
          <input type="url" name="shop_url_2" id="shop_url_2" value={formData.shop_url_2} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://example.com/shop2"/>
        </div>
        <div>
          <label htmlFor="shop_url_3" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 3</label>
          <input type="url" name="shop_url_3" id="shop_url_3" value={formData.shop_url_3} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="https://example.com/shop3"/>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link to="/inventory" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InventoryEditPage;