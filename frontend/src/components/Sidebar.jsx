import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import defaultLogo from '../assets/logo.png';
import {
    HomeIcon, 
    BriefcaseIcon, 
    ClipboardDocumentListIcon, 
    CircleStackIcon,
    WrenchScrewdriverIcon, 
    TruckIcon, 
    BuildingStorefrontIcon, 
    ClockIcon,
    ChartBarSquareIcon,
    CalendarDaysIcon, 
    UsersIcon, 
    ListBulletIcon, 
    DocumentChartBarIcon,
    Cog6ToothIcon, 
    ArrowRightOnRectangleIcon, 
    AdjustmentsHorizontalIcon,
    WrenchIcon,
    ChevronDoubleLeftIcon, 
    ChevronDoubleRightIcon, 
    UserGroupIcon,
    BanknotesIcon,
    ShieldCheckIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';

function Sidebar() {
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Derived role checks
    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;
    const isManager = currentUser?.role === 'project manager' || isSuperuser;

    const logoToDisplay = isAuthenticated && currentUser?.tenant?.logo_url
        ? currentUser.tenant.logo_url
        : defaultLogo;

    const tenantName = isAuthenticated && currentUser?.tenant?.name
        ? currentUser.tenant.name
        : "RafApp";

    const linkBase = "flex items-center px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 rounded-xl group mb-1";
    const inactiveClass = "text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400";

    if (!isAuthenticated) return null;

    return (
        <aside className={`flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out sticky top-0 z-40 ${isCollapsed ? 'w-20' : 'w-72'}`}>
            
            {/* Header: Identity & Toggle */}
            <div className="flex items-center justify-between px-4 h-24 border-b border-gray-50 dark:border-gray-800">
                <Link to="/" className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'hidden' : 'animate-in fade-in duration-500'}`}>
                    <div className="h-12 w-12 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-100 dark:border-gray-700">
                        <img
                            src={logoToDisplay}
                            alt="Tenant Logo"
                            className="h-full w-full object-contain"
                            onError={(e) => { e.target.src = defaultLogo; }}
                        />
                    </div>
                    <div className="min-w-0">
                        <span className="block font-black text-sm tracking-tighter text-gray-900 dark:text-white uppercase truncate leading-none">
                            {tenantName}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Platform</span>
                    </div>
                </Link>
                
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-gray-100 dark:border-gray-700"
                >
                    {isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
                </button>
            </div>

            {/* Navigation Body */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide space-y-6">
                
                {/* Section: Operations */}
                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Core Operations</p>}
                    <div className="space-y-1">
                        <NavItem to="/" icon={<HomeIcon />} label="Dashboard" collapsed={isCollapsed} end />
                        <NavItem to="/projects" icon={<BriefcaseIcon />} label="Projects" collapsed={isCollapsed} />
                        <NavItem to="/tasks" icon={<ClipboardDocumentListIcon />} label="Tasks" collapsed={isCollapsed} />
                        <NavItem to="/calendar" icon={<CalendarDaysIcon />} label="Calendar" collapsed={isCollapsed} />
                        <NavItem to="/gantt" icon={<ChartBarSquareIcon />} label="Timeline" collapsed={isCollapsed} />
                    </div>
                </div>

                {/* Section: Logistics */}
                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Resources</p>}
                    <div className="space-y-1">
                        <NavItem to="/inventory" icon={<CircleStackIcon />} label="Inventory" collapsed={isCollapsed} />
                        <NavItem to="/tools" icon={<WrenchScrewdriverIcon />} label="Tools" collapsed={isCollapsed} />
                        <NavItem to="/cars" icon={<TruckIcon />} label="Cars" collapsed={isCollapsed} />
                        <NavItem to="/shops" icon={<BuildingStorefrontIcon />} label="Vendors" collapsed={isCollapsed} />
                    </div>
                </div>

                {/* Section: Administration */}
                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Administration</p>}
                    <div className="space-y-1">
                        <NavItem to="/timelogs" icon={<ClockIcon />} label="Time Tracking" collapsed={isCollapsed} />
                        <NavItem to="/accounting" icon={<BanknotesIcon />} label="HR & Payroll" collapsed={isCollapsed} />
                        {(isAdmin || isManager) && (
                            <>
                                <NavItem to="/customers" icon={<UserGroupIcon />} label="Customers" collapsed={isCollapsed} />
                                <NavItem to="/labor-catalog" icon={<ListBulletIcon />} label="Service Rates" collapsed={isCollapsed} />
                                <NavItem to="/reports" icon={<DocumentChartBarIcon />} label="Analytics" collapsed={isCollapsed} />
                            </>
                        )}
                        <NavItem to="/users" icon={<UsersIcon />} label="Personnel" collapsed={isCollapsed} />
                    </div>
                </div>

                {/* Section: Knowledge */}
                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Support</p>}
                    <div className="space-y-1">
                        <NavItem to="/laws" icon={<BookOpenIcon />} label="Laws and Standards" collapsed={isCollapsed} />
                        <NavItem to="/tutorials" icon={<ListBulletIcon />} label="Tutorials" collapsed={isCollapsed} />
                    </div>
                </div>

                {/* Section: Root Access (Superuser Only) */}
                {isSuperuser && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        {!isCollapsed && <p className="px-3 text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <ShieldCheckIcon className="h-3 w-3" /> System Root
                        </p>}
                        <div className="space-y-1">
                            <NavItem to="/tenants" icon={<AdjustmentsHorizontalIcon />} label="Tenant Registry" collapsed={isCollapsed} color="orange" />
                            <NavItem to="/admin/tools" icon={<WrenchIcon />} label="Admin Tools" collapsed={isCollapsed} color="orange" />
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer: Context & Logout */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-1">
                    <Link
                        to="/account-settings"
                        className={`${linkBase} ${inactiveClass}`}
                        title="Profile Settings"
                    >
                        <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3 truncate">Account Settings</span>}
                    </Link>
                    <button
                        onClick={logout}
                        className="flex items-center px-3 py-2.5 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl w-full transition-all group"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="ml-3">Secure Logout</span>}
                    </button>
                </div>
                
                {!isCollapsed && (
                    <div className="mt-4 px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Logged in as</p>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-200 truncate">{currentUser?.full_name || currentUser?.email}</p>
                    </div>
                )}
            </div>
        </aside>
    );
}

/**
 * Internal Helper for clean NavLink components
 */
function NavItem({ to, icon, label, collapsed, end = false, color = "indigo" }) {
    const linkBase = "flex items-center px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 rounded-xl group mb-1";
    
    // Indigo Default vs Orange Root
    const activeClass = color === "orange" 
        ? "bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-none"
        : "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none";
        
    const inactiveClass = color === "orange"
        ? "text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-600 dark:hover:text-orange-400"
        : "text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400";

    return (
        <NavLink 
            to={to} 
            end={end}
            className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : ''}
        >
            <span className={`flex-shrink-0 ${collapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`}>
                {React.cloneElement(icon, { className: "h-full w-full" })}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
    );
}

export default Sidebar;