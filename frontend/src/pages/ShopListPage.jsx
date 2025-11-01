// frontend/src/pages/ShopListPage.jsx
// Card layout + Basic Search

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/solid';

// Debounce hook (reuse if available globally, otherwise define here)
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function ShopListPage() {
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [shopToDelete, setShopToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const canManageShops = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchShops = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/shops/') // Add search param later if backend supports it
            .then(response => setShops(response.data))
            .catch(() => {
                setError('Failed to load shops.');
                toast.error('Failed to load shops.');
            })
            .finally(() => setIsLoading(false));
    }, []); // Removed debouncedSearchTerm dependency for now

    useEffect(() => { fetchShops(); }, [fetchShops]);

    // Filter shops based on search term (frontend filtering)
    const filteredShops = useMemo(() => {
        if (!debouncedSearchTerm) {
            return shops;
        }
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return shops.filter(shop =>
            shop.name.toLowerCase().includes(lowerSearch) ||
            (shop.address && shop.address.toLowerCase().includes(lowerSearch)) ||
            (shop.contact_person && shop.contact_person.toLowerCase().includes(lowerSearch)) ||
            (shop.notes && shop.notes.toLowerCase().includes(lowerSearch))
        );
    }, [shops, debouncedSearchTerm]);

    const handleDeleteClick = (shop) => {
        setShopToDelete(shop);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!shopToDelete) return;
        try {
            await axiosInstance.delete(`/shops/${shopToDelete.id}`);
            toast.success(`Shop "${shopToDelete.name}" deleted successfully.`);
            fetchShops(); // Refetch after delete
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete shop.');
        } finally {
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
        }
    };

    if (isLoading && shops.length === 0) {
        return <LoadingSpinner text="Loading shops..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Local Shops & Suppliers</h1>
                {canManageShops && (
                    <Link to="/shops/new" className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add New Shop
                    </Link>
                )}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, contact, address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Shop Cards List */}
            {isLoading && shops.length > 0 && <LoadingSpinner text="Refreshing shops..." />}
            {!isLoading && filteredShops.length > 0 ? (
                <div className="space-y-4">
                    {filteredShops.map(shop => (
                        <div key={shop.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Main Info */}
                                <div className="flex-grow">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                        {shop.name}
                                    </h2>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                                        Contact: {shop.contact_person || 'N/A'}
                                    </p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-2">
                                        {shop.address && <p className="flex items-center"><MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0"/> {shop.address}</p>}
                                        {shop.phone_number && <p className="flex items-center"><PhoneIcon className="h-4 w-4 mr-1 flex-shrink-0"/> {shop.phone_number}</p>}
                                        {shop.email && <p className="flex items-center truncate"><EnvelopeIcon className="h-4 w-4 mr-1 flex-shrink-0"/> <a href={`mailto:${shop.email}`} className="hover:underline text-blue-600 dark:text-blue-400">{shop.email}</a></p>}
                                        {shop.website && <p className="flex items-center truncate"><GlobeAltIcon className="h-4 w-4 mr-1 flex-shrink-0"/> <a href={shop.website.startsWith('http') ? shop.website : `//${shop.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400">{shop.website}</a></p>}
                                        {shop.notes && <p className="mt-2 text-gray-600 dark:text-gray-300 text-xs italic">Notes: {shop.notes}</p>}
                                    </div>
                                </div>
                                {/* Actions */}
                                {canManageShops && (
                                    <div className="flex-shrink-0 flex items-center space-x-3">
                                        <button onClick={() => navigate(`/shops/edit/${shop.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium flex items-center" title="Edit Shop">
                                            <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(shop)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium flex items-center" title="Delete Shop">
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
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Shops Found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No shops match your search for "${searchTerm}".` : 'There are no shops in the directory yet.'}
                      </p>
                 </div>
            )}

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