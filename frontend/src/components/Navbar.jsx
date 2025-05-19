// frontend/src/components/Navbar.jsx
// Uncondensed and Manually Checked - Corrected 'user' vs 'currentUser'
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/logo.png'; // Assuming your logo is here

function Navbar() {
    // Destructure user as currentUser for clarity within this component
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // Use currentUser for role checks
    const isAdmin = currentUser && currentUser.role === 'admin';
    const isManager = currentUser && currentUser.role === 'project manager';
    const isSuperuser = currentUser && currentUser.is_superuser;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2" title="RafApp Home">
                     <img src={appLogo} alt="RafApp Logo" className="h-7 w-auto" />
                </Link>

                <div className="flex items-center space-x-2 md:space-x-3">
                    {isAuthenticated && ( // Check isAuthenticated first
                        <>
                            <Link to="/projects" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Projects</Link>
                            <Link to="/tasks" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Tasks</Link>
                            <Link to="/inventory" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Inventory</Link>
                            <Link to="/timelogs" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Time Logs</Link>
                            <Link to="/gantt" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Gantt Chart</Link>

                            {/* Conditional links based on roles (using currentUser) */}
                            {(isAdmin || isManager) && (
                                <Link to="/shopping-list" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Shopping List</Link>
                            )}
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Manage Users</Link>
                            )}
                            {isSuperuser && ( // Use isSuperuser for Admin Tools link
                                 <Link to="/admin/tools" className="text-sm md:text-base text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 font-semibold">
                                    Admin Tools
                                </Link>
                            )}
                        </>
                    )}

                    {/* User Greeting and Logout OR Login/Register Links */}
                    {isAuthenticated && currentUser ? ( // Use currentUser here
                        <>
                            <Link
                                to="/account-settings"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hidden md:inline cursor-pointer"
                                title="Account Settings"
                            >
                                Hi, {currentUser.full_name || currentUser.email} {/* Use currentUser */}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-sm md:text-base px-3 py-1 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Login</Link>
                            {/* Public registration link is removed */}
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;