import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { 
    BoltIcon, 
    WrenchIcon, 
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    CalculatorIcon,
    InformationCircleIcon,
    ShieldCheckIcon,
    SparklesIcon
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
    const { t } = useTranslation();
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
            return 'bg-rose-500/5 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 opacity-60';
        }
        if (result?.final_selection?.size_mm2 === step.size_mm2) {
            return 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border-l-4 border-indigo-500 font-bold text-indigo-950 dark:text-indigo-200';
        }
        return 'bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800/90 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 backdrop-blur-md">
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-2xl flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Load Params */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl">
                                <BoltIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                {t('load_parameters', { defaultValue: 'Load Parameters' })}
                            </h4>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                {t('phase_system', { defaultValue: 'Phase System' })}
                            </label>
                            <select 
                                name="voltage_system" 
                                value={formData.voltage_system} 
                                onChange={handleChange} 
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                {VOLTAGE_SYSTEMS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('voltage_v', { defaultValue: 'Voltage (V)' })}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="voltage" 
                                        value={formData.voltage} 
                                        onChange={handleChange} 
                                        className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition" 
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">V</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('power_kw', { defaultValue: 'Power (kW)' })}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="load_power_kw" 
                                        value={formData.load_power_kw} 
                                        onChange={handleChange} 
                                        className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition" 
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">kW</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                {t('power_factor_label', { defaultValue: 'Power Factor (cos φ)' })}
                            </label>
                            <input 
                                type="number" 
                                name="power_factor" 
                                value={formData.power_factor} 
                                onChange={handleChange} 
                                step="0.01" 
                                min="0.1" 
                                max="1" 
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition" 
                            />
                        </div>
                    </div>

                    {/* Cable Params */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl">
                                <WrenchIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                {t('installation_section', { defaultValue: 'Installation' })}
                            </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('material_label', { defaultValue: 'Material' })}
                                </label>
                                <select 
                                    name="material" 
                                    value={formData.material} 
                                    onChange={handleChange} 
                                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                                >
                                    {MATERIALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('insulation_label', { defaultValue: 'Insulation' })}
                                </label>
                                <select 
                                    name="insulation" 
                                    value={formData.insulation} 
                                    onChange={handleChange} 
                                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                                >
                                    {INSULATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                {t('installation_method_label', { defaultValue: 'Method' })}
                            </label>
                            <select 
                                name="installation_method" 
                                value={formData.installation_method} 
                                onChange={handleChange} 
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                {INSTALLATION_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('length_m', { defaultValue: 'Length (m)' })}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="cable_length_m" 
                                        value={formData.cable_length_m} 
                                        onChange={handleChange} 
                                        className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition" 
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">m</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                    {t('temp_c', { defaultValue: 'Temp (°C)' })}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="ambient_temperature_c" 
                                        value={formData.ambient_temperature_c} 
                                        onChange={handleChange} 
                                        className="w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition" 
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">°C</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Requirements */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl">
                                <ExclamationTriangleIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                {t('requirements_section', { defaultValue: 'Requirements' })}
                            </h4>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                {t('application_load_type', { defaultValue: 'Application / Load Type' })}
                            </label>
                            <select 
                                name="load_type" 
                                value={formData.load_type} 
                                onChange={handleChange} 
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            >
                                {LOAD_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">
                                {t('max_vdrop_allowed', { defaultValue: 'Max VDrop Allowed (%)' })}
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    name="allowable_vdrop_percent" 
                                    value={formData.allowable_vdrop_percent} 
                                    onChange={handleChange} 
                                    step="0.1" 
                                    className={`w-full h-11 pr-8 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/60 text-xs font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition ${formData.load_type ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    readOnly={!!formData.load_type}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                            </div>
                        </div>

                        {/* Short Circuit Toggle */}
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                            <label className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 cursor-pointer group transition">
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 transition">
                                    {t('enable_sc_check', { defaultValue: 'Enable S/C Protection Check' })}
                                </span>
                                <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${enableSC ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <input type="checkbox" checked={enableSC} onChange={(e) => setEnableSC(e.target.checked)} className="hidden" />
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform shadow-sm ${enableSC ? 'translate-x-4' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Advanced S/C Fields */}
                {enableSC && (
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-3 bg-amber-500/5 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                            <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                <SparklesIcon className="h-4 w-4" />
                                {t('fault_geometry_title', { defaultValue: 'Fault Current Geometry' })}
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center text-[9px] font-black text-gray-500 uppercase mb-1">
                                        {t('fault_at_load_ka', { defaultValue: 'Fault at Load (kA)' })}
                                    </label>
                                    <input type="number" name="fault_current_at_load_ka" value={formData.fault_current_at_load_ka} onChange={handleChange} step="0.1" className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white" placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-500 uppercase mb-1">{t('disconnect_time_s', { defaultValue: 'Disconnect Time (s)' })}</label>
                                    <input type="number" name="disconnection_time_s" value={formData.disconnection_time_s} onChange={handleChange} step="0.1" className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 bg-amber-500/5 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                            <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                <InformationCircleIcon className="h-4 w-4" />
                                {t('fallback_estimations', { defaultValue: 'Fallback Estimations' })}
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center text-[9px] font-black text-gray-500 uppercase mb-1">
                                        {t('fault_at_panel_ka', { defaultValue: 'Fault at Panel (kA)' })}
                                    </label>
                                    <input type="number" name="fault_current_ka" value={formData.fault_current_ka} onChange={handleChange} step="0.1" className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="flex items-center text-[9px] font-black text-gray-500 uppercase mb-1">
                                        {t('attenuation_z', { defaultValue: 'Attenuation (Z)' })}
                                    </label>
                                    <input type="number" name="assume_fault_at_load_fraction" value={formData.assume_fault_at_load_fraction} onChange={handleChange} step="0.05" className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white" placeholder="0.1" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? <LoadingSpinner text="Computing..." size="sm" /> : (
                            <><CalculatorIcon className="h-5 w-5" /> {t('calculate_compliance', { defaultValue: 'Calculate Compliance' })}</>
                        )}
                    </button>
                </div>
            </form>

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Final Badge */}
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 rounded-3xl text-white text-center shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
                        <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-3 backdrop-blur-md">
                            {t('recommended_cross_section', { defaultValue: 'Recommended Cross-Section' })}
                        </span>
                        <p className="text-6xl md:text-7xl font-black mb-3 tracking-tight font-mono">{result.final_selection.size_mm2} <span className="text-3xl font-extrabold text-indigo-200">mm²</span></p>
                        <p className="text-indigo-100 text-xs md:text-sm font-semibold max-w-lg mx-auto leading-relaxed">{result.final_message}</p>
                    </div>

                    {/* Derived Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t('current_load', { defaultValue: 'Current Load' }), val: `${formatNum(result.derived_values.load_current_a)} A`, accent: 'border-l-4 border-indigo-500' },
                            { label: t('target_ampacity', { defaultValue: 'Target Ampacity' }), val: `${formatNum(result.derived_values.effective_required_ampacity_a)} A`, accent: 'border-l-4 border-emerald-500' },
                            { label: t('sc_floor', { defaultValue: 'S/C Floor' }), val: `${formatNum(result.derived_values.short_circuit_min_mm2)} mm²`, accent: 'border-l-4 border-amber-500' },
                            { label: t('vdrop_cap', { defaultValue: 'VDrop Cap' }), val: `${formatNum(result.derived_values.allowable_vdrop_percent)} %`, accent: 'border-l-4 border-violet-500' }
                        ].map((s, idx) => (
                            <div key={idx} className={`bg-white dark:bg-gray-800/90 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm ${s.accent}`}>
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</span>
                                <span className="text-xl font-black text-gray-900 dark:text-white font-mono">{s.val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Reasoning Table */}
                    <div className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-sm overflow-hidden">
                        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('validation_reasoning', { defaultValue: 'Validation Reasoning' })}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{t('validation_reasoning_desc', { defaultValue: 'How the engine verified each standard IEC size against your constraints.' })}</p>
                            </div>
                            <ShieldCheckIcon className="h-6 w-6 text-indigo-500 shrink-0" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/80 dark:bg-gray-700/40 font-black tracking-widest">
                                    <tr>
                                        <th className="py-3.5 px-6">{t('size_col', { defaultValue: 'Size (mm²)' })}</th>
                                        <th className="py-3.5 px-6">{t('ampacity_col', { defaultValue: 'Ampacity' })}</th>
                                        <th className="py-3.5 px-6">{t('voltage_drop_col', { defaultValue: 'Voltage Drop' })}</th>
                                        <th className="py-3.5 px-6">{t('thermal_sc_col', { defaultValue: 'Thermal S/C' })}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {result.reasoning.map(step => (
                                        <tr key={step.size_mm2} className={getRowClass(step)}>
                                            <td className="py-4 px-6 font-black font-mono text-sm">{step.size_mm2} mm²</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.ampacity_ok ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" /> : <ExclamationTriangleIcon className="h-4 w-4 text-rose-500 shrink-0" />}
                                                    <span className="font-mono font-bold">{formatNum(step.derated_ampacity_a)} A</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.vdrop_ok ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" /> : <ExclamationTriangleIcon className="h-4 w-4 text-rose-500 shrink-0" />}
                                                    <span className="font-mono font-bold">{formatNum(step.voltage_drop_percent)} %</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {step.short_circuit_ok ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" /> : <ExclamationTriangleIcon className="h-4 w-4 text-rose-500 shrink-0" />}
                                                    <span className="font-bold">{step.short_circuit_ok ? t('compliant_label', { defaultValue: 'Compliant' }) : t('insufficient_label', { defaultValue: 'Insufficient' })}</span>
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