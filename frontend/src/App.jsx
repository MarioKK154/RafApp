import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import { LanguageIcon } from '@heroicons/react/24/outline';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PushNotificationProvider } from './context/PushNotificationContext';
import Sidebar, { HamburgerButton } from './components/Sidebar';
import { useTenantBranding } from './hooks/useTenantBranding';

// --- FEATURE PAGE IMPORTS ---
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectEditPage from './pages/ProjectEditPage';
import ProjectRiskAssessmentPage from './pages/ProjectRiskAssessmentPage';
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
import NotificationHubPage from './pages/NotificationHubPage'; 
import SchedulingGridPage from './pages/SchedulingGridPage'; 
import axiosInstance from './api/axiosInstance';
import RiskLibraryPage from './pages/RiskLibraryPage';
import ChatPage from './pages/ChatPage';
import DrawingsPage from './pages/DrawingsPage';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh' }}
                    className="flex flex-col items-center justify-center p-8 text-center"
                >
                    <div className="mb-6 text-5xl">⚠️</div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter mb-3" style={{ color: 'var(--text-primary)' }}>
                        Something went wrong
                    </h1>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                        An unexpected error occurred. Please refresh the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background: 'var(--brand)', color: '#fff' }}
                        className="px-6 py-3 rounded-xl font-black uppercase tracking-wider text-sm mb-4 cursor-pointer"
                    >
                        Refresh Page
                    </button>
                    {this.state.error && (
                        <details className="mt-4 text-left text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-xl max-w-2xl overflow-auto border border-red-200 dark:border-red-800">
                            <summary className="font-bold cursor-pointer mb-2 uppercase tracking-wider text-[10px]">Error Details (Click to expand)</summary>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{this.state.error?.toString()}\n{this.state.error?.stack}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    
    if (isLoading) {
        return (
            <div
                className="flex flex-col justify-center items-center h-screen"
                style={{ background: 'var(--bg-base)' }}
            >
                <div className="relative mb-5">
                    <div
                        className="h-14 w-14 rounded-full animate-spin"
                        style={{
                            border: '3px solid var(--border)',
                            borderTopColor: 'var(--brand)',
                        }}
                    />
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: 'var(--brand)' }}
                        />
                    </div>
                </div>
                <p
                    className="text-[9px] font-black uppercase tracking-[0.35em]"
                    style={{ color: 'var(--text-muted)', animation: 'pulseSoft 2s ease-in-out infinite' }}
                >
                    Synchronizing Session...
                </p>
            </div>
        );
    }
    
    // Preserve the original URL so LoginPage can redirect back after login
    return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
};

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
}

