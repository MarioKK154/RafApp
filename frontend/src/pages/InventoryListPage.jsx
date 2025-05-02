// frontend/src/pages/InventoryListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function InventoryListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Function to fetch items
  const fetchItems = () => {
    setIsLoading(true);
    setError('');
    axiosInstance.get('/inventory/')
      .then(response => {
        setItems(response.data);
      })
      .catch(err => {
        console.error("Error fetching inventory items:", err);
        setError('Failed to load inventory items.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Initial fetch
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      fetchItems();
    } else if (!authIsLoading && !isAuthenticated) {
      setIsLoading(false);
      setError('You must be logged in to view inventory.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading]);

  // Handle Item Deletion
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) {
      return;
    }
    try {
      setError('');
      await axiosInstance.delete(`/inventory/${itemId}`);
      setItems(currentItems => currentItems.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Error deleting inventory item:", err);
      setError('Failed to delete item.');
    }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><p>Loading inventory...</p></div>;
  }

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view inventory.'}</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory</h1>
        <Link
          to="/inventory/new"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base"
        >
          Add New Item
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      {items.length === 0 && !error ? (
        <p className="text-gray-600 dark:text-gray-400">No inventory items found. Add one!</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">Quantity</th>
                        <th scope="col" className="py-3 px-6">Unit</th>
                        <th scope="col" className="py-3 px-6">Location</th>
                        <th scope="col" className="py-3 px-6">Description</th>
                        <th scope="col" className="py-3 px-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                {item.name}
                            </th>
                            <td className="py-4 px-6">{item.quantity}</td>
                            <td className="py-4 px-6">{item.unit || '-'}</td>
                            <td className="py-4 px-6">{item.location || '-'}</td>
                            <td className="py-4 px-6">{item.description || '-'}</td>
                            <td className="py-4 px-6 flex space-x-2">
                                <Link
                                    to={`/inventory/edit/${item.id}`}
                                    className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(item.id)}
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
    </div>
  );
}

export default InventoryListPage;