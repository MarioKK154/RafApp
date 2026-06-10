import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { extractTenantList } from '../utils/tenantUtils';
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
    HashtagIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'accountant', 'subcontractor'];

// Central catalog of granular permissions that can be assigned via UI
const PERMISSION_OPTIONS = [
    { value: 'offers.manage', label: 'perm_offers_manage' },
    { value: 'offers.view_all', label: 'perm_offers_view_all' },

    { value: 'inventory.manage', label: 'perm_inventory_manage' },
    { value: 'inventory.view_all', label: 'perm_inventory_view_all' },

    { value: 'projects.manage', label: 'perm_projects_manage' },
    { value: 'tasks.manage', label: 'perm_tasks_manage' },

    { value: 'timelogs.manage', label: 'perm_timelogs_manage' },

    { value: 'accounting.view', label: 'perm_accounting_view' },
    { value: 'accounting.manage', label: 'perm_accounting_manage' },

    { value: 'risk.manage', label: 'perm_risk_manage' },
    { value: 'tutorials.manage', label: 'perm_tutorials_manage' },

    { value: 'handover.generate', label: 'perm_handover_generate' },
];

const ROLE_LABEL_KEYS = {
    admin: 'role_admin',
    'project manager': 'role_project_manager',
    'team leader': 'role_team_leader',
    electrician: 'role_electrician',
    accountant: 'role_accountant',
    subcontractor: 'role_subcontractor',
};

