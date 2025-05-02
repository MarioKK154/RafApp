// frontend/src/pages/InventoryEditPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function InventoryEditPage() {
  const { itemId } = useParams(); // Get item ID from URL
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit: '',
    location: '',
    low_stock_threshold: '',
  });
  const [isLoading, setIsLoading] = useState(true); // Loading item data
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch item data
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && itemId) {
      setIsLoading(true);
      setError('');
      axiosInstance.get(`/inventory/${itemId}`)
        .then(response => {
          const item = response.data;
          setFormData({
            name: item.name || '',
            description: item.description || '',
            // Ensure numbers are numbers, handle nulls for optional fields
            quantity: item.quantity ?? 0,
            unit: item.unit || '',
            location: item.location || '',
            low_stock_threshold: item.low_stock_threshold ?? '', // Keep as string for input, convert on submit
          });
        })
        .catch(err => {
          console.error("Error fetching inventory item data:", err);
          setError(err.response?.status === 404 ? 'Item not found.' : 'Failed to load item data.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [itemId, isAuthenticated, authIsLoading, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? parseFloat(value) : value, // Use parseFloat for number inputs
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
        quantity: parseFloat(formData.quantity) || 0, // Ensure number
        low_stock_threshold: formData.low_stock_threshold ? parseFloat(formData.low_stock_threshold) : null,
    };

    try {
      await axiosInstance.put(`/inventory/${itemId}`, dataToSend);
      navigate('/inventory'); // Navigate back to inventory list
    } catch (err) {
      console.error("Error updating inventory item:", err);
      setError(err.response?.data?.detail || 'Failed to update item.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading || isLoading) return <p>Loading item details...</p>;

  if (error && error.includes('not found')) {
     return <div className="container mx-auto p-6 text-red-500">{error} <Link to="/inventory" className="text-blue-500 underline">Go Back</Link></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Inventory Item</h1>

      {error && !error.includes('not found') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

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
            type="number" name="quantity" id="quantity" step="any"
            value={formData.quantity} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

         {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InventoryEditPage;