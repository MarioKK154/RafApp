import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { ServerStackIcon, ArrowPathIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

function IntegrationsSettings({ canManage }) {
    const [integrations, setIntegrations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state for current edit
    const [activeProvider, setActiveProvider] = useState('PROCORE');
    const [formData, setFormData] = useState({
        provider: 'PROCORE',
        api_key: '',
        base_url: '',
        is_active: false
    });

    const PROVIDERS = ['PROCORE', 'ACC', 'AJOUR'];

    const fetchIntegrations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/integrations');
            setIntegrations(res.data);
            
            // Populate form if matching integration exists
            const existing = res.data.find(i => i.provider === activeProvider);
            if (existing) {
                setFormData({
                    provider: existing.provider,
                    api_key: existing.api_key || '',
                    base_url: existing.base_url || '',
                    is_active: existing.is_active
                });
            } else {
                setFormData({
                    provider: activeProvider,
                    api_key: '',
                    base_url: '',
                    is_active: false
                });
            }
        } catch (error) {
            console.error('Failed to fetch integrations:', error);
            toast.error('Failed to load integration settings.');
        } finally {
            setIsLoading(false);
        }
    }, [activeProvider]);

    useEffect(() => {
        if (canManage) {
            fetchIntegrations();
        }
    }, [canManage, fetchIntegrations]);

    const handleProviderChange = (provider) => {
        setActiveProvider(provider);
        const existing = integrations.find(i => i.provider === provider);
        if (existing) {
            setFormData({
                provider: existing.provider,
                api_key: existing.api_key || '',
                base_url: existing.base_url || '',
                is_active: existing.is_active
            });
        } else {
            setFormData({
                provider: provider,
                api_key: '',
                base_url: '',
                is_active: false
            });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axiosInstance.post('/integrations', formData);
            toast.success(`${formData.provider} integration settings saved.`);
            fetchIntegrations();
        } catch (error) {
            console.error('Failed to save integration:', error);
            toast.error(error.response?.data?.detail || 'Failed to save integration settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!canManage) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-8">
            <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                <ServerStackIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">GC Software Integrations</h2>
            </div>
            
            <div className="p-8">
                <p className="text-[11px] text-gray-500 mb-6 font-medium">Configure credentials to enable outbound data push to third-party General Contractor software.</p>
                
                <div className="flex gap-2 mb-8 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl">
                    {PROVIDERS.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => handleProviderChange(p)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors ${
                                activeProvider === p 
                                ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-700' 
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">API Key / Token</label>
                        <input
                            type="password"
                            value={formData.api_key}
                            onChange={(e) => setFormData(prev => ({...prev, api_key: e.target.value}))}
                            className="modern-input"
                            placeholder="Enter Provider API Key..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Base URL (Optional)</label>
                        <input
                            type="text"
                            value={formData.base_url}
                            onChange={(e) => setFormData(prev => ({...prev, base_url: e.target.value}))}
                            className="modern-input"
                            placeholder="e.g., https://api.procore.com"
                        />
                    </div>
                    <div className="flex items-center gap-3 ml-1">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({...prev, is_active: e.target.checked}))}
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="isActive" className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest cursor-pointer">
                            Enable {activeProvider} Integration
                        </label>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={isSaving || isLoading}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                        >
                            {isSaving ? (
                                <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><CheckBadgeIcon className="h-4 w-4" /> Save Configuration</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default IntegrationsSettings;
