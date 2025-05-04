// frontend/src/pages/TaskCreatePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// Helper function (remains the same)
const formatDateForInput = (dateString) => { /* ... */
    if (!dateString) return ''; try { return new Date(dateString).toISOString().split('T')[0]; } catch (e) { return ''; }
};

function TaskCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth(); // Get current user for role check
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]); // State for assignable users
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'To Do', priority: 'Medium',
    due_date: '', project_id: '',
    assignee_id: '', // Add assignee_id to initial state (empty string for unassigned)
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState('');

  // Determine if user can manage tasks (TL, PM, Admin)
  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch projects AND users for the dropdowns
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
        setDataLoadingError('');
        setIsSubmitting(true); // Use isSubmitting to disable form while loading select options

        Promise.all([
            axiosInstance.get('/projects/'),
            axiosInstance.get('/users/') // Fetch all users for assignee dropdown
        ])
        .then(([projectsResponse, usersResponse]) => {
            setProjects(projectsResponse.data);
            setUsers(usersResponse.data); // Store all users
            // Set default project_id if projects exist
            if (projectsResponse.data.length > 0 && !formData.project_id) {
                setFormData(prev => ({ ...prev, project_id: projectsResponse.data[0].id }));
            }
        })
        .catch(err => {
            console.error("Error fetching projects or users:", err);
            setDataLoadingError('Could not load necessary data (projects or users).');
        })
        .finally(() => {
            setIsSubmitting(false); // Re-enable form
        });

    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading, navigate]); // Re-run on auth change


  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      // Convert project_id/assignee_id back to number if selected, handle "" for unassigned
      [name]: (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { setError('Please select a project.'); return; }
    // Ensure user has permission (redundant check as backend enforces, but good practice)
    if (!canManageTasks) { setError('You do not have permission to create tasks.'); return; }

    setError('');
    setIsSubmitting(true);

    const dataToSend = {
        ...formData,
        due_date: formData.due_date || null,
        // Ensure assignee_id is null if empty string was selected
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
  // Redirect already handled in useEffect if not authenticated

  // Filter users who can be assigned (e.g., 'electrician' role - adjust as needed)
  const assignableUsers = users.filter(u => u.role === 'electrician' || u.role === 'team leader' || u.role === 'project manager'); // Example filter

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{error}</p>}
      {dataLoadingError && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{dataLoadingError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Selection (remains the same) */}
        <div>
            <label htmlFor="project_id">Project *</label>
            <select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError || isSubmitting} className="...">
                <option value="" disabled>-- Select Project --</option>
                {projects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
            </select>
             {projects.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">No projects available.</p>}
        </div>

        {/* Task Title */}
        <div> <label htmlFor="title">Task Title *</label> <input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className="..."/> </div>
        {/* Description */}
        <div> <label htmlFor="description">Description</label> <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="..."></textarea> </div>
        {/* Status */}
        <div> <label htmlFor="status">Status</label> <select name="status" id="status" required value={formData.status} onChange={handleChange} className="..."> <option value="To Do">To Do</option> <option value="In Progress">In Progress</option> <option value="Done">Done</option> <option value="Blocked">Blocked</option> </select> </div>
        {/* Priority */}
        <div> <label htmlFor="priority">Priority</label> <select name="priority" id="priority" required value={formData.priority} onChange={handleChange} className="..."> <option value="Low">Low</option> <option value="Medium">Medium</option> <option value="High">High</option> </select> </div>
        {/* Due Date */}
        <div> <label htmlFor="due_date">Due Date</label> <input type="date" name="due_date" id="due_date" value={formData.due_date || ''} onChange={handleChange} className="..."/> </div>

        {/* --- NEW: Assignee Selection --- */}
        <div>
            <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
            <select
                name="assignee_id" id="assignee_id"
                value={formData.assignee_id} onChange={handleChange}
                disabled={users.length === 0 || dataLoadingError || isSubmitting}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
                <option value="">-- Unassigned --</option>
                {/* You might want to filter users here based on role, e.g., only show 'electrician' */}
                {assignableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                         {u.full_name || u.email} ({u.role})
                    </option>
                ))}
            </select>
             {users.length === 0 && !dataLoadingError && <p className="text-xs text-gray-500 mt-1">Could not load users for assignment.</p>}
        </div>
        {/* --- End Assignee Selection --- */}


        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/tasks" className="..."> Cancel </Link>
          <button type="submit" disabled={isSubmitting || dataLoadingError || !formData.project_id} className="...">
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskCreatePage;