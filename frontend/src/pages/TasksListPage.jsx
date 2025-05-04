// frontend/src/pages/TasksListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function TasksListPage() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();

    const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

    // Fetch tasks function (as before)
    const fetchTasks = () => { setIsLoading(true); setError(''); axiosInstance.get('/tasks/').then(response => { setTasks(response.data); }).catch(err => { console.error("Error fetching tasks:", err); setError('Failed to load tasks.'); }).finally(() => { setIsLoading(false); }); };

    // Initial fetch useEffect (as before)
    useEffect(() => { if (!authIsLoading && isAuthenticated) { fetchTasks(); } else if (!authIsLoading && !isAuthenticated) { setIsLoading(false); setError('You must be logged in to view tasks.'); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAuthenticated, authIsLoading]);

    // Handle Task Deletion (as before)
    const handleDelete = async (taskId) => { if (!canManageTasks) { alert("No permission"); return; } if (!window.confirm('Are you sure...?')) return; try { setError(''); await axiosInstance.delete(`/tasks/${taskId}`); setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId)); } catch (err) { console.error("Error deleting task:", err); setError(err.response?.data?.detail || 'Failed to delete task.'); } };

    // --- Render Logic ---

    if (authIsLoading || isLoading) {
        return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading tasks...</p></div> );
    }

    // --- CORRECTED BLOCK ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
                <p className="text-red-600 mb-4">{error || 'Please log in to view tasks.'}</p>
                {/* Ensure all attributes have closing quotes */}
                <Link
                    to="/login"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
                >
                    Go to Login
                </Link>
            </div>
        ); // End of return statement
    }
    // --- END CORRECTED BLOCK ---

    // Main Authenticated Return (as before)
    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6"> <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1> {canManageTasks && (<Link to="/tasks/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base">Create New Task</Link>)} </div>
            {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}
            {tasks.length === 0 && !error ? ( <p className="text-gray-600 dark:text-gray-400">No tasks found. {canManageTasks ? 'Create one!' : ''}</p> ) : (
                <div className="space-y-4">
                    {tasks.map(task => ( <div key={task.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"> <div className="flex justify-between items-start"> <div> <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h2> <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description || 'No description'}</p> <p className="text-xs text-gray-500 dark:text-gray-500"> Project ID: {task.project_id} | Status: {task.status} | Priority: {task.priority} {task.assignee_id ? ` | Assignee ID: ${task.assignee_id}` : ''} </p> {task.due_date && <p className="text-xs text-gray-500 dark:text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>} </div> {canManageTasks && ( <div className="flex space-x-2 flex-shrink-0 ml-4"> <Link to={`/tasks/edit/${task.id}`} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 text-xs"> Edit </Link> <button onClick={() => handleDelete(task.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs"> Delete </button> </div> )} </div> </div> ))}
                </div>
            )}
        </div>
    );
} // End component function

export default TasksListPage;