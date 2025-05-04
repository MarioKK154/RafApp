// frontend/src/pages/TaskCreatePage.jsx
// Uncondensed Version: Added Start Date Input
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function TaskCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    start_date: '', // Added start_date
    due_date: '',
    project_id: '',
    assignee_id: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState('');

  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch projects and users for dropdowns
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && canManageTasks) { // Added canManageTasks check here too
        setDataLoadingError('');
        setIsSubmitting(true); // Disable form while loading selects
        Promise.all([
            axiosInstance.get('/projects/'),
            axiosInstance.get('/users/')
        ]).then(([projectsResponse, usersResponse]) => {
            setProjects(projectsResponse.data);
            setUsers(usersResponse.data);
            if (projectsResponse.data.length > 0 && !formData.project_id) {
                setFormData(prev => ({ ...prev, project_id: projectsResponse.data[0].id }));
            }
        }).catch(err => {
            console.error("Error fetching projects or users:", err);
            setDataLoadingError('Could not load necessary data (projects or users).');
        }).finally(() => {
            setIsSubmitting(false); // Re-enable form
        });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login', { replace: true });
    } else if (!authIsLoading && !canManageTasks) {
        setError("Access Denied."); // Set error if user doesn't have permission
        setIsSubmitting(false); // Ensure form isn't disabled
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading, canManageTasks, navigate]); // Added canManageTasks


  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { setError('Please select a project.'); return; }
    if (!canManageTasks) { setError('No permission.'); return; }
    setError('');
    setIsSubmitting(true);

    const dataToSend = {
        ...formData,
        start_date: formData.start_date || null, // Send null if empty
        due_date: formData.due_date || null,
        assignee_id: formData.assignee_id === '' ? null : formData.assignee_id,
    };

    try {
      await axiosInstance.post('/tasks/', dataToSend);
      navigate('/tasks');
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err.response?.data?.detail || 'Failed to create task.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading) return <p>Loading...</p>;
  // Handle permission error after loading check
  if (!canManageTasks) {
      return ( <div className="container mx-auto p-6 text-center text-red-500"> {error || 'Access Denied.'} <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link> </div> );
  }

  // Filter assignable users
  const assignableUsers = users.filter(u => u.role === 'electrician' || u.role === 'team leader' || u.role === 'project manager');

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{error}</p>}
      {dataLoadingError && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{dataLoadingError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Selection */}
        <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label>
            <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError || isSubmitting} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                <option value="" disabled>-- Select Project --</option>
                {projects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
            </select>
            {projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">...</p>}
        </div>

        {/* Task Title */}
        <div><label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label><input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/></div>
        {/* Description */}
        <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea></div>
        {/* Status */}
        <div><label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label><select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full ..."><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option></select></div>
        {/* Priority */}
        <div><label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label><select name="priority" id="priority" required value={formData.priority} onChange={handleChange} className="mt-1 block w-full ..."><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>

        {/* --- NEW: Start Date --- */}
        <div>
           <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
           <input
             type="date" name="start_date" id="start_date"
             value={formData.start_date || ''} // Handle null value for input
             onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           />
         </div>
         {/* --- End Start Date --- */}

         {/* Due Date */}
        <div><label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label><input type="date" name="due_date" id="due_date" value={formData.due_date || ''} onChange={handleChange} className="mt-1 block w-full ..."/></div>
        {/* Assignee Selection */}
        <div> <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label> <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError || isSubmitting} className="mt-1 block w-full ..."> <option value="">-- Unassigned --</option> {assignableUsers.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))} </select> {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">...</p>} </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/tasks" className="..."> Cancel </Link> <button type="submit" disabled={isSubmitting || dataLoadingError || !formData.project_id} className={`... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Creating...' : 'Create Task'} </button> </div>
      </form>
    </div>
  );
}

export default TaskCreatePage;