import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    BanknotesIcon, 
    CalendarIcon, 
    ArrowDownTrayIcon, 
    PlusIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

const AccountingPage = () => {
    const { user: currentUser } = useAuth();
    const [payslips, setPayslips] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'management'

    const isManagement = currentUser?.role === 'admin' || 
                         currentUser?.role === 'accountant' || 
                         currentUser?.is_superuser;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch personal data
            const [payslipsRes, leavesRes] = await Promise.all([
                axiosInstance.get('/accounting/payslips/me'),
                axiosInstance.get('/accounting/leave-requests/me')
            ]);
            setPayslips(payslipsRes.data);
            setLeaveRequests(leavesRes.data);

            // If manager, fetch pending leaves for review
            if (isManagement) {
                const pendingRes = await axiosInstance.get('/accounting/leave-requests/pending');
                setPendingLeaves(pendingRes.data);
            }
        } catch (error) {
            toast.error("Failed to load accounting data.");
        } finally {
            setLoading(false);
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
            toast.error("Error downloading file.");
        }
    };

    const handleReviewLeave = async (requestId, status, comment = "") => {
        try {
            await axiosInstance.put(`/accounting/leave-requests/${requestId}/review`, {
                status,
                manager_comment: comment
            });
            toast.success(`Leave request ${status}ed`);
            fetchInitialData(); // Refresh lists
        } catch (error) {
            toast.error("Failed to update leave request.");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Accounting Dashboard...</div>;

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounting & HR</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your payslips and leave requests</p>
                </div>
                {isManagement && (
                    <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border dark:border-gray-700">
                        <button 
                            onClick={() => setActiveTab('personal')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            My Records
                        </button>
                        <button 
                            onClick={() => setActiveTab('management')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'management' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            Management
                        </button>
                    </div>
                )}
            </header>

            {activeTab === 'personal' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payslips Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="font-semibold flex items-center">
                                <BanknotesIcon className="h-5 w-5 mr-2 text-indigo-500" />
                                My Payslips
                            </h2>
                        </div>
                        <div className="divide-y dark:divide-gray-700">
                            {payslips.length > 0 ? payslips.map(ps => (
                                <div key={ps.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(ps.issue_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-gray-500">Netto: {ps.amount_netto} PLN</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDownloadPayslip(ps.id, ps.filename)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition"
                                        title="Download PDF"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )) : (
                                <p className="p-8 text-center text-gray-500 italic">No payslips found.</p>
                            )}
                        </div>
                    </section>

                    {/* Leave Requests Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="font-semibold flex items-center">
                                <CalendarIcon className="h-5 w-5 mr-2 text-green-500" />
                                My Leave Requests
                            </h2>
                            <button className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md flex items-center transition">
                                <PlusIcon className="h-4 w-4 mr-1" /> New Request
                            </button>
                        </div>
                        <div className="divide-y dark:divide-gray-700">
                            {leaveRequests.length > 0 ? leaveRequests.map(lr => (
                                <div key={lr.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {lr.start_date} to {lr.end_date}
                                        </p>
                                        <p className="text-xs text-gray-500 uppercase">{lr.leave_type}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        lr.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                        lr.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {lr.status}
                                    </span>
                                </div>
                            )) : (
                                <p className="p-8 text-center text-gray-500 italic">No leave requests found.</p>
                            )}
                        </div>
                    </section>
                </div>
            ) : (
                /* Management Tab Content */
                <div className="space-y-8">
                    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="font-semibold flex items-center">
                                <ClockIcon className="h-5 w-5 mr-2 text-orange-500" />
                                Pending Leave Approvals
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-400 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-6 py-3">Employee</th>
                                        <th className="px-6 py-3">Dates</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {pendingLeaves.length > 0 ? pendingLeaves.map(lr => (
                                        <tr key={lr.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{lr.user_name}</td>
                                            <td className="px-6 py-4">{lr.start_date} — {lr.end_date}</td>
                                            <td className="px-6 py-4 uppercase text-xs">{lr.leave_type}</td>
                                            <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                                <button 
                                                    onClick={() => handleReviewLeave(lr.id, 'approved')}
                                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                                                    title="Approve"
                                                >
                                                    <CheckCircleIcon className="h-6 w-6" />
                                                </button>
                                                <button 
                                                    onClick={() => handleReviewLeave(lr.id, 'rejected')}
                                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    title="Reject"
                                                >
                                                    <XCircleIcon className="h-6 w-6" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">No pending requests.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default AccountingPage;