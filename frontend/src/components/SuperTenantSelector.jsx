import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { extractTenantList } from '../utils/tenantUtils';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * SuperTenantSelector
 *
 * Small reusable selector shown only for superadmins to pick a tenant context
 * before loading tenant-scoped registries (projects, tasks, cars, tools, etc.).
 */
function SuperTenantSelector({ selectedTenantId, onChange, className = '' }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isSuperuser = user?.is_superuser;

    const [tenants, setTenants] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const loadTenants = useCallback(async () => {
        if (!isSuperuser) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await axiosInstance.get('/tenants/', { params: { limit: 200 } });
            setTenants(extractTenantList(res?.data));
        } catch (err) {
            console.error('Tenant scope sync failed:', err);
            const msg = err.response?.data?.detail || t('tenant_sync_failed', { defaultValue: 'Failed to load tenant registry.' });
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperuser, t]);

    useEffect(() => {
        if (isSuperuser) {
            loadTenants();
        }
    }, [isSuperuser, loadTenants]);

    if (!isSuperuser) return null;

    if (isLoading && tenants.length === 0) {
        return (
            <div className={className}>
                <LoadingSpinner text={t('syncing_tenants', { defaultValue: 'Syncing tenant registry…' })} size="sm" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px] font-bold rounded-2xl px-4 py-2 ${className}`}>
                {error}
            </div>
        );
    }

    if (!tenants.length) {
        return (
            <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 ${className}`}>
                <span className="font-black uppercase tracking-[0.2em]">{t('tenant_scope', { defaultValue: 'Tenant Scope' })}</span>
                <span className="italic">{t('no_tenant_nodes', { defaultValue: 'No tenants registered.' })}</span>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-2 flex items-center justify-between gap-3 ${className}`}>
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    {t('tenant_scope', { defaultValue: 'Tenant Scope' })}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                    {t('select_tenant_to_view', { defaultValue: 'Select a tenant to view registry data.' })}
                </span>
            </div>
            <select
                value={selectedTenantId || ''}
                onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value, 10) : null;
                    onChange?.(value);
                }}
                className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
                <option value="">{t('all_tenants_placeholder', { defaultValue: 'Select tenant…' })}</option>
                {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                        {tenant.name} (#{tenant.id})
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SuperTenantSelector;

