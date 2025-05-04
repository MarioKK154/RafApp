// frontend/src/pages/TaskEditPage.jsx
// FINAL FINAL Corrected Version - Removed potentially problematic return statement
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';

const formatDateForInput = (dateString) => { if (!dateString) return ''; try { const d=new Date(dateString); return isNaN(d.getTime())?'':d.toISOString().split('T')[0]; } catch(e){ console.error("Error formatting date:", dateString, e); return ''; } };

function TaskEditPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', status: '', priority: '', start_date: '', due_date: '', project_id: '', assignee_id: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState('');

  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch data
  useEffect(() => {
    let isMounted = true;
    if (!authIsLoading && isAuthenticated && taskId) {
      setIsLoading(true); setDataLoadingError(''); setError('');
      Promise.all([
        axiosInstance.get(`/tasks/${taskId}`),
        axiosInstance.get('/projects/'),
        axiosInstance.get('/users/')
      ]).then(([taskResponse, projectsResponse, usersResponse]) => {
        if (!isMounted) return;
        const task = taskResponse.data; setProjects(projectsResponse.data); setUsers(usersResponse.data);
        setFormData({
          title: task.title ?? '', description: task.description ?? '', status: task.status ?? '',
          priority: task.priority ?? '', start_date: formatDateForInput(task.start_date),
          due_date: formatDateForInput(task.due_date), project_id: task.project_id ?? '',
          assignee_id: task.assignee_id ?? '',
        });
      }).catch(err => {
        if (!isMounted) return; console.error("Error fetching data:", err);
        if (err?.response?.status === 404) { setError('Task not found.'); }
        else { setError('Failed to load required data.'); }
        // Simplified check
        if (projectsResponse?.status !== 200 || usersResponse?.status !== 200) { setDataLoadingError('Could not load projects or users list.'); }
      }).finally(() => { if (isMounted) setIsLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) {
         navigate('/login', { replace: true }); // Redirect if not logged in
    } else if (!authIsLoading && !taskId) {
        setError("Task ID missing."); // Handle missing ID
        setIsLoading(false);
    }
     return () => { isMounted = false; }; // Cleanup
  }, [taskId, isAuthenticated, authIsLoading, navigate]);


  // Handle input changes
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value, })); };

  // Handle form submission
  const handleSubmit = async (e) => { e.preventDefault(); if (!formData.project_id) { setError('Select project.'); return; } if (!canManageTasks) { setError("No permission"); return; } setError(''); setIsSubmitting(true); const dataToSend = { title: formData.title, description: formData.description, status: formData.status, priority: formData.priority, start_date: formData.start_date || null, due_date: formData.due_date || null, project_id: formData.project_id, assignee_id: formData.assignee_id === '' ? null : formData.assignee_id, }; try { await axiosInstance.put(`/tasks/${taskId}`, dataToSend); navigate('/tasks'); } catch (err) { console.error("Error updating task:", err); setError(err.response?.data?.detail || 'Failed to update.'); setIsSubmitting(false); } };

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading task details...</p></div> );
  }

  if (error && error.includes('not found')) {
     return ( <div className="container mx-auto p-6 text-center text-red-500">{error} <Link to="/tasks" className="text-blue-500 underline ml-2">Go Back to Tasks</Link></div> );
  }

  // If logged in user doesn't have permission, show error (useEffect might also redirect)
   if (!canManageTasks && !error) {
       return ( <div className="container mx-auto p-6 text-center text-red-500"> Access Denied. <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link> </div> );
   }

   // --- Removed the `if (!isAuthenticated) return <></>;` check here, relying on useEffect redirect ---

  // Filter assignable users
  const assignableUsers = users.filter(u => u.role === 'electrician' || u.role === 'team leader' || u.role === 'project manager');

  // --- Main return ---
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Task</h1>

      {/* Display errors */}
      {error && !error.includes('not found') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}
      {dataLoadingError && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{dataLoadingError}</p>}

      {/* Fieldset should be enabled if user can manage tasks */}
      <fieldset disabled={!canManageTasks || isSubmitting} className="disabled:opacity-70 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
            {/* Form content as before... */}
            <legend className="sr-only">Edit Task Details</legend>
            <div><label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project *</label><select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load projects.</p>}</div>
            <div><label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title *</label><input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
            <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea></div>
            <div><label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label><select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option></select></div>
            <div><label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label><select name="priority" id="priority" required value={formData.priority} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
            <div><label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label><input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
            <div><label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label><input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
            <div> <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label> <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"> <option value="">-- Unassigned --</option> {assignableUsers.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))} </select> {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load users...</p>} </div>
            <div className="flex justify-end space-x-3 pt-4"> <Link to="/tasks" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link> {canManageTasks && ( <button type="submit" disabled={isSubmitting || dataLoadingError} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting || dataLoadingError ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Saving...' : 'Save Changes'} </button> )} </div>
          </form>
      </fieldset>

      {/* Task Comments & Photos */}
      <TaskComments taskId={taskId} />
      <TaskPhotos taskId={taskId} />

    </div>
  );
}

export default TaskEditPage;