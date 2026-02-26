import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { CloudArrowUpIcon, UserIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const PayslipUploadPage = () => {
    const navigate = useNavigate();
    const { user: _currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        user_id: '',
        issue_date: '',
        amount_brutto: '',
        amount_netto: '',
        file: null
    });

    useEffect(() => {
        // Fetch users to populate the selection dropdown
        axiosInstance.get('/users/')
            .then(res => setUsers(res.data))
            .catch(() => toast.error("Could not load employee list"))
            .finally(() => setLoadingUsers(false));
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'file') {
            setFormData(prev => ({ ...prev, file: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.file) {
            toast.error("Please select a PDF payslip.");
            return;
        }

        setIsSubmitting(true);
        
        // Form Data for multipart/form-data (File upload)
        const uploadData = new FormData();
        uploadData.append('user_id', formData.user_id);
        uploadData.append('issue_date', formData.issue_date);
        uploadData.append('amount_brutto', formData.amount_brutto);
        uploadData.append('amount_netto', formData.amount_netto);
        uploadData.append('file', formData.file);

        try {
            await axiosInstance.post('/accounting/payslips', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Payslip uploaded successfully!");
            navigate('/accounting');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Upload failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700">
                <div className="p-6 border-b dark:border-gray-700">
                    <h1 className="text-xl font-bold flex items-center">
                        <CloudArrowUpIcon className="h-6 w-6 mr-2 text-blue-500" />
                        Upload Employee Payslip
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Employee Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-1 flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" /> Employee
                        </label>
                        <select
                            name="user_id"
                            required
                            value={formData.user_id}
                            onChange={handleChange}
                            disabled={loadingUsers}
                            className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">{loadingUsers ? 'Loading employees...' : '-- Select Employee --'}</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Issue Date</label>
                            <input
                                type="date"
                                name="issue_date"
                                required
                                value={formData.issue_date}
                                onChange={handleChange}
                                className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">File (PDF)</label>
                            <input
                                type="file"
                                name="file"
                                accept=".pdf"
                                required
                                onChange={handleChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 flex items-center">
                                <BanknotesIcon className="h-4 w-4 mr-1" /> Brutto (Gross)
                            </label>
                            <input
                                type="number"
                                name="amount_brutto"
                                required
                                value={formData.amount_brutto}
                                onChange={handleChange}
                                className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 flex items-center">
                                <BanknotesIcon className="h-4 w-4 mr-1 text-green-500" /> Netto
                            </label>
                            <input
                                type="number"
                                name="amount_netto"
                                required
                                value={formData.amount_netto}
                                onChange={handleChange}
                                className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <button type="button" onClick={() => navigate('/accounting')} className="px-6 py-2 border rounded-xl dark:border-gray-600">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? "Uploading..." : "Finish Upload"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PayslipUploadPage;