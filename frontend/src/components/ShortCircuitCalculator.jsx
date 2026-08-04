import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BoltIcon, ExclamationTriangleIcon, CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const BREAKER_STEPS_KA = [3, 6, 10, 16, 25, 36, 50];

function ShortCircuitCalculator() {
    const { t } = useTranslation();
    const [data, setData] = useState({
        transformerKVA: 400,
        voltageLL: 400,
        impedancePercent: 4,
        distance: 30,
        material: 'copper',
        csa: 25,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const S = Number(data.transformerKVA) || 0;
    const Vll = Number(data.voltageLL) || 1;
    const Zpct = Number(data.impedancePercent) || 1;
    const L = Number(data.distance) || 0;
    const csa = Number(data.csa) || 1;
    const material = data.material;

    const Isc_tx = S > 0 ? (S * 1000) / (Math.sqrt(3) * Vll * (Zpct / 100)) : 0;
    const Z_tx = (Math.pow(Vll, 2) / (S * 1000)) * (Zpct / 100);
    const rho = material === 'aluminum' ? 0.029 : 0.018;
    const R_cable = (rho / csa) * (L * 2);
    const Z_total = Z_tx + R_cable;
    const Isc_panel = Z_total > 0 ? (Vll / (Math.sqrt(3) * Z_total)) : 0;
    const Isc_panel_kA = Isc_panel / 1000;

    const suggestedBreakerKA =
        BREAKER_STEPS_KA.find(step => step >= Isc_panel_kA * 1.1) || BREAKER_STEPS_KA[BREAKER_STEPS_KA.length - 1];

    const underRated = Isc_panel_kA > suggestedBreakerKA;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800/90 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/80 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('transformer_label', { defaultValue: 'Transformer' })}
                        </label>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('rating_kva', { defaultValue: 'Rating (kVA)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="transformerKVA"
                                    value={data.transformerKVA}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-12 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">kVA</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('voltage_ll', { defaultValue: 'Voltage (V L-L)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="voltageLL"
                                    value={data.voltageLL}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">V</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('percent_impedance', { defaultValue: '% Impedance' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="impedancePercent"
                                    value={data.impedancePercent}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('feeder_run', { defaultValue: 'Feeder Run' })}
                        </label>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('distance_to_panel', { defaultValue: 'Distance to Panel (m)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="distance"
                                    value={data.distance}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">m</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('conductor_material', { defaultValue: 'Conductor Material' })}
                            </label>
                            <select
                                name="material"
                                value={data.material}
                                onChange={handleChange}
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white"
                            >
                                <option value="copper">{t('copper_cu', { defaultValue: 'Copper (Cu)' })}</option>
                                <option value="aluminum">{t('aluminum_al', { defaultValue: 'Aluminum (Al)' })}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('cross_section_mm2', { defaultValue: 'Cross-Section (mm²)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="csa"
                                    value={data.csa}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-12 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">mm²</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('results_snapshot', { defaultValue: 'Results Snapshot' })}
                        </label>
                        <div className="bg-gradient-to-br from-indigo-50/70 to-indigo-100/40 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 p-4">
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                                {t('isc_at_transformer', { defaultValue: 'Isc at Transformer' })}
                            </p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                                {Number.isFinite(Isc_tx) ? (Isc_tx / 1000).toFixed(2) : '--'} <span className="text-sm font-bold text-indigo-500">kA</span>
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50/70 to-indigo-100/40 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 p-4">
                            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                                {t('isc_at_panel', { defaultValue: 'Isc at Panel' })}
                            </p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                                {Number.isFinite(Isc_panel_kA) ? Isc_panel_kA.toFixed(2) : '--'} <span className="text-sm font-bold text-indigo-500">kA</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggested Breaker Rating Banner */}
            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-semibold ${
                    underRated
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                }`}
            >
                {underRated ? (
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                ) : (
                    <ShieldCheckIcon className="h-5 w-5 shrink-0" />
                )}
                <div>
                    <p className="font-black uppercase tracking-widest text-[10px] mb-0.5">
                        {underRated ? t('breaker_undersized', { defaultValue: 'Breaker Rating Undersized' }) : t('suggested_min_breaking_capacity', { defaultValue: 'Suggested Minimum Breaking Capacity' })}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                        {t('recommended_breaking_capacity', { defaultValue: 'Recommended breaking capacity at the panel:' })} <strong className="font-mono font-black text-sm">{suggestedBreakerKA} kA</strong>. {t('select_protective_device', { defaultValue: 'Select a protective device with at least this rating (or the next standard size above the calculated fault current).' })}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ShortCircuitCalculator;


