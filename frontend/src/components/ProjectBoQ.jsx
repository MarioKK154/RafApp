import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { 
    PlusIcon, 
    TrashIcon, 
    ExclamationCircleIcon, 
    CheckCircleIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';

function ProjectBoQ({ projectId }) {
    const [boq, setBoq] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // State for the "Add Item" form
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantityRequired, setQuantityRequired] = useState(1);

    // Superadmins, Admins, and PMs can modify the BoQ
    const canManageBoQ = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch both the specific project BoQ and the general Inventory list
            const [boqResponse, inventoryResponse] = await Promise.all([
                axiosInstance.get(`/boq/project/${projectId}`),
                axiosInstance.get('/inventory/')
            ]);
            setBoq(boqResponse.data);
            setInventoryItems(inventoryResponse.data);
        } catch (err) {
            console.error("BoQ Load Error:", err);
            setError('Failed to load Bill of Quantities data.');
            toast.error('Could not sync BoQ with inventory.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedItemId) {
            toast.warn('Please select a material from inventory.');
            return;
        }

        try {
            const response = await axiosInstance.post(`/boq/project/${projectId}/items`, {
                inventory_item_id: parseInt(selectedItemId, 10),
                quantity_required: parseFloat(quantityRequired)
            });
            
            // The backend returns the updated BoQ object
            setBoq(response.data);
            toast.success('Material added to project requirements.');
            
            // Reset form
            setSelectedItemId('');
            setQuantityRequired(1);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update BoQ.');
        }
    };

    const handleRemoveItem = async (boqItemId, itemName) => {
        if (!window.confirm(`Remove "${itemName}" from this project's requirements?`)) return;
        
        try {
            await axiosInstance.delete(`/boq/items/${boqItemId}`);
            toast.success(`Removed ${itemName}.`);
            fetchData(); // Refresh the list to reflect new shortfall calculations
        } catch (err) {
            toast.error('Could not remove item.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Calculating requirements and inventory..." />;
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center">
                <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                {error}
            </div>
        );
    }

    // Filter the dropdown so we don't list items already assigned to this BoQ
    const availableInventoryItems = inventoryItems.filter(
        invItem => !boq?.items.some(boqItem => boqItem.inventory_item.id === invItem.id)
    );

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <ArchiveBoxIcon className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bill of Quantities (BoQ)</h2>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                    Project ID: {projectId}
                </span>
            </div>
            
            {/* Add Material Form */}
            {canManageBoQ && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-tight">Add Project Material</h3>
                    <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Select Material</label>
                            <select 
                                value={selectedItemId} 
                                onChange={e => setSelectedItemId(e.target.value)}
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                <option value="" disabled>-- Choose from Catalog --</option>
                                {availableInventoryItems.map(item => (
                                    <option key={item.id} value={item.id}>{item.name} ({item.sku || 'No SKU'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Required Qty</label>
                            <input 
                                type="number" 
                                value={quantityRequired} 
                                onChange={e => setQuantityRequired(e.target.value)} 
                                min="0.01" 
                                step="any" 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <button 
                                type="submit" 
                                className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition transform active:scale-95"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" /> Add to List
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* BoQ Table */}
            <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 font-bold">
                        <tr>
                            <th className="py-4 px-6">Material Description</th>
                            <th className="py-4 px-6 text-right">Required</th>
                            <th className="py-4 px-6 text-right">In Stock</th>
                            <th className="py-4 px-6 text-right">Shortfall</th>
                            <th className="py-4 px-6">Unit</th>
                            {canManageBoQ && <th className="py-4 px-6 text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {boq?.items.length > 0 ? boq.items.map(item => {
                            const shortfall = Math.max(0, item.quantity_required - item.inventory_item.quantity);
                            return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-bold text-gray-900 dark:text-white">{item.inventory_item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono uppercase">{item.inventory_item.sku || 'No SKU'}</div>
                                    </td>
                                    <td className="py-4 px-6 text-right font-medium">{item.quantity_required}</td>
                                    <td className="py-4 px-6 text-right text-gray-500">{item.inventory_item.quantity}</td>
                                    <td className="py-4 px-6 text-right">
                                        {shortfall > 0 ? (
                                            <div className="inline-flex items-center text-red-600 dark:text-red-400 font-bold">
                                                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                                                -{shortfall}
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center text-green-600 dark:text-green-400 font-bold">
                                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                Ready
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-gray-500 italic lowercase">{item.inventory_item.unit || 'pcs'}</td>
                                    {canManageBoQ && (
                                        <td className="py-4 px-6 text-center">
                                            <button 
                                                onClick={() => handleRemoveItem(item.id, item.inventory_item.name)} 
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Remove Item"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={canManageBoQ ? 6 : 5} className="py-12 text-center text-gray-500 italic">
                                    The Bill of Quantities is currently empty.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend / Info */}
            <div className="mt-4 flex gap-4 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Need to Order
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Fully Stocked
                </div>
            </div>
        </div>
    );
}

export default ProjectBoQ;