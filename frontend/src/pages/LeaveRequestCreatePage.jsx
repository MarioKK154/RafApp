import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { CalendarIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

const LeaveRequestCreatePage = () => {
    const { t } = useTranslation();
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
            toast.error(t('start_date_after_end'));
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post('/accounting/leave-requests', formData);
            toast.success(t('leave_submitted_success'));
            navigate('/accounting');
        } catch (error) {
            const msg = error.response?.data?.detail || t('submit_request_failed', { defaultValue: 'Failed to submit request.' });
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 bg-white/95 dark:bg-gray-800/95">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                            <CalendarIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter italic text-gray-900 dark:text-white">
                                {t('request_time_off')}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">{t('submit_for_approval')}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Leave Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('leave_type')}</label>
                        <select
                            name="leave_type"
                            value={formData.leave_type}
                            onChange={handleChange}
                            className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="vacation">{t('vacation')}</option>
                            <option value="sick">{t('sick_leave')}</option>
                            <option value="unpaid">{t('unpaid_leave')}</option>
                            <option value="paternal">{t('paternal_maternal')}</option>
                            <option value="other">{t('other')}</option>
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('start_date')}</label>
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('end_date')}</label>
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
                            {t('additional_notes_optional')}
                        </label>
                        <textarea
                            name="reason"
                            rows="4"
                            placeholder={t('additional_notes_placeholder', { defaultValue: 'Provide any context for your manager...' })}
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
                            {t('cancel_leave')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {isSubmitting ? t('submitting') : t('send_request')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveRequestCreatePage;