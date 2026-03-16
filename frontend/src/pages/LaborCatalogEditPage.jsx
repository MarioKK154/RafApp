import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    WrenchScrewdriverIcon, 
    BanknotesIcon, 
    TagIcon, 
    ChevronLeftIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    FingerPrintIcon,
    InformationCircleIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';

/** ar.is Eining: value = units per hour → time per unit (e.g. 0.26 → 3.8 hr per unit) */
function einingLabel(u) {
    if (u === 0) return 'Hourly rate';
    if (u == null || !Number.isFinite(u) || u < 0) return '';
    const minPerUnit = 60 / u;
    if (minPerUnit >= 60) return `${(minPerUnit / 60).toFixed(2)} hr per unit`;
    return `${minPerUnit.toFixed(1)} min per unit`;
}

function LaborCatalogEditPage() {
    const { t } = useTranslation();
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperuser = user?.is_superuser;
    
    const [formData, setFormData] = useState({ 
        description: '', 
        base_price: '',       // catalog default (reference_price / default_unit_price)
        your_price: '',       // tenant override (tenant_price); used in offers
        main_category: '',
        sub_category: '',
        units_per_hour: '',
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [conditionVariants, setConditionVariants] = useState([]);

    /**
     * Fetches the specific catalog item details from the registry.
     */
    const fetchItem = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`/labor-catalog/${itemId}`);
            const base = response.data.reference_price ?? response.data.default_unit_price ?? '';
            const your = response.data.tenant_price ?? response.data.reference_price ?? response.data.default_unit_price ?? '';
            setFormData({
                description: response.data.description || '',
                base_price: base !== '' && base != null ? String(base) : '',
                your_price: your !== '' && your != null ? String(your) : '',
                main_category: response.data.main_category || '',
                sub_category: response.data.sub_category || '',
                units_per_hour: response.data.units_per_hour ?? '',
            });
        } catch (err) {
            console.error("Fetch Item Error:", err);
            toast.error('Failed to retrieve catalog entry.');
            navigate('/labor-catalog');
        } finally {
            setIsLoading(false);
        }
    }, [itemId, navigate]);

    const fetchConditionVariants = useCallback(async () => {
        if (!itemId) return;
        try {
            const res = await axiosInstance.get(`/labor-catalog/${itemId}/conditions`);
            setConditionVariants(Array.isArray(res.data) ? res.data : []);
        } catch (_) {
            setConditionVariants([]);
        }
    }, [itemId]);

    useEffect(() => { 
        fetchItem(); 
    }, [fetchItem]);

    useEffect(() => {
        if (itemId && !isLoading) fetchConditionVariants();
    }, [itemId, isLoading, fetchConditionVariants]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const priceToSave = isSuperuser
            ? (formData.base_price !== '' ? parseFloat(formData.base_price) : null)
            : (formData.your_price !== '' ? parseFloat(formData.your_price) : null);
        if (priceToSave == null || isNaN(priceToSave) || priceToSave < 0) {
            toast.warn(isSuperuser ? "Base price is required." : "Your price is required.");
            return;
        }
        if (isSuperuser && !formData.description) {
            toast.warn("Description is required.");
            return;
        }

        setIsSaving(true);
        try {
            const unitsPerHour = formData.units_per_hour === '' || formData.units_per_hour == null
                ? null
                : Number(formData.units_per_hour);
            const payload = isSuperuser
                ? { default_unit_price: priceToSave, units_per_hour: unitsPerHour, description: formData.description, main_category: formData.main_category || null, sub_category: formData.sub_category || null }
                : { default_unit_price: priceToSave };
            await axiosInstance.put(`/labor-catalog/${itemId}`, payload);
            toast.success('Saved.');
            navigate('/labor-catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update catalog item.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner text="Synchronizing with catalog registry..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Navigation Header */}
            <div className="mb-8">
                <Link 
                    to="/labor-catalog" 
                    className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest"
                >
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Back to Registry
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                                {t('edit_service_details', { defaultValue: 'Edit Service Details' })}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                <FingerPrintIcon className="h-3 w-3" />
                                Entry ID: {itemId}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Form Card */}
            
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                {/* Catalog description: read-only for tenants (from ar.is), editable for superadmin */}
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                        {isSuperuser ? 'Service Category Description*' : 'Catalog item (from ar.is)'}
                    </label>
                    {isSuperuser ? (
                        <div className="relative">
                            <TagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="text" 
                                name="description" 
                                required 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder="e.g., Master Electrician Rate"
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                            />
                        </div>
                    ) : (
                        <div className="pl-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                            <p className="font-bold text-gray-900 dark:text-white">{formData.description}</p>
                            {(formData.main_category || formData.sub_category) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {[formData.main_category, formData.sub_category].filter(Boolean).join(' → ')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Base price (catalog): superadmin can edit; tenants see read-only. Your price: tenant override for offers. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                            Base price (ISK){isSuperuser ? '*' : ''}
                        </label>
                        <div className="relative">
                            <BanknotesIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="number" 
                                name="base_price" 
                                required={isSuperuser}
                                value={formData.base_price} 
                                onChange={handleChange} 
                                min="0" 
                                step="1" 
                                readOnly={!isSuperuser}
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500 disabled:opacity-70" 
                            />
                        </div>
                        {!isSuperuser && (
                            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Catalog reference. Only your company&apos;s price below is used in offers.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                            Your price (ISK){!isSuperuser ? '*' : ''}
                        </label>
                        <div className="relative">
                            <BanknotesIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="number" 
                                name="your_price" 
                                required={!isSuperuser}
                                value={formData.your_price} 
                                onChange={handleChange} 
                                min="0" 
                                step="1" 
                                className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500" 
                            />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Your company&apos;s price for this item. Used in offers; does not change the catalog base.</p>
                    </div>
                </div>

                {/* ar.is Eining: display only */}
                {formData.units_per_hour !== '' && formData.units_per_hour != null && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        ar.is Eining: {Number(formData.units_per_hour)} units/hr → {einingLabel(Number(formData.units_per_hour))}
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isSuperuser && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                                Units per hour (Eining)
                            </label>
                            <input
                                type="number"
                                name="units_per_hour"
                                min="0"
                                step="0.01"
                                placeholder="0 = hourly rate, 4 = 15 min/unit, 1.37, 6.15..."
                                value={formData.units_per_hour === '' || formData.units_per_hour == null ? '' : formData.units_per_hour}
                                onChange={handleChange}
                                className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                                0 = hourly rate; positive = units per hour (e.g. 0.26 → 3.8 hr per unit). For all condition-specific values, use &quot;Import condition variants&quot; below.
                            </p>
                        </div>
                    )}
                </div>

                {/* Condition variants: ar.is drill-down (multiple Eining values per item) */}
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <TableCellsIcon className="h-5 w-5 text-slate-500" />
                        Condition variants (ar.is Eining per condition)
                    </h3>
                    {conditionVariants.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No condition variants for this item.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Code</th>
                                        <th className="py-3 px-4">Condition (Ástæður)</th>
                                        <th className="py-3 px-4 text-right">Eining (units/hr)</th>
                                        <th className="py-3 px-4 text-right">Time per unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {conditionVariants.map((c) => (
                                        <tr key={c.id} className="bg-white dark:bg-slate-800/50">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{c.code}</td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{c.condition_description}</td>
                                            <td className="py-3 px-4 text-right font-mono">{c.units_per_hour != null ? Number(c.units_per_hour) : '—'}</td>
                                            <td className="py-3 px-4 text-right font-medium text-indigo-600 dark:text-indigo-400">{einingLabel(c.units_per_hour) || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <Link 
                        to="/labor-catalog" 
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        Discard Changes
                    </Link>
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                                Committing...
                            </>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Warning / Audit Notice */}
            <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800">
                <h3 className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <InformationCircleIcon className="h-4 w-4" /> Commercial Impact
                </h3>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80 leading-relaxed italic">
                    "Updating unit prices here will not retroactively change existing Commercial Offers. This rate will apply to all new Bill of Quantities (BoQ) items generated after this save."
                </p>
            </div>
        </div>
    );
}

export default LaborCatalogEditPage;