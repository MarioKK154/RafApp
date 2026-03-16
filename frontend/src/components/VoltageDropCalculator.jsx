import React, { useState } from 'react';
import { BoltIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SYSTEMS = [
    { value: 'single_phase', label: 'Single-Phase (1Ø)' },
    { value: 'three_phase', label: 'Three-Phase (3Ø)' },
];

const MATERIALS = [
    { value: 'copper', label: 'Copper (Cu)' },
    { value: 'aluminum', label: 'Aluminum (Al)' },
];

// Approximate resistivity constants (Ω·mm²/m) at operating temperature
const RHO = {
    copper: 0.018, // conservative vs 0.0178
    aluminum: 0.029,
};

function VoltageDropCalculator() {
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

    // Resistance per meter
    const R_per_m = rho / csa; // Ω/m

    // Loop length: assume outgoing + return path
    const loop_m = data.system === 'single_phase' ? length_m * 2 : length_m * 2;

    const Vdrop = current * R_per_m * loop_m * (data.system === 'three_phase' ? Math.sqrt(3) / 2 : 1); // rough factor for 3Ø
    const VdropPercent = (Vdrop / U) * 100;

    const withinLimit = VdropPercent <= (Number(data.maxPercent) || 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        System & Voltage
                    </label>
                    <select
                        name="system"
                        value={data.system}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-black text-gray-900 dark:text-white"
                    >
                        {SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input
                        type="number"
                        name="voltage"
                        value={data.voltage}
                        onChange={handleChange}
                        className="w-full h-12 mt-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                        placeholder="Voltage (V)"
                    />
                    <p className="text-[10px] text-gray-400">
                        Use 230 V for single-phase, 400 V for standard three-phase systems.
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Load & Run
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                                Load Current (A)
                            </span>
                            <input
                                type="number"
                                name="current"
                                value={data.current}
                                onChange={handleChange}
                                className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                                Length (m)
                            </span>
                            <input
                                type="number"
                                name="length"
                                value={data.length}
                                onChange={handleChange}
                                className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Max Allowed Drop (%)
                    </span>
                    <input
                        type="number"
                        name="maxPercent"
                        value={data.maxPercent}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Conductor
                    </label>
                    <select
                        name="material"
                        value={data.material}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-black text-gray-900 dark:text-white"
                    >
                        {MATERIALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Cross-Section (mm²)
                    </span>
                    <input
                        type="number"
                        name="csa"
                        value={data.csa}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Power Factor (cos φ)
                    </span>
                    <input
                        type="number"
                        name="powerFactor"
                        value={data.powerFactor}
                        onChange={handleChange}
                        step="0.01"
                        min="0.1"
                        max="1"
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                        Calculated Drop
                    </p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {Number.isFinite(Vdrop) ? Vdrop.toFixed(2) : '--'} V
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                        Voltage Drop (%)
                    </p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {Number.isFinite(VdropPercent) ? VdropPercent.toFixed(2) : '--'}%
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center">
                    <BoltIcon className="h-6 w-6 text-indigo-500 mr-3" />
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                        Quick check tool; always cross-check with manufacturer cable data and local voltage drop rules.
                    </p>
                </div>
            </div>

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-sm ${
                    withinLimit
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                }`}
            >
                {withinLimit ? (
                    <CheckCircleIcon className="h-5 w-5" />
                ) : (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                )}
                <div>
                    <p className="font-black uppercase tracking-[0.18em] text-[10px] mb-1">
                        {withinLimit ? 'Within Target Voltage Drop' : 'Above Target Voltage Drop'}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                        {withinLimit
                            ? 'The selected cable size meets the configured voltage drop threshold.'
                            : 'Consider increasing conductor size, shortening the run, or revising load distribution to reduce voltage drop.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VoltageDropCalculator;

