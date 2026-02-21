import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    UserIcon, 
    EnvelopeIcon, 
    KeyIcon, 
    IdentificationIcon, 
    FingerPrintIcon, 
    PhoneIcon, 
    MapIcon, 
    BriefcaseIcon, 
    BuildingOfficeIcon,
    PlusIcon,
    ChevronLeftIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'accountant'];

function UserCreatePage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    // Registry Data State
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        employee_id: '',
        kennitala: '',
        phone_number: '',
        city: '', // ROADMAP: Standardized for multi-city scheduling
        role: ROLES_LIST[3], // Default to Electrician
        is_active: true,
        is_superuser: false,
        tenant_id: '',
    });

    const [tenants, setTenants] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;

    const fetchTenants = useCallback(async () => {
        if (isSuperuser) {
            try {
                const response = await axiosInstance.get('/tenants/');
                setTenants(response.data);
            } catch (err) {
                toast.error("Failed to load infrastructure nodes (tenants).");
            }
        }
    }, [isSuperuser]);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) navigate('/login', { replace: true });
            else if (!isAdmin) navigate('/', { replace: true });
            else fetchTenants();
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate, fetchTenants]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        if (formData.password.length < 8) {
            toast.error('Security Protocol: Password must be at least 8 characters.');
            return;
        }

        setError('');
        setIsSubmitting(true);

        const payload = {
            ...formData,
            tenant_id: isSuperuser && formData.tenant_id ? parseInt(formData.tenant_id, 10) : null,
        };

        try {
            const response = await axiosInstance.post('/users/', payload);
            toast.success(`User Node "${response.data.full_name || response.data.email}" Initialized.`);
            navigate('/users');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to initialize user node.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Authenticating Registry Access..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <header className="mb-12">
                <Link to="/users" className="flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition mb-3 uppercase tracking-[0.2em]">
                    <ChevronLeftIcon className="h-3 w-3 mr-1 stroke-[3px]" /> Terminate / Return to Registry
                </Link>
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                        <PlusIcon className="h-8 w-8 text-white stroke-[2.5px]" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic leading-none">
                            Initialize User
                        </h1>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                            Workforce Infrastructure / Node Setup
                        </p>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Data Column */}
                <div className="lg:col-span-8 space-y-10">
                    
                    {/* Section 1: Authentication Gateway */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-6">
                            <KeyIcon className="h-6 w-6 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Auth Credentials</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Field label="Personnel Email*" icon={<EnvelopeIcon />}>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14" placeholder="user@company.is" />
                            </Field>
                            <Field label="Access Password*" icon={<ShieldCheckIcon />}>
                                <input type="password" name="password" required value={formData.password} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14" placeholder="Min 8 characters" />
                            </Field>
                        </div>
                    </section>

                    {/* Section 2: Identity Profile */}
                    <section className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                        <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-6">
                            <IdentificationIcon className="h-6 w-6 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Personnel Metadata</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <Field label="Full Legal Name" icon={<UserIcon />}>
                                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 font-black" placeholder="Official Name" />
                                </Field>
                            </div>
                            <Field label="Kennitala (ID Number)" icon={<FingerPrintIcon />}>
                                <input type="text" name="kennitala" value={formData.kennitala} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 font-mono" placeholder="000000-0000" />
                            </Field>
                            <Field label="Employee Identifier" icon={<IdentificationIcon />}>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 font-bold" placeholder="EMP-000" />
                            </Field>
                        </div>
                    </section>
                </div>

                {/* Sidebar Column: Logistics & Deployment */}
                <div className="lg:col-span-4 space-y-10">
                    
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <BriefcaseIcon className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">Operations</h2>
                        </div>

                        <Field label="Deployment Base (City)" icon={<MapIcon />}>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 font-bold" placeholder="e.g. Reykjavík" />
                        </Field>

                        <Field label="Operational Role*" icon={<BriefcaseIcon />}>
                            <select name="role" required value={formData.role} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 font-black uppercase text-[11px] tracking-widest appearance-none">
                                {ROLES_LIST.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                            </select>
                        </Field>

                        {isSuperuser && (
                            <Field label="Assign to Cluster (Tenant)*" icon={<BuildingOfficeIcon />}>
                                <select name="tenant_id" required={isSuperuser} value={formData.tenant_id} onChange={handleChange} disabled={isSubmitting} className="modern-input h-14 bg-orange-50/20 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800 font-bold">
                                    <option value="">-- SELECT TENANT --</option>
                                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </Field>
                        )}
                    </section>

                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmitting} className="h-6 w-6 text-indigo-600 rounded-lg border-gray-300 focus:ring-0" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Activate Account</span>
                        </label>
                        
                        {isSuperuser && (
                            <label className="flex items-center gap-4 cursor-pointer group pt-2">
                                <input type="checkbox" name="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmitting} className="h-6 w-6 text-orange-600 rounded-lg border-gray-300 focus:ring-0" />
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Root Global Access</span>
                            </label>
                        )}
                    </section>

                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] shadow-xl shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                    >
                        {isSubmitting ? (
                            <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Initializing Node...</>
                        ) : (
                            <><ShieldCheckIcon className="h-5 w-5 stroke-[2.5px]" /> Commit to Registry</>
                        )}
                    </button>
                </div>
            </form>
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

export default UserCreatePage;