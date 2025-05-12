// frontend/src/pages/TaskCreatePage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function TaskCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); // For assignee dropdown
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    start_date: '',
    due_date: '',
    project_id: '',
    assignee_id: '',
  });
  const [error, setError] = useState(''); // Form-specific errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState(''); // Errors for fetching projects/users

  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch projects and users for dropdowns
  const fetchPrerequisites = useCallback(() => {
    if (!authIsLoading && isAuthenticated && canManageTasks) {
        setDataLoadingError('');
        // No need to set isSubmitting true here, use dataLoadingError for feedback
        Promise.all([
            axiosInstance.get('/projects/'),
            axiosInstance.get('/users/')
        ]).then(([projectsResponse, usersResponse]) => {
            setProjects(projectsResponse.data);
            setUsers(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));
            if (projectsResponse.data.length > 0 && !formData.project_id) {
                setFormData(prev => ({ ...prev, project_id: projectsResponse.data[0].id.toString() }));
            }
        }).catch(err => {
            console.error("Error fetching prerequisites:", err);
            setDataLoadingError('Could not load projects or users for selection.');
            toast.error('Could not load projects or users.');
        });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login', { replace: true });
    } else if (!authIsLoading && !canManageTasks) {
        setError('You do not have permission to create tasks.');
        toast.error('Access Denied: Cannot create tasks.');
        // navigate('/', { replace: true }); // Optional redirect
    }
  }, [isAuthenticated, authIsLoading, canManageTasks, navigate, formData.project_id]); // Added formData.project_id

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { toast.error('Please select a project.'); return; }
    if (!canManageTasks) { toast.error('No permission.'); return; }

    setError('');
    setIsSubmitting(true);
    const dataToSend = {
        ...formData,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        assignee_id: formData.assignee_id === '' || formData.assignee_id === null ? null : Number(formData.assignee_id),
    };

    try {
      const response = await axiosInstance.post('/tasks/', dataToSend);
      toast.success(`Task "${response.data.title}" created successfully!`);
      navigate('/tasks');
    } catch (err) {
      console.error("Error creating task:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create task.';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl ...">Loading...</p></div> );
  }
  if (!isAuthenticated) { // Should be redirected by useEffect
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>Redirecting to login...</p></div>);
  }
  if (!canManageTasks) {
    return ( <div className="container mx-auto p-6 text-center text-red-500">{error || 'Access Denied.'}<Link to="/" className="text-blue-500 underline ml-2">Go Home</Link></div> );
  }

  const assignableUsers = users; // Already filtered in fetchPrerequisites

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>
      {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{error}</p>}
      {dataLoadingError && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{dataLoadingError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Selection */}
        <div> <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label> <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError || isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm ... disabled:opacity-50"> <option value="" disabled>-- Select Project --</option> {availableProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))} </select> {projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">No projects available.</p>} </div>
        {/* Task Title */}
        <div> <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label> <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."/> </div>
        {/* Description */}
        <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."></textarea> </div>
        {/* Status */}
        <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label> <select name="status" id="status" required value={formData.status} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option></select> </div>
        {/* Priority */}
        <div> <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label> <select name="priority" id="priority" required value={formData.priority} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select> </div>
        {/* Start Date */}
        <div> <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label> <input type="date" name="start_date" id="start_date" value={formData.start_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."/> </div>
        {/* Due Date */}
        <div> <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label> <input type="date" name="due_date" id="due_date" value={formData.due_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full ..."/> </div>
        {/* Assignee Selection */}
        <div> <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label> <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError || isSubmitting} className="mt-1 block w-full ..."> <option value="">-- Unassigned --</option> {assignableUsers.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))} </select> {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load users.</p>} </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/tasks" className="px-4 py-2 border ..."> Cancel </Link> <button type="submit" disabled={isSubmitting || !!dataLoadingError || !formData.project_id} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Creating...' : 'Create Task'} </button> </div>
      </form>
    </div>
  );
}
export default TaskCreatePage;