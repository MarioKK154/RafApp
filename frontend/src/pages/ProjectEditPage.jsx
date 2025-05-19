// frontend/src/pages/ProjectEditPage.jsx
// ABSOLUTELY FINAL Meticulously Checked Uncondensed Version - Project Manager Assignment Logic
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date for input:", dateString, e);
        return '';
    }
};

function ProjectEditPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '', description: '', address: '', status: 'Planning',
    start_date: '', end_date: '', project_manager_id: '',
  });
  const [initialProjectData, setInitialProjectData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);

  const [allProjectsForAssignment, setAllProjectsForAssignment] = useState([]); // For user's project assignment section
  const [assignedProjectIdsForUser, setAssignedProjectIdsForUser] = useState(new Set());
  const [projectManagers, setProjectManagers] = useState([]); // For PM dropdown of THIS project
  const [dataLoadingError, setDataLoadingError] = useState('');


  const canManageProject = currentUser && ['admin', 'project manager'].includes(currentUser.role);

  const fetchPageData = useCallback(async () => {
    if (!authIsLoading && isAuthenticated && projectId) {
      if (!canManageProject && !error) {
        setError('Access Denied: You do not have permission to edit this project.');
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      setError('');
      setDataLoadingError('');

      try {
        const [projectResponse, usersResponse] = await Promise.all([
            axiosInstance.get(`/projects/${projectId}`),
            axiosInstance.get('/users/') // Fetch all users for PM dropdown
        ]);

        const project = projectResponse.data;
        setInitialProjectData(project);
        setFormData({
            name: project.name ?? '',
            description: project.description ?? '',
            address: project.address ?? '',
            status: project.status ?? 'Planning',
            start_date: formatDateForInput(project.start_date),
            end_date: formatDateForInput(project.end_date),
            project_manager_id: project.project_manager_id?.toString() ?? '',
        });

        const pms = usersResponse.data.filter(user => user.role === 'project manager');
        setProjectManagers(pms);
        if (pms.length === 0) {
            setDataLoadingError('No users with "Project Manager" role found for assignment.');
        }

      } catch (err) {
        console.error("Error fetching project data or users:", err);
        const errorMsg = err.response?.status === 404 ? 'Project not found.' : 'Failed to load project data.';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !projectId) {
        setError("Project ID is missing.");
        setIsLoadingData(false);
    }
  }, [projectId, isAuthenticated, authIsLoading, canManageProject, navigate, error]); // Added error

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: name === 'project_manager_id' && value === '' ? null : (name === 'project_manager_id' ? parseInt(value,10) : value),
    }));
  };

  const handleSubmitUserDetails = async (e) => {
    e.preventDefault();
    if (!canManageProject) {
        toast.error("You don't have permission to edit this project.");
        return;
    }
    setError('');
    setIsSubmittingUserDetails(true);

    const dataToSend = {
        name: formData.name,
        description: formData.description || null,
        address: formData.address || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_manager_id: formData.project_manager_id ? Number(formData.project_manager_id) : null,
    };

    // Only send changed fields (optional, but good for PATCH-like behavior with PUT)
    let changedData = {};
    if (initialProjectData) {
        if (dataToSend.name !== initialProjectData.name) changedData.name = dataToSend.name;
        if (dataToSend.description !== (initialProjectData.description ?? null)) changedData.description = dataToSend.description;
        if (dataToSend.address !== (initialProjectData.address ?? null)) changedData.address = dataToSend.address;
        if (dataToSend.status !== initialProjectData.status) changedData.status = dataToSend.status;
        if (dataToSend.start_date !== formatDateForInput(initialProjectData.start_date)) changedData.start_date = dataToSend.start_date;
        if (dataToSend.end_date !== formatDateForInput(initialProjectData.end_date)) changedData.end_date = dataToSend.end_date;
        if (dataToSend.project_manager_id !== (initialProjectData.project_manager_id ?? null)) changedData.project_manager_id = dataToSend.project_manager_id;

        if (Object.keys(changedData).length === 0) {
            toast.info("No changes detected in project details.");
            setIsSubmittingUserDetails(false);
            return;
        }
    } else { // Fallback if initialProjectData is somehow null
        changedData = dataToSend;
    }


    try {
      const response = await axiosInstance.put(`/projects/${projectId}`, changedData);
      toast.success(`Project "${response.data.name}" updated successfully!`);
      setInitialProjectData(response.data); // Update initial data to reflect saved changes
      // Consider if navigation is desired or just stay on page
      // navigate('/projects');
    } catch (err) {
      console.error("Error updating project details:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update project details.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmittingUserDetails(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingData) { // isLoadingData covers initial project fetch
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading project details..." size="lg" /></div> );
  }

  if (!isAuthenticated) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>Please log in to continue.</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</Link>
        </div>
    );
  }

  if (!canManageProject || (error && (!initialProjectData || (initialProjectData && !initialProjectData.name)))) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied."}</p>
            <Link to="/projects" className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back to Projects</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Edit Project: {initialProjectData?.name || "Loading..."}
      </h1>

      {error && !error.toLowerCase().includes('not found') && !error.toLowerCase().includes('access denied') && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}
      {dataLoadingError && (
          <p className="text-orange-500 mb-4 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 p-3 rounded">{dataLoadingError}</p>
      )}

      <fieldset disabled={!canManageProject || isSubmittingUserDetails} className="disabled:opacity-70 mb-8">
          <form onSubmit={handleSubmitUserDetails} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
            <legend className="sr-only">Edit Project Details</legend>
            {/* Name */}
            <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label> <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
            {/* Description */}
            <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"></textarea> </div>
            {/* Address */}
            <div> <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label> <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
            {/* Project Manager Dropdown */}
            <div>
                <label htmlFor="project_manager_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
                <select
                    name="project_manager_id"
                    id="project_manager_id"
                    value={formData.project_manager_id ?? ''} // Ensure value is empty string if null/undefined
                    onChange={handleChange}
                    disabled={isSubmittingUserDetails || projectManagers.length === 0}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
                >
                    <option value="">-- None --</option>
                    {projectManagers.map(pm => (
                        <option key={pm.id} value={pm.id.toString()}>
                            {pm.full_name || pm.email}
                        </option>
                    ))}
                </select>
                {projectManagers.length === 0 && !dataLoadingError &&
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No Project Managers available.</p>
                }
            </div>
            {/* Status */}
            <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label> <select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"><option value="Planning">Planning</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option></select> </div>
            {/* Start Date */}
            <div> <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label> <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
            {/* End Date */}
            <div> <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label> <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4"> <Link to="/projects" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link> <button type="submit" disabled={isSubmittingUserDetails} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmittingUserDetails ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmittingUserDetails ? 'Saving...' : 'Save Changes'} </button> </div>
          </form>
      </fieldset>

      {/* Only render these if projectId is valid and user has permission to manage project */}
      {projectId && canManageProject && (
        <>
            <ProjectDrawings projectId={projectId} />
            <ProjectMembers projectId={projectId} />
        </>
      )}
    </div>
  );
}
export default ProjectEditPage;