// frontend/src/pages/OfferPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';

const formatCurrencyISK = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';

const OFFER_STATUSES = ["Draft", "Sent", "Accepted", "Rejected"];

function OfferPage() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [offer, setOffer] = useState(null);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for editing header
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [headerFormData, setHeaderFormData] = useState({ client_name: '', client_address: '', client_email: '', expiry_date: '' });

    // State for adding line item
    const [newItemType, setNewItemType] = useState('Labor'); // 'Labor' or 'Material'
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState(0);
    const [newItemInventoryId, setNewItemInventoryId] = useState('');

    // State for deleting offer
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManageOffer = user && ['admin', 'project manager'].includes(user.role);
    const canEditOffer = canManageOffer && offer?.status === 'Draft';

    const fetchOfferAndCatalog = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [offerResponse, catalogResponse] = await Promise.all([
                axiosInstance.get(`/offers/${offerId}`),
                axiosInstance.get('/inventory/') // For material dropdown
            ]);
            setOffer(offerResponse.data);
            setHeaderFormData({
                client_name: offerResponse.data.client_name || '',
                client_address: offerResponse.data.client_address || '',
                client_email: offerResponse.data.client_email || '',
                expiry_date: formatDateForInput(offerResponse.data.expiry_date),
            });
            setInventoryCatalog(catalogResponse.data);
        } catch (err) {
            setError('Failed to load offer data.');
            toast.error('Failed to load offer data.');
        } finally {
            setIsLoading(false);
        }
    }, [offerId]);

    useEffect(() => {
        fetchOfferAndCatalog();
    }, [fetchOfferAndCatalog]);

    const handleHeaderChange = (e) => {
        setHeaderFormData({ ...headerFormData, [e.target.name]: e.target.value });
    };

    const handleSaveHeader = async () => {
        try {
            const payload = { ...headerFormData, expiry_date: headerFormData.expiry_date || null };
            const response = await axiosInstance.put(`/offers/${offerId}`, payload);
            setOffer(response.data);
            setIsEditingHeader(false);
            toast.success('Offer details updated.');
        } catch (err) {
            toast.error('Failed to update offer details.');
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Are you sure you want to change the status to "${newStatus}"?`)) return;
        try {
            const response = await axiosInstance.put(`/offers/${offerId}`, { status: newStatus });
            setOffer(response.data);
            toast.success(`Offer status changed to ${newStatus}.`);
        } catch (err) {
            toast.error('Failed to update status.');
        }
    };

    const handleAddLineItem = async (e) => {
        e.preventDefault();
        const payload = {
            item_type: newItemType,
            description: newItemDesc,
            quantity: parseFloat(newItemQty),
            unit_price: parseFloat(newItemPrice),
            inventory_item_id: newItemType === 'Material' ? parseInt(newItemInventoryId) : null,
        };
        // Basic validation
        if (!payload.description) { toast.warn("Description is required."); return; }
        if (newItemType === 'Material' && !payload.inventory_item_id) { toast.warn("Please select a material."); return; }

        try {
            await axiosInstance.post(`/offers/${offerId}/items`, payload);
            toast.success('Line item added.');
            // Reset form & refetch
            setNewItemDesc(''); setNewItemQty(1); setNewItemPrice(0); setNewItemInventoryId('');
            fetchOfferAndCatalog();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add line item.');
        }
    };
    
    const handleRemoveLineItem = async (itemId, itemDesc) => {
         if (!window.confirm(`Remove line item "${itemDesc}"?`)) return;
         try {
            await axiosInstance.delete(`/offers/items/${itemId}`);
            toast.success('Line item removed.');
            fetchOfferAndCatalog();
         } catch (err) {
             toast.error('Failed to remove line item.');
         }
    };

    const confirmDeleteOffer = async () => {
        try {
            await axiosInstance.delete(`/offers/${offerId}`);
            toast.success(`Offer ${offer?.offer_number} deleted.`);
            navigate(`/projects/edit/${offer?.project_id}`); // Go back to project page
        } catch (err) {
            toast.error("Failed to delete offer.");
        } finally {
            setIsDeleteModalOpen(false);
        }
    };


    if (isLoading) { return <LoadingSpinner text="Loading Offer..." />; }
    if (error) { return <p className="text-center p-8 text-red-500">{error}</p>; }
    if (!offer) { return <p className="text-center p-8">Offer not found.</p>; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Offer: {offer.offer_number}</h1>
                    <p className="text-gray-500">{offer.title}</p>
                    <p className="text-sm">Project: <Link to={`/projects/edit/${offer.project_id}`} className="text-blue-600 hover:underline">{offer.project?.name || offer.project_id}</Link></p>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${ offer.status === 'Draft' ? 'bg-yellow-200 text-yellow-800' : offer.status === 'Accepted' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800' }`}>
                        {offer.status}
                    </span>
                    <p className="text-xs mt-1">Issued: {formatDate(offer.issue_date)}</p>
                    {offer.expiry_date && <p className="text-xs">Expires: {formatDate(offer.expiry_date)}</p>}
                </div>
            </div>

            {/* Client Info & Edit Header Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold">Client Information</h2>
                    {canEditOffer && !isEditingHeader && (
                        <button onClick={() => setIsEditingHeader(true)} className="text-blue-600 hover:underline text-sm flex items-center">
                            <PencilIcon className="h-4 w-4 mr-1"/> Edit Client/Expiry
                        </button>
                    )}
                </div>
                {isEditingHeader ? (
                    <div className="space-y-3">
                        <div><label className="text-sm">Client Name</label><input type="text" name="client_name" value={headerFormData.client_name} onChange={handleHeaderChange} className="mt-1 block w-full rounded-md"/></div>
                        <div><label className="text-sm">Client Address</label><input type="text" name="client_address" value={headerFormData.client_address} onChange={handleHeaderChange} className="mt-1 block w-full rounded-md"/></div>
                        <div><label className="text-sm">Client Email</label><input type="email" name="client_email" value={headerFormData.client_email} onChange={handleHeaderChange} className="mt-1 block w-full rounded-md"/></div>
                        <div><label className="text-sm">Expiry Date</label><input type="date" name="expiry_date" value={headerFormData.expiry_date} onChange={handleHeaderChange} className="mt-1 block w-full rounded-md"/></div>
                        <div className="flex justify-end space-x-2">
                             <button onClick={() => setIsEditingHeader(false)} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
                             <button onClick={handleSaveHeader} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {offer.client_name || 'N/A'}</p>
                        <p><strong>Address:</strong> {offer.client_address || 'N/A'}</p>
                        <p><strong>Email:</strong> {offer.client_email || 'N/A'}</p>
                    </div>
                )}
            </div>

            {/* Line Items Table */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                 <h2 className="text-xl font-semibold mb-4">Line Items</h2>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                             <tr>
                                <th className="py-2 px-4">Description</th>
                                <th className="py-2 px-4 text-right">Qty</th>
                                <th className="py-2 px-4 text-right">Unit Price</th>
                                <th className="py-2 px-4 text-right">Total</th>
                                {canEditOffer && <th className="py-2 px-4">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {offer.line_items.map(item => (
                                <tr key={item.id} className="border-b dark:border-gray-700">
                                    <td className="py-2 px-4">{item.description} {item.item_type === 'Material' && <span className="text-xs text-gray-500">(Material)</span>}</td>
                                    <td className="py-2 px-4 text-right">{item.quantity}</td>
                                    <td className="py-2 px-4 text-right">{formatCurrencyISK(item.unit_price)}</td>
                                    <td className="py-2 px-4 text-right font-semibold">{formatCurrencyISK(item.total_price)}</td>
                                     {canEditOffer && (
                                        <td className="py-2 px-4">
                                            <button onClick={() => handleRemoveLineItem(item.id, item.description)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4"/></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-semibold text-base">
                                <td colSpan={canEditOffer ? 3 : 2} className="py-3 px-4 text-right">Grand Total:</td>
                                <td className="py-3 px-4 text-right">{formatCurrencyISK(offer.total_amount)}</td>
                                {canEditOffer && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                     {offer.line_items.length === 0 && <p className="p-4 text-center text-gray-500">No line items added yet.</p>}
                 </div>
            </div>
            
            {/* Add Line Item Form (Only if Draft) */}
            {canEditOffer && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                    <h3 className="text-lg font-semibold mb-3">Add Line Item</h3>
                    <form onSubmit={handleAddLineItem} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <div className="md:col-span-2">
                             <label className="text-sm">Type</label>
                             <select value={newItemType} onChange={(e) => setNewItemType(e.target.value)} className="mt-1 block w-full rounded-md">
                                <option>Labor</option>
                                <option>Material</option>
                             </select>
                        </div>
                        <div className="md:col-span-4">
                             <label className="text-sm">Description</label>
                             <input type="text" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} required className="mt-1 block w-full rounded-md"/>
                        </div>
                         {newItemType === 'Material' && (
                             <div className="md:col-span-6">
                                <label className="text-sm">Select Material from Catalog</label>
                                <select value={newItemInventoryId} onChange={(e) => setNewItemInventoryId(e.target.value)} required className="mt-1 block w-full rounded-md">
                                     <option value="" disabled>-- Choose Material --</option>
                                     {inventoryCatalog.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                                </select>
                            </div>
                         )}
                         <div className="md:col-span-2">
                             <label className="text-sm">Quantity</label>
                             <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} min="0.01" step="any" required className="mt-1 block w-full rounded-md"/>
                        </div>
                         <div className="md:col-span-2">
                            <label className="text-sm">Unit Price (ISK)</label>
                            <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} min="0" step="1" required className="mt-1 block w-full rounded-md"/>
                        </div>
                        <div className="md:col-span-2">
                             <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center">
                                <PlusIcon className="h-5 w-5 mr-1"/> Add Item
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
             {/* Status Change & Delete Buttons (Only for Managers/Admins) */}
             {canManageOffer && (
                <div className="mt-8 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex space-x-2">
                         {offer.status === 'Draft' && <button onClick={() => handleStatusChange('Sent')} className="px-4 py-2 bg-cyan-600 text-white rounded">Mark as Sent</button>}
                         {offer.status === 'Sent' && <button onClick={() => handleStatusChange('Accepted')} className="px-4 py-2 bg-green-600 text-white rounded">Mark as Accepted</button>}
                         {offer.status === 'Sent' && <button onClick={() => handleStatusChange('Rejected')} className="px-4 py-2 bg-red-600 text-white rounded">Mark as Rejected</button>}
                         {(offer.status === 'Accepted' || offer.status === 'Rejected') && <button onClick={() => handleStatusChange('Draft')} className="px-4 py-2 bg-yellow-600 text-white rounded">Revert to Draft</button>}
                    </div>
                     <button onClick={() => setIsDeleteModalOpen(true)} className="px-4 py-2 bg-red-700 text-white rounded flex items-center"><TrashIcon className="h-4 w-4 mr-1"/> Delete Offer</button>
                </div>
             )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteOffer}
                title="Delete Offer"
                message={`Are you sure you want to permanently delete offer ${offer.offer_number}? This cannot be undone.`}
            />
        </div>
    );
}

export default OfferPage;