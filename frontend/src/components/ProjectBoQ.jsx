// frontend/src/components/ProjectBoQ.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

function ProjectBoQ({ projectId }) {
    const [boq, setBoq] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // State for the "Add Item" form
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantityRequired, setQuantityRequired] = useState(1);

    const canManageBoQ = user && ['admin', 'project manager'].includes(user.role);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [boqResponse, inventoryResponse] = await Promise.all([
                axiosInstance.get(`/boq/project/${projectId}`),
                axiosInstance.get('/inventory/')
            ]);
            setBoq(boqResponse.data);
            setInventoryItems(inventoryResponse.data);
        } catch (err) {
            setError('Failed to load Bill of Quantities data.');
            toast.error('Failed to load BoQ data.');
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
            toast.warn('Please select an item to add.');
            return;
        }
        try {
            const response = await axiosInstance.post(`/boq/project/${projectId}/items`, {
                inventory_item_id: parseInt(selectedItemId, 10),
                quantity_required: parseFloat(quantityRequired)
            });
            setBoq(response.data);
            toast.success('Item added to BoQ.');
            setSelectedItemId('');
            setQuantityRequired(1);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add item.');
        }
    };

    const handleRemoveItem = async (boqItemId, itemName) => {
        if (!window.confirm(`Are you sure you want to remove "${itemName}" from the BoQ?`)) return;
        try {
            await axiosInstance.delete(`/boq/items/${boqItemId}`);
            toast.success(`"${itemName}" removed from BoQ.`);
            fetchData(); // Refetch all data
        } catch (err) {
            toast.error('Failed to remove item.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading Bill of Quantities..." />;
    }
    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    // Filter out items already in the BoQ from the dropdown
    const availableInventoryItems = inventoryItems.filter(
        invItem => !boq?.items.some(boqItem => boqItem.inventory_item.id === invItem.id)
    );

    return (
        <div className="mt-8 pt-6 border-t dark:border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Bill of Quantities</h2>
            
            {canManageBoQ && (
                <form onSubmit={handleAddItem} className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="inventory-item" className="block text-sm font-medium">Material</label>
                        <select id="inventory-item" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="mt-1 block w-full rounded-md">
                            <option value="" disabled>-- Select from Inventory --</option>
                            {availableInventoryItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantity-required" className="block text-sm font-medium">Quantity Required</label>
                        <input type="number" id="quantity-required" value={quantityRequired} onChange={e => setQuantityRequired(e.target.value)} min="0.01" step="any" className="mt-1 block w-full rounded-md"/>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Item</button>
                </form>
            )}

            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Material</th>
                            <th className="py-3 px-6 text-right">Required</th>
                            <th className="py-3 px-6 text-right">In Stock</th>
                            <th className="py-3 px-6 text-right">Shortfall</th>
                            <th className="py-3 px-6">Unit</th>
                            {canManageBoQ && <th className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {boq?.items.map(item => {
                            const shortfall = Math.max(0, item.quantity_required - item.inventory_item.quantity);
                            return (
                                <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="py-4 px-6 font-medium">{item.inventory_item.name}</td>
                                    <td className="py-4 px-6 text-right">{item.quantity_required}</td>
                                    <td className="py-4 px-6 text-right">{item.inventory_item.quantity}</td>
                                    <td className={`py-4 px-6 text-right font-bold ${shortfall > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {shortfall}
                                    </td>
                                    <td className="py-4 px-6">{item.inventory_item.unit || 'pcs'}</td>
                                    {canManageBoQ && (
                                        <td className="py-4 px-6">
                                            <button onClick={() => handleRemoveItem(item.id, item.inventory_item.name)} className="text-red-600 hover:underline">Remove</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {boq?.items.length === 0 && <p className="p-4 text-center">No items have been added to the Bill of Quantities yet.</p>}
            </div>
        </div>
    );
}

export default ProjectBoQ;