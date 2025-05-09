// frontend/src/pages/ProjectsPage.jsx
// FINAL Corrected Version - Fixed conditional return JSX
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const PROJECT_STATUSES = ['All', 'Planning', 'In Progress', 'Completed', 'On Hold'];

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const canManageProjects = user && ['admin', 'project manager'].includes(user.role);

  const fetchProjects = useCallback(() => {
    if (authIsLoading || !isAuthenticated) { setIsLoading(false); setError(isAuthenticated ? '' : 'You must be logged in.'); return; }
    setIsLoading(true); setError('');
    const params = {}; if (statusFilter && statusFilter !== 'All') { params.status = statusFilter; }
    axiosInstance.get('/projects/', { params })
      .then(response => { setProjects(response.data); })
      .catch(err => { console.error("Error fetching projects:", err); setError('Failed to load projects.'); })
      .finally(() => { setIsLoading(false); });
  }, [isAuthenticated, authIsLoading, statusFilter]); // Include statusFilter

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (projectId) => { if (!canManageProjects) { alert("No permission"); return; } if (!window.confirm('Are you sure...?')) return; try { setError(''); await axiosInstance.delete(`/projects/${projectId}`); setProjects(currentProjects => currentProjects.filter(p => p.id !== projectId)); } catch (err) { console.error("Error deleting project:", err); setError(err.response?.data?.detail || 'Failed to delete project.'); } };

  // --- Render Logic ---

  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading projects...</p></div> );
  }

  // --- CORRECTED BLOCK ---
  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view projects.'}</p>
            {/* Fully expanded Link tag */}
            <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
            >
                Go to Login
            </Link>
        </div>
     );
  }
  // --- END CORRECTED BLOCK ---

  // Handle other fetch errors after loading/auth checks
   if (error && !isLoading) {
       return (
           <div className="container mx-auto p-6 text-center text-red-500">
               <p>{error}</p>
           </div>
       );
   }

  // Main Authenticated Return
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
        <div className="flex items-center space-x-2 md:space-x-4">
            {/* Status Filter Dropdown */}
            <div>
                <label htmlFor="statusFilter" className="sr-only">Filter by Status</label>
                <select id="statusFilter" name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm md:text-base block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    {PROJECT_STATUSES.map(status => ( <option key={status} value={status === 'All' ? '' : status}> {status} </option> ))}
                </select>
            </div>
            {/* Create Button */}
            {canManageProjects && ( <Link to="/projects/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base"> Create New Project </Link> )}
        </div>
      </div>

      {/* Project List Display */}
      {projects.length === 0 ? ( <p className="text-gray-600 dark:text-gray-400">No projects found matching the criteria. {canManageProjects ? 'Create one!' : ''}</p> ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description || 'No description'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Status: {project.status}</p>
                </div>
                {canManageProjects && (
                  <div className="flex space-x-2 flex-shrink-0 ml-4">
                    <Link to={`/projects/edit/${project.id}`} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 text-xs"> Edit </Link>
                    <button onClick={() => handleDelete(project.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs"> Delete </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default ProjectsPage;