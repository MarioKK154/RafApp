import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    ShieldExclamationIcon, 
    TrashIcon, 
    UserMinusIcon, 
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    DocumentMagnifyingGlassIcon,
    EnvelopeIcon,
    FingerPrintIcon
} from '@heroicons/react/24/outline';

const CONFIRMATION_PHRASE = "PERFORM CLEAN SLATE";

function AdminToolsPage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [mainAdminEmail, setMainAdminEmail] = useState('');
    const [confirmationInput, setConfirmationInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [resultSummary, setResultSummary] = useState(null);

    const isSuperuser = currentUser && currentUser.is_superuser;

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Global root authentication required.");
                navigate('/login', { replace: true });
            } else if (!isSuperuser) {
                toast.error("Access Denied: Insufficient privilege level.");
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

    const handleCleanSlateSubmit = async (event) => {
        event.preventDefault();
        if (!isSuperuser) return;

        if (confirmationInput !== CONFIRMATION_PHRASE) {
            setError(`Security mismatch. Type "${CONFIRMATION_PHRASE}" to proceed.`);
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');
        setResultSummary(null);

        try {
            const response = await axiosInstance.post('/admin-tools/perform-clean-slate', {
                main_admin_email: mainAdminEmail.trim()
            });
            
            setSuccessMessage(response.data.message);
            setResultSummary(response.data.summary);
            toast.success("System scrubbed successfully.");
            
            setMainAdminEmail('');
            setConfirmationInput('');
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Scrub operation failed.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Verifying system credentials..." size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl shadow-sm">
                    <ShieldExclamationIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Administrator Tools</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Elevated system maintenance and lifecycle management.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Danger Zone Form */}
                <div className="lg:col-span-7">
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-3xl shadow-xl shadow-red-100 dark:shadow-none border-2 border-red-200 dark:border-red-900/50">
                        <div className="flex items-center gap-2 mb-6 text-red-600 dark:text-red-400">
                            <ExclamationTriangleIcon className="h-6 w-6" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Perform Clean Slate</h2>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-8 space-y-3">
                            <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest">Destructive Action Warning</p>
                            <ul className="space-y-2">
                                <WarningItem text="Deactivates all user accounts except the specified admin." />
                                <WarningItem text="Reassigns all project ownership to the surviving admin." />
                                <WarningItem text="Clears active Project Manager assignments." />
                                <WarningItem text="Unassigns all tasks from deactivated users." />
                            </ul>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                                <ShieldExclamationIcon className="h-5 w-5" /> {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-2xl text-sm font-bold flex items-center gap-2">
                                <CheckBadgeIcon className="h-5 w-5" /> {successMessage}
                            </div>
                        )}
                        <form onSubmit={handleCleanSlateSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Admin Account to Preserve</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={mainAdminEmail}
                                        onChange={(e) => setMainAdminEmail(e.target.value)}
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-red-500 h-12"
                                        placeholder="admin@rafapp.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">
                                    Type <span className="text-red-500">"{CONFIRMATION_PHRASE}"</span>
                                </label>
                                <div className="relative">
                                    <FingerPrintIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={confirmationInput}
                                        onChange={(e) => setConfirmationInput(e.target.value)}
                                        className="pl-10 block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-red-500 h-12 font-mono text-sm"
                                        placeholder="REQUIRED PHRASE"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || confirmationInput !== CONFIRMATION_PHRASE || !mainAdminEmail}
                                className="w-full flex justify-center items-center h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                {isSubmitting ? <LoadingSpinner text="Executing Scrub..." size="sm" /> : (
                                    <>
                                        <TrashIcon className="h-6 w-6 mr-2" />
                                        Initialize Clean Slate
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Status & Results Sidebar */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Success Report */}
                    {resultSummary ? (
                        <div className="bg-green-600 text-white p-6 md:p-8 rounded-3xl shadow-xl animate-in zoom-in duration-300">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckBadgeIcon className="h-8 w-8" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Operation Report</h3>
                            </div>
                            <div className="space-y-4">
                                <StatRow label="Users Deactivated" value={resultSummary.users_deactivated} />
                                <StatRow label="Projects Reassigned" value={resultSummary.projects_reassigned} />
                                <StatRow label="PM Assignments Cleared" value={resultSummary.projects_pm_cleared} />
                                <StatRow label="Tasks Unassigned" value={resultSummary.tasks_unassigned} />
                            </div>
                            <div className="mt-8 pt-6 border-t border-green-500 flex items-center gap-2 text-xs font-bold text-green-100">
                                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                                <span>Registry integrity verified.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center min-h-[300px]">
                            <ArrowPathIcon className="h-12 w-12 text-gray-700 mb-4" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Waiting for Input</p>
                            <p className="text-xs text-gray-500 mt-2">Results will appear here after the scrub is initialized.</p>
                        </div>
                    )}

                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed italic">
                            "The Clean Slate operation is designed for staging environment resets. It effectively freezes all previous tenant activity while ensuring the primary system maintainer retains full root access."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Reusable warning line
 */
function WarningItem({ text }) {
    return (
        <li className="flex items-start gap-2 text-xs font-medium text-red-800 dark:text-red-300">
            <UserMinusIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{text}</span>
        </li>
    );
}

/**
 * Reusable summary statistics row
 */
function StatRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-green-500/50">
            <span className="text-xs font-bold uppercase tracking-wider text-green-100">{label}</span>
            <span className="text-2xl font-black">{value}</span>
        </div>
    );
}

export default AdminToolsPage;