// frontend/src/pages/TimeLogsPage.jsx
// Card layout + Search/Filters + Corrected data fetching logic

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClockIcon, UserCircleIcon, BriefcaseIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import Select from 'react-select';

// Debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

// Format duration from hours helper
const formatDurationFromHours = (totalHours) => {
    if (totalHours === null || totalHours === undefined) return 'In Progress';
    if (totalHours < 0) return 'Invalid';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
};

const SORT_BY_OPTIONS = [
    { value: 'start_time', label: 'Start Time' },
    { value: 'end_time', label: 'End Time' },
    { value: 'duration', label: 'Duration' },
];
const SORT_DIR_OPTIONS = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
];

function TimeLogsPage() {
    const [timeLogs, setTimeLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    // State for filters, sorting, search
    const [projectOptions, setProjectOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState(SORT_BY_OPTIONS[0]);
    const [sortDir, setSortDir] = useState(SORT_DIR_OPTIONS[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isAdminOrManager = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project manager' || currentUser.is_superuser);

    // Fetch projects and users for filter dropdowns
    const fetchFilters = useCallback(async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects/'),
                axiosInstance.get('/users/')
            ]);
            setProjectOptions([{ value: '', label: 'All Projects' }, ...projRes.data.map(p => ({ value: p.id, label: p.name }))]);
            setUserOptions([{ value: '', label: 'All Users' }, ...userRes.data.map(u => ({ value: u.id, label: u.full_name || u.email }))]);
        } catch (err) {
            toast.error("Failed to load filter options.");
        }
    }, []);

    // Fetch time logs based on filters/sort/search
    const fetchTimeLogs = useCallback(() => {
        setIsLoading(true);
        setError('');
        
        const endpoint = isAdminOrManager ? '/timelogs/' : '/timelogs/me';
        
        const params = {
            sort_by: sortBy?.value || 'start_time',
            sort_dir: sortDir?.value || 'desc',
            search: debouncedSearchTerm || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            limit: 200,
            ...(isAdminOrManager && {
                project_id: selectedProject?.value || undefined,
                user_id: selectedUser?.value || undefined,
            })
        };

        axiosInstance.get(endpoint, { params })
            .then(response => {
                setTimeLogs(response.data);
            })
            .catch(err => {
                setError('Failed to fetch time logs.');
                console.error(err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [isAdminOrManager, selectedProject, selectedUser, startDate, endDate, debouncedSearchTerm, sortBy, sortDir]);

    // --- THIS IS THE CORRECTED LOGIC ---
    useEffect(() => {
        // 1. Fetch filters IF the user is an admin or manager
        if (isAdminOrManager) {
            fetchFilters();
        }
        // 2. Fetch time logs immediately (it will use the correct endpoint and default filters)
        fetchTimeLogs();
    }, [fetchFilters, fetchTimeLogs, isAdminOrManager]);
    // Note: We've simplified the useEffect hooks. The fetchTimeLogs function
    // is stable and will be re-run ONLY when its dependencies change (i.e., a filter changes).
    // This is a correction to the previous explanation. The main `useEffect` runs once on mount.
    // The `fetchTimeLogs` `useCallback` is rebuilt when filters change, triggering the `useEffect` below.
    
    useEffect(() => {
        fetchTimeLogs();
    }, [fetchTimeLogs]); // This hook re-runs fetchTimeLogs *whenever the function itself changes* (i.e., when its dependencies like filters change)

    // --- END CORRECTION ---


    if (isLoading && timeLogs.length === 0) {
        return <LoadingSpinner text="Loading time logs..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Time Logs</h1>
            </div>

            {/* Controls: Search, Filters, Sort */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col gap-4 text-sm">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                     <div className="relative flex-grow sm:max-w-xs">
                         <input type="text" placeholder="Search notes, project, user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 text-sm"/>
                         <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                     </div>
                     <div className="flex items-center gap-2">
                         <label htmlFor="start_date_filter">From:</label>
                         <input type="date" id="start_date_filter" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm text-sm p-1.5"/>
                         <label htmlFor="end_date_filter">To:</label>
                         <input type="date" id="end_date_filter" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 shadow-sm text-sm p-1.5"/>
                     </div>
                 </div>
                 {(isAdminOrManager) && (
                     <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                              <Select options={projectOptions} value={selectedProject} onChange={setSelectedProject} placeholder="Filter Project..." isClearable className="min-w-[150px] react-select-container z-20" classNamePrefix="react-select"/>
                              <Select options={userOptions} value={selectedUser} onChange={setSelectedUser} placeholder="Filter User..." isClearable className="min-w-[150px] react-select-container z-20" classNamePrefix="react-select"/>
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="font-medium text-gray-700 dark:text-gray-300">Sort:</label>
                              <Select options={SORT_BY_OPTIONS} value={sortBy} onChange={setSortBy} className="min-w-[120px] react-select-container z-10" classNamePrefix="react-select"/>
                              <Select options={SORT_DIR_OPTIONS} value={sortDir} onChange={setSortDir} className="min-w-[100px] react-select-container z-10" classNamePrefix="react-select"/>
                          </div>
                     </div>
                 )}
            </div>


            {error && <div className="text-center py-10 text-red-500">{error}</div>}
            {isLoading && timeLogs.length > 0 && <LoadingSpinner text="Refreshing logs..." />}

            {!isLoading && !error && timeLogs.length > 0 ? (
                <div className="space-y-4">
                    {timeLogs.map(log => (
                        <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="p-4 flex flex-wrap justify-between items-start gap-4">
                                <div className="flex items-center gap-3 flex-grow min-w-[250px]">
                                    {log.user?.profile_picture_url ? (
                                        <img src={log.user.profile_picture_url} alt={log.user.full_name || log.user.email} className="h-10 w-10 rounded-full object-cover flex-shrink-0"/>
                                    ) : (
                                        <UserCircleIcon className="h-10 w-10 text-gray-400 flex-shrink-0"/>
                                    )}
                                    <div>
                                         <p className="text-sm font-medium text-gray-900 dark:text-white">
                                             {log.user?.full_name || log.user?.email || `User ID: ${log.user_id}`}
                                         </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(log.start_time).toLocaleString()} - {log.end_time ? new Date(log.end_time).toLocaleTimeString() : 'Ongoing'}
                                          </p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[150px]">
                                    {log.project_id && (
                                        <p className="flex items-center gap-1">
                                            <BriefcaseIcon className="h-4 w-4"/>
                                            <Link to={`/projects/edit/${log.project_id}`} className="hover:underline">{log.project?.name || `Project ${log.project_id}`}</Link>
                                        </p>
                                    )}
                                    {log.task_id && (
                                         <p className="flex items-center gap-1 mt-1 text-xs">
                                             <PencilIcon className="h-3 w-3"/>
                                             <Link to={`/tasks/${log.task_id}`} className="hover:underline">{log.task?.title || `Task ${log.task_id}`}</Link>
                                         </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-right space-y-1">
                                     <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                         {formatDurationFromHours(log.duration_hours)}
                                     </p>
                                     {log.notes && <p className="text-xs text-gray-500 dark:text-gray-400 italic" title={log.notes}>Notes</p>}
                                </div>
                            </div>
                            {log.notes && (
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-600">
                                    {log.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                 !isLoading && !error && <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Time Logs Found</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                         {searchTerm || startDate || endDate || selectedProject || selectedUser ? 'No logs match your current filters.' : 'There are no time logs recorded yet.'}
                     </p>
                 </div>
            )}
        </div>
    );
}

export default TimeLogsPage;