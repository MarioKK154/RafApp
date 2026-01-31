import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { 
    CubeIcon, 
    PlusIcon, 
    TrashIcon, 
    MapPinIcon, 
    InboxStackIcon 
} from '@heroicons/react/24/outline';

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Superadmins, Admins, and PMs can manage local project stock
    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const [projectInvResponse, catalogResponse] = await Promise.all([
                axiosInstance.get(`/project-inventory/project/${projectId}`),
                axiosInstance.get('/inventory/') // Master catalog for the tenant
            ]);
            setProjectInventory(projectInvResponse.data);
            setInventoryCatalog(catalogResponse.data);
        } catch (err) {
            console.error("Inventory Fetch Error:", err);
            setError('Failed to load project inventory stock.');
            toast.error('Could not sync project stock with warehouse.');
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
            toast.warn('Please select a material from the catalog.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                project_id: parseInt(projectId, 10),
                inventory_item_id: parseInt(selectedCatalogItemId, 10),
                quantity: parseFloat(quantityToAdd),
                location: location || null
            };
            await axiosInstance.post('/project-inventory/', payload);
            toast.success('Stock allocated to project.');
            
            // Reset form
            setSelectedCatalogItemId('');
            setQuantityToAdd(1);
            setLocation('');
            
            fetchData(); // Refresh list to show new item
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to allocate stock.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveItem = async (projectInventoryItemId, itemName) => {
        if (!window.confirm(`Are you sure you want to remove ALL stock of "${itemName}" from this project site?`)) return;
        
        try {
            await axiosInstance.delete(`/project-inventory/${projectInventoryItemId}`);
            toast.success(`"${itemName}" removed from project site.`);
            fetchData();
        } catch (err) {
            toast.error('Failed to remove item.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading project stock registry..." />;
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-sm font-medium">
                {error}
            </div>
        );
    }

    // Filter out items already in the project inventory from the "Add" dropdown
    const availableCatalogItems = inventoryCatalog.filter(
        catalogItem => !projectInventory.some(projItem => projItem.inventory_item.id === catalogItem.id)
    );

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <CubeIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Local Stock</h2>
            </div>
            
            {/* Allocation Form */}
            {canManageInventory && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Allocate Material to Site</h3>
                    <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Material</label>
                            <select 
                                value={selectedCatalogItemId} 
                                onChange={e => setSelectedCatalogItemId(e.target.value)} 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                <option value="" disabled>-- Select Catalog Item --</option>
                                {availableCatalogItems.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Quantity</label>
                            <input 
                                type="number" 
                                value={quantityToAdd} 
                                onChange={e => setQuantityToAdd(e.target.value)} 
                                min="0.01" 
                                step="any" 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Site Location</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                                placeholder="e.g., Container A" 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition transform active:scale-95 disabled:opacity-50"
                        >
                            <PlusIcon className="h-5 w-5 mr-1" /> Add to Site
                        </button>
                    </form>
                </div>
            )}

            {/* Local Stock Registry Table */}
            <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 font-bold">
                        <tr>
                            <th className="py-4 px-6">Material Description</th>
                            <th className="py-4 px-6 text-right">Qty on Site</th>
                            <th className="py-4 px-6">Unit</th>
                            <th className="py-4 px-6">Specific Location</th>
                            {canManageInventory && <th className="py-4 px-6 text-center">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {projectInventory.length > 0 ? projectInventory.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="font-bold text-gray-900 dark:text-white">{item.inventory_item.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono uppercase">{item.inventory_item.sku || 'NO-SKU'}</div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        {item.quantity}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-gray-500 lowercase">{item.inventory_item.unit || 'pcs'}</td>
                                <td className="py-4 px-6 text-gray-500 flex items-center gap-1.5">
                                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                                    {item.location || 'Main Site'}
                                </td>
                                {canManageInventory && (
                                    <td className="py-4 px-6 text-center">
                                        <button 
                                            onClick={() => handleRemoveItem(item.id, item.inventory_item.name)} 
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                            title="Remove from project"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={canManageInventory ? 5 : 4} className="py-12 text-center text-gray-400 italic">
                                    <div className="flex flex-col items-center">
                                        <InboxStackIcon className="h-8 w-8 mb-2 opacity-20" />
                                        <span>No materials currently allocated to this project site.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ProjectInventory;