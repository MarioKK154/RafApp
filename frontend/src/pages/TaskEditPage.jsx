// frontend/src/pages/TaskEditPage.jsx
// Uncondensed Version: Added Toast Notifications
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify'; // Import toast

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '';
    }
};

function TaskEditPage() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: '',
        priority: '',
        start_date: '',
        due_date: '',
        project_id: '',
        assignee_id: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(''); // For form-level or fetch errors
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoadingError, setDataLoadingError] = useState('');

    const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);
    const assignableRoles = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

    useEffect(() => {
        let isMounted = true;
        if (!authIsLoading && isAuthenticated && taskId) {
            setIsLoading(true);
            setDataLoadingError('');
            setError('');
            Promise.all([
                axiosInstance.get(`/tasks/${taskId}`),
                axiosInstance.get('/projects/'),
                axiosInstance.get('/users/')
            ]).then(([taskResponse, projectsResponse, usersResponse]) => {
                if (!isMounted) return;
                const task = taskResponse.data;
                setProjects(projectsResponse.data);
                setUsers(usersResponse.data);
                setFormData({
                    title: task.title ?? '',
                    description: task.description ?? '',
                    status: task.status ?? '',
                    priority: task.priority ?? '',
                    start_date: formatDateForInput(task.start_date),
                    due_date: formatDateForInput(task.due_date),
                    project_id: task.project_id ?? '',
                    assignee_id: task.assignee_id ?? '',
                });
            }).catch(err => {
                if (!isMounted) return;
                console.error("Error fetching data for task edit:", err);
                if (err?.response?.status === 404) {
                    setError('Task not found.');
                } else {
                    setError('Failed to load task data.');
                }
                // Check if project/user list loading failed specifically
                // This logic might need adjustment based on how Promise.all errors are structured
                if (err?.config?.url?.includes('/projects') || err?.config?.url?.includes('/users')) {
                    setDataLoadingError('Could not load projects or users list for selection.');
                }
            }).finally(() => {
                if (isMounted) setIsLoading(false);
            });
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        } else if (!authIsLoading && !taskId) {
             setError("Task ID missing.");
             setIsLoading(false);
        }
        return () => { isMounted = false; };
    }, [taskId, isAuthenticated, authIsLoading, navigate]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.project_id) {
            toast.error('Please select a project.'); // Use toast
            return;
        }
        if (!canManageTasks) {
            toast.error("You don't have permission to edit tasks."); // Use toast
            return;
        }
        setError(''); // Clear local form error
        setIsSubmitting(true);

        const dataToSend = {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            start_date: formData.start_date || null,
            due_date: formData.due_date || null,
            project_id: formData.project_id,
            assignee_id: formData.assignee_id === '' ? null : formData.assignee_id,
        };

        try {
            const response = await axiosInstance.put(`/tasks/${taskId}`, dataToSend);
            toast.success(`Task "${response.data.title}" updated successfully!`); // Success toast
            navigate('/tasks');
        } catch (err) {
            console.error("Error updating task:", err);
            const errorMsg = err.response?.data?.detail || 'Failed to update task.';
            setError(errorMsg); // Keep local error for form if needed
            toast.error(errorMsg); // Show error toast
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---

    if (authIsLoading || isLoading) {
        return (
            <div className="container mx-auto p-6 text-center">
                <p className="text-xl text-gray-500 dark:text-gray-400">Loading task details...</p>
            </div>
        );
    }

    if (error && error.includes('not found')) {
         return (
             <div className="container mx-auto p-6 text-center text-red-500">
                 {error}
                 <Link to="/tasks" className="text-blue-500 underline ml-2">Go Back to Tasks</Link>
            </div>
         );
    }

    if (!isAuthenticated || (!canManageTasks && !error) ) { // If no general error, but no permission
         return (
              <div className="container mx-auto p-6 text-center text-red-500">
                  Access Denied. You do not have permission to edit this task.
                  <Link to="/tasks" className="text-blue-500 underline ml-2">Go to Tasks</Link>
              </div>
         );
     }

    const assignableUsers = users.filter(u => assignableRoles.includes(u.role));

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Task</h1>

            {error && !error.includes('not found') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}
            {dataLoadingError && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{dataLoadingError}</p>}

            <fieldset disabled={!canManageTasks || isSubmitting} className="disabled:opacity-70 mb-8">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                    <legend className="sr-only">Edit Task Details</legend>
                    {/* Project Selection */}
                    <div>
                        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label>
                        <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="" disabled>-- Select Project --</option>
                            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load projects.</p>}
                    </div>
                    {/* Task Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label>
                        <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/>
                    </div>
                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea>
                    </div>
                    {/* Status */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="To Do">To Do</option><option value="In Progress">In Progress</option>
                            <option value="Done">Done</option><option value="Blocked">Blocked</option>
                        </select>
                    </div>
                    {/* Priority */}
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                        <select name="priority" id="priority" required value={formData.priority} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                        </select>
                    </div>
                    {/* Start Date */}
                    <div>
                        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                        <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/>
                    </div>
                    {/* Due Date */}
                    <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                        <input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/>
                    </div>
                    {/* Assignee Selection */}
                    <div>
                        <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                        <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="">-- Unassigned --</option>
                            {assignableUsers.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))}
                        </select>
                        {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load users for assignment.</p>}
                    </div>
                    {/* Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Link to="/tasks" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link>
                        {canManageTasks && ( <button type="submit" disabled={isSubmitting || dataLoadingError} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting || dataLoadingError ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Saving...' : 'Save Changes'} </button> )}
                    </div>
                </form>
            </fieldset>
            {/* End Edit Task Form */}

            {/* Task Comments & Photos */}
            <TaskComments taskId={taskId} />
            <TaskPhotos taskId={taskId} />

        </div>
    );
}

export default TaskEditPage;