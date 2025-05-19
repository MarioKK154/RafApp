// frontend/src/pages/ShoppingListPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from '../components/LoadingSpinner';

function ShoppingListPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Determine if user can view the shopping list (Admin/PM)
  const canViewShoppingList = useMemo(() => {
      return user && ['admin', 'project manager'].includes(user.role);
  }, [user]); // Memoize the role check


  // Fetch shopping list items
  useEffect(() => {
    // Only fetch if auth check is done and user has permission
    if (!authIsLoading && isAuthenticated && canViewShoppingList) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/shopping-list/')
        .then(response => {
          setItems(response.data);
        })
        .catch(err => {
          console.error("Error fetching shopping list:", err);
          setError('Failed to load shopping list.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !canViewShoppingList) {
      // If logged in but not authorized, set error
      setIsLoading(false);
      setError('You do not have permission to view the shopping list.');
    }
  }, [isAuthenticated, authIsLoading, canViewShoppingList, navigate]); // Add navigate to dependency array

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading shopping list..." size="lg" /></div> );
  }

  // Handle permission error after loading
  if (!canViewShoppingList) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Access Denied.'}</p>
            <Link
                to="/"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
             >
                 Go Home
             </Link>
        </div>
     );
  }

  // Handle other fetch errors
  if (error) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error}</p>
            {/* Optionally add a retry button */}
        </div>
     );
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Shopping List</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing items where Quantity Needed is greater than Quantity In Stock.
      </p>

      {items.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">The shopping list is currently empty.</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">Item Name</th>
                        <th scope="col" className="py-3 px-6">In Stock</th>
                        <th scope="col" className="py-3 px-6">Needed</th>
                        <th scope="col" className="py-3 px-6">To Order</th>
                        <th scope="col" className="py-3 px-6">Unit</th>
                        <th scope="col" className="py-3 px-6">Location</th>
                        {/* URLs only shown to Admin/PM (backend already handles this, but good check) */}
                        {canViewShoppingList && <th scope="col" className="py-3 px-6">Shop URLs</th> }
                        {/* Maybe link to edit item? */}
                        <th scope="col" className="py-3 px-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => {
                        const amountToOrder = Math.max(0, (item.quantity_needed || 0) - (item.quantity || 0));
                        return (
                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    {item.name}
                                </th>
                                <td className="py-4 px-6">{item.quantity}</td>
                                <td className="py-4 px-6">{item.quantity_needed}</td>
                                <td className="py-4 px-6 font-bold text-orange-600 dark:text-orange-400">
                                    {amountToOrder.toFixed(2)} {/* Format decimals */}
                                </td>
                                <td className="py-4 px-6">{item.unit || '-'}</td>
                                <td className="py-4 px-6">{item.location || '-'}</td>
                                {/* Conditionally render URL cell - backend sends URLs only to Admin/PM */}
                                {canViewShoppingList && (
                                    <td className="py-4 px-6 text-xs">
                                        {item.shop_url_1 && <div><a href={item.shop_url_1} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 1</a></div>}
                                        {item.shop_url_2 && <div><a href={item.shop_url_2} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 2</a></div>}
                                        {item.shop_url_3 && <div><a href={item.shop_url_3} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link 3</a></div>}
                                        {!item.shop_url_1 && !item.shop_url_2 && !item.shop_url_3 && '-'}
                                    </td>
                                )}
                                {/* Add link to edit the full inventory item */}
                                 <td className="py-4 px-6">
                                     <Link
                                         to={`/inventory/edit/${item.id}`}
                                         className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      >
                                         View/Edit Item
                                      </Link>
                                      {/* TODO: Add button/logic for TLs to adjust quantity_needed here? */}
                                 </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}

export default ShoppingListPage;