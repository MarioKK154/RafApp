import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { XMarkIcon, CalendarDaysIcon, BriefcaseIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const AssignmentModal = ({ isOpen, onClose, selectedUser, selectedDate, existingAssignment, onAssignmentCreated, leaveBlocks = [] }) => {
    const { t, i18n } = useTranslation();
    const { user: currentUser } = useAuth();

    const translateLeaveType = useCallback((rawType) => {
        if (!rawType) return '';
        const key = rawType.toLowerCase().replace(/\s+/g, '_');
        const isIcelandic = i18n.language.startsWith('is');
        
        const leaveMap = {
            vacation: isIcelandic ? 'Orlof' : 'Vacation',
            sick: isIcelandic ? 'Veikindi' : 'Sick Leave',
            sick_leave: isIcelandic ? 'Veikindaleyfi' : 'Sick Leave',
            unpaid: isIcelandic ? 'Launalaust leyfi' : 'Unpaid Leave',
            unpaid_leave: isIcelandic ? 'Launalaust leyfi' : 'Unpaid Leave',
            paternal_maternal: isIcelandic ? 'Fæðingarorlof' : 'Parental Leave',
            parental: isIcelandic ? 'Fæðingarorlof' : 'Parental Leave',
            other: isIcelandic ? 'Annað' : 'Other'
        };

        if (leaveMap[key]) return leaveMap[key];
        return t(rawType, { defaultValue: rawType });
    }, [i18n.language, t]);

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

    // Sync form with selected date or existing assignment
    useEffect(() => {
        if (existingAssignment) {
            setFormData({
                project_id: existingAssignment.project_id ? String(existingAssignment.project_id) : '',
                task_id: '',
                start_date: existingAssignment.start_date || '',
                end_date: existingAssignment.end_date || '',
                notes: existingAssignment.notes || ''
            });
        } else if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            setFormData({
                project_id: '',
                task_id: '',
                start_date: dateStr,
                end_date: dateStr,
                notes: ''
            });
        }
    }, [selectedDate, existingAssignment]);

    /**
     * Fetch options for the modal.
     */
    useEffect(() => {
        const fetchOptions = async () => {
            if (!isOpen || !currentUser) return;
            setIsLoadingOptions(true);

            try {
                if (isProjectManager) {
                    let activeLog = null;
                    try {
                        const activeRes = await axiosInstance.get('/timelogs/active');
                        activeLog = activeRes.data || null;
                    } catch (err) {
                        console.error('Failed to resolve active timelog for PM:', err);
                    }

                    if (activeLog && activeLog.project_id) {
                        const projectMeta = activeLog.project || null;
                        setActiveProject(
                            projectMeta
                                ? projectMeta
                                : { id: activeLog.project_id, name: 'Active Project', project_number: null }
                        );

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

                            if (filtered.length > 0) {
                                setFormData((prev) => ({
                                    ...prev,
                                    task_id: prev.task_id || String(filtered[0].id || ''),
                                }));
                            }
                        } catch (err) {
                            console.error('Failed to load tasks for active project.', err);
                            toast.error(t('toast_load_active_tasks_failed'));
                        }

                        return;
                    }

                    try {
                        const res = await axiosInstance.get('/projects/');
                        setProjects(res.data.filter((p) => p.status !== 'Completed'));
                    } catch (error) {
                        console.error('Failed to load project registry.', error);
                    }
                    return;
                }

                const res = await axiosInstance.get('/projects/');
                setProjects(res.data.filter((p) => p.status !== 'Completed'));
            } catch (error) {
                console.error('Failed to load assignment options.', error);
                toast.error(t('toast_load_scheduling_metadata_failed'));
            } finally {
                setIsLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [isOpen, currentUser, isProjectManager]);

    const handleDeleteAssignment = async (singleDayOnly = true) => {
        if (!existingAssignment?.id) return;
        const isIcelandic = i18n.language.startsWith('is');

        let targetDateStr = null;
        if (selectedDate) {
            targetDateStr = typeof selectedDate === 'string' ? selectedDate : format(selectedDate, 'yyyy-MM-dd');
        }

        const isMultiDay = existingAssignment.start_date !== existingAssignment.end_date;

        if (singleDayOnly && isMultiDay && targetDateStr) {
            if (window.confirm(isIcelandic ? `Fjarlægja eingöngu daginn ${targetDateStr} hjá ${selectedUser?.full_name || 'starfsmanni'}?` : `Remove only ${targetDateStr} for ${selectedUser?.full_name || 'user'}?`)) {
                setIsSubmitting(true);
                try {
                    await axiosInstance.delete(`/assignments/${existingAssignment.id}?target_date=${targetDateStr}`);
                    toast.success(isIcelandic ? `Dagurinn ${targetDateStr} fjarlægður úr dagskrá!` : `Single day ${targetDateStr} unassigned!`);
                    onAssignmentCreated();
                    onClose();
                } catch (err) {
                    toast.error(err.response?.data?.detail || 'Failed to remove single day from schedule.');
                } finally {
                    setIsSubmitting(false);
                }
            }
            return;
        }

        if (window.confirm(t('confirm_remove_assignment', { userName: selectedUser?.full_name, projectName: existingAssignment.project_name || 'Project' }))) {
            setIsSubmitting(true);
            try {
                await axiosInstance.delete(`/assignments/${existingAssignment.id}`);
                toast.success(t('toast_assignment_purged'));
                onAssignmentCreated();
                onClose();
            } catch (err) {
                toast.error(err.response?.data?.detail || t('toast_delete_assignment_failed'));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let resolvedProjectId = null;
            if (isProjectManager && activeProject && activeProject.id) {
                resolvedProjectId = activeProject.id;
            } else {
                resolvedProjectId = parseInt(formData.project_id, 10);
            }

            if (!resolvedProjectId || Number.isNaN(resolvedProjectId)) {
                toast.error(t('toast_select_target_project_task'));
                setIsSubmitting(false);
                return;
            }

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
            toast.success(t('toast_personnel_deployed', { name: selectedUser.full_name }));
            onAssignmentCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || t('toast_deployment_protocol_failed'));
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
                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{t('assignment_protocol', { defaultValue: 'Assignment Protocol' })}</h3>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{t('deploying_user', { defaultValue: 'Deploying: {{name}}', name: selectedUser?.full_name })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition text-gray-400"><XMarkIcon className="h-5 w-5" /></button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {leaveConflict && (
                        <div className="flex gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/80 text-amber-900 dark:text-amber-100">
                            <CalendarDaysIcon className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">
                                    {t('leave_unavailable_alert', { defaultValue: 'Listed as unavailable (approved leave)' })}
                                </p>
                                <p className="text-xs font-bold mt-1">
                                    {translateLeaveType(leaveConflict.leave_type)}{' '}
                                    <span className="font-mono opacity-90">
                                        ({String(leaveConflict.start_date)} → {String(leaveConflict.end_date)})
                                    </span>
                                </p>
                                <p className="text-[10px] font-semibold mt-2 opacity-80">
                                    {t('leave_conflict_proceed', { defaultValue: 'Assignment can still proceed—confirm with HR if needed.' })}
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
                                    {t('active_project_context', { defaultValue: 'Active Project Context' })}
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
                                    {t('target_task_project', { defaultValue: 'Target Task on This Project' })}
                                </label>
                                <div className="relative">
                                    <CalendarDaysIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                    <select
                                        required
                                        value={formData.task_id}
                                        onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                    >
                                        <option value="">{t('select_active_task', { defaultValue: '-- Select Active Task --' })}</option>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('target_project', { defaultValue: 'Target Project' })}</label>
                            <div className="relative">
                                <BriefcaseIcon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                                <select
                                    required
                                    value={formData.project_id}
                                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                                >
                                    <option value="">
                                        {t('select_active_project', { defaultValue: '-- Select Active Project --' })}
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('start_date', { defaultValue: 'Start Date' })}</label>
                            <input 
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('end_date', { defaultValue: 'End Date' })}</label>
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
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('operational_notes', { defaultValue: 'Operational Notes' })}</label>
                        <textarea 
                            rows="3"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder={t('notes_placeholder', { defaultValue: 'Specific instructions for this deployment...' })}
                            className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-white"
                        ></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        {existingAssignment && (
                            <>
                                {existingAssignment.start_date !== existingAssignment.end_date && selectedDate && (
                                    <button 
                                        type="button"
                                        onClick={() => handleDeleteAssignment(true)}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50 shadow-md shadow-amber-500/20"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        {i18n.language.startsWith('is') ? 'Fjarlægja þennan dag' : 'Remove This Day'}
                                    </button>
                                )}
                                <button 
                                    type="button"
                                    onClick={() => handleDeleteAssignment(false)}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50 shadow-md shadow-red-500/20"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    {i18n.language.startsWith('is') ? 'Eyða öllu tímabilinu' : 'Delete Entire Period'}
                                </button>
                            </>
                        )}
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-500/20"
                        >
                            {isSubmitting 
                                ? t('syncing', { defaultValue: 'Syncing...' }) 
                                : (existingAssignment 
                                    ? t('update_assignment', { defaultValue: 'Update Assignment' }) 
                                    : t('confirm_deployment', { defaultValue: 'Confirm Deployment' }))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentModal;