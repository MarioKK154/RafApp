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
    ExclamationCircleIcon,
    ChartBarSquareIcon
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

    // Money flow states (management only)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [overview, setOverview] = useState(null);
    const [recentExpenses, setRecentExpenses] = useState([]);
    const [isLoadingOverview, setIsLoadingOverview] = useState(false);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterProjectId, setFilterProjectId] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    // Payslip calculator & upload
    const [calcHours, setCalcHours] = useState('');
    const [calcHourlyRate, setCalcHourlyRate] = useState('');
    const [calcOvertimeHours, setCalcOvertimeHours] = useState('');
    const [calcOvertimeMultiplier, setCalcOvertimeMultiplier] = useState('1.5');
    const [calcOvertime2Hours, setCalcOvertime2Hours] = useState('');
    const [calcOvertime2Multiplier, setCalcOvertime2Multiplier] = useState('2.0');
    const [calcBonuses, setCalcBonuses] = useState('');
    const [calcBonusDescription, setCalcBonusDescription] = useState('');
    const [calcOtherDeductions, setCalcOtherDeductions] = useState('0');
    const [calcDeductionsDescription, setCalcDeductionsDescription] = useState('');

    const [uploadUserId, setUploadUserId] = useState('');
    const [uploadIssueDate, setUploadIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [uploadBrutto, setUploadBrutto] = useState('');
    const [uploadNetto, setUploadNetto] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploadingPayslip, setIsUploadingPayslip] = useState(false);
    const [calcFromDate, setCalcFromDate] = useState('');
    const [calcToDate, setCalcToDate] = useState('');

    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseFlowType, setExpenseFlowType] = useState('out');
    const [expenseCategory, setExpenseCategory] = useState('project');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseReference, setExpenseReference] = useState('');
    const [expenseProjectId, setExpenseProjectId] = useState('');

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
                const [pendingRes, overviewRes, expensesRes, projectsRes, usersRes] = await Promise.all([
                    axiosInstance.get('/accounting/leave-requests/pending').catch(() => ({ data: [] })),
                    axiosInstance.get(`/accounting/overview/year/${selectedYear}`).catch(() => null),
                    axiosInstance.get('/accounting/expenses', { params: { year: selectedYear } }).catch(() => ({ data: [] })),
                    axiosInstance.get('/projects/', { params: { limit: 500 } }).catch(() => ({ data: [] })),
                    axiosInstance.get('/users/', { params: { limit: 500 } }).catch(() => ({ data: [] })),
                ]);
                setPendingLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
                if (overviewRes && overviewRes.data) {
                    setOverview(overviewRes.data);
                }
                setRecentExpenses(Array.isArray(expensesRes.data) ? expensesRes.data.slice(0, 10) : []);
                setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
                setEmployees(Array.isArray(usersRes.data) ? usersRes.data : []);
            }
        } catch (error) {
            console.error("Registry Sync Error:", error);
            toast.error(t('error_loading_accounting'));
        } finally {
            setIsLoading(false);
        }
    }, [isManagement, t, currentUser, selectedYear]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            fetchAccountingData();
        }
    }, [fetchAccountingData, authLoading, currentUser]);

    const refreshOverview = async (yearOverride) => {
        if (!isManagement) return;
        const yearToLoad = yearOverride || selectedYear;
        setIsLoadingOverview(true);
        try {
            const params = { year: yearToLoad };
            if (filterCategory) params.category = filterCategory;
            if (filterProjectId) params.project_id = parseInt(filterProjectId, 10);
            if (filterFromDate) params.from_date = filterFromDate;
            if (filterToDate) params.to_date = filterToDate;
            if (filterSearch) params.search = filterSearch;

            const [overviewRes, expensesRes] = await Promise.all([
                axiosInstance.get(`/accounting/overview/year/${yearToLoad}`, { params }).catch(() => null),
                axiosInstance.get('/accounting/expenses', { params }).catch(() => ({ data: [] }))
            ]);
            if (overviewRes && overviewRes.data) {
                setOverview(overviewRes.data);
            }
            setRecentExpenses(Array.isArray(expensesRes.data) ? expensesRes.data.slice(0, 10) : []);
        } catch (error) {
            console.error('Overview sync error:', error);
            toast.error('Failed to load money overview.');
        } finally {
            setIsLoadingOverview(false);
        }
    };

    const handleDownloadPayslip = async (payslipId, filename) => {
        try {
            const response = await axiosInstance.get(`/accounting/payslips/download/${payslipId}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `payslip_${payslipId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Payslip download failed:', error);
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
            console.error('Leave request review failed:', error);
            toast.error(t('review_failed'));
        }
    };

    if (authLoading || (isLoading && payslips.length === 0)) {
        return <LoadingSpinner text={t('syncing')} size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Main Header */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <BanknotesIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('hr_payroll')}</h1>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        {isManagement && (
                            <div className="flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
                                <button
                                    onClick={() => setActiveTab('personal')}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                    {t('personal_records')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('management')}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'management' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                    {t('management')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('financial')}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'financial' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600'}`}
                                >
                                    {t('analytics')}
                                </button>
                            </div>
                        )}

                        <Link
                            to="/accounting/leave/new"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('new_request')}
                        </Link>
                    </div>
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
            ) : activeTab === 'management' ? (
                /* Management Tab: Pending approvals + payroll tools */
                <div className="space-y-8">
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

                    {(currentUser?.role === 'accountant' || currentUser?.role === 'admin' || currentUser?.is_superuser) && (
                        <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                                        Payroll Tools
                                    </p>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                        Payslip Calculator & Upload
                                    </h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Calculator */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">
                                        Calculator
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Hours</label>
                                            <input type="number" min="0" step="any" value={calcHours} onChange={(e) => setCalcHours(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Hourly rate</label>
                                            <input type="number" min="0" step="any" value={calcHourlyRate} onChange={(e) => setCalcHourlyRate(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Overtime 1 hours</label>
                                            <input type="number" min="0" step="any" value={calcOvertimeHours} onChange={(e) => setCalcOvertimeHours(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">OT1 multiplier</label>
                                            <input type="number" min="1" step="0.1" value={calcOvertimeMultiplier} onChange={(e) => setCalcOvertimeMultiplier(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Overtime 2 hours</label>
                                            <input type="number" min="0" step="any" value={calcOvertime2Hours} onChange={(e) => setCalcOvertime2Hours(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">OT2 multiplier</label>
                                            <input type="number" min="1" step="0.1" value={calcOvertime2Multiplier} onChange={(e) => setCalcOvertime2Multiplier(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Bonuses</label>
                                            <input type="number" min="0" step="any" value={calcBonuses} onChange={(e) => setCalcBonuses(e.target.value)} className="modern-input h-9" />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Other deductions</label>
                                            <input type="number" min="0" step="any" value={calcOtherDeductions} onChange={(e) => setCalcOtherDeductions(e.target.value)} className="modern-input h-9" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Bonus description</label>
                                            <input
                                                type="text"
                                                value={calcBonusDescription}
                                                onChange={(e) => setCalcBonusDescription(e.target.value)}
                                                className="modern-input h-9"
                                                placeholder="e.g. on-call allowance, bonus"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Deductions description</label>
                                            <input
                                                type="text"
                                                value={calcDeductionsDescription}
                                                onChange={(e) => setCalcDeductionsDescription(e.target.value)}
                                                className="modern-input h-9"
                                                placeholder="e.g. union fee, lunch, misc."
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                Period from
                                            </label>
                                            <input
                                                type="date"
                                                value={calcFromDate}
                                                onChange={(e) => setCalcFromDate(e.target.value)}
                                                className="modern-input h-9"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                Period to
                                            </label>
                                            <input
                                                type="date"
                                                value={calcToDate}
                                                onChange={(e) => setCalcToDate(e.target.value)}
                                                className="modern-input h-9"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!uploadUserId) {
                                                        toast.warn('Select employee in upload form first.');
                                                        return;
                                                    }
                                                    if (!calcFromDate || !calcToDate) {
                                                        toast.warn('Select period for time tracking.');
                                                        return;
                                                    }
                                                    try {
                                                        const params = {
                                                            user_id: parseInt(uploadUserId, 10),
                                                            start_date: calcFromDate,
                                                            end_date: calcToDate,
                                                            limit: 1000,
                                                        };
                                                        const res = await axiosInstance.get('/timelogs/', { params });
                                                        const logs = Array.isArray(res.data) ? res.data : [];
                                                        if (logs.length === 0) {
                                                            toast.info('No time logs found for this period.');
                                                            return;
                                                        }
                                                        // Group hours by calendar day
                                                        const perDay = {};
                                                        logs.forEach(log => {
                                                            if (!log.duration_hours) return;
                                                            const day = log.start_time ? log.start_time.slice(0, 10) : calcFromDate;
                                                            perDay[day] = (perDay[day] || 0) + log.duration_hours;
                                                        });
                                                        let regularH = 0;
                                                        let otH = 0;
                                                        Object.values(perDay).forEach(totalDayHours => {
                                                            const reg = Math.min(8, totalDayHours);
                                                            const extra = Math.max(0, totalDayHours - 8);
                                                            regularH += reg;
                                                            otH += extra;
                                                        });
                                                        setCalcHours(regularH.toFixed(2));
                                                        setCalcOvertimeHours(otH.toFixed(2));
                                                        toast.success('Loaded hours from time tracking (regular + OT1 suggestion).');
                                                    } catch (error) {
                                                        console.error('Load hours from timelogs failed:', error);
                                                        const msg = error.response?.data?.detail || 'Failed to load hours from time tracking.';
                                                        toast.error(msg);
                                                    }
                                                }}
                                                className="inline-flex items-center px-3 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black transition"
                                            >
                                                Load from time tracking
                                            </button>
                                        </div>
                                    </div>
                                    {(() => {
                                        const h = parseFloat(calcHours || '0') || 0;
                                        const r = parseFloat(calcHourlyRate || '0') || 0;
                                        const oh = parseFloat(calcOvertimeHours || '0') || 0;
                                        const om = parseFloat(calcOvertimeMultiplier || '0') || 0;
                                        const oh2 = parseFloat(calcOvertime2Hours || '0') || 0;
                                        const om2 = parseFloat(calcOvertime2Multiplier || '0') || 0;
                                        const bonus = parseFloat(calcBonuses || '0') || 0;
                                        const od = parseFloat(calcOtherDeductions || '0') || 0;
                                        const regular = h * r;
                                        const overtime1 = oh * r * om;
                                        const overtime2 = oh2 * r * om2;
                                        const brutto = regular + overtime1 + overtime2 + bonus;

                                        // 2025 Iceland combined tax brackets (central + average municipal, monthly)
                                        const TAX_BRACKETS = [
                                            { limit: 472005, rate: 0.3149 },
                                            { limit: 1325127, rate: 0.3799 },
                                            { limit: Infinity, rate: 0.4629 },
                                        ];
                                        const PERSONAL_CREDIT = 68691;

                                        const calculateTax = (monthlyIncome) => {
                                            if (!monthlyIncome || monthlyIncome <= 0) return 0;
                                            let remaining = monthlyIncome;
                                            let tax = 0;
                                            let lastLimit = 0;
                                            for (const b of TAX_BRACKETS) {
                                                const upper = b.limit;
                                                const span = upper === Infinity
                                                    ? remaining
                                                    : Math.max(0, Math.min(remaining, upper - lastLimit));
                                                if (span <= 0) continue;
                                                tax += span * b.rate;
                                                remaining -= span;
                                                lastLimit = upper;
                                                if (remaining <= 0) break;
                                            }
                                            tax = Math.max(0, tax - PERSONAL_CREDIT);
                                            return tax;
                                        };

                                        const tax = calculateTax(brutto);
                                        const netto = Math.max(0, brutto - tax - od);

                                        return (
                                            <div className="space-y-1 text-xs text-gray-700 dark:text-gray-200">
                                                <p>Brutto: <span className="font-bold">{brutto.toFixed(0)} ISK</span></p>
                                                <p>Estimated Tax: <span className="font-bold">{tax.toFixed(0)} ISK</span></p>
                                                <p>Estimated Net: <span className="font-bold">{netto.toFixed(0)} ISK</span></p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUploadBrutto(brutto.toFixed(0));
                                                        setUploadNetto(netto.toFixed(0));
                                                        toast.info('Copied values into upload form.');
                                                    }}
                                                    className="mt-2 inline-flex items-center px-3 py-1 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black transition"
                                                >
                                                    Use in upload
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Upload */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">
                                        Upload Payslip PDF
                                    </h3>
                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!uploadUserId || !uploadIssueDate || !uploadBrutto || !uploadNetto || !uploadFile) {
                                                toast.warn('Fill all fields and select a PDF file.');
                                                return;
                                            }
                                            setIsUploadingPayslip(true);
                                            try {
                                                const formData = new FormData();
                                                formData.append('user_id', uploadUserId);
                                                formData.append('issue_date', uploadIssueDate);
                                                formData.append('amount_brutto', uploadBrutto);
                                                formData.append('amount_netto', uploadNetto);
                                                formData.append('file', uploadFile);

                                                await axiosInstance.post('/accounting/payslips', formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' },
                                                });
                                                toast.success('Payslip uploaded.');
                                                setUploadBrutto('');
                                                setUploadNetto('');
                                                setUploadFile(null);
                                                fetchAccountingData();
                                            } catch (error) {
                                                console.error('Payslip upload failed:', error);
                                                const msg = error.response?.data?.detail || 'Failed to upload payslip.';
                                                toast.error(msg);
                                            } finally {
                                                setIsUploadingPayslip(false);
                                            }
                                        }}
                                        className="space-y-3 text-xs"
                                    >
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                Employee
                                            </label>
                                            <select
                                                value={uploadUserId}
                                                onChange={(e) => setUploadUserId(e.target.value)}
                                                className="modern-input h-9 text-[11px]"
                                            >
                                                <option value="">Select employee</option>
                                                {employees.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.full_name || u.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    Issue date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={uploadIssueDate}
                                                    onChange={(e) => setUploadIssueDate(e.target.value)}
                                                    className="modern-input h-9 text-[11px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    Brutto
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={uploadBrutto}
                                                    onChange={(e) => setUploadBrutto(e.target.value)}
                                                    className="modern-input h-9 text-[11px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    Netto
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={uploadNetto}
                                                    onChange={(e) => setUploadNetto(e.target.value)}
                                                    className="modern-input h-9 text-[11px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    PDF File
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                    className="block w-full text-[11px] text-gray-600"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                            <button
                                                type="submit"
                                                disabled={isUploadingPayslip}
                                                className="inline-flex items-center px-6 py-2 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-indigo-700 transition disabled:opacity-50"
                                            >
                                                {isUploadingPayslip ? 'Uploading...' : 'Upload PDF'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isUploadingPayslip || !uploadUserId || !uploadIssueDate || !uploadBrutto || !uploadNetto}
                                                onClick={async () => {
                                                    setIsUploadingPayslip(true);
                                                    try {
                                                        const payload = {
                                                            user_id: parseInt(uploadUserId, 10),
                                                            issue_date: uploadIssueDate,
                                                            amount_brutto: parseFloat(uploadBrutto),
                                                            amount_netto: parseFloat(uploadNetto),
                                                            period_from: calcFromDate || null,
                                                            period_to: calcToDate || null,
                                                            regular_hours: calcHours ? parseFloat(calcHours) : null,
                                                            overtime1_hours: calcOvertimeHours ? parseFloat(calcOvertimeHours) : null,
                                                            overtime2_hours: calcOvertime2Hours ? parseFloat(calcOvertime2Hours) : null,
                                                            bonuses: calcBonuses ? parseFloat(calcBonuses) : null,
                                                            bonus_description: calcBonusDescription || null,
                                                            other_deductions: calcOtherDeductions ? parseFloat(calcOtherDeductions) : null,
                                                            deductions_description: calcDeductionsDescription || null,
                                                        };
                                                        await axiosInstance.post('/accounting/payslips/auto', payload);
                                                        toast.success('Payslip generated and stored.');
                                                        fetchAccountingData();
                                                    } catch (error) {
                                                        console.error('Auto payslip generation failed:', error);
                                                        const msg = error.response?.data?.detail || 'Failed to generate payslip.';
                                                        toast.error(msg);
                                                    } finally {
                                                        setIsUploadingPayslip(false);
                                                    }
                                                }}
                                                className="inline-flex items-center px-6 py-2 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black transition disabled:opacity-50"
                                            >
                                                Generate PDF & save
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            ) : (
                /* Financial Overview Tab */
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <ChartBarSquareIcon className="h-5 w-5 text-indigo-600" />
                                <div>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                        Yearly Money Overview
                                    </h2>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Aggregate money in/out by month and category.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        const year = parseInt(e.target.value, 10);
                                        setSelectedYear(year);
                                        refreshOverview(year);
                                    }}
                                    className="modern-input h-10 text-xs font-bold w-28"
                                >
                                    {[-1, 0, 1].map(offset => {
                                        const year = new Date().getFullYear() + offset;
                                        return (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        );
                                    })}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => refreshOverview()}
                                    className="h-10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-indigo-600"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                        <div className="px-8 pt-4 pb-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="modern-input h-9 text-[11px]"
                                    >
                                        <option value="">All</option>
                                        <option value="project">Project</option>
                                        <option value="car">Car</option>
                                        <option value="tool">Tool</option>
                                        <option value="repair">Repair</option>
                                        <option value="clothing">Clothing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Project
                                    </label>
                                    <select
                                        value={filterProjectId}
                                        onChange={(e) => setFilterProjectId(e.target.value)}
                                        className="modern-input h-9 text-[11px]"
                                    >
                                        <option value="">All</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={filterFromDate}
                                        onChange={(e) => setFilterFromDate(e.target.value)}
                                        className="modern-input h-9 text-[11px]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={filterToDate}
                                        onChange={(e) => setFilterToDate(e.target.value)}
                                        className="modern-input h-9 text-[11px]"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Search
                                    </label>
                                    <input
                                        type="text"
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                        className="modern-input h-9 text-[11px]"
                                        placeholder="Search description or reference..."
                                    />
                                </div>
                            </div>
                            {isLoadingOverview && (
                                <div className="py-6">
                                    <LoadingSpinner text="Calculating overview..." size="sm" />
                                </div>
                            )}
                            {overview && !isLoadingOverview && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                                                Total In
                                            </p>
                                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                {overview.total_in.toLocaleString()} ISK
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                                                Total Out
                                            </p>
                                            <p className="text-2xl font-black text-red-500 dark:text-red-400">
                                                {overview.total_out.toLocaleString()} ISK
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                                                Net
                                            </p>
                                            <p className={`text-2xl font-black ${overview.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {overview.net.toLocaleString()} ISK
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-2">
                                                By Month
                                            </h3>
                                            <div className="space-y-1">
                                                {overview.by_month.map(m => (
                                                    <div key={m.month} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200">
                                                        <span className="font-semibold">
                                                            {m.month}. {t('month_short', { defaultValue: '' })}
                                                        </span>
                                                        <span>
                                                            IN {m.total_in.toLocaleString()} / OUT {m.total_out.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                {overview.by_month.length === 0 && (
                                                    <p className="text-xs text-gray-400 italic">
                                                        No recorded transactions for this year yet.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-2">
                                                By Category
                                            </h3>
                                            <div className="space-y-1">
                                                {overview.by_category.map(c => (
                                                    <div key={c.category} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200">
                                                        <span className="font-semibold capitalize">{c.category}</span>
                                                        <span>
                                                            IN {c.total_in.toLocaleString()} / OUT {c.total_out.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                {overview.by_category.length === 0 && (
                                                    <p className="text-xs text-gray-400 italic">
                                                        No category breakdown available.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <section className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">
                                Record Bill / Transaction
                            </h2>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!expenseAmount) {
                                        toast.warn('Enter an amount.');
                                        return;
                                    }
                                    setIsSubmittingExpense(true);
                                    try {
                                        const payload = {
                                            date: expenseDate,
                                            amount: parseFloat(expenseAmount),
                                            flow_type: expenseFlowType,
                                            category: expenseCategory,
                                            description: expenseDescription || null,
                                            reference: expenseReference || null,
                                            project_id: expenseProjectId ? parseInt(expenseProjectId, 10) : null,
                                        };
                                        await axiosInstance.post('/accounting/expenses', payload);
                                        toast.success('Entry recorded.');
                                        setExpenseAmount('');
                                        setExpenseDescription('');
                                        setExpenseReference('');
                                        setExpenseProjectId('');
                                        refreshOverview();
                                    } catch (error) {
                                        console.error('Expense create failed:', error);
                                        const msg = error.response?.data?.detail || 'Failed to record entry.';
                                        toast.error(msg);
                                    } finally {
                                        setIsSubmittingExpense(false);
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={expenseDate}
                                            onChange={(e) => setExpenseDate(e.target.value)}
                                            className="modern-input h-10 text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                            Amount (ISK)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={expenseAmount}
                                            onChange={(e) => setExpenseAmount(e.target.value)}
                                            className="modern-input h-10 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                            Flow
                                        </label>
                                        <select
                                            value={expenseFlowType}
                                            onChange={(e) => setExpenseFlowType(e.target.value)}
                                            className="modern-input h-10 text-xs font-bold"
                                        >
                                            <option value="out">Money Out (bill)</option>
                                            <option value="in">Money In (income)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                            Category
                                        </label>
                                        <select
                                            value={expenseCategory}
                                            onChange={(e) => setExpenseCategory(e.target.value)}
                                            className="modern-input h-10 text-xs font-bold"
                                        >
                                            <option value="project">Project</option>
                                            <option value="car">Car</option>
                                            <option value="tool">Tool</option>
                                            <option value="repair">Repair</option>
                                            <option value="clothing">Clothing</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Project (optional)
                                    </label>
                                    <select
                                        value={expenseProjectId}
                                        onChange={(e) => setExpenseProjectId(e.target.value)}
                                        className="modern-input h-10 text-xs font-bold"
                                    >
                                        <option value="">Unlinked</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (#{p.project_number || p.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={expenseDescription}
                                        onChange={(e) => setExpenseDescription(e.target.value)}
                                        className="modern-input h-10 text-xs"
                                        placeholder="Short description (fuel, service, invoice, etc.)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                        Reference
                                    </label>
                                    <input
                                        type="text"
                                        value={expenseReference}
                                        onChange={(e) => setExpenseReference(e.target.value)}
                                        className="modern-input h-10 text-xs"
                                        placeholder="Car plate, tool ID, invoice number..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmittingExpense}
                                    className="w-full h-11 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50"
                                >
                                    {isSubmittingExpense ? 'Saving...' : 'Record Entry'}
                                </button>
                            </form>
                        </section>

                        <section className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">
                                Recent Entries
                            </h2>
                            {recentExpenses.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">
                                    No entries recorded for this year yet.
                                </p>
                            ) : (
                                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-200">
                                    {recentExpenses.map(e => (
                                        <div key={e.id} className="flex items-center justify-between">
                                            <span>
                                                {new Date(e.date).toLocaleDateString()} ·{' '}
                                                <span className="capitalize">{e.category}</span>{' '}
                                                {e.description && `· ${e.description}`}
                                            </span>
                                            <span className={e.flow_type === 'in' ? 'text-emerald-600' : 'text-red-500'}>
                                                {e.flow_type === 'in' ? '+' : '-'}{e.amount.toLocaleString()} ISK
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </section>
            )}
        </div>
    );
}

export default AccountingPage;