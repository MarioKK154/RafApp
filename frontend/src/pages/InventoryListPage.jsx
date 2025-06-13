// frontend/src/pages/InventoryListPage.jsx
// ABSOLUTELY FINAL Meticulously Checked Uncondensed Version
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function InventoryListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate(); // Kept for potential future use or if auth fails
  const [editedNeededQuantities, setEditedNeededQuantities] = useState({});
  const [itemUpdateError, setItemUpdateError] = useState({}); // For inline edit errors
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);
  const canUpdateNeededQty = user && ['admin', 'project manager', 'team leader'].includes(user.role);
  const canViewURLs = user && ['admin', 'project manager'].includes(user.role);

  const fetchItems = useCallback(() => {
    if (authIsLoading) { // Wait for auth check to complete
        setIsLoading(true); // Keep loading if auth is still resolving
        return;
    }
    if (!isAuthenticated) {
        setIsLoading(false);
        setError('You must be logged in to view inventory.');
        // navigate('/login', {replace: true}); // Consider if auto-navigate is desired here
        return;
    }

    setIsLoading(true);
    setError('');
    setItemUpdateError({}); // Clear inline errors on list refresh
    axiosInstance.get('/inventory/')
      .then(response => {
        setItems(response.data);
        const initialEdits = {};
        response.data.forEach(item => {
            initialEdits[item.id] = item.quantity_needed?.toString() ?? '0';
        });
        setEditedNeededQuantities(initialEdits);
      })
      .catch(err => {
        console.error("Error fetching inventory items:", err);
        setError('Failed to load inventory items.');
        toast.error('Failed to load inventory items.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, authIsLoading]); // Removed navigate as it's not strictly needed by fetchItems

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeleteClick = (item) => {
    if (!canManageInventory) {
        toast.error("You don't have permission to delete inventory items.");
        return;
    }
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
        await axiosInstance.delete(`/inventory/${itemToDelete.id}`);
        toast.success(`Item "${itemToDelete.name}" deleted successfully.`);
        fetchItems(); // Refetch items to update the list
    } catch (err) {
        console.error("Error deleting inventory item:", err);
        toast.error(err.response?.data?.detail || 'Failed to delete item.');
    } finally {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    }
  };

  const handleNeededQtyChange = (itemId, value) => {
      setEditedNeededQuantities(prev => ({ ...prev, [itemId]: value }));
      setItemUpdateError(prev => { const newErrors = {...prev}; delete newErrors[itemId]; return newErrors; });
  };

  const handleUpdateNeededQty = async (itemId) => {
      const editedValue = editedNeededQuantities[itemId];
      const newQty = parseFloat(editedValue);
      const currentItem = items.find(item => item.id === itemId);

      if (isNaN(newQty) || newQty < 0) {
          setItemUpdateError(prev => ({...prev, [itemId]: "Invalid qty (>= 0)"}));
          return;
      }
      setItemUpdateError(prev => { const newErrors = {...prev}; delete newErrors[itemId]; return newErrors; });

      try {
          const payload = { quantity_needed: newQty };
          const response = await axiosInstance.put(`/inventory/${itemId}/needed`, payload);
          toast.success(`Needed quantity updated for "${currentItem?.name || 'item'}"!`);
          // Optimistically update local state or refetch
          setItems(prevItems => prevItems.map(item =>
              item.id === itemId ? { ...item, quantity_needed: response.data.quantity_needed } : item
          ));
          setEditedNeededQuantities(prev => ({...prev, [itemId]: response.data.quantity_needed.toString()}));
      } catch (err) {
          console.error(`Error updating needed qty for item ${itemId}:`, err);
          const errorMsg = err.response?.data?.detail || 'Save failed';
          setItemUpdateError(prev => ({...prev, [itemId]: errorMsg }));
          toast.error(`Failed for "${currentItem?.name || 'item'}": ${errorMsg}`);
      }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return (
        <div className="min-h-screen flex justify-center items-center">
            <LoadingSpinner text="Loading inventory..." size="lg"/>
        </div>
    );
  }

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view inventory.'}</p>
            <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
            >
                Go to Login
            </Link>
        </div>
     );
  }

  // If there was an error fetching the list and it's not just loading
  if (error && !isLoading) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error}</p>
            <button onClick={fetchItems} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Try Again
            </button>
        </div>
     );
 }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory</h1>
        {canManageInventory && (
            <Link
                to="/inventory/new"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 text-sm md:text-base"
            >
                Add New Item
            </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No inventory items found. {canManageInventory ? 'Add one!' : ''}</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-2 text-center">Image</th>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">In Stock</th>
                        <th scope="col" className="py-3 px-6">Needed</th>
                        {canUpdateNeededQty && <th scope="col" className="py-3 px-6 min-w-[170px]">Update Needed Qty</th>}
                        <th scope="col" className="py-3 px-6">Unit</th>
                        <th scope="col" className="py-3 px-6">Location</th>
                        <th scope="col" className="py-3 px-6">Description</th>
                        {canViewURLs && <th scope="col" className="py-3 px-6">Shop URLs</th> }
                        {canManageInventory && <th scope="col" className="py-3 px-6">Actions</th> }
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => {
                        const imageUrl = item.local_image_path
                            ? `${API_BASE_URL}/static/${item.local_image_path}`
                            : "https://via.placeholder.com/80x80.png?text=No+Image"; // Placeholder
                        
                        // Corrected console.log using template literals
                        console.log(`Item: ${item.name}, DB Path: '${item.local_image_path}', Constructed URL: '${imageUrl}'`);

                        return (
                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 align-top">
                                <td className="p-2 text-center">
                                    <img
                                        src={imageUrl}
                                        alt={item.name || 'Inventory item'}
                                        className="h-14 w-14 object-cover rounded mx-auto shadow" // Adjusted size
                                        onError={(e) => {
                                            e.target.onerror = null; // Prevent infinite loop if placeholder also fails
                                            e.target.src = 'https://via.placeholder.com/80x80.png?text=Error';
                                            e.target.alt = 'Error loading image';
                                        }}
                                        loading="lazy"
                                    />
                                </td>
                                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    {item.name}
                                </th>
                                <td className="py-4 px-6">{item.quantity}</td>
                                <td className="py-4 px-6">{item.quantity_needed}</td>
                                {canUpdateNeededQty && (
                                    <td className="py-4 px-6">
                                        <div className="flex items-start space-x-1">
                                            <input
                                                type="number"
                                                step="any"
                                                value={editedNeededQuantities[item.id] ?? ''}
                                                onChange={(e) => handleNeededQtyChange(item.id, e.target.value)}
                                                className={`w-20 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${itemUpdateError[item.id] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                                aria-label={`Needed quantity for ${item.name}`}
                                            />
                                            <button
                                                onClick={() => handleUpdateNeededQty(item.id)}
                                                className="px-2 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs disabled:opacity-50"
                                                disabled={editedNeededQuantities[item.id] === (item.quantity_needed?.toString() ?? '0')}
                                            >
                                                Save
                                            </button>
                                        </div>
                                         {itemUpdateError[item.id] && <p className="text-xs text-red-500 mt-1">{itemUpdateError[item.id]}</p>}
                                    </td>
                                )}
                                <td className="py-4 px-6">{item.unit || '-'}</td>
                                <td className="py-4 px-6">{item.location || '-'}</td>
                                <td className="py-4 px-6 max-w-xs whitespace-pre-wrap break-words" title={item.description}>{item.description || '-'}</td>
                                {canViewURLs && (
                                    <td className="py-4 px-6 text-xs">
                                        {item.shop_url_1 && <div><a href={item.shop_url_1} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Link 1</a></div>}
                                        {item.shop_url_2 && <div><a href={item.shop_url_2} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Link 2</a></div>}
                                        {item.shop_url_3 && <div><a href={item.shop_url_3} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">Link 3</a></div>}
                                        {!item.shop_url_1 && !item.shop_url_2 && !item.shop_url_3 && <span className="text-gray-400 dark:text-gray-500">-</span>}
                                    </td>
                                )}
                                {canManageInventory && (
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-2 items-start">
                                            <Link to={`/inventory/edit/${item.id}`} className="font-medium text-yellow-500 dark:text-yellow-400 hover:underline whitespace-nowrap">Edit</Link>
                                            <button onClick={() => handleDeleteClick(item)} className="font-medium text-red-600 dark:text-red-500 hover:underline whitespace-nowrap">Delete</button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}
       <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={confirmDeleteItem}
        title="Confirm Item Deletion"
      >
        Are you sure you want to delete the inventory item:
        <strong className="font-semibold block mt-1"> "{itemToDelete?.name}"</strong>?
      </Modal>
    </div>
  );
}

export default InventoryListPage;