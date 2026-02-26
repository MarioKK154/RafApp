import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { 
    BoltIcon, 
    WrenchIcon, 
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    CalculatorIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

const INSTALLATION_METHODS = [
    { value: "in_air_spaced", label: "In Air (Spaced)" },
    { value: "clipped_direct", label: "Clipped Direct to Surface" },
    { value: "conduit_surface", label: "In Conduit on Surface" },
    { value: "conduit_embedded", label: "In Conduit (Embedded)" },
    { value: "buried_direct", label: "Buried Direct" },
    { value: "buried_in_duct", label: "Buried in Duct" }
];
const INSULATION_TYPES = [
    { value: "XLPE", label: "XLPE (90°C)" },
    { value: "PVC", label: "PVC (70°C)" }
];
const MATERIALS = [
    { value: "copper", label: "Copper (Cu)" },
    { value: "aluminum", label: "Aluminum (Al)" }
];
const VOLTAGE_SYSTEMS = [
    { value: "single_phase", label: "Single-Phase (1Ø)" },
    { value: "three_phase", label: "Three-Phase (3Ø)" }
];
const LOAD_TYPES = [
    { value: "", label: "Custom VDrop %" },
    { value: "general_power", label: "General Power (5%)" },
    { value: "lighting", label: "Lighting (3%)" },
    { value: "motors", label: "Motors (5%)" },
    { value: "ev_chargers", label: "EV Chargers (5%)" },
    { value: "data_centers", label: "Data Centers (3%)" }
];

const formatNum = (num, digits = 2) => (num !== null && num !== undefined) ? num.toFixed(digits) : 'N/A';

function CableSizingCalculator() {
    const [formData, setFormData] = useState({
        voltage_system: 'single_phase',
        voltage: 230,
        load_power_kw: 12,
        power_factor: 0.9,
        cable_length_m: 40,
        material: 'copper',
        insulation: 'XLPE',
        installation_method: 'conduit_surface',
        ambient_temperature_c: 35,
        load_type: 'general_power',
        allowable_vdrop_percent: 5.0,
        fault_current_ka: 6.0,
        disconnection_time_s: 0.4,
        fault_current_at_load_ka: '',
        assume_fault_at_load_fraction: '',
    });
    
    const [enableSC, setEnableSC] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newForm = { ...prev, [name]: value };
            if (name === 'load_type') {
                if (value === "lighting" || value === "data_centers") {
                    newForm.allowable_vdrop_percent = 3.0;
                } else if (value) {
                    newForm.allowable_vdrop_percent = 5.0;
                }
            }
            return newForm;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResult(null);
        setError('');
        
        const payload = {
            ...formData,
            voltage: parseFloat(formData.voltage),
            load_power_kw: parseFloat(formData.load_power_kw),
            power_factor: parseFloat(formData.power_factor),
            cable_length_m: parseFloat(formData.cable_length_m),
            ambient_temperature_c: parseInt(formData.ambient_temperature_c),
            allowable_vdrop_percent: parseFloat(formData.allowable_vdrop_percent),
            load_type: formData.load_type || null,
            enable_short_circuit_check: enableSC,
            fault_current_ka: enableSC ? parseFloat(formData.fault_current_ka) : null,
            disconnection_time_s: enableSC ? parseFloat(formData.disconnection_time_s) : null,
            fault_current_at_load_ka: (enableSC && formData.fault_current_at_load_ka) ? parseFloat(formData.fault_current_at_load_ka) : null,
            assume_fault_at_load_fraction: (enableSC && formData.assume_fault_at_load_fraction) ? parseFloat(formData.assume_fault_at_load_fraction) : null,
        };

        try {
            const response = await axiosInstance.post('/calculators/cable-size', payload);
            setResult(response.data);
            toast.success("Calculation verified by engine.");
        } catch (err) {
            const msg = err.response?.data?.detail || 'Calculation error. Check your parameters.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowClass = (step) => {
        if (!step.ampacity_ok || !step.vdrop_ok || (enableSC && !step.short_circuit_ok)) {
            return 'bg-red-50 dark:bg-red-900/10 opacity-70';
        }
        if (result?.final_selection?.size_mm2 === step.size_mm2) {
            return 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600 font-bold';
        }
        return 'bg-white dark:bg-gray-800';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-xl">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Load Params */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
                            <BoltIcon className="h-4 w-4 mr-2" /> Load Parameters
                        </h4>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Phase System</label>
                            <select name="voltage_system" value={formData.voltage_system} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                {VOLTAGE_SYSTEMS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Voltage (V)</label>
                                <input type="number" name="voltage" value={formData.voltage} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Power (kW)</label>
                                <input type="number" name="load_power_kw" value={formData.load_power_kw} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Power Factor (cos φ)</label>
                            <input type="number" name="power_factor" value={formData.power_factor} onChange={handleChange} step="0.01" min="0.1" max="1" className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>

                    {/* Cable Params */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
                            <WrenchIcon className="h-4 w-4 mr-2" /> Installation
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Material</label>
                                <select name="material" value={formData.material} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                    {MATERIALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Insulation</label>
                                <select name="insulation" value={formData.insulation} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                    {INSULATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Method</label>
                            <select name="installation_method" value={formData.installation_method} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                {INSTALLATION_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Length (m)</label>
                                <input type="number" name="cable_length_m" value={formData.cable_length_m} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Temp (°C)</label>
                                <input type="number" name="ambient_temperature_c" value={formData.ambient_temperature_c} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2" /> Requirements
                        </h4>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Application / Load Type</label>
                            <select name="load_type" value={formData.load_type} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                {LOAD_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Max VDrop Allowed (%)</label>
                            <input 
                                type="number" 
                                name="allowable_vdrop_percent" 
                                value={formData.allowable_vdrop_percent} 
                                onChange={handleChange} 
                                step="0.1" 
                                className={`w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white ${formData.load_type ? 'bg-gray-50 opacity-50' : ''}`}
                                readOnly={!!formData.load_type}
                            />
                        </div>

                        {/* Short Circuit Toggle */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className={`w-10 h-5 rounded-full transition-colors relative ${enableSC ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <input type="checkbox" checked={enableSC} onChange={(e) => setEnableSC(e.target.checked)} className="hidden" />
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${enableSC ? 'translate-x-5' : ''}`}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 transition">Enable S/C Protection Check</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Advanced S/C Fields */}
                {enableSC && (
                    <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
                        <div className="space-y-4">
                            <h5 className="text-xs font-black text-orange-500 uppercase tracking-widest">Fault Current Geometry</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center text-xs font-bold text-gray-500 mb-1 uppercase">
                                        Fault at Load (kA)
                                        <InformationCircleIcon className="h-3 w-3 ml-1" title="Preferred: The calculated short-circuit current at the end of the cable run." />
                                    </label>
                                    <input type="number" name="fault_current_at_load_ka" value={formData.fault_current_at_load_ka} onChange={handleChange} step="0.1" className="w-full rounded-xl border-orange-200 dark:bg-gray-700 dark:text-white" placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Disconnect Time (s)</label>
                                    <input type="number" name="disconnection_time_s" value={formData.disconnection_time_s} onChange={handleChange} step="0.1" className="w-full rounded-xl border-orange-200 dark:bg-gray-700 dark:text-white" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h5 className="text-xs font-black text-orange-500 uppercase tracking-widest">Fallback Estimations</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center text-xs font-bold text-gray-500 mb-1 uppercase">
                                        Fault at Panel (kA)
                                        <InformationCircleIcon className="h-3 w-3 ml-1" title="The maximum fault current available at the circuit's source panel." />
                                    </label>
                                    <input type="number" name="fault_current_ka" value={formData.fault_current_ka} onChange={handleChange} step="0.1" className="w-full rounded-xl border-orange-100 dark:bg-gray-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="flex items-center text-xs font-bold text-gray-500 mb-1 uppercase">
                                        Attenuation (Z)
                                        <InformationCircleIcon className="h-3 w-3 ml-1" title="Fraction of panel fault current reaching the load (Default 0.1 / 10%)." />
                                    </label>
                                    <input type="number" name="assume_fault_at_load_fraction" value={formData.assume_fault_at_load_fraction} onChange={handleChange} step="0.05" className="w-full rounded-xl border-orange-100 dark:bg-gray-700 dark:text-white" placeholder="0.1" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition transform active:scale-95 disabled:opacity-50">
                        {isSubmitting ? <LoadingSpinner text="Computing..." size="sm" /> : (
                            <><CalculatorIcon className="h-5 w-5 mr-2" /> Calculate Compliance</>
                        )}
                    </button>
                </div>
            </form>

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                    {/* Final Badge */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-3xl text-white text-center shadow-xl">
                        <h3 className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em] mb-2">Recommended Cross-Section</h3>
                        <p className="text-6xl font-black mb-2">{result.final_selection.size_mm2} mm²</p>
                        <p className="text-indigo-200 text-sm font-medium">{result.final_message}</p>
                    </div>

                    {/* Derived Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Current Load', val: `${formatNum(result.derived_values.load_current_a)} A` },
                            { label: 'Target Ampacity', val: `${formatNum(result.derived_values.effective_required_ampacity_a)} A` },
                            { label: 'S/C Floor', val: `${formatNum(result.derived_values.short_circuit_min_mm2)} mm²` },
                            { label: 'VDrop Cap', val: `${formatNum(result.derived_values.allowable_vdrop_percent)} %` }
                        ].map((s, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">{s.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Reasoning Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Validation Reasoning</h3>
                            <p className="text-xs text-gray-500">How the engine verified each standard IEC size against your constraints.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 font-black">
                                    <tr>
                                        <th className="py-4 px-6">Size (mm²)</th>
                                        <th className="py-4 px-6">Ampacity</th>
                                        <th className="py-4 px-6">Voltage Drop</th>
                                        <th className="py-4 px-6">Thermal S/C</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {result.reasoning.map(step => (
                                        <tr key={step.size_mm2} className={getRowClass(step)}>
                                            <td className="py-4 px-6 font-black">{step.size_mm2}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.ampacity_ok ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                                                    <span>{formatNum(step.derated_ampacity_a)} A</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.vdrop_ok ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                                                    <span>{formatNum(step.voltage_drop_percent)} %</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.short_circuit_ok ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                                                    <span>{step.short_circuit_ok ? 'Compliant' : 'Insufficient'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CableSizingCalculator;