import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

/**
 * PushToGCButton — Export entity to Google Calendar / external GC system.
 * Currently shows a "Coming Soon" notice. Replace the onClick body when
 * the GC integration endpoint is ready.
 */
function PushToGCButton({ entityType, entityId, buttonLabel }) {
    const { t } = useTranslation();
    const [isBusy, setIsBusy] = useState(false);

    const label = buttonLabel || t('export_to_gc', { defaultValue: 'Export to GC' });

    const handlePush = async () => {
        setIsBusy(true);
        try {
            // TODO: replace with real GC integration call when endpoint is ready
            // await axiosInstance.post(`/integrations/gc/${entityType}/${entityId}`);
            toast.info(
                t('gc_coming_soon', {
                    defaultValue: 'Google Calendar export is coming soon. This integration is under development.',
                }),
                { autoClose: 4000 }
            );
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handlePush}
            disabled={isBusy}
            title={`${label} (${entityType} #${entityId})`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            {label}
        </button>
    );
}

export default PushToGCButton;
