// frontend/src/pages/TimeLogsPage.jsx
// Uncondensed Version: Added duration formatting and initial structure for role-based views
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Link might be used later
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// --- Helper function to format ISO 8601 Duration ---
const formatIsoDuration = (isoDurationString) => {
    if (!isoDurationString) return 'N/A';

    // ISO 8601 duration format is PnYnMnDTnHnMnS
    // We are interested in PTnHnMnS part for time
    // Example: "PT11H19M25.61411S" or "PT45M" or "PT5S" or "PT1H"

    const timePart = isoDurationString.startsWith('P') ? isoDurationString.substring(isoDurationString.indexOf('T') + 1) : isoDurationString;
    if (!timePart || timePart === isoDurationString) return 'N/A'; // No 'T' found or invalid format

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const hourMatch = timePart.match(/(\d+)H/);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);

    const minuteMatch = timePart.match(/(\d+)M/);
    if (minuteMatch) minutes = parseInt(minuteMatch[1], 10);

    const secondMatch = timePart.match(/(\d+(\.\d+)?)S/);
    if (secondMatch) seconds = parseFloat(secondMatch[1]);

    // For simplicity, we'll round seconds for minute calculation
    if (seconds >= 30) {
        minutes += 1;
    }
    // If minutes become 60, increment hours
    if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
    }

    if (hours === 0 && minutes === 0 && seconds > 0) {
        return "< 1 minute"; // Or display seconds if preferred
    }
    if (hours === 0 && minutes === 0 && seconds === 0 && isoDurationString) {
        return "0m"; // Explicitly show 0 if it was a valid zero duration
    }

    let formatted = "";
    if (hours > 0) {
        formatted += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) { // Show 0m if there are hours but 0 minutes
        formatted += `${minutes}m`;
    }

    return formatted.trim() || 'N/A'; // Handle cases where result might be empty
};
// --- End Helper function ---


function TimeLogsPage() {
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

  // TODO: Add state for selected view (my logs, project logs, all logs for admin)
  // const [viewMode, setViewMode] = useState('my_logs');
  // const [selectedProjectId, setSelectedProjectId] = useState('');
  // const [projectsForFilter, setProjectsForFilter] = useState([]);

  const isAdmin = user && user.role === 'admin';
  const isProjectManager = user && user.role === 'project manager';

  // Fetch user's own timelogs initially
  const fetchMyTimeLogs = useCallback(() => {
    if (!authIsLoading && isAuthenticated) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/timelogs/me') // Endpoint for current user's logs
        .then(response => {
          setTimeLogs(response.data);
        })
        .catch(err => {
          console.error("Error fetching user's time logs:", err);
          setError('Failed to load your time logs.');
          toast.error('Failed to load your time logs.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
        setIsLoading(false); // Stop loading if not authenticated
        setError('You must be logged in to view time logs.');
    }
  }, [isAuthenticated, authIsLoading]);

  useEffect(() => {
    fetchMyTimeLogs();
  }, [fetchMyTimeLogs]);

  // --- Render Logic ---
  if (authIsLoading || isLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading time logs..." size="lg" /></div> );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
        <p className="text-red-600 mb-4">{error || 'Please log in to view time logs.'}</p>
        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go to Login
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center text-red-500">
        <p>{error}</p>
        <button onClick={fetchMyTimeLogs} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">My Time Logs</h1>

      {/* TODO: Add UI for Admins/PMs to switch views (all users, specific project) */}

      {timeLogs.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">You have no time logs recorded yet.</p>
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
              </tr>
            </thead>
            <tbody>
              {timeLogs.map(log => (
                <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="py-4 px-6">{new Date(log.start_time).toLocaleString()}</td>
                  <td className="py-4 px-6">{log.end_time ? new Date(log.end_time).toLocaleString() : 'Clocked In'}</td>
                  <td className="py-4 px-6">{formatIsoDuration(log.duration)}</td> {/* Use helper function */}
                  <td className="py-4 px-6">{log.project_id || '-'}</td>
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