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
    MapPinIcon,
    IdentificationIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

function ProjectMembers({ projectId }) {
    const [members, setMembers] = useState([]);
    const [activeLogs, setActiveLogs] = useState([]); 
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
     * Protocol: Sync Personnel Telemetry
     */
    const fetchData = useCallback(async () => {
        try {
            const [membersRes, activeLogsRes, usersRes] = await Promise.all([
                axiosInstance.get(`/projects/${projectId}/members`),
                axiosInstance.get(`/timelogs/project/${projectId}/active`),
                axiosInstance.get('/users/', { params: { limit: 1000 } })
            ]);
            
            setMembers(membersRes.data);
            setActiveLogs(activeLogsRes.data);
            setAllUsers(usersRes.data);
        } catch (err) {
            console.error("Personnel Sync Error:", err);
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
            toast.success("Personnel deployed to site node.");
            setSelectedUserId('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Deployment failed.");
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
            toast.error("Protocol failure: Could not revoke access.");
        } finally {
            setIsRemoveModalOpen(false);
            setMemberToRemove(null);
        }
    };

    const availableUsersToAdd = allUsers.filter(u => !members.some(m => m.id === u.id));

    if (isLoading) return <LoadingSpinner text="Retrieving personnel registry..." size="sm" />;

    return (
        <div className="mt-6">
            <header className="flex justify-between items-center mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Personnel Deployment</h2>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-100 dark:border-gray-800">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">
                        {activeLogs.length} Active On-Site
                    </span>
                </div>
            </header>

            {/* Deployment Console */}
            {canManageMembers && (
                <div className="mb-10 p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                Select Personnel for Deployment
                            </label>
                            <div className="relative group">
                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    disabled={isSubmitting}
                                    className="modern-input pl-12 h-14 !rounded-2xl text-sm font-bold appearance-none cursor-pointer"
                                >
                                    <option value="">-- Choose Staff Node --</option>
                                    {availableUsersToAdd.map(u => (
                                        <option key={u.id} value={u.id} className="dark:bg-gray-800">
                                            {u.full_name || u.email} — [{u.role?.toUpperCase().replace('_', ' ')}]
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!selectedUserId || isSubmitting}
                            className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <UserPlusIcon className="h-5 w-5 stroke-[2.5px]" />}
                            Deploy to Node
                        </button>
                    </form>
                </div>
            )}

            {/* Deployment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-2 pb-8">
                {members.length > 0 ? (
                    members.map(member => {
                        const activeSession = activeLogs.find(log => log.user_id === member.id);
                        return (
                            <div 
                                key={member.id} 
                                className={`group relative flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all duration-500 ${
                                    activeSession 
                                    ? 'bg-green-50/30 border-green-200 dark:bg-green-900/10 dark:border-green-900/40 shadow-lg' 
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-900/50'
                                }`}
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    {/* Avatar Node */}
                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-colors duration-500 ${
                                        activeSession 
                                        ? 'bg-white dark:bg-gray-800 border-green-200 text-green-600' 
                                        : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 group-hover:text-indigo-500 group-hover:border-indigo-100'
                                    }`}>
                                        {member.profile_picture_url ? (
                                            <img src={member.profile_picture_url} alt="" className="h-full w-full object-cover rounded-xl" />
                                        ) : (
                                            <span className="font-black text-xl">{ (member.full_name || member.email).charAt(0).toUpperCase() }</span>
                                        )}
                                    </div>
                                    
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-none mb-1.5">
                                            {member.full_name || 'System Asset'}
                                        </h3>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                <ShieldCheckIcon className="h-3 w-3" />
                                                {member.role?.replace('_', ' ') || 'Technician'}
                                            </div>
                                            {activeSession ? (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-tighter animate-pulse">
                                                    <ClockIcon className="h-3 w-3" />
                                                    Clocked In: {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                                    <MapPinIcon className="h-3 w-3" />
                                                    Status: Off-Site
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {canManageMembers && (
                                    <button
                                        onClick={() => { setMemberToRemove(member); setIsRemoveModalOpen(true); }}
                                        className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all transform active:scale-90"
                                        title="Revoke Node Access"
                                    >
                                        <UserMinusIcon className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] bg-gray-50/30 dark:bg-gray-900/20">
                        <UserGroupIcon className="h-16 w-16 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] italic">Personnel Registry Empty</h3>
                        <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest mt-2">Initialize staff deployment using the console above.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isRemoveModalOpen}
                onClose={() => { setIsRemoveModalOpen(false); setMemberToRemove(null); }}
                onConfirm={confirmRemoveMember}
                title="Terminate Node Deployment"
                message={`CRITICAL: Are you sure you want to revoke project access for ${memberToRemove?.full_name || 'this asset'}? This will terminate their ability to log time to this node.`}
                confirmText="REVOKE ACCESS"
                type="danger"
            />
        </div>
    );
}

export default ProjectMembers;