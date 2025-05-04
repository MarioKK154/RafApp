// frontend/src/pages/InventoryListPage.jsx
// FINAL Corrected Version - Fixed conditional return JSX
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
  const [editedNeededQuantities, setEditedNeededQuantities] = useState({});
  const [itemUpdateError, setItemUpdateError] = useState({});

  const canManageInventory = user && ['admin', 'project manager'].includes(user.role);
  const canUpdateNeededQty = user && ['admin', 'project manager', 'team leader'].includes(user.role);
  const canViewURLs = user && ['admin', 'project manager'].includes(user.role);

  const fetchItems = useCallback(() => {
    if (authIsLoading || !isAuthenticated) { setIsLoading(false); setError(isAuthenticated ? '' : 'Must be logged in.'); return; }
    setIsLoading(true); setError(''); setItemUpdateError({});
    axiosInstance.get('/inventory/')
      .then(response => {
        setItems(response.data);
        const initialEdits = {}; response.data.forEach(item => { initialEdits[item.id] = item.quantity_needed?.toString() ?? '0'; });
        setEditedNeededQuantities(initialEdits);
      })
      .catch(err => { console.error("Error fetching inventory items:", err); setError('Failed to load inventory items.'); })
      .finally(() => { setIsLoading(false); });
  }, [isAuthenticated, authIsLoading]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (itemId) => { if (!canManageInventory) { alert("No permission"); return; } if (!window.confirm('Are you sure...?')) return; try { setError(''); await axiosInstance.delete(`/inventory/${itemId}`); setItems(currentItems => currentItems.filter(item => item.id !== itemId)); } catch (err) { console.error("Error deleting item:", err); setError(err.response?.data?.detail || 'Failed to delete item.'); } };
  const handleNeededQtyChange = (itemId, value) => { setEditedNeededQuantities(prev => ({ ...prev, [itemId]: value })); setItemUpdateError(prev => { const n = {...prev}; delete n[itemId]; return n; }); };
  const handleUpdateNeededQty = async (itemId) => { const editedValue = editedNeededQuantities[itemId]; const newQty = parseFloat(editedValue); if (isNaN(newQty) || newQty < 0) { setItemUpdateError(prev => ({...prev, [itemId]: "Invalid qty"})); return; } setItemUpdateError(prev => { const n = {...prev}; delete n[itemId]; return n; }); try { const payload = { quantity_needed: newQty }; const response = await axiosInstance.put(`/inventory/${itemId}/needed`, payload); setItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, quantity_needed: response.data.quantity_needed } : item)); } catch (err) { console.error(`Error updating needed qty for ${itemId}:`, err); setItemUpdateError(prev => ({...prev, [itemId]: err.response?.data?.detail || 'Save failed'})); } };

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading inventory...</p></div> );
  }

  // --- CORRECTED BLOCK ---
  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view inventory.'}</p>
            {/* Fully expanded Link tag */}
            <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
             >
                Go to Login
             </Link>
        </div>
     );
  }
  // --- END CORRECTED BLOCK ---

   if (error && !isLoading) {
       return ( <div className="container mx-auto p-6 text-center text-red-500"><p>{error}</p></div> );
   }

  // Main Authenticated Return
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6"> <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory</h1> {canManageInventory && ( <Link to="/inventory/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base"> Add New Item </Link> )} </div>
      {/* Error Display moved up */}
      {items.length === 0 ? ( <p className="text-gray-600 dark:text-gray-400">No inventory items found. {canManageInventory ? 'Add one!' : ''}</p> ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">Name</th> <th scope="col" className="py-3 px-6">In Stock</th> <th scope="col" className="py-3 px-6">Needed</th>
                        {canUpdateNeededQty && <th scope="col" className="py-3 px-6">Update Needed Qty</th>}
                        <th scope="col" className="py-3 px-6">Unit</th> <th scope="col" className="py-3 px-6">Location</th> <th scope="col" className="py-3 px-6">Description</th>
                        {canViewURLs && <th scope="col" className="py-3 px-6">Shop URLs</th> }
                        {canManageInventory && <th scope="col" className="py-3 px-6">Actions</th> }
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.name}</th>
                            <td className="py-4 px-6">{item.quantity}</td> <td className="py-4 px-6">{item.quantity_needed}</td>
                            {canUpdateNeededQty && ( <td className="py-4 px-6"> <div className="flex items-center space-x-1"> <input type="number" step="any" value={editedNeededQuantities[item.id] ?? ''} onChange={(e) => handleNeededQtyChange(item.id, e.target.value)} className={`w-20 px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${itemUpdateError[item.id] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} aria-label={`Needed quantity for ${item.name}`} /> <button onClick={() => handleUpdateNeededQty(item.id)} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs" disabled={editedNeededQuantities[item.id] === (item.quantity_needed?.toString() ?? '0')}> Save </button> </div> {itemUpdateError[item.id] && <p className="text-xs text-red-500 mt-1">{itemUpdateError[item.id]}</p>} </td> )}
                            <td className="py-4 px-6">{item.unit || '-'}</td> <td className="py-4 px-6">{item.location || '-'}</td> <td className="py-4 px-6">{item.description || '-'}</td>
                            {canViewURLs && ( <td className="py-4 px-6 text-xs"> {item.shop_url_1 && <div><a href={item.shop_url_1} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 1</a></div>} {item.shop_url_2 && <div><a href={item.shop_url_2} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 2</a></div>} {item.shop_url_3 && <div><a href={item.shop_url_3} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 3</a></div>} {!item.shop_url_1 && !item.shop_url_2 && !item.shop_url_3 && '-'} </td> )}
                            {canManageInventory && ( <td className="py-4 px-6 flex space-x-2"> <Link to={`/inventory/edit/${item.id}`} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</Link> <button onClick={() => handleDelete(item.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button> </td> )}
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