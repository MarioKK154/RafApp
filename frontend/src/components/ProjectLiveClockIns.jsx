// frontend/src/components/ProjectLiveClockIns.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';

function ProjectLiveClockIns({ projectId }) {
    const [activeLogs, setActiveLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // Only Admins and PMs can view this
    const canView = user && ['admin', 'project manager'].includes(user.role);

    const fetchActiveLogs = useCallback(async () => {
        if (!projectId || !canView) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/timelogs/project/${projectId}/active`);
            setActiveLogs(response.data);
        } catch (err) {
            // It's okay if 404/403, just means no access or project gone
            if (err.response?.status !== 404 && err.response?.status !== 403) {
                setError('Failed to load live clock-in data.');
                toast.error('Failed to load live clock-in data.');
            } else {
                setActiveLogs([]); // Clear logs on permission/not found error
            }
        } finally {
            setIsLoading(false);
        }
    }, [projectId, canView]);

    useEffect(() => {
        fetchActiveLogs();
        // Optional: Set up an interval to refresh the data periodically
        const intervalId = setInterval(fetchActiveLogs, 60000); // Refresh every 60 seconds
        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [fetchActiveLogs]);

    if (!canView) {
        return null; // Don't render anything if user doesn't have permission
    }

    if (isLoading && activeLogs.length === 0) { // Show spinner only on initial load
        return <LoadingSpinner text="Loading active users..." size="sm"/>;
    }

    // Function to calculate duration since start time
    const calculateDuration = (startTime) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-blue-500"/> Currently Clocked In
            </h3>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {activeLogs.length > 0 ? (
                <ul className="space-y-2">
                    {activeLogs.map(log => (
                        <li key={log.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                {log.user?.profile_picture_url ? (
                                    <img src={log.user.profile_picture_url} alt={log.user.full_name || log.user.email} className="h-6 w-6 rounded-full mr-2 object-cover"/>
                                ) : (
                                    <UserCircleIcon className="h-6 w-6 mr-2 text-gray-400"/>
                                )}
                                <span>{log.user?.full_name || log.user?.email || `User ID: ${log.user_id}`}</span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">
                                ({calculateDuration(log.start_time)})
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No users currently clocked in to this project.</p>
            )}
        </div>
    );
}

export default ProjectLiveClockIns;