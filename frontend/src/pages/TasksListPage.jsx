// frontend/src/pages/TasksListPage.jsx
// ABSOLUTELY FINAL Corrected Version - Fixed misplaced filterDataError check
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const TASK_SORTABLE_FIELDS = [
    { label: 'Title', value: 'title'}, { label: 'Status', value: 'status'},
    { label: 'Priority', value: 'priority'}, { label: 'Start Date', value: 'start_date'},
    { label: 'Due Date', value: 'due_date'}, { label: 'Date Created', value: 'created_at'}
];
const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function TasksListPage() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const navigate = useNavigate();
    const [projectIdFilter, setProjectIdFilter] = useState('');
    const [assigneeIdFilter, setAssigneeIdFilter] = useState('');
    const [availableProjects, setAvailableProjects] = useState([]);
    const [availableAssignees, setAvailableAssignees] = useState([]);
    const [filterDataLoading, setFilterDataLoading] = useState(true);
    const [filterDataError, setFilterDataError] = useState('');
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');

    const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

    const fetchFilterData = useCallback(() => {
        if (authIsLoading || !isAuthenticated) { setFilterDataLoading(false); return; }
        setFilterDataLoading(true); setFilterDataError('');
        Promise.all([ axiosInstance.get('/projects/'), axiosInstance.get('/users/') ])
        .then(([projectsResponse, usersResponse]) => {
            setAvailableProjects(projectsResponse.data);
            setAvailableAssignees(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));
        }).catch(err => { console.error("Error fetching filter data:", err); setFilterDataError('Could not load filter options.');
        }).finally(() => { setFilterDataLoading(false); });
    }, [isAuthenticated, authIsLoading]);

    const fetchTasks = useCallback(() => {
        if (authIsLoading || !isAuthenticated) { setIsLoading(false); setError(isAuthenticated ? '' : 'You must be logged in.'); return; }
        if(filterDataError && !filterDataLoading){ setIsLoading(false); return; }
        setIsLoading(true); setError('');
        const params = { sort_by: sortBy, sort_dir: sortDir };
        if (projectIdFilter) { params.project_id = projectIdFilter; }
        if (assigneeIdFilter) { params.assignee_id = assigneeIdFilter; }
        axiosInstance.get('/tasks/', { params })
            .then(response => { setTasks(response.data); })
            .catch(err => { console.error("Error fetching tasks:", err); setError('Failed to load tasks.'); })
            .finally(() => { setIsLoading(false); });
    }, [isAuthenticated, authIsLoading, projectIdFilter, assigneeIdFilter, sortBy, sortDir, filterDataError, filterDataLoading]);

    useEffect(() => { fetchFilterData(); }, [fetchFilterData]);

    useEffect(() => {
        if (!filterDataLoading && !authIsLoading && isAuthenticated) { fetchTasks(); }
        else if (!authIsLoading && !isAuthenticated) { setIsLoading(false); setError(''); }
    }, [fetchTasks, filterDataLoading, isAuthenticated, authIsLoading]);

    const handleDelete = async (taskId) => { if (!canManageTasks) { alert("No permission"); return; } if (!window.confirm('Are you sure...?')) return; try { setError(''); await axiosInstance.delete(`/tasks/${taskId}`); fetchTasks(); } catch (err) { console.error("Error deleting task:", err); setError(err.response?.data?.detail || 'Failed to delete task.'); } };

    // --- Render Logic ---

    if (authIsLoading || filterDataLoading) { // Combine initial loading states
        return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading page data...</p></div> );
    }

    if (!isAuthenticated) { // Handle not authenticated
        return ( <div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">Please log in to view tasks.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200">Go to Login</Link></div> );
    }

    // Main Authenticated Return Block
    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
                {canManageTasks && (<Link to="/tasks/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base">Create New Task</Link>)}
            </div>

            {/* Filters and Sorting Controls Row */}
            <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                {/* Project Filter */}
                <div className="flex-grow min-w-[150px]">
                    <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Project</label>
                    <select id="projectFilter" name="projectFilter" value={projectIdFilter} onChange={(e) => setProjectIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="">All Projects</option>
                        {availableProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                    </select>
                </div>
                {/* Assignee Filter */}
                <div className="flex-grow min-w-[150px]">
                    <label htmlFor="assigneeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Assignee</label>
                    <select id="assigneeFilter" name="assigneeFilter" value={assigneeIdFilter} onChange={(e) => setAssigneeIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="">All Assignees</option>
                        {availableAssignees.map(assignee => ( <option key={assignee.id} value={assignee.id}> {assignee.full_name || assignee.email} </option> ))}
                    </select>
                </div>
                {/* Sort By */}
                 <div className="flex-grow min-w-[150px]">
                    <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                    <select id="sortBy" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        {TASK_SORTABLE_FIELDS.map(field => ( <option key={field.value} value={field.value}> {field.label} </option> ))}
                    </select>
                </div>
                {/* Sort Direction */}
                <div className="flex-shrink-0">
                     <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                     <select id="sortDir" name="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                         <option value="asc">Asc</option>
                         <option value="desc">Desc</option>
                     </select>
                 </div>
            </div>

            {/* Error Display Area - Moved INSIDE main return */}
            {filterDataError && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{filterDataError}</p>}
            {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

            {/* Task List Display or Loading/No Tasks Message */}
            {isLoading ? (
                 <p className="text-center text-gray-500">Loading tasks...</p>
            ) : tasks.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No tasks found matching the current criteria. {canManageTasks ? 'Create one!' : ''}</p>
             ) : (
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                           {/* Task Card Content */}
                           <div className="flex justify-between items-start">
                               <div>
                                   <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h2>
                                   <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description || 'No description'}</p>
                                   <p className="text-xs text-gray-500 dark:text-gray-500"> Project ID: {task.project_id} | Status: {task.status} | Priority: {task.priority} {task.assignee_id ? ` | Assignee ID: ${task.assignee_id}` : ''} </p>
                                   <div className="flex space-x-2 text-xs text-gray-500 dark:text-gray-500 mt-1">
                                       {task.start_date && <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>}
                                       {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                   </div>
                               </div>
                               {canManageTasks && (
                                   <div className="flex space-x-2 flex-shrink-0 ml-4">
                                       <Link to={`/tasks/edit/${task.id}`} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 text-xs">Edit</Link>
                                       <button onClick={() => handleDelete(task.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs">Delete</button>
                                   </div>
                               )}
                           </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    ); // End main return
} // End component function

export default TasksListPage;