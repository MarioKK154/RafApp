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
import NotificationHubPage from './pages/NotificationHubPage'; 
import SchedulingGridPage from './pages/SchedulingGridPage'; 

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
                <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse italic">
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
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 selection:text-indigo-700">
                <Sidebar />

                <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth custom-scrollbar">
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        {/* --- CORE OPERATIONAL HUB --- */}
                        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationHubPage /></ProtectedRoute>} />
                        <Route path="/scheduling" element={<ProtectedRoute><SchedulingGridPage /></ProtectedRoute>} />

                        {/* --- PROJECT NODES --- */}
                        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
                        <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
                        <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />

                        {/* --- CRM --- */}
                        <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
                        <Route path="/customers/new" element={<ProtectedRoute><CustomerCreatePage /></ProtectedRoute>} />
                        <Route path="/customers/edit/:customerId" element={<ProtectedRoute><CustomerEditPage /></ProtectedRoute>} />

                        {/* --- TASKS --- */}
                        <Route path="/tasks" element={<ProtectedRoute><TasksListPage /></ProtectedRoute>} />
                        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

                        {/* --- INVENTORY --- */}
                        <Route path="/inventory" element={<ProtectedRoute><GlobalInventoryPage /></ProtectedRoute>} />
                        <Route path="/inventory/new" element={<ProtectedRoute><InventoryCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/inventory/edit/:itemId" element={<ProtectedRoute><InventoryCatalogEditPage /></ProtectedRoute>} />

                        {/* --- ASSETS & LOGISTICS --- */}
                        <Route path="/tools" element={<ProtectedRoute><ToolInventoryPage /></ProtectedRoute>} />
                        <Route path="/tools/new" element={<ProtectedRoute><ToolCreatePage /></ProtectedRoute>} />
                        <Route path="/tools/edit/:toolId" element={<ProtectedRoute><ToolEditPage /></ProtectedRoute>} />
                        <Route path="/tools/:toolId" element={<ProtectedRoute><ToolDetailsPage /></ProtectedRoute>} />
                        <Route path="/cars" element={<ProtectedRoute><CarFleetPage /></ProtectedRoute>} />
                        <Route path="/cars/new" element={<ProtectedRoute><CarCreatePage /></ProtectedRoute>} />
                        <Route path="/cars/edit/:carId" element={<ProtectedRoute><CarEditPage /></ProtectedRoute>} />
                        <Route path="/cars/:carId" element={<ProtectedRoute><CarDetailsPage /></ProtectedRoute>} />
                        <Route path="/shops" element={<ProtectedRoute><ShopListPage /></ProtectedRoute>} />
                        <Route path="/shops/new" element={<ProtectedRoute><ShopCreatePage /></ProtectedRoute>} />
                        <Route path="/shops/edit/:shopId" element={<ProtectedRoute><ShopEditPage /></ProtectedRoute>} />

                        {/* --- ADMIN & HR --- */}
                        <Route path="/labor-catalog" element={<ProtectedRoute><LaborCatalogListPage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/new" element={<ProtectedRoute><LaborCatalogCreatePage /></ProtectedRoute>} />
                        <Route path="/labor-catalog/edit/:itemId" element={<ProtectedRoute><LaborCatalogEditPage /></ProtectedRoute>} />
                        <Route path="/timelogs" element={<ProtectedRoute><TimeLogsPage /></ProtectedRoute>} />
                        <Route path="/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
                        <Route path="/accounting/leave/new" element={<ProtectedRoute><LeaveRequestCreatePage /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

                        {/* --- USER MANAGEMENT (TARGET FIX) --- */}
                        <Route path="/users" element={<ProtectedRoute><UserListPage /></ProtectedRoute>} />
                        <Route path="/users/new" element={<ProtectedRoute><UserCreatePage /></ProtectedRoute>} />
                        <Route path="/users/import" element={<ProtectedRoute><UserBulkImportPage /></ProtectedRoute>} />
                        {/* Ensure this line is exactly as below */}
                        <Route path="/users/edit/:userId" element={<ProtectedRoute><UserEditPage /></ProtectedRoute>} />

                        {/* --- INFRASTRUCTURE --- */}
                        <Route path="/tenants" element={<ProtectedRoute><TenantListPage /></ProtectedRoute>} />
                        <Route path="/tenants/new" element={<ProtectedRoute><TenantCreatePage /></ProtectedRoute>} />
                        <Route path="/tenants/edit/:tenantId" element={<ProtectedRoute><TenantEditPage /></ProtectedRoute>} />
                        <Route path="/admin/tools" element={<ProtectedRoute><AdminToolsPage /></ProtectedRoute>} />

                        {/* --- PLANNING --- */}
                        <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
                        <Route path="/gantt" element={<ProtectedRoute><GanttChartPage /></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                        <Route path="/offers/:offerId" element={<ProtectedRoute><OfferPage /></ProtectedRoute>} />

                        {/* --- SETTINGS --- */}
                        <Route path="/account-settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
                        <Route path="/laws" element={<ProtectedRoute><LawsPage /></ProtectedRoute>} />
                        <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </main>

                <ToastContainer
                    position="bottom-right"
                    autoClose={4000}
                    theme="colored"
                />
            </div>
        </AuthProvider>
    );
}

export default App;