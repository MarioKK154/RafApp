// frontend/src/pages/InventoryCatalogPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

function InventoryCatalogPage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManageCatalog = user && ['admin', 'project manager'].includes(user.role);

    const fetchItems = useCallback(() => {
        setIsLoading(true);
        setError('');
        axiosInstance.get('/inventory/') // This now fetches catalog items
            .then(response => setItems(response.data))
            .catch(() => {
                setError('Failed to load inventory catalog.');
                toast.error('Failed to load catalog items.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleDeleteClick = (item) => {
        if (!canManageCatalog) { toast.error("No permission."); return; }
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/${itemToDelete.id}`);
            toast.success(`Item "${itemToDelete.name}" deleted from catalog.`);
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete item.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading inventory catalog..." />; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Inventory Catalog</h1>
                {canManageCatalog && (
                    <Link to="/inventory/catalog/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add New Material
                    </Link>
                )}
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Name</th>
                            <th className="py-3 px-6">Unit</th>
                            <th className="py-3 px-6">Description</th>
                            {canManageCatalog && <th className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-medium">{item.name}</td>
                                <td className="py-4 px-6">{item.unit || '-'}</td>
                                <td className="py-4 px-6">{item.description || '-'}</td>
                                {canManageCatalog && (
                                    <td className="py-4 px-6 flex items-center space-x-3">
                                        <Link to={`/inventory/catalog/edit/${item.id}`} className="text-blue-600 hover:underline">Edit</Link>
                                        <button onClick={() => handleDeleteClick(item)} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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