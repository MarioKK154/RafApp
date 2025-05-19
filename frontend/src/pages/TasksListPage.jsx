// frontend/src/pages/TasksListPage.jsx
// Uncondensed Version: Ensured Task Card JSX is complete and styled
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const TASK_SORTABLE_FIELDS = [
    { label: 'ID', value: 'id'},
    { label: 'Title', value: 'title'},
    { label: 'Status', value: 'status'},
    { label: 'Priority', value: 'priority'},
    { label: 'Start Date', value: 'start_date'},
    { label: 'Due Date', value: 'due_date'},
    { label: 'Date Created', value: 'created_at'}
];
const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];
const BASE_TASK_STATUSES = ["All", "To Do", "In Progress", "Done", "Blocked"];
const COMMISSIONED_STATUS = "Commissioned";

function TasksListPage() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate(); // Keep for potential future use

    const [projectIdFilter, setProjectIdFilter] = useState('');
    const [assigneeIdFilter, setAssigneeIdFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [availableProjects, setAvailableProjects] = useState([]);
    const [availableAssignees, setAvailableAssignees] = useState([]);
    const [filterDataLoading, setFilterDataLoading] = useState(true);
    const [filterDataError, setFilterDataError] = useState('');

    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);
    const isPmOrAdmin = user && ['admin', 'project manager'].includes(user.role);

    const availableStatusFilters = isPmOrAdmin ? [...BASE_TASK_STATUSES, COMMISSIONED_STATUS] : BASE_TASK_STATUSES;

    const fetchFilterData = useCallback(() => {
        if (authIsLoading || !isAuthenticated) { setFilterDataLoading(false); return; }
        setFilterDataLoading(true); setFilterDataError('');
        Promise.all([ axiosInstance.get('/projects/'), axiosInstance.get('/users/') ])
        .then(([projectsResponse, usersResponse]) => {
            setAvailableProjects(projectsResponse.data);
            setAvailableAssignees(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));
        }).catch(err => { console.error("Error fetching filter data:", err); setFilterDataError('Could not load filter options.'); toast.error('Could not load filter options.');
        }).finally(() => { setFilterDataLoading(false); });
    }, [isAuthenticated, authIsLoading]);

    const fetchTasks = useCallback(() => {
        if (authIsLoading || !isAuthenticated) { setIsLoading(false); setError(isAuthenticated ? '' : 'You must be logged in.'); return; }
        if(filterDataError && !filterDataLoading){ setIsLoading(false); return; }
        setIsLoading(true); setError('');
        const params = { sort_by: sortBy, sort_dir: sortDir };
        if (projectIdFilter) { params.project_id = projectIdFilter; }
        if (assigneeIdFilter) { params.assignee_id = assigneeIdFilter; }
        if (statusFilter && statusFilter !== 'All') { params.status = statusFilter; }
        axiosInstance.get('/tasks/', { params })
            .then(response => { setTasks(response.data); })
            .catch(err => { console.error("Error fetching tasks:", err); setError('Failed to load tasks.'); toast.error('Failed to load tasks.'); })
            .finally(() => { setIsLoading(false); });
    }, [isAuthenticated, authIsLoading, projectIdFilter, assigneeIdFilter, statusFilter, sortBy, sortDir, filterDataError, filterDataLoading]);

    useEffect(() => { fetchFilterData(); }, [fetchFilterData]);
    useEffect(() => {
        if (!filterDataLoading && !authIsLoading && isAuthenticated) { fetchTasks(); }
        else if (!authIsLoading && !isAuthenticated) { setIsLoading(false); setError(''); }
    }, [fetchTasks, filterDataLoading, isAuthenticated, authIsLoading]);

    const handleDeleteClick = (task) => {
        if (!canManageTasks) { toast.error("You don't have permission to delete tasks."); return; }
        setTaskToDelete(task);
        setIsDeleteModalOpen(true);
    };
    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        try {
            await axiosInstance.delete(`/tasks/${taskToDelete.id}`);
            toast.success(`Task "${taskToDelete.title}" deleted successfully!`);
            fetchTasks();
        } catch (err) {
            console.error("Error deleting task:", err);
            toast.error(err.response?.data?.detail || 'Failed to delete task.');
        } finally {
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
        }
    };

    // --- Render Logic ---
    if (authIsLoading || filterDataLoading) { // Main page/filter data loading
    return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading page data..." size="lg" /></div> );
}
    if (!isAuthenticated) {
        return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">Please log in to view tasks.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"> Go to Login </Link></div> );
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
                {isAuthenticated && canManageTasks && (
                    <Link to="/tasks/new" className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 text-sm md:text-base">
                        Create New Task
                    </Link>
                )}
            </div>

            {/* Filters and Sorting Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                {/* Project Filter */}
                <div className="flex-grow"> <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Project</label> <select id="projectFilter" name="projectFilter" value={projectIdFilter} onChange={(e) => setProjectIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="">All Projects</option> {availableProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))} </select> </div>
                {/* Assignee Filter */}
                <div className="flex-grow"> <label htmlFor="assigneeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Assignee</label> <select id="assigneeFilter" name="assigneeFilter" value={assigneeIdFilter} onChange={(e) => setAssigneeIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="">All Assignees</option> {availableAssignees.map(assignee => ( <option key={assignee.id} value={assignee.id}> {assignee.full_name || assignee.email} </option> ))} </select> </div>
                {/* Status Filter */}
                <div className="flex-grow"> <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label> <select id="statusFilter" name="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> {availableStatusFilters.map(status => ( <option key={status} value={status === 'All' ? '' : status}> {status} </option> ))} </select> </div>
                {/* Sort By */}
                <div className="flex-grow"> <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label> <select id="sortBy" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> {TASK_SORTABLE_FIELDS.map(field => ( <option key={field.value} value={field.value}> {field.label} </option> ))} </select> </div>
                {/* Sort Direction */}
                <div className="flex-shrink-0"> <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label> <select id="sortDir" name="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="asc">Asc</option> <option value="desc">Desc</option> </select> </div>
            </div>

            {/* Error Display Area */}
            {filterDataError && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{filterDataError}</p>}
            {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

            {/* Task List Display or Loading/No Tasks Message */}
            {isLoading ? (
                 <LoadingSpinner text="Loading tasks..." />
            ) : tasks.length === 0 ? (
                 <p className="text-gray-600 dark:text-gray-400">No tasks found matching the current criteria. {canManageTasks ? 'Create one!' : ''}</p>
             ) : (
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="p-4 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-start">
                               <div className="flex-grow">
                                   <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-1 hover:underline">
                                       <Link to={`/tasks/edit/${task.id}`}>{task.title}</Link>
                                   </h2>
                                   <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2" title={task.description}>
                                       {task.description || 'No description provided.'}
                                   </p>
                                   <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                       <p><strong>Project ID:</strong> {task.project_id}
                                       {task.assignee_id && (<> | <strong>Assignee ID:</strong> {task.assignee_id}</>)}
                                       </p>
                                       <p>
                                           <strong>Status:</strong> <span className={`font-medium ${task.status === 'Done' ? 'text-green-600 dark:text-green-400' : task.status === 'Commissioned' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{task.status}</span>
                                           {task.is_commissioned && <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-200 dark:text-blue-200 dark:bg-blue-700 rounded-full">Comm.</span>}
                                            | <strong>Priority:</strong> {task.priority}
                                       </p>
                                       <div className="flex space-x-2">
                                           {task.start_date && <span><strong>Start:</strong> {new Date(task.start_date).toLocaleDateString()}</span>}
                                           {task.due_date && <span><strong>Due:</strong> {new Date(task.due_date).toLocaleDateString()}</span>}
                                       </div>
                                   </div>
                               </div>
                               {canManageTasks && (
                                   <div className="flex flex-col space-y-1 flex-shrink-0 ml-4 items-end">
                                       <Link
                                           to={`/tasks/edit/${task.id}`}
                                           className="px-3 py-1 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 text-xs w-full text-center"
                                       >
                                           Edit
                                       </Link>
                                       <button
                                           onClick={() => handleDeleteClick(task)}
                                           className="px-3 py-1 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition duration-200 text-xs w-full text-center"
                                       >
                                           Delete
                                       </button>
                                   </div>
                               )}
                           </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }} onConfirm={confirmDeleteTask} title="Confirm Task Deletion">
                Are you sure you want to delete the task <strong className="font-semibold"> "{taskToDelete?.title}"</strong>? This action cannot be undone.
            </Modal>
        </div>
    );
}

export default TasksListPage;