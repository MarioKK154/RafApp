import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ClipboardDocumentCheckIcon, 
    ChevronLeftIcon,
    BriefcaseIcon,
    UserIcon,
    FlagIcon,
    CalendarDaysIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician'];

function TaskCreatePage() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Data for dropdowns
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        start_date: '',
        due_date: '',
        project_id: '',
        assignee_id: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingPrerequisites, setIsLoadingPrerequisites] = useState(true);
    const [error, setError] = useState('');

    const isSuperuser = currentUser?.is_superuser;
    const canManageTasks = currentUser && (['admin', 'project manager', 'team leader'].includes(currentUser.role) || isSuperuser);

    /**
     * Fetches projects and staff members to populate the form.
     * Respects multi-tenancy: regular admins see their own, superusers see all.
     */
    const fetchPrerequisites = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && canManageTasks) {
            setIsLoadingPrerequisites(true);
            try {
                const [projectsRes, usersRes] = await Promise.all([
                    axiosInstance.get('/projects/', { params: { limit: 1000 } }),
                    axiosInstance.get('/users/', { params: { limit: 1000 } })
                ]);

                setProjects(projectsRes.data);
                setUsers(usersRes.data.filter(u => ASSIGNABLE_ROLES.includes(u.role) || u.is_superuser));

                // Check for project_id in URL (e.g., ?project_id=5)
                const queryParams = new URLSearchParams(search);
                const preselectedProjectId = queryParams.get('project_id');

                if (preselectedProjectId) {
                    setFormData(prev => ({ ...prev, project_id: preselectedProjectId }));
                } else if (projectsRes.data.length > 0) {
                    // Fallback to first project if none pre-selected
                    setFormData(prev => ({ ...prev, project_id: projectsRes.data[0].id.toString() }));
                }

            } catch (err) {
                console.error("Prerequisite load error:", err);
                toast.error("Failed to load project or staff registries.");
            } finally {
                setIsLoadingPrerequisites(false);
            }
        }
    }, [isAuthenticated, authIsLoading, canManageTasks, search]);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.project_id) {
            toast.error("A project must be assigned to this task.");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            ...formData,
            description: formData.description || null,
            start_date: formData.start_date || null,
            due_date: formData.due_date || null,
            project_id: parseInt(formData.project_id, 10),
            assignee_id: formData.assignee_id ? parseInt(formData.assignee_id, 10) : null,
        };

        try {
            const response = await axiosInstance.post('/tasks/', payload);
            toast.success(`Task "${response.data.title}" created.`);
            navigate('/tasks');
        } catch (err) {
            toast.error(err.response?.data?.detail || "Task creation failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading || isLoadingPrerequisites) {
        return <LoadingSpinner text="Synchronizing workflow prerequisites..." />;
    }

    if (!canManageTasks) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
                <p className="text-gray-500">You do not have permission to initialize new work tasks.</p>
                <Link to="/" className="mt-4 text-indigo-600 hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <Link to="/tasks" className="flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition mb-2">
                    <ChevronLeftIcon className="h-4 w-4 mr-1" /> Back to Registry
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Create New Task</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Info (Left) */}
                <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b pb-2">Work Identity</h2>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Task Title*</label>
                        <input 
                            type="text" 
                            name="title" 
                            required 
                            value={formData.title} 
                            onChange={handleChange} 
                            placeholder="e.g., Installation of MCB Board"
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Project Assignment*</label>
                        <div className="relative">
                            <BriefcaseIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <select 
                                name="project_id" 
                                required 
                                value={formData.project_id} 
                                onChange={handleChange}
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                            >
                                <option value="" disabled>-- Select Site --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {isSuperuser ? `(ID: ${p.tenant_id})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase flex items-center gap-1">
                            <DocumentTextIcon className="h-3 w-3" /> Technical Description
                        </label>
                        <textarea 
                            name="description" 
                            rows="5" 
                            value={formData.description} 
                            onChange={handleChange}
                            placeholder="Provide scope of work and specific technical requirements..."
                            className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                        ></textarea>
                    </div>
                </div>

                {/* Configuration (Right) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest border-b pb-2">Scheduling & Logistics</h2>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Lead Technician</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <select 
                                    name="assignee_id" 
                                    value={formData.assignee_id} 
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                >
                                    <option value="">Unassigned (Open Pool)</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name || u.email} ({u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Priority Level</label>
                                <div className="relative">
                                    <FlagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <select 
                                        name="priority" 
                                        value={formData.priority} 
                                        onChange={handleChange}
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                    >
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Status</label>
                                <select 
                                    name="status" 
                                    value={formData.status} 
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                >
                                    <option>To Do</option>
                                    <option>In Progress</option>
                                    <option>Done</option>
                                    <option>Blocked</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase flex items-center gap-1">
                                    <CalendarDaysIcon className="h-3 w-3" /> Start Date
                                </label>
                                <input 
                                    type="date" 
                                    name="start_date" 
                                    value={formData.start_date} 
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase flex items-center gap-1">
                                    <CalendarDaysIcon className="h-3 w-3" /> Due Date
                                </label>
                                <input 
                                    type="date" 
                                    name="due_date" 
                                    value={formData.due_date} 
                                    onChange={handleChange}
                                    className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-1 inline-flex justify-center items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Initializing...' : 'Commit Task to Site'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default TaskCreatePage;