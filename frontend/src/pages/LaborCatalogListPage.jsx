// frontend/src/pages/LaborCatalogListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

const formatCurrencyISK = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(value);
};

function LaborCatalogListPage() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManageCatalog = user && ['admin', 'project manager'].includes(user.role);

    const fetchItems = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/labor-catalog/')
            .then(response => setItems(response.data))
            .catch(() => {
                setError('Failed to load labor catalog.');
                toast.error('Failed to load labor catalog items.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/labor-catalog/${itemToDelete.id}`);
            toast.success(`Labor item "${itemToDelete.description}" deleted.`);
            fetchItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete item.');
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading Labor Catalog..." />; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Labor Catalog</h1>
                {canManageCatalog && (
                    <Link to="/labor-catalog/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add New Labor Item
                    </Link>
                )}
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Description</th>
                            <th className="py-3 px-6 text-right">Default Price</th>
                            <th className="py-3 px-6">Unit</th>
                            {canManageCatalog && <th className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-medium">{item.description}</td>
                                <td className="py-4 px-6 text-right">{formatCurrencyISK(item.default_unit_price)}</td>
                                <td className="py-4 px-6">{item.unit}</td>
                                {canManageCatalog && (
                                    <td className="py-4 px-6 flex items-center space-x-3">
                                        <Link to={`/labor-catalog/edit/${item.id}`} className="text-blue-600 hover:underline">Edit</Link>
                                        <button onClick={() => handleDeleteClick(item)} className="text-red-600 hover:underline">Delete</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {items.length === 0 && <p className="p-4 text-center">No labor items found in the catalog.</p>}
            </div>
            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDeleteItem}
                    title="Delete Labor Item"
                    message={`Are you sure you want to delete "${itemToDelete?.description}" from the catalog?`}
                />
            )}
        </div>
    );
}

export default LaborCatalogListPage;