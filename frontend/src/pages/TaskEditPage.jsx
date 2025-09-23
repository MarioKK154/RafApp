// frontend/src/pages/TaskEditPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select'; // --- NEW: Import react-select

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
        title: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        start_date: '',
        due_date: '',
        project_id: '',
        assignee_id: '',
        predecessors: [], // For selected dependencies
    });
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [potentialPredecessors, setPotentialPredecessors] = useState([]); // For dropdown options
    
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

                let predecessorOptions = [];
                if (fetchedTask.project_id) {
                    const allTasksInProjectRes = await axiosInstance.get(`/tasks/?project_id=${fetchedTask.project_id}&limit=1000`);
                    predecessorOptions = allTasksInProjectRes.data
                        .filter(task => task.id !== fetchedTask.id)
                        .map(task => ({ value: task.id, label: task.title }));
                    setPotentialPredecessors(predecessorOptions);
                }
                
                const selectedPredecessors = (fetchedTask.predecessor_ids || []).map(id => {
                    const option = predecessorOptions.find(opt => opt.value === id);
                    return option || { value: id, label: `Task ${id}` };
                });

                setFormData({
                    title: fetchedTask.title ?? '',
                    description: fetchedTask.description ?? '',
                    status: fetchedTask.status ?? 'To Do',
                    priority: fetchedTask.priority ?? 'Medium',
                    start_date: formatDateForInput(fetchedTask.start_date),
                    due_date: formatDateForInput(fetchedTask.due_date),
                    project_id: fetchedTask.project_id?.toString() ?? '',
                    assignee_id: fetchedTask.assignee_id?.toString() ?? '',
                    predecessors: selectedPredecessors,
                });

            } catch (err) {
                console.error("Error fetching data for task edit:", err);
                const errorMsg = err.response?.status === 404 ? 'Task not found.' : 'Failed to load data.';
                setError(errorMsg);
                toast.error(errorMsg);
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [taskId, isAuthenticated, authIsLoading, navigate]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePredecessorChange = (selectedOptions) => {
        setFormData(prev => ({ ...prev, predecessors: selectedOptions || [] }));
    };

    const handleSubmitUserDetails = async (e) => {
        e.preventDefault();
        if (!canManageTasks) { toast.error("Permission denied."); return; }
        setIsSubmitting(true);
        
        const detailsPayload = {
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
            await axiosInstance.put(`/tasks/${taskId}`, detailsPayload);
            
            const originalPredecessorIds = new Set(taskData.predecessor_ids || []);
            const newPredecessorIds = new Set(formData.predecessors.map(p => p.value));

            const dependenciesToAdd = [...newPredecessorIds].filter(id => !originalPredecessorIds.has(id));
            const dependenciesToRemove = [...originalPredecessorIds].filter(id => !newPredecessorIds.has(id));
            
            const addPromises = dependenciesToAdd.map(id => 
                axiosInstance.post(`/tasks/${taskId}/dependencies`, { predecessor_id: id })
            );
            const removePromises = dependenciesToRemove.map(id => 
                axiosInstance.delete(`/tasks/${taskId}/dependencies/${id}`)
            );
            
            await Promise.all([...addPromises, ...removePromises]);

            toast.success(`Task "${formData.title}" updated successfully!`);
            fetchPageData();

        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update task.');
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
        } catch (err) { 
            console.error("Error commissioning task:", err); 
            toast.error(err.response?.data?.detail || 'Failed to commission.');
        } finally { 
            setIsCommissioning(false); 
        }
    };

    if (authIsLoading || isLoadingData) {
        return <LoadingSpinner text="Loading task details..." />;
    }
    
    if (error) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>{error}</p></div>;
    }

    if (!isAuthenticated) {
        return <div className="container mx-auto p-6 text-center"><p>Redirecting to login...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
                Edit Task: {taskData?.title || `ID ${taskId}`}
            </h1>
            {taskData && (
                <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
                    Current Status: <span className="font-semibold">{taskData.status}</span>
                    {taskData.is_commissioned && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                            Commissioned
                        </span>
                    )}
                </p>
            )}
            
            <fieldset disabled={!canManageTasks || isSubmitting} className="mb-8">
                <form onSubmit={handleSubmitUserDetails} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                    <div>
                        <label htmlFor="project_id" className="block text-sm font-medium">Project <span className="text-red-500">*</span></label>
                        <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm">
                            <option value="" disabled>-- Select Project --</option>
                            {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="title">Task Title <span className="text-red-500">*</span></label>
                        <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="description">Description</label>
                        <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm"></textarea>
                    </div>
                    <div>
                        <label htmlFor="status">Status</label>
                        <select name="status" id="status" required value={formData.status} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm">
                            {EDITABLE_TASK_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="priority">Priority</label>
                        <select name="priority" id="priority" required value={formData.priority} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="start_date">Start Date</label>
                        <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="due_date">Due Date</label>
                        <input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="assignee_id">Assign To</label>
                        <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={taskData?.is_commissioned} className="mt-1 block w-full rounded-md shadow-sm">
                            <option value="">-- Unassigned --</option>
                            {users.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="predecessors" className="block text-sm font-medium">
                            Depends On (Predecessors)
                        </label>
                        <Select
                            id="predecessors"
                            isMulti
                            options={potentialPredecessors}
                            value={formData.predecessors}
                            onChange={handlePredecessorChange}
                            className="mt-1"
                            classNamePrefix="react-select"
                            isDisabled={isSubmitting || taskData?.is_commissioned}
                        />
                         <p className="text-xs text-gray-500 mt-1">Select tasks that must be completed before this one can start.</p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Link to="/tasks" className="px-4 py-2 border rounded-md">Cancel</Link>
                        {!taskData?.is_commissioned && canManageTasks && (
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 border rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </form>
            </fieldset>

            {canCommissionTask && taskData && taskData.status === "Done" && !taskData.is_commissioned && (
                <div className="max-w-lg mt-4 mb-8 flex justify-end">
                    <button
                        onClick={handleCommissionTask}
                        disabled={isCommissioning}
                        className="px-6 py-2 border rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                    >
                        {isCommissioning ? 'Commissioning...' : 'Commission Task'}
                    </button>
                </div>
            )}
            
            {taskId && (
                <>
                    <TaskComments taskId={taskId} />
                    <TaskPhotos taskId={taskId} />
                </>
            )}
        </div>
    );
}

export default TaskEditPage;