import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PencilIcon, 
    TrashIcon, 
    PlusIcon, 
    BanknotesIcon, 
    DocumentTextIcon,
    BriefcaseIcon,
    UserIcon,
    EnvelopeIcon,
    MapPinIcon,
    ChevronLeftIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    TagIcon,
    CheckBadgeIcon,
    NoSymbolIcon,
    ReceiptPercentIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Currency Formatter for ISK (Icelandic Króna)
 */
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 kr.';
    return new Intl.NumberFormat('is-IS', { 
        style: 'currency', 
        currency: 'ISK', 
        maximumFractionDigits: 0 
    }).format(value);
};

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

const formatDateForInput = (dateString) => {
     if (!dateString) return '';
     try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
     } catch (e) { return ''; }
};

/**
 * Custom ISK Icon placeholder since Heroicons lacks a kr. symbol
 */
const IskIcon = () => (
    <span className="text-[10px] font-black leading-none text-indigo-600 dark:text-indigo-400">kr.</span>
);

function OfferPage() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data States
    const [offer, setOffer] = useState(null);
    const [inventoryCatalog, setInventoryCatalog] = useState([]);
    const [laborCatalog, setLaborCatalog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // UI States
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [headerFormData, setHeaderFormData] = useState({ client_name: '', client_address: '', client_email: '', expiry_date: '' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Line Item Entry States
    const [newItemType, setNewItemType] = useState('Labor');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('hour');
    const [newItemInventoryId, setNewItemInventoryId] = useState('');
    const [selectedLaborCatalogId, setSelectedLaborCatalogId] = useState('');

    const isSuperuser = user?.is_superuser;
    const canManageOffer = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);
    const canEditOffer = canManageOffer && offer?.status === 'Draft';

    const fetchOfferAndCatalogs = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [offerRes, invRes, laborRes] = await Promise.all([
                axiosInstance.get(`/offers/${offerId}`),
                axiosInstance.get('/inventory/', { params: { limit: 1000 } }),
                axiosInstance.get('/labor-catalog/')
            ]);
            
            const data = offerRes.data;
            setOffer(data);
            setHeaderFormData({
                client_name: data.client_name || '',
                client_address: data.client_address || '',
                client_email: data.client_email || '',
                expiry_date: formatDateForInput(data.expiry_date),
            });
            setInventoryCatalog(invRes.data);
            setLaborCatalog(laborRes.data);
        } catch (err) {
            setError('Commercial telemetry sync failed.');
            toast.error('Financial database connection unstable.');
        } finally {
            setIsLoading(false);
        }
    }, [offerId]);

    useEffect(() => { fetchOfferAndCatalogs(); }, [fetchOfferAndCatalogs]);

    const handleHeaderChange = (e) => setHeaderFormData({...headerFormData, [e.target.name]: e.target.value});

    const handleSaveHeader = async () => {
        try {
            const payload = { ...headerFormData, expiry_date: headerFormData.expiry_date || null };
            const response = await axiosInstance.put(`/offers/${offerId}`, payload);
            setOffer(response.data);
            setIsEditingHeader(false);
            toast.success('Commercial metadata updated.');
        } catch (err) { toast.error('Metadata update failed.'); }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const response = await axiosInstance.put(`/offers/${offerId}`, { status: newStatus });
            setOffer(response.data);
            toast.success(`Bid transition: ${newStatus}`);
        } catch (err) { toast.error('State transition rejected.'); }
    };

    const handleLaborCatalogChange = (e) => {
        const itemId = e.target.value;
        setSelectedLaborCatalogId(itemId);
        const selectedItem = laborCatalog.find(item => item.id.toString() === itemId);
        if (selectedItem) {
            setNewItemDesc(selectedItem.description);
            setNewItemPrice(selectedItem.default_unit_price.toString());
            setNewItemUnit(selectedItem.unit);
        } else {
            setNewItemDesc(''); setNewItemPrice(''); setNewItemUnit('hour');
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

        try {
            await axiosInstance.post(`/offers/${offerId}/items`, payload);
            toast.success('Line item appended.');
            setNewItemDesc(''); setNewItemQty(1); setNewItemPrice(''); 
            setNewItemInventoryId(''); setSelectedLaborCatalogId('');
            fetchOfferAndCatalogs();
        } catch (err) { toast.error('Failed to append line item.'); }
    };

    const handleRemoveLineItem = async (itemId) => {
        try {
            await axiosInstance.delete(`/offers/items/${itemId}`);
            toast.success('Item purged from bid.');
            fetchOfferAndCatalogs();
        } catch (err) { toast.error('Removal failed.'); }
    };

    const confirmDeleteOffer = async () => {
        try {
            await axiosInstance.delete(`/offers/${offerId}`);
            toast.success(`Proposal ${offer?.offer_number} decommissioned.`);
            navigate(`/projects/edit/${offer?.project_id}`);
        } catch (err) { toast.error("Purge protocol failed."); }
    };

    // Derived analytics
    const laborTotal = useMemo(() => offer?.line_items.filter(i => i.item_type === 'Labor').reduce((sum, i) => sum + i.total_price, 0) || 0, [offer]);
    const materialTotal = useMemo(() => offer?.line_items.filter(i => i.item_type === 'Material').reduce((sum, i) => sum + i.total_price, 0) || 0, [offer]);

    if (isLoading) return <LoadingSpinner text="Compiling financial telemetry..." size="lg" />;
    if (!offer) return <div className="p-32 text-center font-black uppercase text-gray-400 tracking-widest italic">Registry ID Not Found</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header: Identity & Navigation */}
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <Link to={`/projects/edit/${offer.project_id}`} className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Site Infrastructure
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <BanknotesIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none uppercase tracking-tighter">
                                {offer.offer_number}
                            </h1>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Commercial Proposal: {offer.title}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${
                        offer.status === 'Draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                        offer.status === 'Accepted' ? 'bg-green-50 text-green-700 border-green-100' : 
                        offer.status === 'Sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                        {offer.status}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <CalendarDaysIcon className="h-4 w-4" />
                        Issued: {formatDate(offer.issue_date)}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Bid Logic (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Financial Summary Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard label="Labor Subtotal" value={formatCurrency(laborTotal)} icon={<UserIcon />} />
                        <SummaryCard label="Material Subtotal" value={formatCurrency(materialTotal)} icon={<TagIcon />} />
                        <SummaryCard label="Proposal Valuation" value={formatCurrency(offer.total_amount)} icon={<CheckBadgeIcon />} highlight />
                    </div>

                    {/* Technical Line Items Table */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Technical Breakdown</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="py-5 px-8">Scope / Description</th>
                                        <th className="py-5 px-4 text-right">Qty</th>
                                        <th className="py-5 px-6 text-right">Unit Rate</th>
                                        <th className="py-5 px-8 text-right">Line Total</th>
                                        {canEditOffer && <th className="py-5 px-6"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {offer.line_items.map(item => (
                                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="py-5 px-8">
                                                <p className="font-bold text-gray-900 dark:text-white tracking-tight">{item.description}</p>
                                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">{item.item_type}</span>
                                            </td>
                                            <td className="py-5 px-4 text-right font-mono font-bold text-gray-600">{item.quantity}</td>
                                            <td className="py-5 px-6 text-right text-gray-400 font-medium italic">{formatCurrency(item.unit_price)}</td>
                                            <td className="py-5 px-8 text-right font-black text-gray-900 dark:text-white">{formatCurrency(item.total_price)}</td>
                                            {canEditOffer && (
                                                <td className="py-5 px-6 text-center">
                                                    <button onClick={() => handleRemoveLineItem(item.id)} className="p-2 text-gray-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100">
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {offer.line_items.length === 0 && (
                                        <tr><td colSpan="5" className="py-20 text-center text-gray-400 italic font-medium">Registry empty: No commercial lines defined.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Entry Terminal (Only in Draft) */}
                    {canEditOffer && (
                        <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                <PlusIcon className="h-5 w-5 text-indigo-600" /> Append Resource Line
                            </h3>
                            <form onSubmit={handleAddLineItem} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Protocol Type</label>
                                        <select value={newItemType} onChange={(e) => setNewItemType(e.target.value)} className="modern-input h-12 text-xs uppercase tracking-widest">
                                            <option value="Labor">Personnel (Labor Catalog)</option>
                                            <option value="Material">Inventory (Material List)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-8">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Target Asset</label>
                                        {newItemType === 'Labor' ? (
                                            <select value={selectedLaborCatalogId} onChange={handleLaborCatalogChange} className="modern-input h-12 text-xs tracking-tight">
                                                <option value="">-- Custom Labor Allocation --</option>
                                                {laborCatalog.map(i => <option key={i.id} value={i.id}>{i.description} ({formatCurrency(i.default_unit_price)} / {i.unit})</option>)}
                                            </select>
                                        ) : (
                                            <select value={newItemInventoryId} onChange={(e) => setNewItemInventoryId(e.target.value)} required className="modern-input h-12 text-xs tracking-tight">
                                                <option value="" disabled>-- Select Stock Reference --</option>
                                                {inventoryCatalog.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit || 'unit'})</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-4 border-t border-gray-50 dark:border-gray-700">
                                    <div className="md:col-span-6">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest">Scope Override</label>
                                        <input type="text" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} required readOnly={newItemType === 'Labor' && !!selectedLaborCatalogId} className="modern-input" placeholder="e.g., Specialized deployment labor" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest text-center">Qty</label>
                                        <input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} min="0.01" step="any" required className="modern-input text-center font-mono" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1 tracking-widest text-right">Unit Rate</label>
                                        <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} min="0" step="1" required readOnly={newItemType === 'Labor' && !!selectedLaborCatalogId} className="modern-input text-right font-mono" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg transition transform active:scale-95">
                                            Append
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>
                    )}
                </div>

                {/* Right Column: Administration (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Client Information Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Client Metadata
                            </h2>
                            {canEditOffer && !isEditingHeader && (
                                <button onClick={() => setIsEditingHeader(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
                                    <PencilIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {isEditingHeader ? (
                            <div className="space-y-4">
                                <input type="text" name="client_name" value={headerFormData.client_name} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Legal Entity Name" />
                                <input type="text" name="client_address" value={headerFormData.client_address} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Service Address" />
                                <input type="email" name="client_email" value={headerFormData.client_email} onChange={handleHeaderChange} className="modern-input h-10" placeholder="Billing Email" />
                                <input type="date" name="expiry_date" value={headerFormData.expiry_date} onChange={handleHeaderChange} className="modern-input h-10" />
                                <div className="flex gap-2 pt-4">
                                    <button onClick={handleSaveHeader} className="flex-1 h-10 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl">Commit</button>
                                    <button onClick={() => setIsEditingHeader(false)} className="flex-1 h-10 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-xl">Abort</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <DetailItem icon={<UserIcon />} label="Recipient" value={offer.client_name || 'N/A'} />
                                <DetailItem icon={<MapPinIcon />} label="Address" value={offer.client_address || 'Service address not provided'} />
                                <DetailItem icon={<EnvelopeIcon />} label="Email" value={offer.client_email || 'No billing email'} />
                                
                                <div className="mt-10 pt-6 border-t border-gray-50 flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-xl"><CalendarDaysIcon className="h-5 w-5 text-orange-400" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Validity Boundary</p>
                                        <p className="text-sm font-black text-orange-600">{formatDate(offer.expiry_date)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Command Center */}
                    {canManageOffer && (
                        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4" /> Management Command
                            </h3>
                            <div className="space-y-3">
                                {offer.status === 'Draft' && (
                                    <button onClick={() => handleStatusChange('Sent')} className="w-full flex items-center justify-center gap-2 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition transform active:scale-95 shadow-lg shadow-indigo-500/20">
                                        <PaperAirplaneIcon className="h-5 w-5" /> Dispatch Proposal
                                    </button>
                                )}
                                {offer.status === 'Sent' && (
                                    <>
                                        <button onClick={() => handleStatusChange('Accepted')} className="w-full flex items-center justify-center gap-2 h-14 bg-green-600 hover:bg-green-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition transform active:scale-95 shadow-lg shadow-green-500/20">
                                            <CheckBadgeIcon className="h-5 w-5" /> Confirm Acceptance
                                        </button>
                                        <button onClick={() => handleStatusChange('Rejected')} className="w-full flex items-center justify-center gap-2 h-14 bg-red-600 hover:bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition transform active:scale-95 shadow-lg shadow-red-500/20">
                                            <NoSymbolIcon className="h-5 w-5" /> Log Rejection
                                        </button>
                                    </>
                                )}
                                {(offer.status === 'Accepted' || offer.status === 'Rejected') && (
                                    <button onClick={() => handleStatusChange('Draft')} className="w-full flex items-center justify-center gap-2 h-14 bg-gray-800 hover:bg-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition border border-gray-700">
                                        <ArrowPathIcon className="h-5 w-5" /> Revert to Draft State
                                    </button>
                                )}
                                <button onClick={() => setIsDeleteModalOpen(true)} className="w-full flex items-center justify-center gap-2 h-14 bg-transparent border-2 border-red-900/50 hover:bg-red-900/20 text-red-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition">
                                    <TrashIcon className="h-5 w-5" /> Purge Commercial Data
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteOffer}
                title="Purge Commercial Bid"
                message={`CRITICAL: Permanent deactivation of proposal ${offer.offer_number}. All financial line items and historical audit records linked to this bid will be destroyed. This operation is irreversible.`}
                confirmText="Decommission Bid"
                type="danger"
            />
        </div>
    );
}

/**
 * Technical Sub-Components
 */
function SummaryCard({ label, value, icon, highlight = false }) {
    return (
        <div className={`p-6 rounded-[2rem] border shadow-sm transition-transform hover:-translate-y-1 ${highlight ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
            <div className={`p-2 rounded-xl w-fit mb-4 ${highlight ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                {React.cloneElement(icon, { className: `h-5 w-5 ${highlight ? 'text-white' : 'text-indigo-600'}` })}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-100' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-xl font-black ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</p>
        </div>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-50 transition-colors">
                {React.cloneElement(icon, { className: "h-4 w-4 text-gray-400 group-hover:text-indigo-600" })}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
            </div>
        </div>
    );
}

export default OfferPage;