function AppShell() {
    const { i18n } = useTranslation();
    const { background } = useTenantBranding();
    const { isAuthenticated, user: currentUser, isImpersonating, stopImpersonation } = useAuth();
    const [systemStatus, setSystemStatus] = useState(null);
    const [globalBanner, setGlobalBanner] = useState(null);
    const isMobile = useIsMobile();

    const style = background && isAuthenticated
        ? {
            backgroundImage: `url(${background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }
        : {};

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axiosInstance.get('/system/status');
                setSystemStatus(res.data);
            } catch {
                // ignore; system status is optional
            }
        };
        fetchStatus();
    }, []);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const res = await axiosInstance.get('/system/version');
                const latestBuildTime = res.data?.build_time;
                if (!latestBuildTime) return;
                
                const storedBuildTime = localStorage.getItem('app_build_time');
                if (storedBuildTime && storedBuildTime !== latestBuildTime) {
                    console.log(`New version detected! Stored: ${storedBuildTime}, Latest: ${latestBuildTime}. Busting PWA cache...`);
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                    }
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(registrations.map(r => r.unregister()));
                    }
                    localStorage.setItem('app_build_time', latestBuildTime);
                    toast.info(
                        <span>
                            🚀 New version available.{' '}
                            <button
                                onClick={() => window.location.reload(true)}
                                style={{ fontWeight: 900, textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                Click to refresh
                            </button>
                        </span>,
                        { autoClose: false, toastId: 'new-version' }
                    );
                } else if (!storedBuildTime) {
                    localStorage.setItem('app_build_time', latestBuildTime);
                }
            } catch (err) {
                console.error("Failed to check app version", err);
            }
        };
        checkVersion();
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        const fetchBanner = async () => {
            try {
                const res = await axiosInstance.get('/system/banner');
                setGlobalBanner(res.data || null);
            } catch {
                setGlobalBanner(null);
            }
        };
        fetchBanner();
    }, [isAuthenticated]);

    const showMaintenanceOverlay = systemStatus?.maintenance && !currentUser?.is_superuser;

    return (
        <div
            className="relative flex flex-col min-h-screen w-full font-sans"
            style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', ...style }}
        >
            {/* Mobile Top Bar */}
            {isMobile && isAuthenticated && (
                <div 
                    style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', height: '56px' }}
                    className="sticky top-0 z-[100] flex items-center justify-between px-4 py-2 shrink-0 shadow-md"
                >
                    <div className="flex items-center gap-3">
                        <HamburgerButton />
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <span style={{ color: 'var(--text-primary)' }} className="font-black text-sm tracking-tight truncate leading-none uppercase italic">
                                {currentUser?.tenant?.name || 'RafApp'}
                            </span>
                        </Link>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                        <button
                            onClick={() => {
                                const newLang = i18n.language.startsWith('en') ? 'is' : 'en';
                                i18n.changeLanguage(newLang);
                                localStorage.setItem('i18nextLng', newLang);
                            }}
                            style={{ color: 'var(--brand)', minHeight: '44px' }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] hover:opacity-75 transition-opacity"
                        >
                            <LanguageIcon className="h-4 w-4" />
                            <span>{i18n.language.toUpperCase()}</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-1 relative w-full min-h-0">
                <Sidebar />

                <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col relative pb-24 lg:pb-0" style={{ background: 'var(--bg-base)' }}>
                    {globalBanner && globalBanner.message && (
                        <div
                            className="flex-shrink-0 flex items-center justify-center gap-4 px-6 py-3 text-white text-sm font-medium text-center"
                            style={{ background: 'var(--brand)' }}
                        >
                            <span>{globalBanner.message}</span>
                        </div>
                    )}
                    {isImpersonating && (
                        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 bg-amber-500 text-black text-sm font-bold">
                            <span>
                                Viewing as <strong>{currentUser?.full_name || currentUser?.email}</strong>
                                {currentUser?.impersonated_by_email && (
                                    <span className="opacity-90 ml-1">(impersonated by {currentUser.impersonated_by_email})</span>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={stopImpersonation}
                                className="px-4 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 font-black uppercase tracking-wider transition-colors"
                            >
                                Stop impersonation
                            </button>
                        </div>
                    )}
                    <ErrorBoundary>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<LandingPage />} />

                        {/* --- CORE OPERATIONAL HUB --- */}
                        <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationHubPage /></ProtectedRoute>} />
                        <Route path="/scheduling" element={<ProtectedRoute><SchedulingGridPage /></ProtectedRoute>} />
                        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

                        {/* --- PROJECT NODES --- */}
                        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                        <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
                        <Route path="/projects/edit/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
                        <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
                        <Route path="/projects/:projectId/risk-assessment" element={<ProtectedRoute><ProjectRiskAssessmentPage /></ProtectedRoute>} />
                        <Route path="/drawings" element={<ProtectedRoute><DrawingsPage /></ProtectedRoute>} />

                        {/* --- CRM --- */}
                        <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
                        <Route path="/customers/new" element={<ProtectedRoute><CustomerCreatePage /></ProtectedRoute>} />
                        <Route path="/customers/edit/:customerId" element={<ProtectedRoute><CustomerEditPage /></ProtectedRoute>} />

                        {/* --- TASKS --- */}
                        <Route path="/tasks" element={<ProtectedRoute><TasksListPage /></ProtectedRoute>} />
                        <Route path="/tasks/new" element={<ProtectedRoute><TaskCreatePage /></ProtectedRoute>} />
                        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

                        {/* --- INVENTORY --- */}
                        <Route path="/inventory" element={<ProtectedRoute><InventoryCatalogPage /></ProtectedRoute>} />
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
                        <Route path="/risk-library" element={<ProtectedRoute><RiskLibraryPage /></ProtectedRoute>} />

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
                    </ErrorBoundary>
                </main>
            </div>

            {showMaintenanceOverlay && (
                <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-gray-900/90 text-white text-center px-4">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
                        Scheduled Maintenance
                    </h1>
                    <p className="text-sm md:text-base text-gray-200 max-w-lg mb-2">
                        The RafApp platform is temporarily offline while system maintenance is in progress.
                    </p>
                    {systemStatus?.message && (
                        <p className="text-xs md:text-sm text-gray-300 max-w-lg">
                            {systemStatus.message}
                        </p>
                    )}
                </div>
            )}

            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                theme="colored"
            />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <PushNotificationProvider>
                <AppShell />
            </PushNotificationProvider>
        </AuthProvider>
    );
}

export default App;