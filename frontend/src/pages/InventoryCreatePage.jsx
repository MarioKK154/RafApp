// frontend/src/pages/InventoryCreatePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function InventoryCreatePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit: '',
    location: '',
    low_stock_threshold: '', // Keep as string initially, convert on submit
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      // Use valueAsNumber for number inputs if supported, otherwise parse manually
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Prepare data, converting threshold to float or null
    const dataToSend = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0, // Ensure quantity is number
      low_stock_threshold: formData.low_stock_threshold ? parseFloat(formData.low_stock_threshold) : null,
    };

    try {
      await axiosInstance.post('/inventory/', dataToSend);
      navigate('/inventory'); // Navigate back to inventory list
    } catch (err) {
      console.error("Error creating inventory item:", err);
      setError(err.response?.data?.detail || 'Failed to create item.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading) return <p>Loading...</p>;
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Add New Inventory Item</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Item Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name <span className="text-red-500">*</span></label>
          <input
            type="text" name="name" id="name" required
            value={formData.name} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            name="description" id="description" rows="2"
            value={formData.description} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>

         {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
          <input
            type="number" name="quantity" id="quantity" step="any" // Allow decimals
            value={formData.quantity} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

         {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit (e.g., pcs, m, kg)</label>
          <input
            type="text" name="unit" id="unit"
            value={formData.unit} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
          <input
            type="text" name="location" id="location"
            value={formData.location} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label>
          <input
            type="number" name="low_stock_threshold" id="low_stock_threshold" step="any"
            placeholder="Optional: Notify below this quantity"
            value={formData.low_stock_threshold} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
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
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InventoryCreatePage;