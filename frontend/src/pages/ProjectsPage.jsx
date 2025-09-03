// frontend/src/pages/ProjectsPage.jsx
// Uncondensed Version: Added links to project names to filter tasks
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon } from '@heroicons/react/24/solid';

const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // --- NEW: State for sorting
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const fetchProjects = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/projects/', {
            params: {
                sort_by: sortBy,
                sort_dir: sortDir,
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
    }, [sortBy, sortDir]); // Re-fetch when sorting changes

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
                    toast.error(`Error deleting project: ${err.response?.data?.detail || 'Server error'}`);
                    console.error("Deletion error:", err);
                    setIsDeleteModalOpen(false);
                });
        }
    };

    const canManageProjects = user && (user.role === 'admin' || user.role === 'project manager');

    if (isLoading) {
        return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading projects..." /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Projects</h1>
                {canManageProjects && (
                    <button
                        onClick={() => navigate('/projects/new')}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Project
                    </button>
                )}
            </div>
            
            {/* Sorting Controls */}
            <div className="flex justify-end items-center gap-4 mb-4">
                <label htmlFor="sort_by" className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By:</label>
                <select id="sort_by" value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white">
                    <option value="name">Name</option>
                    <option value="status">Status</option>
                    <option value="start_date">Start Date</option>
                </select>
                <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white">
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>

            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="py-3 px-6">Name</th>
                            <th scope="col" className="py-3 px-6">Status</th>
                            <th scope="col" className="py-3 px-6">Start Date</th>
                            <th scope="col" className="py-3 px-6">Project Manager</th>
                            {canManageProjects && <th scope="col" className="py-3 px-6">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="py-4 px-6 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {/* --- THIS IS THE CHANGE --- */}
                                    <Link to={`/tasks?project_id=${project.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                        {project.name}
                                    </Link>
                                    {/* --- END CHANGE --- */}
                                </td>
                                <td className="py-4 px-6">{project.status}</td>
                                <td className="py-4 px-6">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                                <td className="py-4 px-6">{project.project_manager?.full_name || 'Not Assigned'}</td>
                                {canManageProjects && (
                                    <td className="py-4 px-6 flex items-center space-x-3">
                                        <button onClick={() => navigate(`/projects/${project.id}`)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</button>
                                        <button onClick={() => handleDeleteClick(project)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isDeleteModalOpen && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Project"
                    message={`Are you sure you want to delete the project "${projectToDelete?.name}"? This action cannot be undone.`}
                />
            )}
        </div>
    );
};

export default ProjectsPage;