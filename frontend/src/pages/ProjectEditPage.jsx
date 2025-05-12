// frontend/src/pages/ProjectEditPage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import { toast } from 'react-toastify';

const formatDateForInput = (dateString) => { if (!dateString) return ''; try { const d=new Date(dateString); return isNaN(d.getTime())?'':d.toISOString().split('T')[0]; } catch(e){ console.error("Error formatting date for input:",dateString, e); return ''; } };

function ProjectEditPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({ name: '', description: '', address: '', status: 'Planning', start_date: '', end_date: '' });
  const [isLoadingData, setIsLoadingData] = useState(true); // Specific for project data loading
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageProject = user && ['admin', 'project manager'].includes(user.role);

  const fetchProjectData = useCallback(() => {
    if (!authIsLoading && isAuthenticated && projectId && canManageProject) {
      setIsLoadingData(true);
      setError('');
      axiosInstance.get(`/projects/${projectId}`)
        .then(response => {
            const project = response.data;
            setFormData({
                name: project.name ?? '', description: project.description ?? '',
                address: project.address ?? '', status: project.status ?? 'Planning',
                start_date: formatDateForInput(project.start_date),
                end_date: formatDateForInput(project.end_date),
            });
        })
        .catch(err => {
          console.error("Error fetching project data:", err);
          setError(err.response?.status === 404 ? 'Project not found. It may have been deleted.' : 'Failed to load project data.');
          toast.error(err.response?.data?.detail || 'Failed to load project data.');
        })
        .finally(() => { setIsLoadingData(false); });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login', { replace: true });
    } else if (!authIsLoading && !canManageProject) {
        // Error state set here if permission is denied after auth is loaded
        setError('You do not have permission to edit this project.');
        setIsLoadingData(false); // Stop loading if permission denied
    } else if (!projectId) {
         setError("Project ID is missing.");
         setIsLoadingData(false);
    }
  }, [projectId, isAuthenticated, authIsLoading, canManageProject, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageProject) { toast.error("No permission."); return; }
    setError(''); setIsSubmitting(true);
    const dataToSend = { ...formData, start_date: formData.start_date || null, end_date: formData.end_date || null };
    try {
      const response = await axiosInstance.put(`/projects/${projectId}`, dataToSend);
      toast.success(`Project "${response.data.name}" updated successfully!`);
      navigate('/projects');
    } catch (err) {
      console.error("Error updating project:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update project.';
      setError(errorMsg); // For form-level display
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingData) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl ...">Loading project details...</p></div> );
  }

  if (!isAuthenticated) { // Should have been redirected by useEffect
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>Please log in.</p><Link to="/login" className="...">Login</Link></div> );
  }

  // If permission denied (and not due to other fetch errors)
  if (!canManageProject) {
      return ( <div className="container mx-auto p-6 text-center text-red-500">{error || 'Access Denied.'}<Link to="/projects" className="text-blue-500 underline ml-2">Back to Projects</Link></div> );
  }

  // If there was an error fetching project data (e.g., not found)
  if (error && formData.name === '') { // Check if formData is still initial if error occurred during fetch
      return ( <div className="container mx-auto p-6 text-center text-red-500">{error}<Link to="/projects" className="text-blue-500 underline ml-2">Back to Projects</Link></div> );
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Project</h1>
      {/* Display form submission errors (if not a "not found" type error) */}
      {error && !error.toLowerCase().includes('not found') && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}

      <fieldset disabled={isSubmitting} className="disabled:opacity-70 mb-8"> {/* Form itself isn't disabled by role, just submit action */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
            <legend className="sr-only">Edit Project Details</legend>
            {/* Form fields */}
            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label><input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 ..."/></div>
            <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 ..."></textarea></div>
            <div><label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 ..."/></div>
            <div><label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label><select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 ..."><option value="Planning">Planning</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option></select></div>
            <div><label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label><input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 ..."/></div>
            <div><label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label><input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 ..."/></div>
            <div className="flex justify-end space-x-3 pt-4"> <Link to="/projects" className="px-4 py-2 border ...">Cancel</Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Saving...' : 'Save Changes'} </button> </div>
          </form>
      </fieldset>

      <ProjectDrawings projectId={projectId} />
      <ProjectMembers projectId={projectId} />
    </div>
  );
}
export default ProjectEditPage;