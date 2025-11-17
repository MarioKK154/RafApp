// frontend/src/components/CableSizingCalculator.jsx
import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

// --- Data from your backend CABLE_DATA ---
// We mirror this on the frontend for the dropdowns
const INSTALLATION_METHODS = [
    { value: "in_air_spaced", label: "In Air (Spaced)" },
    { value: "clipped_direct", label: "Clipped Direct to Surface" },
    { value: "conduit_surface", label: "In Conduit on Surface" },
    { value: "conduit_embedded", label: "In Conduit (Embedded)" },
    { value: "buried_direct", label: "Buried Direct" },
    { value: "buried_in_duct", label: "Buried in Duct" }
];
const INSULATION_TYPES = [
    { value: "XLPE", label: "XLPE" },
    { value: "PVC", label: "PVC" }
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
    { value: "", label: "Use Custom VDrop %" },
    { value: "general_power", label: "General Power (5%)" },
    { value: "lighting", label: "Lighting (3%)" },
    { value: "motors", label: "Motors (5%)" },
    { value: "ev_chargers", label: "EV Chargers (5%)" },
    { value: "data_centers", label: "Data Centers (3%)" }
];

// Helper to format numbers for display
const formatNum = (num, digits = 2) => num ? num.toFixed(digits) : 'N/A';

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
        // --- UPDATED DEFAULTS ---
        fault_current_ka: 6.0,          // Keep default for when user enables it
        disconnection_time_s: 0.4,    // Keep default for when user enables it
        fault_current_at_load_ka: '', // NEW: Optional advanced field
        assume_fault_at_load_fraction: '', // NEW: Optional advanced field
    });
    
    // --- NEW STATE FOR TOGGLE ---
    const [enableSC, setEnableSC] = useState(false); // Default to disabled

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        
        setFormData(prev => {
            const newForm = { ...prev, [name]: value };
            
            // Auto-update voltage drop % if a load type is selected
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
        
        // Convert numbers
        const payload = {
            ...formData,
            voltage: parseFloat(formData.voltage),
            load_power_kw: parseFloat(formData.load_power_kw),
            power_factor: parseFloat(formData.power_factor),
            cable_length_m: parseFloat(formData.cable_length_m),
            ambient_temperature_c: parseInt(formData.ambient_temperature_c),
            allowable_vdrop_percent: parseFloat(formData.allowable_vdrop_percent),
            load_type: formData.load_type || null,

            // --- NEW: Add toggle and optional S/C fields ---
            enable_short_circuit_check: enableSC,

            // Send S/C fields as null if check is disabled
            fault_current_ka: enableSC ? parseFloat(formData.fault_current_ka) : null,
            disconnection_time_s: enableSC ? parseFloat(formData.disconnection_time_s) : null,
            fault_current_at_load_ka: (enableSC && formData.fault_current_at_load_ka) ? parseFloat(formData.fault_current_at_load_ka) : null,
            assume_fault_at_load_fraction: (enableSC && formData.assume_fault_at_load_fraction) ? parseFloat(formData.assume_fault_at_load_fraction) : null,
        };

        try {
            const response = await axiosInstance.post('/calculators/cable-size', payload);
            setResult(response.data);
            toast.success("Calculation complete!");
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Calculation failed. Please check inputs.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Helper to style the reasoning log rows
    const getRowClass = (step) => {
        if (!step.ampacity_ok || !step.vdrop_ok || !step.short_circuit_ok) {
            return 'bg-red-50 dark:bg-red-900/30 opacity-60';
        }
        if (result?.final_selection?.size_mm2 === step.size_mm2) {
            return 'bg-green-50 dark:bg-green-900/30 font-bold';
        }
        return 'bg-white dark:bg-gray-800';
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 border dark:border-gray-700 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* --- Column 1: Load --- */}
                    <div className="space-y-3">
                        <h4 className="font-semibold">Load</h4>
                        <div><label>Voltage System</label><select name="voltage_system" value={formData.voltage_system} onChange={handleChange} className="mt-1 w-full rounded">{VOLTAGE_SYSTEMS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                        <div><label>Voltage (V)</label><input type="number" name="voltage" value={formData.voltage} onChange={handleChange} className="mt-1 w-full rounded"/></div>
                        <div><label>Load Power (kW)</label><input type="number" name="load_power_kw" value={formData.load_power_kw} onChange={handleChange} className="mt-1 w-full rounded"/></div>
                        <div><label>Power Factor (PF)</label><input type="number" name="power_factor" value={formData.power_factor} onChange={handleChange} step="0.01" min="0.1" max="1" className="mt-1 w-full rounded"/></div>
                    </div>
                    {/* --- Column 2: Installation --- */}
                    <div className="space-y-3">
                        <h4 className="font-semibold">Cable & Installation</h4>
                        <div><label>Length (meters)</label><input type="number" name="cable_length_m" value={formData.cable_length_m} onChange={handleChange} className="mt-1 w-full rounded"/></div>
                        <div><label>Material</label><select name="material" value={formData.material} onChange={handleChange} className="mt-1 w-full rounded">{MATERIALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                        <div><label>Insulation</label><select name="insulation" value={formData.insulation} onChange={handleChange} className="mt-1 w-full rounded">{INSULATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                        <div><label>Installation Method</label><select name="installation_method" value={formData.installation_method} onChange={handleChange} className="mt-1 w-full rounded">{INSTALLATION_METHODS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                        <div><label>Ambient Temp. (°C)</label><input type="number" name="ambient_temperature_c" value={formData.ambient_temperature_c} onChange={handleChange} className="mt-1 w-full rounded"/></div>
                    </div>
                    {/* --- Column 3: Requirements --- */}
                    <div className="space-y-3">
                        <h4 className="font-semibold">Requirements</h4>
                        <div><label>Load Type</label><select name="load_type" value={formData.load_type} onChange={handleChange} className="mt-1 w-full rounded">{LOAD_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                        <div><label>Allowable VDrop (%)</label><input type="number" name="allowable_vdrop_percent" value={formData.allowable_vdrop_percent} onChange={handleChange} step="0.1" min="0.1" className="mt-1 w-full rounded" readOnly={formData.load_type !== ''}/></div>
                        
                        {/* --- NEW: Short Circuit Toggle --- */}
                        <div className="pt-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={enableSC} 
                                    onChange={(e) => setEnableSC(e.target.checked)} 
                                    className="h-4 w-4 rounded text-blue-600"
                                />
                                <span className="font-medium">Enable Short-Circuit Check</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* --- NEW: Conditional S/C Fields --- */}
                {enableSC && (
                    <div className="pt-4 border-t dark:border-gray-700 space-y-4">
                        <h4 className="text-lg font-semibold text-orange-600 dark:text-orange-400">Short-Circuit Check (Advanced)</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            You can provide the *actual* fault current at the load, or provide the *source* fault current (e.g., at the panel) and we will estimate the reduction.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Fault at Load (kA)</label><input type="number" name="fault_current_at_load_ka" value={formData.fault_current_at_load_ka} onChange={handleChange} step="0.1" min="0.1" className="mt-1 w-full rounded" placeholder="Preferred"/></div>
                            <div><label>Disconnection Time (s)</label><input type="number" name="disconnection_time_s" value={formData.disconnection_time_s} onChange={handleChange} step="0.1" min="0.1" className="mt-1 w-full rounded"/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label>Fault at Source (kA)</label><input type="number" name="fault_current_ka" value={formData.fault_current_ka} onChange={handleChange} step="0.1" min="0.1" className="mt-1 w-full rounded" placeholder="Fallback"/></div>
                            <div><label>Attenuation Fraction</label><input type="number" name="assume_fault_at_load_fraction" value={formData.assume_fault_at_load_fraction} onChange={handleChange} step="0.1" min="0" max="1" className="mt-1 w-full rounded" placeholder="Default: 0.1 (10%)"/></div>
                        </div>
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="pt-2 text-right">
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {isSubmitting ? <LoadingSpinner text="Calculating..." size="sm" /> : 'Calculate'}
                    </button>
                </div>
            </form>

            {/* --- Result Display (Unchanged) --- */}
            {result && (
                <div className="space-y-6">
                    {/* --- Final Result --- */}
                    <div className="text-center bg-green-50 dark:bg-green-900/30 p-6 rounded-lg">
                        <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 uppercase">Selected Cable Size</h3>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">{result.final_selection.size_mm2} mm²</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.final_message}</p>
                    </div>

                    {/* --- Derived Values --- */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded"><span className="block text-xs uppercase">Load Current</span><span className="font-semibold text-lg">{formatNum(result.derived_values.load_current_a)} A</span></div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded"><span className="block text-xs uppercase">Required Ampacity</span><span className="font-semibold text-lg">{formatNum(result.derived_values.effective_required_ampacity_a)} A</span></div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded"><span className="block text-xs uppercase">Min. Size (S/C)</span><span className="font-semibold text-lg">{formatNum(result.derived_values.short_circuit_min_mm2)} mm²</span></div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded"><span className="block text-xs uppercase">Allowable VDrop</span><span className="font-semibold text-lg">{formatNum(result.derived_values.allowable_vdrop_percent)}%</span></div>
                    </div>

                    {/* --- Reasoning Table --- */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Calculation Reasoning</h3>
                        <div className="overflow-x-auto shadow-md rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="py-2 px-3">Size (mm²)</th>
                                        <th className="py-2 px-3">Ampacity (OK?)</th>
                                        <th className="py-2 px-3">VDrop (OK?)</th>
                                        <th className="py-2 px-3">S/C (OK?)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {result.reasoning.map(step => (
                                        <tr key={step.size_mm2} className={getRowClass(step)}>
                                            <td className="py-2 px-3">{step.size_mm2}</td>
                                            <td className={`py-2 px-3 ${step.ampacity_ok ? 'text-green-600' : 'text-red-600'}`}>{formatNum(step.derated_ampacity_a)} A</td>
                                            <td className={`py-2 px-3 ${step.vdrop_ok ? 'text-green-600' : 'text-red-600'}`}>{formatNum(step.voltage_drop_percent)}%</td>
                                            <td className={`py-2 px-3 ${step.short_circuit_ok ? 'text-green-600' : 'text-red-600'}`}>{step.short_circuit_ok ? 'Pass' : 'Fail'}</td>
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