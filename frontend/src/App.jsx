// frontend/src/App.jsx
// Final, synchronized version with all correct routes.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

// Import Components & All Pages from your project
import Navbar from './components/Navbar';
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

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <AuthProvider>
            <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
                <Navbar />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        
                        {/* Project Routes */}
                        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
                        <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
                        
                        {/* Task Routes */}
                        <Route path="/tasks" element={<ProtectedRoute><TasksListPage /></ProtectedRoute>} />
                        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />
                        
                        {/* Other Routes from your project */}
                        <Route path="/inventory" element={<ProtectedRoute><InventoryListPage /></ProtectedRoute>} />
                        <Route path="/inventory/new" element={<ProtectedRoute><InventoryCreatePage /></ProtectedRoute>} />
                        <Route path="/inventory/edit/:itemId" element={<ProtectedRoute><InventoryEditPage /></ProtectedRoute>} />
                        <Route path="/timelogs" element={<ProtectedRoute><TimeLogsPage /></ProtectedRoute>} />
                        <Route path="/users" element={<ProtectedRoute><UserListPage /></ProtectedRoute>} />
                        <Route path="/users/new" element={<ProtectedRoute><UserCreatePage /></ProtectedRoute>} />
                        <Route path="/users/import" element={<ProtectedRoute><UserBulkImportPage /></ProtectedRoute>} />
                        <Route path="/users/edit/:userId" element={<ProtectedRoute><UserEditPage /></ProtectedRoute>} />
                        <Route path="/tenants" element={<ProtectedRoute><TenantListPage /></ProtectedRoute>} />
                        <Route path="/tenants/new" element={<ProtectedRoute><TenantCreatePage /></ProtectedRoute>} />
                        <Route path="/tenants/edit/:tenantId" element={<ProtectedRoute><TenantEditPage /></ProtectedRoute>} />
                        <Route path="/admin/tools" element={<ProtectedRoute><AdminToolsPage /></ProtectedRoute>} />
                        <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
                        <Route path="/gantt" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />
                        <Route path="/account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                        
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </main>
                <ToastContainer
                    position="bottom-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    theme="colored"
                />
            </div>
        </AuthProvider>
    );
}

export default App;