import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    CubeIcon, 
    ClipboardDocumentCheckIcon, 
    ArrowRightIcon, 
    Squares2X2Icon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';

function GlobalInventoryPage() {
    const [summary, setSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // Permission check: Admins, PMs, and Superusers
    const isSuperuser = user?.is_superuser;
    const canViewPage = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchSummary = useCallback(() => {
        if (!canViewPage) {
            setError('You do not have permission to view the global inventory registry.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        
        // The backend /inventory/global-summary sums quantity across all locations for the user's context
        axiosInstance.get('/inventory/global-summary')
            .then(response => {
                setSummary(response.data);
            })
            .catch((err) => {
                console.error("Inventory Summary Error:", err);
                setError('Failed to aggregate global inventory data.');
                toast.error('Data synchronization failed.');
            })
            .finally(() => setIsLoading(false));
    }, [canViewPage]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    if (isLoading) {
        return <LoadingSpinner text="Aggregating stock levels across all sites..." size="lg" />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] p-8">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-center">
                    <p className="text-red-600 dark:text-red-400 font-bold mb-2">Access Error</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CubeIcon className="h-8 w-8 text-indigo-600" />
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            Global Inventory
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
                        A consolidated view of materials across the entire company. 
                        Quantities shown are the sum of items in central storage and active project sites.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        to="/inventory/catalog" 
                        className="inline-flex items-center px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                    >
                        <Squares2X2Icon className="h-4 w-4 mr-2" />
                        Manage Catalog
                    </Link>
                </div>
            </header>

            {/* Summary Statistics (Optional visual cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Unique Skus</p>
                    <p className="text-3xl font-black">{summary.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Assets</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">
                        {summary.reduce((acc, item) => acc + item.total_quantity, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2 text-green-500 font-bold">
                        <ClipboardDocumentCheckIcon className="h-6 w-6" />
                        <span>Registry Sync OK</span>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 font-bold">
                            <tr>
                                <th className="py-4 px-6">Material Description</th>
                                {isSuperuser && <th className="py-4 px-6">Tenant</th>}
                                <th className="py-4 px-6 text-right">Total Quantity</th>
                                <th className="py-4 px-6">Unit</th>
                                <th className="py-4 px-6 text-center">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {summary.length > 0 ? summary.map(item => (
                                <tr key={item.inventory_item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-bold text-gray-900 dark:text-white">
                                            {item.inventory_item.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">
                                            SKU: {item.inventory_item.sku || 'NOT-ASSIGNED'}
                                        </div>
                                    </td>
                                    
                                    {isSuperuser && (
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-bold">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                {item.inventory_item.tenant?.name || 'System Root'}
                                            </div>
                                        </td>
                                    )}

                                    <td className="py-4 px-6 text-right">
                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-black bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {item.total_quantity.toLocaleString()}
                                        </span>
                                    </td>
                                    
                                    <td className="py-4 px-6 text-gray-500 italic lowercase">
                                        {item.inventory_item.unit || 'pcs'}
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <Link 
                                            to={`/inventory/catalog/edit/${item.inventory_item.id}`} 
                                            className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                            title="View Catalog Details"
                                        >
                                            <ArrowRightIcon className="h-5 w-5" />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isSuperuser ? 5 : 4} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Squares2X2Icon className="h-12 w-12 text-gray-200 mb-2" />
                                            <p className="text-gray-500 italic">No consolidated inventory items found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Footer Legend */}
            <div className="mt-6 flex items-center gap-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                    <span>Aggregated Live Data</span>
                </div>
                {isSuperuser && (
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                        <span>Cross-Tenant Visibility Active</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GlobalInventoryPage;