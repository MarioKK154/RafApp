import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { XMarkIcon, CalendarDaysIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const AssignmentModal = ({ isOpen, onClose, selectedUser, selectedDate, onAssignmentCreated }) => {
    const [projects, setProjects] = useState([]);
    const [formData, setFormData] = useState({
        project_id: '',
        start_date: '',
        end_date: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync form with the date clicked on the grid
    useEffect(() => {
        if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            setFormData(prev => ({ ...prev, start_date: dateStr, end_date: dateStr }));
        }
    }, [selectedDate]);

    // Fetch active projects for the dropdown
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await axiosInstance.get('/projects/');
                setProjects(res.data.filter(p => p.status !== 'Completed'));
            } catch (error) {
                console.error('Failed to load project registry.', error);
            }
        };
        if (isOpen) fetchProjects();
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                user_id: selectedUser.id,
                project_id: parseInt(formData.project_id)
            };
            await axiosInstance.post('/assignments/', payload);
            toast.success(`Personnel deployed: ${selectedUser.full_name}`);
            onAssignmentCreated(); // Refresh the grid
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Deployment protocol failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <header className="px-8 py-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Assignment Protocol</h3>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Deploying: {selectedUser?.full_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition text-gray-400"><XMarkIcon className="h-5 w-5" /></button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Project Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Project</label>
                        <div className="relative">
                            <BriefcaseIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                            <select 
                                required
                                value={formData.project_id}
                                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                            >
                                <option value="">-- Select Active Project --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>[{p.project_number}] {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date Range Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                            <input 
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                            <input 
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Notes</label>
                        <textarea 
                            rows="3"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder="Specific instructions for this deployment..."
                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                        ></textarea>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                    >
                        {isSubmitting ? 'Syncing...' : 'Confirm Deployment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;