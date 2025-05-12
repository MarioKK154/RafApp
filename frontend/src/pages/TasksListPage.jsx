// frontend/src/pages/TasksListPage.jsx
// FINAL REFACTORED v2 - Single Return with Conditional Rendering
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

const TASK_SORTABLE_FIELDS = [
    { label: 'Title', value: 'title'}, { label: 'Status', value: 'status'},
    { label: 'Priority', value: 'priority'}, { label: 'Start Date', value: 'start_date'},
    { label: 'Due Date', value: 'due_date'}, { label: 'Date Created', value: 'created_at'},
    { label: 'ID', value: 'id'}
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

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

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
            .catch(err => { console.error("Error fetching tasks:", err); setError('Failed to load tasks.'); toast.error("Failed to load tasks."); })
            .finally(() => { setIsLoading(false); });
    }, [isAuthenticated, authIsLoading, projectIdFilter, assigneeIdFilter, sortBy, sortDir, filterDataError, filterDataLoading]);

    useEffect(() => { fetchFilterData(); }, [fetchFilterData]);

    useEffect(() => {
        if (!filterDataLoading && !authIsLoading && isAuthenticated) { fetchTasks(); }
        else if (!authIsLoading && !isAuthenticated) { setIsLoading(false); setError(''); navigate('/login', {replace: true}); }
    }, [fetchTasks, filterDataLoading, isAuthenticated, authIsLoading, navigate]);

    const handleDeleteClick = (task) => { if (!canManageTasks) { toast.error("No permission."); return; } setTaskToDelete(task); setIsDeleteModalOpen(true); };
    const confirmDeleteTask = async () => { if (!taskToDelete) return; try { await axiosInstance.delete(`/tasks/${taskToDelete.id}`); toast.success(`Task "${taskToDelete.title}" deleted.`); fetchTasks(); } catch (err) { console.error("Error deleting task:", err); toast.error(err.response?.data?.detail || 'Failed to delete task.'); } finally { setIsDeleteModalOpen(false); setTaskToDelete(null); } };

    // Single return with conditional rendering inside
    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
                {isAuthenticated && canManageTasks && (<Link to="/tasks/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base">Create New Task</Link>)}
            </div>

            {authIsLoading || filterDataLoading ? (
                <div className="text-center py-10"><p className="text-xl text-gray-500 dark:text-gray-400">Loading page data...</p></div>
            ) : !isAuthenticated ? (
                <div className="text-center py-10"><p className="text-red-600 mb-4">Please log in to view tasks.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link></div>
            ) : filterDataError ? (
                <div className="text-center py-10 text-red-500"><p>{filterDataError}</p></div>
            ) : (
                <>
                    {/* Filters and Sorting Controls Row */}
                    <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                        {/* Project Filter */}
                        <div className="flex-grow min-w-[150px]"> <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Project</label> <select id="projectFilter" name="projectFilter" value={projectIdFilter} onChange={(e) => setProjectIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="">All Projects</option> {availableProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))} </select> </div>
                        {/* Assignee Filter */}
                        <div className="flex-grow min-w-[150px]"> <label htmlFor="assigneeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Assignee</label> <select id="assigneeFilter" name="assigneeFilter" value={assigneeIdFilter} onChange={(e) => setAssigneeIdFilter(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="">All Assignees</option> {availableAssignees.map(assignee => ( <option key={assignee.id} value={assignee.id}> {assignee.full_name || assignee.email} </option> ))} </select> </div>
                        {/* Sort By */}
                        <div className="flex-grow min-w-[150px]"> <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label> <select id="sortBy" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> {TASK_SORTABLE_FIELDS.map(field => ( <option key={field.value} value={field.value}> {field.label} </option> ))} </select> </div>
                        {/* Sort Direction */}
                        <div className="flex-shrink-0"> <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label> <select id="sortDir" name="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="text-sm block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"> <option value="asc">Asc</option> <option value="desc">Desc</option> </select> </div>
                    </div>

                    {/* Task List Error or Loading */}
                    {isLoading ? (<p className="text-center text-gray-500">Loading tasks...</p>)
                     : error ? (<p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>)
                     : tasks.length === 0 ? ( <p className="text-gray-600 dark:text-gray-400">No tasks found matching the current criteria. {canManageTasks ? 'Create one!' : ''}</p> )
                     : (
                        <div className="space-y-4">
                            {tasks.map(task => (
                                <div key={task.id} className="p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div> <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h2> <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description || 'No description'}</p> <p className="text-xs text-gray-500 dark:text-gray-500"> Project ID: {task.project_id} | Status: {task.status} | Priority: {task.priority} {task.assignee_id ? ` | Assignee ID: ${task.assignee_id}` : ''} </p> <div className="flex space-x-2 text-xs text-gray-500 dark:text-gray-500 mt-1"> {task.start_date && <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>} {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>} </div> </div>
                                        {canManageTasks && ( <div className="flex space-x-2 flex-shrink-0 ml-4"> <Link to={`/tasks/edit/${task.id}`} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200 text-xs">Edit</Link> <button onClick={() => handleDeleteClick(task)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs">Delete</button> </div> )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }} onConfirm={confirmDeleteTask} title="Confirm Task Deletion">
                Are you sure you want to delete the task <strong className="font-semibold"> "{taskToDelete?.title}"</strong>? This action cannot be undone.
            </Modal>
        </div>
    );
}
export default TasksListPage;