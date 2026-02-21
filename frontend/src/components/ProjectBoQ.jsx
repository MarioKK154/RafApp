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
    ArchiveBoxIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

function ProjectBoQ({ projectId }) {
    const [boq, setBoq] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // Registry Form State
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantityRequired, setQuantityRequired] = useState(1);

    // Authorization Clearance
    const canManageBoQ = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    /**
     * Protocol: Synchronize Bill of Quantities with Warehouse Catalog
     */
    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const [boqResponse, inventoryResponse] = await Promise.all([
                axiosInstance.get(`/boq/project/${projectId}`),
                // FIXED: Direct link to new robust catalog endpoint
                axiosInstance.get('/inventory/catalog', { params: { limit: 1000 } })
            ]);
            setBoq(boqResponse.data);
            setInventoryItems(Array.isArray(inventoryResponse.data) ? inventoryResponse.data : []);
        } catch (err) {
            console.error("BoQ Load Error:", err);
            setError('Registry Link Failure: Failed to load BoQ data.');
            toast.error('Could not sync BoQ with inventory.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Protocol: Requirement Registration Handler
     */
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedItemId) {
            toast.warn('Protocol Violation: Select a material from catalog.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post(`/boq/project/${projectId}/items`, {
                inventory_item_id: parseInt(selectedItemId, 10),
                quantity_required: parseFloat(quantityRequired)
            });
            
            // Backend returns updated BoQ node
            setBoq(response.data);
            toast.success('Material node added to project requirements.');
            
            // Registry Reset
            setSelectedItemId('');
            setQuantityRequired(1);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registry update failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Protocol: Registry Deletion Handler
     */
    const handleRemoveItem = async (boqItemId, itemName) => {
        if (!window.confirm(`PERMANENT ACTION: Purge "${itemName}" from project requirements?`)) return;
        
        try {
            await axiosInstance.delete(`/boq/items/${boqItemId}`);
            toast.success(`"${itemName}" node purged.`);
            fetchData(); 
        } catch (err) {
            toast.error('Registry Error: Could not remove node.');
        }
    };

    if (isLoading) {
        return (
            <div className="py-12 flex justify-center">
                <LoadingSpinner text="Calculating shortfall and requirements..." size="md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-[1.5rem] flex items-center border border-red-100 dark:border-red-800">
                <ExclamationCircleIcon className="h-5 w-5 mr-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
            </div>
        );
    }

    // Filter Logic: Prevent duplicate requirement registration
    const availableInventoryItems = inventoryItems.filter(
        invItem => !boq?.items?.some(boqItem => boqItem.inventory_item.id === invItem.id)
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Module Header */}
            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ArchiveBoxIcon className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Bill of Quantities (BoQ)</h2>
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                    Project Node: {projectId}
                </span>
            </div>
            
            <div className="p-8">
                {/* Deployment Console (Requirement Form) */}
                {canManageBoQ && (
                    <div className="mb-10 p-6 bg-gray-50/50 dark:bg-gray-900/40 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner">
                        <div className="flex items-center gap-2 mb-6 ml-1">
                            <PlusIcon className="h-4 w-4 text-emerald-500 stroke-[3px]" />
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Register Material Requirement</h3>
                        </div>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-6 space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU Identification</label>
                                <select 
                                    value={selectedItemId} 
                                    onChange={e => setSelectedItemId(e.target.value)}
                                    className="modern-input h-12 text-xs font-bold"
                                >
                                    <option value="">-- SELECT FROM CATALOG --</option>
                                    {availableInventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.sku || 'NO-SKU'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Quantity</label>
                                <input 
                                    type="number" 
                                    value={quantityRequired} 
                                    onChange={e => setQuantityRequired(e.target.value)} 
                                    min="0.01" 
                                    step="any" 
                                    className="modern-input h-12 text-xs font-bold"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4 stroke-[3px]" />}
                                    Commit to BoQ
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* BoQ Registry Table */}
                <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900/20">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Material Description</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Required</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Current Stock</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Site Status</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit</th>
                                {canManageBoQ && <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Protocol</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {boq?.items?.length > 0 ? boq.items.map(item => {
                                const shortfall = Math.max(0, item.quantity_required - (item.inventory_item?.quantity || 0));
                                return (
                                    <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="py-5 px-8">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{item.inventory_item?.name}</div>
                                            <div className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">REF: {item.inventory_item?.sku || 'GENERIC'}</div>
                                        </td>
                                        <td className="py-5 px-6 text-right font-black text-gray-900 dark:text-white text-sm">{item.quantity_required}</td>
                                        <td className="py-5 px-6 text-right text-gray-400 font-bold text-xs">{item.inventory_item?.quantity || 0}</td>
                                        <td className="py-5 px-6 text-right">
                                            {shortfall > 0 ? (
                                                <div className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                                    <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                                                    LACKING: {shortfall.toFixed(2)}
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                                    <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                                                    STOCK READY
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{item.inventory_item?.unit || 'pcs'}</td>
                                        {canManageBoQ && (
                                            <td className="py-5 px-8 text-center">
                                                <button 
                                                    onClick={() => handleRemoveItem(item.id, item.inventory_item?.name)} 
                                                    className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={canManageBoQ ? 6 : 5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <ArchiveBoxIcon className="h-10 w-10 text-gray-200" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                                                Registry empty: No requirements logged for this project node
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Status Key Telemetry */}
                <div className="mt-8 flex gap-6 text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-200"></div> 
                        Shortfall Detected
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div> 
                        Deployment Operational
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProjectBoQ;