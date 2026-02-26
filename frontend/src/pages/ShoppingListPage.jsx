import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ShoppingCartIcon, 
    BriefcaseIcon, 
    ClipboardDocumentCheckIcon, 
    ExclamationCircleIcon,
    ChevronDownIcon,
    AdjustmentsHorizontalIcon,
    PrinterIcon,
    CubeIcon
} from '@heroicons/react/24/outline';

function ShoppingListPage() {
    const [shoppingList, setShoppingList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const { user } = useAuth();

    const isSuperuser = user?.is_superuser;
    const canViewPage = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    /**
     * Fetch projects for the analysis selector.
     * Respects multi-tenancy: Admins see all, PMs see their own.
     */
    useEffect(() => {
        if (canViewPage) {
            axiosInstance.get('/projects/', { params: { limit: 500 } })
                .then(response => {
                    const relevantProjects = isAdmin
                        ? response.data
                        : response.data.filter(p => p.project_manager_id === user.id);
                    
                    setProjects(relevantProjects);
                    
                    // Auto-select if only one project exists
                    if (relevantProjects.length === 1) {
                        setSelectedProjectId(relevantProjects[0].id.toString());
                    }
                })
                .catch(() => toast.error("Failed to synchronize project registry."))
                .finally(() => setIsProjectsLoading(false));
        } else {
            setIsProjectsLoading(false);
        }
    }, [canViewPage, isAdmin, user?.id]);

    /**
     * Calculates required procurement based on BoQ vs Project Stock
     */
    const fetchShoppingList = useCallback(async (projectId) => {
        if (!projectId) {
            setShoppingList([]);
            setError('');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/shopping-list/project/${projectId}`);
            setShoppingList(response.data);
        } catch (err) {
            console.error("Procurement calculation error:", err);
            setError(`Failed to compile shopping list for Registry ID ${projectId}.`);
            toast.error(`Analysis engine failure.`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShoppingList(selectedProjectId);
    }, [selectedProjectId, fetchShoppingList]);

    if (isProjectsLoading) return <LoadingSpinner text="Accessing procurement telemetry..." size="lg" />;

    if (!canViewPage) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <ExclamationCircleIcon className="h-16 w-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Access Denied</h2>
                <p className="text-sm text-gray-500 max-w-xs mt-2">Personnel with Project Manager or Admin clearance only.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ShoppingCartIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Procurement List</h1>
                    </div>
                </div>
                
                {selectedProjectId && shoppingList.length > 0 && (
                    <button 
                        onClick={() => window.print()}
                        className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg"
                    >
                        <PrinterIcon className="h-4 w-4 mr-2" /> Export to PDF
                    </button>
                )}
            </header>

            {/* Project Selection Card */}
            
            <div className="max-w-2xl mb-12">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">
                    Select Deployment for BoQ Check
                </label>
                <div className="relative group">
                    <BriefcaseIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <select
                        id="project-select-shopping"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="block w-full pl-12 pr-10 h-14 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none outline-none cursor-pointer"
                        disabled={projects.length === 0}
                    >
                        <option value="">Choose an active project to analyze stock gap...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {projects.length === 0 && (
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-3 ml-1">
                        {isAdmin ? "No project records found in registry." : "No projects assigned to your profile."}
                    </p>
                )}
            </div>

            {isLoading ? (
                <div className="py-20"><LoadingSpinner text="Calculating material shortfall..." /></div>
            ) : error ? (
                <div className="p-6 bg-red-50 text-red-700 rounded-3xl text-sm font-bold border border-red-100 flex items-center gap-2">
                    <ExclamationCircleIcon className="h-5 w-5" /> {error}
                </div>
            ) : selectedProjectId && (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique SKUs</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{shoppingList.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Status</p>
                            <p className={`text-2xl font-black ${shoppingList.some(i => i.quantity_to_order > 0) ? 'text-orange-500' : 'text-green-500'}`}>
                                {shoppingList.some(i => i.quantity_to_order > 0) ? 'Orders Pending' : 'Fully Supplied'}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center">
                            <AdjustmentsHorizontalIcon className="h-8 w-8 text-gray-100 dark:text-gray-700" />
                        </div>
                    </div>

                    {/* Technical Data Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Requirement Breakdown</h2>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="py-5 px-8">Material / Specifications</th>
                                        <th className="py-5 px-6 text-right">Required (BoQ)</th>
                                        <th className="py-5 px-6 text-right">Allocated Stock</th>
                                        <th className="py-5 px-8 text-right">Delta (To Order)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {shoppingList.map(item => (
                                        <tr key={item.inventory_item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                                        <CubeIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{item.inventory_item.name}</p>
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{item.unit || 'Standard Unit'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right font-medium text-gray-500">{item.quantity_required}</td>
                                            <td className="py-5 px-6 text-right font-medium text-gray-500">{item.quantity_in_stock}</td>
                                            <td className="py-5 px-8 text-right">
                                                <span className={`inline-flex items-center h-10 px-4 rounded-xl text-sm font-black font-mono shadow-sm ${
                                                    item.quantity_to_order > 0 
                                                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800' 
                                                    : 'bg-green-50 text-green-600 dark:bg-green-900/20 border border-green-100 dark:border-green-800'
                                                }`}>
                                                    {item.quantity_to_order > 0 ? `+ ${item.quantity_to_order.toFixed(1)}` : '0.0'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {shoppingList.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center text-gray-400 italic font-medium">
                                                Registry Clear: Project BoQ is fully satisfied by current deployment stock.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShoppingListPage;