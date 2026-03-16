import React, { useState } from 'react';
import { ArrowsRightLeftIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const PI = Math.PI;

function ConduitFillCalculator() {
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
        // Cable tray: typically designed much lower; 40–50% is a reasonable planning limit
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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Geometry
                    </label>
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setMode('conduit')}
                            className={`flex-1 h-9 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] border ${
                                mode === 'conduit'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            Conduit
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('tray')}
                            className={`flex-1 h-9 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] border ${
                                mode === 'tray'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            Cable Tray
                        </button>
                    </div>

                    {mode === 'conduit' ? (
                        <>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 mt-2">
                                Conduit Internal Diameter (mm)
                            </label>
                            <input
                                type="number"
                                min="5"
                                value={conduitDiameter}
                                onChange={(e) => setConduitDiameter(Number(e.target.value))}
                                className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm font-black text-gray-900 dark:text-white"
                            />
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Use manufacturer internal diameter; metric flexible conduits and pipes vary by series.
                            </p>
                        </>
                    ) : (
                        <>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1 mt-2">
                                Tray Width & Usable Depth (mm)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="50"
                                    value={trayWidth}
                                    onChange={(e) => setTrayWidth(Number(e.target.value))}
                                    className="w-24 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-black text-gray-900 dark:text-white"
                                />
                                <span className="text-[10px] text-gray-400">×</span>
                                <input
                                    type="number"
                                    min="20"
                                    value={trayDepth}
                                    onChange={(e) => setTrayDepth(Number(e.target.value))}
                                    className="w-24 h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-black text-gray-900 dark:text-white"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Depth is the effective filling height you plan to use, not full side wall height.
                            </p>
                        </>
                    )}
                </div>

                <div className="md:col-span-2 space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Conductors
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {rows.map(row => (
                            <div
                                key={row.id}
                                className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                        Ø
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={row.diameter}
                                        onChange={(e) => updateRow(row.id, 'diameter', Number(e.target.value))}
                                        className="w-20 h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs font-bold text-gray-900 dark:text-white"
                                    />
                                    <span className="text-[10px] text-gray-400">mm</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                        Qty
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={row.count}
                                        onChange={(e) => updateRow(row.id, 'count', Number(e.target.value))}
                                        className="w-16 h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-xs font-bold text-gray-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRow(row.id)}
                                    className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 hover:text-red-500"
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
                        <ArrowsRightLeftIcon className="h-4 w-4" /> Add Circuit
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Total Conductors</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{totalConductors}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Fill Percentage</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {sectionArea > 0 ? fillPercent.toFixed(1) : '--'}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">Recommended Limit</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{recommendedLimit}%</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {limitCaption}
                    </p>
                </div>
            </div>

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-sm ${
                    overLimit
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                }`}
            >
                {overLimit ? (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                ) : (
                    <CheckCircleIcon className="h-5 w-5" />
                )}
                <div>
                    <p className="font-black uppercase tracking-[0.18em] text-[10px] mb-1">
                        {overLimit ? 'Over Recommended Fill' : 'Within Recommended Fill'}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                        Always verify against local standards before installation. This tool provides indicative guidance only and
                        does not replace national wiring rules.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ConduitFillCalculator;

