

// frontend/src/pages/TaskEditPage.jsx
// ABSOLUTELY FINAL Meticulously Checked Version - Conditional Returns Expanded
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

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

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];
const EDITABLE_TASK_STATUSES = ["To Do", "In Progress", "Done", "Blocked"];

function TaskEditPage() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [taskData, setTaskData] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', status: 'To Do', priority: 'Medium',
        start_date: '', due_date: '', project_id: '', assignee_id: '',
    });
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommissioning, setIsCommissioning] = useState(false);
    const [dataLoadingError, setDataLoadingError] = useState('');


    const canManageTasks = currentUser && ['admin', 'project manager', 'team leader'].includes(currentUser.role);
    const canCommissionTask = currentUser && ['admin', 'project manager'].includes(currentUser.role);

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && taskId) {
            setIsLoadingData(true);
            setDataLoadingError('');
            setError('');
            try {
                const [taskResponse, projectsResponse, usersResponse] = await Promise.all([
                    axiosInstance.get(`/tasks/${taskId}`),
                    axiosInstance.get('/projects/'),
                    axiosInstance.get('/users/')
                ]);

                const fetchedTask = taskResponse.data;
                setTaskData(fetchedTask);
                setProjects(projectsResponse.data);
                setUsers(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));

                setFormData({
                    title: fetchedTask.title ?? '',
                    description: fetchedTask.description ?? '',
                    status: fetchedTask.status ?? 'To Do',
                    priority: fetchedTask.priority ?? 'Medium',
                    start_date: formatDateForInput(fetchedTask.start_date),
                    due_date: formatDateForInput(fetchedTask.due_date),
                    project_id: fetchedTask.project_id?.toString() ?? '',
                    assignee_id: fetchedTask.assignee_id?.toString() ?? '',
                });

            } catch (err) {
                console.error("Error fetching data for task edit:", err);
                const errorMsg = err.response?.status === 404 ? 'Task not found or associated data missing.' : 'Failed to load required data for task editing.';
                setError(errorMsg);
                toast.error(errorMsg);
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        } else if (!authIsLoading && !taskId) {
            setError("Task ID is missing from URL.");
            setIsLoadingData(false);
        }
    }, [taskId, isAuthenticated, authIsLoading, navigate]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value, // Assuming project_id/assignee_id are string from select
        }));
    };

    const handleSubmitUserDetails = async (e) => {
        e.preventDefault();
        if (!canManageTasks) {
            toast.error("You don't have permission to edit tasks.");
            return;
        }
        if (formData.status === "Commissioned" && taskData?.status !== "Commissioned") {
            toast.error("Tasks must be commissioned via the 'Commission Task' button by a PM or Admin. You cannot set this status directly.");
            setFormData(prev => ({...prev, status: taskData?.status || 'Done'})); // Revert status
            return;
        }

        setError('');
        setIsSubmitting(true);
        const dataToSend = {
            title: formData.title,
            description: formData.description || null,
            status: formData.status,
            priority: formData.priority,
            start_date: formData.start_date || null,
            due_date: formData.due_date || null,
            project_id: formData.project_id ? Number(formData.project_id) : null,
            assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        };

        try {
            const response = await axiosInstance.put(`/tasks/${taskId}`, dataToSend);
            toast.success(`Task "${response.data.title}" updated successfully!`);
            setTaskData(response.data); // Update local task data
            setFormData({ // Reset form with new data
                title: response.data.title ?? '', description: response.data.description ?? '',
                status: response.data.status ?? 'To Do', priority: response.data.priority ?? 'Medium',
                start_date: formatDateForInput(response.data.start_date),
                due_date: formatDateForInput(response.data.due_date),
                project_id: response.data.project_id?.toString() ?? '',
                assignee_id: response.data.assignee_id?.toString() ?? '',
            });
            // navigate('/tasks'); // Optional: navigate back to list
        } catch (err) {
            console.error("Error updating task:", err);
            const errorMsg = err.response?.data?.detail || 'Failed to update task.';
            setError(errorMsg); // For form display
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommissionTask = async () => {
        if (!canCommissionTask) { toast.error("No permission to commission."); return; }
        if (!taskData || taskData.status !== "Done") { toast.warn("Task must be 'Done' to commission."); return; }
        if (taskData.is_commissioned) { toast.info("Task already commissioned."); return; }
        setIsCommissioning(true);
        try {
            const response = await axiosInstance.post(`/tasks/${taskId}/commission`);
            toast.success(`Task "${response.data.title}" commissioned!`);
            setTaskData(response.data);
            setFormData(prev => ({ ...prev, status: response.data.status }));
        } catch (err) { console.error("Error commissioning task:", err); toast.error(err.response?.data?.detail || 'Failed to commission.');
        } finally { setIsCommissioning(false); }
    };

    // --- Render Logic ---

    if (authIsLoading || isLoadingData) {
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading task details..." size="lg" /></div> );
    }

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto p-6 text-center text-red-500">
                <p>Please log in to continue.</p>
                <Link
                    to="/login"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Login
                </Link>
            </div>
        );
    }

    // Handle critical errors like task not found or general access denied
    if (error && (!taskData || taskData.title === undefined)) { // taskData might be null or empty if fetch failed badly
         return (
             <div className="container mx-auto p-6 text-center text-red-500">
                 <p>{error}</p>
                 <Link
                    to="/tasks"
                    className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                 >
                    Back to Tasks
                 </Link>
            </div>
         );
    }

    // If authenticated but doesn't have general manage or commission permission
    if (!canManageTasks && !canCommissionTask) {
        return (
            <div className="container mx-auto p-6 text-center text-red-500">
                <p>Access Denied. You do not have permission to view or edit this task.</p>
                <Link to="/tasks" className="text-blue-500 underline ml-2">Back to Tasks</Link>
            </div>
        );
    }

    const assignableUsers = users; // Already filtered if needed during fetch

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                Edit Task: {taskData?.title || `ID ${taskId}`}
            </h1>
            {taskData && (
                <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
                    Current Status: <span className="font-semibold">{taskData.status}</span>
                    {taskData.is_commissioned && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-200 dark:text-green-200 dark:bg-green-700 rounded-full">
                            Commissioned
                        </span>
                    )}
                </p>
            )}

            {/* Form submission error display */}
            {error && !error.toLowerCase().includes('not found') && !error.toLowerCase().includes('access denied') && (
              <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
            )}
            {dataLoadingError && (
              <p className="text-orange-500 mb-4 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 p-3 rounded">{dataLoadingError}</p>
            )}


            <fieldset disabled={(!canManageTasks && !canCommissionTask) || isSubmitting} className="disabled:opacity-70 mb-8">
                <form onSubmit={handleSubmitUserDetails} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                    <legend className="sr-only">Edit Task Details</legend>
                    {/* Project Selection */}
                    <div>
                        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label>
                        <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError || isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="" disabled={formData.project_id !== ''}>-- Select Project --</option>
                            {projects.map(p => (<option key={p.id} value={p.id.toString()}>{p.name}</option>))}
                        </select>
                        {projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load projects.</p>}
                    </div>
                    {/* Task Title */}
                    <div><label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label><input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/></div>
                    {/* Description */}
                    <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"></textarea></div>
                    {/* Status */}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select name="status" id="status" required value={formData.status} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70">
                            {EDITABLE_TASK_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                        {taskData?.is_commissioned && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Status cannot be changed for a commissioned task via this form.</p>}
                    </div>
                    {/* Priority */}
                    <div><label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label><select name="priority" id="priority" required value={formData.priority} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
                    {/* Start Date */}
                    <div><label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label><input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/></div>
                    {/* Due Date */}
                    <div><label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label><input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} disabled={isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/></div>
                    {/* Assignee Selection */}
                    <div>
                        <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                        <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError || isSubmitting || taskData?.is_commissioned} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                            <option value="">-- Unassigned --</option>
                            {assignableUsers.map(u => ( <option key={u.id} value={u.id.toString()}> {u.full_name || u.email} ({u.role}) </option> ))}
                        </select>
                        {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load users for assignment.</p>}
                    </div>
                    {/* Save Changes Button */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Link to="/tasks" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link>
                        {!taskData?.is_commissioned && canManageTasks && (
                            <button type="submit" disabled={isSubmitting || dataLoadingError} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting || dataLoadingError ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </form>
            </fieldset>

            {/* Commission Button */}
            {canCommissionTask && taskData && taskData.status === "Done" && !taskData.is_commissioned && (
                <div className="max-w-lg mt-4 mb-8 flex justify-end"> {/* Adjusted to flex justify-end like form buttons */}
                    <button
                        onClick={handleCommissionTask}
                        disabled={isCommissioning}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                    >
                        {isCommissioning ? 'Commissioning...' : 'Commission Task'}
                    </button>
                </div>
            )}

            {/* Task Comments & Photos */}
            {taskId && ( // Ensure taskId is valid before rendering these
                <>
                    <TaskComments taskId={taskId} />
                    <TaskPhotos taskId={taskId} />
                </>
            )}
        </div>
      );
    }

    export default TaskEditPage;