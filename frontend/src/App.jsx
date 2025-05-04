// frontend/src/App.jsx
// Uncondensed Version: Using dedicated Navbar component
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import the Navbar component
import Navbar from './components/Navbar';

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
import ShoppingListPage from './pages/ShoppingListPage';
import NotFoundPage from './pages/NotFoundPage';
// TODO: Import GanttPage when created

function App() {
    // No need for auth logic here anymore, Navbar handles it
    return (
        <>
            {/* Render the Navbar component */}
            <Navbar />

            {/* Main content area where routes are rendered */}
            <main className="pt-4"> {/* Optional padding below navbar */}
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes (Protection logic primarily inside pages/context) */}
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
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/new" element={<UserCreatePage />} />
                    <Route path="/users/edit/:userId" element={<UserEditPage />} />
                    <Route path="/shopping-list" element={<ShoppingListPage />} />
                    {/* TODO: Add Gantt route */}

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;