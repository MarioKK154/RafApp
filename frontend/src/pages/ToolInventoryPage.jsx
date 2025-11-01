// frontend/src/pages/ToolInventoryPage.jsx
// Card layout + Basic Search

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon, ArrowUpOnSquareIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/solid';

function ToolInventoryPage() {
    const [tools, setTools] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const [toolToDelete, setToolToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State for search

    const canManageTools = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchTools = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get('/tools/')
            .then(response => {
                setTools(response.data);
            })
            .catch(err => {
                setError('Failed to load tool inventory.');
                toast.error('Failed to load tool inventory.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        fetchTools();
    }, [fetchTools]);

    // Filter tools based on search term (frontend filtering)
    const filteredTools = useMemo(() => {
        if (!searchTerm) {
            return tools;
        }
        return tools.filter(tool =>
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tool.brand && tool.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tool.model && tool.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (tool.serial_number && tool.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [tools, searchTerm]);

    const handleCheckout = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkout`);
            toast.success('Tool checked out successfully!');
            fetchTools(); // Refresh the list
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to check out tool.');
        }
    };

    const handleCheckin = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkin`);
            toast.success('Tool checked in successfully!');
            fetchTools(); // Refresh the list
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to check in tool.');
        }
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
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete tool.');
        } finally {
            setIsDeleteModalOpen(false);
            setToolToDelete(null);
        }
    };

    // Helper to get status color
     const getStatusColor = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'In Use': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'In Repair': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
            case 'Retired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    if (isLoading && tools.length === 0) {
        return <LoadingSpinner text="Loading tool inventory..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Tool Inventory</h1>
                {canManageTools && (
                    <Link to="/tools/new" className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add New Tool
                    </Link>
                )}
            </div>

             {/* Search Bar */}
             <div className="mb-6">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Search by name, brand, model, serial..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Tool Cards List */}
            {isLoading && tools.length > 0 && <LoadingSpinner text="Refreshing tools..." />}
            {!isLoading && filteredTools.length > 0 ? (
                <div className="space-y-4">
                    {filteredTools.map(tool => (
                        <div key={tool.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition hover:shadow-lg">
                            <div className="p-5 flex flex-wrap justify-between items-start gap-4">
                                {/* Image and Main Info */}
                                <div className="flex items-start gap-4 flex-grow min-w-[200px]">
                                     <img
                                        src={tool.image_url || '/default-tool.png'}
                                        alt={tool.name}
                                        className="h-16 w-16 object-contain rounded flex-shrink-0 bg-gray-100 dark:bg-gray-700 p-1"
                                        onError={(e) => { e.target.onerror = null; e.target.src='/default-tool.png' }}
                                    />
                                    <div>
                                         <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                             <Link to={`/tools/${tool.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                                                 {tool.name}
                                             </Link>
                                         </h2>
                                         <p className="text-sm text-gray-600 dark:text-gray-400">
                                             {tool.brand || ''} {tool.model || ''}
                                         </p>
                                         <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                             S/N: {tool.serial_number || 'N/A'}
                                         </p>
                                    </div>
                                </div>
                                {/* Status, User, and Actions */}
                                <div className="flex-shrink-0 text-right space-y-2">
                                    <span className={`block px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(tool.status)}`}>
                                         {tool.status.replace('_', ' ')}
                                     </span>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">
                                         With: {tool.current_user?.full_name || 'In Stock'}
                                     </p>
                                     <div className="flex justify-end items-center space-x-3 mt-2">
                                        {/* Check-in/out Buttons */}
                                        {tool.status === 'Available' && (
                                            <button onClick={() => handleCheckout(tool.id)} className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center" title="Check Out">
                                                <ArrowUpOnSquareIcon className="h-4 w-4 mr-1"/> Check Out
                                            </button>
                                        )}
                                        {tool.status === 'In Use' && tool.current_user?.id === user.id && (
                                            <button onClick={() => handleCheckin(tool.id)} className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center" title="Check In">
                                                <ArrowDownOnSquareIcon className="h-4 w-4 mr-1"/> Check In
                                            </button>
                                        )}
                                        {/* Admin Actions */}
                                        {canManageTools && (
                                            <>
                                                <button onClick={() => navigate(`/tools/edit/${tool.id}`)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center" title="Edit Tool">
                                                    <PencilIcon className="h-4 w-4 mr-1"/> Edit
                                                </button>
                                                <button onClick={() => handleDeleteClick(tool)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium flex items-center" title="Delete Tool">
                                                    <TrashIcon className="h-4 w-4 mr-1"/> Delete
                                                </button>
                                            </>
                                        )}
                                     </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 !isLoading && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                     <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Tools Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm ? `No tools match your search for "${searchTerm}".` : 'The tool inventory is currently empty.'}
                     </p>
                 </div>
            )}

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