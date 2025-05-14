// frontend/src/pages/HomePage.jsx
// Uncondensed Version: Corrected variable name in Admin project dropdown
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // useNavigate was not used here
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function HomePage() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [timeLogError, setTimeLogError] = useState('');
  const [timeLogLoading, setTimeLogLoading] = useState(true);

  const [assignedProjects, setAssignedProjects] = useState([]);
  const [selectedClockInProjectId, setSelectedClockInProjectId] = useState('');

  const isAdmin = user && user.role === 'admin';

  const fetchData = useCallback(() => {
    if (!isAuthenticated) {
      setTimeLogLoading(false);
      setIsClockedIn(false);
      setCurrentLog(null);
      setAssignedProjects([]);
      return;
    }

    setTimeLogLoading(true);
    setTimeLogError('');

    const statusPromise = axiosInstance.get('/timelogs/status')
      .then(response => {
        setIsClockedIn(response.data.is_clocked_in);
        setCurrentLog(response.data.current_log);
      })
      .catch(err => {
        console.error("Error fetching timelog status:", err);
        setTimeLogError('Could not load clock-in status.');
        toast.error('Could not load clock-in status.');
      });

    // Populate assignedProjects from the user object in AuthContext
    if (user && user.assigned_projects) {
        setAssignedProjects(user.assigned_projects);
        if (user.assigned_projects.length === 1 && !isAdmin) {
            setSelectedClockInProjectId(user.assigned_projects[0].id.toString());
        } else if (user.assigned_projects.length > 0 && !isAdmin && !selectedClockInProjectId) {
            // If multiple projects and none selected, keep selectedClockInProjectId as ''
            // to force user selection.
        }
    } else if (user && !user.assigned_projects) {
        console.warn("HomePage: user object present but assigned_projects is missing or empty.");
        setAssignedProjects([]);
    }

    Promise.all([statusPromise])
      .finally(() => {
        setTimeLogLoading(false);
      });

  }, [isAuthenticated, user, isAdmin]); // Removed selectedClockInProjectId as it's an effect of user/projects

  useEffect(() => {
    if (!authIsLoading) {
        fetchData();
    }
  }, [isAuthenticated, authIsLoading, fetchData]);

  const handleClockIn = async () => {
      setTimeLogError('');
      if (!isAdmin && !selectedClockInProjectId && assignedProjects.length > 0) { // Ensure non-admin selects if projects are available
          toast.error("Please select a project to clock in.");
          return;
      }
      // If non-admin has no assigned projects, they shouldn't be able to click (button disabled)
      // but double check here.
      if (!isAdmin && assignedProjects.length === 0) {
          toast.error("You have no projects assigned to clock into.");
          return;
      }


      const clockInData = {
          project_id: selectedClockInProjectId ? parseInt(selectedClockInProjectId, 10) : null,
      };

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
           setSelectedClockInProjectId(''); // Reset project selection
           toast.success(`Successfully clocked out. Duration: ${response.data.duration || 'N/A'}`);
       } catch (err) {
           console.error("Error clocking out:", err);
           const errorMsg = err.response?.data?.detail || 'Failed to clock out.';
           setTimeLogError(errorMsg);
           toast.error(errorMsg);
       }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><p className="text-xl text-gray-500 dark:text-gray-400">Loading user data...</p></div> );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-100 dark:bg-gray-800">
      {isAuthenticated && user ? (
        <div className="space-y-4 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            RafApp Dashboard
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, {user.full_name || user.email}! (Role: {user.role})
          </p>

          {timeLogLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading clock status...</p>
          ) : (
            <div className="p-4 border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
              <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Time Clock</h2>
              {timeLogError && <p className="text-red-500 text-sm mb-2">{timeLogError}</p>}

              {isClockedIn && currentLog ? (
                <div className="space-y-2">
                  <p className="text-green-600 dark:text-green-400 font-medium">Currently Clocked In</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Started: {new Date(currentLog.start_time).toLocaleString()}
                  </p>
                  {currentLog.project_id && (
                     <p className="text-xs text-gray-500 dark:text-gray-400">
                         Project: {(assignedProjects.find(p => p.id === currentLog.project_id))?.name || `ID ${currentLog.project_id}`}
                     </p>
                  )}
                  <button
                    onClick={handleClockOut}
                    className="mt-2 w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 transition duration-150"
                  >
                    Clock Out
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600 dark:text-gray-400">You are currently clocked out.</p>
                  {!isAdmin && (
                    <div>
                        <label htmlFor="clockInProject" className="sr-only">Select Project</label>
                        <select
                            id="clockInProject"
                            value={selectedClockInProjectId}
                            onChange={(e) => setSelectedClockInProjectId(e.target.value)}
                            className="block w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            <option value="" disabled={assignedProjects.length === 0 && selectedClockInProjectId !== ''}>
                              {assignedProjects.length > 0 ? "-- Select Project --" : "No projects assigned"}
                            </option>
                            {assignedProjects.map(proj => (
                                <option key={proj.id} value={proj.id.toString()}>
                                    {proj.name}
                                </option>
                            ))}
                        </select>
                    </div>
                  )}
                   {isAdmin && ( // Admin can also select a project if they wish
                     <div>
                         <label htmlFor="clockInProjectAdmin" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Select Project (Optional for Admin)</label>
                         <select
                             id="clockInProjectAdmin"
                             value={selectedClockInProjectId}
                             onChange={(e) => setSelectedClockInProjectId(e.target.value)}
                             className="block w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                         >
                             <option value="">-- No Specific Project --</option>
                             {/* CORRECTED: Use assignedProjects here. Admins will see their own assigned projects. */}
                             {/* If an admin needs to see ALL projects, that would require fetching all projects separately. */}
                             {assignedProjects.map(proj => (
                                 <option key={proj.id} value={proj.id.toString()}>
                                     {proj.name}
                                 </option>
                             ))}
                         </select>
                     </div>
                   )}
                  <button
                    onClick={handleClockIn}
                    disabled={!isAdmin && !selectedClockInProjectId && assignedProjects.length > 0}
                    className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-150 disabled:opacity-50"
                  >
                    Clock In
                  </button>
                  {!isAdmin && assignedProjects.length === 0 &&
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        You must be assigned to a project to clock in. Please contact an administrator.
                    </p>
                  }
                </div>
              )}
            </div>
          )}
          <Link to="/projects" className="block w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-150">
            View Projects
          </Link>
        </div>
      ) : (
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