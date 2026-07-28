import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    DocumentCheckIcon, 
    ClockIcon,
    PlusIcon,
    XMarkIcon,
    BuildingStorefrontIcon,
    CurrencyIslandicIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
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
        invoice_number: 'RK-2026-9814',
        amount: '148500',
        category: 'Materials',
        notes: 'Innkaup á stofnköplum og tengidósum fyrir verkefni.'
    });

    useEffect(() => {
        if (isCreateOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isCreateOpen]);

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
            toast.success(isIcelandic ? 'Birgjareikningur skráður í samþykktarferli!' : 'Supplier invoice queued for approval!');
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

    // Calculate Summary Metrics
    const pendingInvoices = approvals.filter(a => a.status === 'Pending');
    const approvedInvoices = approvals.filter(a => a.status === 'Approved');
    const totalPendingAmount = pendingInvoices.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalApprovedAmount = approvedInvoices.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const getSupplierBadgeStyle = (supplier) => {
        const s = (supplier || '').toLowerCase();
        if (s.includes('reykjafell')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        if (s.includes('rónning') || s.includes('ronning')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        if (s.includes('ískraft') || s.includes('iskraft')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    };

    return (
        <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                        <ClockIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">
                            {isIcelandic ? 'Í bið um samþykki' : 'Pending Approvals'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-gray-900 dark:text-white">{pendingInvoices.length}</span>
                            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                                ({Math.round(totalPendingAmount).toLocaleString()} kr.)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                        <CheckCircleIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">
                            {isIcelandic ? 'Samþykkt í mánuðinum' : 'Approved This Month'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-gray-900 dark:text-white">{approvedInvoices.length}</span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ({Math.round(totalApprovedAmount).toLocaleString()} kr.)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">
                            {isIcelandic ? 'Birgjar (Wholesalers)' : 'Wholesalers'}
                        </span>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Reykjafell • Rónning • Ískraft</span>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20 transform active:scale-95 shrink-0"
                    >
                        + {isIcelandic ? 'Nýr reikningur' : 'Queue Invoice'}
                    </button>
                </div>
            </div>

            {/* Approval Table Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                            <BuildingStorefrontIcon className="h-4 w-4 text-indigo-500" />
                            {isIcelandic ? 'Samþykktarkerfi Birgjareikninga' : 'Wholesaler Invoice Approval Pipeline'}
                        </h3>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {isIcelandic 
                                ? 'Yfirferð reikninga fyrir sjálfvirkan flutning í bókhaldskerfi (DK One).' 
                                : 'Multi-level approval workflow before DK One ledger sync.'}
                        </p>
                    </div>
                    <button onClick={fetchApprovals} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Refresh">
                        <ArrowPathIcon className="h-4 w-4" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-16 text-xs font-bold text-gray-400 animate-pulse">
                        {isIcelandic ? 'Sæki samþykktarferli birgja...' : 'Loading wholesaler invoices...'}
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="text-center py-16 p-8 space-y-3">
                        <DocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                            {isIcelandic ? 'Engir birgjareikningar í bið' : 'No Supplier Invoices Pending Approval'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {approvals.map((appr) => (
                            <div key={appr.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 transition">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${getSupplierBadgeStyle(appr.supplier_name)}`}>
                                            {appr.supplier_name}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                                            #{appr.invoice_number}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">({appr.category || 'Materials'})</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{appr.notes || 'Innkauparikningur neysluveitu'}</p>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <span className="text-sm font-black font-mono text-gray-900 dark:text-white block">
                                            {Math.round(appr.amount || 0).toLocaleString()} kr.
                                        </span>
                                        <span className="text-[9px] font-black uppercase text-gray-400">
                                            {appr.created_at ? new Date(appr.created_at).toLocaleDateString() : 'Í dag'}
                                        </span>
                                    </div>

                                    {appr.status === 'Pending' ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleReview(appr.id, 'Approved')}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-md shadow-emerald-500/20"
                                            >
                                                {isIcelandic ? 'Samþykkja' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleReview(appr.id, 'Rejected')}
                                                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-md shadow-red-500/20"
                                            >
                                                {isIcelandic ? 'Hafna' : 'Reject'}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                            appr.status === 'Approved' 
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                        }`}>
                                            {appr.status === 'Approved' ? (isIcelandic ? '✅ Samþykkt' : 'Approved') : (isIcelandic ? '❌ Hafnað' : 'Rejected')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Approval Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/70 backdrop-blur-md p-4 flex items-center justify-center min-h-screen">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-700 my-auto relative">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'Skrá birgjareikning' : 'Queue Supplier Invoice'}
                            </h3>
                            <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateApproval} className="space-y-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Birgi (Wholesaler)*' : 'Wholesaler Name*'}
                                </label>
                                <select
                                    value={newApproval.supplier_name}
                                    onChange={(e) => setNewApproval({...newApproval, supplier_name: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                                >
                                    <option value="Reykjafell">Reykjafell</option>
                                    <option value="Rónning">Rónning</option>
                                    <option value="Ískraft">Ískraft</option>
                                    <option value="JÁCO / Vélaval">JÁCO / Vélaval</option>
                                </select>
                            </div>
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
                                placeholder={isIcelandic ? 'Upphæð kr.*' : 'Amount (ISK)*'}
                                value={newApproval.amount}
                                onChange={(e) => setNewApproval({...newApproval, amount: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-mono font-bold border-none text-indigo-600 dark:text-indigo-400"
                            />
                            <textarea
                                placeholder={isIcelandic ? 'Athugasemdir / Verknúmer...' : 'Notes / Project reference...'}
                                value={newApproval.notes}
                                onChange={(e) => setNewApproval({...newApproval, notes: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                                rows="3"
                            ></textarea>
                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                            >
                                {isIcelandic ? 'Senda í samþykktarferli' : 'Queue for Approval'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceApprovalQueue;
