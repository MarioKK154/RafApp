import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ClockIcon, 
    BriefcaseIcon, 
    ArrowPathIcon,
    InformationCircleIcon,
    AdjustmentsHorizontalIcon,
    ShieldExclamationIcon
} from '@heroicons/react/24/outline';

function GanttChartPage() {
    const { t, i18n } = useTranslation();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    // Registry Data States
    const [tasks, setTasks] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [error, setError] = useState('');

    // Protocol: Role-Based Access Control (RBAC)
    const isSuperuser = user?.is_superuser;
    const hasAccess = user && (user.role === 'admin' || user.role === 'project manager' || isSuperuser);

    /**
     * Protocol: Sync Project Registry for Filters
     */
    const fetchAllProjects = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && hasAccess) {
            setIsLoadingProjects(true);
            try {
                const response = await axiosInstance.get('/projects/', { params: { limit: 1000 } });
                setAllProjects(response.data);
            } catch (err) {
                console.error("Gantt Project Fetch Error:", err);
                toast.error(t('error_loading_projects', { defaultValue: "Failed to load project registry." }));
            } finally {
                setIsLoadingProjects(false);
            }
        }
    }, [isAuthenticated, authIsLoading, hasAccess, t]);

    /**
     * Protocol: Sync Task Timeline Telemetry
     */
    const fetchTasksForGantt = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && hasAccess) {
            setIsLoadingTasks(true);
            setError('');
            
            const params = { limit: 1000 };
            if (selectedProjectId) {
                params.project_id = selectedProjectId;
            }

            try {
                const response = await axiosInstance.get('/tasks/', { params });
                setTasks(response.data);
            } catch (err) {
                setError(t('timeline_sync_failed', { defaultValue: 'Failed to synchronize task timeline.' }));
                toast.error('Gantt data sync failed.');
            } finally {
                setIsLoadingTasks(false);
            }
        }
    }, [isAuthenticated, authIsLoading, selectedProjectId, hasAccess, t]);

    useEffect(() => {
        if (!authIsLoading && isAuthenticated) {
            if (hasAccess) {
                fetchAllProjects();
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [fetchAllProjects, authIsLoading, isAuthenticated, navigate, hasAccess]);

    useEffect(() => {
        if (!isLoadingProjects && hasAccess) {
            fetchTasksForGantt();
        }
    }, [fetchTasksForGantt, isLoadingProjects, hasAccess]);

    /**
     * Protocol: Google Charts Selection Handler
     * Logic: Extracts ID from 'task-123' format and navigates to Registry Detail
     */
    const handleChartSelection = ({ chartWrapper }) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0) {
            const row = selection[0].row;
            // chartData structure: [columns, ...rows]
            // Task ID is in the first column of the selected row
            const internalId = chartData[row + 1][0]; 
            const taskId = internalId.replace('task-', '');
            
            // Deployment: Navigate to Task Detail View
            navigate(`/tasks?task_id=${taskId}`);
        }
    };

    /**
     * Protocol: Format Telemetry for Google Gantt API
     */
    const chartData = useMemo(() => {
        const columns = [
            { type: 'string', label: 'Task ID' },
            { type: 'string', label: 'Task Name' },
            { type: 'string', label: 'Resource' },
            { type: 'date', label: 'Start Date' },
            { type: 'date', label: 'End Date' },
            { type: 'number', label: 'Duration' },
            { type: 'number', label: 'Percent Complete' },
            { type: 'string', label: 'Dependencies' },
        ];

        const rows = tasks
            .filter(task => task.start_date && task.due_date) 
            .map(task => {
                let percentComplete = 0;
                if (task.status === 'Done' || task.status === 'Commissioned') percentComplete = 100;
                else if (task.status === 'In Progress') percentComplete = 50;

                const projectForTask = allProjects.find(p => p.id === task.project_id);
                const resourceName = projectForTask ? projectForTask.name : 'Unassigned';

                const dependencies = (task.predecessor_ids && task.predecessor_ids.length > 0)
                    ? task.predecessor_ids.map(id => `task-${id}`).join(',')
                    : null;

                return [
                    `task-${task.id}`,
                    task.title,
                    resourceName,
                    new Date(task.start_date),
                    new Date(task.due_date),
                    null,
                    percentComplete,
                    dependencies,
                ];
            });

        return [columns, ...rows];
    }, [tasks, allProjects]);

    const dynamicHeight = chartData.length > 1 ? (chartData.length - 1) * 45 + 100 : 400;

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
                    <Link to="/dashboard" className="inline-flex h-12 px-8 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl items-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none">
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
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <ClockIcon className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none italic">
                            Infrastructure Timeline
                        </h1>
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
                        {isSuperuser ? "Global mission critical oversight" : `Operational log: ${user?.tenant?.name}`}
                    </p>
                </div>
            </header>

            {/* Tactical Console */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        <BriefcaseIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <select
                        id="projectGanttFilter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="block w-full pl-12 pr-4 h-14 rounded-2xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                    >
                        <option value="">Integrated Timeline / All Nodes</option>
                        {allProjects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name} {isSuperuser ? `[NODE: ${project.tenant_id}]` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    {tasks.length} Interval Nodes
                </div>
            </div>

            {error && (
                <div className="mb-8 p-5 bg-red-50 text-red-700 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100">
                    <InformationCircleIcon className="h-5 w-5" /> {error}
                </div>
            )}

            {/* Main Deployment Area */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 overflow-hidden">
                {isLoadingTasks ? (
                    <div className="py-32 flex justify-center"><LoadingSpinner text="Simulating timeline variables..." /></div>
                ) : chartData.length > 1 ? (
                    <div className="w-full overflow-x-auto custom-scrollbar">
                        <div style={{ minWidth: '1000px' }}>
                            <Chart
                                chartType="Gantt"
                                width="100%"
                                height={`${dynamicHeight}px`}
                                data={chartData}
                                chartEvents={[
                                    {
                                        eventName: "select",
                                        callback: handleChartSelection,
                                    },
                                ]}
                                options={{
                                    height: dynamicHeight,
                                    gantt: {
                                        trackHeight: 40,
                                        barHeight: 30,
                                        labelStyle: {
                                            fontName: 'Inter, sans-serif',
                                            fontSize: 11,
                                            color: '#111827',
                                        },
                                        arrow: {
                                            angle: 45,
                                            width: 1.5,
                                            color: '#6366f1',
                                            radius: 10,
                                        },
                                        criticalPathEnabled: true,
                                        criticalPathStyle: {
                                            stroke: '#ef4444',
                                            strokeWidth: 3,
                                        },
                                        innerGridHorizLine: {
                                            stroke: '#f3f4f6',
                                            strokeWidth: 1,
                                        },
                                        innerGridTrack: {
                                            fill: '#ffffff',
                                        },
                                        innerGridDarkTrack: {
                                            fill: '#f9fafb',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-32 text-center">
                        <div className="flex flex-col items-center opacity-20 grayscale">
                            <ArrowPathIcon className="h-16 w-16 text-gray-900 dark:text-white mb-4" />
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Timeline Insufficient</h3>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 max-w-xs mx-auto leading-relaxed">
                            Task date data required to initialize visual schedule.
                        </p>
                    </div>
                )}
            </div>

            {/* Metadata Legend */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50 flex gap-4">
                    <InformationCircleIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                    <div>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-black uppercase tracking-widest">
                            Dependency arrows (indigo) indicate sequential logic. Red paths identify the **Critical Path** — delays here will shift completion dates globally.
                        </p>
                    </div>
                </div>
                <div className="p-6 bg-gray-50/50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#6366f1] rounded-lg shadow-sm"></div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Deployment</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-[#ef4444] rounded-lg shadow-sm"></div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Critical Path</span>
                    </div>
                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] italic ml-auto">
                        Click node to inspect
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GanttChartPage;