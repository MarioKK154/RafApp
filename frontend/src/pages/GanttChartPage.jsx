// frontend/src/pages/GanttChartPage.jsx
// Uncondensed Version: Added Project Selector and other enhancements
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function GanttChartPage() {
  const [tasks, setTasks] = useState([]);
  const [allProjects, setAllProjects] = useState([]); // For project selector dropdown
  const [selectedProjectId, setSelectedProjectId] = useState(''); // '' means "All Projects"

  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState('');

  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Fetch all projects for the selector dropdown within the user's tenant
  const fetchAllProjects = useCallback(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoadingProjects(true);
      axiosInstance.get('/projects/') // Backend correctly scopes this to the user's tenant
        .then(response => {
          setAllProjects(response.data);
        })
        .catch(err => {
          console.error("Error fetching projects for Gantt filter:", err);
          toast.error("Could not load project list for filtering.");
          setError('Could not load project list.');
        })
        .finally(() => {
          setIsLoadingProjects(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoadingProjects(false);
    }
  }, [isAuthenticated, authIsLoading]);

  // Fetch tasks, now filtered by the selected project ID
  const fetchTasksForGantt = useCallback(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoadingTasks(true);
      setError(''); // Clear previous task-related errors
      
      const params = {};
      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }
      // If selectedProjectId is empty, the backend API will return all tasks for the tenant's projects

      axiosInstance.get('/tasks/', { params })
        .then(response => {
          setTasks(response.data);
        })
        .catch(err => {
          console.error("Error fetching tasks for Gantt chart:", err);
          setError('Failed to load tasks for the Gantt chart.');
          toast.error('Failed to load tasks for the Gantt chart.');
        })
        .finally(() => {
          setIsLoadingTasks(false);
        });
    }
  }, [isAuthenticated, authIsLoading, selectedProjectId]);

  // Initial fetch for the projects dropdown
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
        fetchAllProjects();
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoadingProjects(false); // Stop loading if not logged in
        navigate('/login', { replace: true });
    }
  }, [fetchAllProjects, authIsLoading, isAuthenticated, navigate]);

  // Re-fetch tasks whenever the selected project changes
  useEffect(() => {
    // Only fetch tasks once we are sure the projects list has been loaded (or failed to load)
    if (!isLoadingProjects) {
        fetchTasksForGantt();
    }
  }, [fetchTasksForGantt, isLoadingProjects]);


  // Transform task data for Google Charts Gantt component
  const chartData = useMemo(() => {
    const columns = [
      { type: 'string', label: 'Task ID' },
      { type: 'string', label: 'Task Name' },
      { type: 'string', label: 'Resource' }, // We'll use this for the Project Name
      { type: 'date', label: 'Start Date' },
      { type: 'date', label: 'End Date' },
      { type: 'number', label: 'Duration' },
      { type: 'number', label: 'Percent Complete' },
      { type: 'string', label: 'Dependencies' },
    ];

    const rows = tasks
      .filter(task => task.start_date && task.due_date) // Only include tasks with both dates
      .map(task => {
        let percentComplete = 0;
        if (task.status === 'Done' || task.status === 'Commissioned') {
          percentComplete = 100;
        } else if (task.status === 'In Progress') {
          percentComplete = 50; // Approximation
        }

        const projectForTask = allProjects.find(p => p.id === task.project_id);
        const resourceName = projectForTask ? projectForTask.name : (task.project_id ? `Project ${task.project_id}`: 'N/A');

        return [
          `task-${task.id}`, // Task ID must be a unique string
          task.title,
          resourceName,
          new Date(task.start_date),
          new Date(task.due_date),
          null, // Duration (ms), null if start and end are provided
          percentComplete,
          null, // Dependencies (e.g., 'task-5,task-6'), null for none
        ];
      });

    return [columns, ...rows];
  }, [tasks, allProjects]);

  const chartOptions = {
    // Calculate height dynamically, ensure a minimum height if no tasks
    height: chartData.length > 1 ? (chartData.length - 1) * 40 + 80 : 200,
    gantt: {
      trackHeight: 30,
      criticalPathEnabled: false,
      arrow: { angle: 100, width: 2, color: '#5e5e5e', radius: 0 },
      sortTasks: true, // Sorts tasks by start date by default
    },
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingProjects) {
    return (
        <div className="min-h-screen flex justify-center items-center">
            <LoadingSpinner text="Loading page data..." size="lg" />
        </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>Please log in to view the Gantt chart.</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Go to Login
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Project Gantt Chart</h1>
        
        {/* Project Selector Dropdown */}
        <div className="min-w-[200px] md:min-w-[250px]">
          <label htmlFor="projectGanttFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            View Project:
          </label>
          <select
            id="projectGanttFilter"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={isLoadingProjects || allProjects.length === 0}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
          >
            <option value="">All Projects</option>
            {allProjects.map(project => (
              <option key={project.id} value={project.id.toString()}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Display errors if any */}
      {error && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}

      {/* Chart or Loading/No Data Message for Tasks */}
      {isLoadingTasks ? (
        <LoadingSpinner text="Loading tasks for chart..." />
      ) : chartData.length > 1 ? ( // chartData[0] is headers, so > 1 means there are task rows
        <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded-lg shadow">
            <Chart
              chartType="Gantt"
              width="100%"
              height={chartOptions.height}
              data={chartData}
              options={chartOptions.gantt} // Pass only gantt specific options
              loader={<LoadingSpinner text="Rendering chart..." />}
              chartPackages={['gantt']} // Explicitly load gantt package
            />
        </div>
      ) : (
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No Chart Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              No tasks with both a valid start and end date were found for the selected criteria.
            </p>
        </div>
      )}
    </div>
  );
}

export default GanttChartPage;