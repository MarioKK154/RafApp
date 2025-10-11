// frontend/src/pages/ProjectCreatePage.jsx
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
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectManagers, setProjectManagers] = useState([]);
    const [pmLoadingError, setPmLoadingError] = useState('');

    const canManageProjects = currentUser && ['admin', 'project manager'].includes(currentUser.role);

    const fetchProjectManagers = useCallback(() => {
        if (!authIsLoading && isAuthenticated && canManageProjects) {
            axiosInstance.get('/users/')
                .then(response => {
                    const pms = response.data.filter(user => user.role === 'project manager');
                    setProjectManagers(pms);
                    if (pms.length === 0) {
                        setPmLoadingError('No "Project Manager" role users found to assign.');
                    }
                })
                .catch(() => {
                    setPmLoadingError('Could not load project managers list.');
                    toast.error('Could not load project managers for selection.');
                });
        }
    }, [isAuthenticated, authIsLoading, canManageProjects]);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                navigate('/login', { replace: true });
            } else if (!canManageProjects) {
                toast.error("Access Denied: You do not have permission to create projects.");
                navigate('/', { replace: true });
            } else {
                fetchProjectManagers();
            }
        }
    }, [isAuthenticated, authIsLoading, canManageProjects, navigate, fetchProjectManagers]);

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
        return <LoadingSpinner text="Loading form..." />;
    }

    if (!isAuthenticated || !canManageProjects) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>Access Denied. Redirecting...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Project</h1>
            {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md" role="alert">{error}</div>}
            {pmLoadingError && <div className="mb-4 p-3 text-sm text-orange-700 bg-orange-100 rounded-md" role="alert">{pmLoadingError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">Project Name <span className="text-red-500">*</span></label>
                    <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium">Description</label>
                    <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"></textarea>
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium">Address</label>
                    <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div>
                    <label htmlFor="budget" className="block text-sm font-medium">Budget (ISK)</label>
                    <input type="number" name="budget" id="budget" value={formData.budget} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md" placeholder="e.g., 5000000" step="1" min="0"/>
                </div>
                <div>
                    <label htmlFor="project_manager_id" className="block text-sm font-medium">Project Manager</label>
                    <select name="project_manager_id" id="project_manager_id" value={formData.project_manager_id} onChange={handleChange} disabled={isSubmitting || projectManagers.length === 0} className="mt-1 block w-full rounded-md">
                        <option value="">-- Assign PM (Optional) --</option>
                        {projectManagers.map(pm => (<option key={pm.id} value={pm.id}>{pm.full_name || pm.email}</option>))}
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium">Status</label>
                    <select name="status" id="status" required value={formData.status} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md">
                        <option>Planning</option><option>In Progress</option><option>Completed</option><option>On Hold</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="start_date" className="block text-sm font-medium">Start Date</label>
                    <input type="date" name="start_date" id="start_date" value={formData.start_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div>
                    <label htmlFor="end_date" className="block text-sm font-medium">End Date</label>
                    <input type="date" name="end_date" id="end_date" value={formData.end_date || ''} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Link to="/projects" className="px-4 py-2 border rounded-md shadow-sm">Cancel</Link>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 border rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        {isSubmitting ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
}
export default ProjectCreatePage;