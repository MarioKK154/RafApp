import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    UserGroupIcon, 
    CloudArrowUpIcon, 
    DocumentTextIcon, 
    ChevronLeftIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    TableCellsIcon
} from '@heroicons/react/24/outline';

function UserBulkImportPage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // UI & Data States
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState('');

    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_superuser);

    /**
     * Security Guard: Restrict access to Administrative Personnel only.
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Authentication required for registry access.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: Administrative clearance required for bulk ingestion.");
                navigate('/users', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    const handleFileChange = (event) => {
        setUploadResult(null);
        setUploadError('');
        const file = event.target.files[0];
        
        if (file) {
            if (file.type === "text/csv" || file.name.endsWith('.csv')) {
                setSelectedFile(file);
                toast.info(`Ready to process: ${file.name}`);
            } else {
                toast.error("Invalid Filetype: Protocol requires .csv format.");
                setSelectedFile(null);
                event.target.value = null;
            }
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedFile || !isAdmin) return;

        setIsUploading(true);
        setUploadResult(null);
        setUploadError('');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axiosInstance.post('/users/import-csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadResult(response.data);
            toast.success(`Ingestion Complete: ${response.data.created_count} users initialized.`);
        } catch (err) {
            console.error("CSV Ingestion Error:", err);
            const errorMsg = err.response?.data?.detail || 'Ingestion protocol failed. Verify CSV integrity.';
            setUploadError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
            const fileInput = document.getElementById('csvFile');
            if (fileInput) fileInput.value = null;
            setSelectedFile(null);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Authenticating Registry Clearance..." size="lg" />;
    if (!isAuthenticated || !isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link to="/users" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                        <ChevronLeftIcon className="h-3 w-3 mr-1" /> Personnel Registry
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <CloudArrowUpIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase">Bulk Ingestion</h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload & Results (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Upload Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="mb-6">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Source Deployment</h2>
                            <p className="text-sm text-gray-500 font-medium">Select a standardized CSV file to populate the user database.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative group">
                                <input
                                    type="file"
                                    id="csvFile"
                                    accept=".csv, text/csv"
                                    onChange={handleFileChange}
                                    required
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-[2rem] transition-all ${
                                    selectedFile 
                                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 group-hover:bg-gray-50'
                                }`}>
                                    <DocumentTextIcon className={`h-12 w-12 mb-4 transition-colors ${selectedFile ? 'text-indigo-600' : 'text-gray-300'}`} />
                                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                        {selectedFile ? selectedFile.name : "Drop CSV File or Click to Browse"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">RFC 4180 Compliant Required</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !selectedFile}
                                className="w-full h-14 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {isUploading ? (
                                    <>
                                        <ArrowPathIcon className="h-6 w-6 animate-spin" />
                                        Processing Telemetry...
                                    </>
                                ) : (
                                    <>
                                        <CloudArrowUpIcon className="h-6 w-6" />
                                        Initialize Bulk Import
                                    </>
                                )}
                            </button>
                        </form>
                    </section>

                    {/* Results Display */}
                    {uploadResult && (
                        <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
                            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Ingestion Summary</h3>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-green-500 uppercase">Created</p>
                                        <p className="text-xl font-black">{uploadResult.created_count}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-orange-500 uppercase">Skipped</p>
                                        <p className="text-xl font-black">{uploadResult.skipped_count + (uploadResult.parse_errors?.length || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            {(uploadResult.errors?.length > 0 || uploadResult.parse_errors?.length > 0) && (
                                <div className="p-6 bg-red-50 dark:bg-red-900/10">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <XCircleIcon className="h-4 w-4" /> Validation Failures
                                    </p>
                                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-100 p-4 max-h-40 overflow-y-auto">
                                        <ul className="space-y-2">
                                            {[...(uploadResult.parse_errors || []), ...(uploadResult.errors || [])].map((err, idx) => (
                                                <li key={idx} className="text-[10px] font-mono font-bold text-red-500 flex items-start gap-2">
                                                    <span className="shrink-0 text-red-300">[{idx + 1}]</span> {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {uploadResult.created_count > 0 && (
                                <div className="p-6">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <CheckCircleIcon className="h-4 w-4" /> Finalized Identifiers
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                        {uploadResult.created_users_emails?.map((email, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">{email}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Right Column: Schema & Rules (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <section className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <TableCellsIcon className="h-6 w-6 text-indigo-400" />
                            <h2 className="text-xl font-black uppercase tracking-tight">CSV Schema Guide</h2>
                        </div>

                        <div className="space-y-4">
                            <SchemaField label="Name" requirement="Optional" detail="Full display name" />
                            <SchemaField label="Email" requirement="Required" detail="Primary unique identifier" highlight />
                            <SchemaField label="Employee ID" requirement="Optional" detail="Numerical payroll ID" />
                            <SchemaField label="Kennitala" requirement="Optional" detail="10-digit national ID" />
                            <SchemaField label="Phone" requirement="Optional" detail="Mobile contact number" />
                            <SchemaField label="Location" requirement="Optional" detail="Primary site assignment" />
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-2xl">
                                <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 shrink-0" />
                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase">
                                    Logic Note: Existing identifiers will trigger a <span className="text-orange-500">SKIP</span>. Duplicate detection is active for Email, Emp-ID, and Kennitala.
                                </p>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 rounded-2xl">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                                <p className="text-[10px] text-indigo-300 font-bold leading-relaxed uppercase">
                                    Default Configuration: Ingested users default to "electrician" role with security pass "testpassword123".
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

/**
 * Helper: Schema Field Display
 */
function SchemaField({ label, requirement, detail, highlight = false }) {
    return (
        <div className={`p-3 rounded-xl border ${highlight ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-800 bg-gray-800/30'} flex justify-between items-center`}>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-400' : 'text-gray-100'}`}>{label}</p>
                <p className="text-[9px] text-gray-500 font-bold uppercase">{detail}</p>
            </div>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${requirement === 'Required' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                {requirement}
            </span>
        </div>
    );
}

export default UserBulkImportPage;