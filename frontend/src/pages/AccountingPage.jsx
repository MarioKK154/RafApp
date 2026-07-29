import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import InvoiceApprovalQueue from '../components/InvoiceApprovalQueue';
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
    const isIcelandic = !i18n.language.startsWith('en');
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
    const [chartType, setChartType] = useState('pie');
    const [chartFlow, setChartFlow] = useState('out');
    const [recentExpenses, setRecentExpenses] = useState([]);
    const [showDetailedEntries, setShowDetailedEntries] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editingExpenseData, setEditingExpenseData] = useState({});
    const [allExpenses, setAllExpenses] = useState([]);
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
    const [calcOvertimeMultiplier, setCalcOvertimeMultiplier] = useState('1.56');
    const [calcOvertime2Hours, setCalcOvertime2Hours] = useState('');
    const [calcOvertime2Multiplier, setCalcOvertime2Multiplier] = useState('1.794');
    const [calcBonuses, setCalcBonuses] = useState('');
    const [calcBonusDescription, setCalcBonusDescription] = useState('');
    const [calcOtherDeductions, setCalcOtherDeductions] = useState('0');
    const [calcDeductionsDescription, setCalcDeductionsDescription] = useState('');
    const [calcSereignarsparnadurPercent, setCalcSereignarsparnadurPercent] = useState('0');
    const [calcApplyPersonalTaxCredit, setCalcApplyPersonalTaxCredit] = useState(true);
    const [calcTaxYear, setCalcTaxYear] = useState('2026');
    const [calcOrlofPercent, setCalcOrlofPercent] = useState('0');

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
                setAllExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
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

    useEffect(() => {
        if (currentUser) {
            if (!isManagement) {
                setUploadUserId(String(currentUser.id));
                setCalcHourlyRate(String(currentUser.hourly_rate || ''));
            }
        }
    }, [currentUser, isManagement]);

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
            toast.error(t('failed_load_money_overview', { defaultValue: 'Failed to load money overview.' }));
        } finally {
            setIsLoadingOverview(false);
        }
    };

        const handleEditExpenseSubmit = async (expenseId) => {
        try {
            const payload = {
                date: editingExpenseData.date,
                amount: parseFloat(editingExpenseData.amount),
                flow_type: editingExpenseData.flow_type,
                category: editingExpenseData.category,
                description: editingExpenseData.description,
                reference: editingExpenseData.reference,
                project_id: editingExpenseData.project_id ? parseInt(editingExpenseData.project_id, 10) : null,
            };
            await axiosInstance.put(`/accounting/expenses/${expenseId}`, payload);
            toast.success(t('expense_updated_success', { defaultValue: 'Expense updated successfully' }));
            setEditingExpenseId(null);
            refreshOverview();
        } catch (error) {
            console.error('Update expense error:', error);
            toast.error(t('failed_update_expense', { defaultValue: 'Failed to update expense' }));
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm(t('confirm_delete_entry', { defaultValue: 'Are you sure you want to delete this entry?' }))) return;
        try {
            await axiosInstance.delete(`/accounting/expenses/${expenseId}`);
            toast.success(t('expense_deleted_success', { defaultValue: 'Expense deleted' }));
            refreshOverview();
        } catch (error) {
            console.error('Delete expense error:', error);
            toast.error(t('failed_delete_expense', { defaultValue: 'Failed to delete expense' }));
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
        <div className="animate-in fade-in duration-500 pb-12">
            <div className="container mx-auto p-4 md:p-8 max-w-[1600px]">
                <PageHeader
                    icon={BanknotesIcon}
                    title={t('hr_payroll')}
                    subtitle={t('accounting_subtitle', { defaultValue: 'Payroll, Payslips, Absence & Financial Control' })}
                    stats={[
                        { label: `${payslips.length} ${t('payslips')}`, icon: <BanknotesIcon className="h-4 w-4 text-indigo-300" /> },
                        { label: `${leaveRequests.length} ${t('absence_records')}`, icon: <CalendarIcon className="h-4 w-4 text-blue-300" /> },
                    ]}
                    actions={
                        <Link
                            to="/accounting/leave/new"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/30 transform active:scale-95 cursor-pointer"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('new_request')}
                        </Link>
                    }
                />

                {isManagement && (
                    <div className="mb-8 flex justify-center sm:justify-start">
                        <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700 shadow-inner">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'personal'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-gray-400 hover:text-indigo-600 dark:hover:text-white'
                                }`}
                            >
                                {t('personal_records')}
                            </button>
                            <button
                                onClick={() => setActiveTab('management')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'management'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-gray-400 hover:text-indigo-600 dark:hover:text-white'
                                }`}
                            >
                                {t('management')}
                            </button>
                            <button
                                onClick={() => setActiveTab('financial')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'financial'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-gray-400 hover:text-indigo-600 dark:hover:text-white'
                                }`}
                            >
                                {t('analytics')}
                            </button>
                            <button
                                onClick={() => setActiveTab('approvals')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === 'approvals'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-gray-400 hover:text-indigo-600 dark:hover:text-white'
                                }`}
                            >
                                {t('approval_queue', 'Samþykktarkerfi')}
                            </button>
                        </div>
                    </div>
                )}

            {activeTab === 'personal' ? (
                <div className="space-y-8">
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
                                                {new Date(ps.issue_date).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                {t('brutto')}: {ps.amount_brutto.toLocaleString()} ISK · {t('netto')}: {ps.amount_netto.toLocaleString()} ISK
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleDownloadPayslip(ps.id, ps.filename)}
                                            className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-600 rounded-xl transition-colors border border-gray-100 dark:border-gray-700 shadow-sm"
                                            title={t('download_pdf')}
                                        >
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="p-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest italic">{t('no_data')}</div>
                                )}
                            </div>
                        </section>

                        {/* Personal Absence Registry */}
                        <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('absence_records')}</h2>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                {leaveRequests.length > 0 ? leaveRequests.map(lr => (
                                    <div key={lr.id} className="p-6 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t(lr.leave_type, { defaultValue: lr.leave_type })}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                {new Date(lr.start_date).toLocaleDateString()} — {new Date(lr.end_date).toLocaleDateString()}
                                            </p>
                                            {lr.manager_comment && (
                                                <p className="text-[10px] text-orange-500 font-medium italic mt-1">
                                                    {t('comment')}: {lr.manager_comment}
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

                    {/* Salary Calculator section - Available to all authenticated users */}
                    {(() => {
                        const isIcelandic = !i18n.language.startsWith('en');
                        return (
                            <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-8">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                                        {t('calculator', { defaultValue: 'Calculator' })}
                                    </p>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                        {t('salary_estimator', { defaultValue: 'Salary Estimator' })}
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                        {t('estimate_your_earnings_based_on', { defaultValue: 'Estimate your earnings based on logged hours, union agreements, and standard Icelandic taxes.' })}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left: Inputs - 7 columns */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl space-y-4">
                                            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                                {t('parameters', { defaultValue: 'Parameters' })}
                                            </h3>

                                            {isManagement ? (
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('employee', { defaultValue: 'Employee' })}
                                                    </label>
                                                    <select
                                                        value={uploadUserId}
                                                        onChange={(e) => {
                                                            const userId = e.target.value;
                                                            setUploadUserId(userId);
                                                            const emp = employees.find(u => String(u.id) === String(userId));
                                                            if (emp) {
                                                                setCalcHourlyRate(String(emp.hourly_rate || ''));
                                                            }
                                                        }}
                                                        className="modern-input h-9 text-[11px]"
                                                    >
                                                        <option value="">{t('select_employee', { defaultValue: 'Select employee' })}</option>
                                                        {employees.map(u => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.full_name || u.email}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                    <p className="font-bold">{t('employee_1', { defaultValue: 'Employee:' })}</p>
                                                    <p className="mt-1 text-gray-900 dark:text-white">{currentUser?.full_name || currentUser?.email}</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('period_from', { defaultValue: 'Period From' })}
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={calcFromDate}
                                                        onChange={(e) => setCalcFromDate(e.target.value)}
                                                        className="modern-input h-9 text-[11px]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('period_to', { defaultValue: 'Period To' })}
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={calcToDate}
                                                        onChange={(e) => setCalcToDate(e.target.value)}
                                                        className="modern-input h-9 text-[11px]"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!uploadUserId) {
                                                            toast.warn(t('please_select_an_employee_first', { defaultValue: 'Please select an employee first.' }));
                                                            return;
                                                        }
                                                        if (!calcFromDate || !calcToDate) {
                                                            toast.warn(t('please_select_a_period_first', { defaultValue: 'Please select a period first.' }));
                                                            return;
                                                        }
                                                        try {
                                                            const params = {
                                                                user_id: parseInt(uploadUserId, 10),
                                                                start_date: calcFromDate,
                                                                end_date: calcToDate,
                                                                limit: 1000,
                                                            };
                                                            const url = isManagement ? '/timelogs/' : '/timelogs/me';
                                                            const res = await axiosInstance.get(url, { params });
                                                            const logs = Array.isArray(res.data) ? res.data : [];
                                                            if (logs.length === 0) {
                                                                toast.info(t('no_time_logs_found_for', { defaultValue: 'No time logs found for this period.' }));
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
                                                            toast.success(t('hours_loaded_from_time_logs', { defaultValue: 'Hours loaded from time logs.' }));
                                                        } catch (error) {
                                                            console.error('Load hours failed:', error);
                                                            toast.error(t('failed_to_load_hours', { defaultValue: 'Failed to load hours.' }));
                                                        }
                                                    }}
                                                    className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-800 text-white text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black dark:hover:bg-gray-700 transition"
                                                >
                                                    {t('load_hours', { defaultValue: 'Load hours' })}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('regular_hours', { defaultValue: 'Regular Hours' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcHours} onChange={(e) => setCalcHours(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('hourly_rate_isk', { defaultValue: 'Hourly Rate (ISK)' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcHourlyRate} onChange={(e) => setCalcHourlyRate(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('ot1_hours', { defaultValue: 'OT1 Hours' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcOvertimeHours} onChange={(e) => setCalcOvertimeHours(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('ot1_multiplier', { defaultValue: 'OT1 Multiplier' })}
                                                    </label>
                                                    <input type="number" min="1" step="0.1" value={calcOvertimeMultiplier} onChange={(e) => setCalcOvertimeMultiplier(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('ot2_hours', { defaultValue: 'OT2 Hours' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcOvertime2Hours} onChange={(e) => setCalcOvertime2Hours(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('ot2_multiplier', { defaultValue: 'OT2 Multiplier' })}
                                                    </label>
                                                    <input type="number" min="1" step="0.1" value={calcOvertime2Multiplier} onChange={(e) => setCalcOvertime2Multiplier(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('private_pension', { defaultValue: 'Private Pension' })}
                                                    </label>
                                                    <select
                                                        value={calcSereignarsparnadurPercent}
                                                        onChange={(e) => setCalcSereignarsparnadurPercent(e.target.value)}
                                                        className="modern-input h-9 text-[11px]"
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="2">2%</option>
                                                        <option value="4">4%</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center space-x-2 pt-5">
                                                    <input
                                                        type="checkbox"
                                                        id="applyTaxCredit"
                                                        checked={calcApplyPersonalTaxCredit}
                                                        onChange={(e) => setCalcApplyPersonalTaxCredit(e.target.checked)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <label htmlFor="applyTaxCredit" className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer">
                                                        {t('apply_personal_tax_credit', { defaultValue: 'Apply Personal Tax Credit' })}
                                                    </label>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('tax_year', { defaultValue: 'Tax Year' })}
                                                    </label>
                                                    <select
                                                        value={calcTaxYear}
                                                        onChange={(e) => setCalcTaxYear(e.target.value)}
                                                        className="modern-input h-9 text-[11px] font-bold"
                                                    >
                                                        {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i).map(yr => (
                                                            <option key={yr} value={String(yr)}>{yr}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('orlof', { defaultValue: 'Orlof %' })}
                                                    </label>
                                                    <select
                                                        value={calcOrlofPercent}
                                                        onChange={(e) => setCalcOrlofPercent(e.target.value)}
                                                        className="modern-input h-9 text-[11px] font-bold"
                                                    >
                                                        <option value="0">{t('none_0', { defaultValue: 'None (0%)' })}</option>
                                                        <option value="10.17">10.17% (24 dagar)</option>
                                                        <option value="10.64">10.64% (25 dagar)</option>
                                                        <option value="12.07">12.07% (30 dagar)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('bonuses_isk', { defaultValue: 'Bonuses (ISK)' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcBonuses} onChange={(e) => setCalcBonuses(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('bonus_description', { defaultValue: 'Bonus Description' })}
                                                    </label>
                                                    <input type="text" value={calcBonusDescription} onChange={(e) => setCalcBonusDescription(e.target.value)} className="modern-input h-9" placeholder={t('e_g_on_call_bonus', { defaultValue: 'e.g. on-call, bonus' })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('other_deductions_isk', { defaultValue: 'Other Deductions (ISK)' })}
                                                    </label>
                                                    <input type="number" min="0" step="any" value={calcOtherDeductions} onChange={(e) => setCalcOtherDeductions(e.target.value)} className="modern-input h-9" />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                        {t('deductions_description', { defaultValue: 'Deductions Description' })}
                                                    </label>
                                                    <input type="text" value={calcDeductionsDescription} onChange={(e) => setCalcDeductionsDescription(e.target.value)} className="modern-input h-9" placeholder={t('e_g_canteen_dues', { defaultValue: 'e.g. canteen, dues' })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Live Payslip Card - 5 columns */}
                                    <div className="lg:col-span-5 space-y-6">
                                        {(() => {
                                            const h = parseFloat(calcHours || '0') || 0;
                                            const r = parseFloat(calcHourlyRate || '0') || 0;
                                            const oh = parseFloat(calcOvertimeHours || '0') || 0;
                                            const om = parseFloat(calcOvertimeMultiplier || '1.56') || 1.56;
                                            const oh2 = parseFloat(calcOvertime2Hours || '0') || 0;
                                            const om2 = parseFloat(calcOvertime2Multiplier || '1.794') || 1.794;
                                            const bonus = parseFloat(calcBonuses || '0') || 0;
                                            const od = parseFloat(calcOtherDeductions || '0') || 0;
                                            const regularPay = h * r;
                                            const overtime1Pay = oh * r * om;
                                            const overtime2Pay = oh2 * r * om2;
                                            const baseSubtotal = regularPay + overtime1Pay + overtime2Pay + bonus;

                                            // Accrued Holiday Pay (Orlof)
                                            const orlofPercent = parseFloat(calcOrlofPercent || '0') || 0;
                                            const orlofAmount = baseSubtotal * (orlofPercent / 100);
                                            const brutto = baseSubtotal + orlofAmount;

                                            const pensionDeduction = brutto * 0.04;
                                            const sereignDeduction = brutto * (parseFloat(calcSereignarsparnadurPercent || '0') / 100);
                                            
                                            // Union Fee (RSI) is 1.0% in all these payslips
                                            const unionFee = brutto * 0.01;

                                            const taxableIncome = Math.max(0, brutto - pensionDeduction - sereignDeduction);

                                            // Tax brackets dynamically mapped by selected Year
                                            const bracketsConfig = {
                                                '2023': [
                                                    { limit: 409986, rate: 0.3145 },
                                                    { limit: 1151780, rate: 0.3795 },
                                                    { limit: Infinity, rate: 0.4625 },
                                                ],
                                                '2024': [
                                                    { limit: 446137, rate: 0.3148 },
                                                    { limit: 1252501, rate: 0.3798 },
                                                    { limit: Infinity, rate: 0.4628 },
                                                ],
                                                '2025': [
                                                    { limit: 472005, rate: 0.3149 },
                                                    { limit: 1325127, rate: 0.3799 },
                                                    { limit: Infinity, rate: 0.4629 },
                                                ],
                                                '2026': [
                                                    { limit: 498123, rate: 0.3149 },
                                                    { limit: 1398307, rate: 0.3799 },
                                                    { limit: Infinity, rate: 0.4629 },
                                                ]
                                            };
                                            const brackets = bracketsConfig[calcTaxYear] || bracketsConfig['2026'];
                                            const personalCreditLimit = {
                                                '2023': 59665,
                                                '2024': 64926,
                                                '2025': 68691,
                                                '2026': 72492
                                            };
                                            const personalCredit = calcApplyPersonalTaxCredit ? (personalCreditLimit[calcTaxYear] || 72492) : 0;

                                            let remaining = taxableIncome;
                                            let computedTax = 0;
                                            let lastLimit = 0;
                                            for (const b of brackets) {
                                                const upper = b.limit;
                                                const span = upper === Infinity
                                                    ? remaining
                                                    : Math.max(0, Math.min(remaining, upper - lastLimit));
                                                if (span <= 0) continue;
                                                computedTax += span * b.rate;
                                                remaining -= span;
                                                lastLimit = upper;
                                                if (remaining <= 0) break;
                                            }

                                            const netTax = Math.max(0, computedTax - personalCredit);
                                            // Subtract orlofAmount from cash payout since it's directly deposited to bank
                                            const netSalary = Math.max(0, brutto - netTax - pensionDeduction - sereignDeduction - unionFee - od - orlofAmount);
                                            const employerPension = brutto * 0.115;

                                            return (
                                                <div className="bg-indigo-950 text-white rounded-[2rem] p-6 shadow-xl space-y-6">
                                                    <div className="border-b border-indigo-900 pb-4">
                                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                                                            {t('estimated_earnings_slip', { defaultValue: 'Estimated Earnings Slip' })}
                                                        </h4>
                                                        <p className="text-[10px] text-indigo-200 mt-1">
                                                            {isIcelandic ? `Skattár / Tax Year: ${calcTaxYear}` : `Tax Year / Skattár: ${calcTaxYear}`}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-3 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-indigo-200">
                                                                {isIcelandic ? `Dagvinna (${h.toFixed(2)} klst)` : `Regular pay (${h.toFixed(2)} hrs)`}
                                                            </span>
                                                            <span className="font-bold">{Math.round(regularPay).toLocaleString('is-IS')} ISK</span>
                                                        </div>
                                                        {oh > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-indigo-200">
                                                                    {isIcelandic ? `Eftirvinna (${oh.toFixed(2)} klst @ ${om}x)` : `Overtime 1 (${oh.toFixed(2)} hrs @ ${om}x)`}
                                                                </span>
                                                                <span className="font-bold">{Math.round(overtime1Pay).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        {oh2 > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-indigo-200">
                                                                    {isIcelandic ? `Næturvinna (${oh2.toFixed(2)} klst @ ${om2}x)` : `Overtime 2 (${oh2.toFixed(2)} hrs @ ${om2}x)`}
                                                                </span>
                                                                <span className="font-bold">{Math.round(overtime2Pay).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        {bonus > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-indigo-200">
                                                                    {t('bonuses_and_allowances', { defaultValue: 'Bonuses and allowances' })}
                                                                </span>
                                                                <span className="font-bold">{Math.round(bonus).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        {orlofAmount > 0 && (
                                                            <div className="flex justify-between text-indigo-300">
                                                                <span>{isIcelandic ? `Áunnið orlof (${calcOrlofPercent}%)` : `Accrued Holiday Pay (${calcOrlofPercent}%)`}</span>
                                                                <span className="font-bold">{Math.round(orlofAmount).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between border-t border-indigo-900 pt-2 font-black text-sm text-indigo-300">
                                                            <span>{t('gross_salary', { defaultValue: 'Gross Salary' })}</span>
                                                            <span>{Math.round(brutto).toLocaleString('is-IS')} ISK</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 text-xs border-t border-indigo-900 pt-4">
                                                        <h5 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">
                                                            {t('deductions', { defaultValue: 'Deductions' })}
                                                        </h5>
                                                        <div className="flex justify-between text-indigo-200">
                                                            <span>{t('pension_contribution_4', { defaultValue: 'Pension Contribution (4%)' })}</span>
                                                            <span>-{Math.round(pensionDeduction).toLocaleString('is-IS')} ISK</span>
                                                        </div>
                                                        {sereignDeduction > 0 && (
                                                            <div className="flex justify-between text-indigo-200">
                                                                <span>
                                                                    {isIcelandic ? `Séreignarsparnaður (${calcSereignarsparnadurPercent}%)` : `Private Pension (${calcSereignarsparnadurPercent}%)`}
                                                                </span>
                                                                <span>-{Math.round(sereignDeduction).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-indigo-200">
                                                            <span>{t('union_fee_rs_1_0', { defaultValue: 'Union Fee RSÍ (1.0%)' })}</span>
                                                            <span>-{Math.round(unionFee).toLocaleString('is-IS')} ISK</span>
                                                        </div>
                                                        {netTax > 0 && (
                                                            <div className="flex justify-between text-indigo-200">
                                                                <span>{t('income_tax', { defaultValue: 'Income Tax' })}</span>
                                                                <span>-{Math.round(netTax).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        {orlofAmount > 0 && (
                                                            <div className="flex justify-between text-indigo-200">
                                                                <span>{t('orlof_deposited_to_bank', { defaultValue: 'Orlof deposited to bank' })}</span>
                                                                <span>-{Math.round(orlofAmount).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                        {od > 0 && (
                                                            <div className="flex justify-between text-indigo-200">
                                                                <span>{t('other_deductions', { defaultValue: 'Other Deductions' })}</span>
                                                                <span>-{Math.round(od).toLocaleString('is-IS')} ISK</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-indigo-900/60 p-4 rounded-2xl space-y-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                                            {t('estimated_net_salary', { defaultValue: 'Estimated Net Salary' })}
                                                        </span>
                                                        <p className="text-2xl font-black text-green-400">{Math.round(netSalary).toLocaleString('is-IS')} ISK</p>
                                                    </div>

                                                    <div className="text-[10px] text-indigo-300 space-y-1">
                                                        <p className="font-bold">{t('employer_contributions', { defaultValue: 'Employer Contributions:' })}</p>
                                                        <p>{t('employer_pension_11_5', { defaultValue: 'Employer Pension (11.5%):' })} {Math.round(employerPension).toLocaleString('is-IS')} ISK</p>
                                                    </div>

                                                    <div className="flex flex-col gap-2 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!uploadUserId) {
                                                                    toast.warn(t('please_select_an_employee_first', { defaultValue: 'Please select an employee first.' }));
                                                                    return;
                                                                }
                                                                try {
                                                                    const payload = {
                                                                        user_id: parseInt(uploadUserId, 10),
                                                                        period_from: calcFromDate || null,
                                                                        period_to: calcToDate || null,
                                                                        regular_hours: parseFloat(calcHours || '0') || 0,
                                                                        hourly_rate: parseFloat(calcHourlyRate || '0') || 0,
                                                                        overtime1_hours: parseFloat(calcOvertimeHours || '0') || 0,
                                                                        overtime1_multiplier: parseFloat(calcOvertimeMultiplier || '1.56') || 1.56,
                                                                        overtime2_hours: parseFloat(calcOvertime2Hours || '0') || 0,
                                                                        overtime2_multiplier: parseFloat(calcOvertime2Multiplier || '1.794') || 1.794,
                                                                        bonuses: parseFloat(calcBonuses || '0') || 0,
                                                                        bonus_description: calcBonusDescription || null,
                                                                        other_deductions: parseFloat(calcOtherDeductions || '0') || 0,
                                                                        deductions_description: calcDeductionsDescription || null,
                                                                        sereignarsparnadur_percent: parseFloat(calcSereignarsparnadurPercent || '0') || 0,
                                                                        apply_personal_tax_credit: calcApplyPersonalTaxCredit,
                                                                        tax_year: calcTaxYear,
                                                                        orlof_percent: parseFloat(calcOrlofPercent || '0') || 0
                                                                    };

                                                                    const res = await axiosInstance.post('/accounting/payslips/estimate', payload, {
                                                                        responseType: 'blob'
                                                                    });

                                                                    const blob = new Blob([res.data], { type: 'application/pdf' });
                                                                    const link = document.createElement('a');
                                                                    link.href = window.URL.createObjectURL(blob);
                                                                    link.download = `launaaaetlun_${uploadUserId}.pdf`;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                    toast.success(t('salary_estimate_downloaded_as_pdf', { defaultValue: 'Salary estimate downloaded as PDF.' }));
                                                                } catch (error) {
                                                                    console.error('Download estimate failed:', error);
                                                                    toast.error(t('failed_to_download_salary_estimate', { defaultValue: 'Failed to download salary estimate PDF.' }));
                                                                }
                                                            }}
                                                            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-indigo-950 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-100 transition shadow"
                                                        >
                                                            {t('download_pdf_estimate', { defaultValue: 'Download PDF Estimate' })}
                                                        </button>

                                                        {isManagement && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setUploadBrutto(brutto.toFixed(0));
                                                                    setUploadNetto(netSalary.toFixed(0));
                                                                    toast.info(t('values_copied_to_official_upload', { defaultValue: 'Values copied to official upload form.' }));
                                                                }}
                                                                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-850 transition"
                                                            >
                                                                {t('copy_to_official_upload', { defaultValue: 'Copy to Official Upload' })}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </section>
                        );
                    })()}
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
                                            <td className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t(lr.leave_type, { defaultValue: lr.leave_type })}</td>
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

                    {/* Official Payslip Upload & Generation Form - Only visible to accountant/admin */}
                    {isManagement && (
                        <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">
                                        {t('official_payroll', { defaultValue: 'Official Payroll' })}
                                    </p>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                        {t('payslip_registry', { defaultValue: 'Payslip Registry' })}
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                        {t('save_the_salary_calculation_officially', { defaultValue: 'Save the salary calculation officially as a certified payslip in the employee database.' })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">
                                        {t('upload_signed_pdf', { defaultValue: 'Upload Signed PDF' })}
                                    </h3>
                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!uploadUserId || !uploadIssueDate || !uploadBrutto || !uploadNetto || !uploadFile) {
                                                toast.warn(t('fill_all_fields_and_select', { defaultValue: 'Fill all fields and select a PDF.' }));
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
                                                toast.success(t('payslip_uploaded', { defaultValue: 'Payslip uploaded.' }));
                                                setUploadBrutto('');
                                                setUploadNetto('');
                                                setUploadFile(null);
                                                fetchAccountingData();
                                            } catch (error) {
                                                console.error('Payslip upload failed:', error);
                                                toast.error(t('failed_to_upload', { defaultValue: 'Failed to upload.' }));
                                            } finally {
                                                setIsUploadingPayslip(false);
                                            }
                                        }}
                                        className="space-y-3 text-xs"
                                    >
                                        <div>
                                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                {t('employee', { defaultValue: 'Employee' })}
                                            </label>
                                            <select
                                                value={uploadUserId}
                                                onChange={(e) => {
                                                    const userId = e.target.value;
                                                    setUploadUserId(userId);
                                                    const emp = employees.find(u => String(u.id) === String(userId));
                                                    if (emp) {
                                                        setCalcHourlyRate(String(emp.hourly_rate || ''));
                                                    }
                                                }}
                                                className="modern-input h-9 text-[11px]"
                                            >
                                                <option value="">{t('select_employee', { defaultValue: 'Select employee' })}</option>
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
                                                    {t('issue_date', { defaultValue: 'Issue Date' })}
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
                                                    {t('signed_pdf', { defaultValue: 'Signed PDF' })}
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                    className="block w-full text-[11px] text-gray-600"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    Brúttólaun (ISK)
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
                                                    Nettólaun (ISK)
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
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={isUploadingPayslip}
                                                className="inline-flex items-center px-6 py-2 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-indigo-700 transition disabled:opacity-50"
                                            >
                                                {isUploadingPayslip ? (t('sending', { defaultValue: 'Sending...' })) : (t('upload_pdf', { defaultValue: 'Upload PDF' }))}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">
                                        {t('autogenerate_save', { defaultValue: 'Autogenerate & Save' })}
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {t('this_button_generates_an_official', { defaultValue: "This button generates an official payslip in PDF format based on the values in the calculator above, saves it on the server, and links it to the employee's salary history." })}
                                    </p>
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
                                                toast.success(t('official_payslip_generated_and_saved', { defaultValue: 'Official payslip generated and saved.' }));
                                                fetchAccountingData();
                                            } catch (error) {
                                                console.error('Auto payslip generation failed:', error);
                                                toast.error(t('failed_to_generate_payslip', { defaultValue: 'Failed to generate payslip.' }));
                                            } finally {
                                                setIsUploadingPayslip(false);
                                            }
                                        }}
                                        className="inline-flex items-center px-6 py-2.5 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black transition disabled:opacity-50"
                                    >
                                        {t('auto_generate_save', { defaultValue: 'Auto-generate & Save' })}
                                    </button>
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
                                        <option value="">{t('all', { defaultValue: 'All' })}</option>
                                        <option value="project">{t('project', { defaultValue: 'Project' })}</option>
                                        <option value="car">{t('car', { defaultValue: 'Car' })}</option>
                                        <option value="tool">{t('tool', { defaultValue: 'Tool' })}</option>
                                        <option value="repair">{t('repair', { defaultValue: 'Repair' })}</option>
                                        <option value="clothing">{t('clothing', { defaultValue: 'Clothing' })}</option>
                                        <option value="other">{t('other', { defaultValue: 'Other' })}</option>
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
                                        <option value="">{t('all', { defaultValue: 'All' })}</option>
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
                                        placeholder={t('search_desc_ref', { defaultValue: 'Search description or reference...' })}
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

                                    <div className="flex justify-end mb-4">
                                        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl flex items-center gap-1 mr-4">
                                            <button 
                                                onClick={() => setChartFlow('out')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${chartFlow === 'out' ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                Money Out
                                            </button>
                                            <button 
                                                onClick={() => setChartFlow('in')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${chartFlow === 'in' ? 'bg-white dark:bg-gray-800 text-green-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                Money In
                                            </button>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl flex items-center gap-1">
                                            <button 
                                                onClick={() => setChartType('pie')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${chartType === 'pie' ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                Pie Chart
                                            </button>
                                            <button 
                                                onClick={() => setChartType('bar')}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                Bar Chart
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700">
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-4 text-center">
                                                {chartFlow === "out" ? "Money Out by Category" : "Money In by Category"}
                                            </h3>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {chartType === 'pie' ? (
                                                        <PieChart>
                                                            <Pie data={overview.by_category} dataKey={chartFlow === "out" ? "total_out" : "total_in"} nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}>
                                                                {overview.by_category.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#3b82f6', '#ef4444'][index % 7]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value) => `${value.toLocaleString()} ISK`} />
                                                        </PieChart>
                                                    ) : (
                                                        <BarChart data={overview.by_category}>
                                                            <XAxis dataKey="category" tick={{fontSize: 10}} />
                                                            <YAxis tick={{fontSize: 10}} />
                                                            <Tooltip formatter={(value) => `${value.toLocaleString()} ISK`} />
                                                            <Bar dataKey={chartFlow === "out" ? "total_out" : "total_in"} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    )}
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700">
                                            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-4 text-center">
                                                {chartFlow === "out" ? "Money Out by Project" : "Money In by Project"}
                                            </h3>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {chartType === 'pie' ? (
                                                        <PieChart>
                                                            <Pie data={(overview.by_project && overview.by_project.length > 0) ? overview.by_project.map(p => ({...p, project_id: p.project_id || "other"})) : [{project_id: "other", total_out: 0, total_in: 0}]} dataKey={chartFlow === "out" ? "total_out" : "total_in"} nameKey="project_id" cx="50%" cy="50%" outerRadius={100} label={({name, percent}) => percent > 0 ? `${name === "other" || name === "None" ? "Other" : (projects.find(p => p.id === name)?.name || `Proj ${name}`)} ${(percent * 100).toFixed(0)}%` : ''}>
                                                                {overview.by_project?.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#ef4444'][index % 7]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value) => `${value.toLocaleString()} ISK`} labelFormatter={(label) => label === "other" || label === "None" ? "Other (Unlinked)" : (projects.find(p => p.id === label)?.name || `Project ${label}`)} />
                                                        </PieChart>
                                                    ) : (
                                                        <BarChart data={overview.by_project?.map(p => ({...p, project_id: p.project_id || "other"})) || []}>
                                                            <XAxis dataKey="project_id" tick={{fontSize: 10}} tickFormatter={(val) => val === "other" || val === "None" ? "Other" : (projects.find(p => p.id === val)?.name?.substring(0, 8) || `P${val}`)} />
                                                            <YAxis tick={{fontSize: 10}} />
                                                            <Tooltip formatter={(value) => `${value.toLocaleString()} ISK`} labelFormatter={(label) => label === "other" || label === "None" ? "Other (Unlinked)" : (projects.find(p => p.id === label)?.name || `Project ${label}`)} />
                                                            <Bar dataKey={chartFlow === "out" ? "total_out" : "total_in"} fill="#10b981" radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    )}
                                                </ResponsiveContainer>
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
                                            <option value="project">{t('project', { defaultValue: 'Project' })}</option>
                                            <option value="car">{t('car', { defaultValue: 'Car' })}</option>
                                            <option value="tool">{t('tool', { defaultValue: 'Tool' })}</option>
                                            <option value="repair">{t('repair', { defaultValue: 'Repair' })}</option>
                                            <option value="clothing">{t('clothing', { defaultValue: 'Clothing' })}</option>
                                            <option value="other">{t('other', { defaultValue: 'Other' })}</option>
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
                                        <option value="">{t('unlinked', { defaultValue: 'Unlinked' })}</option>
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

            </div> {/* End max-w-7xl container */}

            {/* Detailed Entries List spanning full width */}
            {isManagement && activeTab === 'financial' && (
                <div className="w-full px-4 md:px-8 mt-8 mb-12">
                    <button 
                        onClick={() => setShowDetailedEntries(!showDetailedEntries)}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors w-full shadow-sm"
                    >
                        {showDetailedEntries ? 'Hide Detailed Entries List' : 'Show Detailed Entries List'}
                    </button>
                    
                    {showDetailedEntries && (
                        <div className="mt-6 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm animate-in fade-in duration-500">
                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider rounded-tl-xl">{t('date', { defaultValue: 'Date' })}</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider">{t('amount', { defaultValue: 'Amount' })}</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider">{t('type_cat', { defaultValue: 'Type / Cat' })}</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider">{t('project', { defaultValue: 'Project' })}</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider">{t('desc_ref', { defaultValue: 'Desc / Ref' })}</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-wider text-right rounded-tr-xl">{t('actions', { defaultValue: 'Actions' })}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {allExpenses.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                                {editingExpenseId === e.id ? (
                                                    <>
                                                        <td className="px-4 py-3">
                                                            <input type="date" value={editingExpenseData.date} onChange={(ev) => setEditingExpenseData({...editingExpenseData, date: ev.target.value})} className="modern-input h-8 w-full" />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input type="number" value={editingExpenseData.amount} onChange={(ev) => setEditingExpenseData({...editingExpenseData, amount: ev.target.value})} className="modern-input h-8 w-24" />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select value={editingExpenseData.flow_type} onChange={(ev) => setEditingExpenseData({...editingExpenseData, flow_type: ev.target.value})} className="modern-input h-8 w-16 mb-1">
                                                                <option value="out">{t('out', { defaultValue: 'Out' })}</option>
                                                                <option value="in">{t('in', { defaultValue: 'In' })}</option>
                                                            </select>
                                                            <select value={editingExpenseData.category} onChange={(ev) => setEditingExpenseData({...editingExpenseData, category: ev.target.value})} className="modern-input h-8 w-20">
                                                                <option value="car">{t('car', { defaultValue: 'Car' })}</option>
                                                                <option value="tool">{t('tool', { defaultValue: 'Tool' })}</option>
                                                                <option value="repair">{t('repair', { defaultValue: 'Repair' })}</option>
                                                                <option value="clothing">{t('clothing', { defaultValue: 'Clothing' })}</option>
                                                                <option value="project">{t('project', { defaultValue: 'Project' })}</option>
                                                                <option value="other">{t('other', { defaultValue: 'Other' })}</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select value={editingExpenseData.project_id || ''} onChange={(ev) => setEditingExpenseData({...editingExpenseData, project_id: ev.target.value})} className="modern-input h-8 w-full">
                                                                <option value="">{t('none', { defaultValue: 'None' })}</option>
                                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input type="text" placeholder="Desc" value={editingExpenseData.description || ''} onChange={(ev) => setEditingExpenseData({...editingExpenseData, description: ev.target.value})} className="modern-input h-8 w-full mb-1" />
                                                            <input type="text" placeholder="Ref" value={editingExpenseData.reference || ''} onChange={(ev) => setEditingExpenseData({...editingExpenseData, reference: ev.target.value})} className="modern-input h-8 w-full" />
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleEditExpenseSubmit(e.id)} className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold">{t('save', { defaultValue: 'Save' })}</button>
                                                                <button onClick={() => setEditingExpenseId(null)} className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded font-bold">{t('cancel', { defaultValue: 'Cancel' })}</button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-3 font-bold">
                                                            <span className={e.flow_type === 'in' ? 'text-emerald-600' : 'text-red-500'}>
                                                                {e.flow_type === 'in' ? '+' : '-'}{e.amount.toLocaleString()} ISK
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 capitalize">{e.flow_type} / {e.category}</td>
                                                        <td className="px-4 py-3">{e.project_id ? (projects.find(p => p.id === e.project_id)?.name || `Project ${e.project_id}`) : 'Other'}</td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            <div>{e.description || '-'}</div>
                                                            <div className="text-[10px]">{e.reference ? `Ref: ${e.reference}` : ''}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => { setEditingExpenseId(e.id); setEditingExpenseData(e); }} className="text-indigo-500 hover:text-indigo-700 font-bold uppercase tracking-widest text-[9px]">{t('edit', { defaultValue: 'Edit' })}</button>
                                                                <button onClick={() => handleDeleteExpense(e.id)} className="text-red-500 hover:text-red-700 font-bold uppercase tracking-widest text-[9px]">{t('delete', { defaultValue: 'Del' })}</button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                        {allExpenses.length === 0 && (
                                            <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500 italic">No entries found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isManagement && activeTab === 'approvals' && (
                <div className="w-full px-4 md:px-8 mt-8 mb-12">
                    <InvoiceApprovalQueue />
                </div>
            )}
        </div>
    );

}

export default AccountingPage;