import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { CalendarIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

const LeaveRequestCreatePage = () => {
    const navigate = useNavigate();
    const { user: _currentUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            toast.error("Start date cannot be after end date.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post('/accounting/leave-requests', formData);
            toast.success("Leave request submitted successfully!");
            navigate('/accounting');
        } catch (error) {
            const msg = error.response?.data?.detail || "Failed to submit request.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <CalendarIcon className="h-6 w-6 mr-2 text-indigo-600" />
                        Request Time Off
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Submit your request for manager approval.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Leave Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Leave Type</label>
                        <select
                            name="leave_type"
                            value={formData.leave_type}
                            onChange={handleChange}
                            className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="vacation">Vacation (Holiday)</option>
                            <option value="sick">Sick Leave</option>
                            <option value="unpaid">Unpaid Leave</option>
                            <option value="paternal">Paternal/Maternal</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                            <input
                                type="date"
                                name="start_date"
                                required
                                value={formData.start_date}
                                onChange={handleChange}
                                className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                            <input
                                type="date"
                                name="end_date"
                                required
                                value={formData.end_date}
                                onChange={handleChange}
                                className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-1 text-gray-400" />
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            name="reason"
                            rows="4"
                            placeholder="Provide any context for your manager..."
                            value={formData.reason}
                            onChange={handleChange}
                            className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate('/accounting')}
                            className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-md"
                        >
                            {isSubmitting ? "Submitting..." : "Send Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveRequestCreatePage;