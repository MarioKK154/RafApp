import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select';
import { 
    ClipboardDocumentCheckIcon, 
    ChevronLeftIcon,
    BriefcaseIcon,
    UserIcon,
    ShieldCheckIcon,
    ClockIcon,
    ExclamationCircleIcon,
    CheckBadgeIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    TagIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Date Formatter for Registry Input Compatibility
 */
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch (e) { return ''; }
};

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician'];
const EDITABLE_TASK_STATUSES = ["To Do", "In Progress", "Done", "Blocked"];

function TaskEditPage() {
    const { t, i18n } = useTranslation();
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Registry Data States
    const [taskData, setTaskData] = useState(null);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [potentialPredecessors, setPotentialPredecessors] = useState([]);
    
    // Telemetry Form States
    const [formData, setFormData] = useState({
        title: '', description: '', status: 'To Do', priority: 'Medium',
        start_date: '', due_date: '', project_id: '', assignee_id: '',
        predecessors: [],
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommissioning, setIsCommissioning] = useState(false);

    const isSuperuser = currentUser?.is_superuser;
    const canManageTasks = currentUser && (['admin', 'project manager', 'team leader'].includes(currentUser.role) || isSuperuser);
    const canCommissionTask = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);

    /**
     * Protocol: Sync Task Specifications & Metadata
     */
    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && taskId) {
            setIsLoadingData(true);
            try {
                const [taskRes, projectsRes, usersRes] = await Promise.all([
                    axiosInstance.get(`/tasks/${taskId}`),
                    axiosInstance.get('/projects/', { params: { limit: 500 } }),
                    axiosInstance.get('/users/', { params: { limit: 1000 } })
                ]);

                const task = taskRes.data;
                setTaskData(task);
                setProjects(projectsRes.data);
                
                setUsers(usersRes.data.filter(u => 
                    (ASSIGNABLE_ROLES.includes(u.role) || u.is_superuser) &&
                    (isSuperuser || u.tenant_id === task.tenant_id)
                ));
                
                if (task.project_id) {
                    const tasksRes = await axiosInstance.get(`/tasks/?project_id=${task.project_id}&limit=200`);
                    const otherTasks = tasksRes.data.filter(t => t.id !== task.id);
                    
                    const predOptions = otherTasks.map(t => ({ value: t.id, label: t.title }));
                    setPotentialPredecessors(predOptions);

                    const selectedPreds = (task.predecessor_ids || []).map(id => {
                        const match = otherTasks.find(t => t.id === id);
                        return { value: id, label: match ? match.title : `Task #${id}` };
                    });

                    setFormData({
                        title: task.title ?? '',
                        description: task.description ?? '',
                        status: task.status ?? 'To Do',
                        priority: task.priority ?? 'Medium',
                        start_date: formatDateForInput(task.start_date),
                        due_date: formatDateForInput(task.due_date),
                        project_id: task.project_id?.toString() ?? '',
                        assignee_id: task.assignee_id?.toString() ?? '',
                        predecessors: selectedPreds,
                    });
                }
            } catch (err) {
                setError(err.response?.status === 404 ? t('no_data') : t('sync_error'));
            } finally {
                setIsLoadingData(false);
            }
        }
    }, [taskId, isAuthenticated, authIsLoading, isSuperuser, t]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handlePredecessorChange = (selected) => {
        setFormData(prev => ({ ...prev, predecessors: selected || [] }));
    };

    /**
     * Protocol: Update Registry Details
     * FIXED: Payload sanitized to match Pydantic TaskUpdate schema exactly.
     */
    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        if (!canManageTasks) return;
        setIsSubmitting(true);
        
        // CRITICAL FIX: Strip 'predecessors' and other non-schema fields from the Task update payload
        const taskUpdatePayload = {
            title: formData.title,
            description: formData.description || null,
            status: formData.status,
            priority: formData.priority,
            start_date: formData.start_date || null,
            due_date: formData.due_date || null,
            project_id: Number(formData.project_id),
            assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        };
        
        try {
            // Update Core Task
            await axiosInstance.put(`/tasks/${taskId}`, taskUpdatePayload);
            
            // Sync Dependencies separately
            const originalIds = new Set(taskData.predecessor_ids || []);
            const newIds = new Set(formData.predecessors.map(p => p.value));

            const toAdd = [...newIds].filter(id => !originalIds.has(id));
            const toRemove = [...originalIds].filter(id => !newIds.has(id));
            
            await Promise.all([
                ...toAdd.map(id => axiosInstance.post(`/tasks/${taskId}/dependencies`, { predecessor_id: id })),
                ...toRemove.map(id => axiosInstance.delete(`/tasks/${taskId}/dependencies/${id}`))
            ]);

            toast.success(t('save_changes', { defaultValue: 'Work details synchronized.' }));
            fetchPageData();
        } catch (err) {
            console.error("Update failed:", err);
            // Enhanced error reporting
            const serverDetail = err.response?.data?.detail;
            toast.error(typeof serverDetail === 'string' ? serverDetail : t('update_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Feature #6: Official Commissioning Protocol
     */
    const handleCommissionTask = async () => {
        if (!canCommissionTask || taskData.status !== "Done") return;
        setIsCommissioning(true);
        try {
            await axiosInstance.post(`/tasks/${taskId}/commission`);
            toast.success(t('task_archived'));
            fetchPageData();
        } catch (err) { 
            toast.error(t('commission_failed'));
        } finally { 
            setIsCommissioning(false); 
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text={t('syncing')} />;
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <ExclamationCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-tighter">{error}</h2>
                <Link to="/tasks" className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                    {t('view_all')}
                </Link>
            </div>
        );
    }

    const isLocked = taskData?.is_commissioned;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <Link to="/tasks" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-4 uppercase tracking-[0.2em]">
                        <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> {t('tasks')}
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                                {taskData?.title}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                    taskData?.status === 'Done' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                    {taskData?.status}
                                </span>
                                {isLocked && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 text-[9px] font-black uppercase tracking-widest">
                                        <CheckBadgeIcon className="h-3.5 w-3.5" /> {t('commissioned', { defaultValue: 'Commissioned' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {canCommissionTask && taskData?.status === "Done" && !isLocked && (
                    <button 
                        onClick={handleCommissionTask} 
                        disabled={isCommissioning}
                        className="inline-flex items-center px-10 h-14 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-teal-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isCommissioning ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheckIcon className="h-5 w-5 mr-3" />}
                        {t('commission_task')}
                    </button>
                )}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <form onSubmit={handleUpdateDetails} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-8">
                        <fieldset disabled={isLocked || !canManageTasks || isSubmitting} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                        <BriefcaseIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('project')}
                                    </label>
                                    <select name="project_id" required value={formData.project_id} onChange={handleChange} className="modern-input appearance-none">
                                        {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                    </select>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('description')}</label>
                                    <textarea name="description" rows="4" value={formData.description} onChange={handleChange} className="modern-input h-auto py-4 text-sm font-medium" placeholder={t('detail_placeholder')} />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                        <TagIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('priority')}
                                    </label>
                                    <select name="priority" value={formData.priority} onChange={handleChange} className="modern-input appearance-none font-bold">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                        <ArrowPathIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('status')}
                                    </label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="modern-input appearance-none font-bold">
                                        {EDITABLE_TASK_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                        <ClockIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('start_date')}
                                    </label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="modern-input text-xs font-bold uppercase"/>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                        <ClockIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('due_date')}
                                    </label>
                                    <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="modern-input text-xs font-bold uppercase"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-1.5">
                                    <UserIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('manager')}
                                </label>
                                <select name="assignee_id" value={formData.assignee_id} onChange={handleChange} className="modern-input appearance-none">
                                    <option value="">{t('unassigned')}</option>
                                    {users.map(u => ( <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('timeline')} {t('dependencies', { defaultValue: 'Dependencies' })}</label>
                                <Select
                                    isMulti 
                                    options={potentialPredecessors} 
                                    value={formData.predecessors}
                                    onChange={handlePredecessorChange} 
                                    className="modern-select-container" 
                                    classNamePrefix="react-select"
                                    isDisabled={isLocked || isSubmitting}
                                    placeholder={t('select_tasks')}
                                />
                                <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic flex items-center gap-1.5">
                                    <ExclamationCircleIcon className="h-3.5 w-3.5" />
                                    {t('dependency_hint')}
                                </p>
                            </div>
                        </fieldset>

                        {!isLocked && canManageTasks && (
                            <div className="flex justify-end pt-8 border-t border-gray-50 dark:border-gray-700">
                                <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-10 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg transition transform active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2"><ArrowPathIcon className="h-5 w-5 animate-spin" /> {t('syncing')}</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><CheckBadgeIcon className="h-5 w-5" /> {t('save_changes')}</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Fingerprint Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ClipboardDocumentCheckIcon className="h-24 w-24" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-8 flex items-center gap-2">
                            <ShieldCheckIcon className="h-4 w-4" /> {t('system_root', { defaultValue: 'Task Telemetry' })}
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">{t('sku', { defaultValue: 'Internal ID' })}</p>
                                <p className="font-mono text-sm font-bold text-indigo-200">#TSK-{taskId}</p>
                            </div>
                            <div>
                                <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest mb-1">{t('created_at', { defaultValue: 'Initialized' })}</p>
                                <p className="text-xs font-bold text-gray-100 tracking-tight">
                                    {taskData?.created_at ? new Date(taskData.created_at).toLocaleString(i18n.language === 'is' ? 'is-IS' : 'en-GB') : '---'}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Sub-components */}
            <div className="mt-16 space-y-16 pb-20 animate-in slide-in-from-bottom-6 duration-700 delay-200">
                <section><TaskComments taskId={taskId} /></section>
                <section><TaskPhotos taskId={taskId} /></section>
            </div>
        </div>
    );
}

export default TaskEditPage;