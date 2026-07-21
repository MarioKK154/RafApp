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
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const isSuperuser = !!user?.is_superuser;
    const [viewDate, setViewDate] = useState(new Date());
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    // PM-visible user IDs derived from project membership (date-independent)
    const [pmVisibleUserIds, setPmVisibleUserIds] = useState(null); // null = not yet loaded
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

            const leaveParams = { start: startStr, end: endStr };

            const [usersRes, assignRes, leaveRes] = await Promise.all([
                axiosInstance.get('/users/'),
                axiosInstance.get('/assignments/', { params: { start: startStr, end: endStr } }),
                axiosInstance.get('/accounting/leave-requests/calendar', { params: leaveParams }),
            ]);

            setUsers(usersRes.data);
            setAssignments(assignRes.data);
            setLeaveBlocks(Array.isArray(leaveRes.data) ? leaveRes.data : []);
        } catch (error) {
            console.error('Scheduling grid sync failed:', error);
            toast.error(t('toast_sync_resource_grid_failed'));
        } finally {
            setIsLoading(false);
        }
    }, [days]);

    // For PM role: fetch managed projects (with member_ids) once on mount.
    // This gives us the correct project team membership regardless of the
    // currently-visible schedule window.
    useEffect(() => {
        const isPM = user?.role === 'project manager';
        const isAdmin = user?.role === 'admin' || user?.is_superuser;
        if (!isPM || isAdmin) return;
        axiosInstance.get('/projects/managed')
            .then(res => {
                const projects = res.data || [];
                // Collect all member_ids across all managed projects + PM themselves
                const ids = new Set();
                ids.add(user.id);
                projects.forEach(p => {
                    // member_ids is now returned by the backend
                    (p.member_ids || []).forEach(uid => ids.add(uid));
                    // Also include the project_manager explicitly
                    if (p.project_manager?.id) ids.add(p.project_manager.id);
                });
                setPmVisibleUserIds(ids);
            })
            .catch(err => {
                console.error('Failed to fetch PM managed projects:', err);
                // On error, fallback: show only the PM themselves
                setPmVisibleUserIds(new Set([user?.id]));
            });
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    
    const isAdmin = Boolean(user?.role === 'admin' || user?.is_superuser);
    const isPM = Boolean(user?.role === 'project manager');
    const canEdit = isAdmin; // Admins have full editing clearance

    // RBAC Personnel Roster Scope:
    // - Admin/Superuser: All tenant users
    // - PM: All members of projects they manage (from project_members_table, date-independent)
    //       Falls back to self-only while the project membership data is loading
    // - Electrician & Team Leader: Self only
    const visibleUsers = useMemo(() => {
        if (!users || users.length === 0) return [];
        if (isAdmin) return users;
        if (isPM) {
            // pmVisibleUserIds is null while loading, Set once loaded
            if (pmVisibleUserIds === null) {
                // Still loading — show only self to avoid a flash of wrong data
                return users.filter(u => u.id === user?.id);
            }
            return users.filter(u => pmVisibleUserIds.has(u.id));
        }
        return users.filter(u => u.id === user?.id);
    }, [users, pmVisibleUserIds, user, isAdmin, isPM]);

    // Handle Deletion of an Assignment Node
    const handleDeleteAssignment = async (assignmentId, projectName, userName) => {
        if (!canEdit) {
            toast.info(t('toast_schedule_modifications_restricted'));
            return;
        }
        if (window.confirm(t('confirm_remove_assignment', { userName, projectName }))) {
            try {
                await axiosInstance.delete(`/assignments/${assignmentId}`);
                toast.success(t('toast_assignment_purged'));
                fetchData(); // Refresh grid
            } catch (error) {
                console.error('Delete assignment failed:', error);
                toast.error(t('toast_delete_assignment_failed'));
            }
        }
    };

    const cities = useMemo(() => {
        const uniqueCities = [...new Set(visibleUsers.map(u => u.city).filter(Boolean))];
        const hasUnassigned = visibleUsers.some(u => !u.city);
        const list = ['All', ...uniqueCities.sort()];
        if (hasUnassigned) list.push('Unassigned');
        return list;
    }, [visibleUsers]);

    const filteredUsers = useMemo(() => {
        if (selectedCity === 'All') return visibleUsers;
        if (selectedCity === 'Unassigned') return visibleUsers.filter(u => !u.city);
        return visibleUsers.filter(u => u.city === selectedCity);
    }, [visibleUsers, selectedCity]);
        
    const openAssignmentModal = (targetUser, day) => {
        if (!canEdit) return;
        setModalConfig({ isOpen: true, user: targetUser, date: day });
    };

    const translateLeaveType = useCallback((rawType) => {
        if (!rawType) return '';
        const key = rawType.toLowerCase().replace(/\s+/g, '_');
        const isIcelandic = i18n.language.startsWith('is');
        
        const leaveMap = {
            vacation: isIcelandic ? 'Orlof' : 'Vacation',
            sick: isIcelandic ? 'Veikindi' : 'Sick Leave',
            sick_leave: isIcelandic ? 'Veikindaleyfi' : 'Sick Leave',
            unpaid: isIcelandic ? 'Launalaust leyfi' : 'Unpaid Leave',
            unpaid_leave: isIcelandic ? 'Launalaust leyfi' : 'Unpaid Leave',
            paternal_maternal: isIcelandic ? 'Fæðingarorlof' : 'Parental Leave',
            parental: isIcelandic ? 'Fæðingarorlof' : 'Parental Leave',
            other: isIcelandic ? 'Annað' : 'Other'
        };

        if (leaveMap[key]) return leaveMap[key];
        return t(rawType, { defaultValue: rawType });
    }, [i18n.language, t]);

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
                        {t('syncing_schedule', { defaultValue: 'Syncing schedule...' })}
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
                    const displayCity = city === 'All' ? t('all', { defaultValue: 'All' }) : city === 'Unassigned' ? t('unassigned', { defaultValue: 'Unassigned' }) : city;
                    return (
                        <button key={city} onClick={() => setSelectedCity(city)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-150 ease-out flex items-center gap-3 ${selectedCity === city ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-300 hover:shadow-indigo-400 hover:-translate-y-0.5' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-indigo-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'}`}>
                            {displayCity} <span className={`px-2 py-0.5 rounded-lg text-[9px] ${selectedCity === city ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{count}</span>
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
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('personnel_node', { defaultValue: 'Personnel Node' })}</span>
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
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{user.city || t('sector_na', { defaultValue: 'Sector: NA' })}</p>
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
                                                    title={translateLeaveType(leaveHit.leave_type)}
                                                />
                                            )}
                                            {leaveHit && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 z-[2] px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter text-rose-800 dark:text-rose-200 bg-rose-100/90 dark:bg-rose-900/80 max-w-[95%] truncate pointer-events-none">
                                                    {translateLeaveType(leaveHit.leave_type)}
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
                                                        <span className="text-[8px] font-black uppercase">{t('remove', { defaultValue: 'Remove' })}</span>
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