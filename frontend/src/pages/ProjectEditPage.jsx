import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings';
import ProjectMembers from '../components/ProjectMembers';
import ProjectBoQ from '../components/ProjectBoQ';
import ProjectInventory from '../components/ProjectInventory';
import ProjectOffers from '../components/ProjectOffers';
import ProjectLiveClockIns from '../components/ProjectLiveClockIns';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BriefcaseIcon, 
    MapPinIcon, 
    CalendarDaysIcon, 
    BanknotesIcon,
    ChevronLeftIcon,
    CheckCircleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

/**
 * Standardizes backend ISO dates for HTML5 date inputs (YYYY-MM-DD)
 */
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

function ProjectEditPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Form State
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

    // Component State
    const [initialProjectData, setInitialProjectData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectManagers, setProjectManagers] = useState([]);
    const [error, setError] = useState('');

    // Permissions: Superadmin has global root access
    const isSuperuser = currentUser?.is_superuser;
    const canManageProject = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && projectId) {
            setIsLoadingData(true);
            setError('');
            try {
                // Concurrent fetch: Project Details + Global Staff List
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

                /**
                 * Filter Project Managers:
                 * 1. Must have the PM role.
                 * 2. Must belong to the project's tenant OR current user is Superadmin.
                 */
                const eligiblePms = usersRes.data.filter(u => 
                    (u.role === 'project manager' || u.role === 'admin') &&
                    (isSuperuser || u.tenant_id === project.tenant_id)
                );
                setProjectManagers(eligiblePms);

            } catch (err) {
                const msg = err.response?.status === 404 ? 'Project not found.' : 'Failed to synchronize with server.';
                setError(msg);
                toast.error(msg);
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [projectId, isAuthenticated, authIsLoading, navigate, isSuperuser]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        if (!canManageProject) return;

        setIsSaving(true);
        const payload = {
            ...formData,
            description: formData.description || null,
            address: formData.address || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            project_manager_id: formData.project_manager_id ? parseInt(formData.project_manager_id, 10) : null,
            budget: formData.budget ? parseFloat(formData.budget) : null,
        };

        try {
            const response = await axiosInstance.put(`/projects/${projectId}`, payload);
            toast.success(`Project updated: ${response.data.name}`);
            setInitialProjectData(response.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Update failed.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Accessing site data..." />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <InformationCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{error}</h2>
                <Link to="/projects" className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg">
                    Return to Registry
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Breadcrumb & Title */}
            <div className="mb-8">
                <Link to="/projects" className="flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition mb-2">
                    <ChevronLeftIcon className="h-4 w-4 mr-1" /> Back to Projects
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <BriefcaseIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                                {initialProjectData?.name}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    initialProjectData?.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {initialProjectData?.status}
                                </span>
                                {isSuperuser && (
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        Tenant ID: {initialProjectData?.tenant_id}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Main Form (Left) */}
                <div className="lg:col-span-8 space-y-8">
                    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">General Information</h2>
                        </div>
                        <form onSubmit={handleUpdateDetails} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Project Title</label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Address / Site Location</label>
                                    <div className="relative">
                                        <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Assigned Manager</label>
                                    <select name="project_manager_id" value={formData.project_manager_id} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
                                        <option value="">Unassigned</option>
                                        {projectManagers.map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.full_name || pm.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Budget (ISK)</label>
                                    <div className="relative">
                                        <BanknotesIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <input type="number" name="budget" value={formData.budget} onChange={handleChange} className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Start Date</label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Est. Completion</label>
                                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button type="submit" disabled={isSaving || !canManageProject} className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50">
                                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                                    {isSaving ? 'Syncing...' : 'Update Project'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                {/* Sidebar (Right) */}
                <div className="lg:col-span-4">
                    <ProjectLiveClockIns projectId={projectId} />
                </div>
            </div>

            {/* Sub-Modules (Full Width Tabs/Sections) */}
            <div className="mt-12 space-y-16">
                <section>
                    <ProjectOffers projectId={projectId} />
                </section>
                
                <section>
                    <ProjectInventory projectId={projectId} />
                </section>

                <section>
                    <ProjectBoQ projectId={projectId} />
                </section>

                <section>
                    <ProjectDrawings projectId={projectId} />
                </section>

                <section>
                    <ProjectMembers projectId={projectId} />
                </section>
            </div>
        </div>
    );
}

export default ProjectEditPage;