// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance'; // Use our instance

function HomePage() {
  const { user, isAuthenticated, isLoading: authIsLoading, logout } = useAuth();
  // --- TimeLog State ---
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [timeLogError, setTimeLogError] = useState('');
  const [timeLogLoading, setTimeLogLoading] = useState(true); // Separate loading for timelog status

  // Function to fetch current clock-in status
  const fetchClockInStatus = () => {
    if (!isAuthenticated) {
        setTimeLogLoading(false); // Not authenticated, stop loading
        return;
    }
    setTimeLogLoading(true);
    setTimeLogError('');
    axiosInstance.get('/timelogs/status')
      .then(response => {
        setIsClockedIn(response.data.is_clocked_in);
        setCurrentLog(response.data.current_log);
      })
      .catch(err => {
        console.error("Error fetching timelog status:", err);
        setTimeLogError('Could not load clock-in status.');
      })
      .finally(() => {
        setTimeLogLoading(false);
      });
  };

  // Fetch status when auth state is confirmed
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      fetchClockInStatus();
    } else if (!authIsLoading && !isAuthenticated) {
        setTimeLogLoading(false); // Ensure loading stops if not authenticated initially
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authIsLoading]); // Re-fetch if auth status changes

  // Handle Clock-In
  const handleClockIn = async () => {
      // TODO: Add optional inputs for project_id, task_id, notes for clock-in data
      const clockInData = {}; // Add optional data here if needed
      setTimeLogError('');
      try {
          const response = await axiosInstance.post('/timelogs/clock-in', clockInData);
          setIsClockedIn(true);
          setCurrentLog(response.data);
      } catch (err) {
           console.error("Error clocking in:", err);
           setTimeLogError(err.response?.data?.detail || 'Failed to clock in.');
      }
  };

  // Handle Clock-Out
  const handleClockOut = async () => {
       setTimeLogError('');
       try {
           await axiosInstance.post('/timelogs/clock-out');
           setIsClockedIn(false);
           setCurrentLog(null);
       } catch (err) {
           console.error("Error clocking out:", err);
           setTimeLogError(err.response?.data?.detail || 'Failed to clock out.');
       }
  };


  // --- Render Logic ---
  // Combine loading states
  const isLoading = authIsLoading || timeLogLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-100 dark:bg-gray-800">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        RafApp Dashboard
      </h1>

      {isAuthenticated && user ? (
        <div className="space-y-4 w-full max-w-md">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, {user.full_name || user.email}! (Role: {user.role})
          </p>

          {/* --- TimeLog Section --- */}
          <div className="p-4 border rounded dark:border-gray-600 bg-white dark:bg-gray-700 shadow">
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Time Clock</h2>
            {timeLogError && <p className="text-red-500 text-sm mb-2">{timeLogError}</p>}
            {isClockedIn && currentLog ? (
              <div>
                <p className="text-green-600 dark:text-green-400 font-medium">Currently Clocked In</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Started: {new Date(currentLog.start_time).toLocaleString()}
                </p>
                {/* Display project/task/notes if available in currentLog */}
                <button
                  onClick={handleClockOut}
                  className="mt-3 w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition duration-200"
                >
                  Clock Out
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400">You are currently clocked out.</p>
                {/* TODO: Add inputs for project/task/notes before clocking in */}
                <button
                  onClick={handleClockIn}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200"
                >
                  Clock In
                </button>
              </div>
            )}
          </div>
          {/* --- End TimeLog Section --- */}


          {/* Links to other sections */}
          <Link
            to="/projects"
            className="block w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            View Projects
          </Link>
           {/* TODO: Add links to Tasks, Inventory, Time Log History */}

          <button
            onClick={logout}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access your projects and tasks.
          </p>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomePage;