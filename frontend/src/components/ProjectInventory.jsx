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
    InboxStackIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

function ProjectInventory({ projectId }) {
    const [projectInventory, setProjectInventory] = useState([]);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // Registry Form State
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Authorization Clearance
    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    /**
     * Protocol: Synchronize Site Stock with Global Catalog
     */
    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const [projectInvResponse, catalogResponse] = await Promise.all([
                axiosInstance.get(`/project-inventory/project/${projectId}`),
                // FIXED: Updated to /catalog to match new robust router pathing
                axiosInstance.get('/inventory/catalog', { params: { limit: 1000 } })
            ]);
            setProjectInventory(Array.isArray(projectInvResponse.data) ? projectInvResponse.data : []);
            setInventoryCatalog(Array.isArray(catalogResponse.data) ? catalogResponse.data : []);
        } catch (error) {
            console.error('Inventory fetch error:', error);
            setError('Registry Link Failure: Failed to load site stock.');
            toast.error('Could not sync project stock with warehouse.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Protocol: Site Allocation Handler
     */
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedCatalogItemId) {
            toast.warn('Protocol Violation: Select a material from catalog.');
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
            toast.success('Stock node allocated to site registry.');
            
            // Registry Reset
            setSelectedCatalogItemId('');
            setQuantityToAdd(1);
            setLocation('');
            
            fetchData(); 
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Allocation failure.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Protocol: Registry Deletion Handler
     */
    const handleRemoveItem = async (projectInventoryItemId, itemName) => {
        if (!window.confirm(`PERMANENT ACTION: Purge ALL stock of "${itemName}" from this site registry?`)) return;
        
        try {
            await axiosInstance.delete(`/project-inventory/${projectInventoryItemId}`);
            toast.success(`"${itemName}" node purged from site.`);
            fetchData();
        } catch (error) {
            console.error('Remove item failed:', error);
            toast.error('Registry Error: Failed to remove node.');
        }
    };

    if (isLoading) {
        return (
            <div className="py-12 flex justify-center">
                <LoadingSpinner text="Syncing site stock registry..." size="md" />
            </div>
        );
    }

    // Filter Logic: Only show catalog items not already allocated to this site
    const availableCatalogItems = inventoryCatalog.filter(
        catalogItem => !projectInventory.some(projItem => projItem.inventory_item.id === catalogItem.id)
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium text-center">
                    {error}
                </div>
            )}
            {/* Module Header */}
            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CubeIcon className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">
                        {user?.is_superuser ? 'Global Site Stock' : 'Project Local Stock'}
                    </h2>
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                    Registry Nodes: {projectInventory.length}
                </span>
            </div>

            <div className="p-8">
                {/* Deployment Console (Allocation Form) */}
                {canManageInventory && (
                    <div className="mb-10 p-6 bg-gray-50/50 dark:bg-gray-900/40 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner">
                        <div className="flex items-center gap-2 mb-6 ml-1">
                            <PlusIcon className="h-4 w-4 text-emerald-500 stroke-[3px]" />
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Allocate Node to Site</h3>
                        </div>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Material SKU</label>
                                <select 
                                    value={selectedCatalogItemId} 
                                    onChange={e => setSelectedCatalogItemId(e.target.value)} 
                                    className="modern-input h-12 text-xs font-bold"
                                >
                                    <option value="">-- SELECT SKU --</option>
                                    {availableCatalogItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                                <input 
                                    type="number" 
                                    value={quantityToAdd} 
                                    onChange={e => setQuantityToAdd(e.target.value)} 
                                    min="0.01" 
                                    step="any" 
                                    className="modern-input h-12 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Deployment Zone</label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={location} 
                                        onChange={e => setLocation(e.target.value)} 
                                        placeholder="Container / Zone" 
                                        className="modern-input h-12 pl-11 text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4 stroke-[3px]" />}
                                Deploy to Site
                            </button>
                        </form>
                    </div>
                )}

                {/* Local Inventory Registry Table */}
                <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900/20">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Material Identifier</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Site Quantity</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Specific Zone</th>
                                {canManageInventory && <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Protocol</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {projectInventory.length > 0 ? projectInventory.map(item => (
                                <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-5 px-8">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{item.inventory_item?.name}</div>
                                        <div className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">ID: {item.inventory_item?.id}</div>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.inventory_item?.unit || 'pcs'}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                                            <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                                            {item.location || 'Main Site'}
                                        </div>
                                    </td>
                                    {canManageInventory && (
                                        <td className="py-5 px-8 text-center">
                                            <button 
                                                onClick={() => handleRemoveItem(item.id, item.inventory_item?.name)} 
                                                className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                title="Purge node"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={canManageInventory ? 5 : 4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <InboxStackIcon className="h-10 w-10 text-gray-200" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                                                No site stock telemetry detected
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ProjectInventory;