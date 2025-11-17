// frontend/src/pages/CustomerListPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/solid';

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function CustomerListPage() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth(); // <-- 1. GET ALL AUTH STATE
    const navigate = useNavigate();

    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // --- 2. UPDATE THIS VARIABLE ---
    const isAdmin = user && (user.role === 'admin' || user.is_superuser);

    // --- 3. ADD THIS AUTH GUARD ---
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("You must be logged in.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: You do not have permission to view customers.");
                navigate('/', { replace: true }); // Redirect to home
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    const fetchCustomers = useCallback(() => {
        if (!isAdmin) { // Don't fetch if permissions aren't set
            setIsLoading(false);
            return; 
        }
        setIsLoading(true);
        axiosInstance.get('/customers/')
            .then(response => setCustomers(response.data))
            .catch(() => {
                setError('Failed to load customers.');
                toast.error('Failed to load customers.');
            })
            .finally(() => setIsLoading(false));
    }, [isAdmin]); // <-- 4. ADD isAdmin as dependency

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
    
    // Filter customers (client-side)
    const filteredCustomers = useMemo(() => {
        if (!debouncedSearchTerm) {
            return customers;
        }
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return customers.filter(cust =>
            cust.name.toLowerCase().includes(lowerSearch) ||
            (cust.contact_person && cust.contact_person.toLowerCase().includes(lowerSearch)) ||
            (cust.email && cust.email.toLowerCase().includes(lowerSearch)) ||
            (cust.kennitala && cust.kennitala.includes(lowerSearch))
        );
    }, [customers, debouncedSearchTerm]);

    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await axiosInstance.delete(`/customers/${customerToDelete.id}`);
            toast.success(`Customer "${customerToDelete.name}" deleted successfully.`);
            fetchCustomers(); // Refetch after delete
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete customer.');
        } finally {
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        }
    };

    if (authIsLoading || (isLoading && customers.length === 0)) {
        return <LoadingSpinner text="Loading customers..." />;
    }
    
    // --- 5. ADD THIS FALLBACK RENDER ---
    if (!isAdmin) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>Access Denied. Redirecting...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Customers (CRM)</h1>
                {isAdmin && ( // <-- 6. UPDATE THIS CHECK
                    <Link to="/customers/new" className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add New Customer
                    </Link>
                )}
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, contact, email, kennitala..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Customer Cards List */}
            {isLoading && customers.length > 0 && <LoadingSpinner text="Refreshing customers..." />}
            {!isLoading && filteredCustomers.length > 0 ? (
                <div className="space-y-4">
                    {filteredCustomers.map(cust => (
                        <div key={cust.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Main Info */}
                                <div className="flex-grow">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                        {cust.name}
                                    </h2>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                        <UserCircleIcon className="h-4 w-4 text-gray-500"/> Contact: {cust.contact_person || 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        Kennitala: {cust.kennitala || 'N/A'}
                                    </p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-2">
                                        {cust.address && <p className="flex items-center"><MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0"/> {cust.address}</p>}
                                        {cust.phone_number && <p className="flex items-center"><PhoneIcon className="h-4 w-4 mr-1 flex-shrink-0"/> {cust.phone_number}</p>}
                                        {cust.email && <p className="flex items-center truncate"><EnvelopeIcon className="h-4 w-4 mr-1 flex-shrink-0"/> <a href={`mailto:${cust.email}`} className="hover:underline text-blue-600 dark:text-blue-400">{cust.email}</a></p>}
                                        {cust.notes && <p className="mt-2 text-gray-600 dark:text-gray-300 text-xs italic">Notes: {cust.notes}</p>}
                                    </div>
                                </div>
                                {/* Actions */}
                                {isAdmin && ( // <-- 7. UPDATE THIS CHECK
                                    <div className="flex-shrink-0 flex items-center space-x-3">
                                        <button onClick={() => navigate(`/customers/edit/${cust.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium flex items-center" title="Edit Customer">
                                            <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(cust)} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium flex items-center" title="Delete Customer">
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
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Customers Found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? `No customers match your search for "${searchTerm}".` : 'There are no customers in the directory yet.'}
                    </p>
                </div>
            )}

            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Customer"
                    message={`Are you sure you want to delete the customer "${customerToDelete?.name}"?`}
                />
            )}
        </div>
    );
}

export default CustomerListPage;