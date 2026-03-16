import React, { useState } from 'react';
import { ScaleIcon, ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

const PHASES = ['L1', 'L2', 'L3'];

function PhaseBalancingCalculator() {
    const [rows, setRows] = useState([
        { id: 1, name: 'Lighting', phase: 'L1', amps: 10 },
        { id: 2, name: 'Sockets', phase: 'L2', amps: 12 },
        { id: 3, name: 'Heating', phase: 'L3', amps: 14 },
    ]);

    const totals = PHASES.reduce((acc, ph) => {
        acc[ph] = rows.reduce((sum, r) => sum + (r.phase === ph ? Number(r.amps) || 0 : 0), 0);
        return acc;
    }, { L1: 0, L2: 0, L3: 0 });

    const average = (totals.L1 + totals.L2 + totals.L3) / 3 || 0;

    const imbalance = PHASES.map(ph => {
        if (!average) return { phase: ph, diff: 0 };
        const diff = (totals[ph] - average) / average; // fraction
        return { phase: ph, diff };
    });

    const worst = imbalance.reduce((max, cur) => (Math.abs(cur.diff) > Math.abs(max.diff) ? cur : max), { phase: 'L1', diff: 0 });
    const imbalancePct = Math.abs(worst.diff) * 100;

    const isWarning = imbalancePct > 15; // 15% threshold for warning

    const suggestion = (() => {
        if (!isWarning) return 'Phase loading appears reasonably balanced.';
        const sorted = [...PHASES].sort((a, b) => totals[b] - totals[a]);
        const [heaviest, medium, lightest] = sorted;
        return `Warning: Phase ${heaviest} is significantly higher than ${lightest}. Consider moving one or more circuits (e.g. heating, hot water, EV charger) from ${heaviest} to ${lightest} or ${medium}.`;
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
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    Circuits and Loads (A)
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {rows.map(row => (
                        <div
                            key={row.id}
                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 dark:bg-gray-900/60 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700"
                        >
                            <input
                                type="text"
                                placeholder="Circuit name"
                                value={row.name}
                                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                className="flex-1 h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-xs font-bold text-gray-900 dark:text-white"
                            />
                            <select
                                value={row.phase}
                                onChange={(e) => updateRow(row.id, 'phase', e.target.value)}
                                className="w-20 h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.18em]"
                            >
                                {PHASES.map(ph => (
                                    <option key={ph} value={ph}>{ph}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min="0"
                                    value={row.amps}
                                    onChange={(e) => updateRow(row.id, 'amps', Number(e.target.value))}
                                    className="w-20 h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs font-bold text-gray-900 dark:text-white text-right"
                                />
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.18em]">
                                    A
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 hover:text-red-500 self-end sm:self-auto"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addRow}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] hover:bg-indigo-700 transition"
                >
                    <PlusIcon className="h-4 w-4" /> Add Circuit
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PHASES.map(ph => (
                    <div key={ph} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                            Phase {ph}
                        </p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                            {totals[ph].toFixed(1)} A
                        </p>
                        {average > 0 && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                {((totals[ph] - average) / average * 100).toFixed(1)}% from average
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-sm ${
                    isWarning
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                }`}
            >
                {isWarning ? (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                ) : (
                    <CheckCircleIcon className="h-5 w-5" />
                )}
                <div>
                    <p className="font-black uppercase tracking-[0.18em] text-[10px] mb-1 flex items-center gap-1">
                        <ScaleIcon className="h-4 w-4" />
                        Phase Balance Status
                    </p>
                    <p className="text-[11px] leading-relaxed">
                        {suggestion}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PhaseBalancingCalculator;

