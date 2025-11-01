// frontend/src/pages/InventoryCatalogPage.jsx
// Card layout + Basic Search (frontend only for now)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

function InventoryCatalogPage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State for search

    const canManageCatalog = user && ['admin', 'project manager'].includes(user.role);

    const fetchItems = useCallback(() => {
        setIsLoading(true);
        setError('');
        axiosInstance.get('/inventory/') // Fetches catalog items
            .then(response => setItems(response.data))
            .catch(() => {
                setError('Failed to load inventory catalog.');
                toast.error('Failed to load catalog items.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Filter items based on search term (frontend filtering)
    const filteredItems = useMemo(() => {
        if (!searchTerm) {
            return items;
        }
        return items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [items, searchTerm]);

    const handleDeleteClick = (item) => {
        // ... (delete logic remains the same)
        if (!canManageCatalog) { toast.error("No permission."); return; }
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        // ... (delete logic remains the same)
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/${itemToDelete.id}`);
            toast.success(`Item "${itemToDelete.name}" deleted from catalog.`);
            fetchItems(); // Refetch after delete
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete item.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading && items.length === 0) {
        return <LoadingSpinner text="Loading inventory catalog..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory Catalog</h1>
                {canManageCatalog && (
                    <Link to="/inventory/catalog/new" className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add New Material
                    </Link>
                )}
            </div>

            {/* Search Bar */}
             <div className="mb-6">
                <div className="relative flex-grow max-w-md"> {/* Limit width */}
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Inventory Catalog Cards List */}
            {isLoading && items.length > 0 && <LoadingSpinner text="Refreshing catalog..." />}
            {!isLoading && filteredItems.length > 0 ? (
                <div className="space-y-4">
                    {filteredItems.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Main Info */}
                                <div className="flex-grow">
                                     <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                         {item.name}
                                     </h2>
                                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                         Unit: {item.unit || 'pcs'}
                                     </p>
                                     <p className="text-sm text-gray-500 dark:text-gray-400">
                                         {item.description || 'No description'}
                                     </p>
                                </div>
                                {/* Actions */}
                                {canManageCatalog && (
                                    <div className="flex-shrink-0 flex items-center space-x-3">
                                        <Link to={`/inventory/catalog/edit/${item.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium flex items-center" title="Edit Item">
                                            <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                        </Link>
                                        <button onClick={() => handleDeleteClick(item)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium flex items-center" title="Delete Item">
                                            <TrashIcon className="h-4 w-4 mr-1"/> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 !isLoading && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Materials Found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No materials match your search for "${searchTerm}".` : 'The inventory catalog is currently empty.'}
                      </p>
                 </div>
            )}

            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDeleteItem}
                    title="Delete Catalog Item"
                    message={`Are you sure you want to delete "${itemToDelete?.name}" from the master catalog? This cannot be undone.`}
                />
            )}
        </div>
    );
}

export default InventoryCatalogPage;