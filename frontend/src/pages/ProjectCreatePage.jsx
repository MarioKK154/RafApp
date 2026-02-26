import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    BriefcaseIcon, 
    ChevronLeftIcon, 
    HashtagIcon, 
    UserGroupIcon, 
    MapPinIcon, 
    CalendarDaysIcon, 
    BanknotesIcon, 
    DocumentTextIcon,
    PlusIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    UserIcon,
    CubeIcon,
    FolderPlusIcon,
    SquaresPlusIcon,
    LinkIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

function ProjectCreatePage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Core Registry State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        status: 'Planning',
        start_date: '',
        end_date: '',
        project_manager_id: '',
        customer_id: '',
        budget: '',
        project_number: '', 
        parent_id: '',      
    });

    // Tier Hierarchy State: 'main', 'sub', 'extra'
    const [projectType, setProjectType] = useState('main'); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Remote Telemetry States
    const [projectManagers, setProjectManagers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [parentProjects, setParentProjects] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const canManageProjects = currentUser && (['admin', 'project manager'].includes(currentUser.role) || currentUser.is_superuser);

    /**
     * Protocol: Fetch all required registry data for initialization
     */
    const fetchRegistryData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [usersRes, custRes, projRes] = await Promise.all([
                axiosInstance.get('/users/'),
                axiosInstance.get('/customers/'),
                axiosInstance.get('/projects/', { params: { limit: 500 } })
            ]);

            // Guard: Ensure we are working with arrays to prevent crashes
            const userList = Array.isArray(usersRes.data) ? usersRes.data : [];
            const custList = Array.isArray(custRes.data) ? custRes.data : [];
            const projList = Array.isArray(projRes.data) ? projRes.data : [];

            setProjectManagers(userList.filter(u => ['admin', 'project manager'].includes(u.role)));
            setCustomers(custList);
            
            // Tier 1 Guard: Only projects without a parent can be parents (Main Projects)
            const potentialParents = projList.filter(p => !p.parent_id);
            setParentProjects(potentialParents);

            // Serialization Logic for Main Projects (Fail-safe for empty DB)
            if (projectType === 'main') {
                const validNumbers = projList
                    .filter(p => !p.parent_id && p.project_number && !isNaN(p.project_number))
                    .map(p => parseInt(p.project_number));
                
                const nextNum = validNumbers.length > 0 ? Math.max(...validNumbers) + 1 : 100;
                setFormData(prev => ({ 
                    ...prev, 
                    project_number: nextNum.toString(), 
                    parent_id: '',
                    address: '',
                    customer_id: ''
                }));
            }
        } catch (error) {
            console.error('Project create fetch failed:', error);
            toast.error('Failed to sync registry dependencies.');
        } finally {
            setIsLoadingData(false);
        }
    }, [projectType]);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) navigate('/login', { replace: true });
            else if (!canManageProjects) navigate('/', { replace: true });
            else fetchRegistryData();
        }
    }, [authIsLoading, isAuthenticated, canManageProjects, navigate, fetchRegistryData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Auto-assign data from Parent to Child for Sub/Extra projects
        if (name === 'parent_id' && value) {
            const parent = parentProjects.find(p => p.id === parseInt(value));
            if (parent) {
                setFormData(prev => ({ 
                    ...prev, 
                    project_number: `${parent.project_number || parent.id}-?`, 
                    customer_id: parent.customer_id || '',
                    address: parent.address || ''
                }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...formData,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            project_manager_id: formData.project_manager_id ? parseInt(formData.project_manager_id) : null,
            customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
            parent_id: projectType !== 'main' && formData.parent_id ? parseInt(formData.parent_id) : null,
            // If sub/extra, backend logic handles the dash-numbering auto-increment
            project_number: projectType === 'main' ? formData.project_number : null 
        };

        try {
            const res = await axiosInstance.post('/projects/', payload);
            toast.success('Project created.');
            navigate('/projects');
        } catch (error) {
            console.error('Project create submit failed:', error);
            toast.error(error.response?.data?.detail || 'Node initialization failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return <LoadingSpinner text="Synchronizing Deployment Registry..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <div className="mb-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link to="/projects" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> Return to Registry
                </Link>
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <PlusIcon className="h-8 w-8 text-white stroke-[2.5px]" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">
                            New project
                        </h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                            Deployment Tier: {projectType === 'main' ? 'Primary Infrastructure' : projectType.toUpperCase() + ' NODE'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Tactical Configuration */}
                <div className="lg:col-span-8 space-y-10">
                    
                    {/* Tier Selection & Serialization */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                            <div className="flex items-center gap-3">
                                <HashtagIcon className="h-6 w-6 text-indigo-500" />
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Tier Selection</h2>
                            </div>
                            
                            {/* Three-Way Type Toggle */}
                            <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                                <TypeButton active={projectType === 'main'} onClick={() => setProjectType('main')} icon={<CubeIcon />} label="Main" />
                                <TypeButton active={projectType === 'sub'} onClick={() => setProjectType('sub')} icon={<FolderPlusIcon />} label="Sub-Project" />
                                <TypeButton active={projectType === 'extra'} onClick={() => setProjectType('extra')} icon={<SquaresPlusIcon />} label="Extra Work" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {projectType !== 'main' ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <LinkIcon className="h-3.5 w-3.5" /> Parent Project Association*
                                    </label>
                                    <select name="parent_id" required value={formData.parent_id} onChange={handleChange} className="modern-input h-14 font-bold border-indigo-100 dark:border-indigo-900/30">
                                        <option value="">Select Parent Node</option>
                                        {parentProjects.map(p => (
                                            <option key={p.id} value={p.id}>[{p.project_number || p.id}] {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Registry Serial (Generated)*</label>
                                    <input type="text" name="project_number" value={formData.project_number} onChange={handleChange} className="modern-input h-14 font-mono font-black text-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Title*</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Electrical Installation - Phase 2" className="modern-input h-14 font-black" />
                            </div>
                        </div>
                    </section>

                    {/* Logistics Node */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <MapPinIcon className="h-6 w-6 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Site Logistics</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Association</label>
                                <div className="relative">
                                    <UserGroupIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="modern-input h-14 pl-12 font-bold">
                                        <option value="">-- Internal Node --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deployment Address</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} className="modern-input h-14 font-bold" placeholder="Site Coordinates" />
                            </div>
                        </div>
                    </section>

                    {/* Timeline Node */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3">
                            <CalendarDaysIcon className="h-6 w-6 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Temporal Schedule</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initialization Date</label>
                                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="modern-input h-14 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Completion</label>
                                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="modern-input h-14 font-bold" />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Personnel & Meta */}
                <div className="lg:col-span-4 space-y-10">
                    
                    {/* Management Section */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <UserIcon className="h-4 w-4 text-indigo-500" /> Project Lead
                            </label>
                            <select name="project_manager_id" value={formData.project_manager_id} onChange={handleChange} className="modern-input h-14 font-black uppercase text-[11px] tracking-widest appearance-none">
                                <option value="">Unassigned</option>
                                {projectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.full_name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2 pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                                <BanknotesIcon className="h-4 w-4 text-emerald-500" /> Fiscal Allocation (ISK)
                            </label>
                            <input type="number" name="budget" value={formData.budget} onChange={handleChange} className="modern-input h-14 font-black text-emerald-600 font-mono" placeholder="0" />
                        </div>
                    </section>

                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                            <DocumentTextIcon className="h-4 w-4 text-indigo-500" /> Scope Summary
                        </label>
                        <textarea 
                            name="description" 
                            rows="6" 
                            value={formData.description} 
                            onChange={handleChange} 
                            className="modern-input h-auto py-4 resize-none text-sm font-medium"
                            placeholder="Primary operational objectives..."
                        ></textarea>
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-2xl transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.3em]"
                    >
                        {isSubmitting ? (
                            <><ArrowPathIcon className="h-6 w-6 animate-spin" /> Syncing Node...</>
                        ) : (
                            <><ShieldCheckIcon className="h-6 w-6 stroke-[2.5px]" /> Create project</>
                        )}
                    </button>

                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800/30 flex gap-4">
                        <InformationCircleIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-black uppercase tracking-tight">
                            Infrastructure Notice: Node initialization triggers automated resource tracking. Deployment Tiers define financial reporting hierarchy.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}

// Sub-component for Tier Buttons
function TypeButton({ active, onClick, icon, label }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                active 
                ? 'bg-white dark:bg-gray-700 shadow-md text-indigo-600 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
        >
            <span className={active ? 'text-indigo-500' : 'text-gray-300'}>{React.cloneElement(icon, { className: "h-4 w-4 stroke-[2.5px]" })}</span>
            {label}
        </button>
    );
}

export default ProjectCreatePage;