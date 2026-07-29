import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    LinkIcon,
    CalendarDaysIcon,
    ArrowDownTrayIcon,
    BoltIcon,
    DocumentTextIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

const integrations = [
    {
        key: 'google_calendar',
        icon: CalendarDaysIcon,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        status: 'coming_soon',
        descKey: 'int_google_calendar_desc',
        descDefault: 'Sync project milestones and scheduled work to Google Calendar automatically.',
    },
    {
        key: 'outlook',
        icon: CalendarDaysIcon,
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        status: 'coming_soon',
        descKey: 'int_outlook_desc',
        descDefault: 'Connect Microsoft Outlook / Teams for meeting and task synchronisation.',
    },
    {
        key: 'bokun',
        icon: BoltIcon,
        color: 'text-yellow-500',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        status: 'coming_soon',
        descKey: 'int_bokun_desc',
        descDefault: 'Import job bookings from Bókun travel & activity management platform.',
    },
    {
        key: 'rafis',
        icon: DocumentTextIcon,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        status: 'coming_soon',
        descKey: 'int_rafis_desc',
        descDefault: 'Sync labor catalog rates and certification data from Rafís (rafis.is).',
    },
    {
        key: 'accounting_export',
        icon: ArrowDownTrayIcon,
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        status: 'coming_soon',
        descKey: 'int_accounting_desc',
        descDefault: 'Export invoices and labor costs to Álver, Centigo, or custom CSV for accounting.',
    },
    {
        key: 'webhooks',
        icon: BoltIcon,
        color: 'text-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        status: 'coming_soon',
        descKey: 'int_webhooks_desc',
        descDefault: 'Send real-time event payloads to any HTTP endpoint when offers, tasks, or invoices change.',
    },
];

function IntegrationsSettings({ canManage }) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <LinkIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    {t('integrations', { defaultValue: 'Integrations' })}
                </h2>
            </div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-8">
                {t('integrations_subtitle', { defaultValue: 'Connect external services and data sources' })}
            </p>

            {/* Coming Soon Notice */}
            <div className="mb-8 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-2xl">
                <ClockIcon className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        {t('integrations_coming_soon_title', { defaultValue: 'Integrations Under Development' })}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium mt-0.5 leading-relaxed">
                        {t('integrations_coming_soon_desc', { defaultValue: 'These integrations are on the roadmap and will be rolled out in upcoming releases. Contact your account manager to request early access or prioritisation.' })}
                    </p>
                </div>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {integrations.map(({ key, icon: Icon, color, bg, descKey, descDefault }) => (
                    <div
                        key={key}
                        className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors group"
                    >
                        <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {t(`int_${key}_name`, { defaultValue: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })}
                                </p>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                    {t('coming_soon', { defaultValue: 'Soon' })}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                {t(descKey, { defaultValue: descDefault })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {!canManage && (
                <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                    {t('admin_only_setting', { defaultValue: 'Admin or Project Manager access required to configure integrations.' })}
                </p>
            )}
        </div>
    );
}

export default IntegrationsSettings;
