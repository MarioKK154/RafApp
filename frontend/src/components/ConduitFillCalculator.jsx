import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsRightLeftIcon, ExclamationTriangleIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const PI = Math.PI;

function ConduitFillCalculator() {
    const { t } = useTranslation();
    const [mode, setMode] = useState('conduit'); // 'conduit' | 'tray'
    const [conduitDiameter, setConduitDiameter] = useState(25); // mm, internal
    const [trayWidth, setTrayWidth] = useState(300); // mm
    const [trayDepth, setTrayDepth] = useState(60); // mm usable depth
    const [rows, setRows] = useState([
        { id: 1, diameter: 10, count: 3 },
        { id: 2, diameter: 6, count: 4 },
    ]);

    const totalConductors = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const sectionArea =
        mode === 'conduit'
            ? PI * Math.pow(conduitDiameter / 2, 2)
            : trayWidth * trayDepth; // mm²
    const cablesArea = rows.reduce((sum, r) => {
        const d = Number(r.diameter) || 0;
        const c = Number(r.count) || 0;
        return sum + c * PI * Math.pow(d / 2, 2);
    }, 0);

    const fillPercent = sectionArea > 0 ? (cablesArea / sectionArea) * 100 : 0;

    let recommendedLimit = 40;
    let limitCaption = 'Based on common conduit fill guidance for 1 / 2 / 3+ conductors.';
    if (mode === 'conduit') {
        if (totalConductors === 1) recommendedLimit = 53;
        else if (totalConductors === 2) recommendedLimit = 31;
    } else {
        recommendedLimit = 50;
        limitCaption = 'Indicative tray fill target; check manufacturer and local cable grouping rules.';
    }

    const overLimit = fillPercent > recommendedLimit;

    const addRow = () => {
        const nextId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
        setRows(prev => [...prev, { id: nextId, diameter: 6, count: 1 }]);
    };

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const removeRow = (id) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    // Color gradient calculation for progress bar
    const getFillColor = () => {
        if (fillPercent > recommendedLimit) return 'from-rose-500 to-red-600';
        if (fillPercent > recommendedLimit * 0.8) return 'from-amber-400 to-orange-500';
        return 'from-emerald-400 to-teal-500';
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800/90 p-5 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-sm space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {t('geometry_label', { defaultValue: 'Geometry' })}
                    </label>
                    
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-900/80 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setMode('conduit')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                                mode === 'conduit'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {t('conduit_label', { defaultValue: 'Conduit' })}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('tray')}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                                mode === 'tray'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {t('cable_tray_label', { defaultValue: 'Cable Tray' })}
                        </button>
                    </div>

                    {mode === 'conduit' ? (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                                {t('conduit_internal_diameter', { defaultValue: 'Conduit Internal Diameter (mm)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="5"
                                    value={conduitDiameter}
                                    onChange={(e) => setConduitDiameter(Number(e.target.value))}
                                    className="w-full h-11 pr-10 pl-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">mm</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                                {t('conduit_diameter_hint', { defaultValue: 'Use manufacturer internal diameter; metric flexible conduits and pipes vary by series.' })}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">
                                {t('tray_width_depth', { defaultValue: 'Tray Width & Usable Depth (mm)' })}
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="50"
                                        value={trayWidth}
                                        onChange={(e) => setTrayWidth(Number(e.target.value))}
                                        className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">W</span>
                                </div>
                                <span className="text-xs font-black text-gray-400">×</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="20"
                                        value={trayDepth}
                                        onChange={(e) => setTrayDepth(Number(e.target.value))}
                                        className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">D</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                                {t('tray_depth_hint', { defaultValue: 'Depth is the effective filling height you plan to use, not full side wall height.' })}
                            </p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 bg-white dark:bg-gray-800/90 p-5 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {t('conductors_label', { defaultValue: 'Conductors' })}
                            </label>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {totalConductors} Total
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                            {rows.map(row => (
                                <div
                                    key={row.id}
                                    className="flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-900/60 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-gray-700/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                        <span className="text-xs font-black text-gray-400 uppercase">Ø</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.diameter}
                                            onChange={(e) => updateRow(row.id, 'diameter', Number(e.target.value))}
                                            className="w-20 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-mono font-bold text-gray-900 dark:text-white"
                                        />
                                        <span className="text-xs font-bold text-gray-400">mm</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">Qty</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.count}
                                                onChange={(e) => updateRow(row.id, 'count', Number(e.target.value))}
                                                className="w-16 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-mono font-bold text-gray-900 dark:text-white text-center"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            className="p-1.5 text-gray-300 hover:text-rose-500 dark:text-gray-600 dark:hover:text-rose-400 transition"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider transition border border-indigo-100 dark:border-indigo-800/40 cursor-pointer"
                    >
                        <PlusIcon className="h-4 w-4" /> {t('add_circuit_btn', { defaultValue: 'Add Circuit' })}
                    </button>
                </div>
            </div>

            {/* Visual Progress Bar Section */}
            <div className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fill_percentage', { defaultValue: 'Fill Percentage' })}</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white font-mono mt-0.5">
                            {sectionArea > 0 ? fillPercent.toFixed(1) : '--'}%
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('recommended_limit_label', { defaultValue: 'Recommended Limit' })}</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{recommendedLimit}%</p>
                    </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full bg-gray-100 dark:bg-gray-900 h-4 rounded-full overflow-hidden p-0.5 border border-gray-200/60 dark:border-gray-700/60 relative">
                    <div 
                        className={`h-full rounded-full bg-gradient-to-r ${getFillColor()} transition-all duration-500`}
                        style={{ width: `${Math.min(fillPercent, 100)}%` }}
                    />
                    {/* Limit Marker */}
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white z-10 opacity-70"
                        style={{ left: `${Math.min(recommendedLimit, 100)}%` }}
                        title={`Limit: ${recommendedLimit}%`}
                    />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">{limitCaption}</p>
            </div>

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-xs font-semibold ${
                    overLimit
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                }`}
            >
                {overLimit ? (
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                ) : (
                    <CheckCircleIcon className="h-5 w-5 shrink-0" />
                )}
                <div>
                    <p className="font-black uppercase tracking-widest text-[10px] mb-0.5">
                        {overLimit ? t('over_fill', { defaultValue: 'Over Recommended Fill' }) : t('within_fill', { defaultValue: 'Within Recommended Fill' })}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                        {t('fill_warning_text', { defaultValue: 'Always verify against local standards before installation. This tool provides indicative guidance only and does not replace national wiring rules.' })}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ConduitFillCalculator;


