import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
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
    SignalIcon,
    BellIcon 
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

    /**
     * MISSION CONTROL: Dashboard Data Synchronization
     * Logic implemented:
     * 1. Dynamic Status Promotion: Planning -> Active if start_date <= Today.
     * 2. Strict Task Counting: Filters out orphans and terminal states.
     */
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

            // Phase 1: Process Project Statuses based on Dates
            const processedProjects = rawProjects.map(proj => {
                const startDate = proj.start_date ? parseISO(proj.start_date) : null;
                const isStarted = startDate && (isPast(startDate) || isToday(startDate));
                
                let displayStatus = proj.status;
                // If saved as 'Planning' or 'Active', we promote/demote based on the timeline
                if (['Planning', 'Active'].includes(proj.status)) {
                    displayStatus = isStarted ? 'Active' : 'Planning';
                }
                return { ...proj, displayStatus };
            });

            // Phase 2: Filter Projects for Managed List (Exclude Finished/Archived)
            const activeOnly = processedProjects.filter(p => 
                !['Completed', 'Archived'].includes(p.status)
            );
            setManagedProjects(activeOnly);
            
            // Phase 3: Solve the "8 vs 1" Task Bug
            // We only count tasks that belong to our VISIBLE (Active/Planning) projects
            const activeProjectIds = activeOnly.map(p => p.id);
            const verifiedActiveTasks = rawTasks.filter(tk => 
                activeProjectIds.includes(tk.project_id) && 
                !['Done', 'Completed', 'Archived'].includes(tk.status)
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
        const isIcelandic = i18n.language === 'is';

        if (hour < 12) {
            return t('greeting_morning', {
                defaultValue: isIcelandic ? 'Góðan daginn' : 'Good morning',
            });
        }
        if (hour < 18) {
            return t('greeting_afternoon', {
                defaultValue: isIcelandic ? 'Góðan daginn' : 'Good afternoon',
            });
        }
        return t('greeting_evening', {
            defaultValue: isIcelandic ? 'Gott kvöld' : 'Good evening',
        });
    };

    const handleClockIn = async () => {
        if (!selectedProjectId) {
            toast.warning(
                t('select_project_first', {
                    defaultValue: 'Select a project to start.',
                })
            );
            return;
        }
        setIsClocking(true);
        try {
            const res = await axiosInstance.post('/timelogs/clock-in', { 
                project_id: parseInt(selectedProjectId) 
            });
            setActiveClockIn(res.data);
            toast.success(
                t('clock_in_success', {
                    defaultValue: 'Clock-in successful.',
                })
            );
            fetchDashboardData();
        } catch (err) {
            toast.error(
                err.response?.data?.detail ||
                    t('clock_in_failed', {
                        defaultValue: 'Clock-in failed.',
                    })
            );
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockOut = async () => {
        setIsClocking(true);
        try {
            await axiosInstance.post('/timelogs/clock-out');
            setActiveClockIn(null);
            toast.success(
                t('clock_out_success', {
                    defaultValue: 'Clock-out successful.',
                })
            );
            fetchDashboardData();
        } catch (err) {
            toast.error(
                t('clock_out_failed', {
                    defaultValue: 'Clock-out failed.',
                })
            );
        } finally {
            setIsClocking(false);
        }
    };

    if (isLoading)
        return (
            <LoadingSpinner
                text={t('syncing_dashboard', {
                    defaultValue: 'Synchronizing dashboard...',
                })}
            />
        );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <SignalIcon className="h-3 w-3 text-green-500" />
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">SYSTEM STATUS: ONLINE</p>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none italic">
                        {getGreeting()}, <span className="text-indigo-600 dark:text-indigo-400">{user?.full_name?.split(' ')[0] || "User"}</span>
                    </h1>
                </div>

                <div className="w-full md:w-auto">
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-gray-800 p-2.5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        {!activeClockIn ? (
                            <>
                                <select 
                                    value={selectedProjectId} 
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="h-12 px-4 border-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest min-w-[220px] focus:ring-0 cursor-pointer"
                                >
                                    <option value="">-- SELECT PROJECT --</option>
                                    {managedProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleClockIn} 
                                    disabled={isClocking || !selectedProjectId} 
                                    className="flex items-center gap-3 px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] transition transform active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100 dark:shadow-none"
                                >
                                    <PlayIcon className="h-4 w-4 fill-current" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Clock In</span>
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
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Session</p>
                                        <p className="text-xs font-black text-red-500 uppercase tracking-tighter italic">
                                            {activeClockIn.project?.name || 'Infrastrúktúr'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleClockOut} 
                                    disabled={isClocking} 
                                    className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase rounded-xl transition shadow-lg shadow-red-100 dark:shadow-none"
                                >
                                    Clock Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard title="Active Projects" value={stats?.active_projects || 0} icon={<BriefcaseIcon />} color="indigo" />
                <StatCard title="Pending Work" value={stats?.pending_tasks || 0} icon={<ClipboardDocumentListIcon />} color="emerald" />
                <StatCard title="Weekly Hours" value={stats?.weekly_hours || 0} icon={<ClockIcon />} color="amber" unit="h" />
                <StatCard title="Active Personnel" value={stats?.active_users || 0} icon={<UserGroupIcon />} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Managed Projects List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Managed Projects</h2>
                        <Link to="/projects" className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View Registry</Link>
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
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active deployments found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Schedule & Notifications */}
                <div className="space-y-10">
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-gray-800">
                        <div className="flex items-center gap-3 mb-8">
                            <CalendarIcon className="h-5 w-5 text-indigo-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Personnel Schedule</h3>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase italic tracking-widest leading-relaxed mb-8">
                            Registry synchronized.
                        </p>
                        <Link to="/calendar" className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition transform active:scale-95 shadow-lg shadow-indigo-900/20">
                            Open Calendar <ChevronRightIcon className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <header className="px-8 py-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Operational Alerts</h3>
                                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Live Feed</p>
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
                                    Registry clear.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, unit = "" }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:-translate-y-1">
            <div className={`p-3 rounded-xl w-fit mb-4 ${colors[color]}`}>
                {React.cloneElement(icon, { className: "h-6 w-6" })}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                {value}<span className="text-sm ml-1 text-gray-400 uppercase">{unit}</span>
            </p>
        </div>
    );
}

export default HomePage;