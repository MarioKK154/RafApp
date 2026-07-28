import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    DocumentCheckIcon, 
    ClockIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const InvoiceApprovalQueue = () => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');

    const [approvals, setApprovals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [newApproval, setNewApproval] = useState({
        supplier_name: 'Reykjafell',
        invoice_number: '',
        amount: '',
        category: 'Materials',
        notes: ''
    });

    const fetchApprovals = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/approvals/');
            setApprovals(res.data || []);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, []);

    const handleCreateApproval = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/approvals/', {
                ...newApproval,
                amount: parseFloat(newApproval.amount)
            });
            toast.success(isIcelandic ? 'Reikningur móttekinn og sendur í samþykktarferli!' : 'Invoice queued for approval!');
            setIsCreateOpen(false);
            setNewApproval({ supplier_name: 'Reykjafell', invoice_number: '', amount: '', category: 'Materials', notes: '' });
            fetchApprovals();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to queue invoice.');
        }
    };

    const handleReview = async (id, status) => {
        try {
            await axiosInstance.patch(`/approvals/${id}`, { status });
            toast.success(isIcelandic ? `Reikningur ${status === 'Approved' ? 'samþykktur' : 'hafnað'}!` : `Invoice ${status.toLowerCase()}!`);
            fetchApprovals();
        } catch (err) {
            toast.error('Failed to review invoice.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/60 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60">
                <div>
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                        {isIcelandic ? 'Samþykktarkerfi reikninga (Multi-level Invoice Approvals)' : 'Invoice Approval Pipeline'}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1">
                        {isIcelandic 
                            ? 'Fara yfir reikninga birgja (Reykjafell, Rónning, Ískraft) og samþykkja fyrir bókhald.' 
                            : 'Review and approve wholesaler invoices before exporting to accounting.'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/20 transform active:scale-95"
                >
                    <PlusIcon className="h-4 w-4" /> {isIcelandic ? 'Skrá reikning' : 'Queue Invoice'}
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold animate-pulse">
                    {isIcelandic ? 'Sæki samþykktarferli...' : 'Loading invoice approvals...'}
                </div>
            ) : approvals.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 space-y-3">
                    <DocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto" />
                    <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                        {isIcelandic ? 'Engir reikningar í bið' : 'No Invoices Pending Approval'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-medium">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-400 font-black uppercase text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">{isIcelandic ? 'Birgir' : 'Supplier'}</th>
                                    <th className="px-6 py-4">{isIcelandic ? 'Reikningsnr.' : 'Invoice #'}</th>
                                    <th className="px-6 py-4">{isIcelandic ? 'Upphæð (kr.)' : 'Amount (ISK)'}</th>
                                    <th className="px-6 py-4">{isIcelandic ? 'Staða' : 'Status'}</th>
                                    <th className="px-6 py-4 text-right">{isIcelandic ? 'Aðgerðir' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {approvals.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                                        <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{app.supplier_name}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{app.invoice_number}</td>
                                        <td className="px-6 py-4 font-black text-gray-900 dark:text-white">
                                            {new Intl.NumberFormat('is-IS').format(app.amount)} kr.
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                app.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                                                'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {app.status === 'Pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleReview(app.id, 'Approved')}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition"
                                                    >
                                                        {isIcelandic ? 'Samþykkja' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(app.id, 'Rejected')}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition"
                                                    >
                                                        {isIcelandic ? 'Hafna' : 'Reject'}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Invoice Approval Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                            {isIcelandic ? 'Skrá reikning í samþykktarferli' : 'Queue Supplier Invoice'}
                        </h3>
                        <form onSubmit={handleCreateApproval} className="space-y-3">
                            <select
                                value={newApproval.supplier_name}
                                onChange={(e) => setNewApproval({...newApproval, supplier_name: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            >
                                <option value="Reykjafell">Reykjafell hf.</option>
                                <option value="Rónning">Rónning hf.</option>
                                <option value="Ískraft">Ískraft hf.</option>
                                <option value="JÁCO">JÁCO hf.</option>
                            </select>
                            <input
                                type="text"
                                required
                                placeholder={isIcelandic ? 'Reikningsnúmer*' : 'Invoice Number*'}
                                value={newApproval.invoice_number}
                                onChange={(e) => setNewApproval({...newApproval, invoice_number: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <input
                                type="number"
                                required
                                placeholder={isIcelandic ? 'Upphæð án vsk (kr.)*' : 'Amount (ISK)*'}
                                value={newApproval.amount}
                                onChange={(e) => setNewApproval({...newApproval, amount: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl"
                                >
                                    {isIcelandic ? 'Hætta við' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                                >
                                    {isIcelandic ? 'Skrá í biðröð' : 'Queue Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceApprovalQueue;
