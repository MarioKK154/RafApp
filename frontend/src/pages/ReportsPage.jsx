// frontend/src/pages/ReportsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    // Use the 'is-IS' locale for Iceland and 'ISK' for the currency.
    // ISK typically does not use fractional digits.
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
    const canViewReports = user && ['admin', 'project manager'].includes(user.role);

    useEffect(() => {
        if (canViewReports) {
            axiosInstance.get('/projects/')
                .then(response => setProjects(response.data))
                .catch(() => toast.error("Could not load projects for selection."));
        }
    }, [canViewReports]);

    const handleFetchReport = (projectId) => {
        if (!projectId) {
            setReportData(null);
            return;
        }
        setIsLoading(true);
        axiosInstance.get(`/reports/project-summary/${projectId}`)
            .then(response => setReportData(response.data))
            .catch(() => toast.error("Failed to generate report for this project."))
            .finally(() => setIsLoading(false));
    };

    if (!canViewReports) {
        return <div className="text-center p-8 text-red-500">You do not have permission to view reports.</div>;
    }

    const varianceColor = reportData?.variance >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Project Reports</h1>
            
            <div className="max-w-md mb-8">
                <label htmlFor="project-select" className="block text-sm font-medium mb-1">Select a Project to Analyze</label>
                <select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        handleFetchReport(e.target.value);
                    }}
                    className="block w-full rounded-md shadow-sm"
                >
                    <option value="">-- Choose a Project --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {isLoading && <LoadingSpinner text="Generating report..." />}

            {reportData && !isLoading && (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Budget</h3><p className="text-2xl font-semibold">{formatCurrency(reportData.budget)}</p></div>
                        <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Calculated Cost</h3><p className="text-2xl font-semibold">{formatCurrency(reportData.calculated_cost)}</p></div>
                        <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Variance</h3><p className={`text-2xl font-semibold ${varianceColor}`}>{formatCurrency(reportData.variance)}</p></div>
                        <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-500">Total Hours</h3><p className="text-2xl font-semibold">{reportData.total_hours} hrs</p></div>
                    </div>

                    {/* Detailed Log Table */}
                    <div>
                        <h2 className="text-xl font-bold mb-4">Detailed Cost Breakdown</h2>
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-50">
                                    <tr>
                                        <th className="py-3 px-6">User</th>
                                        <th className="py-3 px-6 text-right">Hours Logged</th>
                                        <th className="py-3 px-6 text-right">Hourly Rate</th>
                                        <th className="py-3 px-6 text-right">Subtotal Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.detailed_logs.map((log, index) => (
                                        <tr key={index} className="bg-white border-b">
                                            <td className="py-4 px-6 font-medium">{log.user_name}</td>
                                            <td className="py-4 px-6 text-right">{log.duration_hours.toFixed(2)}</td>
                                            <td className="py-4 px-6 text-right">{formatCurrency(log.hourly_rate)}</td>
                                            <td className="py-4 px-6 text-right font-semibold">{formatCurrency(log.cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReportsPage;