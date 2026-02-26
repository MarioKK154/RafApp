import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
    WrenchScrewdriverIcon, 
    CalendarIcon, 
    IdentificationIcon, 
    ClockIcon, 
    UserIcon, 
    PencilSquareIcon, 
    ChevronLeftIcon,
    FingerPrintIcon,
    ArrowPathRoundedSquareIcon,
    ArchiveBoxIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

function ToolDetailsPage() {
    const { toolId } = useParams();
    const navigate = useNavigate();
    const [tool, setTool] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const { user } = useAuth();
    
    const isSuperuser = user?.is_superuser;
    const canManageTools = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchTool = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/tools/${toolId}`);
            setTool(response.data);
        } catch (err) {
            console.error("Asset Sync Error:", err);
            toast.error("Telemetry failure: Tool record unreachable.");
            navigate('/tools');
        } finally {
            setIsLoading(false);
        }
    }, [toolId, navigate]);

    useEffect(() => {
        fetchTool();
    }, [fetchTool]);

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
            case 'In Use': return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
            case 'In Repair': return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
            case 'Retired': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    if (isLoading) return <LoadingSpinner text="Accessing asset logbook..." size="lg" />;
    if (!tool) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <Link 
                        to="/tools" 
                        className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                    >
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Hardware Registry
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                            {tool.name}
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-bold uppercase tracking-widest">
                        {tool.brand || 'Generic'} • {tool.model || 'Standard Edition'}
                    </p>
                </div>

                {canManageTools && (
                    <Link 
                        to={`/tools/edit/${tool.id}`} 
                        className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition transform active:scale-95"
                    >
                        <PencilSquareIcon className="h-5 w-5 mr-1.5" /> 
                        Modify Specs
                    </Link>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Asset Telemetry (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Visual ID Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 text-center overflow-hidden">
                        <div className="relative group mb-6 inline-block">
                            <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full scale-0 group-hover:scale-100 transition-transform"></div>
                            <img 
                                src={tool.image_url || '/default-tool.png'} 
                                alt={tool.name}
                                className="relative z-10 w-48 h-48 object-contain mx-auto grayscale hover:grayscale-0 transition-all duration-500"
                                onError={(e) => { e.target.src='/default-tool.png' }}
                            />
                        </div>

                        <div className={`mb-4 inline-flex items-center px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${getStatusStyles(tool.status)}`}>
                            {tool.status.replace('_', ' ')}
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                            <UserIcon className="h-4 w-4 text-indigo-500" />
                            <span>Currently Held By:</span>
                            <span className="text-gray-900 dark:text-white">{tool.current_user?.full_name || 'Central Storage'}</span>
                        </div>
                    </section>

                    {/* Technical Specifications */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                            <IdentificationIcon className="h-4 w-4" /> Technical Specs
                        </h2>
                        
                        <div className="space-y-4">
                            <SpecItem icon={<FingerPrintIcon />} label="Registry ID" value={`#${tool.id}`} mono />
                            <SpecItem icon={<IdentificationIcon />} label="Serial Number" value={tool.serial_number || 'N/A'} mono />
                            <SpecItem icon={<CalendarIcon />} label="Purchase Date" value={tool.purchase_date ? new Date(tool.purchase_date).toLocaleDateString() : 'Unknown'} />
                            <SpecItem icon={<ArrowPathRoundedSquareIcon />} label="Last Service" value={tool.last_service_date ? new Date(tool.last_service_date).toLocaleDateString() : 'Never'} />
                        </div>

                        {tool.description && (
                            <div className="pt-4 border-t border-gray-50 dark:border-gray-700">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Technical Description</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">"{tool.description}"</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Historical Audit (8 cols) */}
                <div className="lg:col-span-8">
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-gray-700/30">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Audit Logbook</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Lifecycle event tracking</p>
                            </div>
                            <ArchiveBoxIcon className="h-8 w-8 text-gray-200 dark:text-gray-600" />
                        </div>

                        <div className="flex-grow overflow-y-auto max-h-[600px] scrollbar-hide">
                            {tool.history_logs && tool.history_logs.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-gray-400 uppercase font-black sticky top-0 bg-white dark:bg-gray-800 z-10 border-b dark:border-gray-700">
                                        <tr>
                                            <th className="py-5 px-8">Timestamp</th>
                                            <th className="py-5 px-6">Operational Event</th>
                                            <th className="py-5 px-8">Executing Agent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                        {[...tool.history_logs]
                                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                            .map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                                                <td className="py-5 px-8">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <ClockIcon className="h-4 w-4 text-indigo-400" />
                                                        <span className="font-mono font-bold text-[11px]">
                                                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                        log.action.includes('checkout') ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 
                                                        log.action.includes('checkin') ? 'bg-green-50 text-green-700 dark:bg-green-900/30' : 
                                                        'bg-gray-50 text-gray-600'
                                                    }`}>
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-8">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <UserIcon className="h-3 w-3" />
                                                        </div>
                                                        <span className="font-bold text-gray-700 dark:text-gray-300">
                                                            {log.user?.full_name || 'System Auto'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-32 text-center">
                                    <ClockIcon className="h-12 w-12 text-gray-100 dark:text-gray-700 mx-auto mb-4" />
                                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter italic">Logbook Vacant</h3>
                                    <p className="text-sm text-gray-400">No operational events have been registered for this asset.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
            
            {isSuperuser && (
                <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[2.5rem] border border-orange-100 dark:border-orange-800 flex gap-4">
                    <ShieldCheckIcon className="h-6 w-6 text-orange-600 shrink-0" />
                    <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed font-bold uppercase tracking-tight">
                        Infrastructure Access: As System Root, you have view-only oversight of this tenant's hardware logs. Modifications should only be performed via the tenant PM profile unless maintenance is required.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Helper: Technical Specification Line
 */
function SpecItem({ icon, label, value, mono = false }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
                {React.cloneElement(icon, { className: "h-4 w-4" })}
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className={`text-xs font-bold text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}

export default ToolDetailsPage;