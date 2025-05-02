// frontend/src/pages/TaskCreatePage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// Helper function to format date for input type="date"
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Returns 'YYYY-MM-DD'
    } catch (e) { return ''; }
};

function TaskCreatePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]); // To store list of projects for dropdown
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
    project_id: '', // Needs to be selected
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectLoadingError, setProjectLoadingError] = useState('');

  // Fetch projects for the dropdown
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
        setProjectLoadingError('');
        axiosInstance.get('/projects/')
            .then(response => {
                setProjects(response.data);
                // Set default project_id if projects exist
                if (response.data.length > 0) {
                    setFormData(prev => ({ ...prev, project_id: response.data[0].id }));
                }
            })
            .catch(err => {
                console.error("Error fetching projects for dropdown:", err);
                setProjectLoadingError('Could not load projects.');
            });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading, navigate]); // Depend on auth state

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      // Convert project_id back to number if needed
      [name]: name === 'project_id' ? parseInt(value, 10) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) {
        setError('Please select a project.');
        return;
    }
    setError('');
    setIsSubmitting(true);

    const dataToSend = {
        ...formData,
        due_date: formData.due_date || null, // Handle empty date string
    };

    try {
      await axiosInstance.post('/tasks/', dataToSend);
      navigate('/tasks'); // Navigate back to task list on success
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err.response?.data?.detail || 'Failed to create task.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading) return <p>Loading...</p>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{error}</p>}
      {projectLoadingError && <p className="text-red-500 mb-4 bg-red-100 p-3 rounded">{projectLoadingError}</p>}


      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Selection */}
        <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project <span className="text-red-500">*</span></label>
            <select
                name="project_id" id="project_id" required
                value={formData.project_id} onChange={handleChange}
                disabled={projects.length === 0 || projectLoadingError}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
                <option value="" disabled>-- Select Project --</option>
                {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
            </select>
            {projects.length === 0 && !projectLoadingError && <p className="text-xs text-gray-500 mt-1">No projects available. Create a project first.</p>}
        </div>

        {/* Task Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label>
          <input
            type="text" name="title" id="title" required
            value={formData.title} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            name="description" id="description" rows="3"
            value={formData.description} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>

         {/* Status */}
         <div>
           <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
           <select
             name="status" id="status" required
             value={formData.status} onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           >
             <option value="To Do">To Do</option>
             <option value="In Progress">In Progress</option>
             <option value="Done">Done</option>
             <option value="Blocked">Blocked</option>
           </select>
         </div>

         {/* Priority */}
         <div>
           <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
           <select
             name="priority" id="priority" required
             value={formData.priority} onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           >
             <option value="Low">Low</option>
             <option value="Medium">Medium</option>
             <option value="High">High</option>
           </select>
         </div>

         {/* Due Date */}
        <div>
           <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
           <input
             type="date" name="due_date" id="due_date"
             value={formData.due_date || ''} onChange={handleChange} // Handle null value for input
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           />
         </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/tasks" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
             Cancel
           </Link>
          <button
            type="submit"
            disabled={isSubmitting || projectLoadingError || projects.length === 0}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskCreatePage;