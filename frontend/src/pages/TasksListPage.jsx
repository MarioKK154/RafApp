import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select';
import { 
    PlusIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    PlayIcon, 
    CheckCircleIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    UserIcon,
    BriefcaseIcon,
    AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

/**
 * Custom Hook: Debounce search inputs to reduce API load.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

/**
 * Custom Hook: Handle URL search params easily.
 */
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

// Filter Constants
const TASK_STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'To Do', label: 'To Do' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
    { value: 'Commissioned', label: 'Commissioned' },
    { value: 'Blocked', label: 'Blocked' },
];

const SORT_BY_OPTIONS = [
    { value: 'id', label: 'Recent' },
    { value: 'title', label: 'Title' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Deadline' },
];

const SORT_DIR_OPTIONS = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
];

function TasksListPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const query = useQuery();

    // Data State
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter State
    const [projectOptions, setProjectOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(TASK_STATUS_OPTIONS[0]);
    const [sortBy, setSortBy] = useState(SORT_BY_OPTIONS[0]);
    const [sortDir, setSortDir] = useState(SORT_DIR_OPTIONS[1]); // Newest first by default
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Permissions: God Mode integrated
    const isSuperuser = user?.is_superuser;
    const canCreateTasks = user && (['admin', 'project manager', 'team leader'].includes(user.role) || isSuperuser);
    const canUpdateStatus = user && (['admin', 'project manager', 'team leader', 'electrician'].includes(user.role) || isSuperuser);

    const fetchFilters = useCallback(async () => {
        try {
            // Fetch projects and staff lists for the filter dropdowns
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects/', { params: { limit: 500 } }),
                axiosInstance.get('/users/', { params: { limit: 500 } })
            ]);

            const projOpts = [{ value: '', label: 'All Projects' }, ...projRes.data.map(p => ({ value: p.id, label: p.name }))];
            setProjectOptions(projOpts);

            const staffOpts = [{ value: '', label: 'All Staff' }, ...userRes.data.map(u => ({ value: u.id, label: u.full_name || u.email }))];
            setUserOptions(staffOpts);

            // Handle pre-filtered project ID from URL (e.g., coming from ProjectDetails)
            const queryProjectId = query.get('project_id');
            if (queryProjectId) {
                const initialProject = projOpts.find(p => p.value === parseInt(queryProjectId));
                if (initialProject) setSelectedProject(initialProject);
            }
        } catch (err) {
            console.error("Filter loading failed", err);
        }
    }, [query]);

    const fetchTasks = useCallback(() => {
        setIsLoading(true);
        setError('');
        axiosInstance.get('/tasks/', {
            params: {
                project_id: selectedProject?.value || undefined,
                assignee_id: selectedAssignee?.value || undefined,
                status: selectedStatus?.value || undefined,
                search: debouncedSearchTerm || undefined,
                sort_by: sortBy?.value || 'id',
                sort_dir: sortDir?.value || 'desc',
                limit: 500
            }
        })
        .then(response => setTasks(response.data))
        .catch(() => setError('Failed to retrieve task registry.'))
        .finally(() => setIsLoading(false));
    }, [selectedProject, selectedAssignee, selectedStatus, debouncedSearchTerm, sortBy, sortDir]);

    useEffect(() => { fetchFilters(); }, [fetchFilters]);
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleUpdateStatus = async (taskId, newStatus, taskTitle) => {
        try {
            await axiosInstance.put(`/tasks/${taskId}`, { status: newStatus });
            toast.success(`Task "${taskTitle}" is now ${newStatus}`);
            // Update local state for immediate feedback
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        } catch (err) {
            toast.error("Status update failed.");
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Done': return 'bg-green-100 text-green-700 dark:bg-green-900/30';
            case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30';
            case 'Blocked': return 'bg-red-100 text-red-700 dark:bg-red-900/30';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800';
        }
    };

    const getPriorityStyle = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'text-red-600 dark:text-red-400 font-black';
            case 'medium': return 'text-orange-600 dark:text-orange-400 font-bold';
            default: return 'text-gray-500 font-medium';
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Task Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isSuperuser ? "Global work registry" : `Site tasks for ${user?.tenant?.name}`}
                    </p>
                </div>
                {canCreateTasks && (
                    <button 
                        onClick={() => navigate('/tasks/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" /> New Task
                    </button>
                )}
            </div>

            {/* Global Controls */}
            <div className="mb-8 grid grid-cols-1 xl:grid-cols-12 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                {/* Search */}
                <div className="xl:col-span-3 relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                    />
                </div>

                {/* Dropdown Filters */}
                <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Select 
                        options={projectOptions} value={selectedProject} onChange={setSelectedProject} 
                        placeholder="Project..." isClearable className="react-select-container" classNamePrefix="react-select" 
                    />
                    <Select 
                        options={userOptions} value={selectedAssignee} onChange={setSelectedAssignee} 
                        placeholder="Assignee..." isClearable className="react-select-container" classNamePrefix="react-select" 
                    />
                    <Select 
                        options={TASK_STATUS_OPTIONS} value={selectedStatus} onChange={setSelectedStatus} 
                        className="react-select-container" classNamePrefix="react-select" 
                    />
                    <div className="flex gap-2">
                        <Select 
                            options={SORT_BY_OPTIONS} value={sortBy} onChange={setSortBy} 
                            className="flex-1 react-select-container" classNamePrefix="react-select" 
                        />
                        <Select 
                            options={SORT_DIR_OPTIONS} value={sortDir} onChange={setSortDir} 
                            className="w-24 react-select-container" classNamePrefix="react-select" 
                        />
                    </div>
                </div>
            </div>

            {isLoading && tasks.length === 0 ? (
                <LoadingSpinner text="Synchronizing workflow..." />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tasks.length > 0 ? tasks.map(task => (
                        <div key={task.id} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                            <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                
                                {/* Info Block */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">
                                            <Link to={`/tasks/${task.id}`} className="hover:text-indigo-600 transition-colors">
                                                {task.title}
                                            </Link>
                                        </h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(task.status)}`}>
                                            {task.status}
                                        </span>
                                        <span className={`text-[10px] uppercase tracking-widest ${getPriorityStyle(task.priority)}`}>
                                            {task.priority} Priority
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <BriefcaseIcon className="h-4 w-4 text-indigo-400" />
                                            <span className="font-bold text-gray-700 dark:text-gray-300">Project:</span>
                                            <span className="truncate">{task.project?.name || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <UserIcon className="h-4 w-4 text-indigo-400" />
                                            <span className="font-bold text-gray-700 dark:text-gray-300">Lead:</span>
                                            <span>{task.assignee?.full_name || 'TBD'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <CalendarIcon className="h-4 w-4 text-indigo-400" />
                                            <span className="font-bold text-gray-700 dark:text-gray-300">Due:</span>
                                            <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}</span>
                                        </div>
                                        {isSuperuser && task.tenant && (
                                            <div className="flex items-center gap-2 text-[10px] text-orange-600 font-black uppercase tracking-tighter">
                                                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                                {task.tenant.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-50 dark:border-gray-700">
                                    {canUpdateStatus && task.status === 'To Do' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(task.id, 'In Progress', task.title)}
                                            className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-100 transition"
                                        >
                                            <PlayIcon className="h-3.5 w-3.5 mr-1.5" /> Start Work
                                        </button>
                                    )}
                                    {canUpdateStatus && task.status === 'In Progress' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(task.id, 'Done', task.title)}
                                            className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-xl hover:bg-green-100 transition"
                                        >
                                            <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" /> Complete
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-100 transition"
                                    >
                                        <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 mr-1.5" /> Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                            <BriefcaseIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No active tasks found</h3>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your project or assignee filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TasksListPage;