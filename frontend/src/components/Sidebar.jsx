import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import defaultLogo from '../assets/logo.png';
import axiosInstance from '../api/axiosInstance';
import NotificationDropdown from './NotificationDropdown';
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
    BookOpenIcon,
    LanguageIcon,
    BellIcon,
    Squares2X2Icon
} from '@heroicons/react/24/outline';

function Sidebar() {
    const { t, i18n } = useTranslation();
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;
    const isManager = currentUser?.role === 'project manager' || isSuperuser;
    const isManagement = isAdmin || isManager;

    const logoToDisplay = isAuthenticated && currentUser?.tenant?.logo_url
        ? (currentUser.tenant.logo_url.startsWith('http') ? currentUser.tenant.logo_url : `${(axiosInstance.defaults.baseURL || '').replace(/\/$/, '')}${currentUser.tenant.logo_url}`)
        : defaultLogo;

    const tenantName = isAuthenticated && currentUser?.tenant?.name
        ? currentUser.tenant.name
        : "RafApp";

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'is' : 'en';
        i18n.changeLanguage(newLang);
    };

    if (!isAuthenticated) return null;

    return (
        /* INCREASED Z-INDEX TO 50 TO CLEAR MAIN CONTENT */
        <aside className={`flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out sticky top-0 z-50 ${isCollapsed ? 'w-20' : 'w-72'}`}>

            {/* Header: Identity Terminal - FIXED OVERFLOW */}
            <div className="flex items-center justify-between px-4 h-24 border-b border-gray-50 dark:border-gray-800 relative overflow-visible">
                <Link to="/" className={`flex items-center gap-3 ${isCollapsed ? 'hidden' : 'animate-in fade-in duration-500'}`}>
                    <div className="h-12 w-12 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <img
                            src={logoToDisplay}
                            alt="Tenant Identity"
                            className="h-full w-full object-contain"
                            onError={(e) => { e.target.src = defaultLogo; }}
                        />
                    </div>
                    <div className="min-w-0">
                        <span className="block font-black text-sm tracking-tighter text-gray-900 dark:text-white uppercase truncate leading-none italic">
                            {tenantName}
                        </span>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1.5 block">Infrastructure</span>
                    </div>
                </Link>

                <div className="flex items-center gap-2">
                    {/* The Dropdown now has permission to "overflow" this container */}
                    {!isCollapsed && <NotificationDropdown />}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-gray-100 dark:border-gray-700 mx-auto"
                    >
                        {isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Navigation Registry */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide space-y-8">
                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">{t('core_operations')}</p>}
                    <div className="space-y-1">
                        <NavItem to="/" icon={<HomeIcon />} label={t('dashboard')} collapsed={isCollapsed} end />
                        <NavItem to="/notifications" icon={<BellIcon />} label="Notifications" collapsed={isCollapsed} />
                        {isManagement && (
                            <NavItem to="/scheduling" icon={<Squares2X2Icon />} label="Schedule" collapsed={isCollapsed} />
                        )}
                        <NavItem to="/projects" icon={<BriefcaseIcon />} label={t('projects')} collapsed={isCollapsed} />
                        <NavItem to="/tasks" icon={<ClipboardDocumentListIcon />} label={t('tasks')} collapsed={isCollapsed} />
                        <NavItem to="/calendar" icon={<CalendarDaysIcon />} label={t('calendar')} collapsed={isCollapsed} />
                        {isManagement && (
                            <NavItem to="/gantt" icon={<ChartBarSquareIcon />} label="Gantt chart" collapsed={isCollapsed} />
                        )}
                    </div>
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">{t('resources')}</p>}
                    <div className="space-y-1">
                        <NavItem to="/inventory" icon={<CircleStackIcon />} label={t('inventory')} collapsed={isCollapsed} />
                        <NavItem to="/tools" icon={<WrenchScrewdriverIcon />} label={t('tools')} collapsed={isCollapsed} />
                        <NavItem to="/cars" icon={<TruckIcon />} label={t('cars')} collapsed={isCollapsed} />
                        <NavItem to="/shops" icon={<BuildingStorefrontIcon />} label={t('vendors')} collapsed={isCollapsed} />
                    </div>
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">{t('administration')}</p>}
                    <div className="space-y-1">
                        <NavItem to="/timelogs" icon={<ClockIcon />} label={t('time_tracking')} collapsed={isCollapsed} />
                        <NavItem to="/accounting" icon={<BanknotesIcon />} label={t('hr_payroll')} collapsed={isCollapsed} />
                        {isManagement && (
                            <>
                                <NavItem to="/customers" icon={<UserGroupIcon />} label={t('customers')} collapsed={isCollapsed} />
                                <NavItem to="/labor-catalog" icon={<ListBulletIcon />} label={t('service_rates')} collapsed={isCollapsed} />
                                <NavItem to="/reports" icon={<DocumentChartBarIcon />} label={t('analytics')} collapsed={isCollapsed} />
                            </>
                        )}
                        <NavItem to="/users" icon={<UsersIcon />} label={t('personnel')} collapsed={isCollapsed} />
                    </div>
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">{t('support')}</p>}
                    <div className="space-y-1">
                        <NavItem to="/laws" icon={<BookOpenIcon />} label={t('laws_standards')} collapsed={isCollapsed} />
                        <NavItem to="/tutorials" icon={<ListBulletIcon />} label={t('tutorials')} collapsed={isCollapsed} />
                    </div>
                </div>

                {isSuperuser && (
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                        {!isCollapsed && <p className="px-3 text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <ShieldCheckIcon className="h-3.5 w-3.5" /> {t('system_root')}
                        </p>}
                        <div className="space-y-1">
                            <NavItem to="/tenants" icon={<AdjustmentsHorizontalIcon />} label={t('tenant_registry')} collapsed={isCollapsed} color="orange" />
                            <NavItem to="/admin/tools" icon={<WrenchIcon />} label={t('admin_tools')} collapsed={isCollapsed} color="orange" />
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-1">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl w-full transition-all group"
                    >
                        <LanguageIcon className="h-5 w-5 flex-shrink-0 mr-3" />
                        {!isCollapsed && (
                            <div className="flex items-center justify-between flex-1">
                                <span>{i18n.language === 'en' ? 'Íslenska' : 'English'}</span>
                                <span className="bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-900 text-[8px] px-2 py-0.5 rounded-lg shadow-sm">
                                    {i18n.language.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </button>

                    <NavLink
                        to="/account-settings"
                        className={({ isActive }) => `flex items-center px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${
                            isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600'
                        }`}
                    >
                        <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3 truncate">{t('account_settings')}</span>}
                    </NavLink>

                    <button
                        onClick={logout}
                        className="flex items-center px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl w-full transition-all group"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        {!isCollapsed && <span className="ml-3">{t('secure_logout')}</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ to, icon, label, collapsed, end = false, color = "indigo" }) {
    const linkBase = "flex items-center px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl group mb-1";
    const activeClass = color === "orange"
        ? "bg-orange-600 text-white shadow-lg"
        : "bg-indigo-600 text-white shadow-lg";
    const inactiveClass = color === "orange"
        ? "text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-orange-600"
        : "text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600";

    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : ''}
        >
            <span className={`flex-shrink-0 ${collapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'}`}>
                {React.cloneElement(icon, { className: "h-full w-full stroke-[2px]" })}
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
    );
}

export default Sidebar;