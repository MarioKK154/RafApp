import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
} from '@heroicons/react/24/outline';

function HomePage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    
    const [stats, setStats] = useState(null);
    const [managedProjects, setManagedProjects] = useState([]);
    const [activeClockIn, setActiveClockIn] = useState(null);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
    const [clockOutNotes, setClockOutNotes] = useState('');

    // Dropdown state for searchable project selector
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [projectSearchQuery, setProjectSearchQuery] = useState('');

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
            { id: 'projects-list', visible: true, title_en: 'Managed Projects', title_is: 'Virk verkefni', color: 'indigo' },
            { id: 'calendar', visible: true, title_en: 'Calendar Overview', title_is: 'Dagbókar yfirlit', color: 'indigo' },
            { id: 'suggestions-feedback', visible: true, title_en: 'App Suggestions & Feedback', title_is: 'Ábendingar og feedback', color: 'indigo' },
            { id: 'alerts', visible: true, title_en: 'Operational Alerts', title_is: 'Kerfistilkynningar', color: 'indigo' }
        ];
    });

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

    const updateColor = (id, color) => {
        setLayout(prev => prev.map(item => item.id === id ? { ...item, color } : item));
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

    const renderBlockContent = (item) => {
        const title = i18n.language.startsWith('en') ? item.title_en : item.title_is;
        
        switch (item.id) {
            case 'stat-cards':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title={t('active_projects')} value={stats?.active_projects || 0} icon={<BriefcaseIcon />} color={item.color || "indigo"} />
                        <StatCard title={t('pending_work')} value={stats?.pending_tasks || 0} icon={<ClipboardDocumentListIcon />} color={item.color || "emerald"} />
                        <StatCard title={t('weekly_hours')} value={stats?.weekly_hours || 0} icon={<ClockIcon />} color={item.color || "amber"} unit="h" />
                        <StatCard title={t('active_personnel')} value={stats?.active_users || 0} icon={<UserGroupIcon />} color={item.color || "rose"} />
                    </div>
                );
                
            case 'action-center':
                return (user?.role === 'admin' || user?.role === 'project manager' || user?.is_superuser) ? (
                    <div className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-6">
                            {title}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Pending Leaves Card */}
                            <Link 
                                to="/accounting"
                                className="group bg-orange-50/50 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100/60 dark:border-orange-900/30 hover:border-orange-300 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-orange-950 dark:text-orange-300 uppercase tracking-widest mb-1">
                                        {t('pending_leaves', { defaultValue: 'Pending Leave Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-orange-700 dark:text-orange-400 leading-none mt-1">
                                        {stats?.pending_leaves || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-800 rounded-xl text-orange-600 shadow-sm">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Pending Material Requests Card */}
                            <Link 
                                to="/shopping-list"
                                className="group bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 hover:border-indigo-300 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-widest mb-1">
                                        {t('pending_material_requests', { defaultValue: 'Material Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 leading-none mt-1">
                                        {stats?.pending_material_requests || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-800 rounded-xl text-indigo-600 shadow-sm">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Damaged Tools Card */}
                            <Link 
                                to="/tools"
                                className="group bg-red-50/50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-100/60 dark:border-red-900/30 hover:border-red-300 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-red-950 dark:text-red-300 uppercase tracking-widest mb-1">
                                        {t('damaged_tools_label', { defaultValue: 'Tools In Repair' })}
                                    </h3>
                                    <p className="text-2xl font-black text-red-700 dark:text-red-400 leading-none mt-1">
                                        {stats?.damaged_tools || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-white dark:bg-gray-800 rounded-xl text-red-600 shadow-sm">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        </div>
                    </div>
                ) : null;
                
            case 'projects-list':
                return (
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 h-full flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                                    {title}
                                </h2>
                                <Link to="/projects" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">{t('view_registry')}</Link>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {managedProjects.length > 0 ? managedProjects.map(proj => (
                                    <Link key={proj.id} to={`/projects/edit/${proj.id}`} className="group bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                                <BriefcaseIcon className="h-6 w-6 text-gray-400 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{proj.name}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{proj.client_name || 'Operational Node'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${
                                                proj.displayStatus === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 
                                                proj.displayStatus === 'Commissioned' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                                            }`}>
                                                {proj.displayStatus}
                                            </span>
                                            <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="bg-white dark:bg-gray-800 p-12 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700 text-center">
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
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col justify-between min-h-[250px]">
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
                        <Link to="/calendar" className="flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95">
                            {t('open_calendar')} <ChevronRightIcon className="h-3 w-3" />
                        </Link>
                    </div>
                );
                
            case 'alerts':
                return (
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col justify-between min-h-[250px]">
                        <div>
                            <header className="px-8 py-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">
                                        {title}
                                    </h3>
                                    <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                                        {t('live_feed')}
                                    </p>
                                </div>
                                <Link to="/notifications" className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors">
                                    <BellIcon className="h-4 w-4" />
                                </Link>
                            </header>

                            <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                {recentNotifications.length > 0 ? recentNotifications.map((note) => (
                                    <Link 
                                        key={note.id} 
                                        to={note.link || "/notifications"}
                                        className="px-8 py-4 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${!note.is_read ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`} />
                                            <p className={`text-[11px] truncate ${!note.is_read ? 'font-black text-gray-900 dark:text-white' : 'text-gray-400 font-medium'}`}>{note.message}</p>
                                        </div>
                                        <span className="text-[8px] font-black text-gray-300 uppercase shrink-0 ml-4">
                                            {formatDistanceToNow(new Date(note.created_at))} ago
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
                return <SuggestionsFeedbackCard title={title} />;
                
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
            {/* Header Area */}
            <header className="mb-12 relative z-50">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <SignalIcon className="h-3 w-3 text-green-500" />
                        <p className="text-[10px] font-black text-indigo-500 tracking-[0.3em]">
                            {t('system_status_online')}
                        </p>
                        {isManagement && (
                            <button 
                                type="button"
                                onClick={() => setEditMode(!editMode)}
                                className="ml-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition transform active:scale-95"
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

                <div className="w-full md:w-auto">
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        {!activeClockIn ? (
                            <>
                                {/* Searchable Project Dropdown */}
                                <div className="relative min-w-[220px]">
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full h-12 px-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between cursor-pointer"
                                    >
                                        <span className="truncate">
                                            {selectedProjectId 
                                                ? managedProjects.find(p => p.id === parseInt(selectedProjectId))?.name 
                                                : t('select_project')}
                                        </span>
                                        <ChevronDownIcon className="h-4 w-4 ml-2 text-gray-400" />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute left-0 mt-2 w-full max-h-60 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-y-auto z-50 p-2 space-y-2">
                                            <input
                                                type="text"
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                placeholder={t('search_projects', { defaultValue: 'Search projects...' })}
                                                className="w-full h-10 px-3 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProjectId('');
                                                        setIsDropdownOpen(false);
                                                        setProjectSearchQuery('');
                                                    }}
                                                    className="w-full text-left py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-md"
                                                >
                                                    -- {t('select_project')} --
                                                </button>
                                                {managedProjects
                                                    .filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProjectId(p.id.toString());
                                                                setIsDropdownOpen(false);
                                                                setProjectSearchQuery('');
                                                            }}
                                                            className="w-full text-left py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-md truncate"
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
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50"
                                >
                                    <PlayIcon className="h-4 w-4 fill-current" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {t('clock_in')}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-6 px-6 py-1">
                                <div className="flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                            {t('active_session')}
                                        </p>
                                        <p className="text-xs font-black text-red-500 uppercase tracking-tighter italic">
                                            {activeClockIn.project?.name || 'Infrastrúktúr'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClockOut}
                                    disabled={isClocking}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition"
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
                <div className="mb-6 bg-indigo-600 text-white rounded-2xl px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg border border-indigo-700 animate-in slide-in-from-top-4 duration-300">
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
                    if (item.id === 'stat-cards' || item.id === 'action-center') {
                        spanClass = "lg:col-span-3";
                    } else if (item.id === 'projects-list') {
                        spanClass = "lg:col-span-2";
                    }
                    
                    return (
                        <div 
                            key={item.id} 
                            className={`${spanClass} relative rounded-[2.5rem] transition-all duration-300 ${editMode ? 'border-2 border-dashed border-indigo-400/50 p-2 cursor-move hover:bg-indigo-50/10' : ''} ${!item.visible ? 'opacity-40 bg-gray-50 dark:bg-gray-900/50' : ''}`}
                            draggable={editMode}
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDrop={() => onDrop(index)}
                        >
                            {/* Canva-style controls overlay when editMode is active */}
                            {editMode && (
                                <div className="absolute top-2 right-2 bg-gray-900/90 text-white rounded-xl px-3 py-1.5 flex items-center gap-3 z-50 shadow-lg text-[9px] font-black uppercase tracking-widest border border-gray-700/80">
                                    <span className="cursor-move text-indigo-400">☰ {t('drag', { defaultValue: 'Drag' })}</span>
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => toggleVisibility(item.id)}
                                        className={`hover:text-indigo-400 font-black ${!item.visible ? 'text-red-400' : 'text-green-400'}`}
                                    >
                                        {item.visible ? t('hide', { defaultValue: 'Hide' }) : t('show', { defaultValue: 'Show' })}
                                    </button>

                                    {item.id === 'stat-cards' && (
                                        <select
                                            value={item.color || 'indigo'}
                                            onChange={(e) => updateColor(item.id, e.target.value)}
                                            className="bg-gray-800 text-white border-none text-[8px] rounded h-5 py-0 px-1 focus:ring-0 focus:outline-none cursor-pointer"
                                        >
                                            <option value="indigo">Indigo</option>
                                            <option value="emerald">Emerald</option>
                                            <option value="amber">Amber</option>
                                            <option value="rose">Rose</option>
                                        </select>
                                    )}

                                    <input
                                        type="text"
                                        value={i18n.language.startsWith('en') ? item.title_en : item.title_is}
                                        onChange={(e) => updateTitle(item.id, e.target.value)}
                                        className="bg-gray-800 text-white border-none text-[8px] rounded h-5 w-24 px-1 focus:ring-0 focus:outline-none font-bold"
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
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => !isClocking && setIsClockOutModalOpen(false)}
                            className="h-10 px-4 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
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
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:-translate-y-1">
            <div className={`p-3 rounded-xl w-fit mb-4 ${colors[color] || colors.indigo}`}>
                {React.cloneElement(icon, { className: "h-6 w-6" })}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                {value}<span className="text-sm ml-1 text-gray-400 uppercase">{unit}</span>
            </p>
        </div>
    );
}

function SuggestionsFeedbackCard({ title }) {
    const { t } = useTranslation();
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
            toast.success(t('toast_feedback_submitted', { defaultValue: 'Takk fyrir ábendinguna! Thanks for your feedback!' }));
            setContent('');
        } catch (err) {
            console.error("Failed to submit feedback:", err);
            toast.error(err.response?.data?.detail || 'Failed to submit feedback.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col justify-between min-h-[280px]">
            <div>
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4">
                    {title}
                </h3>
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div>
                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category / Flokkur</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl focus:outline-none"
                        >
                            <option value="Improvement">Improvement / Ábending</option>
                            <option value="Bug">Bug Report / Villa</option>
                            <option value="Feature Request">Feature Request / Nýr eiginleiki</option>
                            <option value="Other">Other / Annað</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Your suggestion / Þín tillaga</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="How can we make RafApp better? Hvernig getum við bætt appið?"
                            rows={3}
                            required
                            className="w-full p-3 rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending...' : 'Send Suggestion / Senda ábendingu'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default HomePage;