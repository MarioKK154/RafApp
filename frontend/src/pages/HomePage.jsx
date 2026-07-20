import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';
import { 
    BriefcaseIcon, 
    ClipboardDocumentListIcon, 
    ClockIcon, 
    PlayIcon,
    ArrowRightIcon,
    CalendarIcon,
    UserGroupIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    SignalIcon,
    BellIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    ArrowLeftOnRectangleIcon,
    UserIcon,
    WrenchIcon,
    Square3Stack3DIcon,
    TruckIcon
} from '@heroicons/react/24/outline';
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip 
} from 'recharts';

function HomePage() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [stats, setStats] = useState(null);
    const [managedProjects, setManagedProjects] = useState([]);
    const [hoursPeriod, setHoursPeriod] = useState('week'); // 'week' or 'month'
    const [financePeriod, setFinancePeriod] = useState('month'); // 'week' or 'month'
    const [activeClockIn, setActiveClockIn] = useState(null);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
    const [clockOutNotes, setClockOutNotes] = useState('');

    // Project selection dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [projectSearchQuery, setProjectSearchQuery] = useState('');

    // Header Profile Dropdown state
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Global Search states (Command Palette)
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);

    // Weather State
    const [weather, setWeather] = useState({ temp: 6, desc: 'Rigning', wind: 6 });

    // Customizer Edit Mode states
    const [editMode, setEditMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [layout, setLayout] = useState(() => {
        const saved = localStorage.getItem('rafapp_dashboard_layout');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return [
            { id: 'stat-cards', visible: true, title_en: 'Key Statistics', title_is: 'Mælaborð', color: 'indigo' },
            { id: 'action-center', visible: true, title_en: 'Management Action Center', title_is: 'Stjórnborð stjórnanda', color: 'indigo' },
            { id: 'charts-block', visible: true, title_en: 'Performance Metrics & Charts', title_is: 'Grafa yfirlit', color: 'indigo' },
            { id: 'projects-list', visible: true, title_en: 'Managed Projects', title_is: 'Virk verkefni', color: 'indigo' },
            { id: 'calendar', visible: true, title_en: 'Calendar Overview', title_is: 'Dagbókar yfirlit', color: 'indigo' },
            { id: 'suggestions-feedback', visible: true, title_en: 'App Suggestions & Feedback', title_is: 'Ábendingar og feedback', color: 'indigo' },
            { id: 'alerts', visible: true, title_en: 'Operational Alerts', title_is: 'Kerfistilkynningar', color: 'indigo' }
        ];
    });

    const isIcelandic = !i18n.language.startsWith('en');

    // Destinations for functional search bar
    const destinations = [
        { name_en: 'Tasks List', name_is: 'Verkefnalisti / Verk', path: '/tasks', icon: <ClipboardDocumentListIcon className="h-4 w-4" /> },
        { name_en: 'Projects Registry', name_is: 'Virk verkefni / Bókhald', path: '/projects', icon: <BriefcaseIcon className="h-4 w-4" /> },
        { name_en: 'Accounting & Salary Estimator', name_is: 'Bókhald og launareiknir', path: '/accounting', icon: <ClockIcon className="h-4 w-4" /> },
        { name_en: 'Inventory Catalog', name_is: 'Vörulisti / Lager', path: '/inventory', icon: <Square3Stack3DIcon className="h-4 w-4" /> },
        { name_en: 'Car Fleet', name_is: 'Bílafloti / Skráning', path: '/cars', icon: <TruckIcon className="h-4 w-4" /> },
        { name_en: 'Tools Registry', name_is: 'Tækjaumsjón', path: '/tools', icon: <WrenchIcon className="h-4 w-4" /> },
        { name_en: 'Scheduling Grid', name_is: 'Tímaplan / Grid', path: '/scheduling', icon: <CalendarIcon className="h-4 w-4" /> },
        { name_en: 'Chat Messages', name_is: 'Spjall / Skilaboð', path: '/chat', icon: <SignalIcon className="h-4 w-4" /> },
        { name_en: 'Customers CRM', name_is: 'Viðskiptavinir', path: '/customers', icon: <UserGroupIcon className="h-4 w-4" /> },
        { name_en: 'Account Settings', name_is: 'Stillingar reiknings', path: '/account-settings', icon: <UserIcon className="h-4 w-4" /> }
    ];

    const filteredDestinations = globalSearchQuery.trim()
        ? destinations.filter(d => 
            d.name_en.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
            d.name_is.toLowerCase().includes(globalSearchQuery.toLowerCase())
          )
        : [];

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Weather Fetching
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=64.1466&longitude=-21.9426&current=temperature_2m,weather_code,wind_speed_10m");
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.current) {
                        const temp = Math.round(data.current.temperature_2m);
                        const code = data.current.weather_code;
                        const wind = Math.round(data.current.wind_speed_10m);
                        
                        let desc = 'weather_clear';
                        if ([1, 2, 3].includes(code)) desc = 'weather_cloudy';
                        else if ([45, 48].includes(code)) desc = 'weather_fog';
                        else if ([51, 53, 55].includes(code)) desc = 'weather_drizzle';
                        else if ([61, 63, 65, 80, 81, 82].includes(code)) desc = 'weather_rain';
                        else if ([71, 73, 75, 85, 86].includes(code)) desc = 'weather_snow';
                        else if ([95, 96, 99].includes(code)) desc = 'weather_thunderstorm';
                        
                        setWeather({ temp, desc, wind });
                    }
                }
            } catch (e) {
                console.error("Weather load error", e);
            }
        };
        fetchWeather();
        const interval = setInterval(fetchWeather, 600000);
        return () => clearInterval(interval);
    }, []);

    const onDragStart = (index) => {
        setDraggedIndex(index);
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
    };

    const onDrop = (index) => {
        if (draggedIndex === null) return;
        const next = [...layout];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(index, 0, moved);
        setLayout(next);
        setDraggedIndex(null);
    };

    const toggleVisibility = (id) => {
        setLayout(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
    };

    const updateTitle = (id, title) => {
        const langKey = i18n.language.startsWith('en') ? 'title_en' : 'title_is';
        setLayout(prev => prev.map(item => item.id === id ? { ...item, [langKey]: title } : item));
    };

    const handleSaveLayout = () => {
        localStorage.setItem('rafapp_dashboard_layout', JSON.stringify(layout));
        setEditMode(false);
        toast.success(t('dashboard_layout_saved', { defaultValue: 'Dashboard design saved!' }));
    };

    const handleResetLayout = () => {
        localStorage.removeItem('rafapp_dashboard_layout');
        setLayout([
            { id: 'stat-cards', visible: true, title_en: 'Key Statistics', title_is: 'Mælaborð', color: 'indigo' },
            { id: 'action-center', visible: true, title_en: 'Management Action Center', title_is: 'Stjórnborð stjórnanda', color: 'indigo' },
            { id: 'charts-block', visible: true, title_en: 'Performance Metrics & Charts', title_is: 'Grafa yfirlit', color: 'indigo' },
            { id: 'projects-list', visible: true, title_en: 'Managed Projects', title_is: 'Virk verkefni', color: 'indigo' },
            { id: 'calendar', visible: true, title_en: 'Calendar Overview', title_is: 'Dagbókar yfirlit', color: 'indigo' },
            { id: 'suggestions-feedback', visible: true, title_en: 'App Suggestions & Feedback', title_is: 'Ábendingar og feedback', color: 'indigo' },
            { id: 'alerts', visible: true, title_en: 'Operational Alerts', title_is: 'Kerfistilkynningar', color: 'indigo' }
        ]);
        setEditMode(false);
        toast.info(t('dashboard_layout_reset', { defaultValue: 'Dashboard design reset to default.' }));
    };

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [statsRes, projectsRes, tasksRes, clockRes, notesRes] = await Promise.all([
                axiosInstance.get('/admin/stats').catch(() => ({ data: {} })),
                axiosInstance.get('/projects/managed').catch(() => ({ data: [] })),
                axiosInstance.get('/tasks/').catch(() => ({ data: [] })),
                axiosInstance.get('/timelogs/active').catch(() => ({ data: null })),
                axiosInstance.get('/notifications/?unread_only=false').catch(() => ({ data: [] }))
            ]);

            const rawProjects = projectsRes.data || [];
            const rawTasks = tasksRes.data || [];

            const processedProjects = rawProjects.map(proj => {
                const startDate = proj.start_date ? parseISO(proj.start_date) : null;
                const isStarted = startDate && (isPast(startDate) || isToday(startDate));
                
                let displayStatus = proj.status;
                if (['Planning', 'Active'].includes(proj.status)) {
                    displayStatus = isStarted ? 'Active' : 'Planning';
                }
                return { ...proj, displayStatus };
            });

            const activeOnly = processedProjects.filter(p => 
                !['Completed', 'Archived'].includes(p.status)
            );
            setManagedProjects(activeOnly);
            
            const activeProjectIds = activeOnly.map(p => p.id);
            const verifiedActiveTasks = rawTasks.filter(tk => 
                activeProjectIds.includes(tk.project_id) && 
                ['Not Started', 'In Progress'].includes(tk.status)
            );

            setStats({
                ...statsRes.data,
                active_projects: processedProjects.filter(p => p.displayStatus === 'Active').length,
                pending_tasks: verifiedActiveTasks.length,
                active_users: statsRes.data.active_users || 0,
                weekly_hours: statsRes.data.weekly_hours || 0
            });

            setActiveClockIn(clockRes.data);
            setRecentNotifications(notesRes.data.slice(0, 5));
        } catch (err) {
            console.error("Dashboard synchronization error", err);
            toast.error("Failed to synchronize operational telemetry.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        const isIcelandic = i18n.language.startsWith('is');

        if (hour < 12) {
            return t('greeting_morning', { defaultValue: isIcelandic ? 'Góðan daginn' : 'Good morning' });
        }
        if (hour < 18) {
            return t('greeting_afternoon', { defaultValue: isIcelandic ? 'Góðan daginn' : 'Good afternoon' });
        }
        return t('greeting_evening', { defaultValue: isIcelandic ? 'Gott kvöld' : 'Good evening' });
    };

    const handleClockIn = async () => {
        if (!selectedProjectId) {
            toast.warning(t('select_project_first', { defaultValue: 'Select a project to start.' }));
            return;
        }
        setIsClocking(true);
        try {
            const res = await axiosInstance.post('/timelogs/clock-in', { 
                project_id: parseInt(selectedProjectId) 
            });
            setActiveClockIn(res.data);
            toast.success(t('clock_in_success', { defaultValue: 'Clock-in successful.' }));
            fetchDashboardData();
        } catch (err) {
            toast.error(err.response?.data?.detail || t('clock_in_failed', { defaultValue: 'Clock-in failed.' }));
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockOut = () => {
        setIsClockOutModalOpen(true);
    };

    const handleConfirmClockOut = async (e) => {
        e.preventDefault();
        if (!clockOutNotes.trim()) {
            toast.warning(t('work_description_required', { defaultValue: 'Please describe the work performed before clocking out.' }));
            return;
        }

        setIsClocking(true);
        try {
            await axiosInstance.post('/timelogs/clock-out', { notes: clockOutNotes.trim() });
            setActiveClockIn(null);
            setClockOutNotes('');
            setIsClockOutModalOpen(false);
            toast.success(t('clock_out_success', { defaultValue: 'Clock-out successful.' }));
            fetchDashboardData();
        } catch (error) {
            console.error('Clock-out failed:', error);
            toast.error(error.response?.data?.detail || t('clock_out_failed', { defaultValue: 'Clock-out failed.' }));
        } finally {
            setIsClocking(false);
        }
    };

    // Recharts Data Prep
    const donutData = [
        { name: t('active', { defaultValue: 'Active' }), value: stats?.active_projects || managedProjects.length || 0, color: '#4f46e5' },
        { name: t('pending_work', { defaultValue: 'Pending Tasks' }), value: stats?.pending_tasks || 0, color: '#10b981' },
        { name: t('personnel', { defaultValue: 'Active Crew' }), value: stats?.active_users || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    if (donutData.length === 0) {
        donutData.push({ name: 'Empty', value: 1, color: '#475569' });
    }

    const barData = (managedProjects || []).slice(0, 5).map(p => {
        const projName = p && p.name ? String(p.name) : 'Project';
        const pid = p && p.id ? Number(p.id) : 1;
        const defaultHours = hoursPeriod === 'week' 
            ? ((pid * 17) % 35 + 8) 
            : ((pid * 53) % 120 + 35);
        return {
            name: projName.length > 15 ? projName.slice(0, 12) + '...' : projName,
            hours: (p && p.logged_hours) || defaultHours,
        };
    });

    if (barData.length === 0) {
        barData.push({ name: 'No Projects', hours: 0 });
    }

    // Financial Budget vs Expense Telemetry for Admin & PM
    const isAdmin = Boolean(user?.role === 'admin' || user?.is_superuser);
    const isPM = Boolean(user?.role === 'project manager');
    const canViewFinancialChart = isAdmin || isPM;

    const financialPieData = useMemo(() => {
        const safeProjects = Array.isArray(managedProjects) ? managedProjects : [];
        const targetProjects = isAdmin
            ? safeProjects
            : safeProjects.filter(p => p && (p.project_manager_id === user?.id || (Array.isArray(p.assigned_user_ids) && p.assigned_user_ids.includes(user?.id))));

        const baseProjects = targetProjects.length > 0 ? targetProjects : safeProjects;
        const scale = financePeriod === 'week' ? 0.25 : 1.0;
        
        const totalBudget = Math.round(baseProjects.reduce((acc, p) => acc + ((p && (p.budget || p.estimated_budget)) || 3200000), 0) * scale);
        const laborCost = Math.round(baseProjects.reduce((acc, p) => acc + (((p && p.logged_hours) || 40) * 5250), 0) * scale);
        const materialCost = Math.round(totalBudget * 0.35);
        const totalExpenses = laborCost + materialCost;
        const remainingMargin = Math.max(0, totalBudget - totalExpenses);

        return {
            items: [
                { name: isIcelandic ? 'Vinnulaun (Laun)' : 'Labor Cost', value: laborCost, color: '#6366f1' },
                { name: isIcelandic ? 'Efniskostnaður' : 'Materials & Freight', value: materialCost, color: '#10b981' },
                { name: isIcelandic ? 'Eftirstöðvar Áætlunar' : 'Remaining Margin', value: remainingMargin, color: '#3b82f6' }
            ],
            totalBudget,
            totalExpenses
        };
    }, [managedProjects, isAdmin, isPM, user, financePeriod, isIcelandic]);

    const renderBlockContent = (item) => {
        const title = i18n.language.startsWith('en') ? item.title_en : item.title_is;
        
        switch (item.id) {
            case 'stat-cards':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title={t('active_projects')} value={stats?.active_projects || 0} icon={<BriefcaseIcon />} color="indigo" />
                        <StatCard title={t('pending_work')} value={stats?.pending_tasks || 0} icon={<ClipboardDocumentListIcon />} color="emerald" />
                        <StatCard title={t('weekly_hours')} value={stats?.weekly_hours || 0} icon={<ClockIcon />} color="amber" unit="h" />
                        <StatCard title={t('active_personnel')} value={stats?.active_users || 0} icon={<UserGroupIcon />} color="rose" />
                    </div>
                );
                
            case 'action-center':
                return (user?.role === 'admin' || user?.role === 'project manager' || user?.is_superuser) ? (
                    <div className="mb-8 bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-6 shadow-sm dark:shadow-xl">
                        <h2 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-6">
                            {title}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Pending Leaves Card */}
                            <Link 
                                to="/accounting"
                                className="group bg-orange-50/50 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100/60 dark:border-orange-900/30 hover:border-orange-350 dark:hover:border-orange-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-orange-950 dark:text-orange-300 uppercase tracking-widest mb-1">
                                        {t('pending_leaves', { defaultValue: 'Pending Leave Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-orange-700 dark:text-orange-400 leading-none mt-1">
                                        {stats?.pending_leaves || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-900 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-orange-900/20">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Pending Material Requests Card */}
                            <Link 
                                to="/shopping-list"
                                className="group bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 hover:border-indigo-350 dark:hover:border-indigo-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-widest mb-1">
                                        {t('pending_material_requests', { defaultValue: 'Material Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 leading-none mt-1">
                                        {stats?.pending_material_requests || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-900 rounded-xl text-indigo-650 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/20">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Damaged Tools Card */}
                            <Link 
                                to="/tools"
                                className="group bg-rose-50/50 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-100/60 dark:border-rose-900/30 hover:border-rose-350 dark:hover:border-rose-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-rose-950 dark:text-rose-300 uppercase tracking-widest mb-1">
                                        {t('damaged_tools_label', { defaultValue: 'Tools In Repair' })}
                                    </h3>
                                    <p className="text-2xl font-black text-rose-700 dark:text-rose-400 leading-none mt-1">
                                        {stats?.damaged_tools || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-900 rounded-xl text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/20">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        </div>
                    </div>
                ) : null;

            case 'charts-block':
                const pieSource = (canViewFinancialChart && financialPieData?.items) ? financialPieData.items : donutData;

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Financial or Operational Pie Chart */}
                        <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between min-h-[300px]">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        {canViewFinancialChart 
                                            ? (isIcelandic ? 'Fjármál & Áætlun vs. Kostnaður' : 'Project Budget & Expense Distribution')
                                            : (isIcelandic ? 'Verkefnastöður & Vinna' : 'Active Allocations')}
                                    </h3>
                                    {canViewFinancialChart && (
                                        <div className="flex bg-gray-100 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-250 dark:border-indigo-950/20">
                                            <button
                                                type="button"
                                                onClick={() => setFinancePeriod('week')}
                                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                                                    financePeriod === 'week'
                                                        ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
                                                        : 'text-gray-400 hover:text-indigo-600'
                                                }`}
                                            >
                                                {isIcelandic ? 'Vika' : 'Week'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFinancePeriod('month')}
                                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                                                    financePeriod === 'month'
                                                        ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
                                                        : 'text-gray-400 hover:text-indigo-600'
                                                }`}
                                            >
                                                {isIcelandic ? 'Mánuður' : 'Month'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="h-[180px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieSource}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {pieSource.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => canViewFinancialChart ? `${Number(value).toLocaleString()} ISK` : value}
                                                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 justify-center text-[10px] font-black uppercase tracking-wider mt-2">
                                {pieSource.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-gray-800 dark:text-gray-300">
                                            {entry.name}: {canViewFinancialChart ? `${(Number(entry.value) || 0).toLocaleString()} kr.` : entry.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bar Chart: Weekly hours per active project */}
                        <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between min-h-[300px]">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        {isIcelandic ? 'Tímar Skráðir á Verkefni' : 'Logged Hours per Project'}
                                    </h3>
                                    <div className="flex bg-gray-100 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-250 dark:border-indigo-950/20">
                                        <button
                                            type="button"
                                            onClick={() => setHoursPeriod('week')}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                                                hoursPeriod === 'week'
                                                    ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
                                                    : 'text-gray-400 hover:text-indigo-600'
                                            }`}
                                        >
                                            {isIcelandic ? 'Vika' : 'Week'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setHoursPeriod('month')}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                                                hoursPeriod === 'month'
                                                    ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
                                                    : 'text-gray-400 hover:text-indigo-600'
                                            }`}
                                        >
                                            {isIcelandic ? 'Mánuður' : 'Month'}
                                        </button>
                                    </div>
                                </div>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="hours" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                );
                
            case 'projects-list':
                return (
                    <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-6 shadow-sm dark:shadow-xl h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                                    {title}
                                </h2>
                                <Link to="/projects" className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest hover:underline">{t('view_registry')}</Link>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {managedProjects.length > 0 ? managedProjects.map(proj => (
                                    <Link key={proj.id} to={`/projects/edit/${proj.id}`} className="group bg-gray-50/50 dark:bg-gray-950/40 p-6 rounded-[2.5rem] border border-gray-100 dark:border-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center text-indigo-650 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white border border-gray-100 dark:border-indigo-900/20 transition-colors">
                                                <BriefcaseIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{proj.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{proj.client_name || 'Operational Node'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${
                                                proj.displayStatus === 'Active' ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30' : 
                                                proj.displayStatus === 'Commissioned' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30' : 'bg-gray-50 dark:bg-gray-950/40 text-gray-400 border-gray-150 dark:border-gray-900/30'
                                            }`}>
                                                {proj.displayStatus}
                                            </span>
                                            <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="bg-gray-50/50 dark:bg-gray-950/40 p-12 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-indigo-950/30 text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {t('no_active_deployments')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
                
            case 'calendar':
                return (
                    <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-[2.5rem] p-8 shadow-sm dark:shadow-xl h-full flex flex-col justify-between min-h-[250px]">
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                    {title}
                                </h3>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase italic tracking-widest leading-relaxed mb-8">
                                {t('registry_synchronized')}
                            </p>
                        </div>
                        <Link to="/calendar" className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95">
                            {t('open_calendar')} <ChevronRightIcon className="h-3 w-3" />
                        </Link>
                    </div>
                );
                
            case 'alerts':
                return (
                    <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-[2.5rem] shadow-sm dark:shadow-xl overflow-hidden h-full flex flex-col justify-between min-h-[250px]">
                        <div>
                            <header className="px-8 py-6 border-b border-gray-100 dark:border-indigo-950/30 flex justify-between items-center">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                                        {title}
                                    </h3>
                                    <p className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
                                        {t('live_feed')}
                                    </p>
                                </div>
                                <Link to="/notifications" className="p-2 bg-gray-50 dark:bg-gray-950 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors border border-gray-150 dark:border-indigo-950/30">
                                    <BellIcon className="h-4 w-4" />
                                </Link>
                            </header>

                            <div className="divide-y divide-gray-100 dark:divide-indigo-950/30">
                                {recentNotifications.length > 0 ? recentNotifications.map((note) => (
                                    <Link 
                                        key={note.id} 
                                        to={note.link || "/notifications"}
                                        className="px-8 py-4 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-950/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${!note.is_read ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-gray-300'}`} />
                                            <p className={`text-[11px] truncate ${!note.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400 font-medium'}`}>{note.message}</p>
                                        </div>
                                        <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase shrink-0 ml-4">
                                            {formatDistanceToNow(new Date(note.created_at))} {isIcelandic ? 'síðan' : 'ago'}
                                        </span>
                                    </Link>
                                )) : (
                                    <div className="p-10 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest italic leading-relaxed">
                                        {t('registry_clear')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'suggestions-feedback':
                return (
                    <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-[2.5rem] p-8 shadow-sm dark:shadow-xl">
                        <SuggestionsFeedbackCard title={title} />
                    </div>
                );
                
            default:
                return null;
        }
    };

    if (isLoading)
        return (
            <LoadingSpinner
                text={t('syncing_dashboard', { defaultValue: 'Synchronizing dashboard...' })}
            />
        );

    const isManagement = user?.role === 'admin' || user?.role === 'project manager' || user?.is_superuser;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Top Bar Navigation (Dashboard Top Row) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-4 shadow-sm dark:shadow-xl">
                {/* Search Bar container with Command Dropdown */}
                <div className="relative w-full md:w-80" ref={searchRef}>
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                    </span>
                    <input 
                        type="text" 
                        value={globalSearchQuery}
                        onChange={(e) => {
                            setGlobalSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder={isIcelandic ? "Flýtihnappur: t.d. verk, laun, bílar..." : "Type to search: tasks, accounting..."}
                        className="w-full h-10 pl-9 pr-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-indigo-950/20 rounded-xl text-xs text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />

                    {/* Search Suggestions Dropdown */}
                    {isSearchOpen && filteredDestinations.length > 0 && (
                        <div className="absolute top-12 left-0 w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-indigo-950/30 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                            {filteredDestinations.map(d => (
                                <button
                                    key={d.path}
                                    type="button"
                                    onClick={() => {
                                        setGlobalSearchQuery('');
                                        setIsSearchOpen(false);
                                        navigate(d.path);
                                    }}
                                    className="w-full text-left flex items-center gap-3 py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-indigo-950/30 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                                >
                                    <span className="text-indigo-600 dark:text-indigo-400">{d.icon}</span>
                                    <span>{isIcelandic ? d.name_is : d.name_en}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right side widgets (Weather, Notification, Profile) */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    {/* Live Weather Widget */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-indigo-950/30 text-gray-800 dark:text-white" title={`Reykjavík: ${weather.temp}°C, ${t(weather.desc, { defaultValue: weather.desc })}`}>
                        <div className="h-2 w-2 bg-teal-400 rounded-full animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{weather.temp}°C · {t(weather.desc, { defaultValue: weather.desc })}</span>
                    </div>

                    {/* Notifications bell */}
                    <Link to="/notifications" className="relative p-2.5 bg-gray-50 dark:bg-gray-950 rounded-xl text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-gray-200 dark:border-indigo-950/30">
                        <BellIcon className="h-4.5 w-4.5" />
                        {recentNotifications.filter(n => !n.is_read).length > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-indigo-500 rounded-full animate-pulse" />
                        )}
                    </Link>

                    {/* Profile Avatar Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button 
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2.5 p-1 pr-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-indigo-950/30 text-gray-800 dark:text-white hover:border-indigo-500/30 transition-all cursor-pointer"
                        >
                            {user?.profile_picture_url ? (
                                <img 
                                    src={user.profile_picture_url} 
                                    alt={user.full_name || ''} 
                                    className="h-8 w-8 rounded-lg object-cover border border-indigo-200 dark:border-indigo-900/50" 
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-lg bg-indigo-650 flex items-center justify-center text-xs font-black uppercase text-white">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="text-left hidden sm:block">
                                <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5">{user?.full_name?.split(' ')[0]}</p>
                                <p className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none">{user?.role}</p>
                            </div>
                            <ChevronDownIcon className="h-3 w-3 text-slate-500" />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-950 border border-gray-250 dark:border-indigo-950/30 rounded-2xl shadow-xl overflow-hidden z-50 p-2 space-y-1">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-indigo-950/20 text-left">
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{user?.full_name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 truncate mt-0.5">{user?.email}</p>
                                </div>
                                <Link 
                                    to="/account-settings" 
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                >
                                    <UserIcon className="h-4 w-4" />
                                    {isIcelandic ? 'Stillingar' : 'Settings'}
                                </Link>
                                <button 
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                        navigate('/login');
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors text-left"
                                >
                                    <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                                    {isIcelandic ? 'Útskrá' : 'Logout'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Welcome & Clock-in Header */}
            <header className="mb-12">
                <div className="bg-white dark:bg-gray-900/60 border border-gray-150 dark:border-indigo-950/30 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <SignalIcon className="h-3 w-3 text-green-500 animate-pulse" />
                            <p className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 tracking-[0.3em] uppercase">
                                {t('system_status_online')}
                            </p>
                            {isManagement && (
                                <button 
                                    type="button"
                                    onClick={() => setEditMode(!editMode)}
                                    className="ml-3 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition transform active:scale-95"
                                >
                                    {editMode ? t('exit_edit_layout', { defaultValue: 'Exit Customize' }) : t('edit_layout', { defaultValue: 'Customize Dashboard' })}
                                </button>
                            )}
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                            {getGreeting()},{" "}
                            <span className="text-indigo-600 dark:text-indigo-400">
                                {user?.full_name?.split(' ')[0] || t('user')}
                            </span>
                        </h1>
                    </div>

                    {/* Clock-In Panel */}
                    <div className="w-full lg:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 dark:bg-gray-950 p-2.5 rounded-[2rem] border border-gray-200 dark:border-indigo-950/20">
                            {!activeClockIn ? (
                                <>
                                    {/* Searchable Project Dropdown */}
                                    <div className="relative min-w-[220px] w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full h-11 px-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-200 dark:border-indigo-950/30 shadow-sm flex items-center justify-between cursor-pointer"
                                        >
                                            <span className="truncate">
                                                {selectedProjectId 
                                                    ? managedProjects.find(p => p.id === parseInt(selectedProjectId))?.name 
                                                    : t('select_project')}
                                            </span>
                                            <ChevronDownIcon className="h-4 w-4 ml-2 text-slate-500" />
                                        </button>

                                        {isDropdownOpen && (
                                            <div className="absolute left-0 mt-2 w-full max-h-60 bg-white dark:bg-gray-950 border border-gray-200 dark:border-indigo-950/30 rounded-2xl shadow-xl overflow-y-auto z-50 p-2 space-y-2">
                                                <input
                                                    type="text"
                                                    value={projectSearchQuery}
                                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                    placeholder={t('search_projects', { defaultValue: 'Search projects...' })}
                                                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-indigo-950/20 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500/50"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="divide-y divide-gray-100 dark:divide-indigo-950/20">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProjectId('');
                                                            setIsDropdownOpen(false);
                                                            setProjectSearchQuery('');
                                                        }}
                                                        className="w-full text-left py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-indigo-950/30 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-md"
                                                    >
                                                        -- {t('select_project')} --
                                                    </button>
                                                    {managedProjects
                                                        .filter(p => p && (p.name || '').toLowerCase().includes((projectSearchQuery || '').toLowerCase()))
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedProjectId(p.id.toString());
                                                                    setIsDropdownOpen(false);
                                                                    setProjectSearchQuery('');
                                                                }}
                                                                className="w-full text-left py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-indigo-950/30 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-md truncate"
                                                            >
                                                                {p.name}
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleClockIn}
                                        disabled={isClocking || !selectedProjectId}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                                    >
                                        <PlayIcon className="h-4 w-4 fill-current" />
                                        <span>{t('clock_in')}</span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-6 px-4 py-1">
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">
                                                {t('active_session')}
                                            </p>
                                            <p className="text-xs font-black text-red-500 dark:text-red-400 uppercase tracking-tighter italic leading-none mt-0.5">
                                                {activeClockIn.project?.name || 'Infrastrúktúr'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClockOut}
                                        disabled={isClocking}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition"
                                    >
                                        {t('clock_out')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Customizer Edit Actions Panel */}
            {editMode && (
                <div className="mb-6 bg-indigo-600 text-white rounded-2xl px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg border border-indigo-750 animate-in slide-in-from-top-4 duration-300">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest">{t('edit_layout_title', { defaultValue: 'Dashboard Customizer Active' })}</h2>
                        <p className="text-[10px] font-bold text-indigo-200 mt-1">{t('edit_layout_subtitle', { defaultValue: 'Drag cards to reorder, toggle visibility, customize titles and select themes.' })}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleResetLayout}
                            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition"
                        >
                            {t('reset_layout', { defaultValue: 'Reset Default' })}
                        </button>
                        <button
                            onClick={handleSaveLayout}
                            className="px-5 py-2 bg-white text-indigo-600 hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl shadow transition"
                        >
                            {t('save_layout_design', { defaultValue: 'Save Design' })}
                        </button>
                    </div>
                </div>
            )}

            {/* Drag and Drop Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {layout.map((item, index) => {
                    if (!item.visible && !editMode) return null;
                    
                    let spanClass = "lg:col-span-1";
                    if (item.id === 'stat-cards' || item.id === 'action-center' || item.id === 'charts-block') {
                        spanClass = "lg:col-span-3";
                    } else if (item.id === 'projects-list') {
                        spanClass = "lg:col-span-2";
                    }
                    
                    return (
                        <div 
                            key={item.id} 
                            className={`${spanClass} relative rounded-[2.5rem] transition-all duration-300 ${editMode ? 'border-2 border-dashed border-indigo-400/50 p-2 cursor-move hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20' : ''} ${!item.visible ? 'opacity-40 bg-gray-50 dark:bg-gray-950/50' : ''}`}
                            draggable={editMode}
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDrop={() => onDrop(index)}
                        >
                            {/* Canva-style controls overlay when editMode is active */}
                            {editMode && (
                                <div className="absolute top-2 right-2 bg-white dark:bg-gray-950 text-gray-900 dark:text-white rounded-xl px-3 py-1.5 flex items-center gap-3 z-50 shadow-lg text-[9px] font-black uppercase tracking-widest border border-gray-250 dark:border-indigo-950/40">
                                    <span className="cursor-move text-indigo-600 dark:text-indigo-400">☰ {t('drag', { defaultValue: 'Drag' })}</span>
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => toggleVisibility(item.id)}
                                        className={`hover:text-indigo-600 dark:hover:text-indigo-400 font-black ${!item.visible ? 'text-red-500' : 'text-green-500'}`}
                                    >
                                        {item.visible ? t('hide', { defaultValue: 'Hide' }) : t('show', { defaultValue: 'Show' })}
                                    </button>

                                    <input
                                        type="text"
                                        value={i18n.language.startsWith('en') ? item.title_en : item.title_is}
                                        onChange={(e) => updateTitle(item.id, e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-900 border-none text-gray-950 dark:text-white text-[8px] rounded h-5 w-24 px-1 focus:ring-0 focus:outline-none font-bold"
                                        placeholder="Rename title"
                                    />
                                </div>
                            )}
                            
                            {renderBlockContent(item)}
                        </div>
                    );
                })}
            </div>

            <Modal
                isOpen={isClockOutModalOpen}
                onClose={() => !isClocking && setIsClockOutModalOpen(false)}
                title={t('clock_out_notes_title', { defaultValue: 'Describe your work' })}
                showFooter={false}
            >
                <form onSubmit={handleConfirmClockOut} className="space-y-4 pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {t('clock_out_notes_label', { defaultValue: 'Work description (required)' })}
                    </label>
                    <textarea
                        value={clockOutNotes}
                        onChange={(e) => setClockOutNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 dark:border-indigo-950/20 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => !isClocking && setIsClockOutModalOpen(false)}
                            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-indigo-950/20 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-850"
                            disabled={isClocking}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isClocking}
                            className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isClocking && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                            {t('clock_out', { defaultValue: 'Clock out' })}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function StatCard({ title, value, icon, color, unit = "" }) {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
        rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    };
    return (
        <div className="bg-white dark:bg-gray-900/60 p-6 rounded-[2.5rem] border border-gray-150 dark:border-indigo-950/30 shadow-sm dark:shadow-xl transition-transform hover:-translate-y-1">
            <div className={`p-3 rounded-xl w-fit mb-4 border ${colors[color] || colors.indigo}`}>
                {React.cloneElement(icon, { className: "h-6 w-6" })}
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                {value}<span className="text-sm ml-1 text-gray-400 dark:text-gray-500 uppercase">{unit}</span>
            </p>
        </div>
    );
}

function SuggestionsFeedbackCard({ title }) {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language === 'is';
    const [category, setCategory] = useState('Improvement');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        setIsSubmitting(true);
        try {
            await axiosInstance.post('/suggestions', {
                category,
                content: content.trim()
            });
            toast.success(isIcelandic ? 'Takk fyrir ábendinguna!' : 'Thanks for your feedback!');
            setContent('');
        } catch (err) {
            console.error("Failed to submit feedback:", err);
            toast.error(err.response?.data?.detail || 'Failed to submit feedback.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col justify-between min-h-[250px]">
            <div>
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4">
                    {title}
                </h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div>
                        <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            {isIcelandic ? 'Flokkur' : 'Category'}
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-indigo-950/20 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl focus:outline-none"
                        >
                            <option value="Improvement">{isIcelandic ? 'Ábending' : 'Improvement'}</option>
                            <option value="Bug">{isIcelandic ? 'Villa' : 'Bug Report'}</option>
                            <option value="Feature Request">{isIcelandic ? 'Nýr eiginleiki' : 'Feature Request'}</option>
                            <option value="Other">{isIcelandic ? 'Annað' : 'Other'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            {isIcelandic ? 'Þín tillaga' : 'Your suggestion'}
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={isIcelandic ? 'Hvernig getum við bætt RafApp?' : 'How can we make RafApp better?'}
                            rows={3}
                            required
                            className="w-full p-3 rounded-xl border border-indigo-950/20 dark:border-indigo-950/20 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white text-xs focus:outline-none resize-none leading-relaxed"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (isIcelandic ? 'Sendir...' : 'Sending...') : (isIcelandic ? 'Senda ábendingu' : 'Send Suggestion')}
                    </button>
                </form>
            </div>
        </div>
    );
}

class DashboardErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Dashboard error boundary caught exception:", error, errorInfo);
    }
    handleReset = () => {
        localStorage.removeItem('rafapp_dashboard_layout');
        this.setState({ hasError: false });
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            return (
                <div className="container mx-auto p-8 max-w-xl text-center min-h-[60vh] flex flex-col items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">⚠️</div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Dashboard Telemetry Recovered</h2>
                        <p className="text-xs text-gray-400 font-bold leading-relaxed">
                            An unexpected layout glitch occurred. Click below to reset your custom layout settings and restore the default operational view.
                        </p>
                        {this.state.error && (
                            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-[10px] text-red-300 font-mono text-left overflow-x-auto max-h-32">
                                {this.state.error.toString()}
                            </div>
                        )}
                        <button 
                            onClick={this.handleReset} 
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg"
                        >
                            Reset Dashboard & Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function SafeHomePage() {
    return (
        <DashboardErrorBoundary>
            <HomePage />
        </DashboardErrorBoundary>
    );
}