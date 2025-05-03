// frontend/src/App.jsx
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
import UserListPage from './pages/UserListPage';     // Import User List Page
import UserEditPage from './pages/UserEditPage';     // Import User Edit Page
import NotFoundPage from './pages/NotFoundPage';

// Navbar component (as before, but now includes Manage Users link for Admin)
function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user && user.role === 'admin'; // Check if admin

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-300">RafApp</Link>
                <div className="flex items-center space-x-2 md:space-x-4">
                    {isAuthenticated && (
                        <>
                            <Link to="/projects" className="...">Projects</Link>
                            <Link to="/tasks" className="...">Tasks</Link>
                            <Link to="/inventory" className="...">Inventory</Link>
                            <Link to="/timelogs" className="...">Time Logs</Link>
                            {/* --- RBAC: Show Manage Users link only to Admin --- */}
                            {isAdmin && (
                                <Link to="/users" className="text-sm md:text-base text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Manage Users</Link>
                            )}
                        </>
                    )}
                    {isAuthenticated && user ? (
                        <>
                            <span className="text-sm ... hidden md:inline">Hi, {user.full_name || user.email}</span>
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
                    {/* --- NEW User Management Routes --- */}
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/edit/:userId" element={<UserEditPage />} />
                    {/* --------------------------------- */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;