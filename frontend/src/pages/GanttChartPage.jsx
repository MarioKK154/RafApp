import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ClockIcon, 
    BriefcaseIcon, 
    ChevronLeftIcon, 
    ArrowPathIcon,
    InformationCircleIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

function GanttChartPage() {
    const [tasks, setTasks] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [error, setError] = useState('');

    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    const isSuperuser = user?.is_superuser;

    /**
     * Fetches projects for the filter dropdown.
     * Respects multi-tenancy: Superusers see everything.
     */
    const fetchAllProjects = useCallback(async () => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoadingProjects(true);
            try {
                const response = await axiosInstance.get('/projects/', { params: { limit: 1000 } });
                setAllProjects(response.data);
            } catch (err) {
                console.error("Gantt Project Fetch Error:", err);
                toast.error("Failed to load project registry.");
            } finally {
                setIsLoadingProjects(false);
            }
        }
    }, [isAuthenticated, authIsLoading]);

    /**
     * Fetches tasks based on the selected project filter.
     */
    const fetchTasksForGantt = useCallback(async () => {
        if (!authIsLoading && isAuthenticated) {
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
                setError('Failed to synchronize task timeline.');
                toast.error('Gantt data sync failed.');
            } finally {
                setIsLoadingTasks(false);
            }
        }
    }, [isAuthenticated, authIsLoading, selectedProjectId]);

    useEffect(() => {
        if (!authIsLoading && isAuthenticated) {
            fetchAllProjects();
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [fetchAllProjects, authIsLoading, isAuthenticated, navigate]);

    useEffect(() => {
        if (!isLoadingProjects) {
            fetchTasksForGantt();
        }
    }, [fetchTasksForGantt, isLoadingProjects]);

    /**
     * Formats task data for Google Charts Gantt.
     * Maps: ID, Name, Resource, Start, End, Duration, % Complete, Dependencies.
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
            .filter(task => task.start_date && task.due_date) // Google Gantt requires both dates
            .map(task => {
                let percentComplete = 0;
                if (task.status === 'Done' || task.status === 'Commissioned') percentComplete = 100;
                else if (task.status === 'In Progress') percentComplete = 50;

                const projectForTask = allProjects.find(p => p.id === task.project_id);
                const resourceName = projectForTask ? projectForTask.name : 'Unassigned';

                // Format dependency string (task-1,task-5)
                const dependencies = (task.predecessor_ids && task.predecessor_ids.length > 0)
                    ? task.predecessor_ids.map(id => `task-${id}`).join(',')
                    : null;

                return [
                    `task-${task.id}`,
                    task.title,
                    resourceName,
                    new Date(task.start_date),
                    new Date(task.due_date),
                    null, // Duration calculated from dates
                    percentComplete,
                    dependencies,
                ];
            });

        return [columns, ...rows];
    }, [tasks, allProjects]);

    // Dynamic height calculation based on row count
    const dynamicHeight = chartData.length > 1 ? (chartData.length - 1) * 42 + 100 : 300;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ClockIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Project Gantt</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global mission critical timeline" : `Operational timeline for ${user?.tenant?.name}`}
                    </p>
                </div>
            </header>

            {/* Filter Section */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        <BriefcaseIcon className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <select
                        id="projectGanttFilter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                    >
                        <option value="">All Projects / Integrated Timeline</option>
                        {allProjects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name} {isSuperuser ? `(Tenant: ${project.tenant_id})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4" /> {tasks.length} Active Intervals
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                    <InformationCircleIcon className="h-5 w-5" /> {error}
                </div>
            )}

            {/* Chart Container */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
                {isLoadingTasks ? (
                    <div className="py-20"><LoadingSpinner text="Simulating timeline variables..." /></div>
                ) : chartData.length > 1 ? (
                    <div className="w-full overflow-x-auto">
                        <div style={{ minWidth: '800px' }}>
                            <Chart
                                chartType="Gantt"
                                width="100%"
                                height={`${dynamicHeight}px`}
                                data={chartData}
                                options={{
                                    height: dynamicHeight,
                                    gantt: {
                                        trackHeight: 35,
                                        barHeight: 25,
                                        labelStyle: {
                                            fontName: 'Inter, sans-serif',
                                            fontSize: 12,
                                            color: '#374151',
                                        },
                                        arrow: {
                                            angle: 100,
                                            width: 1.5,
                                            color: '#6366f1',
                                            radius: 0,
                                        },
                                        criticalPathEnabled: true,
                                        criticalPathStyle: {
                                            stroke: '#ef4444',
                                            strokeWidth: 2,
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
                    <div className="py-20 text-center">
                        <div className="flex flex-col items-center opacity-20">
                            <ArrowPathIcon className="h-12 w-12 text-gray-900 dark:text-white mb-2" />
                            <h3 className="text-lg font-black uppercase tracking-tighter italic">Timeline Insufficient</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                            No tasks with valid start and end dates were found. Update task metadata to generate a visual schedule.
                        </p>
                    </div>
                )}
            </div>

            {/* Legend / Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                        Dependency arrows (indigo) indicate sequential workflow requirements. Red paths indicate the **Critical Path**, where delays will impact project completion.
                    </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#6366f1] rounded-sm shadow-sm"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Normal Task</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#ef4444] rounded-sm shadow-sm"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Critical Path</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GanttChartPage;