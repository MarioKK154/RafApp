// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Navbar() {
    // Get auth state and functions from context
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    // Check roles (safe check for user existence first)
    const isAdmin = user && user.role === 'admin';
    const isManager = user && user.role === 'project manager';
    const isTeamLeader = user && user.role === 'team leader'; // If needed later

    // Handle logout action
    const handleLogout = () => {
        logout(); // Clear auth state from context
        navigate('/login'); // Redirect to login page
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                {/* Brand/Logo Link */}
                <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
                    {/* TODO: Replace text with actual Logo component/image later */}
                    RafApp
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center space-x-2 md:space-x-4">
                    {/* Links visible only when logged in */}
                    {isAuthenticated && (
                        <>
                            <Link to="/projects" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Projects</Link>
                            <Link to="/tasks" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Tasks</Link>
                            <Link to="/inventory" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Inventory</Link>
                            <Link to="/timelogs" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Time Logs</Link>

                            {/* Show Shopping List link only to Admin/PM */}
                            {(isAdmin || isManager) && (
                                <Link to="/shopping-list" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Shopping List</Link>
                            )}
                            {/* Show Manage Users link only to Admin */}
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Manage Users</Link>
                            )}
                            {/* TODO: Add Gantt link later */}
                        </>
                    )}

                    {/* Login/Logout Section */}
                    {isAuthenticated && user ? (
                        <>
                            <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">
                                Hi, {user.full_name || user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300"
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