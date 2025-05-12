// frontend/src/pages/InventoryCreatePage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function InventoryCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    quantity_needed: 0, // Initialize
    unit: '',
    location: '',
    low_stock_threshold: '', // Keep as string for input, parse on submit
    shop_url_1: '',
    shop_url_2: '',
    shop_url_3: '',
  });
  const [error, setError] = useState(''); // For form submission errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role check for managing inventory (Admin/PM)
  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);

  // Effect for redirecting if not authenticated or not permitted (after auth check)
  useEffect(() => {
    if (!authIsLoading) { // Only run after auth status is resolved
      if (!isAuthenticated) {
        toast.error("You must be logged in to add inventory items.");
        navigate('/login', { replace: true });
      } else if (!canManageInventory) {
        toast.error("You don't have permission to add inventory items.");
        navigate('/inventory', { replace: true }); // Or home
      }
    }
  }, [isAuthenticated, authIsLoading, canManageInventory, navigate]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      // Handle number inputs carefully, allow empty string for optional numbers
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageInventory) { toast.error("No permission."); return; }
    setError('');
    setIsSubmitting(true);

    const dataToSend = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      quantity_needed: parseFloat(formData.quantity_needed) || 0,
      low_stock_threshold: formData.low_stock_threshold === '' ? null : parseFloat(formData.low_stock_threshold),
      // Ensure URLs are empty strings if not provided, or null if backend prefers
      shop_url_1: formData.shop_url_1 || null,
      shop_url_2: formData.shop_url_2 || null,
      shop_url_3: formData.shop_url_3 || null,
    };

    try {
      const response = await axiosInstance.post('/inventory/', dataToSend);
      toast.success(`Inventory item "${response.data.name}" created successfully!`);
      navigate('/inventory');
    } catch (err) {
      console.error("Error creating inventory item:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create item.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl ...">Loading...</p></div> );
  }
  // If not admin/pm and auth check is done, user will be redirected by useEffect.
  // Display a message or null if error is already set by permission check.
  if (!isAuthenticated || !canManageInventory) {
    return ( <div className="container mx-auto p-6 text-center text-red-500">{error || "Access Denied. Redirecting..."}<Link to="/" className="text-blue-500 underline ml-2">Go Home</Link></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Add New Inventory Item</h1>
      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Item Name */}
        <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name <span className="text-red-500">*</span></label> <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm ... disabled:opacity-70"/> </div>
        {/* Description */}
        <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> <textarea name="description" id="description" rows="2" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"></textarea> </div>
        {/* Quantity (In Stock) */}
        <div> <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity (In Stock)</label> <input type="number" name="quantity" id="quantity" step="any" value={formData.quantity} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/> </div>
        {/* Quantity Needed */}
        <div> <label htmlFor="quantity_needed" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity Needed</label> <input type="number" name="quantity_needed" id="quantity_needed" step="any" value={formData.quantity_needed} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/> </div>
        {/* Unit */}
        <div> <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit (e.g., pcs, m, kg)</label> <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/> </div>
        {/* Location */}
        <div> <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label> <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/> </div>
        {/* Low Stock Threshold */}
        <div> <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label> <input type="number" name="low_stock_threshold" id="low_stock_threshold" step="any" placeholder="Optional" value={formData.low_stock_threshold} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70"/> </div>
        {/* Shop URLs */}
        <div> <label htmlFor="shop_url_1" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 1</label> <input type="url" name="shop_url_1" id="shop_url_1" value={formData.shop_url_1} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70" placeholder="https://..."/> </div>
        <div> <label htmlFor="shop_url_2" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 2</label> <input type="url" name="shop_url_2" id="shop_url_2" value={formData.shop_url_2} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70" placeholder="https://..."/> </div>
        <div> <label htmlFor="shop_url_3" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop URL 3</label> <input type="url" name="shop_url_3" id="shop_url_3" value={formData.shop_url_3} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ... disabled:opacity-70" placeholder="https://..."/> </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/inventory" className="px-4 py-2 border border-gray-300 ...">Cancel</Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Adding...' : 'Add Item'} </button> </div>
      </form>
    </div>
  );
}
export default InventoryCreatePage;