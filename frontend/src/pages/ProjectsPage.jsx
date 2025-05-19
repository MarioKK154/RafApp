// frontend/src/pages/ProjectsPage.jsx
// FINAL FINAL Corrected Version with Debug Logs - Strict Formatting
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Keep useNavigate for future use
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

const PROJECT_STATUSES = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold'];
const SORTABLE_FIELDS = [
    { label: 'Name', value: 'name'},
    { label: 'Status', value: 'status'},
    { label: 'Start Date', value: 'start_date'},
    { label: 'End Date', value: 'end_date'},
    { label: 'Date Created', value: 'created_at'}
];

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  // const navigate = useNavigate(); // Not directly used, but good to have

  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const canManageProjects = user && ['admin', 'project manager'].includes(user.role);

  const fetchProjects = useCallback(() => {
    console.log("ProjectsPage: fetchProjects called. Auth Loading:", authIsLoading, "Is Authenticated:", isAuthenticated); // DEBUG
    if (authIsLoading) {
        console.log("ProjectsPage: Auth is loading, setting component isLoading true and deferring fetch.");
        setIsLoading(true); // Keep main loading true if auth is still loading
        return;
    }
    if (!isAuthenticated) {
        console.log("ProjectsPage: Not authenticated, setting error and stopping load.");
        setIsLoading(false);
        setError('You must be logged in to view projects.');
        return;
    }

    setIsLoading(true);
    setError(''); // Clear previous errors
    const params = { sort_by: sortBy, sort_dir: sortDir };
    if (statusFilter && statusFilter !== 'All') {
      params.status = statusFilter;
    }
    console.log("ProjectsPage: Fetching with params:", params); // DEBUG

    axiosInstance.get('/projects/', { params })
      .then(response => {
        console.log("ProjectsPage: fetchProjects successful, data received:", response.data); // DEBUG
        setProjects(response.data);
      })
      .catch(err => {
        console.error("ProjectsPage: Error fetching projects:", err); // DEBUG
        setError('Failed to load projects.');
        toast.error('Failed to load projects.');
      })
      .finally(() => {
        console.log("ProjectsPage: fetchProjects finally block, setting isLoading to false."); // DEBUG
        setIsLoading(false);
      });
  }, [isAuthenticated, authIsLoading, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    console.log("ProjectsPage: useEffect for fetchProjects triggered. AuthLoading:", authIsLoading, "IsAuth:", isAuthenticated); // DEBUG
    // We want to fetch projects only when auth state is resolved and user is authenticated.
    // If authIsLoading is true, fetchProjects will see that and return early.
    // If authIsLoading is false and user is not authenticated, fetchProjects will set an error.
    // If authIsLoading is false and user is authenticated, fetchProjects will proceed.
    fetchProjects();
  }, [fetchProjects]); // fetchProjects callback has its own dependencies including authIsLoading and isAuthenticated

  const handleDeleteClick = (project) => {
    if (!canManageProjects) {
        toast.error("You don't have permission to delete projects.");
        return;
    }
    setProjectToDelete(project);
    setIsModalOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    // setError(''); // Not needed as toast is used for action feedback
    try {
        await axiosInstance.delete(`/projects/${projectToDelete.id}`);
        toast.success(`Project "${projectToDelete.name}" deleted successfully!`);
        fetchProjects(); // Refetch list to show changes
    } catch (err) {
        console.error("Error deleting project:", err);
        const errorMsg = err.response?.data?.detail || 'Failed to delete project.';
        // setError(errorMsg); // Displaying this error on the main page might be too much
        toast.error(errorMsg);
    } finally {
        setIsModalOpen(false);
        setProjectToDelete(null);
    }
  };

  // --- Render Logic ---
  console.log("ProjectsPage: Rendering. AuthLoading:", authIsLoading, "ComponentLoading:", isLoading, "IsAuth:", isAuthenticated, "Error:", error, "Projects count:", projects.length); // DEBUG

  if (authIsLoading || isLoading) { // isLoading here refers to project list loading
  return (
      <div className="min-h-screen flex justify-center items-center">
          <LoadingSpinner text="Loading projects..." size="lg" />
      </div>
  );
}

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view projects.'}</p>
            <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
            >
                Go to Login
            </Link>
        </div>
     );
  }

  // If there was a general fetch error (and not just initial loading)
  if (error) {
      return (
           <div className="container mx-auto p-6 text-center text-red-500">
               <p>{error}</p>
               <button onClick={fetchProjects} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                   Try Again
               </button>
           </div>
       );
   }

  // Main Authenticated Content
  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header and Create Button */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
        {canManageProjects && (
             <Link to="/projects/new" className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 text-sm md:text-base">
                 Create New Project
             </Link>
         )}
      </div>

      {/* Filters and Sorting Controls Row */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
                <select id="statusFilter" name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {PROJECT_STATUSES.map(statusVal => ( <option key={statusVal} value={statusVal === 'All' ? '' : statusVal}> {statusVal} </option> ))}
                </select>
            </div>
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                <select id="sortBy" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    {SORTABLE_FIELDS.map(field => ( <option key={field.value} value={field.value}> {field.label} </option> ))}
                </select>
            </div>
            <div className="flex-shrink-0">
                 <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                 <select id="sortDir" name="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                     <option value="asc">Ascending</option>
                     <option value="desc">Descending</option>
                 </select>
             </div>
      </div>

      {/* Project List Display */}
      {projects.length === 0 ? (
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
                    <button onClick={() => handleDeleteClick(project)} className="px-3 py-1 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition duration-200 text-xs"> Delete </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setProjectToDelete(null); }}
        onConfirm={confirmDeleteProject}
        title="Confirm Deletion"
      >
        Are you sure you want to delete the project
        <strong className="font-semibold"> "{projectToDelete?.name}"</strong>?
        This action will also delete all associated tasks and cannot be undone.
      </Modal>
    </div>
  );
}

export default ProjectsPage;