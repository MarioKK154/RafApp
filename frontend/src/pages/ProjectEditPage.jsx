// frontend/src/pages/ProjectEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import ProjectBoQ from '../components/ProjectBoQ';
import ProjectInventory from '../components/ProjectInventory';
import ProjectOffers from '../components/ProjectOffers';
import ProjectLiveClockIns from '../components/ProjectLiveClockIns'; // Import the new component
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
        name: '',
        description: '',
        address: '',
        status: 'Planning',
        start_date: '',
        end_date: '',
        project_manager_id: '',
        budget: '',
    });
    const [initialProjectData, setInitialProjectData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);
    const [projectManagers, setProjectManagers] = useState([]);
    const [dataLoadingError, setDataLoadingError] = useState(''); // Specific error for PM loading

    const canManageProject = currentUser && ['admin', 'project manager'].includes(currentUser.role);

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && projectId) {
            // Permission check can happen here or rely on API 403
            setIsLoadingData(true);
            setError('');
            setDataLoadingError(''); // Reset PM loading error too
            try {
                // Fetch project details and users list concurrently
                const [projectResponse, usersResponse] = await Promise.all([
                    axiosInstance.get(`/projects/${projectId}`),
                    axiosInstance.get('/users/') // Fetch all users to filter PMs
                ]);

                const project = projectResponse.data;
                setInitialProjectData(project); // Store initial data for comparison if needed
                setFormData({
                    name: project.name ?? '',
                    description: project.description ?? '',
                    address: project.address ?? '',
                    status: project.status ?? 'Planning',
                    start_date: formatDateForInput(project.start_date),
                    end_date: formatDateForInput(project.end_date),
                    project_manager_id: project.project_manager_id?.toString() ?? '',
                    budget: project.budget ?? '',
                });

                // Filter users to find those with the 'project manager' role within the same tenant
                const pms = usersResponse.data.filter(user =>
                    user.role === 'project manager' &&
                    (currentUser.is_superuser || user.tenant_id === project.tenant_id) // Ensure PM is in the project's tenant
                );
                setProjectManagers(pms);
                if (pms.length === 0) {
                    setDataLoadingError('No users with "Project Manager" role found in this tenant for assignment.');
                }

            } catch (err) {
                console.error("Error fetching project data or users:", err);
                const errorMsg = err.response?.status === 404 ? 'Project not found.' : 'Failed to load project data.';
                setError(errorMsg);
                // toast.error(errorMsg); // Toast might be too intrusive if just navigating
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [projectId, isAuthenticated, authIsLoading, navigate, currentUser?.is_superuser]); // Added currentUser.is_superuser dependency

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
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

        // Prepare data, ensuring nulls for empty strings/values
        const dataToSend = {
            name: formData.name,
            description: formData.description || null,
            address: formData.address || null,
            status: formData.status,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            project_manager_id: formData.project_manager_id ? Number(formData.project_manager_id) : null,
            budget: formData.budget ? parseFloat(formData.budget) : null,
        };

        try {
            const response = await axiosInstance.put(`/projects/${projectId}`, dataToSend);
            toast.success(`Project "${response.data.name}" updated successfully!`);
            setInitialProjectData(response.data); // Update initial data after save
            // Optionally refetch all data if other components might be affected indirectly
            // fetchPageData();
        } catch (err) {
            console.error("Error updating project details:", err);
            const errorMsg = err.response?.data?.detail || 'Failed to update project details.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmittingUserDetails(false);
        }
    };

    if (authIsLoading || isLoadingData) {
        return <LoadingSpinner text="Loading project details..." />;
    }

    if (error) {
        return (
            <div className="container mx-auto p-6 text-center text-red-500">
                <p>{error}</p>
                <Link to="/projects" className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back to Projects</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                Edit Project: {initialProjectData?.name || "Loading..."}
            </h1>

            {dataLoadingError && (
                <p className="text-orange-500 mb-4 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 p-3 rounded">{dataLoadingError}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Main Edit Form */}
                <div className="lg:col-span-2">
                    <fieldset disabled={!canManageProject || isSubmittingUserDetails} className="mb-8">
                        <form onSubmit={handleSubmitUserDetails} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                            <legend className="sr-only">Edit Project Details</legend>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label>
                                <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"/>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"></textarea>
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                                <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"/>
                            </div>
                            <div>
                                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget (ISK)</label>
                                <input type="number" name="budget" id="budget" value={formData.budget} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g., 5000000" step="1" min="0"/>
                            </div>
                            <div>
                                <label htmlFor="project_manager_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
                                <select name="project_manager_id" id="project_manager_id" value={formData.project_manager_id ?? ''} onChange={handleChange} disabled={projectManagers.length === 0} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option value="">-- None --</option>
                                    {projectManagers.map(pm => (
                                        <option key={pm.id} value={pm.id}>
                                            {pm.full_name || pm.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                <select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500">
                                    <option>Planning</option>
                                    <option>In Progress</option>
                                    <option>Completed</option>
                                    <option>On Hold</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                    <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"/>
                                </div>
                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                    <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"/>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <Link to="/projects" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</Link>
                                <button type="submit" disabled={isSubmittingUserDetails} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}>
                                    {isSubmittingUserDetails ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </fieldset>
                </div>

                {/* Right Column: Live Clock Ins */}
                <div className="lg:col-span-1 space-y-6">
                    {projectId && <ProjectLiveClockIns projectId={projectId} />}
                    {/* You could add other summary components here later if needed */}
                </div>

            </div> {/* End Grid */}

            {/* Sections Below the Grid */}
            {projectId && (
                <div className="mt-12 space-y-12">
                    <ProjectOffers projectId={projectId} />
                    <ProjectInventory projectId={projectId} />
                    <ProjectBoQ projectId={projectId} />
                    <ProjectDrawings projectId={projectId} />
                    <ProjectMembers projectId={projectId} />
                </div>
            )}
        </div>
    );
}

export default ProjectEditPage;