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
        status: 'Planning',
        start_date: '',
        end_date: '',
        project_manager_id: '',
        budget: '',
        tenant_id: '', // Added for Superuser selection
    });

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectManagers, setProjectManagers] = useState([]);
    const [tenants, setTenants] = useState([]); // List of tenants for superusers
    const [pmLoadingError, setPmLoadingError] = useState('');

    const isSuperuser = currentUser?.is_superuser;
    const canManageProjects = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);

    // Fetch the list of users to assign as PM
    const fetchProjectManagers = useCallback(() => {
        if (!authIsLoading && isAuthenticated && canManageProjects) {
            // If superuser is creating for a specific tenant, we ideally want users from that tenant.
            // For now, we fetch users based on the current context.
            axiosInstance.get('/users/')
                .then(response => {
                    const pms = response.data.filter(user => 
                        user.role === 'project manager' || user.role === 'admin'
                    );
                    setProjectManagers(pms);
                    if (pms.length === 0) {
                        setPmLoadingError('No eligible users found to assign as Project Manager.');
                    }
                })
                .catch(() => {
                    setPmLoadingError('Could not load staff list.');
                    toast.error('Could not load project managers.');
                });
        }
    }, [isAuthenticated, authIsLoading, canManageProjects]);

    // Fetch tenants only if the user is a Superuser
    const fetchTenants = useCallback(() => {
        if (isSuperuser) {
            axiosInstance.get('/tenants/')
                .then(response => {
                    setTenants(response.data);
                })
                .catch(() => {
                    toast.error('Could not load tenants list.');
                });
        }
    }, [isSuperuser]);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                navigate('/login', { replace: true });
            } else if (!canManageProjects) {
                toast.error("Access Denied: Insufficient permissions.");
                navigate('/', { replace: true });
            } else {
                fetchProjectManagers();
                fetchTenants();
            }
        }
    }, [isAuthenticated, authIsLoading, canManageProjects, navigate, fetchProjectManagers, fetchTenants]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageProjects) {
            toast.error("You do not have permission to perform this action.");
            return;
        }
        setError('');
        setIsSubmitting(true);

        const dataToSend = {
            name: formData.name,
            description: formData.description || null,
            address: formData.address || null,
            status: formData.status,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            project_manager_id: formData.project_manager_id ? parseInt(formData.project_manager_id, 10) : null,
            budget: formData.budget ? parseFloat(formData.budget) : null,
        };

        // If superuser picked a tenant, include it in the payload
        if (isSuperuser && formData.tenant_id) {
            dataToSend.tenant_id = parseInt(formData.tenant_id, 10);
        }

        try {
            const response = await axiosInstance.post('/projects/', dataToSend);
            toast.success(`Project "${response.data.name}" created successfully!`);
            navigate('/projects');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to create project.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) {
        return <LoadingSpinner text="Loading project creator..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Project</h1>
                
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-200" role="alert">
                        {error}
                    </div>
                )}
                
                {pmLoadingError && (
                    <div className="mb-4 p-3 text-sm text-orange-700 bg-orange-100 rounded-md border border-orange-200" role="alert">
                        {pmLoadingError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
                    
                    {/* Superuser Tenant Selection */}
                    {isSuperuser && (
                        <div>
                            <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign to Tenant <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="tenant_id"
                                id="tenant_id"
                                required={isSuperuser}
                                value={formData.tenant_id}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Select Company/Tenant --</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Only Superadmins see this option.</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Project Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            required 
                            value={formData.name} 
                            onChange={handleChange} 
                            disabled={isSubmitting} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="e.g. Data Center Expansion"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <textarea 
                            name="description" 
                            id="description" 
                            rows="3" 
                            value={formData.description} 
                            onChange={handleChange} 
                            disabled={isSubmitting} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Brief project overview..."
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Address</label>
                        <input 
                            type="text" 
                            name="address" 
                            id="address" 
                            value={formData.address} 
                            onChange={handleChange} 
                            disabled={isSubmitting} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget (ISK)</label>
                            <input 
                                type="number" 
                                name="budget" 
                                id="budget" 
                                value={formData.budget} 
                                onChange={handleChange} 
                                disabled={isSubmitting} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder="0" 
                                step="1" 
                                min="0"
                            />
                        </div>

                        <div>
                            <label htmlFor="project_manager_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
                            <select 
                                name="project_manager_id" 
                                id="project_manager_id" 
                                value={formData.project_manager_id} 
                                onChange={handleChange} 
                                disabled={isSubmitting || projectManagers.length === 0} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Assign PM (Optional) --</option>
                                {projectManagers.map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.full_name || pm.email}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Status</label>
                        <select 
                            name="status" 
                            id="status" 
                            required 
                            value={formData.status} 
                            onChange={handleChange} 
                            disabled={isSubmitting} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option>Planning</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>On Hold</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                            <input 
                                type="date" 
                                name="start_date" 
                                id="start_date" 
                                value={formData.start_date || ''} 
                                onChange={handleChange} 
                                disabled={isSubmitting} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>

                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                            <input 
                                type="date" 
                                name="end_date" 
                                id="end_date" 
                                value={formData.end_date || ''} 
                                onChange={handleChange} 
                                disabled={isSubmitting} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-700">
                        <Link to="/projects" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                            Cancel
                        </Link>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? 'Creating Project...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProjectCreatePage;