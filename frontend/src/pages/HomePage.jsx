// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardDocumentListIcon, WrenchScrewdriverIcon, KeyIcon, BriefcaseIcon, ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline'; // Renamed ClockIcon import

function HomePage() {
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [isClockedIn, setIsClockedIn] = useState(false);
    const [currentLog, setCurrentLog] = useState(null);
    const [selectedClockInProjectId, setSelectedClockInProjectId] = useState('');
    const [projectsForClockIn, setProjectsForClockIn] = useState([]); // For clock-in dropdown

    const isManagerOrAdmin = user && (user.role === 'admin' || user.role === 'project manager' || user.is_superuser);

    const fetchData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoading(true);
            setError('');
            try {
                // Fetch dashboard data and clock-in status
                const [dashboardResponse, statusResponse, projectsResponse] = await Promise.all([
                    axiosInstance.get('/dashboard/'),
                    axiosInstance.get('/timelogs/status'),
                    axiosInstance.get('/projects/') // Fetch projects for clock-in dropdown
                ]);
                setDashboardData(dashboardResponse.data);
                setIsClockedIn(statusResponse.data.is_clocked_in);
                setCurrentLog(statusResponse.data.current_log);
                // Filter projects: User assigned OR manager/admin OR superuser
                 const relevantProjects = projectsResponse.data.filter(p =>
                     user.assigned_projects?.some(ap => ap.id === p.id) ||
                     isManagerOrAdmin || user.is_superuser
                 );
                 setProjectsForClockIn(relevantProjects);

            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError('Could not load dashboard data.');
                // toast.error('Could not load dashboard data.'); // Might be too noisy
            } finally {
                setIsLoading(false);
            }
        }
    }, [authIsLoading, isAuthenticated, user?.id, user?.assigned_projects, isManagerOrAdmin, user?.is_superuser]); // Added user dependencies


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
            fetchData(); // Refresh dashboard data
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
            fetchData(); // Refresh dashboard data
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to clock out.');
        }
    };

    if (authIsLoading || isLoading) {
        return <div className="flex justify-center items-center h-[calc(100vh-5rem)]"><LoadingSpinner text="Loading your dashboard..." size="lg" /></div>; // Adjusted height
    }

    if (!isAuthenticated) {
        return <div className="p-8 text-center text-red-500">Please log in to view your dashboard.</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6"> {/* Reduced padding slightly */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-6">
                Dashboard
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content Column (Span 2) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* My Open Tasks Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-200">
                            <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" /> My Open Tasks
                        </h2>
                        {dashboardData?.my_open_tasks && dashboardData.my_open_tasks.length > 0 ? (
                            <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto"> {/* Added max-height and scroll */}
                                {dashboardData.my_open_tasks.map(task => (
                                    <li key={task.id} className="py-3">
                                        <Link to={`/tasks/${task.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{task.title}</Link>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Project: <Link to={`/projects/edit/${task.project_id}`} className="hover:underline">{projectsForClockIn.find(p => p.id === task.project_id)?.name || 'N/A'}</Link>
                                            <span className="mx-2">|</span>
                                            Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">You have no open tasks assigned. Great job!</p>
                        )}
                    </div>

                    {/* Managed Projects Card (for Admins/PMs) */}
                    {isManagerOrAdmin && (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-200">
                                <BriefcaseIcon className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" /> Managed Projects
                            </h2>
                            {dashboardData?.managed_projects && dashboardData.managed_projects.length > 0 ? (
                                <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto"> {/* Added max-height and scroll */}
                                    {dashboardData.managed_projects.map(project => (
                                        <li key={project.id} className="py-3">
                                            <Link to={`/projects/edit/${project.id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{project.name}</Link>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Status: {project.status}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">You are not currently managing any projects.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar Column (Span 1) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Time Clock Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-200">
                            <ClockOutlineIcon className="h-6 w-6 mr-2 text-indigo-600 dark:text-indigo-400" /> Time Clock
                        </h2>
                        {isClockedIn && currentLog ? (
                             <div className="text-center">
                                <p className="text-green-600 dark:text-green-400 font-medium mb-1">Currently Clocked In</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Since: {new Date(currentLog.start_time).toLocaleTimeString()}</p>
                                {currentLog.project_id && <p className="text-xs text-gray-500 dark:text-gray-400">Project: {projectsForClockIn.find(p=>p.id === currentLog.project_id)?.name || '...'}</p>}
                                <button onClick={handleClockOut} className="mt-4 w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-150">Clock Out</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-gray-600 dark:text-gray-400 text-center">You are currently clocked out.</p>
                                <div>
                                    <label htmlFor="clockInProject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Clock in to Project (Optional)</label>
                                    <select id="clockInProject" value={selectedClockInProjectId} onChange={e => setSelectedClockInProjectId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                        <option value="">-- General / No Project --</option>
                                        {projectsForClockIn.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                                    </select>
                                </div>
                                <button onClick={handleClockIn} className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-150">Clock In</button>
                            </div>
                        )}
                    </div>

                    {/* My Equipment Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-200">
                             My Equipment
                        </h2>
                        {dashboardData?.my_checked_out_car || (dashboardData?.my_checked_out_tools && dashboardData.my_checked_out_tools.length > 0) ? (
                            <ul className="divide-y dark:divide-gray-700">
                                {dashboardData.my_checked_out_car && (
                                    <li className="py-2 flex items-center">
                                        <KeyIcon className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0"/>
                                        <Link to={`/cars/${dashboardData.my_checked_out_car.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                                            {dashboardData.my_checked_out_car.make} {dashboardData.my_checked_out_car.model} ({dashboardData.my_checked_out_car.license_plate})
                                        </Link>
                                    </li>
                                )}
                                {dashboardData.my_checked_out_tools && dashboardData.my_checked_out_tools.map(tool => (
                                    <li key={tool.id} className="py-2 flex items-center">
                                        <WrenchScrewdriverIcon className="h-5 w-5 mr-3 text-gray-400 flex-shrink-0"/>
                                        <Link to={`/tools/${tool.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">{tool.name}</Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">You have no equipment checked out.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;