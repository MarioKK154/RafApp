// frontend/src/pages/GanttChartPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chart } from 'react-google-charts'; // Import the Chart component
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function GanttChartPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState({}); // To map project_id to project name
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Fetch tasks and projects
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoading(true);
      setError('');
      Promise.all([
        axiosInstance.get('/tasks/'), // Fetch all tasks
        axiosInstance.get('/projects/') // Fetch all projects for naming
      ])
      .then(([tasksResponse, projectsResponse]) => {
        setTasks(tasksResponse.data);
        // Create a map of project IDs to names for easy lookup
        const projectsMap = projectsResponse.data.reduce((acc, project) => {
          acc[project.id] = project.name;
          return acc;
        }, {});
        setProjects(projectsMap);
      })
      .catch(err => {
        console.error("Error fetching data for Gantt chart:", err);
        setError('Failed to load data for Gantt chart.');
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !isAuthenticated && !isLoading) { // Added missing !isLoading condition
        setIsLoading(false);
        setError('You must be logged in to view the Gantt chart.');
    }
  }, [isAuthenticated, authIsLoading, navigate]);

  // Transform task data for Google Charts Gantt
  const chartData = useMemo(() => {
    if (tasks.length === 0) {
      return [
        [ // Columns definition
          { type: 'string', label: 'Task ID' },
          { type: 'string', label: 'Task Name' },
          { type: 'string', label: 'Resource' }, // Can be project name or assignee
          { type: 'date', label: 'Start Date' },
          { type: 'date', label: 'End Date' },
          { type: 'number', label: 'Duration' }, // ms, or null if start/end provided
          { type: 'number', label: 'Percent Complete' },
          { type: 'string', label: 'Dependencies' }, // Task IDs this task depends on
        ],
        // No data row if tasks are empty
      ];
    }

    const data = [
      [
        { type: 'string', label: 'Task ID' },
        { type: 'string', label: 'Task Name' },
        { type: 'string', label: 'Resource' },
        { type: 'date', label: 'Start Date' },
        { type: 'date', label: 'End Date' },
        { type: 'number', label: 'Duration' },
        { type: 'number', label: 'Percent Complete' },
        { type: 'string', label: 'Dependencies' },
      ],
    ];

    tasks.forEach(task => {
      // Gantt chart requires valid start and end dates.
      // If due_date is missing, we can't plot it as a bar with a defined end.
      // If start_date is missing, we also can't plot it.
      if (task.start_date && task.due_date) {
        let percentComplete = 0;
        if (task.status === 'Done') {
          percentComplete = 100;
        } else if (task.status === 'In Progress') {
          percentComplete = 50; // Approximate
        }

        data.push([
          `task-${task.id}`,                      // Task ID (must be unique string)
          task.title,                           // Task Name
          projects[task.project_id] || `Project ${task.project_id}`, // Resource (Project Name)
          new Date(task.start_date),            // Start Date
          new Date(task.due_date),              // End Date
          null,                                 // Duration (null if start and end are provided)
          percentComplete,                      // Percent Complete
          null,                                 // Dependencies (null for no dependencies)
        ]);
      }
    });
    return data;
  }, [tasks, projects]);

  const chartOptions = {
    height: tasks.length * 40 + 80, // Dynamically adjust height based on number of tasks
    gantt: {
      trackHeight: 30,
      criticalPathEnabled: false, // Set to true to enable, requires dependency data
      arrow: {
        angle: 100,
        width: 1,
        color: 'grey',
        radius: 0
      },
      // You can customize colors here
      // barCornerRadius: 2,
      // barHeight: 20,
    },
  };

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-xl text-gray-500 dark:text-gray-400">Loading Gantt chart data...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view the Gantt chart.'}</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link>
        </div>
     );
  }

  if (error) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error}</p>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Project Gantt Chart</h1>
      {chartData.length > 1 ? ( // Check if there's more than just the header row
        <Chart
          chartType="Gantt"
          width="100%"
          height={chartOptions.height} // Use dynamic height
          data={chartData}
          options={chartOptions.gantt} // Pass only gantt specific options
          loader={<div>Loading Chart...</div>}
        />
      ) : (
        <p className="text-gray-600 dark:text-gray-400">
          No tasks with valid start and end dates to display in the Gantt chart.
          Please ensure tasks have both start and due dates set.
        </p>
      )}
    </div>
  );
}

export default GanttChartPage;