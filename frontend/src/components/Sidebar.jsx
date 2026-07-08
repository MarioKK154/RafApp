import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import defaultLogo from '../assets/logo.png';
import axiosInstance from '../api/axiosInstance';
import NotificationDropdown from './NotificationDropdown';
import {
    HomeIcon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
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
    BookOpenIcon,
    LanguageIcon,
    BellIcon,
    Squares2X2Icon,
    GlobeAltIcon,
    Bars3Icon,
    XMarkIcon,
    ShieldExclamationIcon as ShieldExclamationOutlineIcon
} from '@heroicons/react/24/outline';

/* ── Breakpoints ── */
const BP_MOBILE  = 768;   // < 768px  → overlay mode (hamburger)
const BP_TABLET  = 1024;  // 768–1023 → icon-only strip
// ≥ 1024px → full sidebar, user-collapsible

function useBreakpoint() {
    const getMode = () => {
        const w = window.innerWidth;
        if (w < BP_MOBILE)  return 'mobile';
        if (w < BP_TABLET)  return 'tablet';
        return 'desktop';
    };
    const [mode, setMode] = useState(getMode);
    useEffect(() => {
        const handler = () => setMode(getMode());
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return mode;
}

function Sidebar() {
    const { t, i18n } = useTranslation();
    const { isAuthenticated, user: currentUser, logout } = useAuth();
    const [unreadMessages, setUnreadMessages]       = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const mode = useBreakpoint();

    // Desktop: user can manually collapse to icon strip
    const [desktopCollapsed, setDesktopCollapsed]   = useState(false);
    // Mobile: drawer open/closed
    const [mobileOpen, setMobileOpen]               = useState(false);

    // Expose hamburger toggle so App.jsx hamburger button can open it
    useEffect(() => {
        window.__rafSidebarToggle = () => setMobileOpen(o => !o);
        return () => { delete window.__rafSidebarToggle; };
    }, []);

    // Close mobile drawer on route change
    const closeMobile = useCallback(() => setMobileOpen(false), []);

    // Auto-close mobile drawer on resize to larger screen
    useEffect(() => {
        if (mode !== 'mobile') setMobileOpen(false);
    }, [mode]);

    React.useEffect(() => {
        if (!isAuthenticated) return;
        const fetchUnreadCounts = async () => {
            try {
                const [chatRes, notifRes] = await Promise.all([
                    axiosInstance.get('/chat/unread-count'),
                    axiosInstance.get('/notifications/unread-count'),
                ]);
                setUnreadMessages(chatRes.data.count || 0);
                setUnreadNotifications(notifRes.data.count || 0);
            } catch (err) {
                console.error('Failed to fetch unread counts', err);
            }
        };
        fetchUnreadCounts();
        window.addEventListener('refreshUnreadCounts', fetchUnreadCounts);
        const interval = setInterval(fetchUnreadCounts, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshUnreadCounts', fetchUnreadCounts);
        };
    }, [isAuthenticated]);

    const isSuperuser    = currentUser?.is_superuser;
    const role           = currentUser?.role || '';
    const isSubcontractor = role === 'subcontractor' && !isSuperuser;
    const isAdmin        = role === 'admin' || isSuperuser;
    const isManager      = role === 'project manager' || isSuperuser;
    const isManagement   = isAdmin || isManager;

    const logoToDisplay = isAuthenticated && currentUser?.tenant?.logo_url
        ? (currentUser.tenant.logo_url.startsWith('http')
            ? currentUser.tenant.logo_url
            : `${(axiosInstance.defaults.baseURL || '').replace(/\/$/, '')}${currentUser.tenant.logo_url}`)
        : defaultLogo;

    const tenantName = isAuthenticated && currentUser?.tenant?.name
        ? currentUser.tenant.name
        : 'RafApp';

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'is' : 'en';
        i18n.changeLanguage(newLang);
    };

    const enabledFeatures = currentUser?.tenant?.enabled_features;
    const isFeatureEnabled = (featureKey) => {
        if (currentUser?.is_superuser) return true;
        if (!enabledFeatures || enabledFeatures.length === 0) return true;
        return enabledFeatures.includes(featureKey);
    };

    if (!isAuthenticated) return null;

    /* ── Derive display state ── */
    const isCollapsed = mode === 'tablet' || (mode === 'desktop' && desktopCollapsed);
    const isOverlay   = mode === 'mobile';

    /* ── Sidebar width ── */
    const sidebarWidth = isCollapsed ? '72px' : '256px';

    /* ── Aside position/visibility ── */
    const asideStyle = isOverlay
        ? {
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100%',
            width: '280px',
            zIndex: 200,
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--sidebar-border)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
        }
        : {
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--sidebar-border)',
            width: sidebarWidth,
            transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        };

    const navItemClickProps = isOverlay ? { onClick: closeMobile } : {};

    return (
        <>
            {/* ── Mobile backdrop ── */}
            {isOverlay && mobileOpen && (
                <div
                    onClick={closeMobile}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 199,
                        animation: 'fadeIn 0.2s ease',
                    }}
                />
            )}

            <aside style={asideStyle} className="flex flex-col h-screen z-50">
                {/* ── Header ── */}
                <div
                    style={{ borderBottom: '1px solid var(--border-subtle)', minHeight: '72px' }}
                    className="flex items-center justify-between px-3 py-3 flex-shrink-0"
                >
                    <Link
                        to="/dashboard"
                        onClick={isOverlay ? closeMobile : undefined}
                        className={`flex items-center gap-3 min-w-0 flex-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100'}`}
                    >
                        <div
                            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                            className="h-9 w-9 flex-shrink-0 rounded-xl p-1.5"
                        >
                            <img
                                src={logoToDisplay}
                                alt="Logo"
                                className="h-full w-full object-contain"
                                onError={(e) => { e.target.src = defaultLogo; }}
                            />
                        </div>
                        <div className="min-w-0">
                            <span style={{ color: 'var(--text-primary)' }} className="block font-black text-sm tracking-tight truncate leading-none">
                                {tenantName}
                            </span>
                            <span style={{ color: 'var(--brand)' }} className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 block opacity-70">
                                {t('infrastructure')}
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isCollapsed && <NotificationDropdown />}

                        {/* Mobile: X close button; Desktop/Tablet: collapse toggle */}
                        {isOverlay ? (
                            <button
                                onClick={closeMobile}
                                style={{
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    minHeight: '44px',
                                    minWidth: '44px',
                                }}
                                className="p-2 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0 flex items-center justify-center"
                                title="Close menu"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        ) : mode === 'desktop' ? (
                            <button
                                onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                                style={{
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                }}
                                className="p-2 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0"
                                title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {desktopCollapsed
                                    ? <ChevronDoubleRightIcon className="h-4 w-4" />
                                    : <ChevronDoubleLeftIcon className="h-4 w-4" />
                                }
                            </button>
                        ) : null /* tablet: no toggle button, auto icon-only */ }
                    </div>
                </div>

                {/* ── Navigation ── */}
                <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide" style={{ paddingLeft: '8px', paddingRight: '8px' }}>

                    <NavSection label={t('core_operations')} collapsed={isCollapsed}>
                        <NavItem to="/dashboard"    icon={<HomeIcon />}                    label={t('dashboard')}   collapsed={isCollapsed} end navProps={navItemClickProps} />
                        <NavItem to="/"             icon={<GlobeAltIcon />}                label={t('home')}        collapsed={isCollapsed} end navProps={navItemClickProps} />
                        <NavItem to="/chat"         icon={<ChatBubbleLeftRightIcon />}     label={t('messages', { defaultValue: 'Messages' })} collapsed={isCollapsed} badge={unreadMessages} navProps={navItemClickProps} />
                        <NavItem to="/notifications" icon={<BellIcon />}                   label={t('notifications')} collapsed={isCollapsed} badge={unreadNotifications} navProps={navItemClickProps} />
                        {isManagement && (
                            <NavItem to="/scheduling" icon={<Squares2X2Icon />}            label={t('schedule')}    collapsed={isCollapsed} navProps={navItemClickProps} />
                        )}
                        {!isSubcontractor && (
                            <NavItem to="/projects" icon={<BriefcaseIcon />}               label={t('projects')}    collapsed={isCollapsed} navProps={navItemClickProps} />
                        )}
                        <NavItem to="/tasks"        icon={<ClipboardDocumentListIcon />}   label={t('tasks')}       collapsed={isCollapsed} navProps={navItemClickProps} />
                        <NavItem to="/calendar"     icon={<CalendarDaysIcon />}            label={t('calendar')}    collapsed={isCollapsed} navProps={navItemClickProps} />
                        {isManagement && !isSubcontractor && (
                            <NavItem to="/gantt"    icon={<ChartBarSquareIcon />}          label={t('gantt_chart')} collapsed={isCollapsed} navProps={navItemClickProps} />
                        )}
                    </NavSection>

                    {!isSubcontractor && (
                        <NavSection label={t('resources')} collapsed={isCollapsed}>
                            <NavItem to="/inventory"      icon={<CircleStackIcon />}          label={t('shop', { defaultValue: 'Shop' })} collapsed={isCollapsed} navProps={navItemClickProps} />
                            {isFeatureEnabled('tools') && <NavItem to="/tools"           icon={<WrenchScrewdriverIcon />}    label={t('tools')}         collapsed={isCollapsed} navProps={navItemClickProps} />}
                            {isFeatureEnabled('fleet') && <NavItem to="/cars"            icon={<TruckIcon />}               label={t('cars')}          collapsed={isCollapsed} navProps={navItemClickProps} />}
                            <NavItem to="/shops"           icon={<BuildingStorefrontIcon />}   label={t('vendors')}       collapsed={isCollapsed} navProps={navItemClickProps} />
                            {isManagement && (
                                <NavItem to="/shopping-list" icon={<ListBulletIcon />}        label={t('shopping_list')} collapsed={isCollapsed} navProps={navItemClickProps} />
                            )}
                        </NavSection>
                    )}

                    <NavSection label={t('administration')} collapsed={isCollapsed}>
                        <NavItem to="/timelogs" icon={<ClockIcon />}        label={t('time_tracking')} collapsed={isCollapsed} navProps={navItemClickProps} />
                        {!isSubcontractor && (
                            <>
                                {isFeatureEnabled('payroll') && <NavItem to="/accounting" icon={<BanknotesIcon />} label={t('hr_payroll')} collapsed={isCollapsed} navProps={navItemClickProps} />}
                                {isManagement && (
                                    <>
                                        <NavItem to="/customers"     icon={<UserGroupIcon />}           label={t('customers')}      collapsed={isCollapsed} navProps={navItemClickProps} />
                                        {isFeatureEnabled('rates') && <NavItem to="/labor-catalog" icon={<ListBulletIcon />}           label={t('service_rates')}  collapsed={isCollapsed} navProps={navItemClickProps} />}
                                        <NavItem to="/reports"       icon={<DocumentChartBarIcon />}     label={t('analytics')}      collapsed={isCollapsed} navProps={navItemClickProps} />
                                        {isFeatureEnabled('risk') && <NavItem to="/risk-library"  icon={<ShieldExclamationOutlineIcon />} label={t('risk_library')} collapsed={isCollapsed} navProps={navItemClickProps} />}
                                    </>
                                )}
                                <NavItem to="/users" icon={<UsersIcon />} label={t('personnel')} collapsed={isCollapsed} navProps={navItemClickProps} />
                            </>
                        )}
                    </NavSection>

                    {isFeatureEnabled('tutorials') && (
                        <NavSection label={t('support')} collapsed={isCollapsed}>
                            <NavItem to="/laws"      icon={<BookOpenIcon />}  label={t('laws_standards')} collapsed={isCollapsed} navProps={navItemClickProps} />
                            <NavItem to="/tutorials" icon={<ListBulletIcon />} label={t('tutorials')}     collapsed={isCollapsed} navProps={navItemClickProps} />
                        </NavSection>
                    )}

                    {isSuperuser && (
                        <NavSection label={t('system_root')} collapsed={isCollapsed} accent="orange">
                            <NavItem to="/tenants"     icon={<AdjustmentsHorizontalIcon />} label={t('tenant_registry')} collapsed={isCollapsed} color="orange" navProps={navItemClickProps} />
                            <NavItem to="/admin/tools" icon={<WrenchIcon />}                label={t('admin_tools')}     collapsed={isCollapsed} color="orange" navProps={navItemClickProps} />
                        </NavSection>
                    )}
                </nav>

                {/* ── Footer ── */}
                <div
                    style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
                    className="p-2 flex-shrink-0"
                >
                    {/* Language toggle */}
                    {!isOverlay && (
                        <button
                            onClick={toggleLanguage}
                            style={{ color: 'var(--brand)', minHeight: '44px' }}
                            className="flex items-center w-full px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] hover:opacity-75 transition-opacity"
                        >
                            <LanguageIcon className="h-4 w-4 flex-shrink-0" />
                            {!isCollapsed && (
                                <div className="flex items-center justify-between flex-1 ml-3">
                                    <span>{i18n.language === 'en' ? 'Íslenska' : 'English'}</span>
                                    <span
                                        style={{ background: 'var(--brand-pale)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}
                                        className="text-[8px] px-2 py-0.5 rounded-md font-black"
                                    >
                                        {i18n.language.toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </button>
                    )}

                    {/* Account settings */}
                    <NavLink
                        to="/account-settings"
                        onClick={isOverlay ? closeMobile : undefined}
                        className={({ isActive }) =>
                            `flex items-center w-full px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                                isActive ? 'text-white' : ''
                            }`
                        }
                        style={({ isActive }) => ({
                            background: isActive ? 'var(--brand)' : 'transparent',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                            minHeight: '44px',
                        })}
                    >
                        <Cog6ToothIcon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3 truncate">{t('account_settings')}</span>}
                    </NavLink>

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={() => logout()}
                        style={{ color: 'var(--danger)', minHeight: '44px' }}
                        className="flex items-center w-full px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] hover:opacity-75 transition-opacity"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="ml-3">{t('secure_logout')}</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

/* ── Nav Section Header ── */
function NavSection({ label, collapsed, children, accent }) {
    return (
        <div className="mb-1">
            {!collapsed && (
                <p
                    style={{ color: accent === 'orange' ? '#ea580c' : 'var(--text-muted)' }}
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.3em]"
                >
                    {label}
                </p>
            )}
            {collapsed && <div className="my-3 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    );
}

/* ── Nav Item ── */
function NavItem({ to, icon, label, collapsed, end = false, color = 'indigo', badge = 0, navProps = {} }) {
    return (
        <NavLink
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className="block"
            {...navProps}
        >
            {({ isActive }) => (
                <span
                    style={{
                        background: isActive
                            ? color === 'orange' ? '#fff7ed' : 'var(--nav-active-bg)'
                            : 'transparent',
                        color: isActive
                            ? color === 'orange' ? '#c2410c' : 'var(--nav-active-text)'
                            : 'var(--nav-text)',
                        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                        minHeight: '44px',
                    }}
                    className={`relative flex items-center px-3 py-2.5 mx-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        collapsed ? 'justify-center mx-1' : ''
                    } ${isActive ? 'font-black scale-[1.02]' : ''}`}
                >
                    {isActive && (
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-3/5 w-1 rounded-r-full"
                            style={{ background: color === 'orange' ? '#ea580c' : 'var(--brand)' }}
                        />
                    )}
                    <span className={`flex-shrink-0 relative ${collapsed ? 'h-5 w-5' : 'h-4 w-4'}`}>
                        {React.cloneElement(icon, { className: 'h-full w-full', strokeWidth: isActive ? 2.5 : 1.75 })}
                        {badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-10">
                                {badge > 99 ? '99+' : badge}
                            </span>
                        )}
                    </span>
                    {!collapsed && <span className="ml-3 truncate">{label}</span>}
                </span>
            )}
        </NavLink>
    );
}

/* ── Hamburger button (exported so App.jsx can render it on mobile) ── */
export function HamburgerButton() {
    return (
        <button
            onClick={() => window.__rafSidebarToggle?.()}
            style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                minHeight: '44px',
                minWidth: '44px',
                boxShadow: 'var(--shadow-md)',
            }}
            className="flex items-center justify-center rounded-xl transition-all hover:opacity-80 active:scale-95"
            title="Open menu"
            aria-label="Open navigation menu"
        >
            <Bars3Icon className="h-5 w-5" />
        </button>
    );
}

export default Sidebar;