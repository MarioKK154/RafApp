// frontend/src/pages/TasksListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function TasksListPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Function to fetch tasks
  const fetchTasks = () => {
    setIsLoading(true);
    setError('');
    // TODO: Add ability to filter by project_id later via URL param or state
    axiosInstance.get('/tasks/') // Fetch all tasks for now
      .then(response => {
        setTasks(response.data);
      })
      .catch(err => {
        console.error("Error fetching tasks:", err);
        setError('Failed to load tasks.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Initial fetch on component mount (if authenticated)
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      fetchTasks();
    } else if (!authIsLoading && !isAuthenticated) {
      setIsLoading(false);
      setError('You must be logged in to view tasks.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading]); // Re-run if auth status changes

  // Handle Task Deletion
  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      setError('');
      await axiosInstance.delete(`/tasks/${taskId}`);
      setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError('Failed to delete task.');
    }
  };

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><p>Loading tasks...</p></div>;
  }

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view tasks.'}</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
        <Link
          to="/tasks/new"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base"
        >
          Create New Task
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      {tasks.length === 0 && !error ? (
        <p className="text-gray-600 dark:text-gray-400">No tasks found. Create one!</p>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description || 'No description'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Project ID: {task.project_id} | Status: {task.status} | Priority: {task.priority}</p>
                  {task.due_date && <p className="text-xs text-gray-500 dark:text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                </div>
                <div className="flex space-x-2 flex-shrink-0 ml-4">
                  <Link
                     to={`/tasks/edit/${task.id}`}
                     className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 text-xs"
                   >
                     Edit
                   </Link>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TasksListPage;