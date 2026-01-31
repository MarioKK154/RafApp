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
    PowerIcon
} from '@heroicons/react/24/outline';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician'];

function UserEditPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Data States
    const [formData, setFormData] = useState({
        email: '', full_name: '', employee_id: '', kennitala: '',
        phone_number: '', location: '', role: '', is_active: true,
        is_superuser: false, hourly_rate: '', tenant_id: '',
    });
    const [initialUserData, setInitialUserData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);

    // Permission Logic
    const isSuperuserEditing = currentUser?.is_superuser;
    const canViewPage = currentUser && (['admin', 'project manager'].includes(currentUser.role) || isSuperuserEditing);
    const canSaveChanges = currentUser && (['admin'].includes(currentUser.role) || isSuperuserEditing);

    // Security State (Password Override)
    const [newPasswordByAdmin, setNewPasswordByAdmin] = useState('');
    const [confirmNewPasswordByAdmin, setConfirmNewPasswordByAdmin] = useState('');
    const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

    // Assignment States
    const [allProjects, setAllProjects] = useState([]);
    const [allTenants, setAllTenants] = useState([]);
    const [assignedProjectIds, setAssignedProjectIds] = useState(new Set());
    const [projectDataLoading, setProjectDataLoading] = useState(true);

    /**
     * Technical Sync: Aggregates user data, project registry, and membership status
     */
    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && canViewPage && userId) {
            setIsLoadingData(true);
            setProjectDataLoading(true);
            setError('');
            try {
                const promises = [
                    axiosInstance.get(`/users/${userId}`),
                    axiosInstance.get('/projects/', { params: { limit: 500 } })
                ];
                if (isSuperuserEditing) promises.push(axiosInstance.get('/tenants/'));
                
                const [userRes, projectRes, tenantRes] = await Promise.all(promises);
                
                const fetchedUser = userRes.data;
                setInitialUserData(fetchedUser);
                setFormData({
                    email: fetchedUser.email ?? '',
                    full_name: fetchedUser.full_name ?? '',
                    employee_id: fetchedUser.employee_id ?? '',
                    kennitala: fetchedUser.kennitala ?? '',
                    phone_number: fetchedUser.phone_number ?? '',
                    location: fetchedUser.location ?? '',
                    role: fetchedUser.role ?? '',
                    is_active: fetchedUser.is_active ?? true,
                    is_superuser: fetchedUser.is_superuser ?? false,
                    hourly_rate: fetchedUser.hourly_rate ?? '',
                    tenant_id: fetchedUser.tenant_id ?? '',
                });
                
                setAllProjects(projectRes.data);
                if (isSuperuserEditing) setAllTenants(tenantRes.data);
                setIsLoadingData(false);
                
                // Cross-reference project memberships
                const currentAssignments = new Set();
                const membershipPromises = projectRes.data.map(proj => 
                    axiosInstance.get(`/projects/${proj.id}/members`)
                        .then(res => {
                            if (res.data.some(m => m.id === parseInt(userId, 10))) {
                                currentAssignments.add(proj.id);
                            }
                        }).catch(() => null)
                );
                
                await Promise.all(membershipPromises);
                setAssignedProjectIds(currentAssignments);
                setProjectDataLoading(false);

            } catch (err) {
                const errorMsg = err.response?.status === 404 ? 'Personnel record not found.' : 'Failed to synchronize personnel telemetry.';
                setError(errorMsg);
                toast.error(errorMsg);
                setIsLoadingData(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        } else if (!authIsLoading && !canViewPage) {
            navigate('/', { replace: true });
        }
    }, [userId, isAuthenticated, authIsLoading, canViewPage, isSuperuserEditing, navigate]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmitDetails = async (e) => {
        e.preventDefault();
        if (!canSaveChanges) return;
        setIsSubmittingUserDetails(true);

        const updatePayload = {};
        const fields = ['email', 'full_name', 'employee_id', 'kennitala', 'phone_number', 'location', 'role', 'is_active'];
        fields.forEach(f => {
            if (formData[f] !== (initialUserData[f] ?? '')) updatePayload[f] = formData[f] || null;
        });

        if (String(formData.hourly_rate) !== String(initialUserData.hourly_rate ?? '')) {
            updatePayload.hourly_rate = formData.hourly_rate === '' ? null : parseFloat(formData.hourly_rate);
        }
        if (isSuperuserEditing) {
            if (formData.is_superuser !== initialUserData.is_superuser) updatePayload.is_superuser = formData.is_superuser;
            if (formData.tenant_id !== (initialUserData.tenant_id ?? '')) updatePayload.tenant_id = formData.tenant_id || null;
        }

        if (Object.keys(updatePayload).length === 0) {
            toast.info("Registry update bypassed: No changes detected.");
            setIsSubmittingUserDetails(false);
            return;
        }

        try {
            const res = await axiosInstance.put(`/users/${userId}`, updatePayload);
            toast.success(`Personnel registry updated: ${res.data.email}`);
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
            toast.error("Security mismatch: Passwords do not align.");
            return;
        }
        setIsSubmittingNewPassword(true);
        try {
            await axiosInstance.post(`/users/${userId}/set-password`, { new_password: newPasswordByAdmin });
            toast.success("Security override successful: Password reset.");
            setNewPasswordByAdmin(''); setConfirmNewPasswordByAdmin('');
        } catch (err) {
            toast.error("Security protocol failure: Reset denied.");
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
                toast.success("Access Granted: Project Link Active");
            } else {
                await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
                toast.success("Access Revoked: Project Link Severed");
            }
        } catch (err) {
            toast.error("Deployment adjustment failed.");
            setAssignedProjectIds(original);
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text="Accessing personnel record..." size="lg" />;
    if (error) return <div className="text-center py-20 font-black text-red-500 uppercase tracking-widest">{error}</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Navigation Header */}
            <header className="mb-10">
                <Link to="/users" className="flex items-center text-xs font-black text-gray-400 hover:text-indigo-600 transition mb-2 uppercase tracking-widest">
                    <ChevronLeftIcon className="h-3 w-3 mr-1" /> Personnel Registry
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <UserIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none uppercase tracking-tight">
                            {initialUserData?.full_name || 'Anonymous Technician'}
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                <FingerPrintIcon className="h-3 w-3" /> Registry ID: {userId}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${initialUserData?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {initialUserData?.is_active ? 'Status: Active' : 'Status: Deactivated'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Primary Profile Section */}
                    <form onSubmit={handleSubmitDetails} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <IdentificationIcon className="h-4 w-4" /> Identity & Operational Profile
                            </h2>
                            {!canSaveChanges && <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-lg">Read Only Mode</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Full Legal Name" icon={<UserIcon />}>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={!canSaveChanges} className="modern-input" />
                            </Field>
                            <Field label="Personnel Email*" icon={<EnvelopeIcon />}>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={!canSaveChanges} className="modern-input" />
                            </Field>
                            <Field label="Kennitala (ID Number)" icon={<FingerPrintIcon />}>
                                <input type="text" name="kennitala" value={formData.kennitala} onChange={handleChange} disabled={!canSaveChanges} className="modern-input font-mono" />
                            </Field>
                            <Field label="Internal Employee ID" icon={<IdentificationIcon />}>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} disabled={!canSaveChanges} className="modern-input" />
                            </Field>
                            <Field label="Mobile Contact" icon={<PhoneIcon />}>
                                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={!canSaveChanges} className="modern-input" />
                            </Field>
                            <Field label="Primary Location" icon={<MapPinIcon />}>
                                <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={!canSaveChanges} className="modern-input" />
                            </Field>
                            <Field label="Operational Role*" icon={<BriefcaseIcon />}>
                                <select name="role" required value={formData.role} onChange={handleChange} disabled={!canSaveChanges} className="modern-input">
                                    {ROLES_LIST.map(r => <option key={r} value={r}>{r.toUpperCase().replace('_', ' ')}</option>)}
                                </select>
                            </Field>
                            <Field label="Hourly Labor Rate (ISK)" icon={<BanknotesIcon />}>
                                <input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} disabled={!canSaveChanges} placeholder="e.g. 7500" className="modern-input font-mono" />
                            </Field>
                        </div>

                        {/* Tenant Control (Root Only) */}
                        {isSuperuserEditing && (
                            <div className="pt-6 border-t dark:border-gray-700">
                                <Field label="Infrastructure Node (Tenant)" icon={<BuildingOfficeIcon />}>
                                    <select name="tenant_id" value={formData.tenant_id || ''} onChange={handleChange} className="modern-input bg-orange-50/10 border-orange-100">
                                        <option value="">-- No Node Assigned --</option>
                                        {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} (Ref: {t.id})</option>)}
                                    </select>
                                </Field>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-6 pt-2">
                            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} disabled={!canSaveChanges} className="h-5 w-5 text-indigo-600 rounded-lg" />
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Account Enabled</span>
                            </div>
                            {isSuperuserEditing && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800">
                                    <input type="checkbox" name="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={currentUser.id === parseInt(userId, 10)} className="h-5 w-5 text-orange-600 rounded-lg" />
                                    <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Global Superuser Access</span>
                                </div>
                            )}
                        </div>

                        {canSaveChanges && (
                            <div className="flex justify-end gap-4 pt-6 border-t dark:border-gray-700">
                                <Link to="/users" className="px-6 h-12 flex items-center text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition">Cancel</Link>
                                <button type="submit" disabled={isSubmittingUserDetails} className="px-10 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50">
                                    {isSubmittingUserDetails ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : 'Commit Profile Updates'}
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Licenses Component */}
                    <UserLicenses userId={userId} />
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Project Deployment Card */}
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <CheckBadgeIcon className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Deployments</h2>
                        </div>
                        
                        {projectDataLoading ? (
                            <LoadingSpinner text="Mapping projects..." size="sm" />
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                {allProjects.map(proj => (
                                    <div key={proj.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl group hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100">
                                        <div className="min-w-0 pr-4">
                                            <p className="text-[10px] font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{proj.name}</p>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">ID: {proj.id}</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={assignedProjectIds.has(proj.id)} 
                                            onChange={(e) => toggleProjectAssignment(proj.id, e.target.checked)}
                                            disabled={!canSaveChanges}
                                            className="h-5 w-5 text-indigo-600 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                ))}
                                {allProjects.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No active projects detected.</p>}
                            </div>
                        )}
                    </section>

                    {/* Security Override Card (Admin Only) */}
                    {canSaveChanges && currentUser.id !== parseInt(userId, 10) && (
                        <section className="bg-orange-600 p-8 rounded-[2.5rem] shadow-2xl text-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <KeyIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Security Reset</h2>
                            </div>
                            
                            <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mb-6 leading-relaxed">
                                Force security override to reset user credentials. This bypasses current authentication.
                            </p>

                            <form onSubmit={handlePasswordOverride} className="space-y-4">
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                                    <input 
                                        type="password" 
                                        placeholder="NEW SECURITY KEY" 
                                        value={newPasswordByAdmin}
                                        onChange={(e) => setNewPasswordByAdmin(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-white/10 border border-white/20 rounded-2xl text-xs font-black placeholder-white/40 focus:ring-0 focus:border-white transition-all uppercase"
                                    />
                                </div>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                                    <input 
                                        type="password" 
                                        placeholder="CONFIRM KEY" 
                                        value={confirmNewPasswordByAdmin}
                                        onChange={(e) => setConfirmNewPasswordByAdmin(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 bg-white/10 border border-white/20 rounded-2xl text-xs font-black placeholder-white/40 focus:ring-0 focus:border-white transition-all uppercase"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingNewPassword || !newPasswordByAdmin}
                                    className="w-full h-12 bg-white text-orange-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-50 transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingNewPassword ? <ArrowPathIcon className="h-5 w-5 mx-auto animate-spin" /> : 'Execute Reset'}
                                </button>
                            </form>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Technical Sub-Component: Input Field Container
 */
function Field({ label, icon, children }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {React.cloneElement(icon, { className: "h-3 w-3" })}
                {label}
            </label>
            {children}
        </div>
    );
}

export default UserEditPage;