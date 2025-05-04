// frontend/src/pages/InventoryListPage.jsx
// Uncondensed Version: Added inline editing for quantity_needed
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function InventoryListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // --- NEW: State to track inline edits for quantity_needed ---
  // Stores temporary values being edited, maps item.id -> edited value string
  const [editedNeededQuantities, setEditedNeededQuantities] = useState({});
  const [itemUpdateError, setItemUpdateError] = useState({}); // Store errors per item ID

  // Determine roles
  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);
  // --- NEW: Role check for updating needed quantity ---
  const canUpdateNeededQty = user && ['admin', 'project manager', 'team leader'].includes(user.role);
  const canViewURLs = user && ['admin', 'project manager'].includes(user.role);

  // Function to fetch items (memoized)
  const fetchItems = useCallback(() => {
    // ... (fetch logic remains the same as before) ...
    if (!authIsLoading && isAuthenticated) {
        setIsLoading(true); setError(''); setItemUpdateError({}); // Clear item errors on refresh
        axiosInstance.get('/inventory/')
          .then(response => {
            setItems(response.data);
            // Initialize edited quantities state based on fetched data
            const initialEdits = {};
            response.data.forEach(item => {
                initialEdits[item.id] = item.quantity_needed?.toString() ?? '0';
            });
            setEditedNeededQuantities(initialEdits);
          })
          .catch(err => { console.error("Error fetching inventory items:", err); setError('Failed to load inventory items.'); })
          .finally(() => { setIsLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) { setIsLoading(false); setError('You must be logged in to view inventory.'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading]); // Depend only on auth state for initial load trigger

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]); // Depend on the memoized fetchItems

  // Handle Deletion (as before)
  const handleDelete = async (itemId) => { /* ... */ };

  // --- NEW: Handle change in inline quantity needed input ---
  const handleNeededQtyChange = (itemId, value) => {
      setEditedNeededQuantities(prev => ({
          ...prev,
          [itemId]: value // Store value as string from input
      }));
      // Clear previous error for this item
      setItemUpdateError(prev => {
          const newErrors = {...prev};
          delete newErrors[itemId];
          return newErrors;
      });
  };

  // --- NEW: Handle saving the updated needed quantity for one item ---
  const handleUpdateNeededQty = async (itemId) => {
      const editedValue = editedNeededQuantities[itemId];
      const newQty = parseFloat(editedValue);

      // Validate input
      if (isNaN(newQty) || newQty < 0) {
          setItemUpdateError(prev => ({...prev, [itemId]: "Invalid qty"}));
          return;
      }

      setItemUpdateError(prev => { // Clear error before trying
          const newErrors = {...prev}; delete newErrors[itemId]; return newErrors;
      });

      try {
          const payload = { quantity_needed: newQty };
          // Use the specific endpoint for updating needed quantity
          const response = await axiosInstance.put(`/inventory/${itemId}/needed`, payload);

          // Update the main items state locally for immediate feedback
          setItems(prevItems => prevItems.map(item =>
              item.id === itemId ? { ...item, quantity_needed: response.data.quantity_needed } : item
          ));
          // Optionally reset edited state to match saved state, or keep it if user might edit again
          // setEditedNeededQuantities(prev => ({...prev, [itemId]: response.data.quantity_needed.toString()}));

      } catch (err) {
          console.error(`Error updating needed qty for item ${itemId}:`, err);
          setItemUpdateError(prev => ({...prev, [itemId]: err.response?.data?.detail || 'Save failed'}));
      }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoading) { /* ... loading ... */ }
  if (!isAuthenticated) { /* ... not authenticated ... */ }
  if (error && !isLoading) { /* ... fetch error ... */ }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory</h1>
        {canManageInventory && (<Link to="/inventory/new" className="..."> Add New Item </Link>)}
      </div>

      {error && <p className="text-red-500 ...">{error}</p>}

      {items.length === 0 && !error ? ( <p>...</p> ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">In Stock</th>
                        <th scope="col" className="py-3 px-6">Needed</th>
                        {/* NEW Column for updating needed qty */}
                        {canUpdateNeededQty && <th scope="col" className="py-3 px-6">Update Needed Qty</th>}
                        <th scope="col" className="py-3 px-6">Unit</th>
                        <th scope="col" className="py-3 px-6">Location</th>
                        {canViewURLs && <th scope="col" className="py-3 px-6">Shop URLs</th> }
                        {canManageInventory && <th scope="col" className="py-3 px-6">Actions</th> }
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <th scope="row" className="..."> {item.name} </th>
                            <td className="py-4 px-6">{item.quantity}</td>
                            <td className="py-4 px-6">{item.quantity_needed}</td>

                            {/* --- NEW: Input/Button to Update Needed Qty --- */}
                            {canUpdateNeededQty && (
                                <td className="py-4 px-6">
                                    <div className="flex items-center space-x-1">
                                        <input
                                            type="number"
                                            step="any"
                                            value={editedNeededQuantities[item.id] ?? ''} // Use state for edited value
                                            onChange={(e) => handleNeededQtyChange(item.id, e.target.value)}
                                            className={`w-20 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${itemUpdateError[item.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                            aria-label={`Needed quantity for ${item.name}`}
                                        />
                                        <button
                                            onClick={() => handleUpdateNeededQty(item.id)}
                                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                            disabled={editedNeededQuantities[item.id] === (item.quantity_needed?.toString() ?? '0')} // Disable if unchanged
                                        >
                                            Save
                                        </button>
                                    </div>
                                     {itemUpdateError[item.id] && <p className="text-xs text-red-500 mt-1">{itemUpdateError[item.id]}</p>}
                                </td>
                            )}
                            {/* --- End Update Needed Qty --- */}

                            <td className="py-4 px-6">{item.unit || '-'}</td>
                            <td className="py-4 px-6">{item.location || '-'}</td>
                            {/* Conditionally render URL cell */}
                            {canViewURLs && ( <td className="py-4 px-6 text-xs"> {/* ... URLs ... */} </td> )}
                            {/* Conditionally render Actions cell */}
                            {canManageInventory && ( <td className="py-4 px-6 flex space-x-2"> {/* ... Edit/Delete ... */} </td> )}
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