import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    // FIXED: Correct Heroicons v2 naming (Up/Down use Square, Left/Right use Rectangle)
    ArrowUpOnSquareIcon,    
    ArrowDownOnSquareIcon, 
    WrenchScrewdriverIcon,
    IdentificationIcon,
    UserIcon,
    AdjustmentsHorizontalIcon,
    ChevronRightIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

/**
 * Debounce hook to ensure high performance during registry searches
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function ToolInventoryPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Data & Load States
    const [tools, setTools] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filter & UI States
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [toolToDelete, setToolToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isSuperuser = user?.is_superuser;
    const canManageTools = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Telemetry Sync: Load all hardware assets from registry
     */
    const fetchTools = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/tools/', { params: { limit: 1000 } });
            setTools(response.data);
        } catch (err) {
            console.error("Asset Registry Error:", err);
            setError('Hardware registry synchronization failed.');
            toast.error('Registry sync failure.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTools(); }, [fetchTools]);

    /**
     * Optimized Frontend Filtering
     */
    const filteredTools = useMemo(() => {
        if (!debouncedSearch) return tools;
        const query = debouncedSearch.toLowerCase();
        return tools.filter(tool =>
            tool.name.toLowerCase().includes(query) ||
            (tool.brand && tool.brand.toLowerCase().includes(query)) ||
            (tool.model && tool.model.toLowerCase().includes(query)) ||
            (tool.serial_number && tool.serial_number.toLowerCase().includes(query))
        );
    }, [tools, debouncedSearch]);

    const handleCheckout = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkout`);
            toast.success('Asset assigned to your profile.');
            fetchTools();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Checkout protocol rejected.');
        }
    };

    const handleCheckin = async (toolId) => {
        try {
            await axiosInstance.post(`/tools/${toolId}/checkin`);
            toast.success('Asset returned to base storage.');
            fetchTools();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Return protocol rejected.');
        }
    };

    const triggerDelete = (tool) => {
        setToolToDelete(tool);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!toolToDelete) return;
        try {
            await axiosInstance.delete(`/tools/${toolToDelete.id}`);
            toast.success(`Asset purged from registry.`);
            fetchTools();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Purge failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setToolToDelete(null);
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
            case 'In Use': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
            case 'In Repair': return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
            case 'Retired': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    if (isLoading && tools.length === 0) {
        return <LoadingSpinner text="Accessing hardware telemetry..." size="lg" />;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase">Hardware Registry</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Field resource monitoring & tracking</p>
                </div>

                {canManageTools && (
                    <button 
                        onClick={() => navigate('/tools/new')}
                        className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Register Asset
                    </button>
                )}
            </header>

            {/* Controls Hub */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by ID, Serial Number, Manufacturer or Tool Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4" /> {filteredTools.length} Units Online
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}

            {/* Main Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.length > 0 ? filteredTools.map(tool => (
                    <div key={tool.id} className="group bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                        
                        {/* Tool Identity Header */}
                        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border ${getStatusStyles(tool.status)}`}>
                                    {tool.status.replace('_', ' ')}
                                </span>
                                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                    <IdentificationIcon className="h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                {tool.name}
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {tool.brand || 'Generic'} • {tool.model || 'OEM Standard'}
                            </p>
                        </div>

                        {/* Visual & Technical Body */}
                        <div className="p-6 flex-grow space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 bg-gray-50 dark:bg-gray-900 rounded-2xl p-2 border border-gray-100 dark:border-gray-700 shrink-0">
                                    <img 
                                        src={tool.image_url || '/default-tool.png'} 
                                        alt="" 
                                        className="h-full w-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                                        onError={(e) => { e.target.src = '/default-tool.png'; }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Registry Identifier</p>
                                    <p className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 truncate">
                                        {tool.serial_number || `REG-ID-${tool.id}`}
                                    </p>
                                    
                                    <div className="flex items-center gap-2 mt-3">
                                        <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                                            {tool.current_user?.full_name || 'Storage (Base)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics Interface */}
                            <div className="pt-2">
                                {tool.status === 'Available' ? (
                                    <button 
                                        onClick={() => handleCheckout(tool.id)}
                                        className="w-full flex items-center justify-center gap-2 h-11 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition shadow-lg shadow-green-100 dark:shadow-none"
                                    >
                                        <ArrowUpOnSquareIcon className="h-4 w-4" /> Initialize Checkout
                                    </button>
                                ) : tool.status === 'In Use' && tool.current_user?.id === user.id ? (
                                    <button 
                                        onClick={() => handleCheckin(tool.id)}
                                        className="w-full flex items-center justify-center gap-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition shadow-lg shadow-indigo-100 dark:shadow-none"
                                    >
                                        <ArrowDownOnSquareIcon className="h-4 w-4" /> End Assignment
                                    </button>
                                ) : (
                                    <div className="h-11 flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Unit Occupied</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Admin Overrides */}
                        {canManageTools && (
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate(`/tools/edit/${tool.id}`)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Modify Specs"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => triggerDelete(tool)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                        title="Purge Record"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <Link 
                                    to={`/tools/${tool.id}`}
                                    className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    Audit <ChevronRightIcon className="h-3 w-3" />
                                </Link>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <WrenchScrewdriverIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No Matches Found</h3>
                        <p className="text-sm text-gray-400 mt-1">Adjust your search parameters or register a new hardware unit.</p>
                    </div>
                )}
            </div>

            {/* Deletion confirmation modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Operational Unit"
                message={`CRITICAL: Permanent removal of "${toolToDelete?.name}" from the hardware registry. Historical check-out telemetry will remain archived.`}
                confirmText="Purge Unit"
                type="danger"
            />
        </div>
    );
}

export default ToolInventoryPage;