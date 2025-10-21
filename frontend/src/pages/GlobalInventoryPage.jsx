// frontend/src/pages/GlobalInventoryPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function GlobalInventoryPage() {
    const [summary, setSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const canViewPage = user && ['admin', 'project manager'].includes(user.role);

    const fetchSummary = useCallback(() => {
        if (!canViewPage) {
            setError('You do not have permission to view this page.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        axiosInstance.get('/inventory/global-summary')
            .then(response => setSummary(response.data))
            .catch(() => {
                setError('Failed to load global inventory summary.');
                toast.error('Failed to load summary data.');
            })
            .finally(() => setIsLoading(false));
    }, [canViewPage]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    if (isLoading) {
        return <LoadingSpinner text="Calculating global inventory..." />;
    }

    if (error) {
        return <p className="text-center p-8 text-red-500">{error}</p>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Global Inventory Summary</h1>
                <Link to="/inventory/catalog" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    Manage Catalog
                </Link>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                This page shows the total quantity of each material summed across all projects.
            </p>
            
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Material Name</th>
                            <th className="py-3 px-6 text-right">Total Quantity</th>
                            <th className="py-3 px-6">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map(item => (
                            <tr key={item.inventory_item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-medium">
                                    <Link to={`/inventory/catalog/edit/${item.inventory_item.id}`} className="text-blue-600 hover:underline">
                                        {item.inventory_item.name}
                                    </Link>
                                </td>
                                <td className="py-4 px-6 text-right font-bold">{item.total_quantity}</td>
                                <td className="py-4 px-6">{item.inventory_item.unit || 'pcs'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {summary.length === 0 && <p className="p-4 text-center">No inventory items with quantities found across any projects.</p>}
            </div>
        </div>
    );
}

export default GlobalInventoryPage;