import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { 
    UserGroupIcon, 
    UserPlusIcon, 
    UserMinusIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    ClockIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';

function ProjectMembers({ projectId }) {
    const [members, setMembers] = useState([]);
    const [activeLogs, setActiveLogs] = useState([]); // Track who is currently clocked in
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const { user: currentUser } = useAuth();

    // Modal State
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);

    const isSuperuser = currentUser?.is_superuser;
    const canManageMembers = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuser);

    /**
     * Fetches members and their current active status
     */
    const fetchData = useCallback(async () => {
        try {
            const [membersRes, activeLogsRes, usersRes] = await Promise.all([
                axiosInstance.get(`/projects/${projectId}/members`),
                axiosInstance.get(`/timelogs/project/${projectId}/active`), // Fixed 404 by adding this endpoint to backend
                axiosInstance.get('/users/', { params: { limit: 1000 } })
            ]);
            
            setMembers(membersRes.data);
            setActiveLogs(activeLogsRes.data);
            setAllUsers(usersRes.data);
        } catch (err) {
            console.error("Sync error:", err);
            // We don't toast the 404 here to keep the UI clean if the backend isn't updated yet
            setError('Operational telemetry partially synced.');
        }
    }, [projectId]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await fetchData();
            setIsLoading(false);
        };
        if (projectId) load();
    }, [projectId, fetchData]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!selectedUserId) return;
        setIsSubmitting(true);
        try {
            await axiosInstance.post(`/projects/${projectId}/members`, { 
                user_id: parseInt(selectedUserId, 10) 
            });
            toast.success("Personnel deployed to project.");
            setSelectedUserId('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to add member.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        try {
            await axiosInstance.delete(`/projects/${projectId}/members/${memberToRemove.id}`);
            toast.success(`Access revoked for ${memberToRemove.full_name || 'Personnel'}.`);
            fetchData();
        } catch (err) {
            toast.error("Failed to remove member.");
        } finally {
            setIsRemoveModalOpen(false);
            setMemberToRemove(null);
        }
    };

    const availableUsersToAdd = allUsers.filter(u => !members.some(m => m.id === u.id));

    if (isLoading) return <LoadingSpinner text="Retrieving personnel registry..." size="sm" />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Project Team</h2>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {activeLogs.length} On-Site Now
                    </span>
                </div>
            </header>

            {/* Add Member Interface */}
            {canManageMembers && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                Deploy Staff to Site
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                disabled={isSubmitting}
                                className="block w-full h-12 rounded-2xl border-gray-200 dark:bg-gray-800 dark:border-gray-700 font-bold text-sm focus:ring-indigo-500"
                            >
                                <option value="">-- Select Personnel --</option>
                                {availableUsersToAdd.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.full_name || u.email} ({u.role?.replace('_', ' ') || 'Personnel'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={!selectedUserId || isSubmitting}
                            className="h-12 inline-flex items-center px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                        >
                            <UserPlusIcon className="h-5 w-5 mr-2" /> Deploy
                        </button>
                    </form>
                </div>
            )}

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.length > 0 ? (
                    members.map(member => {
                        const activeSession = activeLogs.find(log => log.user_id === member.id);
                        return (
                            <div 
                                key={member.id} 
                                className={`relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 ${
                                    activeSession 
                                    ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/50 shadow-sm' 
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                }`}
                            >
                                {/* Status Pulse Indicator */}
                                {activeSession && (
                                    <span className="absolute top-3 right-3 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                )}

                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Avatar */}
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 shadow-sm flex-shrink-0">
                                        {member.profile_picture_url ? (
                                            <img src={member.profile_picture_url} alt="" className="h-full w-full object-cover rounded-2xl" />
                                        ) : (
                                            <span className="font-black text-lg uppercase">{(member.full_name || member.email).charAt(0)}</span>
                                        )}
                                    </div>
                                    
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">
                                            {member.full_name || 'Unknown Asset'}
                                        </h3>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                <ShieldCheckIcon className="h-3 w-3" />
                                                {/* CRASH PROTECTION: Optional chaining and fallback */}
                                                <p>{member.role?.replace('_', ' ') || 'Personnel'}</p>
                                            </div>
                                            {activeSession ? (
                                                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-green-600 dark:text-green-400 uppercase">
                                                    <ClockIcon className="h-3 w-3" />
                                                    Active: {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    <MapPinIcon className="h-3 w-3" /> Off-Site
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {canManageMembers && (
                                    <button
                                        onClick={() => { setMemberToRemove(member); setIsRemoveModalOpen(true); }}
                                        className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                    >
                                        <UserMinusIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem]">
                        <UserGroupIcon className="h-12 w-12 text-gray-100 dark:text-gray-800 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest italic">Registry Empty</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isRemoveModalOpen}
                onClose={() => { setIsRemoveModalOpen(false); setMemberToRemove(null); }}
                onConfirm={confirmRemoveMember}
                title="Revoke Site Access"
                message={`Are you sure you want to remove ${memberToRemove?.full_name || 'this user'} from the project team?`}
                confirmText="Confirm Removal"
                type="danger"
            />
        </div>
    );
}

export default ProjectMembers;