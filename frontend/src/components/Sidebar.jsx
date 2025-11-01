// frontend/src/components/Sidebar.jsx
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import defaultLogo from '../assets/logo.png';
import {
    HomeIcon, BriefcaseIcon, ClipboardDocumentListIcon, CircleStackIcon,
    WrenchScrewdriverIcon, TruckIcon, BuildingStorefrontIcon, ClockIcon,
    ChartBarSquareIcon, // <-- CORRECTED ICON IMPORT
    CalendarDaysIcon, UsersIcon, ListBulletIcon, DocumentChartBarIcon,
    Cog6ToothIcon, ArrowRightOnRectangleIcon, // Logout
    AdjustmentsHorizontalIcon, // Tenants
    WrenchIcon, // Admin Tools
    ChevronDoubleLeftIcon, ChevronDoubleRightIcon // Collapse/Expand
} from '@heroicons/react/24/outline';

function Sidebar() {
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.is_superuser;
    const isManager = currentUser?.role === 'project manager';
    const isSuperuser = currentUser?.is_superuser;

    const logoToDisplay = isAuthenticated && currentUser?.tenant?.logo_url
        ? currentUser.tenant.logo_url
        : defaultLogo;

    const tenantName = isAuthenticated && currentUser?.tenant?.name
        ? currentUser.tenant.name
        : "RafApp";

    const commonLinkClasses = "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150";
    const activeLinkClasses = "bg-indigo-100 dark:bg-gray-700 text-indigo-700 dark:text-gray-100";
    const inactiveLinkClasses = "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200";

    const getNavLinkClass = ({ isActive }) =>
        `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;

    return (
        <div className={`flex flex-col h-screen bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo and Tenant Name */}
            <div className={`flex items-center justify-between px-4 h-20 border-b dark:border-gray-700 ${isCollapsed ? 'justify-center' : ''}`}>
                 <Link to="/" className={`flex items-center space-x-2 overflow-hidden ${isCollapsed ? 'hidden' : ''}`} title={`${tenantName} Home`}>
                    <img
                        src={logoToDisplay}
                        alt={`${tenantName} Logo`}
                        className="h-12 w-auto object-contain flex-shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.src = defaultLogo; }}
                    />
                     {!isCollapsed && <span className="font-semibold text-lg truncate">{tenantName}</span>}
                </Link>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronDoubleRightIcon className="h-6 w-6" /> : <ChevronDoubleLeftIcon className="h-6 w-6" />}
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {isAuthenticated && (
                    <>
                        <NavLink to="/" end className={getNavLinkClass}>
                            <HomeIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Dashboard</span>}
                        </NavLink>
                        <NavLink to="/projects" className={getNavLinkClass}>
                             <BriefcaseIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Projects</span>}
                        </NavLink>
                        <NavLink to="/tasks" className={getNavLinkClass}>
                             <ClipboardDocumentListIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Tasks</span>}
                        </NavLink>
                        <NavLink to="/inventory" className={getNavLinkClass}>
                             <CircleStackIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Inventory</span>}
                        </NavLink>
                        <NavLink to="/tools" className={getNavLinkClass}>
                             <WrenchScrewdriverIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Tools</span>}
                        </NavLink>
                         <NavLink to="/cars" className={getNavLinkClass}>
                             <TruckIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Cars</span>}
                        </NavLink>
                         <NavLink to="/shops" className={getNavLinkClass}>
                             <BuildingStorefrontIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Shops</span>}
                        </NavLink>
                         <NavLink to="/timelogs" className={getNavLinkClass}>
                             <ClockIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Time Logs</span>}
                        </NavLink>
                         <NavLink to="/gantt" className={getNavLinkClass}>
                             {/* --- THIS IS THE FIX --- */}
                             <ChartBarSquareIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Gantt</span>}
                        </NavLink>
                        <NavLink to="/calendar" className={getNavLinkClass}>
                             <CalendarDaysIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Calendar</span>}
                        </NavLink>
                         <NavLink to="/users" className={getNavLinkClass}>
                             <UsersIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Users</span>}
                        </NavLink>
                        <NavLink to="/laws" className={getNavLinkClass}>
                             <ListBulletIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Laws</span>}
                        </NavLink>
                        <NavLink to="/tutorials" className={getNavLinkClass}>
                             <ListBulletIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span>Tutorials</span>}
                        </NavLink>

                        {/* Manager/Admin Links */}
                        {(isAdmin || isManager) && (
                            <>
                                <hr className="my-2 border-gray-200 dark:border-gray-600"/>
                                <NavLink to="/shopping-list" className={getNavLinkClass}>
                                    <ListBulletIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                                    {!isCollapsed && <span>Shopping List</span>}
                                </NavLink>
                                <NavLink to="/labor-catalog" className={getNavLinkClass}>
                                     <ListBulletIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                                    {!isCollapsed && <span>Labor Catalog</span>}
                                </NavLink>
                                <NavLink to="/reports" className={getNavLinkClass}>
                                     <DocumentChartBarIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                                    {!isCollapsed && <span>Reports</span>}
                                </NavLink>
                            </>
                        )}

                        {/* Superuser Links */}
                        {isSuperuser && (
                            <>
                                 <hr className="my-2 border-gray-200 dark:border-gray-600"/>
                                <NavLink to="/tenants" className={getNavLinkClass}>
                                     <AdjustmentsHorizontalIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                                    {!isCollapsed && <span>Tenants</span>}
                                </NavLink>
                                <NavLink to="/admin/tools" className={getNavLinkClass}>
                                     <WrenchIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                                    {!isCollapsed && <span>Admin Tools</span>}
                                </NavLink>
                            </>
                        )}
                    </>
                )}
            </nav>

            {/* Footer / User Area */}
            <div className="p-4 border-t dark:border-gray-700">
                {isAuthenticated && currentUser ? (
                    <div className="space-y-2">
                        <Link
                            to="/account-settings"
                            className={`${commonLinkClasses} ${inactiveLinkClasses}`}
                            title="Account Settings"
                        >
                            <Cog6ToothIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                            {!isCollapsed && <span className="truncate">Settings</span>}
                        </Link>
                        <button
                            onClick={logout}
                            className={`${commonLinkClasses} ${inactiveLinkClasses} w-full`}
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                             {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                ) : (
                    <NavLink to="/login" className={getNavLinkClass}>
                         <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 flex-shrink-0"/>
                         {!isCollapsed && <span>Login</span>}
                    </NavLink>
                )}
            </div>
        </div>
    );
}

export default Sidebar;