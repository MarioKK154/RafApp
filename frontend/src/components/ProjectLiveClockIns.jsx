import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { 
    ClockIcon, 
    UserCircleIcon, 
    SignalIcon,
    UserGroupIcon 
} from '@heroicons/react/24/outline';

function ProjectLiveClockIns({ projectId }) {
    const [activeLogs, setActiveLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    
    // State to force re-render for the duration timer
    const [, setTick] = useState(0);

    // Permissions: Admins, PMs, and Superusers can view live attendance
    const isSuperuser = user?.is_superuser;
    const canView = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchActiveLogs = useCallback(async () => {
        if (!projectId || !canView) {
            setIsLoading(false);
            return;
        }
        
        setError('');
        try {
            const response = await axiosInstance.get(`/timelogs/project/${projectId}/active`);
            setActiveLogs(response.data);
        } catch (error) {
            // Handle cases where the endpoint might not be available or permissions changed
            if (error.response?.status !== 404 && error.response?.status !== 403) {
                setError('Live sync interrupted.');
                console.error('Live clock-in fetch error:', error);
            } else {
                setActiveLogs([]); 
            }
        } finally {
            setIsLoading(false);
        }
    }, [projectId, canView]);

    useEffect(() => {
        fetchActiveLogs();

        // 1. Setup Data Refresh (Fetch from server every 60 seconds)
        const dataInterval = setInterval(fetchActiveLogs, 60000);

        // 2. Setup Timer "Tick" (Updates duration display every minute locally)
        const timerInterval = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);

        return () => {
            clearInterval(dataInterval);
            clearInterval(timerInterval);
        };
    }, [fetchActiveLogs]);

    /**
     * Calculates time elapsed since the clock-in event.
     */
    const calculateDuration = (startTime) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        
        if (diffMs < 0) return "Just started";
        
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    if (!canView) return null;

    if (isLoading && activeLogs.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <LoadingSpinner text="Connecting to site feed..." size="sm"/>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2 text-indigo-600 animate-pulse"/> 
                    Live Attendance
                </h3>
                {activeLogs.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <SignalIcon className="h-3 w-3 text-green-600 dark:text-green-400 animate-bounce" />
                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">
                            Live
                        </span>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg text-center">
                    {error}
                </div>
            )}

            {/* List of Active Workers */}
            {activeLogs.length > 0 ? (
                <div className="space-y-3">
                    {activeLogs.map(log => (
                        <div 
                            key={log.id} 
                            className="group flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-750 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="relative">
                                    {log.user?.profile_picture_url ? (
                                        <img 
                                            src={log.user.profile_picture_url} 
                                            alt="" 
                                            className="h-8 w-8 rounded-full object-cover border-2 border-white dark:border-gray-700"
                                        />
                                    ) : (
                                        <UserCircleIcon className="h-8 w-8 text-gray-400"/>
                                    )}
                                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                        {log.user?.full_name || log.user?.email || 'Anonymous Worker'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium tracking-tight">
                                        {log.user?.role?.replace('_', ' ') || 'Staff'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="text-right flex flex-col">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                    {calculateDuration(log.start_time)}
                                </span>
                                <span className="text-[9px] text-gray-400 uppercase">Elapsed</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                    <UserGroupIcon className="h-8 w-8 text-gray-200 dark:text-gray-700 mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        No one is currently clocked in.
                    </p>
                </div>
            )}

            {/* Footer Status */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-[9px] text-center text-gray-400 uppercase font-bold tracking-widest">
                    Syncing every 60s
                </p>
            </div>
        </div>
    );
}

export default ProjectLiveClockIns;