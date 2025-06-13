// frontend/src/components/Navbar.jsx
// Uncondensed Version: Added Tenant-Specific Logo
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import defaultLogo from '../assets/logo.png'; // Renamed for clarity, this is our fallback

function Navbar() {
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const isAdmin = currentUser && currentUser.role === 'admin';
    const isManager = currentUser && currentUser.role === 'project manager';
    const isSuperuser = currentUser && currentUser.is_superuser;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- Determine which logo to display ---
    // If user is logged in and their tenant has a logo_url, use it.
    // Otherwise, use the default local logo.
    const logoToDisplay = isAuthenticated && currentUser?.tenant?.logo_url
        ? currentUser.tenant.logo_url
        : defaultLogo;

    // Tenant name for the link title for better accessibility
    const tenantName = isAuthenticated && currentUser?.tenant?.name
        ? currentUser.tenant.name
        : "RafApp";
    // --- End logo logic ---

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2" title={`${tenantName} Home`}>
                     <img 
                        src={logoToDisplay}
                        alt={`${tenantName} Logo`}
                        className="h-16 w-auto object-contain" // Adjusted size slightly
                        // Add an error handler in case the tenant's logo URL is broken
                        onError={(e) => { e.target.onerror = null; e.target.src = defaultLogo; }}
                     />
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
                            {isSuperuser && (
                                <>
                                    <Link to="/tenants" className="text-sm md:text-base text-green-600 dark:text-green-400 hover:text-green-500 font-semibold">
                                        Manage Tenants
                                    </Link>
                                    <Link to="/admin/tools" className="text-sm md:text-base text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 font-semibold">
                                        Admin Tools
                                    </Link>
                                </>
                            )}
                        </>
                    )}

                    {isAuthenticated && currentUser ? (
                        <>
                            <Link
                                to="/account-settings"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hidden md:inline cursor-pointer"
                                title="Account Settings"
                            >
                                Hi, {currentUser.full_name || currentUser.email}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-sm md:text-base px-3 py-1 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Login</Link>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;