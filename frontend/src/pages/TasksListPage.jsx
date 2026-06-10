import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import SuperTenantSelector from '../components/SuperTenantSelector';
import Select from 'react-select';
import { 
    PlusIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    PlayIcon, 
    CheckCircleIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    UserIcon,
    BriefcaseIcon,
    ClipboardDocumentListIcon,
    AdjustmentsHorizontalIcon,
    ArchiveBoxIcon,
    ShieldCheckIcon,
    NoSymbolIcon,
    LockClosedIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

/**
 * Technical Debounce Hook: Prevents telemetry flood during search
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

/**
 * Utility: Parse URL telemetry parameters
 */
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

function TasksListPage() {
    const { t, i18n } = useTranslation();
    const { user, activeLog } = useAuth(); // SYNC: Accessing active clock-in session
    const navigate = useNavigate();
    const query = useQuery();

    // Data State
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter State
    const [projectOptions, setProjectOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState({ value: '', label: t('all_statuses', { defaultValue: 'All Statuses' }) });
    const [sortBy, setSortBy] = useState({ value: 'id', label: t('sort_recent', { defaultValue: 'Recent' }) });
    const [sortDir, setSortDir] = useState({ value: 'desc', label: 'DESC' });
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const selectedTenantId = 1; const setSelectedTenantId = () => {};

    // Permission Matrix
    const isSuperuser = user?.is_superuser;
    const isAdminOrPM = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);
    const canCreateTasks = user && (['admin', 'project manager', 'team leader'].includes(user.role) || isSuperuser);
    const canUpdateStatus = user && (['admin', 'project manager', 'team leader', 'electrician'].includes(user.role) || isSuperuser);

    /**
     * Protocol: Deep-Link Handler
     * Logic: Detect task_id in URL and jump to detail node.
     */
    useEffect(() => {
        const taskId = query.get('task_id');
        if (taskId) {
            navigate(`/tasks/${taskId}`, { replace: true });
        }
    }, [query, navigate]);

    /**
     * Protocol: Sync Metadata (Projects/Users) for Filters
     */
    const fetchFilters = useCallback(async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects/', { params: { limit: 500 } }),
                axiosInstance.get('/users/', { params: { limit: 500 } })
            ]);

            const projOpts = [{ value: '', label: t('all_projects', { defaultValue: 'All Projects' }) }, ...projRes.data.map(p => ({ value: p.id, label: p.name }))];
            setProjectOptions(projOpts);

            const staffOpts = [{ value: '', label: t('all_staff', { defaultValue: 'All Staff' }) }, ...userRes.data.map(u => ({ value: u.id, label: u.full_name || u.email }))];
            setUserOptions(staffOpts);

            const queryProjectId = query.get('project_id');
            if (queryProjectId) {
                const initialProject = projOpts.find(p => p.value === parseInt(queryProjectId));
                if (initialProject) setSelectedProject(initialProject);
            }
        } catch (error) {
            console.error('Registry metadata sync failure', error);
        }
    }, [query, t]);

    /**
     * Protocol: Sync Task Registry
     * CONTEXTUAL LOCK: If clocked in, ignore filters and lock to active project.
     */
    const fetchTasks = useCallback(() => {
        setIsLoading(true);
        setError('');

        // Implementation of Contextual Lock
        const effectiveProjectId = activeLog?.project_id || selectedProject?.value;

        axiosInstance.get('/tasks/', {
            params: {
                project_id: effectiveProjectId || undefined,
                assignee_id: selectedAssignee?.value || undefined,
                status: selectedStatus?.value || undefined,
                search: debouncedSearchTerm || undefined,
                sort_by: sortBy?.value || 'id',
                sort_dir: sortDir?.value || 'desc',
                limit: 500,
                tenant_id: isSuperuser ? selectedTenantId || undefined : undefined,
            }
        })
        .then(response => {
            if (!selectedStatus?.value) {
                setTasks(response.data.filter(t => t.status !== 'Commissioned'));
            } else {
                setTasks(response.data);
            }
        })
        .catch((error) => {
            console.error('Task list fetch failed:', error);
            setError(t('task_sync_failed', { defaultValue: 'Failed to retrieve task registry.' }));
        })
        .finally(() => setIsLoading(false));
    }, [selectedProject, selectedAssignee, selectedStatus, debouncedSearchTerm, sortBy, sortDir, activeLog, t, isSuperuser, selectedTenantId]);

    useEffect(() => { fetchFilters(); }, [fetchFilters]);
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    /**
     * Protocol: Task Lifecycle Management
     */
    const handleUpdateStatus = async (taskId, newStatus, taskTitle) => {
        try {
            await axiosInstance.put(`/tasks/${taskId}`, { status: newStatus });
            const successMsg = newStatus === 'Commissioned' 
                ? t('task_archived', { defaultValue: 'Task commissioned and archived.' })
                : t('status_updated', { defaultValue: 'Work status updated.' });
            
            toast.success(`${taskTitle}: ${successMsg}`);
            fetchTasks(); 
        } catch (error) {
            console.error('Status update failed:', error);
            toast.error(t('update_failed'));
        }
    };

    // Styling Helpers
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Commissioned': return 'bg-gray-100 text-gray-400 border-gray-200';
            case 'Done': 
            case 'Awaiting Commissioning': return 'bg-green-50 text-green-700 border-green-100 shadow-sm shadow-green-100/50';
            case 'In Progress': return 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm shadow-indigo-100/50';
            case 'Blocked': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'text-red-600 font-black';
            case 'medium': return 'text-orange-600 font-bold';
            default: return 'text-gray-400 font-medium';
        }
    };

    const statusOptions = [
        { value: '', label: t('active_tasks', { defaultValue: 'Active Work' }) },
        { value: 'To Do', label: t('status_todo', { defaultValue: 'To Do' }) },
        { value: 'In Progress', label: t('status_progress', { defaultValue: 'In Progress' }) },
        { value: 'Awaiting Commissioning', label: t('status_awaiting', { defaultValue: 'Awaiting Commissioning' }) },
        { value: 'Commissioned', label: t('status_archived', { defaultValue: 'Commissioned (Archive)' }) },
        { value: 'Blocked', label: t('status_blocked', { defaultValue: 'Blocked' }) },
    ];

    const taskTelemetry = useMemo(() => {
        const counts = {
            total: 0,
            todo: 0,
            inProgress: 0,
            awaiting: 0,
            blocked: 0,
            commissioned: 0,
            doneLike: 0, // awaiting + done (if any)
            overdue: 0,
        };

        const now = new Date();

        for (const task of tasks) {
            counts.total += 1;
            const status = (task?.status || '').toLowerCase();
            if (status === 'to do') counts.todo += 1;
            else if (status === 'in progress') counts.inProgress += 1;
            else if (status === 'awaiting commissioning') counts.awaiting += 1;
            else if (status === 'blocked') counts.blocked += 1;
            else if (status === 'commissioned') counts.commissioned += 1;

            // treat Awaiting Commissioning as "done-like" in the active list
            if (status === 'awaiting commissioning' || status === 'done') counts.doneLike += 1;

            if (task?.due_date && status !== 'commissioned') {
                const due = new Date(task.due_date);
                if (!Number.isNaN(due.getTime()) && due < now && status !== 'awaiting commissioning') {
                    counts.overdue += 1;
                }
            }
        }

        const completionPct = counts.total > 0 ? Math.round((counts.doneLike / counts.total) * 100) : 0;
        return { counts, completionPct };
    }, [tasks]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('tasks')}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {isSuperuser && (
                            null
                        )}
                        {canCreateTasks && (
                            <button
                                onClick={() => navigate('/tasks/new')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all duration-150 ease-out transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                            >
                                <PlusIcon className="h-5 w-5" /> {t('new_task')}
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                try {
                                    const effectiveProjectId = activeLog?.project_id || selectedProject?.value;
                                    const response = await axiosInstance.get('/tasks/export/pdf', {
                                        params: {
                                            project_id: effectiveProjectId || undefined,
                                            assignee_id: selectedAssignee?.value || undefined,
                                            status: selectedStatus?.value || undefined,
                                            search: debouncedSearchTerm || undefined,
                                        },
                                        responseType: 'blob',
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    window.URL.revokeObjectURL(url);
                                } catch (err) {
                                    console.error('Task export failed:', err);
                                    toast.error(t('export_failed_tasks', { defaultValue: 'Failed to export tasks.' }));
                                }
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all duration-150 ease-out hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                        >
                            <DocumentTextIcon className="h-5 w-5" /> {t('export_pdf')}
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl border border-red-200 dark:border-red-800 text-sm font-bold">
                    {error}
                </div>
            )}

            {/* Progress Telemetry */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
                            {t('task_progress', { defaultValue: 'Task progress' })}
                        </p>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.22em]">
                            {taskTelemetry.completionPct}%
                        </p>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-[width] duration-500"
                            style={{ width: `${taskTelemetry.completionPct}%` }}
                        />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Pill label={t('todo', { defaultValue: 'To Do' })} value={taskTelemetry.counts.todo} tone="gray" />
                        <Pill label={t('in_progress', { defaultValue: 'In Progress' })} value={taskTelemetry.counts.inProgress} tone="indigo" />
                        <Pill label={t('awaiting', { defaultValue: 'Awaiting' })} value={taskTelemetry.counts.awaiting} tone="green" />
                        <Pill label={t('blocked', { defaultValue: 'Blocked' })} value={taskTelemetry.counts.blocked} tone="red" />
                    </div>
                </div>

                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em] mb-3">
                        {t('status_distribution', { defaultValue: 'Status distribution' })}
                    </p>
                    <StackedBar
                        segments={[
                            { label: 'To Do', value: taskTelemetry.counts.todo, className: 'bg-gray-400' },
                            { label: 'In Progress', value: taskTelemetry.counts.inProgress, className: 'bg-indigo-600' },
                            { label: 'Awaiting', value: taskTelemetry.counts.awaiting, className: 'bg-emerald-600' },
                            { label: 'Blocked', value: taskTelemetry.counts.blocked, className: 'bg-red-500' },
                        ]}
                    />
                    <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
                        {t('tasks_in_view', { defaultValue: 'Tasks in view' })}: <span className="text-gray-900 dark:text-gray-100">{taskTelemetry.counts.total}</span>
                    </p>
                </div>

                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em] mb-3">
                        {t('attention', { defaultValue: 'Attention' })}
                    </p>
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                {t('overdue', { defaultValue: 'Overdue' })}
                            </p>
                            <p className="text-2xl font-black tracking-tighter text-red-600">
                                {taskTelemetry.counts.overdue}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800" />
                    </div>
                    {activeLog?.project?.name && (
                        <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
                            {t('locked_to_project', { defaultValue: 'Locked to project' })}:{' '}
                            <span className="text-gray-900 dark:text-gray-100">{activeLog.project.name}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Tactical Control Bar */}
            <div className="mb-8 grid grid-cols-1 xl:grid-cols-12 gap-4 bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="xl:col-span-3 relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={t('search_placeholder')}
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="modern-input pl-11 h-12 text-xs font-bold"
                    />
                </div>

                <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Select 
                        options={projectOptions} 
                        value={activeLog ? projectOptions.find(p => p.value === activeLog.project_id) : selectedProject} 
                        onChange={setSelectedProject} 
                        isDisabled={!!activeLog}
                        placeholder={t('project')} 
                        isClearable 
                        className="modern-select-container" 
                        classNamePrefix="react-select" 
                    />
                    <Select options={userOptions} value={selectedAssignee} onChange={setSelectedAssignee} placeholder={t('personnel')} isClearable className="modern-select-container" classNamePrefix="react-select" />
                    <Select options={statusOptions} value={selectedStatus} onChange={setSelectedStatus} className="modern-select-container" classNamePrefix="react-select" />
                    <div className="flex gap-2">
                        <Select options={SORT_BY_OPTIONS} value={sortBy} onChange={setSortBy} className="flex-1 modern-select-container" classNamePrefix="react-select" />
                        <Select options={SORT_DIR_OPTIONS} value={sortDir} onChange={setSortDir} className="w-24 modern-select-container" classNamePrefix="react-select" />
                    </div>
                </div>
            </div>

            {/* Registry List */}
            {isLoading && tasks.length === 0 ? (
                <LoadingSpinner text={t('syncing')} />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tasks.length > 0 ? tasks.map(task => (
                        <div key={task.id} className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ease-out overflow-hidden">
                            <div className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                
                                <div className="flex-grow min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-5">
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none italic">
                                            <Link to={`/tasks/${task.id}`} className="hover:text-indigo-600 transition-colors">
                                                {task.title}
                                            </Link>
                                        </h2>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(task.status)}`}>
                                            {task.status}
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${getPriorityStyle(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-12 ml-1">
                                        <DetailItem icon={<BriefcaseIcon />} label={t('project')} value={task.project?.name || 'N/A'} />
                                        <DetailItem icon={<UserIcon />} label={t('lead')} value={task.assignee?.full_name || 'Unassigned'} />
                                        <DetailItem icon={<CalendarIcon />} label={t('due')} value={task.due_date ? new Date(task.due_date).toLocaleDateString(i18n.language === 'is' ? 'is-IS' : 'en-GB') : t('not_specified')} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-6 lg:pt-0 border-gray-50 dark:border-gray-800">
                                    {canUpdateStatus && task.status === 'To Do' && (
                                        <CommandButton onClick={() => handleUpdateStatus(task.id, 'In Progress', task.title)} icon={<PlayIcon className="h-4 w-4" />} label={t('start_work')} variant="indigo" />
                                    )}
                                    {canUpdateStatus && task.status === 'In Progress' && (
                                        <CommandButton onClick={() => handleUpdateStatus(task.id, 'Awaiting Commissioning', task.title)} icon={<CheckCircleIcon className="h-4 w-4" />} label={t('mark_done')} variant="green" />
                                    )}
                                    {isAdminOrPM && task.status === 'Awaiting Commissioning' && (
                                        <CommandButton onClick={() => handleUpdateStatus(task.id, 'Commissioned', task.title)} icon={<ShieldCheckIcon className="h-4 w-4" />} label={t('commission_task')} variant="indigo" />
                                    )}
                                    
                                    <Link to={`/tasks/${task.id}`} className="flex-1 lg:flex-none flex items-center justify-center h-12 px-6 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-indigo-600 rounded-2xl transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                                        <AdjustmentsHorizontalIcon className="h-5 w-5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700">
                            <div className="inline-flex p-8 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                                <ArchiveBoxIcon className="h-12 w-12 text-gray-200" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('no_data')}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2">
                                {activeLog ? `You are locked to ${activeLog.project?.name}` : t('adjust_filters')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StackedBar({ segments }) {
    const total = segments.reduce((sum, s) => sum + (s.value || 0), 0) || 1;
    return (
        <div className="h-3 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 flex">
            {segments.map((s) => {
                const pct = Math.max(0, Math.round(((s.value || 0) / total) * 100));
                if (pct <= 0) return null;
                return <div key={s.label} className={s.className} style={{ width: `${pct}%` }} title={`${s.label}: ${s.value}`} />;
            })}
        </div>
    );
}

function Pill({ label, value, tone }) {
    const tones = {
        gray: 'bg-gray-50 text-gray-600 border-gray-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${tones[tone] || tones.gray}`}>
            <span>{label}</span>
            <span className="text-gray-900/70">{value}</span>
        </span>
    );
}

/**
 * Technical Component: Metadata Item
 */
function DetailItem({ icon, label, value }) {
    return (
        <div className="flex items-center gap-3 group">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                {React.cloneElement(icon, { className: "h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-600" })}
            </div>
            <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{value}</p>
            </div>
        </div>
    );
}

/**
 * Technical Component: Operational Command Button
 */
function CommandButton({ onClick, icon, label, variant }) {
    const variants = {
        indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 dark:shadow-none',
        green: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100 dark:shadow-none',
        gray: 'bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600'
    };

    return (
        <button onClick={onClick} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-150 ease-out transform hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md ${variants[variant] || variants.gray}`}>
            {icon}
            <span>{label}</span>
        </button>
    );
}

const SORT_BY_OPTIONS = [
    { value: 'id', label: 'Recent' },
    { value: 'title', label: 'Alphabetical' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Deadline' },
];

const SORT_DIR_OPTIONS = [
    { value: 'asc', label: 'ASC' },
    { value: 'desc', label: 'DESC' },
];

export default TasksListPage;