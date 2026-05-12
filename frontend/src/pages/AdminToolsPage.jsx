import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ShieldExclamationIcon, 
    TrashIcon, 
    UserMinusIcon, 
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    DocumentMagnifyingGlassIcon,
    EnvelopeIcon,
    FingerPrintIcon,
    GlobeAltIcon,
    ChartBarSquareIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

const CONFIRMATION_PHRASE = "PERFORM CLEAN SLATE";

function AdminToolsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [mainAdminEmail, setMainAdminEmail] = useState('');
    const [confirmationInput, setConfirmationInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [resultSummary, setResultSummary] = useState(null);

    const [heatmap, setHeatmap] = useState(null);
    const [growth, setGrowth] = useState(null);
    const [systemLoad, setSystemLoad] = useState(null);
    const [billingOverdue, setBillingOverdue] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [impersonationLogs, setImpersonationLogs] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [tenantHealth, setTenantHealth] = useState([]);
    const [activeBanner, setActiveBanner] = useState(null);
    const [bannerMessage, setBannerMessage] = useState('');
    const [landingFeed, setLandingFeed] = useState({
        news: [],
        updates: [],
        tools: [],
        interesting: [],
        background_image_urls: [],
        background_slide_seconds: 8,
    });
    const [landingVisibility, setLandingVisibility] = useState({
        show_news: true,
        show_updates: true,
        show_tools: true,
        show_interesting: true,
    });
    const [draggedItem, setDraggedItem] = useState(null);
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
    const [isSeedingDemo, setIsSeedingDemo] = useState(false);
    const [isUploadingLandingBg, setIsUploadingLandingBg] = useState(false);

    const isSuperuser = currentUser && currentUser.is_superuser;

    const toLocalInputValue = (value) => {
        if (!value) return '';
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };

    const hydrateFeedItems = (items) =>
        (Array.isArray(items) ? items : []).map((item) => ({
            ...item,
            source: item?.source || '',
            image_url: item?.image_url || '',
            link_url: item?.link_url || '',
            link_label: item?.link_label || '',
            is_pinned: !!item?.is_pinned,
            starts_at: toLocalInputValue(item?.starts_at),
            ends_at: toLocalInputValue(item?.ends_at),
        }));

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Global root authentication required.");
                navigate('/login', { replace: true });
            } else if (!isSuperuser) {
                toast.error("Access Denied: Insufficient privilege level.");
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!isSuperuser) return;
            setIsLoadingMetrics(true);
            try {
                const [heatmapRes, growthRes, loadRes, billingRes, statusRes, logsRes, auditRes, healthRes, bannerRes, landingFeedRes] = await Promise.all([
                    axiosInstance.get('/admin/super/tenant-heatmap'),
                    axiosInstance.get('/admin/super/growth-metrics'),
                    axiosInstance.get('/admin/super/system-load'),
                    axiosInstance.get('/admin/super/billing/overdue-tenants'),
                    axiosInstance.get('/system/status'),
                    axiosInstance.get('/admin/impersonation/logs', { params: { limit: 100 } }),
                    axiosInstance.get('/admin/audit-logs', { params: { limit: 200 } }),
                    axiosInstance.get('/admin/super/tenant-health'),
                    axiosInstance.get('/system/banner'),
                    axiosInstance.get('/system/landing-feed'),
                ]);
                setHeatmap(heatmapRes.data);
                setGrowth(growthRes.data);
                setSystemLoad(loadRes.data);
                setBillingOverdue(Array.isArray(billingRes.data) ? billingRes.data : []);
                setSystemStatus(statusRes.data);
                setMaintenanceMessage(statusRes.data?.message || '');
                setImpersonationLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
                setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : []);
                setTenantHealth(Array.isArray(healthRes.data) ? healthRes.data : []);
                setActiveBanner(bannerRes.data || null);
                const lf = landingFeedRes.data || {};
                setLandingFeed({
                    news: hydrateFeedItems(lf.news),
                    updates: hydrateFeedItems(lf.updates),
                    tools: hydrateFeedItems(lf.tools),
                    interesting: hydrateFeedItems(Array.isArray(lf.interesting) ? lf.interesting : lf.random),
                    background_image_urls: Array.isArray(lf.background_image_urls) ? lf.background_image_urls : [],
                    background_slide_seconds:
                        typeof lf.background_slide_seconds === 'number' && !Number.isNaN(lf.background_slide_seconds)
                            ? lf.background_slide_seconds
                            : Math.min(600, Math.max(3, parseInt(lf.background_slide_seconds, 10) || 8)),
                });
                setLandingVisibility({
                    show_news: lf.show_news !== false,
                    show_updates: lf.show_updates !== false,
                    show_tools: lf.show_tools !== false,
                    show_interesting: lf.show_interesting !== false,
                });
            } catch (err) {
                console.error('Admin metrics fetch failed:', err);
                toast.error('Failed to load platform metrics.');
            } finally {
                setIsLoadingMetrics(false);
            }
        };
        if (!authIsLoading && isSuperuser) {
            fetchMetrics();
        }
    }, [authIsLoading, isSuperuser]);

    const handleCreateBanner = async (e) => {
        e.preventDefault();
        if (!bannerMessage.trim()) return;
        try {
            await axiosInstance.post('/admin/banner', { message: bannerMessage.trim() });
            toast.success('Global banner created. All users will see it.');
            setBannerMessage('');
            const res = await axiosInstance.get('/system/banner');
            setActiveBanner(res.data || null);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create banner.');
        }
    };

    const handleSaveLandingFeed = async () => {
        try {
            const normalizeItems = (items) =>
                (items || []).map((item) => ({
                    ...item,
                    starts_at: item.starts_at ? item.starts_at : null,
                    ends_at: item.ends_at ? item.ends_at : null,
                    source: item.source || null,
                    image_url: item.image_url || null,
                    link_url: item.link_url || null,
                    link_label: item.link_label || null,
                    is_pinned: !!item.is_pinned,
                }));
            const bgUrls = (landingFeed.background_image_urls || [])
                .map((u) => (typeof u === 'string' ? u.trim() : ''))
                .filter(Boolean);
            const slideRaw = Number(landingFeed.background_slide_seconds);
            const slideSec = Number.isFinite(slideRaw) ? Math.min(600, Math.max(3, slideRaw)) : 8;
            const payload = {
                news: normalizeItems(landingFeed.news),
                updates: normalizeItems(landingFeed.updates),
                tools: normalizeItems(landingFeed.tools),
                interesting: normalizeItems(landingFeed.interesting),
                show_news: landingVisibility.show_news !== false,
                show_updates: landingVisibility.show_updates !== false,
                show_tools: landingVisibility.show_tools !== false,
                show_interesting: landingVisibility.show_interesting !== false,
                background_image_urls: bgUrls,
                background_slide_seconds: slideSec,
            };
            const res = await axiosInstance.post('/system/landing-feed', payload);
            const lf = res.data || payload;
            setLandingFeed({
                news: hydrateFeedItems(lf.news),
                updates: hydrateFeedItems(lf.updates),
                tools: hydrateFeedItems(lf.tools),
                interesting: hydrateFeedItems(lf.interesting),
                background_image_urls: Array.isArray(lf.background_image_urls) ? lf.background_image_urls : [],
                background_slide_seconds:
                    typeof lf.background_slide_seconds === 'number' && !Number.isNaN(lf.background_slide_seconds)
                        ? lf.background_slide_seconds
                        : Math.min(600, Math.max(3, parseInt(lf.background_slide_seconds, 10) || 8)),
            });
            setLandingVisibility({
                show_news: lf.show_news !== false,
                show_updates: lf.show_updates !== false,
                show_tools: lf.show_tools !== false,
                show_interesting: lf.show_interesting !== false,
            });
            toast.success('Landing page feed updated.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update landing feed.');
        }
    };

    const upsertFeedItem = (section, index, key, value) => {
        setLandingFeed(prev => {
            const next = { ...prev };
            const arr = [...(next[section] || [])];
            const row = { ...(arr[index] || { title: '', text: '', link_url: '', link_label: '', image_url: '' }) };
            row[key] = value;
            arr[index] = row;
            next[section] = arr;
            return next;
        });
    };

    const addFeedItem = (section) => {
        setLandingFeed(prev => ({
            ...prev,
            [section]: [
                ...(prev[section] || []),
                { title: '', text: '', link_url: '', link_label: '', image_url: '', source: '', is_pinned: false, starts_at: '', ends_at: '' },
            ],
        }));
    };

    const addTemplateItem = (section, kind) => {
        const templates = {
            release: {
                title: 'Release Note',
                text: 'Briefly summarize what changed and why it matters.',
                link_label: 'Read update',
            },
            tool: {
                title: 'Tool Spotlight',
                text: 'New electrical tool added to field workflow and recommended usage.',
                link_label: 'Tool details',
                source: 'Manufacturer',
            },
            tip: {
                title: 'Tip of the Week',
                text: 'Practical field tip for faster and safer installation work.',
                link_label: 'Read tip',
            },
        };
        const tpl = templates[kind] || templates.release;
        setLandingFeed((prev) => ({
            ...prev,
            [section]: [
                ...(prev[section] || []),
                {
                    title: tpl.title,
                    text: tpl.text,
                    link_url: '',
                    link_label: tpl.link_label || '',
                    image_url: '',
                    source: tpl.source || '',
                    is_pinned: false,
                    starts_at: '',
                    ends_at: '',
                },
            ],
        }));
    };

    const removeFeedItem = (section, index) => {
        setLandingFeed(prev => ({
            ...prev,
            [section]: (prev[section] || []).filter((_, i) => i !== index),
        }));
    };

    const moveFeedItem = (section, fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        setLandingFeed(prev => {
            const arr = [...(prev[section] || [])];
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) return prev;
            const [item] = arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, item);
            return { ...prev, [section]: arr };
        });
    };

    const onFeedDragStart = (section, index) => {
        setDraggedItem({ section, index });
    };

    const onFeedDrop = (section, index) => {
        if (!draggedItem || draggedItem.section !== section) return;
        moveFeedItem(section, draggedItem.index, index);
        setDraggedItem(null);
    };

    const addLandingBackgroundUrl = () => {
        setLandingFeed((prev) => ({
            ...prev,
            background_image_urls: [...(prev.background_image_urls || []), ''],
        }));
    };

    const updateLandingBackgroundUrl = (index, value) => {
        setLandingFeed((prev) => {
            const arr = [...(prev.background_image_urls || [])];
            arr[index] = value;
            return { ...prev, background_image_urls: arr };
        });
    };

    const removeLandingBackgroundUrl = (index) => {
        setLandingFeed((prev) => ({
            ...prev,
            background_image_urls: (prev.background_image_urls || []).filter((_, i) => i !== index),
        }));
    };

    const handleLandingBackgroundUpload = async (e) => {
        const file = e.target.files?.[0];
        if (e.target) e.target.value = '';
        if (!file) return;
        setIsUploadingLandingBg(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axiosInstance.post('/system/landing-background', fd);
            const url = res.data?.url;
            if (!url) throw new Error('No URL returned');
            setLandingFeed((prev) => ({
                ...prev,
                background_image_urls: [...(prev.background_image_urls || []), url],
            }));
            toast.success('Image uploaded. Click Save landing feed to publish.');
        } catch (err) {
            toast.error(err.response?.data?.detail || err.message || 'Upload failed.');
        } finally {
            setIsUploadingLandingBg(false);
        }
    };

    const landingPreviewSections = [
        { key: 'news', label: 'News', visibleKey: 'show_news' },
        { key: 'updates', label: 'Updates', visibleKey: 'show_updates' },
        { key: 'tools', label: 'Electrical tools', visibleKey: 'show_tools' },
        { key: 'interesting', label: 'Interesting stuff', visibleKey: 'show_interesting' },
    ];

    const handleDismissBanner = async () => {
        if (!activeBanner?.id) return;
        try {
            await axiosInstance.post(`/admin/banner/${activeBanner.id}/dismiss`);
            setActiveBanner(null);
            toast.success('Banner dismissed.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to dismiss banner.');
        }
    };

    const handleMaintenanceToggle = async (nextMaintenance) => {
        try {
            const payload = { maintenance: nextMaintenance, message: maintenanceMessage || null };
            const res = await axiosInstance.post('/system/maintenance', payload);
            setSystemStatus(res.data);
            toast.success(nextMaintenance ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
        } catch (err) {
            console.error('Failed to update maintenance mode:', err);
            toast.error('Failed to update maintenance mode.');
        }
    };

    const handleSeedDemoTenant = async () => {
        if (!isSuperuser || isSeedingDemo) return;
        setIsSeedingDemo(true);
        try {
            const res = await axiosInstance.post('/admin/super/seed-demo-tenant');
            const pw = res?.data?.default_password || '12345678';
            toast.success(`Demo tenant seeded (id=2). Default demo password: ${pw}`);
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to seed demo tenant.');
        } finally {
            setIsSeedingDemo(false);
        }
    };

    const handleCleanSlateSubmit = async (event) => {
        event.preventDefault();
        if (!isSuperuser) return;

        if (confirmationInput !== CONFIRMATION_PHRASE) {
            setError(`Security mismatch. Type "${CONFIRMATION_PHRASE}" to proceed.`);
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');
        setResultSummary(null);

        try {
            const response = await axiosInstance.post('/admin/perform-clean-slate', {
                main_admin_email: mainAdminEmail.trim()
            });
            
            setSuccessMessage(response.data.message);
            setResultSummary(response.data.summary);
            toast.success("System scrubbed successfully.");
            
            setMainAdminEmail('');
            setConfirmationInput('');
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Scrub operation failed.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Verifying system credentials..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-8">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <ShieldExclamationIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('admin_tools', { defaultValue: 'Administrator Tools' })}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('admin_tools_desc', { defaultValue: 'Elevated system maintenance and lifecycle management.' })}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Danger Zone Form */}
                <div className="lg:col-span-7">
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-3xl shadow-xl shadow-red-100 dark:shadow-none border-2 border-red-200 dark:border-red-900/50">
                        <div className="flex items-center gap-2 mb-6 text-red-600 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-6 w-6" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Perform Clean Slate</h2>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-8 space-y-3">
                            <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest">Destructive Action Warning</p>
                            <ul className="space-y-2">
                                <WarningItem text="Deactivates all user accounts except the specified admin." />
                                <WarningItem text="Reassigns all project ownership to the surviving admin." />
                                <WarningItem text="Clears active Project Manager assignments." />
                                <WarningItem text="Unassigns all tasks from deactivated users." />
                            </ul>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                                <ShieldExclamationIcon className="h-5 w-5" /> {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-2xl text-sm font-bold flex items-center gap-2">
                                <CheckBadgeIcon className="h-5 w-5" /> {successMessage}
                            </div>
                        )}
                        <form onSubmit={handleCleanSlateSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Admin Account to Preserve</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={mainAdminEmail}
                                        onChange={(e) => setMainAdminEmail(e.target.value)}
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-red-500 h-12"
                                        placeholder="admin@rafapp.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                                    Type <span className="text-red-500">"{CONFIRMATION_PHRASE}"</span>
                                </label>
                                <div className="relative">
                                    <FingerPrintIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={confirmationInput}
                                        onChange={(e) => setConfirmationInput(e.target.value)}
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-red-500 h-12 font-mono text-sm"
                                        placeholder="REQUIRED PHRASE"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || confirmationInput !== CONFIRMATION_PHRASE || !mainAdminEmail}
                                className="w-full flex justify-center items-center h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {isSubmitting ? <LoadingSpinner text="Executing Scrub..." size="sm" /> : (
                                    <>
                                        <TrashIcon className="h-6 w-6 mr-2" />
                                        Initialize Clean Slate
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Status & Results Sidebar + Metrics */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Success Report */}
                    {resultSummary ? (
                        <div className="bg-green-600 text-white p-6 md:p-8 rounded-3xl shadow-xl animate-in zoom-in duration-300">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckBadgeIcon className="h-8 w-8" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Operation Report</h3>
                            </div>
                            <div className="space-y-4">
                                <StatRow label="Users Deactivated" value={resultSummary.users_deactivated} />
                                <StatRow label="Projects Reassigned" value={resultSummary.projects_reassigned} />
                                <StatRow label="PM Assignments Cleared" value={resultSummary.projects_pm_cleared} />
                                <StatRow label="Tasks Unassigned" value={resultSummary.tasks_unassigned} />
                            </div>
                            <div className="mt-8 pt-6 border-t border-green-500 flex items-center gap-2 text-xs font-bold text-green-100">
                                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                                <span>Registry integrity verified.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center min-h-[300px]">
                            <ArrowPathIcon className="h-12 w-12 text-gray-700 mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Waiting for Input</p>
                            <p className="text-xs text-gray-500 mt-2">Results will appear here after the scrub is initialized.</p>
                        </div>
                    )}

                    {/* Platform Metrics */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-2 mb-3">
                                <GlobeAltIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Tenant Heatmap
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-500">Loading...</p>}
                            {!isLoadingMetrics && heatmap && heatmap.items && heatmap.items.length > 0 && (
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {heatmap.items
                                        .slice()
                                        .sort((a, b) => b.hours_last_30d - a.hours_last_30d)
                                        .map(item => (
                                            <div key={item.tenant_id} className="flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-gray-100">{item.tenant_name}</p>
                                                    <p className="text-[10px] text-gray-500">
                                                        {item.active_projects} projects · {item.total_users} users
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                                                        {item.hours_last_30d.toFixed(1)} h
                                                    </span>
                                                    <div className="w-20 h-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-600 dark:bg-indigo-400"
                                                            style={{
                                                                width: `${Math.min(100, (item.hours_last_30d / (heatmap.items[0].hours_last_30d || 1)) * 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                            {!isLoadingMetrics && (!heatmap || !heatmap.items || heatmap.items.length === 0) && (
                                <p className="text-xs text-gray-500 italic">
                                    No tenant activity data available yet.
                                </p>
                            )}
                        </div>

                        <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                                <ChartBarSquareIcon className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Platform Growth
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-500">Loading...</p>}
                            {!isLoadingMetrics && growth && (
                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-200">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Tenants</p>
                                        <p className="text-xl font-black">{growth.total_tenants}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Companies</p>
                                        <p className="text-xl font-black">{growth.total_projects}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Users</p>
                                        <p className="text-xl font-black">{growth.total_users}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">New projects today</p>
                                        <p className="text-xl font-black">{growth.new_projects_today}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Total hours logged (all time)
                                        </p>
                                        <p className="text-sm font-bold">
                                            {growth.total_hours_all_time.toFixed(1)} h
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            Last 30 days: {growth.total_hours_last_30d.toFixed(1)} h
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Billing / Overdue Tenants
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-600 dark:text-gray-300">Loading...</p>}
                            {!isLoadingMetrics && billingOverdue && billingOverdue.length > 0 && (
                                <div className="space-y-2 text-xs text-gray-800 dark:text-gray-100 max-h-40 overflow-y-auto pr-1">
                                    {billingOverdue.map(t => (
                                        <div key={t.tenant_id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold">{t.tenant_name}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-300">
                                                    {t.overdue_count} invoice(s)
                                                </p>
                                            </div>
                                            <span className="text-[11px] font-black text-red-600 dark:text-red-400">
                                                {t.overdue_total.toFixed(0)} ISK
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingMetrics && (!billingOverdue || billingOverdue.length === 0) && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                                    No overdue invoices registered.
                                </p>
                            )}
                        </div>

                        <div className="p-5 bg-gray-900 text-white rounded-3xl border border-gray-800">
                            <div className="flex items-center gap-2 mb-3">
                                <BoltIcon className="h-5 w-5 text-yellow-400" />
                                <h3 className="text-xs font-black uppercase tracking-[0.25em]">System Load</h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-300">Loading...</p>}
                            {!isLoadingMetrics && systemLoad && (
                                <div className="space-y-2 text-xs">
                                    <p>
                                        DB status:{' '}
                                        <span className={systemLoad.db_ok ? 'text-emerald-400' : 'text-red-400'}>
                                            {systemLoad.db_ok ? 'OK' : 'ERROR'}
                                        </span>
                                    </p>
                                    <p>DB latency: {systemLoad.db_latency_ms.toFixed(2)} ms</p>
                                    <p>Tenants: {systemLoad.total_tenants}</p>
                                    <p>Users: {systemLoad.total_users}</p>
                                    <p>Projects: {systemLoad.total_projects}</p>
                                </div>
                            )}
                            {!isLoadingMetrics && !systemLoad && (
                                <p className="text-xs text-gray-300 italic">
                                    System load snapshot unavailable.
                                </p>
                            )}
                        </div>

                        <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-3xl border border-yellow-200 dark:border-yellow-700">
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldExclamationIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Maintenance Mode
                                </h3>
                            </div>
                            {systemStatus && (
                                <div className="space-y-3 text-xs text-gray-800 dark:text-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold uppercase tracking-wider">Status</span>
                                        <span className={systemStatus.maintenance ? 'text-red-600' : 'text-emerald-600'}>
                                            {systemStatus.maintenance ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="maintenance-toggle"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                            checked={!!systemStatus.maintenance}
                                            onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                                        />
                                        <label htmlFor="maintenance-toggle" className="text-[11px]">
                                            Put all non-root users into maintenance splash screen
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                            Public message
                                        </label>
                                        <textarea
                                            rows={2}
                                            className="w-full rounded-2xl border border-yellow-200 dark:border-yellow-700 bg-white/70 dark:bg-gray-900/40 px-3 py-2 text-xs text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                            value={maintenanceMessage}
                                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                                            placeholder="Scheduled upgrade window, expected downtime, etc."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleMaintenanceToggle(!!systemStatus.maintenance)}
                                            className="mt-1 inline-flex items-center px-3 py-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white text-[11px] font-black uppercase tracking-[0.2em]"
                                        >
                                            Update Message
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!systemStatus && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                                    Maintenance status unavailable.
                                </p>
                            )}
                        </div>

                        {isSuperuser && (
                            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <BoltIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                                    <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                        Demo Tenant Seeder
                                    </h3>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-200 mb-3">
                                    One click will reset and seed tenant <span className="font-black">ID 2</span> with demo users,
                                    projects, tasks, cars, tools, and customers for presentations.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSeedDemoTenant}
                                    disabled={isSeedingDemo}
                                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-[0.2em] disabled:opacity-60"
                                >
                                    {isSeedingDemo ? 'Seeding...' : 'Seed Demo Tenant'}
                                </button>
                            </div>
                        )}

                        <div className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <UserMinusIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Impersonation audit trail
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-500">Loading...</p>}
                            {!isLoadingMetrics && impersonationLogs.length > 0 && (
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-[10px]">
                                    {impersonationLogs.map(log => (
                                        <div key={log.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                            <span className="font-mono text-slate-500">#{log.id}</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{log.superuser_email}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="font-bold">{log.target_user_name || log.target_user_email}</span>
                                            <span className="text-slate-400">
                                                {new Date(log.started_at).toLocaleString()}
                                                {log.ended_at ? ` – ${new Date(log.ended_at).toLocaleString()}` : ' (active)'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingMetrics && (!impersonationLogs || impersonationLogs.length === 0) && (
                                <p className="text-xs text-gray-500 italic">No impersonation sessions recorded.</p>
                            )}
                        </div>

                        <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-200 dark:border-indigo-700">
                            <div className="flex items-center gap-2 mb-3">
                                <DocumentMagnifyingGlassIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Global audit logs
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-500">Loading...</p>}
                            {!isLoadingMetrics && auditLogs.length > 0 && (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[10px]">
                                    {auditLogs.slice(0, 50).map(log => (
                                        <div key={log.id} className="flex flex-wrap gap-x-2 gap-y-0.5 py-1 border-b border-indigo-100 dark:border-indigo-800 last:border-0">
                                            <span className="font-mono text-indigo-600 dark:text-indigo-400">{log.action_type}</span>
                                            <span className="text-gray-700 dark:text-gray-200">{log.actor_email || '—'}</span>
                                            <span className="text-gray-500 truncate max-w-[180px]" title={log.details}>{log.details || log.target_ref}</span>
                                            <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingMetrics && (!auditLogs || auditLogs.length === 0) && (
                                <p className="text-xs text-gray-500 italic">No audit entries yet.</p>
                            )}
                        </div>

                        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-200 dark:border-emerald-700">
                            <div className="flex items-center gap-2 mb-3">
                                <EnvelopeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Global banner
                                </h3>
                            </div>
                            <form onSubmit={handleCreateBanner} className="space-y-2 mb-3">
                                <textarea
                                    value={bannerMessage}
                                    onChange={e => setBannerMessage(e.target.value)}
                                    placeholder="e.g. New Roadmap Feature: Personnel Certifications are now live!"
                                    rows={2}
                                    className="w-full rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-100"
                                />
                                <button type="submit" className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider">
                                    Push to all users
                                </button>
                            </form>
                            {activeBanner && (
                                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-700">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Current active</p>
                                    <p className="text-xs text-gray-800 dark:text-gray-100 mb-2">{activeBanner.message}</p>
                                    <button type="button" onClick={handleDismissBanner} className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wider">
                                        Dismiss banner
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-5 bg-sky-50 dark:bg-sky-900/20 rounded-3xl border border-sky-200 dark:border-sky-700">
                            <div className="flex items-center gap-2 mb-3">
                                <GlobeAltIcon className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Landing page feed
                                </h3>
                            </div>
                            <p className="text-[10px] text-gray-600 dark:text-gray-300 mb-3">
                                Add card entries for home page sections. Links are optional.
                            </p>
                            <div className="mb-4 rounded-2xl border border-sky-200 dark:border-sky-700 p-3 bg-white/80 dark:bg-gray-800/60">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-200 mb-2">
                                    Background photos
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                                    Upload a static image file (stored on this server) or paste image URLs. With multiple backgrounds, the public landing page crossfades between them on a timer.
                                </p>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <input
                                        id="landing-bg-upload-input"
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                        className="sr-only"
                                        disabled={isUploadingLandingBg}
                                        onChange={handleLandingBackgroundUpload}
                                    />
                                    <label
                                        htmlFor="landing-bg-upload-input"
                                        className={`inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white ${
                                            isUploadingLandingBg ? 'bg-sky-400' : 'bg-sky-600 hover:bg-sky-700'
                                        }`}
                                    >
                                        {isUploadingLandingBg ? 'Uploading…' : 'Upload static image'}
                                    </label>
                                    <span className="text-[9px] text-gray-500 dark:text-gray-400">PNG, JPG, WebP · max 10MB</span>
                                </div>
                                {(landingFeed.background_image_urls || []).map((url, idx) => (
                                    <div key={`landing-bg-${idx}`} className="flex gap-2 mb-2">
                                        <input
                                            value={url}
                                            onChange={(e) => updateLandingBackgroundUrl(idx, e.target.value)}
                                            placeholder="https://… or /static/…"
                                            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeLandingBackgroundUrl(idx)}
                                            className="shrink-0 px-2 py-1 rounded-lg border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addLandingBackgroundUrl}
                                    className="mb-3 px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest"
                                >
                                    Add background URL
                                </button>
                                <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    Seconds between slides (3–600)
                                    <input
                                        type="number"
                                        min={3}
                                        max={600}
                                        value={landingFeed.background_slide_seconds ?? 8}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            setLandingFeed((prev) => ({
                                                ...prev,
                                                background_slide_seconds: Number.isFinite(v) ? Math.min(600, Math.max(3, v)) : 8,
                                            }));
                                        }}
                                        className="max-w-[120px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs font-bold normal-case"
                                    />
                                </label>
                            </div>
                            {[
                                { key: 'news', label: 'News', visibleKey: 'show_news' },
                                { key: 'updates', label: 'Updates', visibleKey: 'show_updates' },
                                { key: 'tools', label: 'Electrical tools', visibleKey: 'show_tools' },
                                { key: 'interesting', label: 'Interesting stuff', visibleKey: 'show_interesting' },
                            ].map((section) => (
                                <div key={section.key} className="mb-4 rounded-2xl border border-sky-200 dark:border-sky-700 p-3 bg-white/80 dark:bg-gray-800/60">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-200">
                                                {section.label}
                                            </h4>
                                            <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                <input
                                                    type="checkbox"
                                                    checked={landingVisibility[section.visibleKey] !== false}
                                                    onChange={(e) =>
                                                        setLandingVisibility((prev) => ({ ...prev, [section.visibleKey]: e.target.checked }))
                                                    }
                                                />
                                                Published
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addFeedItem(section.key)}
                                            className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Add item
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => addTemplateItem(section.key, 'release')}
                                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest"
                                        >
                                            + Release template
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addTemplateItem(section.key, 'tool')}
                                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest"
                                        >
                                            + Tool template
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addTemplateItem(section.key, 'tip')}
                                            className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-widest"
                                        >
                                            + Tip template
                                        </button>
                                    </div>
                                    {(landingFeed[section.key] || []).length === 0 && (
                                        <p className="text-[10px] text-gray-500 italic">No items yet.</p>
                                    )}
                                    {(landingFeed[section.key] || []).map((item, idx) => (
                                        <div
                                            key={`${section.key}-${idx}`}
                                            draggable
                                            onDragStart={() => onFeedDragStart(section.key, idx)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => onFeedDrop(section.key, idx)}
                                            className="mb-2 p-2 rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-gray-800 cursor-move"
                                        >
                                            <div className="grid grid-cols-1 gap-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                    Drag to reorder
                                                </p>
                                                <input
                                                    value={item.title || ''}
                                                    onChange={(e) => upsertFeedItem(section.key, idx, 'title', e.target.value)}
                                                    placeholder="Title"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                />
                                                <textarea
                                                    value={item.text || ''}
                                                    onChange={(e) => upsertFeedItem(section.key, idx, 'text', e.target.value)}
                                                    placeholder="Description"
                                                    rows={2}
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                />
                                                <input
                                                    value={item.link_url || ''}
                                                    onChange={(e) => upsertFeedItem(section.key, idx, 'link_url', e.target.value)}
                                                    placeholder="Link URL (optional)"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                />
                                                <input
                                                    value={item.image_url || ''}
                                                    onChange={(e) => upsertFeedItem(section.key, idx, 'image_url', e.target.value)}
                                                    placeholder="Image URL (optional thumbnail)"
                                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <input
                                                        value={item.source || ''}
                                                        onChange={(e) => upsertFeedItem(section.key, idx, 'source', e.target.value)}
                                                        placeholder="Source tag (e.g. Manufacturer, YouTube, Article)"
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                    />
                                                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!item.is_pinned}
                                                            onChange={(e) => upsertFeedItem(section.key, idx, 'is_pinned', e.target.checked)}
                                                        />
                                                        Pinned
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <input
                                                        type="datetime-local"
                                                        value={item.starts_at || ''}
                                                        onChange={(e) => upsertFeedItem(section.key, idx, 'starts_at', e.target.value)}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                    />
                                                    <input
                                                        type="datetime-local"
                                                        value={item.ends_at || ''}
                                                        onChange={(e) => upsertFeedItem(section.key, idx, 'ends_at', e.target.value)}
                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                    />
                                                </div>
                                                {item.image_url && (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.title || 'preview'}
                                                        className="w-full h-24 object-cover rounded-lg border border-gray-100 dark:border-gray-700"
                                                    />
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={item.link_label || ''}
                                                        onChange={(e) => upsertFeedItem(section.key, idx, 'link_label', e.target.value)}
                                                        placeholder="Link label (optional)"
                                                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeedItem(section.key, idx)}
                                                        className="px-2 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleSaveLandingFeed}
                                className="mt-3 w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold uppercase tracking-wider"
                            >
                                Save landing feed
                            </button>

                            <div className="mt-5 pt-4 border-t border-sky-200 dark:border-sky-700">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-200 mb-3">
                                    Live preview
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {landingPreviewSections
                                        .filter((s) => landingVisibility[s.visibleKey] !== false)
                                        .map((section) => (
                                            <div
                                                key={`preview-${section.key}`}
                                                className="rounded-xl border border-sky-100 dark:border-sky-800 bg-white dark:bg-gray-800 p-3"
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                                    {section.label}
                                                </p>
                                                {(landingFeed[section.key] || []).length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic">No items.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {(landingFeed[section.key] || [])
                                                            .slice()
                                                            .sort((a, b) => Number(!!b.is_pinned) - Number(!!a.is_pinned))
                                                            .slice(0, 3)
                                                            .map((item, idx) => (
                                                                <div key={`preview-item-${section.key}-${idx}`} className="text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-gray-900 dark:text-gray-100">
                                                                            {item.title || 'Untitled'}
                                                                        </p>
                                                                        {item.is_pinned && (
                                                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                                                                Pinned
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-gray-600 dark:text-gray-300">
                                                                        {item.text || 'No description'}
                                                                    </p>
                                                                    {item.link_url && (
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-1">
                                                                            {item.link_label || 'Open Link'}
                                                                        </p>
                                                                    )}
                                                                    {item.source && (
                                                                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">
                                                                            Source: {item.source}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-200 dark:border-red-700">
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-300" />
                                <h3 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-[0.25em]">
                                    Tenant health & churn risk
                                </h3>
                            </div>
                            {isLoadingMetrics && <p className="text-xs text-gray-600">Loading...</p>}
                            {!isLoadingMetrics && tenantHealth.filter(t => t.churn_risk !== 'none').length > 0 && (
                                <div className="space-y-2 text-xs max-h-52 overflow-y-auto pr-1">
                                    {tenantHealth.filter(t => t.churn_risk !== 'none').map(t => (
                                        <div
                                            key={t.tenant_id}
                                            className={`flex items-center justify-between py-2 px-3 rounded-xl ${
                                                t.churn_risk === 'high' ? 'bg-red-200/50 dark:bg-red-900/30 border border-red-300 dark:border-red-700' : 'bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">{t.tenant_name}</p>
                                                <p className="text-[10px] text-gray-600 dark:text-gray-300">
                                                    Last login: {t.last_login_at ? new Date(t.last_login_at).toLocaleDateString() : 'Never'} · This week: {t.hours_this_week}h · Avg prev 4w: {t.hours_avg_previous_4_weeks}h
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${t.churn_risk === 'high' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'}`}>
                                                {t.churn_risk === 'high' ? 'High risk' : 'Medium'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!isLoadingMetrics && (!tenantHealth.length || tenantHealth.every(t => t.churn_risk === 'none')) && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">No tenants flagged for churn risk.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Reusable warning line
 */
function WarningItem({ text }) {
    return (
        <li className="flex items-start gap-2 text-xs font-medium text-red-800 dark:text-red-300">
            <UserMinusIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{text}</span>
        </li>
    );
}

/**
 * Reusable summary statistics row
 */
function StatRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-green-500/50">
            <span className="text-xs font-bold uppercase tracking-wider text-green-100">{label}</span>
            <span className="text-2xl font-black">{value}</span>
        </div>
    );
}

export default AdminToolsPage;