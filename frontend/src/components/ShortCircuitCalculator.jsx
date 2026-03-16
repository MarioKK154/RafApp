import React, { useState } from 'react';
import { BoltIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const BREAKER_STEPS_KA = [3, 6, 10, 16, 25, 36, 50];

function ShortCircuitCalculator() {
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

    // Base short-circuit current at transformer terminals (3-phase)
    const Isc_tx = S > 0 ? (S * 1000) / (Math.sqrt(3) * Vll * (Zpct / 100)) : 0; // A

    // Approximate transformer impedance in ohms
    const Z_tx = (Math.pow(Vll, 2) / (S * 1000)) * (Zpct / 100); // Ω

    // Approximate cable resistance (ignore reactance for a conservative rough estimate)
    const rho = material === 'aluminum' ? 0.029 : 0.018; // Ω·mm²/m
    const R_cable = (rho / csa) * (L * 2); // Ω round trip

    const Z_total = Z_tx + R_cable;
    const Isc_panel = Z_total > 0 ? (Vll / (Math.sqrt(3) * Z_total)) : 0; // A

    const Isc_panel_kA = Isc_panel / 1000;

    const suggestedBreakerKA =
        BREAKER_STEPS_KA.find(step => step >= Isc_panel_kA * 1.1) || BREAKER_STEPS_KA[BREAKER_STEPS_KA.length - 1];

    const underRated = Isc_panel_kA > suggestedBreakerKA;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Transformer
                    </label>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Rating (kVA)
                    </span>
                    <input
                        type="number"
                        name="transformerKVA"
                        value={data.transformerKVA}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Voltage (V L-L)
                    </span>
                    <input
                        type="number"
                        name="voltageLL"
                        value={data.voltageLL}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        % Impedance
                    </span>
                    <input
                        type="number"
                        name="impedancePercent"
                        value={data.impedancePercent}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Feeder Run
                    </label>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Distance to Panel (m)
                    </span>
                    <input
                        type="number"
                        name="distance"
                        value={data.distance}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-gray-900 dark:text-white"
                    />
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1 ml-1">
                        Conductor Material
                    </span>
                    <select
                        name="material"
                        value={data.material}
                        onChange={handleChange}
                        className="w-full h-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-black text-gray-900 dark:text-white"
                    >
                        <option value="copper">Copper (Cu)</option>
                        <option value="aluminum">Aluminum (Al)</option>
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
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                        Results Snapshot
                    </label>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                            I<sub>sc</sub> at Transformer
                        </p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                            {Number.isFinite(Isc_tx) ? (Isc_tx / 1000).toFixed(2) : '--'} kA
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                            I<sub>sc</sub> at Panel
                        </p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">
                            {Number.isFinite(Isc_panel_kA) ? Isc_panel_kA.toFixed(2) : '--'} kA
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center">
                        <BoltIcon className="h-6 w-6 text-indigo-500 mr-3" />
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            Use as a sizing sanity-check. Final values must be confirmed against detailed manufacturer data and
                            local short-circuit calculation practice.
                        </p>
                    </div>
                </div>
            </div>

            <div
                className={`flex items-center gap-3 p-4 rounded-2xl border text-sm ${
                    underRated
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200'
                }`}
            >
                {underRated ? (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                ) : (
                    <CheckCircleIcon className="h-5 w-5" />
                )}
                <div>
                    <p className="font-black uppercase tracking-[0.18em] text-[10px] mb-1">
                        {underRated ? 'Breaker Rating Undersized' : 'Suggested Minimum Breaking Capacity'}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                        Recommended breaking capacity at the panel: <strong>{suggestedBreakerKA} kA</strong>. Select a protective
                        device with at least this rating (or the next standard size above the calculated fault current).
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ShortCircuitCalculator;

