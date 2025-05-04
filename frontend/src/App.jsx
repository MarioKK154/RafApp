// frontend/src/App.jsx
// Uncondensed Version: Added Shopping List Route
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectEditPage from './pages/ProjectEditPage';
import TasksListPage from './pages/TasksListPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskEditPage from './pages/TaskEditPage';
import InventoryListPage from './pages/InventoryListPage';
import InventoryCreatePage from './pages/InventoryCreatePage';
import InventoryEditPage from './pages/InventoryEditPage';
import TimeLogsPage from './pages/TimeLogsPage';
import UserListPage from './pages/UserListPage';
import UserCreatePage from './pages/UserCreatePage';
import UserEditPage from './pages/UserEditPage';
import ShoppingListPage from './pages/ShoppingListPage'; // Import Shopping List Page
import NotFoundPage from './pages/NotFoundPage';

// Navbar component
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
                <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-300">RafApp</Link>
                <div className="flex items-center space-x-2 md:space-x-4">
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
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Manage Users</Link>
                            )}
                        </>
                    )}
                    {isAuthenticated && user ? (
                        <>
                            <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">Hi, {user.full_name || user.email}</span>
                            <button onClick={handleLogout} className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">
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


function App() {
    return (
        <>
            <Navbar />
            <main className="pt-4">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/new" element={<ProjectCreatePage />} />
                    <Route path="/projects/edit/:projectId" element={<ProjectEditPage />} />
                    <Route path="/tasks" element={<TasksListPage />} />
                    <Route path="/tasks/new" element={<TaskCreatePage />} />
                    <Route path="/tasks/edit/:taskId" element={<TaskEditPage />} />
                    <Route path="/inventory" element={<InventoryListPage />} />
                    <Route path="/inventory/new" element={<InventoryCreatePage />} />
                    <Route path="/inventory/edit/:itemId" element={<InventoryEditPage />} />
                    <Route path="/timelogs" element={<TimeLogsPage />} />
                    {/* User Management Routes */}
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/new" element={<UserCreatePage />} />
                    <Route path="/users/edit/:userId" element={<UserEditPage />} />
                    {/* --- NEW Shopping List Route --- */}
                    <Route path="/shopping-list" element={<ShoppingListPage />} />
                    {/* ---------------------------- */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;