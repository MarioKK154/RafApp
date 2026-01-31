import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar'; 

// --- FEATURE PAGE IMPORTS ---
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
import CustomerListPage from './pages/CustomerListPage';
import CustomerCreatePage from './pages/CustomerCreatePage';
import CustomerEditPage from './pages/CustomerEditPage';
import AccountingPage from './pages/AccountingPage';
import LeaveRequestCreatePage from './pages/LeaveRequestCreatePage';

/**
 * Higher Order Component for Route Protection
 * Manages authentication redirection and initialization states.
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-indigo-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
                    Synchronizing Session...
                </p>
            </div>
        );
    }
    
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <AuthProvider>
            {/* Main Application Shell */}
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 selection:text-indigo-700">
                
                {/* Infrastructure Sidebar: 
                  Visible only to authenticated personnel. 
                  Handles internal navigation logic.
                */}
                <Sidebar />

                {/* Registry Viewport: Primary Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth">
                    <Routes>
                        {/* Public Gateway */}
                        <Route path="/login" element={<LoginPage />} />

                        {/* Operational Dashboard */}
                        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

                        {/* Deployment & Project Registry */}
                        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
                        <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />

                        {/* CRM & Customer Relations */}
                        <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
                        <Route path="/customers/new" element={<ProtectedRoute><CustomerCreatePage /></ProtectedRoute>} />
                        <Route path="/customers/edit/:customerId" element={<ProtectedRoute><CustomerEditPage /></ProtectedRoute>} />

                        {/* Logic & Task Distribution */}
                        <Route path="/tasks" element={<ProtectedRoute><TasksListPage /></ProtectedRoute>} />
                        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

                        {/* Global Material & Catalog Infrastructure */}
                        <Route path="/inventory" element={<ProtectedRoute><GlobalInventoryPage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog" element={<ProtectedRoute><InventoryCatalogPage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog/new" element={<ProtectedRoute><InventoryCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/inventory/catalog/edit/:itemId" element={<ProtectedRoute><InventoryCatalogEditPage /></ProtectedRoute>} />

                        {/* Hardware & Asset Registry */}
                        <Route path="/tools" element={<ProtectedRoute><ToolInventoryPage /></ProtectedRoute>} />
                        <Route path="/tools/new" element={<ProtectedRoute><ToolCreatePage /></ProtectedRoute>} />
                        <Route path="/tools/edit/:toolId" element={<ProtectedRoute><ToolEditPage /></ProtectedRoute>} />
                        <Route path="/tools/:toolId" element={<ProtectedRoute><ToolDetailsPage /></ProtectedRoute>} />

                        {/* Logistics: Vehicle Fleet */}
                        <Route path="/cars" element={<ProtectedRoute><CarFleetPage /></ProtectedRoute>} />
                        <Route path="/cars/new" element={<ProtectedRoute><CarCreatePage /></ProtectedRoute>} />
                        <Route path="/cars/edit/:carId" element={<ProtectedRoute><CarEditPage /></ProtectedRoute>} />
                        <Route path="/cars/:carId" element={<ProtectedRoute><CarDetailsPage /></ProtectedRoute>} />

                        {/* Supply Chain & Vendors */}
                        <Route path="/shops" element={<ProtectedRoute><ShopListPage /></ProtectedRoute>} />
                        <Route path="/shops/new" element={<ProtectedRoute><ShopCreatePage /></ProtectedRoute>} />
                        <Route path="/shops/edit/:shopId" element={<ProtectedRoute><ShopEditPage /></ProtectedRoute>} />

                        {/* Personnel Labor Value Registry */}
                        <Route path="/labor-catalog" element={<ProtectedRoute><LaborCatalogListPage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/new" element={<ProtectedRoute><LaborCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/edit/:itemId" element={<ProtectedRoute><LaborCatalogEditPage /></ProtectedRoute>} />

                        {/* Commercial Hub */}
                        <Route path="/offers/:offerId" element={<ProtectedRoute><OfferPage /></ProtectedRoute>} />

                        {/* Temporal Analytics: Time & Attendance */}
                        <Route path="/timelogs" element={<ProtectedRoute><TimeLogsPage /></ProtectedRoute>} />

                        {/* Financial Telemetry & HR */}
                        <Route path="/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
                        <Route path="/accounting/leave/new" element={<ProtectedRoute><LeaveRequestCreatePage /></ProtectedRoute>} />

                        {/* Staff & User Management */}
                        <Route path="/users" element={<ProtectedRoute><UserListPage /></ProtectedRoute>} />
                        <Route path="/users/new" element={<ProtectedRoute><UserCreatePage /></ProtectedRoute>} />
                        <Route path="/users/import" element={<ProtectedRoute><UserBulkImportPage /></ProtectedRoute>} />
                        <Route path="/users/edit/:userId" element={<ProtectedRoute><UserEditPage /></ProtectedRoute>} />

                        {/* Infrastructure & Multi-Tenant Control (Superuser) */}
                        <Route path="/tenants" element={<ProtectedRoute><TenantListPage /></ProtectedRoute>} />
                        <Route path="/tenants/new" element={<ProtectedRoute><TenantCreatePage /></ProtectedRoute>} />
                        <Route path="/tenants/edit/:tenantId" element={<ProtectedRoute><TenantEditPage /></ProtectedRoute>} />
                        <Route path="/admin/tools" element={<ProtectedRoute><AdminToolsPage /></ProtectedRoute>} />

                        {/* Planning & Intelligence Tools */}
                        <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
                        <Route path="/gantt" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

                        {/* System Knowledge & Compliance */}
                        <Route path="/account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                        <Route path="/laws" element={<ProtectedRoute><LawsPage /></ProtectedRoute>} />
                        <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />

                        {/* Catch-all Protocol: Resource Lost */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </main>

                {/* Global Notification System Container */}
                <ToastContainer
                    position="bottom-right"
                    autoClose={4000}
                    hideProgressBar={false}
                    newestOnTop={true}
                    closeOnClick
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