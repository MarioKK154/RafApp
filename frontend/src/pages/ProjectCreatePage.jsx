// frontend/src/pages/ProjectCreatePage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    status: 'Planning', // Default status
    start_date: '',
    end_date: '',
  });
  const [error, setError] = useState(''); // For form-level validation errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageProjects = user && ['admin', 'project manager'].includes(user.role);

  // Effect for redirecting if not authenticated or not permitted (after auth check)
  useEffect(() => {
    if (!authIsLoading) { // Only run after auth status is resolved
      if (!isAuthenticated) {
        toast.error("You must be logged in to create a project.");
        navigate('/login', { replace: true });
      } else if (!canManageProjects) {
        toast.error("You don't have permission to create projects.");
        navigate('/', { replace: true }); // Redirect to home or a 'forbidden' page
      }
    }
  }, [isAuthenticated, authIsLoading, canManageProjects, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value, // Dates will be strings from input, backend handles parsing
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageProjects) { // Double check permission
        toast.error("You don't have permission to create projects.");
        return;
    }
    setError(''); // Clear previous form errors
    setIsSubmitting(true);

    const dataToSend = {
        ...formData,
        start_date: formData.start_date || null, // Send null if empty
        end_date: formData.end_date || null,   // Send null if empty
    };

    try {
      const response = await axiosInstance.post('/projects/', dataToSend);
      toast.success(`Project "${response.data.name}" created successfully!`);
      navigate('/projects'); // Navigate to projects list on success
    } catch (err) {
      console.error("Error creating project:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create project. Please check your input.';
      setError(errorMsg); // Display error on form
      toast.error(errorMsg);
      setIsSubmitting(false); // Re-enable form only on error
    }
    // setIsSubmitting(false) is not in a finally block because navigation happens on success
  };

  // --- Render Logic ---

  // Show loading if auth state is still being determined
  if (authIsLoading) {
     return (
        <div className="container mx-auto p-6 text-center">
             <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
     );
  }

  // If user is not authenticated or doesn't have permission,
  // useEffect will redirect, but we can return null or a message here
  // to prevent rendering the form prematurely or if redirect fails.
  if (!isAuthenticated || !canManageProjects) {
      return (
          <div className="container mx-auto p-6 text-center text-red-500">
              <p>Access Denied. Redirecting...</p>
          </div>
      );
  }

  // Main form content
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Project</h1>

      {/* Display form submission errors */}
      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label>
          <input
            type="text" name="name" id="name" required
            value={formData.name} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            name="description" id="description" rows="3"
            value={formData.description} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
          ></textarea>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
          <input
            type="text" name="address" id="address"
            value={formData.address} onChange={handleChange} disabled={isSubmitting}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
          />
        </div>

        {/* Status */}
         <div>
           <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
           <select
             name="status" id="status" required
             value={formData.status} onChange={handleChange} disabled={isSubmitting}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
           >
             <option value="Planning">Planning</option>
             <option value="In Progress">In Progress</option>
             <option value="Completed">Completed</option>
             <option value="On Hold">On Hold</option>
           </select>
         </div>

        {/* Start Date */}
        <div>
           <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
           <input
             type="date" name="start_date" id="start_date"
             value={formData.start_date || ''} onChange={handleChange} disabled={isSubmitting}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
           />
         </div>

         {/* End Date */}
        <div>
           <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
           <input
             type="date" name="end_date" id="end_date"
             value={formData.end_date || ''} onChange={handleChange} disabled={isSubmitting}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
           />
         </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
           <Link to="/projects" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
             Cancel
           </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectCreatePage;