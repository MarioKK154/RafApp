// frontend/src/pages/ToolInventoryPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

function ToolInventoryPage() {
    const [tools, setTools] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [toolToDelete, setToolToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const canManageTools = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchTools = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/tools/')
            .then(response => setTools(response.data))
            .catch(() => {
                setError('Failed to load tool inventory.');
                toast.error('Failed to load tool inventory.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { fetchTools(); }, [fetchTools]);

    const handleCheckout = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkout`);
            toast.success('Tool checked out successfully!');
            fetchTools();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check out tool.'); }
    };

    const handleCheckin = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkin`);
            toast.success('Tool checked in successfully!');
            fetchTools();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to check in tool.'); }
    };

    const handleDeleteClick = (tool) => {
        setToolToDelete(tool);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!toolToDelete) return;
        try {
            await axiosInstance.delete(`/tools/${toolToDelete.id}`);
            toast.success(`Tool "${toolToDelete.name}" deleted successfully.`);
            fetchTools();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete tool.'); }
        finally {
            setIsDeleteModalOpen(false);
            setToolToDelete(null);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading tool inventory..." />; }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">Tool Inventory</h1>
                {canManageTools && (
                    <Link to="/tools/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add New Tool
                    </Link>
                )}
            </div>
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-2 text-center">Image</th>
                            <th className="py-3 px-6">Name</th>
                            <th className="py-3 px-6">Brand / Model</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Currently With</th>
                            <th className="py-3 px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tools.map(tool => (
                            <tr key={tool.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="p-2 text-center">
                                    <img 
                                        src={tool.image_url || '/default-tool.png'} 
                                        alt={tool.name}
                                        className="h-12 w-12 object-contain rounded"
                                        onError={(e) => { e.target.onerror = null; e.target.src='/default-tool.png' }}
                                    />
                                </td>
                                <td className="py-4 px-6 font-medium">
                                    <Link to={`/tools/${tool.id}`} className="text-blue-600 hover:underline">{tool.name}</Link>
                                </td>
                                <td className="py-4 px-6">{tool.brand} {tool.model}</td>
                                <td className="py-4 px-6">{tool.status}</td>
                                <td className="py-4 px-6">{tool.current_user?.full_name || 'In Stock'}</td>
                                <td className="py-4 px-6 flex items-center space-x-4">
                                    {tool.status === 'Available' && (
                                        <button onClick={() => handleCheckout(tool.id)} className="text-green-600 hover:underline">Check Out</button>
                                    )}
                                    {tool.status === 'In Use' && tool.current_user?.id === user.id && (
                                        <button onClick={() => handleCheckin(tool.id)} className="text-yellow-600 hover:underline">Check In</button>
                                    )}
                                    {canManageTools && (
                                        <>
                                            <Link to={`/tools/edit/${tool.id}`} className="text-blue-600 hover:underline">Edit</Link>
                                            <button onClick={() => handleDeleteClick(tool)} className="text-red-600 hover:underline">Delete</button>
                                        </>
                                    )}
                                </td>
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
                    title="Delete Tool"
                    message={`Are you sure you want to delete the tool "${toolToDelete?.name}"?`}
                />
            )}
        </div>
    );
}

export default ToolInventoryPage;