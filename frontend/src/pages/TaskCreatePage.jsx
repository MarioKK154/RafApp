// frontend/src/pages/TaskCreatePage.jsx
// Uncondensed Version: Corrected variable name for project dropdown
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function TaskCreatePage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

  // State variable for project list is 'projects'
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    start_date: '',
    due_date: '',
    project_id: '', // Will be set from the 'projects' state
    assignee_id: '', // Will be set from the 'users' state
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);
  const [prerequisitesError, setPrerequisitesError] = useState('');

  const canManageTasks = currentUser && ['admin', 'project manager', 'team leader'].includes(currentUser.role);

  const fetchPrerequisites = useCallback(() => {
    if (!authIsLoading && isAuthenticated && canManageTasks) {
      setPrerequisitesLoading(true);
      setPrerequisitesError('');
      Promise.all([
        axiosInstance.get('/projects/'),
        axiosInstance.get('/users/')
      ]).then(([projectsResponse, usersResponse]) => {
        setProjects(projectsResponse.data); // Uses 'projects'
        setUsers(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));
        if (projectsResponse.data.length > 0) {
          const currentProjectIdIsValid = projectsResponse.data.some(p => p.id.toString() === formData.project_id.toString());
          if (!currentProjectIdIsValid) {
            setFormData(prev => ({ ...prev, project_id: projectsResponse.data[0].id.toString() }));
          }
        }
      }).catch(err => {
        console.error("Error fetching prerequisites for Task Create:", err);
        setPrerequisitesError('Could not load projects or users for selection.');
        toast.error('Could not load required data for form selections.');
      }).finally(() => {
        setPrerequisitesLoading(false);
      });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
      setPrerequisitesLoading(false);
    } else if (!authIsLoading && !canManageTasks) {
      setError('Access Denied: You do not have permission to create tasks.');
      toast.error('Access Denied: Cannot create tasks.');
      setPrerequisitesLoading(false);
    } else if (authIsLoading) {
      setPrerequisitesLoading(true);
    }
  }, [isAuthenticated, authIsLoading, canManageTasks, navigate, formData.project_id]);

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
    if (!formData.project_id) { toast.error('Please select a project.'); setError('Please select a project.'); return; }
    if (!canManageTasks) { toast.error('No permission.'); return; }
    setError('');
    setIsSubmitting(true);
    const dataToSend = {
        title: formData.title, description: formData.description || null,
        status: formData.status, priority: formData.priority,
        start_date: formData.start_date || null, due_date: formData.due_date || null,
        project_id: Number(formData.project_id),
        assignee_id: formData.assignee_id === '' || formData.assignee_id === null ? null : Number(formData.assignee_id),
    };
    try {
      const response = await axiosInstance.post('/tasks/', dataToSend);
      toast.success(`Task "${response.data.title}" created successfully!`);
      navigate('/tasks');
    } catch (err) {
      console.error("Error creating task:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create task.';
      setError(errorMsg); toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (authIsLoading || prerequisitesLoading) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading form...</p></div> );
  }
  if (!isAuthenticated) {
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>Redirecting to login...</p></div>);
  }
  if (!canManageTasks) {
    return ( <div className="container mx-auto p-6 text-center text-red-500">{error || 'Access Denied.'}<Link to="/" className="text-blue-500 underline ml-2">Go Home</Link></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>
      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}
      {prerequisitesError && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{prerequisitesError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Selection */}
        <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label>
            <select
                name="project_id" id="project_id" required
                value={formData.project_id} onChange={handleChange}
                disabled={projects.length === 0 || !!prerequisitesError || isSubmitting} // Use 'projects' here
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
                <option value="" disabled={formData.project_id !== ''}>-- Select Project --</option>
                {/* Use 'projects.map' here */}
                {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
            </select>
            {projects.length === 0 && !prerequisitesError && !prerequisitesLoading &&
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No projects available. Please create a project first.</p>
            }
        </div>

        {/* Task Title */}
        <div> <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label> <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Description */}
        <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"></textarea> </div>
        {/* Status */}
        <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label> <select name="status" id="status" required value={formData.status} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option></select> </div>
        {/* Priority */}
        <div> <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label> <select name="priority" id="priority" required value={formData.priority} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select> </div>
        {/* Start Date */}
        <div> <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label> <input type="date" name="start_date" id="start_date" value={formData.start_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Due Date */}
        <div> <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label> <input type="date" name="due_date" id="due_date" value={formData.due_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Assignee Selection */}
        <div>
            <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
            <select
                name="assignee_id" id="assignee_id"
                value={formData.assignee_id} onChange={handleChange}
                disabled={users.length === 0 || !!prerequisitesError || isSubmitting} // Use 'users' here
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
                <option value="">-- Unassigned --</option>
                {/* Use 'users.map' here */}
                {users.map(u => (
                    <option key={u.id} value={u.id}>
                         {u.full_name || u.email} ({u.role})
                    </option>
                ))}
            </select>
            {users.length === 0 && !prerequisitesError && !prerequisitesLoading &&
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No users available for assignment.</p>
            }
        </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/tasks" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
             Cancel
           </Link>
          <button
            type="submit"
            disabled={isSubmitting || !!prerequisitesError || !formData.project_id}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting || !!prerequisitesError || !formData.project_id ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskCreatePage;