// frontend/src/components/Navbar.jsx
// Uncondensed and Manually Checked
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/logo.png'; // Assuming your logo is here

function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const isAdmin = user && user.role === 'admin';
    const isManager = user && user.role === 'project manager';
    // const isTeamLeader = user && user.role === 'team leader'; // For future use if needed

    const handleLogout = () => {
        logout(); // Clears auth state and token
        navigate('/login'); // Redirects to login page
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2" title="RafApp Home">
                     <img src={appLogo} alt="RafApp Logo" className="h-7 w-auto" /> {/* Adjusted logo size */}
                     {/* <span className="text-xl font-bold text-indigo-600 dark:text-indigo-300">RafApp</span> */}
                </Link>

                <div className="flex items-center space-x-2 md:space-x-3">
                    {isAuthenticated && (
                        <>
                            <Link to="/projects" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Projects</Link>
                            <Link to="/tasks" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Tasks</Link>
                            <Link to="/inventory" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Inventory</Link>
                            <Link to="/timelogs" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Time Logs</Link>
                            <Link to="/gantt" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Gantt Chart</Link>
                            {(isAdmin || isManager) && (
                                <Link to="/shopping-list" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Shopping List</Link>
                            )}
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Manage Users</Link>
                            )}
                        </>
                    )}

                    {isAuthenticated && user ? (
                        <>
                            <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">
                                Hi, {user.full_name || user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-sm md:text-base px-3 py-1 border border-gray-300 rounded-md shadow-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Login</Link>
                            <Link to="/register" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;