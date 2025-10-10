// frontend/src/pages/ShopListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

function ShopListPage() {
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [shopToDelete, setShopToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManageShops = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchShops = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/shops/')
            .then(response => setShops(response.data))
            .catch(() => {
                setError('Failed to load shops.');
                toast.error('Failed to load shops.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchShops(); }, [fetchShops]);

    const handleDeleteClick = (shop) => {
        setShopToDelete(shop);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;
        try {
            await axiosInstance.delete(`/shops/${shopToDelete.id}`);
            toast.success(`Shop "${shopToDelete.name}" deleted successfully.`);
            fetchShops();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete shop.');
        } finally {
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading shops..." />; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Local Shops & Suppliers</h1>
                {canManageShops && (
                    <Link to="/shops/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add New Shop
                    </Link>
                )}
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Name</th>
                            <th className="py-3 px-6">Contact Person</th>
                            <th className="py-3 px-6">Phone</th>
                            <th className="py-3 px-6">Address</th>
                            {canManageShops && <th className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {shops.map(shop => (
                            <tr key={shop.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-medium">{shop.name}</td>
                                <td className="py-4 px-6">{shop.contact_person || '-'}</td>
                                <td className="py-4 px-6">{shop.phone_number || '-'}</td>
                                <td className="py-4 px-6">{shop.address || '-'}</td>
                                {canManageShops && (
                                    <td className="py-4 px-6 flex items-center space-x-3">
                                        <Link to={`/shops/edit/${shop.id}`} className="text-blue-600 hover:underline">Edit</Link>
                                        <button onClick={() => handleDeleteClick(shop)} className="text-red-600 hover:underline">Delete</button>
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
                    onConfirm={confirmDelete}
                    title="Delete Shop"
                    message={`Are you sure you want to delete the shop "${shopToDelete?.name}"?`}
                />
            )}
        </div>
    );
}

export default ShopListPage;