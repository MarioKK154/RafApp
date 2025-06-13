// frontend/src/App.jsx
// Uncondensed Version: Added Tenant-Specific Dynamic Background
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from './context/AuthContext'; // Import useAuth to access tenant info

// Import Components & Pages
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
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
import UserBulkImportPage from './pages/UserBulkImportPage';
import TenantListPage from './pages/TenantListPage';
import TenantCreatePage from './pages/TenantCreatePage';
import TenantEditPage from './pages/TenantEditPage';
import AdminToolsPage from './pages/AdminToolsPage';
import ShoppingListPage from './pages/ShoppingListPage';
import GanttChartPage from './pages/GanttChartPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotFoundPage from './pages/NotFoundPage';


function App() {
    const { isAuthenticated, user } = useAuth(); // Get user from context

    // Define the style for the background image
    const backgroundStyle = isAuthenticated && user?.tenant?.background_image_url
        ? {
            backgroundImage: `url(${user.tenant.background_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed', // Keeps the background stationary on scroll
            backgroundRepeat: 'no-repeat',
        }
        : {}; // Empty object if no background image

    return (
        // Apply the style to a main wrapper div
        <div style={backgroundStyle} className="min-h-screen bg-gray-100 dark:bg-gray-800">
            <Navbar />
            <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
             />
            <main className="pt-4">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
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
                    <Route path="/users/import" element={<UserBulkImportPage />} />
                    <Route path="/users/edit/:userId" element={<UserEditPage />} />
                    <Route path="/tenants" element={<TenantListPage />} />
                    <Route path="/tenants/new" element={<TenantCreatePage />} />
                    <Route path="/tenants/edit/:tenantId" element={<TenantEditPage />} />
                    <Route path="/admin/tools" element={<AdminToolsPage />} />
                    <Route path="/shopping-list" element={<ShoppingListPage />} />
                    <Route path="/gantt" element={<GanttChartPage />} />
                    <Route path="/account-settings" element={<AccountSettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;