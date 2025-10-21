// frontend/src/pages/ShoppingListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function ShoppingListPage() {
    const [shoppingList, setShoppingList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const canViewPage = user && ['admin', 'project manager'].includes(user.role);
    const isAdmin = user && user.role === 'admin';

    // Fetch projects for the dropdown
    useEffect(() => {
        if (canViewPage) {
            axiosInstance.get('/projects/')
                .then(response => {
                    // Admins see all projects, PMs only see theirs
                    const relevantProjects = isAdmin
                        ? response.data
                        : response.data.filter(p => p.project_manager_id === user.id);
                    setProjects(relevantProjects);
                    if (relevantProjects.length === 1) {
                         // If only one project, auto-select it
                         setSelectedProjectId(relevantProjects[0].id.toString());
                    }
                })
                .catch(() => toast.error("Could not load projects for selection."))
                .finally(() => setIsProjectsLoading(false));
        } else {
            setIsProjectsLoading(false);
        }
    }, [canViewPage, isAdmin, user?.id]);

    // Fetch shopping list when a project is selected
    const fetchShoppingList = useCallback((projectId) => {
        if (!projectId) {
            setShoppingList([]);
            setError('');
            return;
        }
        setIsLoading(true);
        setError('');
        axiosInstance.get(`/shopping-list/project/${projectId}`)
            .then(response => setShoppingList(response.data))
            .catch(() => {
                setError(`Failed to load shopping list for project ID ${projectId}.`);
                toast.error(`Failed to load shopping list.`);
            })
            .finally(() => setIsLoading(false));
    }, []);

    // Effect to trigger fetch when selectedProjectId changes
    useEffect(() => {
        fetchShoppingList(selectedProjectId);
    }, [selectedProjectId, fetchShoppingList]);

    if (isProjectsLoading) {
        return <LoadingSpinner text="Loading projects..." />;
    }

    if (!canViewPage) {
        return <div className="text-center p-8 text-red-500">You do not have permission to view shopping lists.</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Project Shopping List</h1>

            <div className="max-w-md mb-8">
                <label htmlFor="project-select-shopping" className="block text-sm font-medium mb-1">
                    Select Project
                </label>
                <select
                    id="project-select-shopping"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="block w-full rounded-md shadow-sm"
                    disabled={projects.length === 0}
                >
                    <option value="">-- Choose a Project --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {projects.length === 0 && !isProjectsLoading && (
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdmin ? "No projects found." : "No projects assigned to you."}
                    </p>
                )}
            </div>

            {isLoading && <LoadingSpinner text="Generating shopping list..." />}
            {error && <p className="text-red-500 text-center">{error}</p>}

            {!isLoading && selectedProjectId && (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="py-3 px-6">Material</th>
                                <th className="py-3 px-6 text-right">Required (BoQ)</th>
                                <th className="py-3 px-6 text-right">In Project Stock</th>
                                <th className="py-3 px-6 text-right font-semibold">Need to Order</th>
                                <th className="py-3 px-6">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shoppingList.map(item => (
                                <tr key={item.inventory_item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="py-4 px-6 font-medium">{item.inventory_item.name}</td>
                                    <td className="py-4 px-6 text-right">{item.quantity_required}</td>
                                    <td className="py-4 px-6 text-right">{item.quantity_in_stock}</td>
                                    <td className="py-4 px-6 text-right font-bold text-orange-600 dark:text-orange-400">
                                        {item.quantity_to_order.toFixed(2)} {/* Ensure consistent decimal display */}
                                    </td>
                                    <td className="py-4 px-6">{item.unit || 'pcs'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {shoppingList.length === 0 && <p className="p-4 text-center">Nothing needs to be ordered for this project based on its BoQ and current stock.</p>}
                </div>
            )}
        </div>
    );
}

export default ShoppingListPage;