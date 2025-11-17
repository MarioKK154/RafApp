// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar'; // Import Sidebar

// Import All Page Components
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectEditPage from './pages/ProjectEditPage';
import TasksListPage from './pages/TasksListPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskEditPage from './pages/TaskEditPage';
import GlobalInventoryPage from './pages/GlobalInventoryPage';
import InventoryCatalogPage from './pages/InventoryCatalogPage';
import InventoryCatalogCreatePage from './pages/InventoryCatalogCreatePage';
import InventoryCatalogEditPage from './pages/InventoryCatalogEditPage';
import ToolInventoryPage from './pages/ToolInventoryPage';
import ToolCreatePage from './pages/ToolCreatePage';
import ToolEditPage from './pages/ToolEditPage';
import ToolDetailsPage from './pages/ToolDetailsPage';
import CarFleetPage from './pages/CarFleetPage';
import CarDetailsPage from './pages/CarDetailsPage';
import CarCreatePage from './pages/CarCreatePage';
import CarEditPage from './pages/CarEditPage';
import ShopListPage from './pages/ShopListPage';
import ShopCreatePage from './pages/ShopCreatePage';
import ShopEditPage from './pages/ShopEditPage';
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
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import OfferPage from './pages/OfferPage';
import LawsPage from './pages/LawsPage';
import TutorialsPage from './pages/TutorialsPage';
import LaborCatalogListPage from './pages/LaborCatalogListPage';
import LaborCatalogCreatePage from './pages/LaborCatalogCreatePage';
import LaborCatalogEditPage from './pages/LaborCatalogEditPage';

// --- 1. ADD THESE IMPORTS ---
import CustomerListPage from './pages/CustomerListPage';
import CustomerCreatePage from './pages/CustomerCreatePage';
import CustomerEditPage from './pages/CustomerEditPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        // You might want a more sophisticated loading screen here
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <AuthProvider>
            {/* Main layout using Flexbox: Sidebar on left, main content fills remaining space */}
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                {/* Sidebar Component */}
                <Sidebar />

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {/* Define all application routes */}
                    <Routes>
                        {/* Public Route */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Protected Routes */}
                        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

                        {/* Project Routes */}
                        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
                        <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />

                        {/* --- 2. ADD THESE NEW ROUTES --- */}
                        <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
                        <Route path="/customers/new" element={<ProtectedRoute><CustomerCreatePage /></ProtectedRoute>} />
                        <Route path="/customers/edit/:customerId" element={<ProtectedRoute><CustomerEditPage /></ProtectedRoute>} />
                        {/* --- END NEW ROUTES --- */}

                        {/* Task Routes */}
                        <Route path="/tasks" element={<ProtectedRoute><TasksListPage /></ProtectedRoute>} />
                        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

                        {/* Inventory Routes (Revised) */}
                        <Route path="/inventory" element={<ProtectedRoute><GlobalInventoryPage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog" element={<ProtectedRoute><InventoryCatalogPage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog/new" element={<ProtectedRoute><InventoryCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog/edit/:itemId" element={<ProtectedRoute><InventoryCatalogEditPage /></ProtectedRoute>} />

                        {/* Tool Inventory Routes */}
                        <Route path="/tools" element={<ProtectedRoute><ToolInventoryPage /></ProtectedRoute>} />
                        <Route path="/tools/new" element={<ProtectedRoute><ToolCreatePage /></ProtectedRoute>} />
                        <Route path="/tools/edit/:toolId" element={<ProtectedRoute><ToolEditPage /></ProtectedRoute>} />
                        <Route path="/tools/:toolId" element={<ProtectedRoute><ToolDetailsPage /></ProtectedRoute>} />

                        {/* Car Fleet Routes */}
                        <Route path="/cars" element={<ProtectedRoute><CarFleetPage /></ProtectedRoute>} />
                        <Route path="/cars/new" element={<ProtectedRoute><CarCreatePage /></ProtectedRoute>} />
                        <Route path="/cars/edit/:carId" element={<ProtectedRoute><CarEditPage /></ProtectedRoute>} />
                        <Route path="/cars/:carId" element={<ProtectedRoute><CarDetailsPage /></ProtectedRoute>} />

                        {/* Shop Routes */}
                        <Route path="/shops" element={<ProtectedRoute><ShopListPage /></ProtectedRoute>} />
                        <Route path="/shops/new" element={<ProtectedRoute><ShopCreatePage /></ProtectedRoute>} />
                        <Route path="/shops/edit/:shopId" element={<ProtectedRoute><ShopEditPage /></ProtectedRoute>} />

                         {/* Labor Catalog Routes */}
                        <Route path="/labor-catalog" element={<ProtectedRoute><LaborCatalogListPage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/new" element={<ProtectedRoute><LaborCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/edit/:itemId" element={<ProtectedRoute><LaborCatalogEditPage /></ProtectedRoute>} />

                        {/* Offer Route */}
                         <Route path="/offers/:offerId" element={<ProtectedRoute><OfferPage /></ProtectedRoute>} />

                        {/* Time Log Route */}
                        <Route path="/timelogs" element={<ProtectedRoute><TimeLogsPage /></ProtectedRoute>} />

                        {/* User Management Routes */}
                        <Route path="/users" element={<ProtectedRoute><UserListPage /></ProtectedRoute>} />
                        <Route path="/users/new" element={<ProtectedRoute><UserCreatePage /></ProtectedRoute>} />
                        <Route path="/users/import" element={<ProtectedRoute><UserBulkImportPage /></ProtectedRoute>} />
                        <Route path="/users/edit/:userId" element={<ProtectedRoute><UserEditPage /></ProtectedRoute>} />

                        {/* Superuser / Tenant Management Routes */}
                        <Route path="/tenants" element={<ProtectedRoute><TenantListPage /></ProtectedRoute>} />
                        <Route path="/tenants/new" element={<ProtectedRoute><TenantCreatePage /></ProtectedRoute>} />
                        <Route path="/tenants/edit/:tenantId" element={<ProtectedRoute><TenantEditPage /></ProtectedRoute>} />
                        <Route path="/admin/tools" element={<ProtectedRoute><AdminToolsPage /></ProtectedRoute>} />

                        {/* Other Feature Routes */}
                        <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
                        <Route path="/gantt" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                        <Route path="/account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                        <Route path="/laws" element={<ProtectedRoute><LawsPage /></ProtectedRoute>} />
                        <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />

                        {/* Catch-all Not Found Route */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </main>

                {/* Toast Notifications Container */}
                <ToastContainer
                    position="bottom-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />
            </div>
        </AuthProvider>
    );
}

export default App;