function UserEditPage() {
    const { t } = useTranslation();
    const { userId } = useParams();
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
        extra_permissions: [],
    });

    const [initialUserData, setInitialUserData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);

    // Security & Authorization
    const isSuperuserEditing = currentUser?.is_superuser;
    const isEditingOtherTenant = isSuperuserEditing && initialUserData?.tenant_id && initialUserData.tenant_id !== currentUser?.tenant_id;
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
    const [newPermission, setNewPermission] = useState('');

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
                    extra_permissions: fetchedUser.extra_permissions ?? [],
                });

                setIsLoadingData(false);

                // Phase 2: Logistics & Tenant Registry
                setProjectDataLoading(true);
                const projectRes = await axiosInstance.get('/projects/', { params: { limit: 100 } });
                setAllProjects(projectRes.data);

                if (isSuperuserEditing) {
                    const tenantRes = await axiosInstance.get('/tenants/');
                    setAllTenants(extractTenantList(tenantRes?.data));
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
                    } catch { console.error(`Membership check failed for project ${proj.id}`); }
                }));

                setAssignedProjectIds(currentAssignments);
                setProjectDataLoading(false);

            } catch (error) {
                console.error('Registry sync failure:', error);
                setError(t('toast_registry_timeout'));
                setIsLoadingData(false);
            }
        }
    }, [userId, isAuthenticated, authIsLoading, canViewPage, isSuperuserEditing]);

    useEffect(() => { fetchPageData(); }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            let newVal = type === 'checkbox' ? checked : value;
            
            if (name === 'kennitala') {
                let cleaned = newVal.replace(/\D/g, '');
                if (cleaned.length > 6) {
                    newVal = cleaned.substring(0, 6) + '-' + cleaned.substring(6, 10);
                } else {
                    newVal = cleaned;
                }
            }

            return { ...prev, [name]: newVal };
        });
    };

    const handleSubmitDetails = async (e) => {
        e.preventDefault();
        if (!canSaveChanges || !initialUserData) return;
        setIsSubmittingUserDetails(true);

        const updatePayload = {
            ...formData,
            hourly_rate: formData.hourly_rate === '' ? null : parseFloat(formData.hourly_rate),
            tenant_id: formData.tenant_id || null,
            extra_permissions: formData.extra_permissions || [],
        };

        try {
            const res = await axiosInstance.put(`/users/${userId}`, updatePayload);
            toast.success(`${t('toast_personnel_updated')} ${res.data.email}`);
            setInitialUserData(res.data);
        } catch (error) {
            console.error('User details update failed:', error);
            toast.error(error.response?.data?.detail || t('toast_failed_commit_updates'));
        } finally {
            setIsSubmittingUserDetails(false);
        }
    };

    const handlePasswordOverride = async (e) => {
        e.preventDefault();
        if (newPasswordByAdmin !== confirmNewPasswordByAdmin) {
            toast.error(t('toast_security_mismatch'));
            return;
        }
        setIsSubmittingNewPassword(true);
        try {
            await axiosInstance.post(`/users/${userId}/set-password`, { new_password: newPasswordByAdmin });
            toast.success(t('toast_security_override_success'));
            setNewPasswordByAdmin(''); 
            setConfirmNewPasswordByAdmin('');
        } catch (error) {
            console.error('Password override failed:', error);
            toast.error(t('toast_override_denied'));
        } finally {
            setIsSubmittingNewPassword(false);
        }
    };

    const handleAddPermission = (code) => {
        const trimmed = code.trim();
        if (!trimmed) return;
        setFormData(prev => {
            const current = prev.extra_permissions || [];
            if (current.includes(trimmed)) return prev;
            return { ...prev, extra_permissions: [...current, trimmed] };
        });
        setNewPermission('');
    };

    const handlePermissionKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddPermission(newPermission);
        }
    };

    const handleRemovePermission = (code) => {
        setFormData(prev => ({
            ...prev,
            extra_permissions: (prev.extra_permissions || []).filter(p => p !== code),
        }));
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
                toast.success(t('toast_deployment_active'));
            } else {
                await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
                toast.success(t('toast_deployment_severed'));
            }
        } catch (error) {
            console.error('Deployment adjustment failed:', error);
            setAssignedProjectIds(original);
            toast.error(t('toast_deployment_failed'));
        }
    };

    if (authIsLoading || isLoadingData) return <LoadingSpinner text={t('accessing_personnel_record')} size="lg" />;
    if (error) return <div className="text-center py-20 font-black text-red-500 uppercase tracking-widest">{error}</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            <header className="mb-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <Link to="/users" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> {t('personnel_registry')}
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                            {initialUserData?.full_name || t('anonymous_node')}
                        </h1>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FingerPrintIcon className="h-3.5 w-3.5 text-indigo-500" /> {t('reg_id')} {userId.toString().padStart(4, '0')}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${initialUserData?.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                {initialUserData?.is_active ? t('operational') : t('suspended')}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    {!isEditingOtherTenant && (
<form onSubmit={handleSubmitDetails} className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-10">
                        <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700 pb-6">
                            <div className="flex items-center gap-3">
                                <IdentificationIcon className="h-6 w-6 text-indigo-500" />
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{t('operational_profile')}</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Field label={t('full_legal_name')} icon={<UserIcon />}>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-black" />
                            </Field>
                            <Field label={`${t('personnel_email')}*`} icon={<EnvelopeIcon />}>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14" />
                            </Field>
                            <Field label={t('kennitala_id')} icon={<FingerPrintIcon />}>
                                <input type="text" name="kennitala" value={formData.kennitala} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-mono text-indigo-600" />
                            </Field>
                            <Field label={t('employee_id_label')} icon={<HashtagIcon />}>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-bold" />
                            </Field>
                            <Field label={t('mobile_tactical_link')} icon={<PhoneIcon />}>
                                <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14" />
                            </Field>
                            <Field label={t('deployment_base')} icon={<MapIcon />}>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-bold" />
                            </Field>
                            <Field label={`${t('assigned_role')}*`} icon={<BriefcaseIcon />}>
                                <select name="role" required value={formData.role} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-black uppercase text-[11px] tracking-widest appearance-none">
                                    {ROLES_LIST.map(r => (
                                        <option key={r} value={r}>
                                            {t(ROLE_LABEL_KEYS[r] || r)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={t('hourly_labor_value')} icon={<BanknotesIcon />}>
                                <input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} disabled={!canSaveChanges} className="modern-input h-14 font-mono text-emerald-600 font-black" />
                            </Field>
                        </div>

                        {isSuperuserEditing && (
                            <div className="pt-8 border-t border-gray-50 dark:border-gray-700">
                                <Field label={t('global_infrastructure_node')} icon={<BuildingOfficeIcon />}>
                                    <select name="tenant_id" value={formData.tenant_id || ''} onChange={handleChange} className="modern-input h-14 bg-orange-50/20 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 font-bold">
                                        <option value="">{t('unassigned_infrastructure')}</option>
                                        {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} [REF:{t.id}]</option>)}
                                    </select>
                                </Field>
                            </div>
                        )}

                        <div className="pt-8 border-t border-gray-50 dark:border-gray-700">
                            <Field label="Granular Permissions Overrides" icon={<ShieldCheckIcon />}>
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                        {t('granular_permissions_desc')}{' '}
                                        <span className="text-indigo-500">offers.manage</span>,{' '}
                                        <span className="text-indigo-500">inventory.manage</span>.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.extra_permissions && formData.extra_permissions.length > 0) ? (
                                            formData.extra_permissions.map(code => (
                                                <span
                                                    key={code}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-[9px] font-black uppercase tracking-[0.18em] shadow-sm"
                                                >
                                                    {code}
                                                    {canSaveChanges && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePermission(code)}
                                                            className="ml-1 text-gray-300 hover:text-white"
                                                        >
                                                            <XMarkIcon className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-900 text-[9px] font-black text-gray-400 uppercase tracking-[0.18em] border border-dashed border-gray-200 dark:border-gray-700">
                                                {t('no_overrides')}
                                            </span>
                                        )}
                                    </div>
                                    {canSaveChanges && (
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            <select
                                                value={newPermission}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setNewPermission(value);
                                                    if (value) {
                                                        handleAddPermission(value);
                                                    }
                                                }}
                                                onKeyDown={handlePermissionKeyDown}
                                                className="flex-1 h-12 pl-4 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-[11px] font-black text-gray-900 dark:text-white placeholder-gray-400 uppercase tracking-[0.18em] focus:ring-1 focus:ring-indigo-500 appearance-none"
                                            >
                                                <option value="">
                                                    {t('select_permission')}
                                                </option>
                                                {PERMISSION_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {t(opt.label)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </Field>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4 border-t dark:border-gray-700">
                            <StatusCheckbox name="is_active" label={t('node_enabled')} checked={formData.is_active} onChange={handleChange} disabled={!canSaveChanges} />
                            {isSuperuserEditing && (
                                <StatusCheckbox name="is_superuser" label={t('root_authority')} checked={formData.is_superuser} onChange={handleChange} disabled={currentUser.id === parseInt(userId, 10)} color="orange" />
                            )}
                        </div>

                        {canSaveChanges && (
                            <div className="flex justify-end gap-4 pt-10 border-t border-gray-50 dark:border-gray-700">
                                <button type="submit" disabled={isSubmittingUserDetails} className="px-12 h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3">
                                    {isSubmittingUserDetails ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CloudArrowUpIcon className="h-5 w-5 stroke-[2.5px]" />}
                                    {t('commit_registry_updates')}
                                </button>
                            </div>
                        )}
                    </form>
)}

                    {!isEditingOtherTenant && (
<div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <UserLicenses userId={userId} />
                    </div>
)}
                </div>

                <div className="lg:col-span-4 space-y-10">
                    {!isEditingOtherTenant && (
<section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <CheckBadgeIcon className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('active_deployments')}</h2>
                        </div>
                        
                        {projectDataLoading ? (
                            <LoadingSpinner text={t('syncing_map')} size="sm" />
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
                                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{t('node_ref')} {proj.project_number || proj.id}</p>
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
)}

                    {canSaveChanges && currentUser.id !== parseInt(userId, 10) && (
                        <section className="bg-gray-100 dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-600 rounded-xl">
                                    <KeyIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-tight">{t('security_reset')}</h2>
                            </div>
                            
                            <form onSubmit={handlePasswordOverride} className="space-y-4">
                                <input 
                                    type="password" 
                                    placeholder={t('new_security_key')} 
                                    value={newPasswordByAdmin}
                                    onChange={(e) => setNewPasswordByAdmin(e.target.value)}
                                    className="w-full h-14 pl-6 pr-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl text-xs font-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:ring-1 focus:ring-orange-500 transition-all uppercase"
                                />
                                <input 
                                    type="password" 
                                    placeholder={t('confirm_key')} 
                                    value={confirmNewPasswordByAdmin}
                                    onChange={(e) => setConfirmNewPasswordByAdmin(e.target.value)}
                                    className="w-full h-14 pl-6 pr-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl text-xs font-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:ring-1 focus:ring-orange-500 transition-all uppercase"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingNewPassword || !newPasswordByAdmin}
                                    className="w-full h-14 bg-orange-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-500 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmittingNewPassword ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : t('execute_override')}
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