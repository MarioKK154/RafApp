import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    ShieldCheckIcon, 
    XMarkIcon,
    ArrowDownTrayIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const HMSInspectionModal = ({ isOpen, onClose, projectId }) => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');

    const [inspections, setInspections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [newInsp, setNewInsp] = useState({
        title: 'Einangrunarmæling stofns',
        location_circuit: 'Aðaltafla - Grein 1-4',
        insulation_resistance_mOhm: 50.0,
        ground_resistance_Ohm: 0.15,
        rcd_trip_time_ms: 18.5,
        status: 'Pass',
        certified_by: '',
        notes: ''
    });

    const fetchInspections = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/hms-inspections/?project_id=${projectId}`);
            setInspections(res.data || []);
        } catch (err) {
            console.error('Failed to fetch HMS inspections:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && projectId) fetchInspections();
    }, [isOpen, projectId]);

    const handleCreateInspection = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/hms-inspections/', {
                ...newInsp,
                project_id: projectId,
                inspection_date: new Date().toISOString().split('T')[0]
            });
            toast.success(isIcelandic ? 'HMS Mæliblað skráð!' : 'HMS Inspection recorded!');
            setIsCreateOpen(false);
            fetchInspections();
        } catch (err) {
            toast.error('Failed to save HMS inspection.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'HMS Rafmagnsöryggisgátt - Mæliblað & Öryggisúttekt' : 'HMS Electrical Inspection & Test Sheet'}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {isIcelandic ? 'Einangrunarmælingar, jarðbindingar og leka-rofar fyrir löggilta rafverktaka.' : 'Insulation resistance, grounding, and RCD safety compliance.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {isIcelandic ? 'Skráð mæliblöð' : 'Recorded Inspection Reports'}
                    </h4>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition"
                    >
                        {isIcelandic ? '+ Ný mæling' : '+ New Inspection'}
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-xs font-bold text-gray-400 animate-pulse">
                        {isIcelandic ? 'Hlað mælingum...' : 'Loading inspections...'}
                    </div>
                ) : inspections.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-6 text-gray-400 text-xs font-bold">
                        {isIcelandic ? 'Engin HMS mæliblöð skráð á þetta verkefni.' : 'No HMS safety inspection records for this project.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {inspections.map((insp) => (
                            <div key={insp.id} className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h5 className="text-xs font-black text-gray-900 dark:text-white">{insp.title}</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">📍 {insp.location_circuit || 'N/A'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                        insp.status === 'Pass' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                    }`}>
                                        {insp.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] font-mono">
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-400 block text-[8px] font-black uppercase">{isIcelandic ? 'Einangrun (R_iso)' : 'Insulation (R_iso)'}</span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{insp.insulation_resistance_mOhm} MΩ</span>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-400 block text-[8px] font-black uppercase">{isIcelandic ? 'Jarðbinding (R_pe)' : 'Ground (R_pe)'}</span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{insp.ground_resistance_Ohm} Ω</span>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-400 block text-[8px] font-black uppercase">{isIcelandic ? 'Leka-rofi (Trip)' : 'RCD Trip'}</span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{insp.rcd_trip_time_ms} ms</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Inspection Sub-Form */}
                {isCreateOpen && (
                    <form onSubmit={handleCreateInspection} className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-3">
                        <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                            {isIcelandic ? 'Skrá nýtt mæliblað' : 'Record New Safety Test'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                type="text"
                                required
                                placeholder={isIcelandic ? 'Titill mælingar*' : 'Test Title*'}
                                value={newInsp.title}
                                onChange={(e) => setNewInsp({...newInsp, title: e.target.value})}
                                className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <input
                                type="text"
                                placeholder={isIcelandic ? 'Stafnr / Tafla / Rás' : 'Circuit / Panel'}
                                value={newInsp.location_circuit}
                                onChange={(e) => setNewInsp({...newInsp, location_circuit: e.target.value})}
                                className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <input
                                type="number"
                                step="0.1"
                                placeholder={isIcelandic ? 'Einangrun R_iso (MΩ)' : 'Insulation R_iso (MΩ)'}
                                value={newInsp.insulation_resistance_mOhm}
                                onChange={(e) => setNewInsp({...newInsp, insulation_resistance_mOhm: parseFloat(e.target.value)})}
                                className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                            <input
                                type="number"
                                step="0.01"
                                placeholder={isIcelandic ? 'Jarðbinding R_pe (Ω)' : 'Ground R_pe (Ω)'}
                                value={newInsp.ground_resistance_Ohm}
                                onChange={(e) => setNewInsp({...newInsp, ground_resistance_Ohm: parseFloat(e.target.value)})}
                                className="px-3 py-2 bg-white dark:bg-gray-900 rounded-xl text-xs font-bold border-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl"
                            >
                                {isIcelandic ? 'Hætta við' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                            >
                                {isIcelandic ? 'Vista HMS Mælingar' : 'Save Inspection'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default HMSInspectionModal;
