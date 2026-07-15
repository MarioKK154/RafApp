// frontend/src/components/CreateOfferFromCatalogModal.jsx
// F2: Creates an Offer from selected Labor Catalog items.
// Workflow: show selected items → user enters verðlag (ISK/eining) → auto-calculate total → pick project → submit.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import {
    XMarkIcon,
    BanknotesIcon,
    FolderIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    TagIcon,
    CalculatorIcon,
} from '@heroicons/react/24/outline';

const formatISK = (v) =>
    new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(v || 0);

const formatEining = (v) => {
    if (v == null) return '—';
    return Number(v).toFixed(2) + ' ein.';
};

/**
 * Props:
 *  selectedItems: LaborCatalogItem[] — items already selected on the list page
 *  onClose: () => void
 *  onCreated: (offerId: number) => void
 */
export default function CreateOfferFromCatalogModal({ selectedItems = [], onClose, onCreated }) {
    const { t } = useTranslation();

    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [verdlag, setVerdlag] = useState('');          // ISK per eining
    const [title, setTitle] = useState('Work Offer');
    const [clientName, setClientName] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(true);

    const hasSelectedItems = selectedItems && selectedItems.length > 0;

    // Derived: total einingar + total ISK
    const totalEining = hasSelectedItems ? selectedItems.reduce((s, i) => s + (i.reference_price || 0), 0) : 0;
    const verdlagNum = parseFloat(verdlag) || 0;
    const totalISK = totalEining * verdlagNum;

    useEffect(() => {
        setProjectsLoading(true);
        axiosInstance.get('/projects/')
            .then(r => {
                setProjects(r.data || []);
                if (r.data?.length === 1) setProjectId(String(r.data[0].id));
            })
            .catch(() => toast.error('Failed to load projects'))
            .finally(() => setProjectsLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectId) { toast.error('Please select a project'); return; }
        if (projectId === 'CREATE_NEW' && !newProjectName.trim()) {
            toast.error('Please enter a name for the new project.');
            return;
        }
        if (hasSelectedItems && (!verdlagNum || verdlagNum <= 0)) { toast.error('Enter a valid ISK/eining rate'); return; }

        setLoading(true);
        try {
            let activeProjectId;
            if (projectId === 'CREATE_NEW') {
                const projRes = await axiosInstance.post('/projects/', { name: newProjectName.trim() });
                activeProjectId = projRes.data.id;
            } else {
                activeProjectId = parseInt(projectId);
            }

            if (hasSelectedItems) {
                const payload = {
                    project_id: activeProjectId,
                    title,
                    client_name: clientName || null,
                    expiry_date: expiryDate || null,
                    verdlag_per_eining: verdlagNum,
                    catalog_item_ids: selectedItems.map(i => i.id),
                };
                const res = await axiosInstance.post('/offers/from-catalog', payload);
                toast.success(`Offer ${res.data.offer_number} created!`);
                onCreated(res.data.id);
            } else {
                const payload = {
                    project_id: activeProjectId,
                    title,
                    client_name: clientName || null,
                    expiry_date: expiryDate || null,
                    verdlag_per_eining: null,
                };
                const res = await axiosInstance.post('/offers/', payload);
                toast.success(`Offer ${res.data.offer_number} created!`);
                onCreated(res.data.id);
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create offer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="flex items-center gap-3">
                        <CalculatorIcon className="h-7 w-7 text-white" />
                        <div>
                            <h2 className="text-lg font-black text-white text-left">
                                {hasSelectedItems ? "Create Offer from Catalog" : "Create New Offer"}
                            </h2>
                            <p className="text-indigo-200 text-xs text-left">
                                {hasSelectedItems ? `${selectedItems.length} items · ${formatEining(totalEining)} total` : "Create a blank proposal for a project"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-left">

                        {/* Selected items summary */}
                        {hasSelectedItems && (
                            <div>
                                <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Selected Work Items</h3>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Service</th>
                                                <th className="px-4 py-3 text-right">Eining</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {selectedItems.map(item => {
                                                const eining = item.reference_price || 0;
                                                return (
                                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <TagIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                                                <span className="text-gray-800 dark:text-gray-200 text-xs leading-tight">
                                                                    {item.description}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                                            {formatEining(eining)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-indigo-50 dark:bg-indigo-900/20 font-black">
                                            <tr>
                                                <td className="px-4 py-3 text-indigo-700 dark:text-indigo-300 text-xs">TOTAL</td>
                                                <td className="px-4 py-3 text-right text-indigo-700 dark:text-indigo-300 font-mono text-xs">
                                                    {formatEining(totalEining)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Verðlag (ISK per eining) */}
                        {hasSelectedItems && (
                            <div>
                                <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Verðlag (ISK/eining)</h3>
                                <div className="relative">
                                    <BanknotesIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        min="1"
                                        step="100"
                                        required
                                        placeholder="e.g. 6500"
                                        value={verdlag}
                                        onChange={e => setVerdlag(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Your company's ISK rate per Eining.
                                </p>
                            </div>
                        )}

                        {/* Offer details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Project *</label>
                                {projectsLoading ? (
                                    <div className="h-11 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                                ) : (
                                    <>
                                        <select
                                            value={projectId}
                                            onChange={e => setProjectId(e.target.value)}
                                            required
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                        >
                                            <option value="">— Select project —</option>
                                            <option value="CREATE_NEW" className="text-indigo-600 font-bold dark:text-indigo-400">+ Create a New Project...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.project_number ? `[${p.project_number}] ` : ''}{p.name}
                                                </option>
                                            ))}
                                        </select>
                                        {projectId === 'CREATE_NEW' && (
                                            <div className="mt-3 space-y-1 animate-in fade-in duration-200">
                                                <label className="block text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1">New Project Name *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Renovation Project"
                                                    value={newProjectName}
                                                    onChange={e => setNewProjectName(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Offer Title</label>
                                <div className="relative">
                                    <FolderIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Client Name</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={e => setExpiryDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !projectId || (hasSelectedItems && !verdlagNum)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {loading ? (
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <ArrowRightIcon className="h-4 w-4" />
                            )}
                            {hasSelectedItems ? `Create Offer · ${formatEining(totalEining)}` : 'Create Offer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
