// frontend/src/pages/ProjectCreatePage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    status: 'Planning', // Default status
    start_date: '',
    end_date: '',
    project_manager_id: '', // Initialize as empty string for select
  });
  const [error, setError] = useState(''); // For form submission errors
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectManagers, setProjectManagers] = useState([]);
  const [pmLoadingError, setPmLoadingError] = useState('');

  const canManageProjects = currentUser && ['admin', 'project manager'].includes(currentUser.role);

  // Fetch users with 'project manager' role
  const fetchProjectManagers = useCallback(() => {
    if (!authIsLoading && isAuthenticated && canManageProjects) {
        setPmLoadingError('');
        axiosInstance.get('/users/')
            .then(response => {
                const pms = response.data.filter(user => user.role === 'project manager');
                setProjectManagers(pms);
                if (pms.length === 0) {
                    setPmLoadingError('No "Project Manager" role users found to assign. You can still create the project.');
                    // Not using toast here as it's informational for an empty dropdown
                }
            })
            .catch(err => {
                console.error("Error fetching project managers:", err);
                setPmLoadingError('Could not load project managers list.');
                toast.error('Could not load project managers for selection.');
            });
    }
  }, [isAuthenticated, authIsLoading, canManageProjects]); // Removed formData from deps

  // Effect for initial data loading and permission checks
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in to access this page.");
        navigate('/login', { replace: true });
      } else if (!canManageProjects) {
        toast.error("Access Denied: You do not have permission to create projects.");
        navigate('/', { replace: true }); // Redirect to home or a suitable page
      } else {
        fetchProjectManagers(); // Fetch PMs if authorized
      }
    }
  }, [isAuthenticated, authIsLoading, canManageProjects, navigate, fetchProjectManagers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value, // Dates and PM ID will be strings from form, backend handles parsing/conversion
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageProjects) { // Final check
        toast.error("You do not have permission to perform this action.");
        return;
    }
    setError(''); // Clear previous form errors
    setIsSubmitting(true);

    const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_manager_id: formData.project_manager_id ? parseInt(formData.project_manager_id, 10) : null,
    };

    try {
      const response = await axiosInstance.post('/projects/', dataToSend);
      toast.success(`Project "${response.data.name}" created successfully!`);
      navigate('/projects'); // Navigate to projects list on success
    } catch (err) {
      console.error("Error creating project:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create project. Please check your inputs.';
      setError(errorMsg); // Display error on form
      toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Logic ---

  if (authIsLoading) { // Or if you have a specific prerequisitesLoading state
   return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading form..." size="lg" /></div> );
  }

  // If user is not authenticated or not permitted, useEffect handles redirection.
  // This is a fallback or for the brief moment before redirect.
  if (!isAuthenticated || !canManageProjects) {
      return (
          <div className="container mx-auto p-6 text-center text-red-500">
              <p>{error || "Access Denied or not authenticated. Redirecting..."}</p>
              <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link>
          </div>
      );
  }

  // Main form content
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Project</h1>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
        </div>
      )}
      {pmLoadingError && (
         <div className="mb-4 p-3 text-sm text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 rounded-md" role="alert">
            {pmLoadingError}
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
        
        {/* Project Manager Dropdown */}
        <div>
            <label htmlFor="project_manager_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
            <select
                name="project_manager_id"
                id="project_manager_id"
                value={formData.project_manager_id}
                onChange={handleChange}
                disabled={isSubmitting || projectManagers.length === 0}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            >
                <option value="">-- Assign PM (Optional) --</option>
                {projectManagers.map(pm => (
                    <option key={pm.id} value={pm.id.toString()}>
                        {pm.full_name || pm.email}
                    </option>
                ))}
            </select>
            {projectManagers.length === 0 && !pmLoadingError &&
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No "Project Manager" role users found to assign.</p>
            }
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
           <Link to="/projects" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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