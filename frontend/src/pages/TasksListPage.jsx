// frontend/src/pages/TasksListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ALLOWED_STATUSES = ["Not Started", "In Progress", "On Hold", "Done", "Commissioned", "Cancelled"];
const ALLOWED_SORT_FIELDS = ["title", "due_date", "status", "created_at"];
const ALLOWED_SORT_DIRS = ["asc", "desc"];

const TasksListPage = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [filterProjectId, setFilterProjectId] = useState(searchParams.get('project_id') || ''); 
    const [filterStatus, setFilterStatus] = useState('');
    const [filterIsCommissioned, setFilterIsCommissioned] = useState(null);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [projects, setProjects] = useState([]);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const canManageTasks = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchProjectsForFilter = useCallback(() => {
        axiosInstance.get('/projects/')
            .then(response => setProjects(response.data))
            .catch(err => console.error("Could not fetch projects for filter", err));
    }, []);

    const fetchTasks = useCallback(() => {
        setIsLoading(true);
        const params = {
            project_id: filterProjectId || null,
            status: filterStatus || null,
            is_commissioned: filterIsCommissioned,
            sort_by: sortBy,
            sort_dir: sortDir,
        };
        axiosInstance.get('/tasks/', { params })
            .then(response => {
                setTasks(response.data);
                setError('');
            })
            .catch(err => {
                setError('Failed to fetch tasks.');
                console.error(err);
            })
            .finally(() => setIsLoading(false));
    }, [filterProjectId, filterStatus, filterIsCommissioned, sortBy, sortDir]);

    useEffect(() => {
        fetchProjectsForFilter();
        fetchTasks();
    }, [fetchProjectsForFilter, fetchTasks]);

    const handleDeleteClick = (task) => {
        setTaskToDelete(task);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (taskToDelete) {
            axiosInstance.delete(`/tasks/${taskToDelete.id}`)
                .then(() => {
                    toast.success(`Task "${taskToDelete.title}" deleted successfully.`);
                    setTasks(tasks.filter(t => t.id !== taskToDelete.id));
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                })
                .catch(err => {
                    toast.error(`Error deleting task: ${err.response?.data?.detail || 'Server error'}`);
                    setIsDeleteModalOpen(false);
                });
        }
    };
    
    const handleResetFilters = () => {
        setFilterProjectId('');
        setFilterStatus('');
        setFilterIsCommissioned(null);
        setSearchParams({});
    };

    const handleExportPDF = () => {
        if (tasks.length === 0) {
            toast.warn("There are no tasks to export.");
            return;
        }
        const doc = new jsPDF();
        const projectFilterName = projects.find(p => p.id === parseInt(filterProjectId, 10))?.name;
        const title = `Task List ${projectFilterName ? `- ${projectFilterName}` : '(All Projects)'}`;
        doc.text(title, 14, 22);
        const tableHead = [['Title', 'Project', 'Status', 'Due Date', 'Assigned To']];
        const tableBody = tasks.map(task => [
            task.title,
            task.project?.name || 'N/A',
            task.status,
            task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A',
            task.assignee?.full_name || 'Unassigned'
        ]);
        doc.autoTable({
            head: tableHead,
            body: tableBody,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }
        });
        doc.save(`tasks-export-${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success("PDF generated successfully!");
    };

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tasks</h1>
                <div className="flex items-center gap-2">
                    {tasks.length > 0 && (
                         <button
                            onClick={handleExportPDF}
                            className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                            Export PDF
                        </button>
                    )}
                    {canManageTasks && (
                        <button
                            onClick={() => navigate('/tasks/new')}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Task
                        </button>
                    )}
                </div>
            </div>
            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <div>
                    <label htmlFor="project_filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                    <select id="project_filter" value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-800 dark:text-white">
                        <option value="">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="status_filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select id="status_filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-800 dark:text-white">
                        <option value="">All Statuses</option>
                        {ALLOWED_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {canManageTasks && (
                    <div>
                        <label htmlFor="commissioned_filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commissioning</label>
                        <select id="commissioned_filter" value={filterIsCommissioned ?? ''} onChange={e => setFilterIsCommissioned(e.target.value === '' ? null : e.target.value === 'true')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-800 dark:text-white">
                            <option value="">Any</option>
                            <option value="true">Awaiting Commission</option>
                            <option value="false">Not Awaiting</option>
                        </select>
                    </div>
                )}
                <div>
                    <label htmlFor="sort_by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
                    <select id="sort_by" value={sortBy} onChange={e => setSortBy(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-800 dark:text-white">
                        {ALLOWED_SORT_FIELDS.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="sort_dir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                    <select id="sort_dir" value={sortDir} onChange={e => setSortDir(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-800 dark:text-white">
                        {ALLOWED_SORT_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="md:col-start-4 xl:col-start-auto">
                    <button onClick={handleResetFilters} className="w-full justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600">
                        Reset Filters
                    </button>
                </div>
            </div>
            {isLoading ? (
                <LoadingSpinner text="Loading tasks..." />
            ) : error ? (
                <div className="text-center py-10 text-red-500">{error}</div>
            ) : (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="py-3 px-6">Title</th>
                                <th scope="col" className="py-3 px-6">Project</th>
                                <th scope="col" className="py-3 px-6">Status</th>
                                <th scope="col" className="py-3 px-6">Due Date</th>
                                <th scope="col" className="py-3 px-6">Assigned To</th>
                                {canManageTasks && <th scope="col" className="py-3 px-6">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">{task.title}</td>
                                    <td className="py-4 px-6">{task.project?.name || 'N/A'}</td>
                                    <td className="py-4 px-6">{task.status}</td>
                                    <td className="py-4 px-6">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="py-4 px-6">{task.assignee?.full_name || 'Unassigned'}</td>
                                    {canManageTasks && (
                                        <td className="py-4 px-6 flex items-center space-x-3">
                                            <button onClick={() => navigate(`/tasks/${task.id}`)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                                View / Edit
                                            </button>
                                            <button onClick={() => handleDeleteClick(task)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Task"
                    message={`Are you sure you want to delete the task "${taskToDelete?.title}"? This action is permanent.`}
                />
            )}
        </div>
    );
};

export default TasksListPage;