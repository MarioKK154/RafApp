// frontend/src/pages/ToolDetailsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

function ToolDetailsPage() {
    const { toolId } = useParams();
    const [tool, setTool] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const canManageTools = user && (user.role === 'admin' || user.role === 'project manager');

    const fetchTool = useCallback(() => {
        setIsLoading(true);
        axiosInstance.get(`/tools/${toolId}`)
            .then(response => setTool(response.data))
            .catch(() => toast.error("Failed to load tool details."))
            .finally(() => setIsLoading(false));
    }, [toolId]);

    useEffect(() => {
        fetchTool();
    }, [fetchTool]);

    if (isLoading) {
        return <LoadingSpinner text="Loading tool details..." />;
    }

    if (!tool) {
        return <div className="text-center p-8">Tool not found.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold">{tool.name}</h1>
                    <p className="text-gray-500">{tool.brand} {tool.model}</p>
                </div>
                {canManageTools && (
                    <Link to={`/tools/edit/${tool.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Edit Tool
                    </Link>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center">
                        <img 
                            src={tool.image_url || '/default-tool.png'} 
                            alt={tool.name}
                            className="w-full h-48 object-contain rounded-md mb-4"
                            onError={(e) => { e.target.onerror = null; e.target.src='/default-tool.png' }}
                        />
                        <h3 className="font-semibold">Status: {tool.status}</h3>
                        <p className="text-sm">
                            Currently with: {tool.current_user?.full_name || 'In Stock'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mt-4 text-sm">
                         <h3 className="font-semibold text-lg mb-2">Details</h3>
                         <p><strong>Serial #:</strong> {tool.serial_number || 'N/A'}</p>
                         <p><strong>Purchased:</strong> {tool.purchase_date ? new Date(tool.purchase_date).toLocaleDateString() : 'N/A'}</p>
                         <p><strong>Last Service:</strong> {tool.last_service_date ? new Date(tool.last_service_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">History Log</h2>
                    <div className="overflow-y-auto max-h-96">
                        {tool.history_logs && tool.history_logs.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Action</th>
                                        <th className="px-4 py-2">User</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...tool.history_logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => (
                                        <tr key={log.id} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-2">{log.action.replace('_', ' ')}</td>
                                            <td className="px-4 py-2">{log.user.full_name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No history records found for this tool.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ToolDetailsPage;