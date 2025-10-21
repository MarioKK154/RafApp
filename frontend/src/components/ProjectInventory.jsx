// frontend/src/components/ProjectInventory.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

function ProjectInventory({ projectId }) {
    const [projectInventory, setProjectInventory] = useState([]);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // State for the "Add Item" form
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [location, setLocation] = useState('');

    const canManageInventory = user && ['admin', 'project manager'].includes(user.role);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const [projectInvResponse, catalogResponse] = await Promise.all([
                axiosInstance.get(`/project-inventory/project/${projectId}`),
                axiosInstance.get('/inventory/') // Get the master catalog for the dropdown
            ]);
            setProjectInventory(projectInvResponse.data);
            setInventoryCatalog(catalogResponse.data);
        } catch (err) {
            setError('Failed to load project inventory data.');
            toast.error('Failed to load project inventory data.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedCatalogItemId) {
            toast.warn('Please select an item to add.');
            return;
        }
        try {
            const payload = {
                project_id: parseInt(projectId, 10),
                inventory_item_id: parseInt(selectedCatalogItemId, 10),
                quantity: parseFloat(quantityToAdd),
                location: location || null
            };
            await axiosInstance.post('/project-inventory/', payload);
            toast.success('Item added to project inventory.');
            // Reset form and refetch data
            setSelectedCatalogItemId('');
            setQuantityToAdd(1);
            setLocation('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add item.');
        }
    };

    const handleRemoveItem = async (projectInventoryItemId, itemName) => {
        if (!window.confirm(`Are you sure you want to remove all stock of "${itemName}" from this project's inventory?`)) return;
        try {
            await axiosInstance.delete(`/project-inventory/${projectInventoryItemId}`);
            toast.success(`"${itemName}" removed from project inventory.`);
            fetchData();
        } catch (err) {
            toast.error('Failed to remove item.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading Project Inventory..." />;
    }
    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    const availableCatalogItems = inventoryCatalog.filter(
        catalogItem => !projectInventory.some(projItem => projItem.inventory_item.id === catalogItem.id)
    );

    return (
        <div className="mt-8 pt-6 border-t dark:border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Inventory Stock</h2>
            
            {canManageInventory && (
                <form onSubmit={handleAddItem} className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="inventory-item-select" className="block text-sm font-medium">Material</label>
                        <select id="inventory-item-select" value={selectedCatalogItemId} onChange={e => setSelectedCatalogItemId(e.target.value)} className="mt-1 block w-full rounded-md">
                            <option value="" disabled>-- Select from Catalog --</option>
                            {availableCatalogItems.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantity-to-add" className="block text-sm font-medium">Quantity</label>
                        <input type="number" id="quantity-to-add" value={quantityToAdd} onChange={e => setQuantityToAdd(e.target.value)} min="0" step="any" className="mt-1 block w-full rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="location-to-add" className="block text-sm font-medium">Location</label>
                        <input type="text" id="location-to-add" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., On-site, Warehouse" className="mt-1 block w-full rounded-md"/>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add to Project</button>
                </form>
            )}

            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Material</th>
                            <th className="py-3 px-6 text-right">Quantity</th>
                            <th className="py-3 px-6">Unit</th>
                            <th className="py-3 px-6">Location</th>
                            {canManageInventory && <th className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {projectInventory.map(item => (
                            <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-medium">{item.inventory_item.name}</td>
                                <td className="py-4 px-6 text-right font-bold">{item.quantity}</td>
                                <td className="py-4 px-6">{item.inventory_item.unit || 'pcs'}</td>
                                <td className="py-4 px-6">{item.location || '-'}</td>
                                {canManageInventory && (
                                    <td className="py-4 px-6">
                                        <button onClick={() => handleRemoveItem(item.id, item.inventory_item.name)} className="text-red-600 hover:underline">Remove</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {projectInventory.length === 0 && <p className="p-4 text-center">No inventory has been allocated to this project yet.</p>}
            </div>
        </div>
    );
}

export default ProjectInventory;