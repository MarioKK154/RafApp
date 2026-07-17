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
    MagnifyingGlassIcon,
    QuestionMarkCircleIcon
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

    const getIcelandicDate = () => {
        const days = ['Sunnudagur', 'Mánudagur', 'Þriðjudagur', 'Miðvikudagur', 'Fimmtudagur', 'Föstudagur', 'Laugardagur'];
        const months = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
        const d = new Date();
        return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const renderBlockContent = (item) => {
        const title = i18n.language.startsWith('en') ? item.title_en : item.title_is;
        
        switch (item.id) {
            case 'stat-cards':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Card 1: Revenue Today */}
                        <div className="bg-elevated p-6 rounded-[1.5rem] border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] group hover:border-indigo-500/50 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velta í dag / Revenue today</p>
                                    <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white mt-2">1.248.900 kr.</h3>
                                <p className="text-[9px] font-bold text-green-400 mt-1">↑ 18% frá í gær</p>
                            </div>
                            {/* Glowing blue sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-80">
                                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0 35 Q 25 15, 50 25 T 100 10 L 100 40 L 0 40 Z" fill="url(#blue-grad)" />
                                    <path d="M 0 35 Q 25 15, 50 25 T 100 10" fill="none" stroke="#3b82f6" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 2: Active Projects */}
                        <div className="bg-elevated p-6 rounded-[1.5rem] border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] group hover:border-green-500/50 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Virk verkefni / Active Projects</p>
                                    <span className="p-1.5 rounded-lg bg-green-500/10 text-green-400">
                                        <BriefcaseIcon className="h-4 w-4" />
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white mt-2">{stats?.active_projects || 32}</h3>
                                <p className="text-[9px] font-bold text-green-400 mt-1">↑ 7 frá síðustu viku</p>
                            </div>
                            {/* Glowing green sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-80">
                                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0 30 Q 30 10, 60 28 T 100 15 L 100 40 L 0 40 Z" fill="url(#green-grad)" />
                                    <path d="M 0 30 Q 30 10, 60 28 T 100 15" fill="none" stroke="#10b981" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 3: Offers In Progress */}
                        <div className="bg-elevated p-6 rounded-[1.5rem] border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] group hover:border-purple-500/50 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tilboð í vinnslu / Offers</p>
                                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                                        <ClipboardDocumentListIcon className="h-4 w-4" />
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white mt-2">{stats?.pending_tasks || 14}</h3>
                                <p className="text-[9px] font-bold text-green-400 mt-1">↑ 3 frá síðustu viku</p>
                            </div>
                            {/* Glowing purple sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-80">
                                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="purple-grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0 38 Q 20 20, 50 35 T 100 12 L 100 40 L 0 40 Z" fill="url(#purple-grad)" />
                                    <path d="M 0 38 Q 20 20, 50 35 T 100 12" fill="none" stroke="#8b5cf6" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 4: Unpaid Invoices */}
                        <div className="bg-elevated p-6 rounded-[1.5rem] border border-border/40 shadow-sm relative overflow-hidden flex flex-col justify-between h-[150px] group hover:border-orange-500/50 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ógreiddir reikningar / Unpaid</p>
                                    <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white mt-2">2.850.000 kr.</h3>
                                <p className="text-[9px] font-bold text-orange-400 mt-1">↓ 6% frá síðustu viku</p>
                            </div>
                            {/* Glowing orange sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-80">
                                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="orange-grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 0 25 Q 40 45, 70 20 T 100 35 L 100 40 L 0 40 Z" fill="url(#orange-grad)" />
                                    <path d="M 0 25 Q 40 45, 70 20 T 100 35" fill="none" stroke="#f97316" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>
                    </div>
                );
                
            case 'action-center':
                return (user?.role === 'admin' || user?.role === 'project manager' || user?.is_superuser) ? (
                    <div className="mb-8 bg-elevated rounded-2xl border border-border/40 shadow-sm p-6">
                        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">
                            {title}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Pending Leaves Card */}
                            <Link 
                                to="/accounting"
                                className="group bg-orange-950/10 p-5 rounded-2xl border border-orange-900/20 hover:border-orange-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                                        {t('pending_leaves', { defaultValue: 'Pending Leave Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-orange-400 leading-none mt-1">
                                        {stats?.pending_leaves || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-[#121824] rounded-xl text-orange-400 shadow-sm border border-border/45">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Pending Material Requests Card */}
                            <Link 
                                to="/shopping-list"
                                className="group bg-indigo-950/10 p-5 rounded-2xl border border-indigo-900/20 hover:border-indigo-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                        {t('pending_material_requests', { defaultValue: 'Material Requests' })}
                                    </h3>
                                    <p className="text-2xl font-black text-indigo-400 leading-none mt-1">
                                        {stats?.pending_material_requests || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-[#121824] rounded-xl text-indigo-400 shadow-sm border border-border/45">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>

                            {/* Damaged Tools Card */}
                            <Link 
                                to="/tools"
                                className="group bg-red-950/10 p-5 rounded-2xl border border-red-900/20 hover:border-red-500/50 transition-all flex items-center justify-between"
                            >
                                <div>
                                    <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                                        {t('damaged_tools_label', { defaultValue: 'Tools In Repair' })}
                                    </h3>
                                    <p className="text-2xl font-black text-red-400 leading-none mt-1">
                                        {stats?.damaged_tools || 0}
                                    </p>
                                </div>
                                <span className="p-2 bg-[#121824] rounded-xl text-red-400 shadow-sm border border-border/45">
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        </div>
                    </div>
                ) : null;
                
            case 'projects-list':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Middle Row Col 1: Projects Donut Overview */}
                        <div className="bg-elevated rounded-[1.5rem] border border-border/40 shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Verkefni – yfirlit</h3>
                                <div className="flex items-center justify-between gap-4">
                                    {/* Donut chart SVG */}
                                    <div className="relative h-32 w-32 shrink-0">
                                        <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                            {/* Background Circle */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1f2937" strokeWidth="3" />
                                            {/* Item 1: In progress (50%) */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="50 50" strokeDashoffset="100" />
                                            {/* Item 2: Planning (20%) */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="50" />
                                            {/* Item 3: Awaiting Info (15%) */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="30" />
                                            {/* Item 4: Completed (15%) */}
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6b7280" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="15" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-lg font-black text-white leading-none">32</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Samtals</span>
                                        </div>
                                    </div>

                                    {/* Legend list */}
                                    <div className="space-y-2 text-[10px] text-slate-400 w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block"></span>
                                                Í vinnsla
                                            </span>
                                            <span className="font-bold text-white">16</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                                Áætlanagerð
                                            </span>
                                            <span className="font-bold text-white">6</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span>
                                                Beðið eftir
                                            </span>
                                            <span className="font-bold text-white">5</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-gray-500 inline-block"></span>
                                                Lokið
                                            </span>
                                            <span className="font-bold text-white">5</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Link to="/projects" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline mt-4 inline-block">Sjá öll verkefni →</Link>
                        </div>

                        {/* Middle Row Col 2: Revenue Bar Chart */}
                        <div className="bg-elevated rounded-[1.5rem] border border-border/40 shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Velta (síðustu 6 mánuðir)</h3>
                                <div className="flex items-end justify-between h-32 pt-4 px-2">
                                    {[
                                        { label: 'Des', h: '40%' },
                                        { label: 'Jan', h: '50%' },
                                        { label: 'Feb', h: '60%' },
                                        { label: 'Mar', h: '58%' },
                                        { label: 'Apr', h: '70%' },
                                        { label: 'Maí', h: '85%' },
                                    ].map((bar, i) => (
                                        <div key={i} className="flex flex-col items-center gap-2 w-1/6">
                                            <div className="w-4 bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-all duration-300" style={{ height: bar.h }}></div>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{bar.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mt-4 text-center">Velta (kr.)</span>
                        </div>

                        {/* Middle Row Col 3: Next Projects */}
                        <div className="bg-elevated rounded-[1.5rem] border border-border/40 shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
                            <div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Næstu verkefni</h3>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Laugavegur 95, Reykjavik', desc: 'Íbúðaverkefni', date: '16. maí', status: 'Í vinnslu', color: 'blue' },
                                        { name: 'Hafnarstræti 15, Akureyri', desc: 'Atvinnuhúsnæði', date: '19. maí', status: 'Áætlanagerð', color: 'green' },
                                        { name: 'Þingholtsstræti 21, Reykjavik', desc: 'Endurnýjun raflagna', date: '21. maí', status: 'Beðið', color: 'orange' },
                                        { name: 'Sundlaug Vestmannaeyja', desc: 'Viðhald og uppfærslur', date: '23. maí', status: 'Í vinnslu', color: 'blue' },
                                    ].map((proj, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/40 border border-border/10 hover:border-border/30 transition">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-white truncate leading-tight">{proj.name}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{proj.desc}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[8px] font-bold text-slate-400">{proj.date}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    proj.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                                                    proj.color === 'green' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                                                }`}>
                                                    {proj.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Link to="/projects" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline mt-4 inline-block">Sjá öll verkefni →</Link>
                        </div>
                    </div>
                );
                
            case 'calendar':
                return (
                    <div className="bg-elevated rounded-[1.5rem] p-6 shadow-sm border border-border/40 h-full flex flex-col justify-between min-h-[300px]">
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Tímaskráning – í dag</h3>
                            <div className="flex items-center justify-between gap-4">
                                {/* Circular progress bar */}
                                <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                                    <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1f2937" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="71 29" strokeDashoffset="100" />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-md font-black text-white leading-none">28,5</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">klst.</span>
                                    </div>
                                </div>

                                {/* Details side */}
                                <div className="space-y-3 text-[10px] text-slate-400 w-full">
                                    <div className="flex justify-between">
                                        <span>Skráð í dag:</span>
                                        <span className="font-bold text-white">28,5 klst.</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Áætlað:</span>
                                        <span className="font-bold text-white">40 klst.</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border/30 pt-1.5">
                                        <span>Nýting:</span>
                                        <span className="font-black text-green-400 text-xs">71%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Link to="/timelogs" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline mt-6 inline-block">Sjá tímaskráningu →</Link>
                    </div>
                );
                
            case 'alerts':
                return (
                    <div className="bg-elevated rounded-[1.5rem] border border-border/40 shadow-sm overflow-hidden h-full flex flex-col justify-between min-h-[300px] p-6">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Nýlegar tilkynningar</h3>
                                <Link to="/notifications" className="p-1.5 bg-[#121824] rounded-lg text-slate-400 hover:text-indigo-400 transition-colors border border-border/20">
                                    <BellIcon className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { text: 'Nýtt tilboð T-2025-45 var samþykkt. Laugavegur 95, Reykjavik', time: '9:15', color: 'bg-blue-500' },
                                    { text: 'Reikningur R-2025-108 er gjaldfallinn. Hafnarstræti 15, Akureyri', time: 'í gær', color: 'bg-orange-500' },
                                    { text: 'Birgðaviðvörun: Rafmagnsskapur 63A. Aðeins 2 stk. eftir á lager', time: 'í gær', color: 'bg-purple-500' },
                                ].map((note, i) => (
                                    <div key={i} className="flex items-start justify-between gap-3 text-[10px]">
                                        <div className="flex items-start gap-2.5">
                                            <span className={`h-1.5 w-1.5 rounded-full mt-1 shrink-0 ${note.color}`}></span>
                                            <p className="text-slate-300 font-bold leading-normal">{note.text}</p>
                                        </div>
                                        <span className="text-[8px] font-bold text-slate-500 shrink-0 uppercase tracking-wider">{note.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Link to="/notifications" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:underline mt-6 inline-block">Sjá allar tilkynningar →</Link>
                    </div>
                );

            case 'suggestions-feedback':
                return (
                    <div className="bg-elevated rounded-[1.5rem] p-6 shadow-sm border border-border/40 h-full flex flex-col justify-between min-h-[300px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            {/* Left: Popular products */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Vinsælustu vörur</h3>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Rafmagnsskapur 63A', val: '18 stk.', w: 'w-full' },
                                        { name: 'Kapall FXP 3x2,5', val: '850 m', w: 'w-[80%]' },
                                        { name: 'Dósir IP20', val: '420 stk.', w: 'w-[60%]' },
                                        { name: 'LED Downlight 10W', val: '310 stk.', w: 'w-[45%]' },
                                        { name: 'C-lína sjálfvirkur 16A', val: '150 stk.', w: 'w-[20%]' },
                                    ].map((prod, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>{prod.name}</span>
                                                <span className="text-white">{prod.val}</span>
                                            </div>
                                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                <div className={`bg-indigo-500 h-full rounded-full ${prod.w}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Feedback form */}
                            <SuggestionsFeedbackCard title={title} />
                        </div>
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
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500 text-slate-100">
            {/* Header Area */}
            <header className="mb-8 relative z-50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border/20">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <SignalIcon className="h-3 w-3 text-green-500" />
                            <p className="text-[10px] font-black text-indigo-400 tracking-[0.3em] uppercase">
                                {t('system_status_online')}
                            </p>
                            {isManagement && (
                                <button 
                                    type="button"
                                    onClick={() => setEditMode(!editMode)}
                                    className="ml-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition transform active:scale-95"
                                >
                                    {editMode ? t('exit_edit_layout', { defaultValue: 'Exit Customize' }) : t('edit_layout', { defaultValue: 'Customize Dashboard' })}
                                </button>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight leading-none mt-1">
                            {getGreeting()}, {user?.full_name?.split(' ')[0] || t('user')} 👋
                        </h1>
                        <p className="text-xs text-slate-400 mt-1.5">Hér er yfirlit yfir rafverktakafyrirtækið þitt í dag.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* Search input */}
                        <div className="relative w-full sm:w-[220px]">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <MagnifyingGlassIcon className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Leita..."
                                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/30 bg-elevated text-white text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                            />
                        </div>

                        {/* Top-Right Widget Items */}
                        <div className="flex items-center gap-3">
                            <button className="h-11 w-11 flex items-center justify-center bg-elevated rounded-xl border border-border/30 text-slate-400 hover:text-white transition relative">
                                <BellIcon className="h-5 w-5" />
                                <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow">3</span>
                            </button>

                            <button className="h-11 w-11 flex items-center justify-center bg-elevated rounded-xl border border-border/30 text-slate-400 hover:text-white transition">
                                <QuestionMarkCircleIcon className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-2.5 pl-3 border-l border-border/30">
                                <img
                                    src={user?.profile_picture_path || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                                    alt="Avatar"
                                    className="h-10 w-10 rounded-full object-cover border border-border/40"
                                />
                                <div className="hidden sm:block text-left min-w-0">
                                    <p className="text-xs font-black text-white truncate leading-none">{user?.full_name || 'Jón Jónsson'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rafverktaki</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-header Date card area */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 gap-4">
                    <div>
                        {/* Clock-in actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {!activeClockIn ? (
                                <>
                                    <div className="relative min-w-[220px]">
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full h-11 px-4 bg-elevated text-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border/30 shadow-sm flex items-center justify-between cursor-pointer"
                                        >
                                            <span className="truncate">
                                                {selectedProjectId 
                                                    ? managedProjects.find(p => p.id === parseInt(selectedProjectId))?.name 
                                                    : t('select_project')}
                                            </span>
                                            <ChevronDownIcon className="h-4 w-4 ml-2 text-slate-400" />
                                        </button>

                                        {isDropdownOpen && (
                                            <div className="absolute left-0 mt-2 w-full max-h-60 bg-elevated rounded-xl border border-border/40 shadow-lg overflow-y-auto z-50 p-2 space-y-2">
                                                <input
                                                    type="text"
                                                    value={projectSearchQuery}
                                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                    placeholder={t('search_projects', { defaultValue: 'Search projects...' })}
                                                    className="w-full h-10 px-3 rounded-lg border border-border/30 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="divide-y divide-border/20">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProjectId('');
                                                            setIsDropdownOpen(false);
                                                            setProjectSearchQuery('');
                                                        }}
                                                        className="w-full text-left py-2.5 px-3 hover:bg-gray-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-md"
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
                                                                className="w-full text-left py-2.5 px-3 hover:bg-gray-850 text-white text-[10px] font-black uppercase tracking-widest rounded-md truncate"
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
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50 h-11"
                                    >
                                        <PlayIcon className="h-4 w-4 fill-current" />
                                        <span>{t('clock_in')}</span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-6 px-4 py-1.5 bg-red-950/15 border border-red-500/20 rounded-2xl h-11">
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                        <div>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block leading-none">Virk Vakt / Active</span>
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter truncate max-w-[150px] inline-block">{activeClockIn.project?.name || 'Vakt'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClockOut}
                                        disabled={isClocking}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition"
                                    >
                                        {t('clock_out')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date picker display box */}
                    <div className="bg-elevated border border-border/30 rounded-xl px-4 py-2.5 flex items-center gap-3 text-slate-200">
                        <CalendarIcon className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{getIcelandicDate()}</span>
                        <ChevronDownIcon className="h-3 w-3 text-slate-400" />
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
                    if (item.id === 'stat-cards' || item.id === 'action-center' || item.id === 'projects-list') {
                        spanClass = "lg:col-span-3";
                    }
                    
                    return (
                        <div 
                            key={item.id} 
                            className={`${spanClass} relative rounded-[1.5rem] transition-all duration-300 ${editMode ? 'border-2 border-dashed border-indigo-500/50 p-2 cursor-move bg-indigo-500/5' : ''} ${!item.visible ? 'opacity-40 bg-gray-900/30' : ''}`}
                            draggable={editMode}
                            onDragStart={() => onDragStart(index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            onDrop={() => onDrop(index)}
                        >
                            {/* Controls overlay when editMode is active */}
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
                        className="w-full rounded-xl border border-border/30 bg-gray-900 text-white px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        required
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => !isClocking && setIsClockOutModalOpen(false)}
                            className="h-10 px-4 rounded-xl border border-border/30 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-gray-850"
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
        <div className="h-full flex flex-col justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
                {title}
            </h3>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Category / Flokkur</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-gray-900 border border-border/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="Improvement">Improvement / Bæting</option>
                        <option value="Bug">Bug / Villa</option>
                        <option value="Question">Question / Spurning</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Message / Skilaboð</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={2}
                        className="w-full p-3 bg-gray-900 border border-border/20 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Hvernig getum við bætt RafApp?..."
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !content.trim()}
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                    {isSubmitting && <ArrowPathIcon className="h-4.5 w-4.5 animate-spin" />}
                    Senda ábendingu / Submit
                </button>
            </form>
        </div>
    );
}

export default HomePage;