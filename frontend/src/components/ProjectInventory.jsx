import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryDisplayName } from '../utils/inventoryI18n';
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
    const { t, i18n } = useTranslation();
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

    // Material Request Form State
    const [selectedRequestItemId, setSelectedRequestItemId] = useState('');
    const [quantityToRequest, setQuantityToRequest] = useState(1);
    const [requestNote, setRequestNote] = useState('');
    const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);

    // Authorization Clearance
    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);
    const canRequestMaterials = user && (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);

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

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!selectedRequestItemId) {
            toast.warn('Select a material from catalog to request.');
            return;
        }
        if (!quantityToRequest || Number(quantityToRequest) <= 0) {
            toast.warn('Enter a valid quantity to request.');
            return;
        }

        setIsRequestSubmitting(true);
        try {
            const payload = {
                project_id: parseInt(projectId, 10),
                inventory_item_id: parseInt(selectedRequestItemId, 10),
                quantity: parseFloat(quantityToRequest),
                note: requestNote || null,
            };
            await axiosInstance.post('/shopping-list/requests', payload);
            toast.success('Material request sent to procurement list.');

            setSelectedRequestItemId('');
            setQuantityToRequest(1);
            setRequestNote('');
        } catch (error) {
            console.error('Material request failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to submit material request.');
        } finally {
            setIsRequestSubmitting(false);
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
        <div className="mt-6">
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium rounded-2xl">
                    {error}
                </div>
            )}
            <header className="flex justify-between items-center mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <InboxStackIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        {t('local_stock')}
                    </h2>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">
                        {projectInventory.length} {t('registry_nodes', { defaultValue: 'items' })}
                    </span>
                </div>
            </header>

            <div className="p-8">
                {/* Deployment Console (Allocation Form) */}
                {canManageInventory && (
                    <div className="mb-10 p-6 bg-gray-50/50 dark:bg-gray-900/40 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner">
                        <div className="flex items-center gap-2 mb-6 ml-1">
                            <PlusIcon className="h-4 w-4 text-emerald-500 stroke-[3px]" />
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t('allocate_node_to_site')}</h3>
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
                                        <option key={item.id} value={item.id}>{inventoryDisplayName(item, i18n.language)}</option>
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
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('deployment_zone', { defaultValue: 'Deployment Zone' })}</label>
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
                                className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4 stroke-[3px]" />}
                                {t('deploy_to_site')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Material Request Console (Team Leaders & Above) */}
                {canRequestMaterials && (
                    <div className="mb-10 p-6 bg-amber-50/60 dark:bg-amber-900/20 rounded-[2rem] border border-amber-100 dark:border-amber-800 shadow-inner">
                        <div className="flex items-center gap-2 mb-6 ml-1">
                            <PlusIcon className="h-4 w-4 text-amber-500 stroke-[3px]" />
                            <h3 className="text-[10px] font-black text-amber-700 dark:text-amber-200 uppercase tracking-[0.2em]">
                                Request Materials from Procurement
                            </h3>
                        </div>
                        <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest ml-1">
                                    Material SKU
                                </label>
                                <select
                                    value={selectedRequestItemId}
                                    onChange={e => setSelectedRequestItemId(e.target.value)}
                                    className="modern-input h-12 text-xs font-bold"
                                >
                                    <option value="">-- SELECT SKU --</option>
                                    {inventoryCatalog.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {inventoryDisplayName(item, i18n.language)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest ml-1">
                                    Requested Quantity
                                </label>
                                <input
                                    type="number"
                                    value={quantityToRequest}
                                    onChange={e => setQuantityToRequest(e.target.value)}
                                    min="0.01"
                                    step="any"
                                    className="modern-input h-12 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest ml-1">
                                    Context / Notes (optional)
                                </label>
                                <textarea
                                    value={requestNote}
                                    onChange={e => setRequestNote(e.target.value)}
                                    rows={2}
                                    placeholder="Where and when is this needed?"
                                    className="modern-input h-12 text-xs font-bold resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isRequestSubmitting}
                                className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-amber-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isRequestSubmitting ? (
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                ) : (
                                    <PlusIcon className="h-4 w-4 stroke-[3px]" />
                                )}
                                {t('submit_request')}
                            </button>
                        </form>
                    </div>
                )}

                {/* Local Inventory Registry Table */}
                <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900/20">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('material_identifier', { defaultValue: 'Material Identifier' })}</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('site_quantity')}</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('unit')}</th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('specific_zone')}</th>
                                {canManageInventory && <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">{t('protocol')}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {projectInventory.length > 0 ? projectInventory.map(item => (
                                <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-5 px-8">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{inventoryDisplayName(item.inventory_item, i18n.language)}</div>
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
                                                onClick={() => handleRemoveItem(item.id, inventoryDisplayName(item.inventory_item, i18n.language))} 
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