import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                toast.error(t('auth_required_registry'));
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error(t('access_denied_admin_req'));
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
                toast.info(`${t('ready_to_process')} ${file.name}`);
            } else {
                toast.error(t('invalid_filetype_csv'));
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
            toast.success(`${t('ingestion_complete')} ${response.data.created_count} ${t('users_initialized')}`);
        } catch (error) {
            console.error('CSV ingestion error:', error);
            const errorMsg = error.response?.data?.detail || t('csv_ingestion_error');
            setUploadError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
            const fileInput = document.getElementById('csvFile');
            if (fileInput) fileInput.value = null;
            setSelectedFile(null);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('authenticating_clearance')} size="lg" />;
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
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <CloudArrowUpIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('bulk_ingestion', { defaultValue: 'Bulk Ingestion' })}</h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload & Results (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Upload Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        {uploadError && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl text-sm font-medium flex items-center gap-2">
                                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" /> {uploadError}
                            </div>
                        )}
                        <div className="mb-6">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('source_deployment')}</h2>
                            <p className="text-sm text-gray-500 font-medium">{t('select_csv_populate')}</p>
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
                                        {selectedFile ? selectedFile.name : t('drop_csv_browse')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">{t('rfc_4180_compliant')}</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading || !selectedFile}
                                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95 disabled:opacity-50 disabled:grayscale"
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
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('ingestion_summary')}</h3>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-green-500 uppercase">{t('created')}</p>
                                        <p className="text-xl font-black">{uploadResult.created_count}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-orange-500 uppercase">{t('skipped')}</p>
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
                            <h2 className="text-xl font-black uppercase tracking-tight">{t('csv_schema_guide')}</h2>
                        </div>

                        <div className="space-y-4">
                            <SchemaField label={t("schema_name")} requirement={t("schema_optional")} detail={t("schema_full_name")} />
                            <SchemaField label={t("schema_email")} requirement={t("schema_required")} detail={t("schema_primary_id")} highlight />
                            <SchemaField label={t("schema_emp_id")} requirement={t("schema_optional")} detail={t("schema_num_id")} />
                            <SchemaField label={t("schema_kennitala")} requirement={t("schema_optional")} detail={t("schema_10_digit")} />
                            <SchemaField label={t("schema_phone")} requirement={t("schema_optional")} detail={t("schema_mobile")} />
                            <SchemaField label={t("schema_location")} requirement={t("schema_optional")} detail={t("schema_site")} />
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-2xl">
                                <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 shrink-0" />
                                <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase">
                                    Logic Note: Existing identifiers will trigger a <span className="text-orange-500">{t('skip_uppercase')}</span>. Duplicate detection is active for Email, Emp-ID, and Kennitala.
                                </p>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 rounded-2xl">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-400 shrink-0" />
                                <p className="text-[10px] text-indigo-300 font-bold leading-relaxed uppercase">
                                    {t("default_config_note")}
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