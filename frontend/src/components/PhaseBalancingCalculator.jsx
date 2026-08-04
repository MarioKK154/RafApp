import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScaleIcon, ExclamationTriangleIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const PHASES = ['L1', 'L2', 'L3'];

const PHASE_STYLES = {
    L1: { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', bar: 'bg-amber-500' },
    L2: { badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', bar: 'bg-cyan-500' },
    L3: { badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', bar: 'bg-indigo-500' },
};

function PhaseBalancingCalculator() {
    const { t } = useTranslation();
    const [rows, setRows] = useState([
        { id: 1, name: 'Lighting & Aux', phase: 'L1', amps: 10 },
        { id: 2, name: 'Sockets Circuit A', phase: 'L2', amps: 12 },
        { id: 3, name: 'Heating / HVAC', phase: 'L3', amps: 14 },
    ]);

    const totals = PHASES.reduce((acc, ph) => {
        acc[ph] = rows.reduce((sum, r) => sum + (r.phase === ph ? Number(r.amps) || 0 : 0), 0);
        return acc;
    }, { L1: 0, L2: 0, L3: 0 });

    const maxVal = Math.max(...Object.values(totals), 1);
    const average = (totals.L1 + totals.L2 + totals.L3) / 3 || 0;

    const imbalance = PHASES.map(ph => {
        if (!average) return { phase: ph, diff: 0 };
        const diff = (totals[ph] - average) / average;
        return { phase: ph, diff };
    });

    const worst = imbalance.reduce((max, cur) => (Math.abs(cur.diff) > Math.abs(max.diff) ? cur : max), { phase: 'L1', diff: 0 });
    const imbalancePct = Math.abs(worst.diff) * 100;

    const isWarning = imbalancePct > 15;

    const suggestion = (() => {
        if (!isWarning) return t('phase_balanced_msg', { defaultValue: 'Phase loading appears reasonably balanced.' });
        const sorted = [...PHASES].sort((a, b) => totals[b] - totals[a]);
        const [heaviest, medium, lightest] = sorted;
        return `Warning: Phase ${heaviest} is significantly higher than ${lightest}. Consider moving one or more circuits from ${heaviest} to ${lightest} or ${medium}.`;
    })();

    const addRow = () => {
        const nextId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
        setRows(prev => [...prev, { id: nextId, name: '', phase: 'L1', amps: 0 }]);
    };

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const removeRow = (id) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className="space-y-6">
            {/* Phase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PHASES.map(ph => {
                    const fillRatio = (totals[ph] / maxVal) * 100;
                    const diffPct = average > 0 ? ((totals[ph] - average) / average * 100).toFixed(1) : 0;
                    const isOver = Number(diffPct) > 10;
                    return (
                        <div key={ph} className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${PHASE_STYLES[ph].badge}`}>
                                    Phase {ph}
                                </span>
                                {average > 0 && (
                                    <span className={`text-[10px] font-mono font-black ${isOver ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {diffPct > 0 ? `+${diffPct}` : diffPct}%
                                    </span>
                                )}
                            </div>

                            <p className="text-3xl font-black text-gray-900 dark:text-white font-mono">
                                {totals[ph].toFixed(1)} <span className="text-sm font-bold text-gray-400">A</span>
                            </p>

                            {/* Phase fill indicator bar */}
                            <div className="w-full bg-gray-100 dark:bg-gray-900 h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${PHASE_STYLES[ph].bar} transition-all duration-500`} 
                                    style={{ width: `${Math.max(fillRatio, 5)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Circuits Table */}
            <div className="bg-white dark:bg-gray-800/90 p-5 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                        {t('circuits_and_loads', { defaultValue: 'Circuits and Loads (A)' })}
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {rows.length} Circuits
                    </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {rows.map(row => (
                        <div
                            key={row.id}
                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50/70 dark:bg-gray-900/60 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-gray-700/80 transition-colors"
                        >
                            <input
                                type="text"
                                placeholder={t('circuit_name_placeholder', { defaultValue: 'Circuit name' })}
                                value={row.name}
                                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            />
                            <div className="flex items-center gap-2">
                                <select
                                    value={row.phase}
                                    onChange={(e) => updateRow(row.id, 'phase', e.target.value)}
                                    className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 transition"
                                >
                                    {PHASES.map(ph => (
                                        <option key={ph} value={ph}>{ph}</option>
                                    ))}
                                </select>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={row.amps}
                                        onChange={(e) => updateRow(row.id, 'amps', Number(e.target.value))}
                                        className="w-24 h-10 pr-7 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono font-bold text-gray-900 dark:text-white text-right focus:ring-2 focus:ring-indigo-500 transition"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">A</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRow(row.id)}
                                    className="p-2 text-gray-300 hover:text-rose-500 dark:text-gray-600 dark:hover:text-rose-400 transition"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider transition border border-indigo-100 dark:border-indigo-800/40 cursor-pointer"
                >
                    <PlusIcon className="h-4 w-4" /> {t('add_circuit_btn_phase', { defaultValue: 'Add Circuit' })}
                </button>
            </div>

            {/* Recommendation Status */}
            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-semibold ${
                    isWarning
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                }`}
            >
                {isWarning ? (
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                ) : (
                    <CheckCircleIcon className="h-5 w-5 shrink-0" />
                )}
                <div>
                    <p className="font-black uppercase tracking-widest text-[10px] mb-0.5 flex items-center gap-1">
                        <ScaleIcon className="h-4 w-4" />
                        {t('phase_balance_status', { defaultValue: 'Phase Balance Status' })}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                        {suggestion}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PhaseBalancingCalculator;


