import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BanknotesIcon, 
    CalendarIcon, 
    ArrowDownTrayIcon, 
    PlusIcon,
    ShieldCheckIcon,
    XCircleIcon,
    CheckCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

function AccountingPage() {
    const { t, i18n } = useTranslation();
    const { user: currentUser, isLoading: authLoading } = useAuth();
    
    // Registry Data States
    const [payslips, setPayslips] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal'); 

    // Authorization Clearance
    const isManagement = currentUser?.role === 'admin' || 
                         currentUser?.role === 'accountant' || 
                         currentUser?.is_superuser;

    /**
     * Protocol: Sync Financial & Absence Telemetry
     */
    const fetchAccountingData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [payslipsRes, leavesRes] = await Promise.all([
                axiosInstance.get('/accounting/payslips/me').catch(() => ({ data: [] })),
                axiosInstance.get('/accounting/leave-requests/me').catch(() => ({ data: [] }))
            ]);
            
            setPayslips(Array.isArray(payslipsRes.data) ? payslipsRes.data : []);
            setLeaveRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);

            if (isManagement) {
                const pendingRes = await axiosInstance.get('/accounting/leave-requests/pending').catch(() => ({ data: [] }));
                setPendingLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
            }
        } catch (error) {
            console.error("Registry Sync Error:", error);
            toast.error(t('error_loading_accounting'));
        } finally {
            setIsLoading(false);
        }
    }, [isManagement, t, currentUser]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            fetchAccountingData();
        }
    }, [fetchAccountingData, authLoading, currentUser]);

    const handleDownloadPayslip = async (payslipId, filename) => {
        try {
            const response = await axiosInstance.get(`/accounting/payslips/download/${payslip_id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `payslip_${payslip_id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error(t('download_failed'));
        }
    };

    const handleReviewLeave = async (requestId, status, comment = "") => {
        try {
            const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
            await axiosInstance.put(`/accounting/leave-requests/${requestId}/review`, {
                status: capitalizedStatus,
                manager_comment: comment
            });
            toast.success(t('request_updated', { status: capitalizedStatus }));
            fetchAccountingData(); 
        } catch (error) {
            toast.error(t('review_failed'));
        }
    };

    if (authLoading || (isLoading && payslips.length === 0)) {
        return <LoadingSpinner text={t('syncing')} size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Main Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-2 italic">
                        {t('hr_payroll')}
                    </h1>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                        {t('financial_telemetry')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {isManagement && (
                        <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
                            <button 
                                onClick={() => setActiveTab('personal')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'
                                }`}
                            >
                                {t('personal_records')}
                            </button>
                            <button 
                                onClick={() => setActiveTab('management')}
                                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'management' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'
                                }`}
                            >
                                {t('management')}
                            </button>
                        </div>
                    )}

                    <Link 
                        to="/accounting/leave/new"
                        className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg shadow-emerald-100 dark:shadow-none w-full sm:w-auto"
                    >
                        <PlusIcon className="h-4 w-4 stroke-[3px]" /> {t('new_request')}
                    </Link>
                </div>
            </header>

            {activeTab === 'personal' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Personal Payslips Registry */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <BanknotesIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('payslips')}</h2>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {payslips.length > 0 ? payslips.map(ps => (
                                <div key={ps.id} className="p-6 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                            {new Date(ps.issue_date).toLocaleDateString(i18n.language === 'is' ? 'is-IS' : 'en-GB', { month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            {t('netto')}: <span className="text-indigo-600">{ps.amount_netto?.toLocaleString()} ISK</span>
                                        </p>
                                    </div>
                                    <button onClick={() => handleDownloadPayslip(ps.id, ps.filename)} className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-indigo-600 rounded-xl transition-all">
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">{t('no_data')}</div>
                            )}
                        </div>
                    </section>

                    {/* Personal Leave History: REINFORCED REJECTION VISIBILITY */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('leave_requests')}</h2>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {leaveRequests.length > 0 ? leaveRequests.map(lr => (
                                <div key={lr.id} className={`p-6 flex justify-between items-center transition-colors ${lr.status === 'Rejected' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {lr.status === 'Approved' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                                            {lr.status === 'Rejected' && <XCircleIcon className="h-4 w-4 text-red-500" />}
                                            {lr.status === 'Pending' && <ExclamationCircleIcon className="h-4 w-4 text-orange-500" />}
                                            <p className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-tighter">
                                                {new Date(lr.start_date).toLocaleDateString()} — {new Date(lr.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-6">{lr.leave_type}</p>
                                        {lr.manager_comment && (
                                            <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-2 ml-6 italic">
                                                “{lr.manager_comment}”
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                        lr.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : 
                                        lr.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' : 
                                        'bg-orange-100 text-orange-700 border-orange-200'
                                    }`}>
                                        {lr.status}
                                    </span>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">{t('no_data')}</div>
                            )}
                        </div>
                    </section>
                </div>
            ) : (
                /* Management Tab: Authorization Terminal */
                <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                        <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('pending_approvals')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('personnel')}</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('type')}</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('dates')}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {pendingLeaves.length > 0 ? pendingLeaves.map(lr => (
                                    <tr key={lr.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                                    {lr.user_name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{lr.user_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{lr.leave_type}</td>
                                        <td className="px-6 py-6 text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {new Date(lr.start_date).toLocaleDateString()} — {new Date(lr.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleReviewLeave(lr.id, 'approved')} 
                                                    className="h-9 px-4 bg-green-50 text-green-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    {t('approve')}
                                                </button>
                                                <button 
                                                    onClick={() => handleReviewLeave(lr.id, 'rejected')} 
                                                    className="h-9 px-4 bg-red-50 text-red-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    {t('reject')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">{t('no_pending')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

export default AccountingPage;