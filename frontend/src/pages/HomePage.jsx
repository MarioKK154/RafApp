import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ClipboardDocumentListIcon, 
    WrenchScrewdriverIcon, 
    KeyIcon, 
    BriefcaseIcon, 
    ClockIcon,
    ArrowRightOnRectangleIcon, // CORRECTED: From Square to Rectangle
    ArrowLeftOnRectangleIcon,  // CORRECTED: From Square to Rectangle
    UserCircleIcon,
    MapPinIcon,
    SparklesIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function HomePage() {
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [isClockedIn, setIsClockedIn] = useState(false);
    const [currentLog, setCurrentLog] = useState(null);
    const [selectedClockInProjectId, setSelectedClockInProjectId] = useState('');
    const [projectsForClockIn, setProjectsForClockIn] = useState([]);

    const isSuperuser = user?.is_superuser;
    const isManagerOrAdmin = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated) {
            setIsLoading(true);
            setError('');
            try {
                const [dashboardRes, statusRes, projectsRes] = await Promise.all([
                    axiosInstance.get('/dashboard/'),
                    axiosInstance.get('/timelogs/status'),
                    axiosInstance.get('/projects/', { params: { limit: 500 } })
                ]);

                setDashboardData(dashboardRes.data);
                setIsClockedIn(statusRes.data.is_clocked_in);
                setCurrentLog(statusRes.data.current_log);
                
                // Show projects user is assigned to, or ALL projects if manager/superuser
                const projects = projectsRes.data.filter(p =>
                    isManagerOrAdmin || user.assigned_projects?.some(ap => ap.id === p.id)
                );
                setProjectsForClockIn(projects);

            } catch (err) {
                console.error("Dashboard sync error:", err);
                setError('Failed to synchronize dashboard telemetry.');
            } finally {
                setIsLoading(false);
            }
        }
    }, [authIsLoading, isAuthenticated, user, isManagerOrAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleClockIn = async () => {
        const payload = { project_id: selectedClockInProjectId ? parseInt(selectedClockInProjectId, 10) : null };
        try {
            const response = await axiosInstance.post('/timelogs/clock-in', payload);
            setIsClockedIn(true);
            setCurrentLog(response.data);
            toast.success('Shift started. Work hard!');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Clock-in failed.');
        }
    };

    const handleClockOut = async () => {
        try {
            await axiosInstance.post('/timelogs/clock-out');
            setIsClockedIn(false);
            setCurrentLog(null);
            setSelectedClockInProjectId('');
            toast.success('Shift ended. Time logged.');
            fetchData();
        } catch (err) {
            toast.error('Clock-out failed.');
        }
    };

    if (authIsLoading || isLoading) return <LoadingSpinner text="Synchronizing operational hub..." size="lg" />;
    if (!isAuthenticated) return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Authentication Required</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Greeting Header */}
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <SparklesIcon className="h-5 w-5 text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Live Workspace</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none">
                        Góðan daginn, {user.full_name?.split(' ')[0] || 'User'}
                    </h1>
                </div>
                {isSuperuser && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl shadow-sm">
                        <ShieldCheckIcon className="h-5 w-5 text-orange-600" />
                        <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">Global Admin Mode</span>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Actions & Logistics (4 cols) */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Time Clock Card */}
                    <section className={`p-8 rounded-[2rem] shadow-xl transition-all border-2 ${
                        isClockedIn 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-200 dark:shadow-none' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                    }`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-xl ${isClockedIn ? 'bg-indigo-500' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                <ClockIcon className={`h-6 w-6 ${isClockedIn ? 'text-white' : 'text-indigo-600'}`} />
                            </div>
                            <h2 className={`text-xl font-black uppercase tracking-tight ${isClockedIn ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Shift Entry</h2>
                        </div>

                        {isClockedIn && currentLog ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Active Session Since</p>
                                    <p className="text-3xl font-black">{new Date(currentLog.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    {currentLog.project && (
                                        <div className="flex items-center gap-2 mt-2 text-indigo-100">
                                            <MapPinIcon className="h-4 w-4" />
                                            <span className="text-sm font-bold uppercase tracking-tight">{currentLog.project.name}</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleClockOut} className="w-full flex items-center justify-center gap-2 h-14 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition transform active:scale-95 shadow-lg">
                                    <ArrowRightOnRectangleIcon className="h-5 w-5" /> End Shift
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Project Association</label>
                                    <select 
                                        value={selectedClockInProjectId} 
                                        onChange={e => setSelectedClockInProjectId(e.target.value)} 
                                        className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 font-bold text-sm outline-none"
                                    >
                                        <option value="">-- General Labor --</option>
                                        {projectsForClockIn.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                    </select>
                                </div>
                                <button onClick={handleClockIn} className="w-full flex items-center justify-center gap-2 h-14 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition transform active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">
                                    <ArrowLeftOnRectangleIcon className="h-5 w-5" /> Start Shift
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Equipment Status Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Assigned Assets</h2>
                        {dashboardData?.my_checked_out_car || (dashboardData?.my_checked_out_tools && dashboardData.my_checked_out_tools.length > 0) ? (
                            <div className="space-y-4">
                                {dashboardData.my_checked_out_car && (
                                    <Link to={`/cars/${dashboardData.my_checked_out_car.id}`} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl group hover:bg-indigo-50 transition">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><KeyIcon className="h-5 w-5 text-indigo-500" /></div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">{dashboardData.my_checked_out_car.make} {dashboardData.my_checked_out_car.model}</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{dashboardData.my_checked_out_car.license_plate}</p>
                                        </div>
                                    </Link>
                                )}
                                {dashboardData.my_checked_out_tools?.map(tool => (
                                    <Link key={tool.id} to={`/tools/${tool.id}`} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl group hover:bg-indigo-50 transition">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-xl shadow-sm"><WrenchScrewdriverIcon className="h-5 w-5 text-indigo-500" /></div>
                                        <p className="text-xs font-black text-gray-900 dark:text-white truncate">{tool.name}</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <WrenchScrewdriverIcon className="h-10 w-10 text-gray-100 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-xs font-bold text-gray-400 uppercase italic">No items checked out</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Workflow (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Open Tasks Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Workload</h2>
                            </div>
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                                {dashboardData?.my_open_tasks?.length || 0} Tasks
                            </span>
                        </div>
                        <div className="p-2">
                            {dashboardData?.my_open_tasks?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {dashboardData.my_open_tasks.map(task => (
                                        <Link key={task.id} to={`/tasks/${task.id}`} className="p-6 rounded-[2rem] hover:bg-gray-50 dark:hover:bg-gray-750 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group">
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors truncate">{task.title}</h3>
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <span className="flex items-center gap-1.5"><BriefcaseIcon className="h-3 w-3" /> {projectsForClockIn.find(p => p.id === task.project_id)?.name || 'Internal'}</span>
                                                <span className={new Date(task.due_date) < new Date() ? 'text-red-500' : ''}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '--'}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <ClipboardDocumentListIcon className="h-12 w-12 text-gray-100 dark:text-gray-700 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase tracking-tighter italic">Queue is currently clear.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Managed Projects Section (Admin/PM Only) */}
                    {isManagerOrAdmin && (
                        <section className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <BriefcaseIcon className="h-6 w-6 text-indigo-400" />
                                    <h2 className="text-xl font-black uppercase tracking-tight">Active Oversight</h2>
                                </div>
                                <Link to="/projects" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition">View All Projects</Link>
                            </div>
                            
                            <div className="space-y-4">
                                {dashboardData?.managed_projects?.length > 0 ? (
                                    dashboardData.managed_projects.slice(0, 5).map(project => (
                                        <Link key={project.id} to={`/projects/edit/${project.id}`} className="flex items-center justify-between p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 transition border border-gray-700 group">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black truncate">{project.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{project.status}</p>
                                            </div>
                                            <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                GO
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs font-bold text-gray-500 uppercase italic text-center py-4">No managed projects in active state.</p>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HomePage;