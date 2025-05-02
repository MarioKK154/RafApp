// frontend/src/pages/TimeLogsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

// Helper to format timedelta (optional, basic version here)
const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    // duration is like "X days, HH:MM:SS.ffffff" or "HH:MM:SS.ffffff"
    // For simplicity, just show the string, or parse for better format
    // Example: Extract HH:MM:SS part
    const parts = duration.split(':');
    if (parts.length >= 3) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        const seconds = parseFloat(parts[2]).toFixed(0).padStart(2, '0');
        // Check for days part
        const daysMatch = duration.match(/(\d+)\s+day/);
        const days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
        return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
    }
    return duration; // Fallback
};


function TimeLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();

  // Fetch user's time logs
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/timelogs/me') // Fetch logs for current user
        .then(response => {
          setLogs(response.data);
        })
        .catch(err => {
          console.error("Error fetching time logs:", err);
          setError('Failed to load time logs.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      setIsLoading(false);
      setError('You must be logged in to view time logs.');
    }
  }, [isAuthenticated, authIsLoading]);

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><p>Loading time logs...</p></div>;
  }

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view time logs.'}</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Login</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">My Time Logs</h1>

      {error && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      {logs.length === 0 && !error ? (
        <p className="text-gray-600 dark:text-gray-400">No time logs recorded yet.</p>
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">Start Time</th>
                        <th scope="col" className="py-3 px-6">End Time</th>
                        <th scope="col" className="py-3 px-6">Duration</th>
                        <th scope="col" className="py-3 px-6">Project ID</th>
                        <th scope="col" className="py-3 px-6">Task ID</th>
                        <th scope="col" className="py-3 px-6">Notes</th>
                        {/* Add Actions? Edit/Delete logs might be complex */}
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="py-4 px-6">{new Date(log.start_time).toLocaleString()}</td>
                            <td className="py-4 px-6">{log.end_time ? new Date(log.end_time).toLocaleString() : 'Clocked In'}</td>
                            <td className="py-4 px-6">{formatDuration(log.duration)}</td>
                            <td className="py-4 px-6">{log.project_id || '-'}</td>
                            <td className="py-4 px-6">{log.task_id || '-'}</td>
                            <td className="py-4 px-6">{log.notes || '-'}</td>
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