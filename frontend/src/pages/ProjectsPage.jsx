// frontend/src/pages/ProjectsPage.jsx
// Full-width cards + Search Bar

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// Debounce hook for search input
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Filter, Sort, and Search State
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [searchTerm, setSearchTerm] = useState(''); // State for search input
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term

    const canManageProjects = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchProjects = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/projects/', {
            params: {
                status: statusFilter || undefined,
                search: debouncedSearchTerm || undefined, // Use debounced search term
                sort_by: sortBy,
                sort_dir: sortDir,
                limit: 200
            }
        })
        .then(response => {
            setProjects(response.data);
            setError('');
        })
        .catch(err => {
            setError('Failed to fetch projects.');
            console.error(err);
        })
        .finally(() => {
            setIsLoading(false);
        });
    }, [statusFilter, debouncedSearchTerm, sortBy, sortDir]); // Add debouncedSearchTerm dependency

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]); // fetchProjects already includes debouncedSearchTerm

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (projectToDelete) {
            axiosInstance.delete(`/projects/${projectToDelete.id}`)
                .then(() => {
                    toast.success(`Project "${projectToDelete.name}" deleted successfully!`);
                    setProjects(projects.filter(p => p.id !== projectToDelete.id));
                    setIsDeleteModalOpen(false);
                    setProjectToDelete(null);
                })
                .catch(err => {
                    toast.error(`Error deleting project: ${err.response?.data?.detail || 'Server error'}`);
                    setIsDeleteModalOpen(false);
                });
        }
    };

    const getStatusColor = (status) => {
        // ... (status color logic remains the same)
         switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'On Hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'Planning': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    if (isLoading && projects.length === 0) { // Show loading only initially
        return <div className="flex justify-center items-center h-[calc(100vh-5rem)]"><LoadingSpinner text="Loading projects..." /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
                {canManageProjects && (
                    <button onClick={() => navigate('/projects/new')} /* ... create button styling ... */ >
                        <PlusIcon className="h-5 w-5 mr-2" /> Create Project
                    </button>
                )}
            </div>

            {/* Controls: Search, Filter, Sort */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-wrap items-center justify-between gap-4 text-sm">
                {/* Search Input */}
                <div className="relative flex-grow max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>

                {/* Filter and Sort */}
                <div className="flex flex-wrap items-center gap-4">
                     <div className="flex items-center gap-2">
                         <label htmlFor="status_filter" className="font-medium text-gray-700 dark:text-gray-300">Status:</label>
                         <select id="status_filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm text-sm">
                             <option value="">All</option>
                             {/* ... status options ... */}
                             <option value="Planning">Planning</option>
                             <option value="In Progress">In Progress</option>
                             <option value="On Hold">On Hold</option>
                             <option value="Completed">Completed</option>
                         </select>
                     </div>
                     <div className="flex items-center gap-2">
                        <label htmlFor="sort_by" className="font-medium text-gray-700 dark:text-gray-300">Sort By:</label>
                        <select id="sort_by" value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm text-sm">
                            <option value="name">Name</option>
                            <option value="status">Status</option>
                            <option value="start_date">Start Date</option>
                        </select>
                        <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm text-sm">
                            <option value="asc">Asc</option>
                            <option value="desc">Desc</option>
                        </select>
                    </div>
                 </div>
            </div>

            {/* Project Cards List (Full Width) */}
            {isLoading && projects.length > 0 && <LoadingSpinner text="Refreshing projects..." />}
            {!isLoading && projects.length > 0 ? (
                <div className="space-y-4"> {/* Use space-y for vertical stacking */}
                    {projects.map(project => (
                        <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Main Info */}
                                <div className="flex-grow">
                                     <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                         <Link to={`/tasks?project_id=${project.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                                             {project.name}
                                         </Link>
                                     </h2>
                                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate" title={project.address}>
                                         📍 {project.address || 'No address'}
                                     </p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                         Start: {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}
                                     </p>
                                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        PM: {project.project_manager?.full_name || 'Unassigned'}
                                    </p>
                                </div>
                                {/* Status and Actions */}
                                <div className="flex-shrink-0 text-right space-y-2">
                                     <span className={`block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                                         {project.status}
                                     </span>
                                     {canManageProjects && (
                                         <div className="flex justify-end space-x-3 mt-2">
                                             <button onClick={() => navigate(`/projects/edit/${project.id}`)} /* ... edit button styling ... */ title="Edit Project">
                                                 <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                             </button>
                                             <button onClick={() => handleDeleteClick(project)} /* ... delete button styling ... */ title="Delete Project">
                                                 <TrashIcon className="h-4 w-4 mr-1"/> Delete
                                             </button>
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                     {/* ... No projects found message ... */}
                     <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Projects Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? `No projects match your search for "${searchTerm}".` : 'No projects match the current filters.'}
                     </p>
                 </div>
            )}

            {isDeleteModalOpen && ( <ConfirmationModal /* ... props ... */ /> )}
        </div>
    );
};

export default ProjectsPage;