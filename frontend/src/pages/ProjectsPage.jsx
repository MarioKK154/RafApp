import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { isPast, isToday, parseISO } from 'date-fns';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    CalendarIcon,
    UserIcon,
    BriefcaseIcon, 
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    ArchiveBoxIcon,
    ClockIcon,
    ShieldCheckIcon,
    CubeIcon,
    SquaresPlusIcon
} from '@heroicons/react/24/outline';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

const ProjectsPage = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Registry States
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    /** * OPERATIONAL PROTOCOL: Default View is strictly 'Active'
     */
    const [statusFilter, setStatusFilter] = useState('Active'); 
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    const fetchProjects = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // We fetch the full list so our Date-Based Logic can re-classify 
            // 'Planning' projects into 'Active' in real-time.
            const response = await axiosInstance.get('/projects/', {
                params: {
                    limit: 1000,
                    search: debouncedSearchTerm || undefined
                }
            });
            setProjects(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            toast.error('Registry synchronization failed.');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchTerm, user]);

    useEffect(() => {
        if (!authLoading && user) fetchProjects();
    }, [fetchProjects, authLoading, user]);

    /**
     * Logic: Date-Driven Status Promotion & Hierarchical Grouping
     * Determines if a project is 'Planning' or 'Active' based on today's date.
     */
    const structuredProjects = useMemo(() => {
        const processed = projects.map(proj => {
            const startDate = proj.start_date ? parseISO(proj.start_date) : null;
            const isStarted = startDate && (isPast(startDate) || isToday(startDate));
            
            let displayStatus = proj.status;
            // Rule: Planning -> Active if date reached and not archived/commissioned
            if (['Planning', 'Active'].includes(proj.status)) {
                displayStatus = isStarted ? 'Active' : 'Planning';
            }
            return { ...proj, displayStatus };
        });

        // Apply Status Filter
        const filtered = statusFilter === 'All' 
            ? processed 
            : processed.filter(p => p.displayStatus === statusFilter);

        const mainNodes = filtered.filter(p => !p.parent_id);
        const childNodes = filtered.filter(p => p.parent_id);
        
        return mainNodes.map(parent => ({
            ...parent,
            children: childNodes.filter(child => child.parent_id === parent.id)
        }));
    }, [projects, statusFilter]);

    const handleArchive = async (projectId) => {
        try {
            await axiosInstance.post(`/projects/${projectId}/archive`);
            toast.success("Node Archived & Verified.");
            fetchProjects();
        } catch (err) {
            toast.error("Archival protocol denied.");
        }
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await axiosInstance.delete(`/projects/${projectToDelete.id}`);
            toast.success(`Node Purged.`);
            fetchProjects();
        } catch (err) {
            toast.error('Purge failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
        }
    };

    if (authLoading || (isLoading && projects.length === 0)) {
        return <LoadingSpinner text="Accessing Project Registry..." size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl">
                        <BriefcaseIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">Projects</h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2 italic">DEPLOYMENT MATRIX</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => navigate('/projects/new')}
                    className="h-14 px-8 bg-gray-900 dark:bg-indigo-600 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl transition transform active:scale-95 shadow-xl flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5 stroke-[3px]" /> Initialize Project
                </button>
            </header>

            {/* Tactical Filtering Console */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Query by Node ID, Title, or Site..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                    />
                </div>
                <div className="lg:col-span-3 relative">
                    <AdjustmentsHorizontalIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 pointer-events-none" />
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer"
                    >
                        <option value="Active">Active Operations</option>
                        <option value="Planning">Planning Phase</option>
                        <option value="Commissioned">Commissioned (Review)</option>
                        <option value="Completed">Archived / Verified</option>
                        <option value="All">Full Sector History</option>
                    </select>
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <ClockIcon className="h-4 w-4 text-indigo-500" /> 
                    <span className="text-gray-900 dark:text-gray-100">{structuredProjects.length} Nodes in View</span>
                </div>
            </div>

            {/* Tree Rendering */}
            <div className="space-y-8">
                {structuredProjects.length > 0 ? structuredProjects.map(parent => (
                    <div key={parent.id} className="space-y-3">
                        <ProjectCard project={parent} isAdmin={isAdmin} onArchive={handleArchive} onDelete={() => { setProjectToDelete(parent); setIsDeleteModalOpen(true); }} />
                        {parent.children.length > 0 && (
                            <div className="ml-6 lg:ml-12 space-y-3 border-l-2 border-dashed border-gray-100 dark:border-gray-700 pl-6 lg:pl-12 relative">
                                {parent.children.map(child => (
                                    <ProjectCard 
                                        key={child.id} 
                                        project={child} 
                                        isChild={true}
                                        isAdmin={isAdmin} 
                                        onArchive={handleArchive}
                                        onDelete={() => { setProjectToDelete(child); setIsDeleteModalOpen(true); }} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="text-center py-32 bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <ArchiveBoxIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Sector Empty</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3">Adjust filters or initialize a new node.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                title="Purge Protocol"
                message={`CRITICAL: Are you sure you want to permanently delete Node ${projectToDelete?.project_number || ''}?`}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                type="danger"
            />
        </div>
    );
};

function ProjectCard({ project, isChild = false, isAdmin, onArchive, onDelete }) {
    const isCommissioned = project.displayStatus === 'Commissioned';
    const isCompleted = project.displayStatus === 'Completed';

    return (
        <div className={`group bg-white dark:bg-gray-800 rounded-[2rem] border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
            isChild ? 'border-indigo-50 dark:border-indigo-900/20' : 'border-gray-100 dark:border-gray-700'
        }`}>
            <div className="p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                            isChild ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400' : 'bg-gray-50 dark:bg-gray-900 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                            {isChild ? <SquaresPlusIcon className="h-6 w-6" /> : <CubeIcon className="h-6 w-6" />}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h2 className={`${isChild ? 'text-lg' : 'text-2xl'} font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none`}>
                                    <Link to={`/projects/edit/${project.id}`} className="hover:text-indigo-600 transition-colors">
                                        {project?.name}
                                    </Link>
                                </h2>
                                <span className={`px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border ${
                                    project.displayStatus === 'Active' ? 'bg-green-50 text-green-600 border-green-100' :
                                    project.displayStatus === 'Completed' ? 'bg-gray-900 text-white' :
                                    project.displayStatus === 'Commissioned' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                    'bg-orange-50 text-orange-600 border-orange-100'
                                }`}>
                                    {project.displayStatus}
                                </span>
                            </div>
                            <p className="text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs tracking-widest uppercase">
                                ID: {project?.project_number || project?.id}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 ml-1">
                        <DetailRow icon={<MapPinIcon />} label="Deployment" value={project?.address} />
                        <DetailRow icon={<CalendarIcon />} label="System Init" value={project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'} />
                        <DetailRow icon={<UserIcon />} label="Lead Personnel" value={project?.project_manager?.full_name || 'UNASSIGNED'} />
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 border-gray-50 dark:border-gray-700">
                    {isCommissioned && isAdmin && (
                        <button onClick={() => onArchive(project.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition transform active:scale-95">
                            <ShieldCheckIcon className="h-5 w-5 stroke-[2.5px]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Archive</span>
                        </button>
                    )}

                    <Link to={`/projects/edit/${project.id}`} className="p-3 bg-white dark:bg-gray-700 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition">
                        <PencilIcon className="h-5 w-5" />
                    </Link>
                    
                    {isAdmin && (
                        <button onClick={onDelete} className="p-3 bg-white dark:bg-gray-700 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}

                    <Link 
                        to={`/tasks?project_id=${project.id}`} 
                        className="flex-1 lg:flex-none flex items-center justify-center gap-3 h-12 px-6 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition transform active:scale-95"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Tasks</span>
                        <ChevronRightIcon className="h-4 w-4 stroke-[3px]" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 text-indigo-500 h-4 w-4 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1.5">{label}</p>
                <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate uppercase tracking-tight">
                    {value || 'DATA MISSING'}
                </p>
            </div>
        </div>
    );
}

export default ProjectsPage;