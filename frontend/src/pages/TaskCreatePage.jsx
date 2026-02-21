import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { isPast, isToday, parseISO } from 'date-fns';
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

    // Data Repositories
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);

    // Logic: Form State
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

    const isSuperuser = currentUser?.is_superuser;
    const canManageTasks = currentUser && (['admin', 'project manager', 'team leader'].includes(currentUser.role) || isSuperuser);

    /**
     * PROTOCOL: Workflow Synchronization
     * 1. Fetches projects and staff.
     * 2. Promotes 'Planning' -> 'Active' based on today's date.
     * 3. Filters dropdown to show only valid operational sites.
     */
    const fetchPrerequisites = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && canManageTasks) {
            setIsLoadingPrerequisites(true);
            try {
                const [projectsRes, usersRes] = await Promise.all([
                    axiosInstance.get('/projects/', { params: { limit: 1000 } }),
                    axiosInstance.get('/users/', { params: { limit: 1000 } })
                ]);

                // Phase 1: Real-time Status Evaluation
                const validProjects = projectsRes.data.map(p => {
                    const startDate = p.start_date ? parseISO(p.start_date) : null;
                    const isStarted = startDate && (isPast(startDate) || isToday(startDate));
                    
                    let displayStatus = p.status;
                    // Logic: Promote Planning to Active if date reached
                    if (['Planning', 'Active'].includes(p.status)) {
                        displayStatus = isStarted ? 'Active' : 'Planning';
                    }
                    return { ...p, displayStatus };
                }).filter(p => ['Active', 'Planning'].includes(p.displayStatus));

                setProjects(validProjects);
                setUsers(usersRes.data.filter(u => ASSIGNABLE_ROLES.includes(u.role) || u.is_superuser));

                // Phase 2: Context Pre-selection Logic
                const queryParams = new URLSearchParams(search);
                const urlProjectId = queryParams.get('project_id');

                if (urlProjectId) {
                    // Lock to project passed via URL
                    setFormData(prev => ({ ...prev, project_id: urlProjectId }));
                } else if (validProjects.length > 0) {
                    // Fallback to first available valid project
                    setFormData(prev => ({ ...prev, project_id: validProjects[0].id.toString() }));
                }

            } catch (err) {
                console.error("Registry Sync Error:", err);
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
            toast.error("A project assignment is required.");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            ...formData,
            project_id: parseInt(formData.project_id, 10),
            assignee_id: formData.assignee_id ? parseInt(formData.assignee_id, 10) : null,
        };

        try {
            await axiosInstance.post('/tasks/', payload);
            toast.success(`Work node initialized: ${formData.title}`);
            navigate(-1); // Returns user to their previous context
        } catch (err) {
            toast.error(err.response?.data?.detail || "Task initialization failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading || isLoadingPrerequisites) return <LoadingSpinner text="Synchronizing requirements..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl animate-in fade-in duration-500">
            <header className="mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-4 w-4 mr-1 stroke-[3px]" /> Cancel Operation
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
                        <ClipboardDocumentCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Initialize Work Node</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Identity Module */}
                <div className="space-y-6 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Identity</h2>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Work Title*</label>
                        <input 
                            type="text" 
                            name="title" 
                            required 
                            value={formData.title} 
                            onChange={handleChange} 
                            placeholder="e.g., Lighting Installation" 
                            className="modern-input h-14 font-bold" 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Site Assignment*</label>
                        <div className="relative">
                            <BriefcaseIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select 
                                name="project_id" 
                                required 
                                value={formData.project_id} 
                                onChange={handleChange} 
                                className="modern-input pl-12 h-14 font-black uppercase text-[11px]"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} [{p.displayStatus}]
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">Technical Scope</label>
                        <textarea 
                            name="description" 
                            rows="5" 
                            value={formData.description} 
                            onChange={handleChange} 
                            className="modern-input p-4 text-sm" 
                            placeholder="Detail work requirements..."
                        ></textarea>
                    </div>
                </div>

                {/* Execution Module */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Execution</h2>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Personnel</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <select 
                                    name="assignee_id" 
                                    value={formData.assignee_id} 
                                    onChange={handleChange} 
                                    className="modern-input pl-12 h-14"
                                >
                                    <option value="">Unassigned (Open Pool)</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Priority</label>
                                <select 
                                    name="priority" 
                                    value={formData.priority} 
                                    onChange={handleChange} 
                                    className="modern-input h-14 font-black uppercase text-[10px]"
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Status</label>
                                <select 
                                    name="status" 
                                    value={formData.status} 
                                    onChange={handleChange} 
                                    className="modern-input h-14 font-black uppercase text-[10px]"
                                >
                                    <option>To Do</option>
                                    <option>In Progress</option>
                                    <option>Done</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Start Date</label>
                                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="modern-input h-14 font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Target Date</label>
                                <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="modern-input h-14 font-bold" />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-indigo-100 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Initializing Node...' : 'Commit Work to Site'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default TaskCreatePage;