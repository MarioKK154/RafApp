import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select';
import { 
    ClipboardDocumentCheckIcon, 
    ChevronLeftIcon,
    BriefcaseIcon,
    UserIcon,
    ShieldCheckIcon,
    ClockIcon,
    ExclamationCircleIcon,
    CheckBadgeIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch (e) { return ''; }
};

const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician'];
const EDITABLE_TASK_STATUSES = ["To Do", "In Progress", "Done", "Blocked"];

function TaskEditPage() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Data States
    const [taskData, setTaskData] = useState(null);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [potentialPredecessors, setPotentialPredecessors] = useState([]);
    
    // Form States
    const [formData, setFormData] = useState({
        title: '', description: '', status: 'To Do', priority: 'Medium',
        start_date: '', due_date: '', project_id: '', assignee_id: '',
        predecessors: [],
    });

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommissioning, setIsCommissioning] = useState(false);

    // Permissions: Superadmin has global root access
    const isSuperuser = currentUser?.is_superuser;
    const canManageTasks = currentUser && (['admin', 'project manager', 'team leader'].includes(currentUser.role) || isSuperuser);
    const canCommissionTask = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && taskId) {
            setIsLoadingData(true);
            try {
                const [taskRes, projectsRes, usersRes] = await Promise.all([
                    axiosInstance.get(`/tasks/${taskId}`),
                    axiosInstance.get('/projects/', { params: { limit: 500 } }),
                    axiosInstance.get('/users/', { params: { limit: 500 } })
                ]);

                const task = taskRes.data;
                setTaskData(task);
                setProjects(projectsRes.data);
                
                // Filter users based on role and tenant (unless superuser)
                setUsers(usersRes.data.filter(u => 
                    (ASSIGNABLE_ROLES.includes(u.role) || u.is_superuser) &&
                    (isSuperuser || u.tenant_id === task.tenant_id)
                ));
                
                // Fetch potential predecessors for the same project
                if (task.project_id) {
                    const tasksRes = await axiosInstance.get(`/tasks/?project_id=${task.project_id}&limit=200`);
                    const otherTasks = tasksRes.data.filter(t => t.id !== task.id);
                    
                    const predOptions = otherTasks.map(t => ({ value: t.id, label: t.title }));
                    setPotentialPredecessors(predOptions);

                    // Pre-select existing predecessors
                    const selectedPreds = (task.predecessor_ids || []).map(id => {
                        const match = otherTasks.find(t => t.id === id);
                        return { value: id, label: match ? match.title : `Task #${id}` };
                    });

                    setFormData({
                        title: task.title ?? '',
                        description: task.description ?? '',
                        status: task.status ?? 'To Do',
                        priority: task.priority ?? 'Medium',
                        start_date: formatDateForInput(task.start_date),
                        due_date: formatDateForInput(task.due_date),
                        project_id: task.project_id?.toString() ?? '',
                        assignee_id: task.assignee_id?.toString() ?? '',
                        predecessors: selectedPreds,
                    });
                }
            } catch (err) {
                setError(err.response?.status === 404 ? 'Task not found.' : 'Connection lost.');
            } finally {
                setIsLoadingData(false);
            }
        }
    }, [taskId, isAuthenticated, authIsLoading, isSuperuser]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handlePredecessorChange = (selected) => {
        setFormData(prev => ({ ...prev, predecessors: selected || [] }));
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        if (!canManageTasks) return;
        setIsSubmitting(true);
        
        const payload = {
            ...formData,
            project_id: Number(formData.project_id),
            assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        };
        
        try {
            await axiosInstance.put(`/tasks/${taskId}`, payload);
            
            // Dependency Sync logic
            const originalIds = new Set(taskData.predecessor_ids || []);
            const newIds = new Set(formData.predecessors.map(p => p.value));

            const toAdd = [...newIds].filter(id => !originalIds.has(id));
            const toRemove = [...originalIds].filter(id => !newIds.has(id));
            
            await Promise.all([
                ...toAdd.map(id => axiosInstance.post(`/tasks/${taskId}/dependencies`, { predecessor_id: id })),
                ...toRemove.map(id => axiosInstance.delete(`/tasks/${taskId}/dependencies/${id}`))
            ]);

            toast.success("Task details synchronized.");
            fetchPageData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommissionTask = async () => {
        if (!canCommissionTask || taskData.status !== "Done") return;
        setIsCommissioning(true);
        try {
            await axiosInstance.post(`/tasks/${taskId}/commission`);
            toast.success("Task officially commissioned.");
            fetchPageData();
        } catch (err) { 
            toast.error("Commissioning failed.");
        } finally { 
            setIsCommissioning(false); 
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Retrieving technical specs..." />;
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <ExclamationCircleIcon className="h-12 w-12 text-red-500 mb-2" />
                <h2 className="text-lg font-bold">{error}</h2>
                <Link to="/tasks" className="mt-4 text-indigo-600 font-bold hover:underline">Return to Registry</Link>
            </div>
        );
    }

    const isLocked = taskData?.is_commissioned;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link to="/tasks" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Task Registry
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ClipboardDocumentCheckIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                {taskData?.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    taskData?.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {taskData?.status}
                                </span>
                                {isLocked && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-black uppercase tracking-widest">
                                        <CheckBadgeIcon className="h-3 w-3" /> Commissioned
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {canCommissionTask && taskData?.status === "Done" && !isLocked && (
                    <button 
                        onClick={handleCommissionTask} 
                        disabled={isCommissioning}
                        className="inline-flex items-center px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-lg shadow-teal-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isCommissioning ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> : <CheckBadgeIcon className="h-5 w-5 mr-2" />}
                        Commission Task
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form (Left) */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleUpdateDetails} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <fieldset disabled={isLocked || !canManageTasks || isSubmitting} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                        <BriefcaseIcon className="h-3 w-3 text-indigo-500" /> Project Assignment
                                    </label>
                                    <select name="project_id" required value={formData.project_id} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
                                        {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Work Description</label>
                                    <textarea name="description" rows="4" value={formData.description} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" placeholder="Specify requirements..."></textarea>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                        <ShieldCheckIcon className="h-3 w-3 text-indigo-500" /> Priority
                                    </label>
                                    <select name="priority" value={formData.priority} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
                                        <option>Low</option><option>Medium</option><option>High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                        <ArrowPathIcon className="h-3 w-3 text-indigo-500" /> Current Status
                                    </label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
                                        {EDITABLE_TASK_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                        <ClockIcon className="h-3 w-3 text-indigo-500" /> Start Date
                                    </label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                        <ClockIcon className="h-3 w-3 text-indigo-500" /> Deadline
                                    </label>
                                    <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest flex items-center gap-1">
                                    <UserIcon className="h-3 w-3 text-indigo-500" /> Assigned Lead
                                </label>
                                <select name="assignee_id" value={formData.assignee_id} onChange={handleChange} className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
                                    <option value="">Unassigned</option>
                                    {users.map(u => ( <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option> ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Gantt Dependencies (Predecessors)</label>
                                <Select
                                    isMulti options={potentialPredecessors} value={formData.predecessors}
                                    onChange={handlePredecessorChange} className="react-select-container" classNamePrefix="react-select"
                                    isDisabled={isLocked || isSubmitting}
                                />
                                <p className="mt-2 text-[10px] text-gray-400 font-medium italic italic">Tasks selected here must be closed before this task can be prioritized.</p>
                            </div>
                        </fieldset>

                        {!isLocked && canManageTasks && (
                            <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-md transition transform active:scale-95 disabled:opacity-50">
                                    <ArrowPathIcon className={`h-5 w-5 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
                                    {isSubmitting ? 'Saving Specs...' : 'Save Updates'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Information Sidebar (Right) */}
                <div className="space-y-6">
                    <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Task Fingerprint</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Internal ID</p>
                                <p className="font-mono text-sm">#TSK-{taskId}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Created On</p>
                                <p className="text-sm font-medium">{new Date(taskData?.created_at).toLocaleDateString()}</p>
                            </div>
                            {isSuperuser && (
                                <div>
                                    <p className="text-[10px] text-orange-400 uppercase font-bold">Tenant Owner</p>
                                    <p className="text-sm font-black text-orange-100">{taskData?.tenant?.name || 'Root System'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Discussion and Documentation Sections */}
            <div className="mt-12 space-y-12 pb-20">
                <TaskComments taskId={taskId} />
                <TaskPhotos taskId={taskId} />
            </div>
        </div>
    );
}

export default TaskEditPage;