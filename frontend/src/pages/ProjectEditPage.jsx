import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import ProjectBoQ from '../components/ProjectBoQ';
import ProjectInventory from '../components/ProjectInventory';
import ProjectOffers from '../components/ProjectOffers';
import ProjectLiveClockIns from '../components/ProjectLiveClockIns';
import ProjectTasks from '../components/ProjectTasks';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BriefcaseIcon, 
    MapPinIcon, 
    CalendarDaysIcon, 
    BanknotesIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    UserIcon,
    ArrowPathIcon,
    LockClosedIcon,
    EyeSlashIcon,
    ClipboardDocumentListIcon,
    ChevronRightIcon,
    HashtagIcon,
    ShieldCheckIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch (e) { return ''; }
};

function ProjectEditPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        status: 'Planning',
        start_date: '',
        end_date: '',
        project_manager_id: '',
        budget: '',
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

    /**
     * Protocol: Data Sanitization
     * Converts UI empty strings into Backend-friendly nulls to prevent 422 errors.
     */
    const sanitizePayload = (data) => {
        return {
            ...data,
            project_manager_id: data.project_manager_id ? parseInt(data.project_manager_id) : null,
            budget: data.budget ? parseFloat(data.budget) : null,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
        };
    };

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
            } catch (err) {
                setError(err.response?.status === 404 ? t('project_not_found') : t('sync_error'));
            } finally {
                setIsLoadingData(false);
            }
        }
    }, [projectId, isAuthenticated, authIsLoading, isSuperuser, t]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        if (!canEditParameters) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const cleanedPayload = sanitizePayload(formData);
            const res = await axiosInstance.put(`/projects/${projectId}`, cleanedPayload);
            toast.success(t('update_success'));
            setInitialProjectData(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail?.[0]?.msg || t('update_failed'));
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Roadmap #1 Logic: Commissioning Protocol
     * Correctly handles the transition to Commissioned (PUT) vs Archive (POST)
     */
    const updateProjectStatus = async (newStatus) => {
        setIsSaving(true);
        try {
            let res;
            if (newStatus === 'Completed') {
                // Administrative Archival Protocol (Step 2)
                res = await axiosInstance.post(`/projects/${projectId}/archive`);
                toast.success('Project officially archived in registry.');
            } else {
                // Operational Status Update (Step 1)
                const cleanedPayload = sanitizePayload({ ...formData, status: newStatus });
                res = await axiosInstance.put(`/projects/${projectId}`, cleanedPayload);
                toast.success(`Node Status Updated: ${newStatus}`);
            }
            setInitialProjectData(res.data);
            setFormData(prev => ({ ...prev, status: res.data.status }));
        } catch (err) {
            console.error("422 Debug:", err.response?.data?.detail);
            toast.error(err.response?.data?.detail || 'Status transition failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Synchronizing Project Node..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="mb-10">
                <Link to="/projects" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-4 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> Back to Project Registry
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none">
                            <BriefcaseIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
                                    {initialProjectData?.name}
                                </h1>
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                    initialProjectData?.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                    {initialProjectData?.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <HashtagIcon className="h-4 w-4 text-indigo-500" />
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black tracking-widest text-sm uppercase">
                                    NODE: {initialProjectData?.project_number || initialProjectData?.id}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-3">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Configuration Parameters</h2>
                            </div>
                        </div>
                        
                        <form onSubmit={handleUpdateDetails} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deployment Title</label>
                                    <input type="text" name="name" disabled={!canEditParameters} value={formData.name} onChange={handleChange} className="modern-input h-14 font-black" />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operational Site Address</label>
                                    <div className="relative">
                                        <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input type="text" name="address" disabled={!canEditParameters} value={formData.address} onChange={handleChange} className="modern-input pl-12 h-14" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned PM</label>
                                    <select name="project_manager_id" value={formData.project_manager_id} onChange={handleChange} disabled={!isAdmin} className="modern-input h-14">
                                        <option value="">{t('unassigned')}</option>
                                        {projectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.full_name}</option>)}
                                    </select>
                                </div>

                                {canSeeFinancials && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Projected Budget (ISK)</label>
                                        <div className="relative">
                                            <BanknotesIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                            <input type="number" name="budget" disabled={!isAdmin} value={formData.budget} onChange={handleChange} className="modern-input pl-12 h-14 font-black text-emerald-600" />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Init</label>
                                    <input type="date" name="start_date" disabled={!isAdmin} value={formData.start_date} onChange={handleChange} className="modern-input h-14" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Target</label>
                                    <input type="date" name="end_date" disabled={!isAdmin} value={formData.end_date} onChange={handleChange} className="modern-input h-14" />
                                </div>
                            </div>

                            <div className="pt-10 mt-10 border-t border-gray-50 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    {formData.status !== 'Commissioned' && formData.status !== 'Completed' && (
                                        <button 
                                            type="button"
                                            onClick={() => updateProjectStatus('Commissioned')}
                                            className="h-12 px-6 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition flex items-center gap-2"
                                        >
                                            <CheckBadgeIcon className="h-5 w-5" /> Mark as Commissioned
                                        </button>
                                    )}

                                    {formData.status === 'Commissioned' && isAdmin && (
                                        <button 
                                            type="button"
                                            onClick={() => updateProjectStatus('Completed')}
                                            className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition transform active:scale-95 flex items-center gap-2"
                                        >
                                            <ShieldCheckIcon className="h-5 w-5" /> Finalize & Archive
                                        </button>
                                    )}
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSaving} 
                                    className="w-full md:w-auto h-14 px-10 bg-gray-900 dark:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
                                    Synchronize Registry
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                <div className="lg:col-span-4">
                    <ProjectLiveClockIns projectId={projectId} />
                </div>
            </div>

            <div className="mt-16 space-y-12">
                <SubsystemSection title="Deployment Work Orders" icon={<ClipboardDocumentListIcon />} link={`/tasks?project_id=${projectId}`}>
                    <ProjectTasks projectId={projectId} />
                </SubsystemSection>
                <ProjectInventory projectId={projectId} />
                <ProjectDrawings projectId={projectId} />
                <section className="pb-20">
                    <ProjectMembers projectId={projectId} />
                </section>
            </div>
        </div>
    );
}

function SubsystemSection({ title, icon, link, children }) {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="flex items-center gap-3">
                        <div className="text-indigo-500 h-5 w-5">{icon}</div>
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">{title}</h2>
                    </div>
                    {link && (
                        <Link to={link} className="h-10 px-5 bg-white dark:bg-gray-700 text-gray-400 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-700 flex items-center gap-2 transition-all">
                            Expand Registry <ChevronRightIcon className="h-3 w-3 stroke-[3px]" />
                        </Link>
                    )}
                </div>
                <div className="p-2">{children}</div>
            </div>
        </section>
    );
}

export default ProjectEditPage;