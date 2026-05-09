import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    ShieldExclamationIcon,
    PlusIcon,
    TrashIcon,
    TagIcon,
} from '@heroicons/react/24/outline';

function RiskLibraryPage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [defaultLikelihood, setDefaultLikelihood] = useState('Medium');
    const [defaultImpact, setDefaultImpact] = useState('Medium');
    const [defaultMitigation, setDefaultMitigation] = useState('');
    const [defaultStatus, setDefaultStatus] = useState('Open');
    const [categoryIs, setCategoryIs] = useState('');
    const [titleIs, setTitleIs] = useState('');
    const [descriptionIs, setDescriptionIs] = useState('');
    const [mitigationIs, setMitigationIs] = useState('');

    const isSuperuser = user?.is_superuser;
    const isAdmin = user?.role === 'admin' || isSuperuser;
    const isManager = user?.role === 'project manager' || isSuperuser;
    const canManageLibrary = isAdmin || isManager;

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/risk-assessments/templates', {
                params: { lang: i18n.language },
            });
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Risk template fetch failed:', error);
            toast.error(t('risk_library_load_failed', { defaultValue: 'Failed to load risk library.' }));
        } finally {
            setIsLoading(false);
        }
    }, [i18n.language, t]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.warn('Enter a title for the risk template.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                category: category || null,
                category_is: categoryIs.trim() || null,
                title: title.trim(),
                title_en: title.trim(),
                title_is: titleIs.trim() || null,
                description: description || null,
                description_en: description || null,
                description_is: descriptionIs.trim() || null,
                default_likelihood: defaultLikelihood,
                default_impact: defaultImpact,
                default_mitigation: defaultMitigation || null,
                default_mitigation_en: defaultMitigation || null,
                default_mitigation_is: mitigationIs.trim() || null,
                default_status: defaultStatus,
                is_active: true,
            };
            const res = await axiosInstance.post('/risk-assessments/templates', payload);
            setTemplates((prev) => [...prev, res.data]);

            setCategory('');
            setCategoryIs('');
            setTitle('');
            setTitleIs('');
            setDescription('');
            setDescriptionIs('');
            setDefaultLikelihood('Medium');
            setDefaultImpact('Medium');
            setDefaultMitigation('');
            setMitigationIs('');
            setDefaultStatus('Open');
        } catch (error) {
            console.error('Create template failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to create risk template.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Delete this risk template from the library?')) return;
        try {
            await axiosInstance.delete(`/risk-assessments/templates/${templateId}`);
            setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        } catch (error) {
            console.error('Delete template failed:', error);
            toast.error('Failed to delete risk template.');
        }
    };

    if (!canManageLibrary) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-5xl">
                <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('risk_library_access_denied')}
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner text={t('loading_risk_library')} size="lg" />;
    }

    const groupedByCategory = templates.reduce((acc, tmpl) => {
        const key = tmpl.category || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(tmpl);
        return acc;
    }, {});

    const categoryKeys = Object.keys(groupedByCategory).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            <header className="mb-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-600 rounded-2xl shadow-lg">
                        <ShieldExclamationIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-1">
                            {t('standard_risk_library')}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            {t('reusable_risk_templates')}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            {t('risk_library_desc')}
                        </p>
                    </div>
                </div>
            </header>

            <section className="mb-10 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <PlusIcon className="h-4 w-4 text-amber-500 stroke-[3px]" />
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                        {t('add_library_entry')}
                    </h2>
                </div>
                <form
                    onSubmit={handleCreateTemplate}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start"
                >
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('category')}
                        </label>
                        <div className="relative">
                            <TagIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="modern-input h-11 pl-9 text-sm font-bold"
                                placeholder={t('category_placeholder', { defaultValue: 'Example: Electrical, Working at Heights, Confined Spaces…' })}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('risk_title')}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="modern-input h-11 text-sm font-bold"
                            placeholder={t('risk_title_placeholder', { defaultValue: 'Example: Live work on energized panels' })}
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
                            placeholder={t('description_placeholder', { defaultValue: 'General description of the hazard as it appears across projects.' })}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('default_likelihood')}
                        </label>
                        <select
                            value={defaultLikelihood}
                            onChange={(e) => setDefaultLikelihood(e.target.value)}
                            className="modern-input h-11 text-sm font-bold"
                        >
                            <option value="Low">{t('low')}</option>
                            <option value="Medium">{t('medium')}</option>
                            <option value="High">{t('high')}</option>
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('default_impact')}
                        </label>
                        <select
                            value={defaultImpact}
                            onChange={(e) => setDefaultImpact(e.target.value)}
                            className="modern-input h-11 text-sm font-bold"
                        >
                            <option value="Low">{t('low')}</option>
                            <option value="Medium">{t('medium')}</option>
                            <option value="High">{t('high')}</option>
                        </select>
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('default_mitigation_optional')}
                        </label>
                        <textarea
                            value={defaultMitigation}
                            onChange={(e) => setDefaultMitigation(e.target.value)}
                            rows={3}
                            className="modern-input text-sm font-medium resize-none"
                            placeholder={t('mitigation_placeholder', { defaultValue: 'Typical controls: lock-out/tag-out, permits, PPE, supervision…' })}
                        />
                    </div>
                    <div className="md:col-span-2 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/40 space-y-4">
                        <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-[0.25em]">
                            Icelandic (optional) — same template in both languages
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Flokkur (IS)</label>
                                <input
                                    type="text"
                                    value={categoryIs}
                                    onChange={(e) => setCategoryIs(e.target.value)}
                                    className="modern-input h-11 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Titill (IS)</label>
                                <input
                                    type="text"
                                    value={titleIs}
                                    onChange={(e) => setTitleIs(e.target.value)}
                                    className="modern-input h-11 text-sm font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Lýsing (IS)</label>
                            <textarea
                                value={descriptionIs}
                                onChange={(e) => setDescriptionIs(e.target.value)}
                                rows={2}
                                className="modern-input text-sm font-medium resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Aðgerðir / úrbætur (IS)</label>
                            <textarea
                                value={mitigationIs}
                                onChange={(e) => setMitigationIs(e.target.value)}
                                rows={2}
                                className="modern-input text-sm font-medium resize-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">
                            {t('default_status')}
                        </label>
                        <select
                            value={defaultStatus}
                            onChange={(e) => setDefaultStatus(e.target.value)}
                            className="modern-input h-11 text-sm font-bold"
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
                            className="h-11 px-8 bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg shadow-amber-100 hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">{t('saving')}</span>
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4 stroke-[3px]" />
                                    {t('add_template')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.25em]">
                        {t('library_contents', { defaultValue: 'Library Contents' })}
                    </h2>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                        {templates.length} {t('templates_count', { defaultValue: 'template(s)' })}
                    </span>
                </div>

                {templates.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        {t('no_risk_templates_yet', { defaultValue: 'No risk templates defined yet. Use the form above to create your first standard risks.' })}
                    </p>
                ) : (
                    <div className="space-y-8">
                        {categoryKeys.map((cat) => (
                            <div key={cat} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <TagIcon className="h-4 w-4 text-gray-400" />
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                                        {cat}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    {groupedByCategory[cat].map((tmpl) => (
                                        <div
                                            key={tmpl.id}
                                            className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                                        >
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">
                                                    Template #{tmpl.id}
                                                </p>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
                                                    {tmpl.title}
                                                </h4>
                                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                                    {t('likelihood')}:{' '}
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {tmpl.default_likelihood === 'Low' ? t('low') : tmpl.default_likelihood === 'High' ? t('high') : t('medium')}
                                                    </span>{' '}
                                                    · {t('impact')}:{' '}
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {tmpl.default_impact === 'Low' ? t('low') : tmpl.default_impact === 'High' ? t('high') : t('medium')}
                                                    </span>{' '}
                                                    · {t('status', { defaultValue: 'Status' })}:{' '}
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        {tmpl.default_status === 'Closed' ? t('closed') : tmpl.default_status === 'Monitoring' ? t('monitoring') : t('open')}
                                                    </span>
                                                </p>
                                                {tmpl.description && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                                        <span className="font-semibold">{t('description_label')}:</span>{' '}
                                                        {tmpl.description}
                                                    </p>
                                                )}
                                                {tmpl.default_mitigation && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                                        <span className="font-semibold">{t('mitigation_label')}:</span>{' '}
                                                        {tmpl.default_mitigation}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                                className="self-start md:self-center inline-flex items-center px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition gap-1"
                                            >
                                                <TrashIcon className="h-4 w-4" /> {t('delete', { defaultValue: 'Delete' })}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default RiskLibraryPage;

