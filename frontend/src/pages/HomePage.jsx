// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardDocumentListIcon, WrenchScrewdriverIcon, KeyIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

function HomePage() {
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the clock-in widget
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [currentLog, setCurrentLog] = useState(null);
    const [selectedClockInProjectId, setSelectedClockInProjectId] = useState('');

    const isManagerOrAdmin = user && (user.role === 'admin' || user.role === 'project manager' || user.is_superuser);

    const fetchData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoading(true);
            setError('');
            try {
                const [dashboardResponse, statusResponse] = await Promise.all([
                    axiosInstance.get('/dashboard/'),
                    axiosInstance.get('/timelogs/status'),
                ]);
                setDashboardData(dashboardResponse.data);
                setIsClockedIn(statusResponse.data.is_clocked_in);
                setCurrentLog(statusResponse.data.current_log);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError('Could not load dashboard data.');
                toast.error('Could not load dashboard data.');
            } finally {
                setIsLoading(false);
            }
        }
    }, [authIsLoading, isAuthenticated]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleClockIn = async () => {
        const payload = { project_id: selectedClockInProjectId ? parseInt(selectedClockInProjectId) : null };
        try {
            const response = await axiosInstance.post('/timelogs/clock-in', payload);
            setIsClockedIn(true);
            setCurrentLog(response.data);
            toast.success('Successfully clocked in!');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to clock in.');
        }
    };
    
    const handleClockOut = async () => {
        try {
            await axiosInstance.post('/timelogs/clock-out');
            setIsClockedIn(false);
            setCurrentLog(null);
            setSelectedClockInProjectId('');
            toast.success('Successfully clocked out.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to clock out.');
        }
    };

    if (authIsLoading || isLoading) {
        return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading your dashboard..." size="lg" /></div>;
    }

    if (!isAuthenticated) {
        // This is a fallback; ProtectedRoute should handle this.
        return <div className="p-8 text-center text-red-500">Please log in to view your dashboard.</div>;
    }
    
    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                Welcome back, {user?.full_name || user?.email}!
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Open Tasks */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><ClipboardDocumentListIcon className="h-6 w-6 mr-2" />My Open Tasks</h2>
                        {dashboardData?.my_open_tasks.length > 0 ? (
                            <ul className="divide-y dark:divide-gray-700">
                                {dashboardData.my_open_tasks.map(task => (
                                    <li key={task.id} className="py-2">
                                        <Link to={`/tasks/${task.id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                                        <p className="text-sm text-gray-500">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">You have no open tasks assigned to you. Great job!</p>
                        )}
                    </div>
                    
                    {/* Managed Projects (for Admins/PMs) */}
                    {isManagerOrAdmin && (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4 flex items-center"><BriefcaseIcon className="h-6 w-6 mr-2" />Managed Projects</h2>
                            {dashboardData?.managed_projects?.length > 0 ? (
                                <ul className="divide-y dark:divide-gray-700">
                                    {dashboardData.managed_projects.map(project => (
                                        <li key={project.id} className="py-2">
                                            <Link to={`/projects/edit/${project.id}`} className="text-blue-600 hover:underline">{project.name}</Link>
                                            <p className="text-sm text-gray-500">Status: {project.status}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">You are not managing any projects.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Time Clock */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Time Clock</h2>
                        {isClockedIn && currentLog ? (
                             <div>
                                <p className="text-green-600 font-medium">Currently Clocked In</p>
                                <p className="text-xs text-gray-500">Since: {new Date(currentLog.start_time).toLocaleTimeString()}</p>
                                <button onClick={handleClockOut} className="mt-4 w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Clock Out</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-gray-600">You are currently clocked out.</p>
                                <select value={selectedClockInProjectId} onChange={e => setSelectedClockInProjectId(e.target.value)} className="block w-full rounded-md">
                                    <option value="">-- General --</option>
                                    {user?.assigned_projects?.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                                </select>
                                <button onClick={handleClockIn} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Clock In</button>
                            </div>
                        )}
                    </div>

                    {/* My Equipment */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">My Equipment</h2>
                        {dashboardData?.my_checked_out_car || dashboardData?.my_checked_out_tools.length > 0 ? (
                            <ul className="divide-y dark:divide-gray-700">
                                {dashboardData.my_checked_out_car && (
                                    <li className="py-2 flex items-center">
                                        <KeyIcon className="h-5 w-5 mr-3 text-gray-400"/>
                                        <Link to={`/cars/${dashboardData.my_checked_out_car.id}`} className="text-blue-600 hover:underline">
                                            {dashboardData.my_checked_out_car.make} {dashboardData.my_checked_out_car.model} ({dashboardData.my_checked_out_car.license_plate})
                                        </Link>
                                    </li>
                                )}
                                {dashboardData.my_checked_out_tools.map(tool => (
                                    <li key={tool.id} className="py-2 flex items-center">
                                        <WrenchScrewdriverIcon className="h-5 w-5 mr-3 text-gray-400"/>
                                        <Link to={`/tools/${tool.id}`} className="text-blue-600 hover:underline">{tool.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500">You have no equipment checked out.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;