import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { XMarkIcon, CalendarDaysIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const AssignmentModal = ({ isOpen, onClose, selectedUser, selectedDate, onAssignmentCreated, leaveBlocks = [] }) => {
    const { user: currentUser } = useAuth();

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;
    const isProjectManager = currentUser?.role === 'project manager' && !isSuperuser;

    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activeProject, setActiveProject] = useState(null);

    const [formData, setFormData] = useState({
        project_id: '',
        task_id: '',
        start_date: '',
        end_date: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    const leaveConflict = useMemo(() => {
        if (!selectedUser?.id || !leaveBlocks?.length || !formData.start_date || !formData.end_date) {
            return null;
        }
        const s = formData.start_date;
        const e = formData.end_date;
        return (
            leaveBlocks.find((b) => {
                if (b.user_id !== selectedUser.id) return false;
                return s <= String(b.end_date) && e >= String(b.start_date);
            }) || null
        );
    }, [selectedUser, leaveBlocks, formData.start_date, formData.end_date]);

    // Sync form with the date clicked on the grid
    useEffect(() => {
        if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            setFormData(prev => ({ ...prev, start_date: dateStr, end_date: dateStr }));
        }
    }, [selectedDate]);

    /**
     * Fetch options for the modal.
     * - Admin/Superuser: full active project list (current behavior)
     * - Project Manager: prefer active project & their own tasks on that project;
     *   if no active project can be detected, fall back to project list.
     */
    useEffect(() => {
        const fetchOptions = async () => {
            if (!isOpen || !currentUser) return;
            setIsLoadingOptions(true);

            try {
                if (isProjectManager) {
                    // 1. Determine the active project from current open timelog, if any
                    let activeLog = null;
                    try {
                        const activeRes = await axiosInstance.get('/timelogs/active');
                        activeLog = activeRes.data || null;
                    } catch (err) {
                        // If status endpoint fails, fall back to projects below
                        console.error('Failed to resolve active timelog for PM:', err);
                    }

                    if (activeLog && activeLog.project_id) {
                        const projectMeta = activeLog.project || null;
                        setActiveProject(
                            projectMeta
                                ? projectMeta
                                : { id: activeLog.project_id, name: 'Active Project', project_number: null }
                        );

                        // 2. Fetch tasks on that project assigned to the PM
                        try {
                            const tasksRes = await axiosInstance.get('/tasks/', {
                                params: {
                                    project_id: activeLog.project_id,
                                    assignee_id: currentUser.id,
                                    limit: 500,
                                },
                            });
                            const rawTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
                            const filtered = rawTasks.filter((t) => {
                                const s = (t.status || '').toString();
                                return s !== 'Done' && s !== 'Commissioned' && s !== 'Cancelled';
                            });
                            setTasks(filtered);

                            // If we have at least one task, default-select it
                            if (filtered.length > 0) {
                                setFormData((prev) => ({
                                    ...prev,
                                    task_id: prev.task_id || String(filtered[0].id || ''),
                                }));
                            }
                        } catch (err) {
                            console.error('Failed to load tasks for active project.', err);
                            toast.error('Could not load active tasks for scheduling.');
                        }

                        return; // We have active project context; skip generic project list.
                    }

                    // Fallback: no active project – load projects like admin behavior
                    try {
                        const res = await axiosInstance.get('/projects/');
                        setProjects(res.data.filter((p) => p.status !== 'Completed'));
                    } catch (error) {
                        console.error('Failed to load project registry.', error);
                    }
                    return;
                }

                // Default for admin / superuser and other roles that reach this modal
                const res = await axiosInstance.get('/projects/');
                setProjects(res.data.filter((p) => p.status !== 'Completed'));
            } catch (error) {
                console.error('Failed to load assignment options.', error);
                toast.error('Failed to load scheduling metadata.');
            } finally {
                setIsLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [isOpen, currentUser, isProjectManager]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Resolve project_id depending on role/mode
            let resolvedProjectId = null;
            if (isProjectManager && activeProject && activeProject.id) {
                resolvedProjectId = activeProject.id;
            } else {
                resolvedProjectId = parseInt(formData.project_id, 10);
            }

            if (!resolvedProjectId || Number.isNaN(resolvedProjectId)) {
                toast.error('Please select a target project/task for this deployment.');
                setIsSubmitting(false);
                return;
            }

            // Merge task information into notes for PMs so the grid shows task context
            let mergedNotes = formData.notes;
            if (isProjectManager && formData.task_id) {
                const taskIdInt = parseInt(formData.task_id, 10);
                const matchingTask = tasks.find((t) => t.id === taskIdInt);
                const taskLabel = matchingTask
                    ? `Task #${matchingTask.id}: ${matchingTask.title}`
                    : `Task #${taskIdInt}`;
                const prefix = `[TASK] ${taskLabel}`;
                mergedNotes = mergedNotes ? `${prefix} | ${mergedNotes}` : prefix;
            }

            const payload = {
                start_date: formData.start_date,
                end_date: formData.end_date,
                notes: mergedNotes,
                user_id: selectedUser.id,
                project_id: resolvedProjectId
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
                    {leaveConflict && (
                        <div className="flex gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/80 text-amber-900 dark:text-amber-100">
                            <CalendarDaysIcon className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">
                                    Listed as unavailable (approved leave)
                                </p>
                                <p className="text-xs font-bold mt-1">
                                    {leaveConflict.leave_type}{' '}
                                    <span className="font-mono opacity-90">
                                        ({String(leaveConflict.start_date)} → {String(leaveConflict.end_date)})
                                    </span>
                                </p>
                                <p className="text-[10px] font-semibold mt-2 opacity-80">
                                    Assignment can still proceed—confirm with HR if needed.
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Project Selection */}
                    {/* Project / Task Selection */}
                    {isProjectManager && activeProject && tasks.length > 0 ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Active Project Context
                                </label>
                                <div className="px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                                    <span className="truncate">
                                        {activeProject.project_number ? `[${activeProject.project_number}] ` : ''}
                                        {activeProject.name || 'Active Project'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Target Task on This Project
                                </label>
                                <div className="relative">
                                    <CalendarDaysIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                    <select
                                        required
                                        value={formData.task_id}
                                        onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- Select Active Task --</option>
                                        {tasks.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                #{t.id} — {t.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Project</label>
                            <div className="relative">
                                <BriefcaseIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <select
                                    required
                                    value={formData.project_id}
                                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                >
                                    <option value="">
                                        {isProjectManager
                                            ? '-- Select Project (no active context) --'
                                            : '-- Select Active Project --'}
                                    </option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            [{p.project_number}] {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

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
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Syncing...' : 'Confirm Deployment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;