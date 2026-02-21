import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import UserLicenses from '../components/UserLicenses';
import {
    UserIcon,
    EnvelopeIcon,
    IdentificationIcon,
    PhoneIcon,
    MapPinIcon,
    BriefcaseIcon,
    ShieldCheckIcon,
    KeyIcon,
    LockClosedIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    ChevronLeftIcon,
    FingerPrintIcon,
    BanknotesIcon,
    BuildingOfficeIcon,
    CheckBadgeIcon,
    PowerIcon,
    MapIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'accountant'];

function UserEditPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Registry Data States
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        employee_id: '',
        kennitala: '',
        phone_number: '',
        city: '',
        role: '',
        is_active: true,
        is_superuser: false,
        hourly_rate: '',
        tenant_id: '',
    });

    const [initialUserData, setInitialUserData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);

    // Security & Authorization
    const isSuperuserEditing = currentUser?.is_superuser;
    const canViewPage = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuserEditing);
    const canSaveChanges = currentUser && (['admin'].includes(currentUser.role) || isSuperuserEditing);

    const [newPasswordByAdmin, setNewPasswordByAdmin] = useState('');
    const [confirmNewPasswordByAdmin, setConfirmNewPasswordByAdmin] = useState('');
    const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

    // Deployment States
    const [allProjects, setAllProjects] = useState([]);
    const [allTenants, setAllTenants] = useState([]);
    const [assignedProjectIds, setAssignedProjectIds] = useState(new Set());
    const [projectDataLoading, setProjectDataLoading] = useState(false);

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && canViewPage && userId) {
            setIsLoadingData(true);
            setError('');
            try {
                // Phase 1: Core Identity Sync
                const userRes = await axiosInstance.get(`/users/${userId}`);
                const fetchedUser = userRes.data;

                setInitialUserData(fetchedUser);
                setFormData({
                    email: fetchedUser.email ?? '',
                    full_name: fetchedUser.full_name ?? '',
                    employee_id: fetchedUser.employee_id ?? '',
                    kennitala: fetchedUser.kennitala ?? '',
                    phone_number: fetchedUser.phone_number ?? '',
                    city: fetchedUser.city ?? fetchedUser.location ?? '',
                    role: fetchedUser.role ?? '',
                    is_active: fetchedUser.is_active ?? true,
                    is_superuser: fetchedUser.is_superuser ?? false,
                    hourly_rate: fetchedUser.hourly_rate ?? '',
                    tenant_id: fetchedUser.tenant_id ?? '',
                });

                setIsLoadingData(false);

                // Phase 2: Logistics & Tenant Registry
                setProjectDataLoading(true);
                const projectRes = await axiosInstance.get('/projects/', { params: { limit: 100 } });
                setAllProjects(projectRes.data);

                if (isSuperuserEditing) {
                    const tenantRes = await axiosInstance.get('/tenants/');
                    setAllTenants(tenantRes.data);
                }

                // Phase 3: Active Membership Cross-Reference
                const currentAssignments = new Set();
                const activeProjects = projectRes.data.filter(p => p.status !== 'Completed').slice(0, 20);

                await Promise.all(activeProjects.map(async (proj) => {
                    try {
                        const res = await axiosInstance.get(`/projects/${proj.id}/members`);
                        if (res.data.some(m => m.id === parseInt(userId, 10))) {
                            currentAssignments.add(proj.id);
                        }
                    } catch (e) { console.error(`Membership check failed for project ${proj.id}`); }
                }));

                setAssignedProjectIds(currentAssignments);
                setProjectDataLoading(false);

            } catch (err) {
                console.error("Registry Sync Failure:", err);
                setError('Personnel registry connection timed out.');
                setIsLoadingData(false);
            }
        }
    }, [userId, isAuthenticated, authIsLoading, canViewPage, isSuperuserEditing]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmitDetails = async (e) => {
        e.preventDefault();
        if (!canSaveChanges || !initialUserData) return;
        setIsSubmittingUserDetails(true);

        const updatePayload = {
            ...formData,
            hourly_rate: formData.hourly_rate === '' ? null : parseFloat(formData.hourly_rate),
            tenant_id: formData.tenant_id || null
        };

        try {
            const res = await axiosInstance.put(`/users/${userId}`, updatePayload);
            toast.success(`Personnel node updated: ${res.data.email}`);
            setInitialUserData(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to commit updates.');
        } finally {
            setIsSubmittingUserDetails(false);
        }
    };

    const handlePasswordOverride = async (e) => {
        e.preventDefault();
        if (newPasswordByAdmin !== confirmNewPasswordByAdmin) {
            toast.error("Security mismatch.");
            return;
        }
        setIsSubmittingNewPassword(true);
        try {
            await axiosInstance.post(`/users/${userId}/set-password`, { new_password: newPasswordByAdmin });
            toast.success("Security override successful.");
            setNewPasswordByAdmin(''); 
            setConfirmNewPasswordByAdmin('');
        } catch (err) {
            toast.error("Override denied by security policy.");
        } finally {
            setIsSubmittingNewPassword(false);
        }
    };

    const toggleProjectAssignment = async (projectId, isAssigned) => {
        const original = new Set(assignedProjectIds);
        setAssignedProjectIds(prev => {
            const next = new Set(prev);
            isAssigned ? next.add(projectId) : next.delete(projectId);
            return next;
        });

        try {
            if (isAssigned) {
                await axiosInstance.post(`/projects/${projectId}/members`, { user_id: parseInt(userId, 10) });
                toast.success("Deployment Node Active");
            } else {
                await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
                toast.success("Deployment Node Severed");
            }
        } catch (err) {
            setAssignedProjectIds(original);
            toast.error("Deployment adjustment failed.");
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Accessing personnel record..." size="lg" />;
    if (error) return <div className="text-center py-20 font-black text-red-500 uppercase tracking-widest">{error}</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="mb-12">
                <Link to="/users" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> Personnel Registry
                </Link>
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <UserIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
                            {initialUserData?.full_name || 'Anonymous Node'}
                        </h1>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FingerPrintIcon className="h-3.5 w-3.5 text-indigo-500" /> REG-ID: {userId.toString().padStart(4, '0')}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${initialUserData?.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {initialUserData?.is_active ? 'Operational' : 'Suspended'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    <form onSubmit={handleSubmitDetails} className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-10">
                        <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-6">
                            <div className="flex items-center gap-3">
                                <IdentificationIcon className="h-6 w-6 text-indigo-500" />
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Operational Profile</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Field label="Full Legal Name" icon={<UserIcon />}>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-black" />
                            </Field>
                            <Field label="Personnel Email*" icon={<EnvelopeIcon />}>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14" />
                            </Field>
                            <Field label="Kennitala (ID Number)" icon={<FingerPrintIcon />}>
                                <input type="text" name="kennitala" value={formData.kennitala} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-mono text-indigo-600" />
                            </Field>
                            <Field label="Internal Identifier" icon={<HashtagIcon />}>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-bold" />
                            </Field>
                            <Field label="Mobile Tactical Link" icon={<PhoneIcon />}>
                                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14" />
                            </Field>
                            <Field label="Deployment Base (City)" icon={<MapIcon />}>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-bold" />
                            </Field>
                            <Field label="Assigned Operational Role*" icon={<BriefcaseIcon />}>
                                <select name="role" required value={formData.role} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-black uppercase text-[11px] tracking-widest appearance-none">
                                    {ROLES_LIST.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                                </select>
                            </Field>
                            <Field label="Hourly Labor Value (ISK)" icon={<BanknotesIcon />}>
                                <input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-mono text-emerald-600 font-black" />
                            </Field>
                        </div>

                        {isSuperuserEditing && (
                            <div className="pt-8 border-t border-gray-50 dark:border-gray-700">
                                <Field label="Global Infrastructure Node (Tenant)" icon={<BuildingOfficeIcon />}>
                                    <select name="tenant_id" value={formData.tenant_id || ''} onChange={handleChange} className="modern-input h-14 bg-orange-50/20 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 font-bold">
                                        <option value="">-- UNASSIGNED INFRASTRUCTURE --</option>
                                        {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} [REF:{t.id}]</option>)}
                                    </select>
                                </Field>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4 pt-4 border-t dark:border-gray-700">
                            <StatusCheckbox name="is_active" label="Node Enabled" checked={formData.is_active} onChange={handleChange} disabled={!canSaveChanges} />
                            {isSuperuserEditing && (
                                <StatusCheckbox name="is_superuser" label="Root Authority" checked={formData.is_superuser} onChange={handleChange} disabled={currentUser.id === parseInt(userId, 10)} color="orange" />
                            )}
                        </div>

                        {canSaveChanges && (
                            <div className="flex justify-end gap-4 pt-10 border-t border-gray-50 dark:border-gray-700">
                                <button type="submit" disabled={isSubmittingUserDetails} className="px-12 h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
                                    {isSubmittingUserDetails ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CloudArrowUpIcon className="h-5 w-5 stroke-[2.5px]" />}
                                    Commit Registry Updates
                                </button>
                            </div>
                        )}
                    </form>

                    <UserLicenses userId={userId} />
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <CheckBadgeIcon className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Active Deployments</h2>
                        </div>
                        
                        {projectDataLoading ? (
                            <LoadingSpinner text="Syncing Map..." size="sm" />
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {allProjects.map(proj => (
                                    <label key={proj.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                                        assignedProjectIds.has(proj.id) 
                                        ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                        : 'bg-gray-50 dark:bg-gray-900/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                    }`}>
                                        <div className="min-w-0 pr-4">
                                            <p className="text-[11px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{proj.name}</p>
                                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Node Ref: {proj.project_number || proj.id}</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={assignedProjectIds.has(proj.id)} 
                                            onChange={(e) => toggleProjectAssignment(proj.id, e.target.checked)}
                                            disabled={!canSaveChanges}
                                            className="h-6 w-6 text-indigo-600 rounded-lg focus:ring-0 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}
                    </section>

                    {canSaveChanges && currentUser.id !== parseInt(userId, 10) && (
                        <section className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl text-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-600 rounded-xl">
                                    <KeyIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Security Reset</h2>
                            </div>
                            
                            <form onSubmit={handlePasswordOverride} className="space-y-4">
                                <input 
                                    type="password" 
                                    placeholder="NEW SECURITY KEY" 
                                    value={newPasswordByAdmin}
                                    onChange={(e) => setNewPasswordByAdmin(e.target.value)}
                                    className="w-full h-14 pl-6 pr-4 bg-gray-800 border border-gray-700 rounded-2xl text-xs font-black placeholder-gray-600 focus:ring-1 focus:ring-orange-500 transition-all uppercase"
                                />
                                <input 
                                    type="password" 
                                    placeholder="CONFIRM KEY" 
                                    value={confirmNewPasswordByAdmin}
                                    onChange={(e) => setConfirmNewPasswordByAdmin(e.target.value)}
                                    className="w-full h-14 pl-6 pr-4 bg-gray-800 border border-gray-700 rounded-2xl text-xs font-black placeholder-gray-600 focus:ring-1 focus:ring-orange-500 transition-all uppercase"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingNewPassword || !newPasswordByAdmin}
                                    className="w-full h-14 bg-orange-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-500 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmittingNewPassword ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : "Execute Override"}
                                </button>
                            </form>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, icon, children }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <span className="text-indigo-500">{React.cloneElement(icon, { className: "h-3.5 w-3.5" })}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

function StatusCheckbox({ name, label, checked, onChange, disabled, color = 'indigo' }) {
    const colorClasses = color === 'orange' ? 'text-orange-600' : 'text-indigo-600';
    return (
        <label className={`flex items-center gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled} className={`h-6 w-6 rounded-lg ${colorClasses}`} />
            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
        </label>
    );
}

export default UserEditPage;