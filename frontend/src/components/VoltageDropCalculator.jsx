import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BoltIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SYSTEMS = [
    { value: 'single_phase', label: 'Single-Phase (1Ø)' },
    { value: 'three_phase', label: 'Three-Phase (3Ø)' },
];

const MATERIALS = [
    { value: 'copper', label: 'Copper (Cu)' },
    { value: 'aluminum', label: 'Aluminum (Al)' },
];

const RHO = {
    copper: 0.018,
    aluminum: 0.029,
};

function VoltageDropCalculator() {
    const { t } = useTranslation();
    const [data, setData] = useState({
        system: 'three_phase',
        voltage: 400,
        current: 32,
        length: 40,
        material: 'copper',
        csa: 6,
        powerFactor: 0.95,
        maxPercent: 5,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const current = Number(data.current) || 0;
    const length_m = Number(data.length) || 0;
    const csa = Number(data.csa) || 1;
    const U = Number(data.voltage) || 1;
    const rho = RHO[data.material] || RHO.copper;

    const R_per_m = rho / csa;
    const loop_m = length_m * 2;
    const Vdrop = current * R_per_m * loop_m * (data.system === 'three_phase' ? Math.sqrt(3) / 2 : 1);
    const VdropPercent = (Vdrop / U) * 100;
    const maxPct = Number(data.maxPercent) || 5;

    const withinLimit = VdropPercent <= maxPct;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800/90 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/80 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('system_voltage_label', { defaultValue: 'System & Voltage' })}
                        </label>
                        <select
                            name="system"
                            value={data.system}
                            onChange={handleChange}
                            className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            {SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <div className="relative">
                            <input
                                type="number"
                                name="voltage"
                                value={data.voltage}
                                onChange={handleChange}
                                className="w-full h-11 pr-8 pl-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                                placeholder="Voltage (V)"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">V</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            {t('vdrop_hint', { defaultValue: 'Use 230 V for single-phase, 400 V for standard three-phase systems.' })}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('load_and_run', { defaultValue: 'Load & Run' })}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                    {t('load_current_a', { defaultValue: 'Load Current (A)' })}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="current"
                                        value={data.current}
                                        onChange={handleChange}
                                        className="w-full h-11 pr-7 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">A</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                    {t('length_m', { defaultValue: 'Length (m)' })}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="length"
                                        value={data.length}
                                        onChange={handleChange}
                                        className="w-full h-11 pr-7 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">m</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                {t('max_allowed_drop_pct', { defaultValue: 'Max Allowed Drop (%)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="maxPercent"
                                    value={data.maxPercent}
                                    onChange={handleChange}
                                    className="w-full h-11 pr-7 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                            {t('conductor_label', { defaultValue: 'Conductor' })}
                        </label>
                        <select
                            name="material"
                            value={data.material}
                            onChange={handleChange}
                            className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            {MATERIALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                    {t('cross_section_mm2', { defaultValue: 'Cross-Section (mm²)' })}
                                </label>
                                <input
                                    type="number"
                                    name="csa"
                                    value={data.csa}
                                    onChange={handleChange}
                                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1 ml-0.5">
                                    {t('power_factor_label', { defaultValue: 'Power Factor (cos φ)' })}
                                </label>
                                <input
                                    type="number"
                                    name="powerFactor"
                                    value={data.powerFactor}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0.1"
                                    max="1"
                                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {t('calculated_drop', { defaultValue: 'Calculated Drop' })}
                    </p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white font-mono">
                        {Number.isFinite(Vdrop) ? Vdrop.toFixed(2) : '--'} <span className="text-sm font-bold text-gray-400">V</span>
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {t('voltage_drop_pct', { defaultValue: 'Voltage Drop (%)' })}
                    </p>
                    <p className={`text-3xl font-black font-mono ${withinLimit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {Number.isFinite(VdropPercent) ? VdropPercent.toFixed(2) : '--'}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm flex items-center">
                    <BoltIcon className="h-6 w-6 text-indigo-500 shrink-0 mr-3" />
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        {t('vdrop_note', { defaultValue: 'Quick check tool; always cross-check with manufacturer cable data and local voltage drop rules.' })}
                    </p>
                </div>
            </div>

            {/* Compliance Banner */}
            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-semibold ${
                    withinLimit
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                }`}
            >
                {withinLimit ? (
                    <CheckCircleIcon className="h-5 w-5 shrink-0" />
                ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                )}
                <div>
                    <p className="font-black uppercase tracking-widest text-[10px] mb-0.5">
                        {withinLimit ? t('within_target_vdrop', { defaultValue: 'Within Target Voltage Drop' }) : t('above_target_vdrop', { defaultValue: 'Above Target Voltage Drop' })}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                        {withinLimit
                            ? t('within_vdrop_text', { defaultValue: 'The selected cable size meets the configured voltage drop threshold.' })
                            : t('above_vdrop_text', { defaultValue: 'Consider increasing conductor size, shortening the run, or revising load distribution to reduce voltage drop.' })}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VoltageDropCalculator;


