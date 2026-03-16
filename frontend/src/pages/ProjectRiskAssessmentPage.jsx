import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    ShieldExclamationIcon,
    ChevronLeftIcon,
    PlusIcon,
    TrashIcon,
    DocumentTextIcon,
    TagIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

function ProjectRiskAssessmentPage() {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [riskItems, setRiskItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [likelihood, setLikelihood] = useState('Medium');
    const [impact, setImpact] = useState('Medium');
    const [mitigation, setMitigation] = useState('');
    const [status, setStatus] = useState('Open');

    const [libraryTemplates, setLibraryTemplates] = useState([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
    const [isApplyingTemplates, setIsApplyingTemplates] = useState(false);

    const canEdit =
        user &&
        (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const [projectRes, risksRes] = await Promise.all([
                axiosInstance.get(`/projects/${projectId}`),
                axiosInstance.get(`/risk-assessments/project/${projectId}`),
            ]);
            setProject(projectRes.data);
            setRiskItems(Array.isArray(risksRes.data) ? risksRes.data : []);
        } catch (error) {
            console.error('Risk assessment fetch failed:', error);
            toast.error('Failed to load project risk assessment.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    const fetchLibrary = useCallback(async () => {
        setIsLoadingLibrary(true);
        try {
            const res = await axiosInstance.get('/risk-assessments/templates');
            setLibraryTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Risk library fetch failed:', error);
            toast.error('Failed to load risk library templates.');
        } finally {
            setIsLoadingLibrary(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchLibrary();
    }, [fetchData, fetchLibrary]);

    const handleCreateRisk = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.warn('Enter a risk title.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                project_id: parseInt(projectId, 10),
                title: title.trim(),
                description: description || null,
                likelihood,
                impact,
                mitigation: mitigation || null,
                status,
            };
            const res = await axiosInstance.post('/risk-assessments/', payload);
            setRiskItems((prev) => [...prev, res.data]);

            setTitle('');
            setDescription('');
            setLikelihood('Medium');
            setImpact('Medium');
            setMitigation('');
            setStatus('Open');
        } catch (error) {
            console.error('Create risk failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to create risk item.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRisk = async (riskId) => {
        if (!window.confirm('Remove this risk entry from the register?')) return;
        try {
            await axiosInstance.delete(`/risk-assessments/${riskId}`);
            setRiskItems((prev) => prev.filter((r) => r.id !== riskId));
        } catch (error) {
            console.error('Delete risk failed:', error);
            toast.error('Failed to delete risk item.');
        }
    };

    const toggleTemplateSelection = (templateId) => {
        setSelectedTemplateIds((prev) =>
            prev.includes(templateId)
                ? prev.filter((id) => id !== templateId)
                : [...prev, templateId],
        );
    };

    const handleApplyTemplates = async () => {
        if (!selectedTemplateIds.length) {
            toast.warn('Select at least one template to apply.');
            return;
        }
        setIsApplyingTemplates(true);
        try {
            const res = await axiosInstance.post(
                `/risk-assessments/project/${projectId}/from-templates`,
                selectedTemplateIds,
            );
            if (Array.isArray(res.data)) {
                setRiskItems((prev) => [...prev, ...res.data]);
            }
            setSelectedTemplateIds([]);
            toast.success('Risk templates applied to project.');
        } catch (error) {
            console.error('Apply templates failed:', error);
            toast.error('Failed to apply templates to project.');
        } finally {
            setIsApplyingTemplates(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            const response = await axiosInstance.get(
                `/risk-assessments/project/${projectId}/pdf`,
                { responseType: 'blob' },
            );
            const url = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `project-${projectId}-risk-assessment.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Risk assessment export failed:', error);
            toast.error('Failed to export risk assessment to PDF.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading risk assessment..." size="lg" />;
    }

    if (!project) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-5xl">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-4 inline-flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.2em]"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back
                </button>
                <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Project node not found or not accessible.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            <header className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                    <Link
                        to={`/projects/${projectId}`}
                        className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition uppercase tracking-[0.2em]"
                    >
                        <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> Back to Project
                    </Link>
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-sm hover:bg-black transition gap-2"
                    >
                        <DocumentTextIcon className="h-4 w-4" /> Export PDF
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-2xl shadow-lg">
                        <ShieldExclamationIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-amber-600 uppercase tracking-[0.25em] mb-1">
                            Project Risk Register
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            {project.name}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Capture and track operational risks for this deployment, including mitigation
                            strategies.
                        </p>
                    </div>
                </div>
            </header>

            {canEdit && (
                <section className="mb-10 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <PlusIcon className="h-4 w-4 text-amber-500 stroke-[3px]" />
                        <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                            Add Risk Entry
                        </h2>
                    </div>
                    <form
                        onSubmit={handleCreateRisk}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start"
                    >
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('risk_title')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="modern-input h-12 text-sm font-bold"
                                placeholder={t('risk_title_placeholder')}
                            />
                        </div>
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('description_optional')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="modern-input text-sm font-medium resize-none"
                                placeholder={t('hazard_placeholder')}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('likelihood')}
                            </label>
                            <select
                                value={likelihood}
                                onChange={(e) => setLikelihood(e.target.value)}
                                className="modern-input h-12 text-sm font-bold"
                            >
                                <option value="Low">{t('low')}</option>
                                <option value="Medium">{t('medium')}</option>
                                <option value="High">{t('high')}</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('impact')}
                            </label>
                            <select
                                value={impact}
                                onChange={(e) => setImpact(e.target.value)}
                                className="modern-input h-12 text-sm font-bold"
                            >
                                <option value="Low">{t('low')}</option>
                                <option value="Medium">{t('medium')}</option>
                                <option value="High">{t('high')}</option>
                            </select>
                        </div>
                        <div className="space-y-3 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('mitigation_plan_optional')}
                            </label>
                            <textarea
                                value={mitigation}
                                onChange={(e) => setMitigation(e.target.value)}
                                rows={3}
                                className="modern-input text-sm font-medium resize-none"
                                placeholder={t('controls_placeholder')}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                                {t('status', { defaultValue: 'Status' })}
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="modern-input h-12 text-sm font-bold"
                            >
                                <option value="Open">{t('open')}</option>
                                <option value="Monitoring">{t('monitoring')}</option>
                                <option value="Closed">{t('closed')}</option>
                            </select>
                        </div>
                        <div className="flex md:justify-end md:items-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-12 px-8 bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">{t('saving')}</span>
                                ) : (
                                    <>
                                        <PlusIcon className="h-4 w-4 stroke-[3px]" />
                                        {t('add_risk')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {canEdit && (
                <section className="mb-10 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TagIcon className="h-4 w-4 text-amber-500" />
                            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                                {t('add_from_risk_library')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={fetchLibrary}
                            className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 hover:text-indigo-600"
                        >
                            {t('refresh')}
                        </button>
                    </div>
                    {isLoadingLibrary ? (
                        <LoadingSpinner text={t('loading_templates')} size="sm" />
                    ) : libraryTemplates.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                            No templates in the central library yet. Define them under the Risk Library page.
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 max-h-72 overflow-y-auto pr-1">
                                {libraryTemplates.map((tmpl) => {
                                    const checked = selectedTemplateIds.includes(tmpl.id);
                                    return (
                                        <button
                                            type="button"
                                            key={tmpl.id}
                                            onClick={() => toggleTemplateSelection(tmpl.id)}
                                            className={`text-left p-4 rounded-2xl border text-xs ${
                                                checked
                                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                                                    : 'border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/40'
                                            } transition`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                                                    {tmpl.category || t('general')}
                                                </span>
                                                {checked && (
                                                    <CheckCircleIcon className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                            <p className="font-black text-gray-900 dark:text-white mb-1">
                                                {tmpl.title}
                                            </p>
                                            <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-1">
                                                L: {tmpl.default_likelihood} · I: {tmpl.default_impact}
                                            </p>
                                            {tmpl.description && (
                                                <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                                                    {tmpl.description}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                onClick={handleApplyTemplates}
                                disabled={isApplyingTemplates}
                                className="inline-flex items-center px-6 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                {isApplyingTemplates ? (
                                    <span className="animate-pulse">Applying...</span>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                                        Apply Selected to Project
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </section>
            )}

            <section className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.25em]">
                        Registered Risks
                    </h2>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                        {riskItems.length} item(s)
                    </span>
                </div>
                {riskItems.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        No risk entries have been registered for this project yet. Use the form above to
                        create the first one.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {riskItems.map((item) => (
                            <div
                                key={item.id}
                                className="p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                                            Risk #{item.id}
                                        </span>
                                        <span
                                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                                                item.status === 'Closed'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                                    : item.status === 'Monitoring'
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                                            }`}
                                        >
                                            {item.status === 'Closed' ? t('closed') : item.status === 'Monitoring' ? t('monitoring') : t('open')}
                                        </span>
                                    </div>
                                    <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                                        {t('likelihood')}:{' '}
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {item.likelihood === 'Low' ? t('low') : item.likelihood === 'High' ? t('high') : t('medium')}
                                        </span>{' '}
                                        · {t('impact')}:{' '}
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {item.impact === 'Low' ? t('low') : item.impact === 'High' ? t('high') : t('medium')}
                                        </span>
                                    </p>
                                    {item.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                            <span className="font-semibold">Description:</span>{' '}
                                            {item.description}
                                        </p>
                                    )}
                                    {item.mitigation && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-semibold">{t('mitigation_label')}:</span>{' '}
                                            {item.mitigation}
                                        </p>
                                    )}
                                </div>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRisk(item.id)}
                                        className="self-start md:self-center inline-flex items-center px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition gap-1"
                                    >
                                        <TrashIcon className="h-4 w-4" /> Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default ProjectRiskAssessmentPage;

