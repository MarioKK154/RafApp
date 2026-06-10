import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { inventoryDisplayName, inventoryCategoryLine } from '../utils/inventoryI18n';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useInventoryCatalogShopFilter } from '../hooks/useInventoryCatalogShopFilter';
import LoadingSpinner from './LoadingSpinner';
import InventoryCatalogShopFilters from './InventoryCatalogShopFilters';
import {
    CubeIcon,
    PlusIcon,
    TrashIcon,
    MapPinIcon,
    InboxStackIcon,
    ArrowPathIcon,
    BuildingStorefrontIcon,
    ArrowsRightLeftIcon,
    ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';

function ProjectInventory({ projectId }) {
    const { t, i18n } = useTranslation();
    const [projectInventory, setProjectInventory] = useState([]);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [projectsList, setProjectsList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const [allocateMode, setAllocateMode] = useState('warehouse');
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedRequestItemId, setSelectedRequestItemId] = useState('');
    const [quantityToRequest, setQuantityToRequest] = useState(1);
    const [requestNote, setRequestNote] = useState('');
    const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);

    const [modal, setModal] = useState(null);
    const [modalQty, setModalQty] = useState('');
    const [transferDestId, setTransferDestId] = useState('');

    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);
    const canRequestMaterials =
        user && (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);
    const canExportData = user?.can_export_data || user?.role === 'admin' || user?.is_superuser;

    const {
        selectedShops,
        toggleShop,
        shopMatchMode,
        setShopMatchMode,
        buildCatalogParams,
    } = useInventoryCatalogShopFilter();

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const [projectInvResponse, catalogResponse, projectsResponse] = await Promise.all([
                axiosInstance.get(`/project-inventory/project/${projectId}`),
                axiosInstance.get('/inventory/catalog', {
                    params: buildCatalogParams({ limit: 4000 }),
                }),
                axiosInstance.get('/projects/', { params: { limit: 400 } }),
            ]);
            setProjectInventory(Array.isArray(projectInvResponse.data) ? projectInvResponse.data : []);
            setInventoryCatalog(Array.isArray(catalogResponse.data) ? catalogResponse.data : []);
            setProjectsList(Array.isArray(projectsResponse.data) ? projectsResponse.data : []);
        } catch (err) {
            console.error('Inventory fetch error:', err);
            setError('Registry Link Failure: Failed to load site stock.');
            toast.error('Could not sync project stock with warehouse.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, buildCatalogParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const catalogLabel = useCallback(
        (item) => {
            const name = inventoryDisplayName(item, i18n.language);
            const wh = item.warehouse_quantity != null ? Number(item.warehouse_quantity) : 0;
            return `${name} · WH: ${wh}`;
        },
        [i18n.language],
    );

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!selectedCatalogItemId) {
            toast.warn('Protocol Violation: Select a material from catalog.');
            return;
        }

        const qty = parseFloat(quantityToAdd);
        if (!qty || qty <= 0) {
            toast.warn('Enter a valid quantity.');
            return;
        }

        setIsSubmitting(true);
        try {
            const pid = parseInt(projectId, 10);
            const iid = parseInt(selectedCatalogItemId, 10);

            if (allocateMode === 'warehouse') {
                await axiosInstance.post('/project-inventory/issue-from-warehouse', {
                    project_id: pid,
                    inventory_item_id: iid,
                    quantity: qty,
                    location: location || null,
                });
                toast.success(t('issued_from_warehouse', { defaultValue: 'Stock issued from central warehouse to site.' }));
            } else {
                await axiosInstance.post('/project-inventory/', {
                    project_id: pid,
                    inventory_item_id: iid,
                    quantity: qty,
                    location: location || null,
                });
                toast.success(
                    t('site_adjustment_added', {
                        defaultValue: 'Quantity recorded on site (warehouse unchanged).',
                    }),
                );
            }

            setSelectedCatalogItemId('');
            setQuantityToAdd(1);
            setLocation('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Allocation failure.');
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
        } catch (err) {
            console.error('Material request failed:', err);
            toast.error(err.response?.data?.detail || 'Failed to submit material request.');
        } finally {
            setIsRequestSubmitting(false);
        }
    };

    const handleRemoveItem = async (projectInventoryItemId, itemName) => {
        if (
            !window.confirm(
                `Remove "${itemName}" from this project entirely? This does not return quantity to the warehouse (use Return for that).`,
            )
        )
            return;

        try {
            await axiosInstance.delete(`/project-inventory/${projectInventoryItemId}`);
            toast.success(`"${itemName}" removed from site record.`);
            fetchData();
        } catch (err) {
            console.error('Remove item failed:', err);
            toast.error('Registry Error: Failed to remove node.');
        }
    };

    const openReturnModal = (row) => {
        setModalQty(String(row.quantity));
        setModal({ type: 'return', row });
    };

    const openTransferModal = (row) => {
        setModalQty(String(row.quantity));
        setTransferDestId('');
        setModal({ type: 'transfer', row });
    };

    const submitReturn = async (e) => {
        e.preventDefault();
        if (!modal || modal.type !== 'return') return;
        const qty = parseFloat(modalQty);
        if (!qty || qty <= 0) {
            toast.warn('Enter a valid quantity.');
            return;
        }
        try {
            await axiosInstance.post('/project-inventory/return-to-warehouse', {
                project_id: parseInt(projectId, 10),
                inventory_item_id: modal.row.inventory_item.id,
                quantity: qty,
            });
            toast.success(t('returned_to_warehouse', { defaultValue: 'Stock returned to central warehouse.' }));
            setModal(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Return failed.');
        }
    };

    const submitTransfer = async (e) => {
        e.preventDefault();
        if (!modal || modal.type !== 'transfer') return;
        const dest = parseInt(transferDestId, 10);
        if (!dest || dest === parseInt(projectId, 10)) {
            toast.warn('Choose a different destination project.');
            return;
        }
        const qty = parseFloat(modalQty);
        if (!qty || qty <= 0) {
            toast.warn('Enter a valid quantity.');
            return;
        }
        try {
            await axiosInstance.post('/project-inventory/transfer-between-projects', {
                from_project_id: parseInt(projectId, 10),
                to_project_id: dest,
                inventory_item_id: modal.row.inventory_item.id,
                quantity: qty,
                location: null,
            });
            toast.success(t('transfer_complete', { defaultValue: 'Stock moved to the other project.' }));
            setModal(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Transfer failed.');
        }
    };

    const transferTargets = projectsList.filter((p) => p.id !== parseInt(projectId, 10));

    if (isLoading) {
        return (
            <div className="py-12 flex justify-center">
                <LoadingSpinner text={t('project_inventory_sync_loading', { defaultValue: 'Syncing site stock…' })} size="md" />
            </div>
        );
    }

    const warehouseSkusAvailable = inventoryCatalog.filter((i) => Number(i.warehouse_quantity || 0) > 0);

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
                <div className="mb-8 p-4 saas-card">
                    <InventoryCatalogShopFilters
                        selected={selectedShops}
                        onToggleShop={toggleShop}
                        shopMatch={shopMatchMode}
                        onShopMatchChange={setShopMatchMode}
                    />
                    <p className="mt-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                        {t('catalog_shop_picker_hint', {
                            defaultValue: 'Filters the material dropdowns below (allocate + requests).',
                        })}
                    </p>
                </div>

                {canManageInventory && (
                    <div className="mb-10 p-6 saas-card shadow-inner">
                        <div className="flex items-center gap-2 mb-4 ml-1">
                            <BuildingStorefrontIcon className="h-4 w-4 text-emerald-500 stroke-[3px]" />
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                {t('add_site_stock', { defaultValue: 'Add project stock' })}
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 mb-6 ml-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="allocMode"
                                    checked={allocateMode === 'warehouse'}
                                    onChange={() => setAllocateMode('warehouse')}
                                    className="text-indigo-600"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                    {t('issue_from_warehouse', { defaultValue: 'Issue from central warehouse' })}
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="allocMode"
                                    checked={allocateMode === 'adjustment'}
                                    onChange={() => setAllocateMode('adjustment')}
                                    className="text-indigo-600"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                    {t('direct_site_entry', {
                                        defaultValue: 'Direct site entry (correction / delivery — no warehouse deduction)',
                                    })}
                                </span>
                            </label>
                        </div>
                        {allocateMode === 'warehouse' && warehouseSkusAvailable.length === 0 && (
                            <p className="mb-4 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                                {t('warehouse_empty_hint', {
                                    defaultValue:
                                        'No central warehouse quantity is recorded for any SKU yet. Use catalog edit to set warehouse stock, return material from a project, or use direct site entry.',
                                })}
                            </p>
                        )}
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Material SKU
                                </label>
                                <select
                                    value={selectedCatalogItemId}
                                    onChange={(e) => setSelectedCatalogItemId(e.target.value)}
                                    className="modern-input h-12 text-xs font-bold"
                                >
                                    <option value="">-- SELECT SKU --</option>
                                    {(allocateMode === 'warehouse' ? warehouseSkusAvailable : inventoryCatalog).map(
                                        (item) => (
                                            <option key={item.id} value={item.id}>
                                                {catalogLabel(item)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={quantityToAdd}
                                    onChange={(e) => setQuantityToAdd(e.target.value)}
                                    min="0.01"
                                    step="any"
                                    className="modern-input h-12 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    {t('deployment_zone', { defaultValue: 'Deployment Zone' })}
                                </label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Container / Zone"
                                        className="modern-input h-12 pl-11 text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="saas-btn-primary h-12 text-[10px] uppercase tracking-[0.2em] rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 w-full mt-4"
                            >
                                {isSubmitting ? (
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                ) : allocateMode === 'warehouse' ? (
                                    <BuildingStorefrontIcon className="h-4 w-4 stroke-[3px]" />
                                ) : (
                                    <PlusIcon className="h-4 w-4 stroke-[3px]" />
                                )}
                                {allocateMode === 'warehouse'
                                    ? t('issue_from_warehouse_btn', { defaultValue: 'Issue to site' })
                                    : t('deploy_to_site')}
                            </button>
                        </form>
                    </div>
                )}

                {canRequestMaterials && (
                    <div className="mb-10 p-6 saas-card">
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
                                    onChange={(e) => setSelectedRequestItemId(e.target.value)}
                                    className="modern-input h-12 text-xs font-bold"
                                >
                                    <option value="">-- SELECT SKU --</option>
                                    {inventoryCatalog.map((item) => (
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
                                    onChange={(e) => setQuantityToRequest(e.target.value)}
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
                                    onChange={(e) => setRequestNote(e.target.value)}
                                    rows={2}
                                    placeholder="Where and when is this needed?"
                                    className="modern-input h-12 text-xs font-bold resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isRequestSubmitting}
                                className="saas-btn-primary h-12 text-[10px] uppercase tracking-[0.2em] rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 w-full mt-4"
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

                <div className="overflow-hidden saas-card">
                    <table className={`w-full text-left border-collapse ${!canExportData ? 'protect-data' : ''}`}>
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {t('material_identifier', { defaultValue: 'Material Identifier' })}
                                </th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">
                                    {t('site_quantity')}
                                </th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {t('unit')}
                                </th>
                                <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    {t('specific_zone')}
                                </th>
                                {canManageInventory && (
                                    <th className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">
                                        {t('movements', { defaultValue: 'Movements' })}
                                    </th>
                                )}
                                {canManageInventory && (
                                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">
                                        {t('protocol')}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {projectInventory.length > 0 ? (
                                projectInventory.map((item) => (
                                    <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="py-5 px-8">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">
                                                {inventoryDisplayName(item.inventory_item, i18n.language)}
                                            </div>
                                            <div className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">
                                                {inventoryCategoryLine(item.inventory_item, i18n.language)} · ID:{' '}
                                                {item.inventory_item?.id}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {item.inventory_item?.unit || 'pcs'}
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                                                {item.location || 'Main Site'}
                                            </div>
                                        </td>
                                        {canManageInventory && (
                                            <td className="py-5 px-6">
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openReturnModal(item)}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition"
                                                        title="Return to warehouse"
                                                    >
                                                        <ArrowUturnLeftIcon className="h-4 w-4" />
                                                        {t('to_warehouse', { defaultValue: 'Warehouse' })}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openTransferModal(item)}
                                                        disabled={transferTargets.length === 0}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border border-violet-100 dark:border-violet-800 hover:bg-violet-100 transition disabled:opacity-40"
                                                        title="Transfer to another project"
                                                    >
                                                        <ArrowsRightLeftIcon className="h-4 w-4" />
                                                        {t('transfer', { defaultValue: 'Transfer' })}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {canManageInventory && (
                                            <td className="py-5 px-8 text-center">
                                                <button
                                                    onClick={() =>
                                                        handleRemoveItem(
                                                            item.id,
                                                            inventoryDisplayName(item.inventory_item, i18n.language),
                                                        )
                                                    }
                                                    className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                    title="Remove row"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={canManageInventory ? 6 : 4} className="py-20 text-center">
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

            {modal && modal.type === 'return' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                            {t('return_to_warehouse_title', { defaultValue: 'Return to central warehouse' })}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                            {inventoryDisplayName(modal.row.inventory_item, i18n.language)} — max {modal.row.quantity}{' '}
                            {modal.row.inventory_item?.unit || ''}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                            {t('return_partial_hint', {
                                defaultValue:
                                    'Enter how much to send back to the warehouse (for example 50 m of 200 m issued). The rest stays on this project.',
                            })}
                        </p>
                        <form onSubmit={submitReturn} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    max={modal.row.quantity}
                                    value={modalQty}
                                    onChange={(e) => setModalQty(e.target.value)}
                                    className="modern-input w-full"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModal(null)}
                                    className="px-5 py-2 text-[10px] font-black uppercase text-gray-500"
                                >
                                    {t('cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl"
                                >
                                    {t('confirm_return', { defaultValue: 'Confirm return' })}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modal && modal.type === 'transfer' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                            {t('transfer_project_title', { defaultValue: 'Transfer to another project' })}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                            {inventoryDisplayName(modal.row.inventory_item, i18n.language)} — max {modal.row.quantity}{' '}
                            {modal.row.inventory_item?.unit || ''}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                            {t('transfer_partial_hint', {
                                defaultValue:
                                    'Move only part of the on-site quantity to another project; the remainder stays here.',
                            })}
                        </p>
                        <form onSubmit={submitTransfer} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">
                                    Destination project
                                </label>
                                <select
                                    value={transferDestId}
                                    onChange={(e) => setTransferDestId(e.target.value)}
                                    className="modern-input w-full"
                                    required
                                >
                                    <option value="">-- SELECT PROJECT --</option>
                                    {transferTargets.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name || p.project_number || `Project #${p.id}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    max={modal.row.quantity}
                                    value={modalQty}
                                    onChange={(e) => setModalQty(e.target.value)}
                                    className="modern-input w-full"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModal(null)}
                                    className="px-5 py-2 text-[10px] font-black uppercase text-gray-500"
                                >
                                    {t('cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase rounded-xl"
                                >
                                    {t('confirm_transfer', { defaultValue: 'Transfer' })}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectInventory;
