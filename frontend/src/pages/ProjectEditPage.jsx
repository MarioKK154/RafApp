import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { isPast, isToday, parseISO } from 'date-fns';

// COMPONENTS
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import ProjectBoQ from '../components/ProjectBoQ';
import ProjectInventory from '../components/ProjectInventory';
import ProjectOffers from '../components/ProjectOffers';
import ProjectLiveClockIns from '../components/ProjectLiveClockIns';
import ProjectTasks from '../components/ProjectTasks';
import LoadingSpinner from '../components/LoadingSpinner';

// UTILS
import { toast } from 'react-toastify';
import { 
    BriefcaseIcon, 
    MapPinIcon, 
    BanknotesIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    HashtagIcon,
    ShieldCheckIcon,
    CheckBadgeIcon,
    UserIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch { return ''; }
};

function ProjectEditPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '', description: '', address: '', status: 'Planning',
        start_date: '', end_date: '', project_manager_id: '', budget: '',
    });

    const [initialProjectData, setInitialProjectData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectManagers, setProjectManagers] = useState([]);
    const [error, setError] = useState('');

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;
    const isPM = currentUser?.role === 'project manager' || isSuperuser;
    const canEditParameters = isAdmin || isPM; 
    const canSeeFinancials = isAdmin || isPM;

    const sanitizePayload = (data) => ({
        ...data,
        project_manager_id: data.project_manager_id ? parseInt(data.project_manager_id) : null,
        budget: data.budget ? parseFloat(data.budget) : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
    });

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && projectId) {
            setIsLoadingData(true);
            try {
                const [projectRes, usersRes] = await Promise.all([
                    axiosInstance.get(`/projects/${projectId}`),
                    axiosInstance.get('/users/', { params: { limit: 1000 } })
                ]);

                const project = projectRes.data;
                setInitialProjectData(project);
                setFormData({
                    name: project.name ?? '',
                    description: project.description ?? '',
                    address: project.address ?? '',
                    status: project.status ?? 'Planning',
                    start_date: formatDateForInput(project.start_date),
                    end_date: formatDateForInput(project.end_date),
                    project_manager_id: project.project_manager_id?.toString() ?? '',
                    budget: project.budget ?? '',
                });

                setProjectManagers(usersRes.data.filter(u => 
                    (u.role === 'project manager' || u.role === 'admin') &&
                    (isSuperuser || u.tenant_id === project.tenant_id)
                ));
            } catch (error) {
                console.error('Project fetch failed:', error);
                setError(t('sync_error'));
            } finally {
                setIsLoadingData(false);
            }
        }
    }, [projectId, isAuthenticated, authIsLoading, isSuperuser, t]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleUpdateDetails = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const cleanedPayload = sanitizePayload(formData);
            const res = await axiosInstance.put(`/projects/${projectId}`, cleanedPayload);
            toast.success(t('update_success'));
            setInitialProjectData(res.data);
        } catch (error) {
            console.error('Project update failed:', error);
            toast.error(t('update_failed'));
        } finally {
            setIsSaving(false);
        }
    };

    const updateProjectStatus = async (newStatus) => {
        setIsSaving(true);
        try {
            let res;
            if (newStatus === 'Completed') {
                res = await axiosInstance.post(`/projects/${projectId}/archive`);
            } else {
                res = await axiosInstance.put(`/projects/${projectId}`, sanitizePayload({ ...formData, status: newStatus }));
            }
            setInitialProjectData(res.data);
            setFormData(prev => ({ ...prev, status: res.data.status }));
            toast.success("Status Updated");
        } catch (error) {
            console.error('Status update failed:', error);
            toast.error('Status transition failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Synchronizing Project Node..." size="lg" />;

    const computeDisplayStatus = () => {
        if (!initialProjectData) return '';
        const rawStatus = initialProjectData.status || 'Planning';
        const startDate = initialProjectData.start_date ? parseISO(initialProjectData.start_date) : null;
        const isStarted = startDate && (isPast(startDate) || isToday(startDate));

        if (['Planning', 'Active'].includes(rawStatus)) {
            return isStarted ? 'Active' : 'Planning';
        }
        return rawStatus;
    };

    const displayStatus = computeDisplayStatus();

    const headerStatusClasses =
        displayStatus === 'Completed'
            ? 'bg-green-50 text-green-700'
            : displayStatus === 'Active'
                ? 'bg-emerald-50 text-emerald-600'
                : displayStatus === 'Commissioned'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-orange-50 text-orange-700';

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-xl">
                    {error}
                </div>
            )}
            <header className="mb-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link to="/projects" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-4 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> {t('back_to_registry')}
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl">
                            <BriefcaseIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">
                                    {initialProjectData?.name}
                                </h1>
                                <span
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${headerStatusClasses}`}
                                >
                                    {displayStatus}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <HashtagIcon className="h-4 w-4 text-indigo-500" />
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black tracking-widest text-sm">
                                    NODE: {initialProjectData?.project_number || initialProjectData?.id}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const response = await axiosInstance.get(`/projects/${projectId}/status-report.pdf`, {
                                        responseType: 'blob',
                                    });
                                    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `project-${projectId}-status.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    window.URL.revokeObjectURL(url);
                                } catch (err) {
                                    console.error('Project status export failed:', err);
                                    toast.error(t('export_failed_project', { defaultValue: 'Failed to export project status.' }));
                                }
                            }}
                            className="h-10 px-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
                        >
                            <DocumentTextIcon className="h-4 w-4" /> {t('export_pdf')}
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
                <div className="lg:col-span-8">
                    {/* Main Config Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/20">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Configuration Parameters</h2>
                        </div>
                        
                        <form onSubmit={handleUpdateDetails} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Deployment Title</label>
                                    <input type="text" name="name" disabled={!canEditParameters} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="modern-input h-14 font-black" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Site Address</label>
                                    <input type="text" name="address" disabled={!canEditParameters} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Start date</label>
                                    <input type="date" name="start_date" disabled={!isAdmin} value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">End date</label>
                                    <input type="date" name="end_date" disabled={!isAdmin} value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Assigned PM</label>
                                    <select name="project_manager_id" value={formData.project_manager_id} onChange={(e) => setFormData({...formData, project_manager_id: e.target.value})} disabled={!isAdmin} className="modern-input h-14">
                                        <option value="">Unassigned</option>
                                        {projectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.full_name}</option>)}
                                    </select>
                                </div>
                                {canSeeFinancials && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Budget (ISK)</label>
                                        <input type="number" name="budget" disabled={!isAdmin} value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="modern-input h-14 font-black text-emerald-600" />
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex gap-3">
                                    {formData.status === 'Active' && (
                                        <button type="button" onClick={() => updateProjectStatus('Commissioned')} className="h-12 px-6 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-100 transition flex items-center gap-2">
                                            <CheckBadgeIcon className="h-5 w-5" /> Mark Commissioned
                                        </button>
                                    )}
                                    {formData.status === 'Commissioned' && isAdmin && (
                                        <button type="button" onClick={() => updateProjectStatus('Completed')} className="h-12 px-6 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-100">
                                            <ShieldCheckIcon className="h-5 w-5" /> Finalize Archive
                                        </button>
                                    )}
                                </div>
                                <button type="submit" disabled={isSaving} className="h-14 px-10 bg-gray-900 text-white font-black text-[10px] uppercase rounded-2xl flex items-center gap-3">
                                    {isSaving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
                                    Sync Registry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <ProjectLiveClockIns projectId={projectId} />
                </div>
            </div>

            {/* INTEGRATED MODULES - section background containers */}
            <div className="space-y-16">
                <div id="tasks-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectTasks projectId={projectId} />
                </div>

                <div id="boq-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectBoQ projectId={projectId} />
                </div>

                <div id="inventory-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectInventory projectId={projectId} />
                </div>

                <div id="drawings-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectDrawings projectId={projectId} />
                </div>

                <div id="offers-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectOffers projectId={projectId} />
                </div>

                <div id="personnel-section" className="pb-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectMembers projectId={projectId} />
                </div>
            </div>
        </div>
    );
}

export default ProjectEditPage;