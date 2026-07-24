import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomGanttChart from '../components/CustomGanttChart';
import { 
    ChartBarSquareIcon,
    BriefcaseIcon, 
    ArrowPathIcon,
    InformationCircleIcon,
    AdjustmentsHorizontalIcon,
    ShieldExclamationIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

function GanttChartPage() {
    const { t } = useTranslation();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    // Registry Data States
    const [tasks, setTasks] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [error, setError] = useState('');

    // Role-Based Access Control
    const isSuperuser = user?.is_superuser;
    const hasAccess = user && (user.role === 'admin' || user.role === 'project manager' || isSuperuser);

    const fetchAllProjects = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && hasAccess) {
            setIsLoadingProjects(true);
            try {
                const response = await axiosInstance.get('/projects/', { params: { limit: 1000 } });
                setAllProjects(response.data);
            } catch (err) {
                console.error('Gantt project fetch error:', err);
                toast.error(t('error_loading_projects', { defaultValue: 'Failed to load project registry.' }));
            } finally {
                setIsLoadingProjects(false);
            }
        }
    }, [isAuthenticated, authIsLoading, hasAccess, t]);

    const fetchTasksForGantt = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && hasAccess) {
            setIsLoadingTasks(true);
            setError('');
            const params = { limit: 1000 };
            if (selectedProjectId) params.project_id = selectedProjectId;
            try {
                const response = await axiosInstance.get('/tasks/', { params });
                const activeTasks = response.data.filter(t =>
                    !['Commissioned', 'Done', 'Completed', 'Cancelled'].includes(t.status)
                );
                setTasks(activeTasks);
            } catch (err) {
                console.error('Gantt tasks fetch error:', err);
                setError(t('timeline_sync_failed', { defaultValue: 'Failed to synchronize task timeline.' }));
                toast.error(t('gantt_data_sync_failed'));
            } finally {
                setIsLoadingTasks(false);
            }
        }
    }, [isAuthenticated, authIsLoading, selectedProjectId, hasAccess, t]);

    useEffect(() => {
        if (!authIsLoading && isAuthenticated) {
            if (hasAccess) fetchAllProjects();
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [fetchAllProjects, authIsLoading, isAuthenticated, navigate, hasAccess]);

    useEffect(() => {
        if (!isLoadingProjects && hasAccess) {
            fetchTasksForGantt();
        }
    }, [fetchTasksForGantt, isLoadingProjects, hasAccess]);

    const activeAndPlanningProjects = useMemo(() =>
        allProjects.filter(p => !['Completed', 'Archived'].includes(p.status)),
        [allProjects]
    );

    const activeProjectIds = useMemo(() =>
        new Set(allProjects.map(p => p.id)),
        [allProjects]
    );

    const ganttTasks = useMemo(() => {
        let filtered = tasks.filter(t => activeProjectIds.has(t.project_id) && t.start_date && t.due_date);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                (t.title || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [tasks, activeProjectIds, searchQuery]);

    const handleTaskClick = (task) => {
        navigate(`/tasks?task_id=${task.id}`);
    };

    // Stats
    const totalWithDates = tasks.filter(t => t.start_date && t.due_date).length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;

    // Security Gateway: Block unauthorized personnel
    if (!authIsLoading && isAuthenticated && !hasAccess) {
        return (
            <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-white dark:bg-gray-800 p-12 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 text-center max-w-lg">
                    <ShieldExclamationIcon className="h-16 w-16 text-indigo-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                        {t('access_denied', { defaultValue: 'Clearance Required' })}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 leading-relaxed">
                        {t('gantt_restriction_msg', { defaultValue: 'Timeline telemetry is restricted to management and administrative personnel.' })}
                    </p>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition">
                        {t('return_to_base', { defaultValue: 'Return to Dashboard' })}
                    </Link>
                </div>
            </div>
        );
    }

    if (authIsLoading || (isLoadingProjects && allProjects.length === 0)) {
        return <LoadingSpinner text={t('authorizing')} size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-[1600px] animate-in fade-in duration-500">
            {/* ── Header ── */}
            <header className="mb-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] via-[#1e3a5f] to-[#0f172a] px-8 py-8 shadow-2xl">
                    {/* Decorative orbs */}
                    <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/40">
                                <ChartBarSquareIcon className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                    {t('gantt_chart', { defaultValue: 'Gantt Chart' })}
                                </h1>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                    {t('project_timeline_visual')}
                                </p>
                            </div>
                        </div>

                        {/* Mini stat pills */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                                <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-300" />
                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{ganttTasks.length} {t('tasks')}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{inProgress} {t('active')}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                                <BriefcaseIcon className="h-4 w-4 text-blue-300" />
                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{activeAndPlanningProjects.length} {t('projects')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Filters & Search ── */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                {/* Project Filter */}
                <div className="relative flex-1 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        <BriefcaseIcon className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <select
                        id="projectGanttFilter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="block w-full pl-10 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                    >
                        <option value="">{t('all_projects')}</option>
                        {activeAndPlanningProjects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative sm:w-72 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('search_tasks')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-4 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>

                {/* Refresh */}
                <button
                    onClick={() => { fetchTasksForGantt(); fetchAllProjects(); }}
                    disabled={isLoadingTasks}
                    className="h-12 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${isLoadingTasks ? 'animate-spin' : ''}`} />
                    {t('refresh')}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100 dark:border-red-800">
                    <InformationCircleIcon className="h-5 w-5 shrink-0" /> {error}
                </div>
            )}

            {/* ── Main Gantt Area ── */}
            {isLoadingTasks ? (
                <div className="py-32 flex justify-center">
                    <LoadingSpinner text={t('synchronizing_task_timeline')} />
                </div>
            ) : (
                <CustomGanttChart
                    tasks={ganttTasks}
                    projects={activeAndPlanningProjects}
                    onTaskClick={handleTaskClick}
                />
            )}

            {/* ── Legend Info ── */}
            <div className="mt-8 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 flex items-start gap-4">
                <InformationCircleIcon className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-widest leading-relaxed">
                    {t('gantt_legend_description')}
                </p>
            </div>
        </div>
    );
}

export default GanttChartPage;