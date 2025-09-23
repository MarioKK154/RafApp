// frontend/src/pages/GanttChartPage.jsx
// Final Version: Displays task dependencies as arrows.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function GanttChartPage() {
    const [tasks, setTasks] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [error, setError] = useState('');

    const { isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    const fetchAllProjects = useCallback(() => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoadingProjects(true);
            axiosInstance.get('/projects/')
                .then(response => {
                    setAllProjects(response.data);
                })
                .catch(err => {
                    console.error("Error fetching projects for Gantt filter:", err);
                    toast.error("Could not load project list for filtering.");
                })
                .finally(() => {
                    setIsLoadingProjects(false);
                });
        } else if (!authIsLoading && !isAuthenticated) {
            setIsLoadingProjects(false);
        }
    }, [isAuthenticated, authIsLoading]);

    const fetchTasksForGantt = useCallback(() => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoadingTasks(true);
            setError('');
            
            const params = {};
            if (selectedProjectId) {
                params.project_id = selectedProjectId;
            }

            axiosInstance.get('/tasks/', { params })
                .then(response => {
                    setTasks(response.data);
                })
                .catch(err => {
                    setError('Failed to load tasks for the Gantt chart.');
                    toast.error('Failed to load tasks for the Gantt chart.');
                })
                .finally(() => {
                    setIsLoadingTasks(false);
                });
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

    const chartData = useMemo(() => {
        const columns = [
            { type: 'string', label: 'Task ID' },
            { type: 'string', label: 'Task Name' },
            { type: 'string', label: 'Resource' },
            { type: 'date', label: 'Start Date' },
            { type: 'date', label: 'End Date' },
            { type: 'number', label: 'Duration' },
            { type: 'number', label: 'Percent Complete' },
            { type: 'string', label: 'Dependencies' }, // This column is key
        ];

        const rows = tasks
            .filter(task => task.start_date && task.due_date)
            .map(task => {
                let percentComplete = 0;
                if (task.status === 'Done' || task.status === 'Commissioned') {
                    percentComplete = 100;
                } else if (task.status === 'In Progress') {
                    percentComplete = 50;
                }

                const projectForTask = allProjects.find(p => p.id === task.project_id);
                const resourceName = projectForTask ? projectForTask.name : 'N/A';

                // --- THIS IS THE NEW LOGIC ---
                // Convert the array of predecessor IDs into the required string format.
                const dependencies = (task.predecessor_ids && task.predecessor_ids.length > 0)
                    ? task.predecessor_ids.map(id => `task-${id}`).join(',')
                    : null;
                // --- END NEW LOGIC ---

                return [
                    `task-${task.id}`,
                    task.title,
                    resourceName,
                    new Date(task.start_date),
                    new Date(task.due_date),
                    null,
                    percentComplete,
                    dependencies, // <-- Pass the formatted dependencies string here
                ];
            });

        return [columns, ...rows];
    }, [tasks, allProjects]);

    const chartOptions = {
        height: chartData.length > 1 ? (chartData.length - 1) * 40 + 80 : 200,
        gantt: {
            trackHeight: 30,
            criticalPathEnabled: false, // Set to true to highlight the critical path
            arrow: { angle: 100, width: 2, color: '#5e5e5e', radius: 0 },
            sortTasks: false, // Turn off automatic sorting to respect dependencies
        },
    };

    if (authIsLoading || isLoadingProjects) {
        return <LoadingSpinner text="Loading page data..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Project Gantt Chart</h1>
                
                <div className="min-w-[250px]">
                    <label htmlFor="projectGanttFilter" className="block text-sm font-medium">
                        View Project:
                    </label>
                    <select
                        id="projectGanttFilter"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="block w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm"
                    >
                        <option value="">All Projects</option>
                        {allProjects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <p className="text-red-500 mb-4 p-3 rounded">{error}</p>
            )}

            {isLoadingTasks ? (
                <LoadingSpinner text="Loading tasks for chart..." />
            ) : chartData.length > 1 ? (
                <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded-lg shadow">
                    <Chart
                        chartType="Gantt"
                        width="100%"
                        height={chartOptions.height}
                        data={chartData}
                        options={chartOptions.gantt}
                        loader={<LoadingSpinner text="Rendering chart..." />}
                    />
                </div>
            ) : (
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
                    <h3 className="text-lg font-semibold">No Chart Data Available</h3>
                    <p className="mt-2">
                        No tasks with both a start and end date were found for the selected criteria.
                    </p>
                </div>
            )}
        </div>
    );
}

export default GanttChartPage;