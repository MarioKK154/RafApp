// frontend/src/pages/ProjectsPage.jsx
// FINAL REFACTORED VERSION - Single Return with Conditional Rendering
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const PROJECT_STATUSES = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold'];
const SORTABLE_FIELDS = [
    { label: 'Name', value: 'name'}, { label: 'Status', value: 'status'},
    { label: 'Start Date', value: 'start_date'}, { label: 'End Date', value: 'end_date'},
    { label: 'Date Created', value: 'created_at'}
];

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // For fetching projects
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth(); // Auth context loading state
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const canManageProjects = user && ['admin', 'project manager'].includes(user.role);

  // Function to fetch projects
  const fetchProjects = useCallback(() => {
    // Ensure user is authenticated before fetching
    if (!isAuthenticated) {
        // Error handled by main render logic, just prevent fetch
        setIsLoading(false); // Ensure loading stops
        return;
    }
    setIsLoading(true);
    setError('');
    const params = { sort_by: sortBy, sort_dir: sortDir };
    if (statusFilter && statusFilter !== 'All') {
      params.status = statusFilter;
    }

    axiosInstance.get('/projects/', { params })
      .then(response => {
        setProjects(response.data);
      })
      .catch(err => {
        console.error("Error fetching projects:", err);
        setError('Failed to load projects.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, statusFilter, sortBy, sortDir]); // Dependencies for refetch

  // Effect runs when filter/sort/auth state changes
  useEffect(() => {
    // Only fetch if initial auth check is complete
    if (!authIsLoading) {
        fetchProjects();
    } else {
        // If auth is still loading, set project loading true
        // to show main loading indicator
        setIsLoading(true);
    }
  }, [fetchProjects, authIsLoading]); // Depend on fetchProjects callback

  // Handle Deletion
  const handleDelete = async (projectId, projectName) => {
    if (!canManageProjects) {
         // Use toast or other notification method here eventually
         alert("You don't have permission to delete projects.");
         return;
    }
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?`)) {
        return;
    }
    setError(''); // Clear list errors before attempt
    try {
        await axiosInstance.delete(`/projects/${projectId}`);
        // alert('Project deleted successfully!'); // Use toast later
        fetchProjects(); // Refetch list to confirm deletion from server
    } catch (err) {
        console.error("Error deleting project:", err);
        const errorMsg = err.response?.data?.detail || 'Failed to delete project.';
        setError(errorMsg); // Show error above the list
        // toast.error(errorMsg); // Use toast later
    }
  };

  // --- Render Logic ---
  // Single return statement, conditional rendering inside

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
        {/* Show Create Button only if authenticated and allowed */}
        {isAuthenticated && canManageProjects && (
             <Link to="/projects/new" className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 text-sm md:text-base">
                 Create New Project
             </Link>
         )}
      </div>

      {/* Display Loading Indicator */}
      {authIsLoading || isLoading ? (
        <div className="text-center py-10">
             <p className="text-xl text-gray-500 dark:text-gray-400">Loading projects...</p>
             {/* TODO: Replace with spinner component */}
        </div>
      ) : !isAuthenticated ? (
        // Display Login Prompt if not authenticated
        <div className="text-center py-10">
            <p className="text-red-600 mb-4">Please log in to view projects.</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200">
                Go to Login
            </Link>
        </div>
      ) : (
        // Display Filters, Errors, and Project List if authenticated
        <>
          {/* Filters and Sorting Controls Row */}
          <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            {/* Status Filter */}
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
                <select id="statusFilter" name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {PROJECT_STATUSES.map(status => ( <option key={status} value={status === 'All' ? '' : status}> {status} </option> ))}
                </select>
            </div>
            {/* Sort By */}
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                <select id="sortBy" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {SORTABLE_FIELDS.map(field => ( <option key={field.value} value={field.value}> {field.label} </option> ))}
                </select>
            </div>
            {/* Sort Direction */}
            <div className="flex-shrink-0">
                 <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                 <select id="sortDir" name="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                     <option value="asc">Ascending</option>
                     <option value="desc">Descending</option>
                 </select>
             </div>
          </div>

          {/* Display Error if fetching failed */}
          {error && (
            <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
          )}

          {/* Project List Display */}
          {projects.length === 0 && !error ? (
            <p className="text-gray-600 dark:text-gray-400">No projects found matching the current criteria. {canManageProjects ? 'Create one!' : ''}</p>
          ) : (
            <div className="space-y-4">
              {projects.map(project => (
                <div key={project.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description || 'No description'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Status: {project.status}</p>
                      <div className="flex space-x-2 text-xs text-gray-500 dark:text-gray-500 mt-1">
                           {project.start_date && <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>}
                           {project.end_date && <span>End: {new Date(project.end_date).toLocaleDateString()}</span>}
                       </div>
                    </div>
                    {canManageProjects && (
                      <div className="flex space-x-2 flex-shrink-0 ml-4">
                        <Link to={`/projects/edit/${project.id}`} className="px-3 py-1 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 text-xs"> Edit </Link>
                        <button onClick={() => handleDelete(project.id, project.name)} className="px-3 py-1 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition duration-200 text-xs"> Delete </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  ); // End main return
}

export default ProjectsPage;