// frontend/src/pages/TasksListPage.jsx
// Card layout + Search Bar + Quick Action Buttons

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, MagnifyingGlassIcon, PlayIcon, CheckCircleIcon } from '@heroicons/react/24/solid'; // Added PlayIcon, CheckCircleIcon
import Select from 'react-select';

// Debounce hook (should be defined or imported)
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// useQuery hook (should be defined or imported)
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

// Constants for react-select options (remain the same)
const TASK_STATUS_OPTIONS = [ /* ... */ ];
const SORT_BY_OPTIONS = [ /* ... */ ];
const SORT_DIR_OPTIONS = [ /* ... */ ];
// Add constants back
const TASK_STATUS_OPTIONS_FULL = [
    { value: '', label: 'All Statuses' },
    { value: 'To Do', label: 'To Do' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
    { value: 'Commissioned', label: 'Commissioned' },
    { value: 'Blocked', label: 'Blocked' },
    { value: 'Cancelled', label: 'Cancelled' },
];
const SORT_BY_OPTIONS_FULL = [
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'id', label: 'Creation Date (Default)' },
];
const SORT_DIR_OPTIONS_FULL = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
];

function TasksListPage() {
    // ... (All existing state variables: tasks, isLoading, error, user, filters, etc.)
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const query = useQuery();
    const [projectOptions, setProjectOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(TASK_STATUS_OPTIONS_FULL[0]);
    const [sortBy, setSortBy] = useState(SORT_BY_OPTIONS_FULL[4]); // Default sort
    const [sortDir, setSortDir] = useState(SORT_DIR_OPTIONS_FULL[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const canCreateTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);
    // Determine who can update status (adjust roles as needed)
    const canUpdateStatus = user && ['admin', 'project manager', 'team leader', 'electrician'].includes(user.role);


    // ... (fetchFilters and fetchTasks useCallback hooks remain the same) ...
     const fetchFilters = useCallback(async () => { // fetchFilters remains the same
        try {
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects/'),
                axiosInstance.get('/users/')
            ]);
            const projOpts = [{ value: '', label: 'All Projects' }, ...projRes.data.map(p => ({ value: p.id, label: p.name }))];
            setProjectOptions(projOpts);
            const userOpts = [{ value: '', label: 'All Users' }, ...userRes.data.map(u => ({ value: u.id, label: u.full_name || u.email }))];
            setUserOptions(userOpts);

            const queryProjectId = query.get('project_id');
            if (queryProjectId) {
                const initialProject = projOpts.find(p => p.value === parseInt(queryProjectId));
                if (initialProject) setSelectedProject(initialProject);
            }
        } catch (err) { toast.error("Failed to load filter options."); }
    }, [query]);

    const fetchTasks = useCallback(() => { // fetchTasks remains the same
        setIsLoading(true);
        setError('');
        axiosInstance.get('/tasks/', {
            params: { /* ... params ... */
                project_id: selectedProject?.value || undefined,
                assignee_id: selectedAssignee?.value || undefined,
                status: selectedStatus?.value || undefined,
                search: debouncedSearchTerm || undefined,
                sort_by: sortBy?.value || 'id',
                sort_dir: sortDir?.value || 'asc',
                limit: 200
             }
        })
        .then(response => setTasks(response.data))
        .catch(err => { setError('Failed to fetch tasks.'); console.error(err); })
        .finally(() => setIsLoading(false));
    }, [selectedProject, selectedAssignee, selectedStatus, debouncedSearchTerm, sortBy, sortDir]);


    useEffect(() => { fetchFilters(); }, [fetchFilters]);
    useEffect(() => {
        if (projectOptions.length > 0 && userOptions.length > 0) { fetchTasks(); }
        else if (!isLoading) { fetchTasks(); } // Fetch even if filters fail
    }, [fetchTasks, projectOptions, userOptions]); // Removed isLoading dependency here


    // --- NEW: Handler for Quick Status Updates ---
    const handleUpdateStatus = async (taskId, newStatus, taskTitle) => {
        try {
            await axiosInstance.put(`/tasks/${taskId}`, { status: newStatus });
            toast.success(`Task "${taskTitle}" updated to "${newStatus}"`);
            // Optimistic update (optional but makes UI faster)
            setTasks(prevTasks => prevTasks.map(task =>
                task.id === taskId ? { ...task, status: newStatus } : task
            ));
            // Or just refetch: fetchTasks();
        } catch (err) {
            toast.error(`Failed to update status for "${taskTitle}"`);
        }
    };
    // --- END NEW ---

    // ... (getStatusColor and getPriorityColor helper functions remain the same) ...
     const getStatusColor = (status) => { /* ... */ };
     const getPriorityColor = (priority) => { /* ... */ };


    if (isLoading && tasks.length === 0) { /* ... loading spinner ... */ }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header (remains the same) */}
            {/* Controls: Search, Filters, Sort (remains the same) */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
                {canCreateTasks && (
                    <button onClick={() => navigate('/tasks/new')} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Create Task
                    </button>
                )}
            </div>
             <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                <div className="relative flex-grow md:max-w-xs">
                     <input type="text" placeholder="Search by title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"/>
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
                 <div className="flex flex-wrap items-center gap-4">
                     <Select options={projectOptions} value={selectedProject} onChange={setSelectedProject} placeholder="Filter Project..." isClearable className="min-w-[150px] react-select-container z-20" classNamePrefix="react-select"/>
                     <Select options={userOptions} value={selectedAssignee} onChange={setSelectedAssignee} placeholder="Filter Assignee..." isClearable className="min-w-[150px] react-select-container z-20" classNamePrefix="react-select"/>
                     <Select options={TASK_STATUS_OPTIONS_FULL} value={selectedStatus} onChange={setSelectedStatus} className="min-w-[150px] react-select-container z-20" classNamePrefix="react-select"/>
                     <div className="flex items-center gap-2">
                         <label className="font-medium text-gray-700 dark:text-gray-300">Sort:</label>
                         <Select options={SORT_BY_OPTIONS_FULL} value={sortBy} onChange={setSortBy} className="min-w-[120px] react-select-container z-10" classNamePrefix="react-select"/>
                         <Select options={SORT_DIR_OPTIONS_FULL} value={sortDir} onChange={setSortDir} className="min-w-[100px] react-select-container z-10" classNamePrefix="react-select"/>
                     </div>
                </div>
            </div>

            {/* Task Cards List */}
            {isLoading && tasks.length > 0 && <LoadingSpinner text="Refreshing tasks..." />}
            {error && <div className="text-center py-10 text-red-500">{error}</div>}
            {!isLoading && !error && tasks.length > 0 ? (
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5">
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                     <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                         <Link to={`/tasks/${task.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{task.title}</Link>
                                     </h2>
                                     <div className="flex items-center gap-2 flex-shrink-0">
                                         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>{task.status}</span>
                                         <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority} Priority</span>
                                     </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Project: <Link to={`/projects/edit/${task.project_id}`} className="hover:underline">{task.project?.name || 'N/A'}</Link>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Assigned to: {task.assignee?.full_name || 'Unassigned'}
                                </p>
                                <div className="flex flex-wrap justify-between items-center mt-4 text-xs text-gray-500 dark:text-gray-400 gap-2">
                                     <div className="flex gap-4"> {/* Group dates */}
                                         <span>Start: {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</span>
                                         <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                                     </div>

                                     {/* --- NEW Quick Action Buttons --- */}
                                     <div className="flex items-center space-x-2">
                                        {canUpdateStatus && task.status === 'To Do' && (
                                            <button
                                                onClick={() => handleUpdateStatus(task.id, 'In Progress', task.title)}
                                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center"
                                                title="Start Progress"
                                            >
                                                <PlayIcon className="h-3 w-3 mr-1"/> Start
                                            </button>
                                        )}
                                        {canUpdateStatus && task.status === 'In Progress' && (
                                            <button
                                                onClick={() => handleUpdateStatus(task.id, 'Done', task.title)}
                                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center"
                                                title="Mark as Done"
                                            >
                                                 <CheckCircleIcon className="h-3 w-3 mr-1"/> Done
                                            </button>
                                        )}
                                         <button onClick={() => navigate(`/tasks/${task.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center text-xs">
                                             <PencilIcon className="h-3 w-3 mr-1"/> Details
                                         </button>
                                     </div>
                                     {/* --- END Quick Action Buttons --- */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 !isLoading && !error && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Tasks Found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No tasks match your search for "${searchTerm}".` : 'No tasks match the current filters.'}
                      </p>
                 </div>
            )}
        </div>
    );
}

export default TasksListPage;