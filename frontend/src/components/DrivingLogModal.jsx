import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { 
    TruckIcon, 
    XMarkIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const DrivingLogModal = ({ isOpen, onClose, projectId }) => {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language.startsWith('is');

    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newLog, setNewLog] = useState({
        origin: '',
        destination: '',
        start_km: '',
        end_km: '',
        total_km: '',
        purpose: ''
    });

    const fetchDrivingLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/mileage/${projectId ? `?project_id=${projectId}` : ''}`);
            setLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch driving logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchDrivingLogs();
    }, [isOpen, projectId]);

    const handleCreateLog = async (e) => {
        e.preventDefault();
        const totalKmCalculated = newLog.total_km ? parseFloat(newLog.total_km) : (parseFloat(newLog.end_km) - parseFloat(newLog.start_km));
        if (isNaN(totalKmCalculated) || totalKmCalculated <= 0) {
            toast.error(isIcelandic ? 'Sláðu inn gildan kílómetrafjölda.' : 'Enter valid driving kilometers.');
            return;
        }
        try {
            await axiosInstance.post('/mileage/', {
                ...newLog,
                project_id: projectId || null,
                log_date: new Date().toISOString().split('T')[0],
                start_km: newLog.start_km ? parseFloat(newLog.start_km) : null,
                end_km: newLog.end_km ? parseFloat(newLog.end_km) : null,
                total_km: totalKmCalculated,
                rate_per_km: 140.0
            });
            toast.success(isIcelandic ? 'Akstur skráður í akstursdagbók!' : 'Mileage logged successfully!');
            setNewLog({ origin: '', destination: '', start_km: '', end_km: '', total_km: '', purpose: '' });
            fetchDrivingLogs();
        } catch (err) {
            toast.error('Failed to record driving log.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <TruckIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {isIcelandic ? 'Akstursdagbók & Reiknuð Ökukostnaður' : 'Vehicle Mileage & Travel Log'}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-medium">
                                {isIcelandic ? 'Skráðu akstur og kílómetragjald (140 kr/km) beint á verkefni.' : 'Log kilometers and driving expenses (140 ISK/km) directly to projects.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                <form onSubmit={handleCreateLog} className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                        {isIcelandic ? 'Skrá nýjan akstur' : 'Log New Trip'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder={isIcelandic ? 'Frá (Upphafstaður)' : 'Origin'}
                            value={newLog.origin}
                            onChange={(e) => setNewLog({...newLog, origin: e.target.value})}
                            className="px-3 py-2 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                        />
                        <input
                            type="text"
                            placeholder={isIcelandic ? 'Til (Áfangastaður)' : 'Destination'}
                            value={newLog.destination}
                            onChange={(e) => setNewLog({...newLog, destination: e.target.value})}
                            className="px-3 py-2 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                        />
                        <input
                            type="number"
                            placeholder={isIcelandic ? 'Heildar km*' : 'Total km*'}
                            value={newLog.total_km}
                            onChange={(e) => setNewLog({...newLog, total_km: e.target.value})}
                            className="px-3 py-2 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                        />
                        <input
                            type="text"
                            placeholder={isIcelandic ? 'Tilgangur ferðar' : 'Trip Purpose'}
                            value={newLog.purpose}
                            onChange={(e) => setNewLog({...newLog, purpose: e.target.value})}
                            className="px-3 py-2 bg-white dark:bg-gray-800 rounded-xl text-xs font-bold border-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-md shadow-indigo-500/20"
                    >
                        {isIcelandic ? 'Vista akstur í akstursdagbók' : 'Save Driving Log'}
                    </button>
                </form>

                {/* Driving Log History Table */}
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {isIcelandic ? 'Nýlegar akstursfærslur' : 'Recent Mileage Logs'}
                    </h4>
                    {isLoading ? (
                        <div className="text-center py-6 text-xs text-gray-400 font-bold animate-pulse">
                            {isIcelandic ? 'Sæki akstur...' : 'Loading logs...'}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400 font-bold">
                            {isIcelandic ? 'Enginn akstur skráður.' : 'No driving logs found.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-xs font-medium border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <span className="font-black text-gray-900 dark:text-white block">{log.origin || 'Start'} ➔ {log.destination || 'End'}</span>
                                        <span className="text-[10px] text-gray-400">{log.log_date} {log.purpose && `• ${log.purpose}`}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-indigo-600 dark:text-indigo-400 block">{log.total_km} km</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{(log.total_km * (log.rate_per_km || 140)).toLocaleString('is-IS')} ISK</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DrivingLogModal;
