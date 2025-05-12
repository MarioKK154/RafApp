// frontend/src/pages/HomePage.jsx
// Uncondensed and Refactored with Single Return
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function HomePage() {
  const { user, isAuthenticated, isLoading: authIsLoading, logout } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [timeLogError, setTimeLogError] = useState('');
  const [timeLogLoading, setTimeLogLoading] = useState(true);

  const fetchClockInStatus = useCallback(() => {
    if (!isAuthenticated) {
      setTimeLogLoading(false);
      setIsClockedIn(false); // Ensure state is reset if user logs out
      setCurrentLog(null);
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
        toast.error('Could not load clock-in status.');
      })
      .finally(() => {
        setTimeLogLoading(false);
      });
  }, [isAuthenticated]); // Removed authIsLoading as it's handled by outer condition

  useEffect(() => {
    if (!authIsLoading && isAuthenticated) { // Only fetch if auth is resolved and user is logged in
      fetchClockInStatus();
    } else if (!authIsLoading && !isAuthenticated) { // If auth is resolved and user is not logged in
        setTimeLogLoading(false); // Stop timelog loading
        setIsClockedIn(false);    // Reset timelog states
        setCurrentLog(null);
    }
  }, [isAuthenticated, authIsLoading, fetchClockInStatus]);

  const handleClockIn = async () => {
      const clockInData = {}; // Add optional project_id, task_id, notes here if UI is added
      setTimeLogError('');
      try {
          const response = await axiosInstance.post('/timelogs/clock-in', clockInData);
          setIsClockedIn(true);
          setCurrentLog(response.data);
          toast.success('Successfully clocked in!');
      } catch (err) {
           console.error("Error clocking in:", err);
           const errorMsg = err.response?.data?.detail || 'Failed to clock in.';
           setTimeLogError(errorMsg);
           toast.error(errorMsg);
      }
  };

  const handleClockOut = async () => {
       setTimeLogError('');
       try {
           const response = await axiosInstance.post('/timelogs/clock-out');
           setIsClockedIn(false);
           setCurrentLog(null);
           toast.success(`Successfully clocked out. Duration: ${response.data.duration || 'N/A'}`);
       } catch (err) {
           console.error("Error clocking out:", err);
           const errorMsg = err.response?.data?.detail || 'Failed to clock out.';
           setTimeLogError(errorMsg);
           toast.error(errorMsg);
       }
  };

  // Main return statement with conditional rendering inside
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-100 dark:bg-gray-800">
      {authIsLoading ? (
        <p className="text-xl text-gray-500 dark:text-gray-400">Loading user data...</p>
      ) : isAuthenticated && user ? (
        // User is Authenticated
        <div className="space-y-4 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            RafApp Dashboard
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, {user.full_name || user.email}! (Role: {user.role})
          </p>

          {/* TimeLog Section */}
          {timeLogLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading clock status...</p>
          ) : (
            <div className="p-4 border rounded dark:border-gray-600 bg-white dark:bg-gray-700 shadow">
              <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">Time Clock</h2>
              {timeLogError && <p className="text-red-500 text-sm mb-2">{timeLogError}</p>}
              {isClockedIn && currentLog ? (
                <div>
                  <p className="text-green-600 dark:text-green-400 font-medium">Currently Clocked In</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Started: {new Date(currentLog.start_time).toLocaleString()}
                  </p>
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
                  <button
                    onClick={handleClockIn}
                    className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200"
                  >
                    Clock In
                  </button>
                </div>
              )}
            </div>
          )}
          {/* End TimeLog Section */}

          {/* Links to other sections */}
          <Link
            to="/projects"
            className="block w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            View Projects
          </Link>
          {/* Logout button is in Navbar now */}
        </div>
      ) : (
        // User is NOT Authenticated
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Welcome to RafApp
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access your projects and tasks.
          </p>
          <Link
            to="/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomePage;