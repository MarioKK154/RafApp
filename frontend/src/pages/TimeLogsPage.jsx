import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import Select from 'react-select';
import { 
    ClockIcon, 
    UserCircleIcon, 
    BriefcaseIcon, 
    PencilSquareIcon, 
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
    CalendarIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    ChevronRightIcon,
    PencilIcon
} from '@heroicons/react/24/outline';
import Modal from '../components/Modal';

/**
 * Technical Duration Formatter
 */
const formatDuration = (totalHours) => {
    if (totalHours === null || totalHours === undefined) return 'Ongoing';
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return `${hours}h ${minutes}m`;
};

/**
 * Filter Constants
 */
const SORT_OPTIONS = [
    { value: 'start_time', label: 'Start Timestamp' },
    { value: 'end_time', label: 'End Timestamp' },
    { value: 'duration', label: 'Net Duration' },
];
const DIR_OPTIONS = [
    { value: 'desc', label: 'Descending (Newest First)' },
    { value: 'asc', label: 'Ascending (Oldest First)' },
];

/**
 * Debounce Hook for Performant Search
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function TimeLogsPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();

    // Data States
    const [timeLogs, setTimeLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectOptions, setProjectOptions] = useState([]);
    const [userOptions, setUserOptions] = useState([]);

    // Filter States
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
    const [sortDir, setSortDir] = useState(DIR_OPTIONS[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    const isSuperuser = currentUser?.is_superuser;
    const isAdminOrManager = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;

    // Admin edit timelog modal
    const [logToEdit, setLogToEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({ project_id: '', start_datetime: '', end_datetime: '', notes: '' });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    /**
     * React-Select Custom Styling to match Industrial Theme
     */
    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            borderRadius: '1rem',
            padding: '2px 8px',
            borderColor: state.isFocused ? '#4f46e5' : '#e5e7eb',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(79, 70, 229, 0.1)' : 'none',
            '&:hover': { borderColor: '#4f46e5' },
            backgroundColor: 'transparent',
        }),
        menu: (base) => ({ ...base, borderRadius: '1rem', overflow: 'hidden', padding: '0' }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#f5f7ff' : 'white',
            color: state.isSelected ? 'white' : '#374151',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        })
    };

    /**
     * Telemetry Sync: Load Filter Metadata
     */
    const fetchMetadata = useCallback(async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                axiosInstance.get('/projects/', { params: { limit: 500 } }),
                axiosInstance.get('/users/', { params: { limit: 500 } })
            ]);
            setProjectOptions(projRes.data.map(p => ({ value: p.id, label: p.name })));
            setUserOptions(userRes.data.map(u => ({ value: u.id, label: u.full_name || u.email })));
        } catch (error) {
            console.error('Time logs metadata fetch failed:', error);
            toast.error("Telemetry sync failed: Metadata registry unreachable.");
        }
    }, []);

    /**
     * Telemetry Sync: Load Time Logs
     */
    const fetchTimeLogs = useCallback(async () => {
        setIsLoading(true);
        setError('');
        const endpoint = isAdminOrManager ? '/timelogs/' : '/timelogs/me';
        const params = {
            sort_by: sortBy?.value,
            sort_dir: sortDir?.value,
            search: debouncedSearch || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            limit: 200,
            ...(isAdminOrManager && {
                project_id: selectedProject?.value || undefined,
                user_id: selectedUser?.value || undefined,
            })
        };

        try {
            const response = await axiosInstance.get(endpoint, { params });
            setTimeLogs(response.data);
        } catch (error) {
            console.error('Fetch time logs failed:', error);
            setError('Registry synchronization failure.');
        } finally {
            setIsLoading(false);
        }
    }, [isAdminOrManager, selectedProject, selectedUser, startDate, endDate, debouncedSearch, sortBy, sortDir]);

    useEffect(() => {
        if (isAdminOrManager) fetchMetadata();
    }, [fetchMetadata, isAdminOrManager]);

    useEffect(() => {
        fetchTimeLogs();
    }, [fetchTimeLogs]);

    // Calculate sum of displayed hours
    const totalDisplayedHours = useMemo(() => {
        return timeLogs.reduce((acc, log) => acc + (log.duration_hours || 0), 0).toFixed(1);
    }, [timeLogs]);

    const openEditModal = (log) => {
        setLogToEdit(log);
        const start = log.start_time ? new Date(log.start_time) : null;
        const end = log.end_time ? new Date(log.end_time) : null;
        setEditFormData({
            project_id: log.project_id?.toString() ?? '',
            start_datetime: start ? start.toISOString().slice(0, 16) : '',
            end_datetime: end ? end.toISOString().slice(0, 16) : '',
            notes: log.notes ?? '',
        });
    };

    const handleSaveEdit = async (e) => {
        e?.preventDefault();
        if (!logToEdit || !isAdmin) return;
        setIsSavingEdit(true);
        try {
            const payload = {};
            if (editFormData.project_id !== '') payload.project_id = parseInt(editFormData.project_id, 10);
            if (editFormData.start_datetime) payload.start_time = new Date(editFormData.start_datetime).toISOString();
            if (editFormData.end_datetime) payload.end_time = new Date(editFormData.end_datetime).toISOString();
            payload.notes = editFormData.notes || null;
            await axiosInstance.patch(`/timelogs/${logToEdit.id}`, payload);
            toast.success(t('save_changes'));
            setLogToEdit(null);
            fetchTimeLogs();
        } catch (err) {
            console.error('Timelog update failed:', err);
            toast.error(err.response?.data?.detail || t('update_failed'));
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ClockIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">{t('timesheets')}</h1>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="text-right border-r border-gray-100 dark:border-gray-700 pr-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('net_total')}</p>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalDisplayedHours} <span className="text-xs font-bold text-gray-400">HRS</span></p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('entries')}</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{timeLogs.length}</p>
                    </div>
                </div>
                </div>
            </header>

            {/* Filter Hub */}
            <section className="mb-10 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Search & Dates */}
                    <div className="lg:col-span-8 bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <div className="relative group">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder={t('search_shift_notes')} 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> {t('interval_start')}</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-12 rounded-xl border-gray-200 dark:bg-gray-700 text-sm font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> {t('interval_end')}</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-12 rounded-xl border-gray-200 dark:bg-gray-700 text-sm font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* Sorting & Technical Metadata */}
                    <div className="lg:col-span-4 bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><AdjustmentsHorizontalIcon className="h-4 w-4" /> {t('sorting_protocol')}</p>
                        <Select options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} styles={customSelectStyles} />
                        <Select options={DIR_OPTIONS} value={sortDir} onChange={setSortDir} styles={customSelectStyles} />
                        <button onClick={fetchTimeLogs} className="w-full h-12 mt-2 inline-flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-indigo-600 transition rounded-xl border border-indigo-100 dark:border-indigo-900">
                            <ArrowPathIcon className="h-4 w-4" /> {t('sync_registry')}
                        </button>
                    </div>
                </div>

                {isAdminOrManager && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><BriefcaseIcon className="h-3 w-3" /> {t('project_filter')}</label>
                            <Select isClearable options={projectOptions} value={selectedProject} onChange={setSelectedProject} placeholder={t('select_registry_id')} styles={customSelectStyles} />
                        </div>
                        <div className="space-y-1 bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><UserCircleIcon className="h-3 w-3" /> {t('personnel_filter')}</label>
                            <Select isClearable options={userOptions} value={selectedUser} onChange={setSelectedUser} placeholder={t('select_technician')} styles={customSelectStyles} />
                        </div>
                    </div>
                )}
            </section>

            {/* Content Area */}
            {isLoading && timeLogs.length === 0 ? (
                <div className="py-20"><LoadingSpinner text={t('syncing_operational_history')} size="lg" /></div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 text-red-600 rounded-[2.5rem] font-bold border border-red-100">{error}</div>
            ) : timeLogs.length > 0 ? (
                <div className="space-y-4">
                    {timeLogs.map(log => (
                        <div key={log.id} className="group relative bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                            <div className="p-6 flex flex-wrap lg:flex-nowrap items-center gap-6">
                                
                                {/* Technician & Identity */}
                                <div className="flex items-center gap-4 min-w-[240px]">
                                    <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center border border-gray-100 dark:border-gray-600 overflow-hidden shrink-0 shadow-inner">
                                        {log.user?.profile_picture_url ? (
                                            <img src={log.user.profile_picture_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <UserCircleIcon className="h-8 w-8 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">
                                            {log.user?.full_name || log.user?.email || `Technician #${log.user_id}`}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <ShieldCheckIcon className="h-3.5 w-3.5 text-indigo-500" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {log.user?.role?.replace('_', ' ') || 'Personnel'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Deployment Targets */}
                                <div className="flex-1 min-w-[200px] border-l border-gray-50 dark:border-gray-700 pl-6">
                                    {log.project_id && (
                                        <Link to={`/projects/${log.project_id}`} className="inline-flex items-center gap-2 group/link">
                                            <BriefcaseIcon className="h-4 w-4 text-gray-400 group-hover/link:text-indigo-500" />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover/link:text-indigo-600 transition-colors uppercase tracking-tight">
                                                {log.project?.name || `Registry #${log.project_id}`}
                                            </span>
                                        </Link>
                                    )}
                                    {log.task_id && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <PencilSquareIcon className="h-3 w-3 text-gray-300" />
                                            <span className="text-[10px] font-medium text-gray-500 truncate max-w-[200px]">
                                                Task: {log.task?.title || `Task ${log.task_id}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Temporal Telemetry */}
                                <div className="min-w-[220px] lg:text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('activity_window')}</p>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {new Date(log.start_time).toLocaleDateString()} · {new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <span className="mx-2 text-gray-300">→</span>
                                        {log.end_time ? new Date(log.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-500 animate-pulse uppercase">Active Now</span>}
                                    </p>
                                </div>

                                {/* Duration Badge */}
                                <div className="lg:min-w-[120px] text-right">
                                    <div className={`inline-flex items-center h-12 px-5 rounded-2xl font-black text-sm shadow-sm ${
                                        log.end_time 
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' 
                                        : 'bg-green-50 text-green-600 border border-green-100 animate-pulse'
                                    }`}>
                                        {formatDuration(log.duration_hours)}
                                    </div>
                                </div>
                            </div>

                            {/* Activity Notes Section */}
                            {log.notes && (
                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-50 dark:border-gray-700 flex gap-3 items-start">
                                    <DocumentTextIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                        "{log.notes}"
                                    </p>
                                </div>
                            )}

                            {/* Admin only: Edit clocked hours / reassign project */}
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(log)}
                                        className="p-2 bg-indigo-600 text-white rounded-xl transition transform hover:scale-110 active:scale-95"
                                        title={t('edit', { defaultValue: 'Edit' })}
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <ClockIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('registry_empty')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('no_time_logs_match', { defaultValue: 'No time logs match your active filters.' })}</p>
                </div>
            )}

            {/* Admin: Edit timelog modal */}
            <Modal
                isOpen={!!logToEdit}
                onClose={() => setLogToEdit(null)}
                title={t('edit_timelog', { defaultValue: 'Edit time entry' })}
                showFooter={false}
            >
                {logToEdit && (
                    <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('project_filter')}</label>
                            <select
                                value={editFormData.project_id}
                                onChange={(e) => setEditFormData((p) => ({ ...p, project_id: e.target.value }))}
                                className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 text-sm font-bold"
                            >
                                <option value="">—</option>
                                {projectOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('start')}</label>
                                <input
                                    type="datetime-local"
                                    value={editFormData.start_datetime}
                                    onChange={(e) => setEditFormData((p) => ({ ...p, start_datetime: e.target.value }))}
                                    className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('end')}</label>
                                <input
                                    type="datetime-local"
                                    value={editFormData.end_datetime}
                                    onChange={(e) => setEditFormData((p) => ({ ...p, end_datetime: e.target.value }))}
                                    className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('details')}</label>
                            <textarea
                                value={editFormData.notes}
                                onChange={(e) => setEditFormData((p) => ({ ...p, notes: e.target.value }))}
                                rows={2}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-2 text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setLogToEdit(null)} className="h-10 px-4 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700">
                                {t('cancel')}
                            </button>
                            <button type="submit" disabled={isSavingEdit} className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                {isSavingEdit ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
                                {t('save')}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

export default TimeLogsPage;