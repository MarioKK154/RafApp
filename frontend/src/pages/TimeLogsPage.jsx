// frontend/src/pages/TimeLogsPage.jsx
// ABSOLUTELY FINAL Meticulously Checked Uncondensed Version
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// Helper function to format ISO 8601 Duration
const formatIsoDuration = (isoDurationString) => {
    if (!isoDurationString) return 'N/A';
    const timePart = isoDurationString.startsWith('P') ? isoDurationString.substring(isoDurationString.indexOf('T') + 1) : isoDurationString;
    if (!timePart || timePart === isoDurationString) return 'N/A';
    let hours = 0, minutes = 0, seconds = 0;
    const hourMatch = timePart.match(/(\d+)H/);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);
    const minuteMatch = timePart.match(/(\d+)M/);
    if (minuteMatch) minutes = parseInt(minuteMatch[1], 10);
    const secondMatch = timePart.match(/(\d+(\.\d+)?)S/);
    if (secondMatch) seconds = parseFloat(secondMatch[1]);
    if (seconds >= 30) minutes += 1;
    if (minutes >= 60) { hours += Math.floor(minutes / 60); minutes = minutes % 60; }
    if (hours === 0 && minutes === 0 && seconds > 0) return "< 1m";
    if (hours === 0 && minutes === 0 && seconds === 0 && isoDurationString) return "0m";
    let formatted = "";
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0 || hours > 0) formatted += `${minutes}m`;
    return formatted.trim() || 'N/A';
};

const TIMELOG_SORTABLE_FIELDS = [
    { label: 'Start Time', value: 'start_time' },
    { label: 'End Time', value: 'end_time' },
    { label: 'Duration', value: 'duration' },
];

function TimeLogsPage() {
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [viewMode, setViewMode] = useState('my_logs');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('start_time');
  const [sortDir, setSortDir] = useState('desc');

  const [projectsForFilter, setProjectsForFilter] = useState([]);
  const [usersForFilter, setUsersForFilter] = useState([]);
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);

  const isAdmin = user && user.role === 'admin';
  const isProjectManager = user && user.role === 'project manager';

  const fetchPrerequisites = useCallback(() => {
    if (!authIsLoading && isAuthenticated && (isAdmin || isProjectManager)) {
      setPrerequisitesLoading(true);
      const promises = [];
      promises.push(axiosInstance.get('/projects/')); // Admins/PMs can filter by project
      if (isAdmin) {
        promises.push(axiosInstance.get('/users/')); // Only Admins can filter by user
      }

      Promise.all(promises)
        .then(responses => {
          setProjectsForFilter(responses[0].data);
          if (isAdmin) setUsersForFilter(responses[1].data);
        })
        .catch(err => { console.error("Error fetching prerequisites:", err); toast.error("Could not load filters."); })
        .finally(() => { setPrerequisitesLoading(false); });
    } else {
        setPrerequisitesLoading(false);
    }
  }, [isAuthenticated, authIsLoading, isAdmin, isProjectManager]);

  const fetchTimeLogs = useCallback(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoading(true);
      setError('');

      let endpoint = '/timelogs/me';
      const params = {
        start_date: startDate || null,
        end_date: endDate || null,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      if ((isAdmin || isProjectManager) && viewMode !== 'my_logs') {
        endpoint = '/timelogs/';
        if (viewMode === 'by_project' && filterProjectId) params.project_id = filterProjectId;
        if (viewMode === 'by_user' && filterUserId && isAdmin) params.user_id = filterUserId;
      }
      
      axiosInstance.get(endpoint, { params })
        .then(response => { setTimeLogs(response.data); })
        .catch(err => {
          const errorMsg = err.response?.data?.detail || 'Failed to load time logs.';
          setError(errorMsg);
          toast.error(errorMsg);
        })
        .finally(() => { setIsLoading(false); });
    }
  }, [isAuthenticated, authIsLoading, viewMode, filterProjectId, filterUserId, startDate, endDate, sortBy, sortDir, isAdmin, isProjectManager]);

  useEffect(() => {
    fetchPrerequisites();
  }, [fetchPrerequisites]);

  useEffect(() => {
    if (!authIsLoading && !prerequisitesLoading) {
        fetchTimeLogs();
    }
  }, [fetchTimeLogs, authIsLoading, prerequisitesLoading]);

  // --- Render Logic ---
  if (authIsLoading || prerequisitesLoading) {
    return (<div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading page data..." size="lg"/></div>);
  }

  if (!isAuthenticated) {
    return (<div className="min-h-screen flex flex-col justify-center items-center text-center p-6"><p className="text-red-600 mb-4">Please log in to view time logs.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link></div>);
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Time Logs</h1>
      
      {/* Filter and Sort Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
        {(isAdmin || isProjectManager) && (
            <div>
                <label htmlFor="viewMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">View Mode</label>
                <select id="viewMode" value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="my_logs">My Logs</option>
                    <option value="by_project">By Project</option>
                    {isAdmin && <option value="by_user">By User</option>}
                </select>
            </div>
        )}
        {viewMode === 'by_project' && (
            <div>
                <label htmlFor="filterProjectId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                <select id="filterProjectId" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="">-- Select Project --</option>
                    {projectsForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        )}
        {viewMode === 'by_user' && isAdmin && (
            <div>
                <label htmlFor="filterUserId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                <select id="filterUserId" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="">-- Select User --</option>
                    {usersForFilter.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
            </div>
        )}
        <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"/>
        </div>
        <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"/>
        </div>
        <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
            <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {TIMELOG_SORTABLE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="sortDir" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
            <select id="sortDir" value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
            </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading time logs..." />
      ) : error ? (
        <div className="text-center py-10 text-red-500"><p>{error}</p></div>
      ) : timeLogs.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No time logs found for the selected criteria.</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {viewMode !== 'my_logs' && <th scope="col" className="py-3 px-6">User</th>}
                <th scope="col" className="py-3 px-6">Start Time</th>
                <th scope="col" className="py-3 px-6">End Time</th>
                <th scope="col" className="py-3 px-6">Duration</th>
                <th scope="col" className="py-3 px-6">Project</th>
                <th scope="col" className="py-3 px-6">Task ID</th>
                <th scope="col" className="py-3 px-6">Notes</th>
              </tr>
            </thead>
            <tbody>
              {timeLogs.map(log => (
                <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  {viewMode !== 'my_logs' && <td className="py-4 px-6">{log.user?.full_name || log.user?.email || `ID: ${log.user_id}`}</td>}
                  <td className="py-4 px-6">{new Date(log.start_time).toLocaleString()}</td>
                  <td className="py-4 px-6">{log.end_time ? new Date(log.end_time).toLocaleString() : 'Clocked In'}</td>
                  <td className="py-4 px-6">{formatIsoDuration(log.duration)}</td>
                  <td className="py-4 px-6">{log.project?.name || log.project_id || '-'}</td>
                  <td className="py-4 px-6">{log.task_id || '-'}</td>
                  <td className="py-4 px-6 whitespace-pre-wrap">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TimeLogsPage;