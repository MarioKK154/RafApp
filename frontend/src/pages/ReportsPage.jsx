import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    DocumentChartBarIcon, 
    BanknotesIcon, 
    ClockIcon, 
    ArrowsRightLeftIcon, 
    UserIcon,
    BriefcaseIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Currency Formatter for ISK (Icelandic Króna)
 */
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0 kr.';
    return new Intl.NumberFormat('is-IS', { 
        style: 'currency', 
        currency: 'ISK',
        maximumFractionDigits: 0 
    }).format(value);
};

function ReportsPage() {
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { user } = useAuth();
    
    const isSuperuser = user?.is_superuser;
    const canViewReports = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    /**
     * Loads the project registry for analysis selection
     */
    useEffect(() => {
        if (canViewReports) {
            axiosInstance.get('/projects/', { params: { limit: 1000 } })
                .then(response => setProjects(response.data))
                .catch(() => toast.error("Failed to synchronize project registry."));
        }
    }, [canViewReports]);

    const handleFetchReport = async (projectId) => {
        if (!projectId) {
            setReportData(null);
            return;
        }
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/reports/project-summary/${projectId}`);
            setReportData(response.data);
        } catch (error) {
            console.error('Report fetch failed:', error);
            toast.error("Telemetry failure: Could not generate project summary.");
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (!canViewReports) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <ShieldCheckIcon className="h-16 w-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Access Restricted</h2>
                <p className="text-sm text-gray-500 max-w-xs mt-2">Administrative credentials are required to access financial telemetry and cost analysis.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <DocumentChartBarIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Financial Analytics</h1>
                    </div>
                </div>
                </div>
            </header>

            {/* Selection Interface */}
            <div className="max-w-xl mb-12">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Select Analysis Target</label>
                <div className="relative group">
                    <BriefcaseIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <select
                        value={selectedProjectId}
                        onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            handleFetchReport(e.target.value);
                        }}
                        className="block w-full pl-12 pr-10 h-14 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm appearance-none outline-none cursor-pointer"
                    >
                        <option value="">Select a project for summary breakdown...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {isSuperuser ? `(ID: ${p.id})` : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {isLoading ? (
                <div className="py-20"><LoadingSpinner text="Compiling project telemetry..." /></div>
            ) : reportData ? (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard 
                            icon={<BanknotesIcon />} 
                            label="Allocated Budget" 
                            value={formatCurrency(reportData.budget)} 
                        />
                        <MetricCard 
                            icon={<ArrowPathIcon />} 
                            label="Realized Cost" 
                            value={formatCurrency(reportData.calculated_cost)} 
                        />
                        <MetricCard 
                            icon={<ArrowsRightLeftIcon />} 
                            label="Fiscal Variance" 
                            value={formatCurrency(reportData.variance)} 
                            trend={reportData.variance >= 0 ? 'positive' : 'negative'}
                        />
                        <MetricCard 
                            icon={<ClockIcon />} 
                            label="Labor Deployment" 
                            value={`${reportData.total_hours} hrs`} 
                        />
                    </div>

                    {/* Breakdown Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Labor Cost Breakdown</h2>
                            <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Technician contribution & resource valuation</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="py-5 px-8">Staff Member</th>
                                        <th className="py-5 px-6 text-right">Duration (Hrs)</th>
                                        <th className="py-5 px-6 text-right">Rate</th>
                                        <th className="py-5 px-8 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {reportData.detailed_logs.map((log, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group">
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                        <UserIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white">{log.user_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-right font-mono font-bold text-gray-600 dark:text-gray-300">
                                                {log.duration_hours.toFixed(2)}
                                            </td>
                                            <td className="py-5 px-6 text-right text-gray-400 font-medium italic">
                                                {formatCurrency(log.hourly_rate)}/hr
                                            </td>
                                            <td className="py-5 px-8 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                {formatCurrency(log.cost)}
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.detailed_logs.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center text-gray-400 italic">No labor logs recorded for this project target.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Disclaimer / Info */}
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex gap-4">
                        <InformationCircleIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                            Note: Calculated costs are based on finalized timelogs and active labor catalog rates at the time of session closure. 
                            Material costs from procurement lists are currently handled in the Project BoQ section.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="py-32 text-center">
                    <DocumentChartBarIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter italic">Analytical Buffer Empty</h3>
                    <p className="text-sm text-gray-400 mt-2">Select a deployment from the registry to initialize cost reporting.</p>
                </div>
            )}
        </div>
    );
}

/**
 * Helper: Insight Card
 */
function MetricCard({ icon, label, value, trend = 'neutral' }) {
    const trendStyles = {
        positive: 'text-green-600 dark:text-green-400',
        negative: 'text-red-600 dark:text-red-400',
        neutral: 'text-gray-900 dark:text-white'
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 transition-transform hover:-translate-y-1">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-2xl w-fit mb-6">
                {React.cloneElement(icon, { className: "h-6 w-6 text-indigo-600 dark:text-indigo-400" })}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black ${trendStyles[trend]}`}>{value}</p>
        </div>
    );
}

export default ReportsPage;