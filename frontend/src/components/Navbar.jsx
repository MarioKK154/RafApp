// frontend/src/components/Navbar.jsx
// Uncondensed Version: Added Gantt Link
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/logo.png'; // Assuming logo is here

function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user && user.role === 'admin';
    const isManager = user && user.role === 'project manager';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2" title="RafApp Home">
                     <img src={appLogo} alt="RafApp Logo" className="h-7 w-auto" /> {/* Adjusted logo size slightly */}
                </Link>

                <div className="flex items-center space-x-2 md:space-x-3"> {/* Adjusted spacing slightly */}
                    {isAuthenticated && (
                        <>
                            <Link to="/projects" className="text-sm md:text-base ...">Projects</Link>
                            <Link to="/tasks" className="text-sm md:text-base ...">Tasks</Link>
                            <Link to="/inventory" className="text-sm md:text-base ...">Inventory</Link>
                            <Link to="/timelogs" className="text-sm md:text-base ...">Time Logs</Link>
                            <Link to="/gantt" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Gantt Chart</Link> {/* New Link */}
                            {(isAdmin || isManager) && (
                                <Link to="/shopping-list" className="text-sm md:text-base ...">Shopping List</Link>
                            )}
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base ...">Manage Users</Link>
                            )}
                        </>
                    )}
                    {isAuthenticated && user ? (
                        <>
                            <span className="text-sm ...">Hi, {user.full_name || user.email}</span>
                            <button onClick={handleLogout} className="text-sm ...">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="...">Login</Link>
                            <Link to="/register" className="...">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
export default Navbar;