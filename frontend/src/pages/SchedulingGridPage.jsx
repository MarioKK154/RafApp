import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    TrashIcon,
    Squares2X2Icon,
    BuildingOffice2Icon,
    ExclamationTriangleIcon,
    UserMinusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import AssignmentModal from '../components/AssignmentModal'; 

const SchedulingGridPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isSuperuser = !!user?.is_superuser;
    const [viewDate, setViewDate] = useState(new Date());
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedCity, setSelectedCity] = useState('All');
            const [isLoading, setIsLoading] = useState(true);
    const [leaveBlocks, setLeaveBlocks] = useState([]);
    const [showLeaveOverlay, setShowLeaveOverlay] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        user: null,
        date: null
    });

    const days = useMemo(() => {
        const start = startOfWeek(viewDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end: addDays(start, 13) });
    }, [viewDate]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const startStr = format(days[0], 'yyyy-MM-dd');
            const endStr = format(days[days.length - 1], 'yyyy-MM-dd');
            const tenantScope = {};
            
            const leaveParams = {
                start: startStr,
                end: endStr,
                
            };
            const [usersRes, assignRes, leaveRes] = await Promise.all([
                axiosInstance.get('/users/', { params: { ...tenantScope } }),
                axiosInstance.get('/assignments/', { params: { start: startStr, end: endStr, ...tenantScope } }),
                axiosInstance.get('/accounting/leave-requests/calendar', { params: leaveParams }),
            ]);

            setUsers(usersRes.data);
            setAssignments(assignRes.data);
            setLeaveBlocks(Array.isArray(leaveRes.data) ? leaveRes.data : []);
        } catch (error) {
            console.error('Scheduling grid sync failed:', error);
            toast.error("Failed to sync resource grid.");
        } finally {
            setIsLoading(false);
        }
    }, [days]);

    useEffect(() => { fetchData(); }, [fetchData]);

    
    // Handle Deletion of an Assignment Node
    const handleDeleteAssignment = async (assignmentId, projectName, userName) => {
        if (window.confirm(`Are you sure you want to remove ${userName} from project ${projectName}?`)) {
            try {
                await axiosInstance.delete(`/assignments/${assignmentId}`);
                toast.success("Assignment purged from registry.");
                fetchData(); // Refresh grid
            } catch (error) {
                console.error('Delete assignment failed:', error);
                toast.error("Failed to delete assignment.");
            }
        }
    };

    const cities = useMemo(() => {
        const uniqueCities = [...new Set(users.map(u => u.city).filter(Boolean))];
        const hasUnassigned = users.some(u => !u.city);
        const list = ['All', ...uniqueCities.sort()];
        if (hasUnassigned) list.push('Unassigned');
        return list;
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (selectedCity === 'All') return users;
        if (selectedCity === 'Unassigned') return users.filter(u => !u.city);
        return users.filter(u => u.city === selectedCity);
    }, [users, selectedCity]);
        
    const openAssignmentModal = (user, day) => {
        setModalConfig({ isOpen: true, user: user, date: day });
    };

    const leaveOnDay = useCallback(
        (userId, day) => {
            if (!showLeaveOverlay || !leaveBlocks.length) return null;
            const ds = format(day, 'yyyy-MM-dd');
            return (
                leaveBlocks.find(
                    (b) =>
                        b.user_id === userId &&
                        String(b.start_date) <= ds &&
                        String(b.end_date) >= ds,
                ) || null
            );
        },
        [leaveBlocks, showLeaveOverlay],
    );

    return (
        <div className="p-6 md:p-10 animate-in fade-in duration-500">
            {isLoading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-2xl shadow-xl text-sm font-bold text-gray-700 dark:text-gray-200">
                        Syncing schedule...
                    </div>
                </div>
            )}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Squares2X2Icon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('schedule', { defaultValue: 'Schedule' })}</h1>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <button onClick={() => setViewDate(addDays(viewDate, -7))} className="p-2.5 rounded-xl transition-all duration-150 ease-out text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95">
                        <ChevronLeftIcon className="h-5 w-5 stroke-[2.5px]" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest px-4 text-gray-600 dark:text-gray-300">
                        {format(days[0], 'MMM dd')} — {format(days[13], 'MMM dd, yyyy')}
                    </span>
                    <button onClick={() => setViewDate(addDays(viewDate, 7))} className="p-2.5 rounded-xl transition-all duration-150 ease-out text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95">
                        <ChevronRightIcon className="h-5 w-5 stroke-[2.5px]" />
                    </button>
                </div>
                </div>
            </header>

            <div className="flex flex-wrap gap-3 mb-8">
                
                {cities.map(city => {
                    const count = city === 'All' ? users.length : city === 'Unassigned' ? users.filter(u => !u.city).length : users.filter(u => u.city === city).length;
                    return (
                        <button key={city} onClick={() => setSelectedCity(city)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-150 ease-out flex items-center gap-3 ${selectedCity === city ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-300 hover:shadow-indigo-400 hover:-translate-y-0.5' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-indigo-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'}`}>
                            {city} <span className={`px-2 py-0.5 rounded-lg text-[9px] ${selectedCity === city ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{count}</span>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setShowLeaveOverlay((v) => !v)}
                    title={t('schedule_leave_overlay_hint', {
                        defaultValue: 'Show approved sick leave, vacation, and other leave on the grid',
                    })}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-150 ease-out inline-flex items-center gap-2 ${
                        showLeaveOverlay
                            ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-rose-600'
                    }`}
                >
                    <UserMinusIcon className="h-4 w-4" />
                    {t('schedule_show_leave', { defaultValue: 'Away overlay' })}
                </button>
            </div>

            {showLeaveOverlay && (
                <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                    {t('schedule_leave_overlay_legend', {
                        defaultValue:
                            'Striped / tinted cells: approved leave (vacation, sick, …). You can still assign—check conflicts in the assignment panel.',
                    })}
                </p>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                            <th className="p-6 text-left border-r border-gray-100 dark:border-gray-800 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 min-w-[280px]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel Node</span>
                            </th>
                            {days.map(day => (
                                <th key={day.toString()} className={`p-4 border-r border-gray-100 dark:border-gray-800 min-w-[110px] ${[0, 6].includes(day.getDay()) ? 'bg-gray-100/50 dark:bg-gray-900/50' : ''}`}>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">{format(day, 'EEE')}</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white leading-none">{format(day, 'dd')}</p>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="p-6 border-r border-gray-100 dark:border-gray-800 sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800 z-10 shadow-[5px_0_15px_rgba(0,0,0,0.02)]">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 text-xs font-black shadow-sm">
                                            {user.full_name?.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase truncate leading-none mb-1.5">{user.full_name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{user.city || 'Sector: NA'}</p>
                                        </div>
                                    </div>
                                </td>
                                {days.map(day => {
                                    const userAssign = assignments.find(a => 
                                        a.user_id === user.id && 
                                        new Date(a.start_date) <= day && 
                                        new Date(a.end_date) >= day
                                    );
                                    const leaveHit = leaveOnDay(user.id, day);

                                    return (
                                        <td key={day.toString()} className="p-2 border-r border-gray-50 dark:border-gray-800 relative h-24 group/cell">
                                            {leaveHit && (
                                                <div
                                                    className="absolute inset-1 rounded-2xl pointer-events-none z-[1] border border-rose-300/70 dark:border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/35"
                                                    style={{
                                                        backgroundImage:
                                                            'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(244,63,94,0.12) 4px, rgba(244,63,94,0.12) 8px)',
                                                    }}
                                                    title={leaveHit.leave_type}
                                                />
                                            )}
                                            {leaveHit && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 z-[2] px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter text-rose-800 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-900/80 max-w-[95%] truncate pointer-events-none">
                                                    {leaveHit.leave_type}
                                                </span>
                                            )}
                                            {userAssign ? (
                                                <div 
                                                    onClick={() => handleDeleteAssignment(userAssign.id, userAssign.project_name, user.full_name)}
                                                    className="absolute inset-1.5 z-[5] bg-indigo-600 hover:bg-red-600 rounded-2xl p-3 shadow-lg shadow-indigo-100 dark:shadow-none flex flex-col justify-center overflow-hidden cursor-pointer hover:scale-[1.03] active:scale-95 transition-all group/assign"
                                                >
                                                    <div className="group-hover/assign:hidden animate-in fade-in duration-300">
                                                        <p className="text-[8px] font-black text-indigo-200 uppercase tracking-tighter truncate mb-1">
                                                            #{userAssign.project_number}
                                                        </p>
                                                        <p className="text-[9px] font-black text-white uppercase leading-tight truncate">
                                                            {userAssign.project_name}
                                                        </p>
                                                    </div>
                                                    <div className="hidden group-hover/assign:flex flex-col items-center justify-center text-white animate-in zoom-in duration-200">
                                                        <TrashIcon className="h-5 w-5 mb-1" />
                                                        <span className="text-[8px] font-black uppercase">Remove</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => openAssignmentModal(user, day)}
                                                    className="w-full h-full relative z-[6] opacity-0 group-hover/cell:opacity-100 flex items-center justify-center text-indigo-300 hover:text-indigo-600 hover:scale-125 transition-all"
                                                >
                                                    <PlusIcon className="h-6 w-6 stroke-[2.5px]" />
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AssignmentModal 
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                selectedUser={modalConfig.user}
                selectedDate={modalConfig.date}
                leaveBlocks={leaveBlocks}
                onAssignmentCreated={fetchData}
            />
        </div>
    );
};

export default SchedulingGridPage;