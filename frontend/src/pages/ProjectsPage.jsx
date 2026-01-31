import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    CalendarIcon,
    UserIcon,
    BriefcaseIcon // Added missing import
} from '@heroicons/react/24/solid';

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
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = user?.is_superuser;
    const canManageProjects = user && (user.role === 'admin' || user.role === 'project manager' || isSuperuser);

    const fetchProjects = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/projects/', {
            params: {
                status: statusFilter || undefined,
                search: debouncedSearchTerm || undefined,
                sort_by: sortBy,
                sort_dir: sortDir,
                limit: 500
            }
        })
        .then(response => {
            setProjects(response.data);
            setError('');
        })
        .catch(err => {
            setError('Failed to fetch projects.');
            console.error("Fetch projects error:", err);
        })
        .finally(() => {
            setIsLoading(false);
        });
    }, [statusFilter, debouncedSearchTerm, sortBy, sortDir]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

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
                    toast.error(`Error: ${err.response?.data?.detail || 'Failed to delete project'}`);
                    setIsDeleteModalOpen(false);
                });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'On Hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'Planning': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
        }
    };

    if (isLoading && projects.length === 0) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
                <LoadingSpinner text="Loading projects..." />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global overview" : `Sites for ${user?.tenant?.name}`}
                    </p>
                </div>
                {canManageProjects && (
                    <button 
                        onClick={() => navigate('/projects/new')}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" /> Create Project
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="relative flex-grow max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                     <div className="flex items-center gap-2">
                         <label className="font-medium text-gray-700 dark:text-gray-300">Status:</label>
                         <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)} 
                            className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-sm dark:text-white"
                        >
                             <option value="">All</option>
                             <option value="Planning">Planning</option>
                             <option value="In Progress">In Progress</option>
                             <option value="On Hold">On Hold</option>
                             <option value="Completed">Completed</option>
                         </select>
                     </div>
                </div>
            </div>

            {error && <div className="text-center py-4 text-red-500 bg-red-50 rounded-lg mb-6">{error}</div>}

            {/* Project List */}
            {projects.length > 0 ? (
                <div className="space-y-4">
                    {projects.map(project => (
                        <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition">
                            <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                            <Link to={`/tasks?project_id=${project.id}`} className="hover:text-indigo-600">
                                                {project.name}
                                            </Link>
                                        </h2>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${getStatusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5 truncate">
                                            <MapPinIcon className="h-4 w-4" /> {project.address || 'No address'}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                            <CalendarIcon className="h-4 w-4" /> 
                                            {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                            <UserIcon className="h-4 w-4" /> 
                                            {project.project_manager?.full_name || 'Unassigned'}
                                        </p>
                                    </div>

                                    {isSuperuser && project.tenant && (
                                        <div className="mt-3 flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded w-fit">
                                            <BuildingOfficeIcon className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase">
                                                {project.tenant.name}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {canManageProjects && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button 
                                            onClick={() => navigate(`/projects/edit/${project.id}`)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(project)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <BriefcaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Projects Found</h3>
                </div>
            )}

            {isDeleteModalOpen && (
                <ConfirmationModal 
                    isOpen={isDeleteModalOpen}
                    title="Delete Project"
                    message={`Are you sure you want to delete "${projectToDelete?.name}"?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ProjectsPage;