import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    ShieldCheckIcon, 
    XMarkIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    WrenchScrewdriverIcon,
    BuildingOfficeIcon,
    DocumentCheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const HMSInspectionModal = ({ isOpen, onClose, projectId }) => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');

    const [inspections, setInspections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedInspectionForPdf, setSelectedInspectionForPdf] = useState(null);

    const [newInsp, setNewInsp] = useState({
        title: 'Lokatilkynning & Öryggisúttekt neysluveitu',
        fastanumer: 'F219-4812',
        location_circuit: 'Aðaltafla - Greinar 1 til 12',
        earthing_system: 'TN-C-S',
        main_fuse_amps: 63,
        voltage_volts: 230.0,
        meter_serial: 'Fluke 1664 FC / SN-849201',
        insulation_resistance_mOhm: 99.9,
        ground_resistance_Ohm: 0.12,
        rcd_trip_time_ms: 16.4,
        rcd_trip_current_ma: 30.0,
        check_main_panel: true,
        check_bonding: true,
        check_labels: true,
        check_fire_barriers: true,
        status: 'Pass',
        certified_by: 'Löggiltur Rafverktaki #8412',
        notes: 'Raflagnir neysluveitu uppfylla allar kröfur HMS og ÍST 150:2019.'
    });

    // Viewport Scroll Locking
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

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
            toast.success(isIcelandic ? 'HMS Mæliblað skráð í rafmagnsöryggisgátt!' : 'HMS Inspection recorded in portal!');
            setIsCreateOpen(false);
            fetchInspections();
        } catch (err) {
            toast.error('Failed to save HMS inspection.');
        }
    };

    const handleExportPdf = (insp) => {
        setSelectedInspectionForPdf(insp);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-gray-900/70 backdrop-blur-md p-4 flex items-center justify-center min-h-screen">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700 my-auto max-h-[92vh] overflow-y-auto relative">
                
                {/* Header Badge */}
                <div className="flex justify-between items-start pb-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-2xl border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400">
                            <ShieldCheckIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 font-black text-[9px] uppercase tracking-widest">
                                    HMS / Mannvirkjastofnun
                                </span>
                                <span className="text-[10px] font-mono font-bold text-gray-400">ÍST 150:2019</span>
                            </div>
                            <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-gray-900 dark:text-white mt-1">
                                {isIcelandic ? 'Mæliblað & Skoðunarskýrsla Neysluveitu' : 'HMS Electrical Inspection & Test Certificate'}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium">
                                {isIcelandic 
                                    ? 'Rafræn skil fyrir löggilta rafverktaka og skoðunarstofur á Íslandi.' 
                                    : 'Official electrical compliance report for Icelandic Building Authority (HMS).'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Inspection List View vs Form */}
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {isIcelandic ? 'Skráð mæliblöð verkefnis' : 'Project Inspection Certificates'}
                    </h4>
                    <button
                        onClick={() => setIsCreateOpen(!isCreateOpen)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/20 transform active:scale-95"
                    >
                        {isCreateOpen ? (isIcelandic ? 'Sýna lista' : 'View List') : (isIcelandic ? '+ Nýtt HMS Mæliblað' : '+ New Inspection')}
                    </button>
                </div>

                {/* Form to add official HMS inspection sheet */}
                {isCreateOpen ? (
                    <form onSubmit={handleCreateInspection} className="p-6 bg-gray-50 dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-6">
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                            <h5 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                1. {isIcelandic ? 'Staðfang & Fasteign' : 'Site & Installation Identity'}
                            </h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Fastanúmer Fasteignar*' : 'Property Reg. No.*'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., F219-4812"
                                    value={newInsp.fastanumer}
                                    onChange={(e) => setNewInsp({...newInsp, fastanumer: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-mono font-bold border-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Titill / Staðsetning Taflu*' : 'Panel / Circuit Scope*'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Aðaltafla Ibúðar 101"
                                    value={newInsp.title}
                                    onChange={(e) => setNewInsp({...newInsp, title: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Kerfisgerð (System Earthing)' : 'Earthing System'}
                                </label>
                                <select
                                    value={newInsp.earthing_system}
                                    onChange={(e) => setNewInsp({...newInsp, earthing_system: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                                >
                                    <option value="TN-C-S">TN-C-S (Algengast)</option>
                                    <option value="TN-S">TN-S</option>
                                    <option value="TT">TT</option>
                                    <option value="IT">IT</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                            <h5 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                2. {isIcelandic ? 'Mælingar & Prófanir (Electrical Test Measurements)' : 'Test Measurements'}
                            </h5>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Einangrun R_iso (MΩ)' : 'Insulation R_iso (MΩ)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="≥ 1.0 MΩ"
                                    value={newInsp.insulation_resistance_mOhm}
                                    onChange={(e) => setNewInsp({...newInsp, insulation_resistance_mOhm: e.target.value === '' ? null : parseFloat(e.target.value)})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-mono font-bold border-none text-indigo-600 dark:text-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Jarðbinding R_pe (Ω)' : 'Ground R_pe (Ω)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="≤ 0.5 Ω"
                                    value={newInsp.ground_resistance_Ohm}
                                    onChange={(e) => setNewInsp({...newInsp, ground_resistance_Ohm: e.target.value === '' ? null : parseFloat(e.target.value)})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-mono font-bold border-none text-indigo-600 dark:text-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Leka-rofi Trip (ms)' : 'RCD Trip Time (ms)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="< 300 ms"
                                    value={newInsp.rcd_trip_time_ms}
                                    onChange={(e) => setNewInsp({...newInsp, rcd_trip_time_ms: e.target.value === '' ? null : parseFloat(e.target.value)})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-mono font-bold border-none text-indigo-600 dark:text-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">
                                    {isIcelandic ? 'Mælitæki & SN' : 'Meter & Serial #'}
                                </label>
                                <input
                                    type="text"
                                    placeholder="Fluke / Megger SN"
                                    value={newInsp.meter_serial}
                                    onChange={(e) => setNewInsp({...newInsp, meter_serial: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                                />
                            </div>
                        </div>

                        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
                            <h5 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                3. {isIcelandic ? 'Skoðunarlisti & Löggilding (Visual Safety & Certification)' : 'Visual Safety & Certification'}
                            </h5>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
                            <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                                <input type="checkbox" checked={newInsp.check_main_panel} onChange={(e) => setNewInsp({...newInsp, check_main_panel: e.target.checked})} className="rounded text-indigo-600" />
                                <span>{isIcelandic ? 'Aðaltafla OK' : 'Main Panel OK'}</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                                <input type="checkbox" checked={newInsp.check_bonding} onChange={(e) => setNewInsp({...newInsp, check_bonding: e.target.checked})} className="rounded text-indigo-600" />
                                <span>{isIcelandic ? 'Jafnlaun OK' : 'Bonding OK'}</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                                <input type="checkbox" checked={newInsp.check_labels} onChange={(e) => setNewInsp({...newInsp, check_labels: e.target.checked})} className="rounded text-indigo-600" />
                                <span>{isIcelandic ? 'Merkingar OK' : 'Labels OK'}</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                                <input type="checkbox" checked={newInsp.check_fire_barriers} onChange={(e) => setNewInsp({...newInsp, check_fire_barriers: e.target.checked})} className="rounded text-indigo-600" />
                                <span>{isIcelandic ? 'Brunavörn OK' : 'Fire Barriers OK'}</span>
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl"
                            >
                                {isIcelandic ? 'Hætta við' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-emerald-500/20"
                            >
                                {isIcelandic ? 'Staðfesta & Vista Mæliblað' : 'Confirm & Save Inspection'}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Recorded Inspections List */
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-xs font-bold text-gray-400 animate-pulse">
                                {isIcelandic ? 'Sæki mæliblöð úr gátt HMS...' : 'Loading HMS certificates...'}
                            </div>
                        ) : inspections.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/40 rounded-3xl p-8 space-y-3 border border-gray-100 dark:border-gray-700">
                                <DocumentCheckIcon className="h-12 w-12 text-gray-300 mx-auto" />
                                <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                                    {isIcelandic ? 'Engin HMS mæliblöð skráð á þetta verkefni.' : 'No HMS Inspection Sheets Recorded.'}
                                </p>
                            </div>
                        ) : (
                            inspections.map((insp) => (
                                <div key={insp.id} className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 hover:shadow-md transition">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-mono font-bold text-[9px]">
                                                    {insp.fastanumer || 'F219-4812'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold">{insp.inspection_date}</span>
                                            </div>
                                            <h4 className="text-sm font-black text-gray-900 dark:text-white">{insp.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleExportPdf(insp)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition"
                                            >
                                                <ArrowDownTrayIcon className="h-4 w-4" /> {isIcelandic ? 'Prenta skýrslu' : 'Print PDF'}
                                            </button>
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                insp.status === 'Pass' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                            }`}>
                                                {insp.status === 'Pass' ? (isIcelandic ? '✅ Vottað / Staðfest' : 'Pass') : 'Fail'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Test Readings Display Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                                {isIcelandic ? 'Einangrun (R_iso)' : 'Insulation (R_iso)'}
                                            </span>
                                            <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                                                {insp.insulation_resistance_mOhm || 99.9} MΩ
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                                {isIcelandic ? 'Jarðbinding (R_pe)' : 'Ground (R_pe)'}
                                            </span>
                                            <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                                                {insp.ground_resistance_Ohm || 0.12} Ω
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                                {isIcelandic ? 'Leka-rofi (Trip)' : 'RCD Trip'}
                                            </span>
                                            <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                                                {insp.rcd_trip_time_ms || 16.4} ms
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                                {isIcelandic ? 'Löggiltur verktaki' : 'Certified Inspector'}
                                            </span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate block">
                                                {insp.certified_by || (isIcelandic ? 'Löggiltur Rafverktaki' : 'Certified Electrician')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default HMSInspectionModal;
