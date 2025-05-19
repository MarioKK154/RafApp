// frontend/src/pages/GanttChartPage.jsx
// Add/Verify these console.log statements
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

  console.log("GanttChartPage: Component rendering/re-rendering. AuthLoading:", authIsLoading, "IsAuth:", isAuthenticated);

  const fetchAllProjects = useCallback(() => {
    console.log("GanttChartPage: fetchAllProjects called");
    if (!authIsLoading && isAuthenticated) {
      setIsLoadingProjects(true);
      axiosInstance.get('/projects/')
        .then(response => {
          console.log("GanttChartPage: Fetched projects:", response.data);
          setAllProjects(response.data);
        })
        .catch(err => { console.error("Error fetching projects:", err); toast.error("Could not load projects."); setError('Could not load projects.'); })
        .finally(() => { setIsLoadingProjects(false); });
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoadingProjects(false);
    }
  }, [isAuthenticated, authIsLoading]);

  const fetchTasksForGantt = useCallback(() => {
    console.log("GanttChartPage: fetchTasksForGantt called. Selected Project ID:", selectedProjectId);
    if (!authIsLoading && isAuthenticated) {
      setIsLoadingTasks(true); setError('');
      const params = {};
      if (selectedProjectId) { params.project_id = selectedProjectId; }
      console.log("GanttChartPage: Fetching tasks with params:", params);
      axiosInstance.get('/tasks/', { params })
        .then(response => {
          console.log("GanttChartPage: Tasks fetched from API:", response.data);
          setTasks(response.data);
        })
        .catch(err => { console.error("Error fetching tasks:", err); setError('Failed to load tasks.'); toast.error('Failed to load tasks.'); })
        .finally(() => { setIsLoadingTasks(false); });
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoadingTasks(false); navigate('/login', { replace: true });
    }
  }, [isAuthenticated, authIsLoading, selectedProjectId, navigate]);

  useEffect(() => {
    console.log("GanttChartPage: useEffect for fetchAllProjects. AuthLoading:", authIsLoading, "IsAuth:", isAuthenticated);
    if (!authIsLoading && isAuthenticated) { fetchAllProjects(); }
    else if (!authIsLoading && !isAuthenticated) { setIsLoadingProjects(false); }
  }, [fetchAllProjects, authIsLoading, isAuthenticated]);

  useEffect(() => {
    console.log("GanttChartPage: useEffect for fetchTasks. AuthLoading:", authIsLoading, "IsAuth:", isAuthenticated, "ProjectsLoading:", isLoadingProjects);
    if (!authIsLoading && isAuthenticated && !isLoadingProjects) { fetchTasksForGantt(); }
  }, [fetchTasksForGantt, isLoadingProjects, authIsLoading, isAuthenticated]);

  const chartData = useMemo(() => {
    console.log("GanttChartPage: useMemo for chartData. Raw tasks for chart processing:", tasks);
    const columns = [
      { type: 'string', label: 'Task ID' }, { type: 'string', label: 'Task Name' },
      { type: 'string', label: 'Resource' }, { type: 'date', label: 'Start Date' },
      { type: 'date', label: 'End Date' }, { type: 'number', label: 'Duration' },
      { type: 'number', label: 'Percent Complete' }, { type: 'string', label: 'Dependencies' },
    ];

    const rows = tasks
      .filter(task => {
        const hasDates = task.start_date && task.due_date;
        if (!hasDates) {
          console.log(`GanttPage: Task ID ${task.id} ('${task.title}') filtered out. Start: ${task.start_date}, Due: ${task.due_date}`);
        }
        // Also check if dates are valid after new Date()
        if (hasDates) {
            const startDateValid = !isNaN(new Date(task.start_date).getTime());
            const dueDateValid = !isNaN(new Date(task.due_date).getTime());
            if(!startDateValid || !dueDateValid){
                console.log(`GanttPage: Task ID ${task.id} ('${task.title}') has invalid date format. Start: ${task.start_date}, Due: ${task.due_date}`);
                return false;
            }
        }
        return hasDates;
      })
      .map(task => {
        let percentComplete = 0;
        if (task.status === 'Done' || task.status === 'Commissioned') percentComplete = 100;
        else if (task.status === 'In Progress') percentComplete = 50;
        const projectForTask = allProjects.find(p => p.id === task.project_id);
        const resourceName = projectForTask ? projectForTask.name : (task.project_id ? `Project ${task.project_id}`: 'N/A');
        return [ `task-${task.id}`, task.title, resourceName, new Date(task.start_date), new Date(task.due_date), null, percentComplete, null ];
      });
    
    const finalChartData = [columns, ...rows];
    console.log("GanttPage: Final chartData prepared:", JSON.stringify(finalChartData, null, 2));
    console.log("GanttPage: Number of task rows for chart:", rows.length);
    return finalChartData;
  }, [tasks, allProjects]);

  const chartOptions = { /* ... as before ... */ };

  // --- Render Logic ---
  if (authIsLoading || isLoadingProjects) { /* ... */ }
  if (!isAuthenticated) { /* ... */ }
  // ... (rest of the component as in Response #115, including the Chart component) ...
  // Ensure the condition for rendering the chart is chartData.length > 1 (meaning more than just headers)
  // and !isLoadingTasks
  return (
    <div className="container mx-auto p-4 md:p-6">
        {/* Header and Project Selector from Response #115 */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Project Gantt Chart</h1>
            <div className="min-w-[200px] md:min-w-[250px]">
              <label htmlFor="projectGanttFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Project to View:
              </label>
              <select
                id="projectGanttFilter"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={isLoadingProjects || allProjects.length === 0}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              >
                <option value="">All My Projects' Tasks</option>
                {allProjects.map(project => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
        </div>

        {error && (<p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>)}

        {isLoadingTasks ? (
            <LoadingSpinner text="Loading tasks for chart..." />
        ) : chartData.length > 1 && chartData[1]?.length > 0 ? ( // Ensure there's at least one data row
            <div className="w-full overflow-x-auto">
                <Chart
                  chartType="Gantt"
                  width="100%"
                  height={chartOptions.height}
                  data={chartData}
                  options={chartOptions.gantt}
                  loader={<LoadingSpinner text="Rendering chart..." />}
                  chartPackages={['gantt']}
                  chartEvents={[ { eventName: 'error', callback: ({ chartWrapper }) => { const err = chartWrapper.getChart().getLastError(); console.error("Google Chart Error:", err); toast.error(`Chart Error: ${err}`); }, }, ]}
                />
            </div>
        ) : (
            <p className="text-gray-600 dark:text-gray-400 py-8 text-center">
              No tasks with valid start and end dates to display for the selected criteria, or an error occurred fetching data.
              <br />
              Please ensure tasks have both start and due dates set and are assigned to the selected project.
            </p>
        )}
    </div>
  );
}
export default GanttChartPage;