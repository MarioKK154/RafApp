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
import PageHeader from '../components/PageHeader';

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
                    axiosInstance.get('/users/', { params: { limit: 1000 } }),
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
            <PageHeader
                icon={BriefcaseIcon}
                title={initialProjectData?.name || t('edit_project', { defaultValue: 'Edit Project Node' })}
                subtitle={`NODE: ${initialProjectData?.project_number || initialProjectData?.id || 'N/A'}`}
                stats={[
                    { label: displayStatus, dotColor: 'bg-green-400 animate-pulse' },
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/projects"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                        >
                            <ChevronLeftIcon className="h-4 w-4" /> {t('back_to_registry', { defaultValue: 'Back' })}
                        </Link>
                        <Link
                            to={`/projects/${projectId}/risk-assessment`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                        >
                            <ShieldCheckIcon className="h-4 w-4" /> {t('risk_assessment')}
                        </Link>
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                        >
                            <DocumentTextIcon className="h-4 w-4" /> {t('export_pdf', { defaultValue: 'Export PDF' })}
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
                <div className="lg:col-span-8">
                    {/* Main Config Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/20">
                            <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('configuration_parameters')}</h2>
                        </div>
                        
                        <form onSubmit={handleUpdateDetails} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('deployment_title')}</label>
                                    <input type="text" name="name" disabled={!canEditParameters} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="modern-input h-14 font-black" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('site_address')}</label>
                                    <input type="text" name="address" disabled={!canEditParameters} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('start_date')}</label>
                                    <input type="date" name="start_date" disabled={!isAdmin} value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('end_date')}</label>
                                    <input type="date" name="end_date" disabled={!isAdmin} value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('assigned_pm')}</label>
                                    <select name="project_manager_id" value={formData.project_manager_id} onChange={(e) => setFormData({...formData, project_manager_id: e.target.value})} disabled={!isAdmin} className="modern-input h-14">
                                        <option value="">{t('unassigned')}</option>
                                        {projectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.full_name}</option>)}
                                    </select>
                                </div>
                                {canSeeFinancials && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">{t('budget_isk')}</label>
                                        <input type="number" name="budget" disabled={!isAdmin} value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="modern-input h-14 font-black text-emerald-600" />
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex gap-3">
                                    {formData.status === 'Active' && (
                                        <button type="button" onClick={() => updateProjectStatus('Commissioned')} className="h-12 px-6 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-100 transition flex items-center gap-2">
                                            <CheckBadgeIcon className="h-5 w-5" /> {t('mark_commissioned')} </button>
                                    )}
                                    {formData.status === 'Commissioned' && isAdmin && (
                                        <button type="button" onClick={() => updateProjectStatus('Completed')} className="h-12 px-6 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-100">
                                            <ShieldCheckIcon className="h-5 w-5" /> {t('finalize_archive')} </button>
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
                    <ProjectTasks projectId={projectId} canCreateTask={canEditParameters} />
                </div>

                {(isAdmin || isPM) && (
                    <div id="boq-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <ProjectBoQ projectId={projectId} />
                    </div>
                )}

                <div id="inventory-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectInventory projectId={projectId} />
                </div>

                <div id="drawings-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectDrawings projectId={projectId} />
                </div>

                {(isAdmin || isPM) && (
                    <div id="offers-section" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <ProjectOffers projectId={projectId} />
                    </div>
                )}

                <div id="personnel-section" className="pb-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <ProjectMembers projectId={projectId} />
                </div>
            </div>
        </div>
    );
}

export default ProjectEditPage;