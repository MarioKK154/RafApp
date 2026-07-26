import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { 
    KeyIcon, 
    LockClosedIcon, 
    EyeIcon, 
    EyeSlashIcon, 
    CheckCircleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            toast.error(t('invalid_token', { defaultValue: 'Missing or invalid reset token.' }));
            return;
        }

        if (newPassword.length < 8) {
            toast.error(t('password_length_err', { defaultValue: 'Password must be at least 8 characters long.' }));
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error(t('passwords_do_not_match', { defaultValue: 'Passwords do not match.' }));
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axiosInstance.post('/auth/reset-password', {
                token: token,
                new_password: newPassword
            });
            setIsSuccess(true);
            toast.success(res.data.message || t('password_reset_success', { defaultValue: 'Password updated successfully!' }));
        } catch (err) {
            const msg = err.response?.data?.detail || t('password_reset_err', { defaultValue: 'Failed to reset password. Token may be expired.' });
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Ambient Background Gradient Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-gray-900/80 border border-indigo-950/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl z-10 relative">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4">
                        <KeyIcon className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-wider text-white">
                        {t('reset_password_title', { defaultValue: 'Endursetja Lykilorð' })}
                    </h1>
                    <p className="text-xs font-bold text-gray-400 mt-2">
                        {t('reset_password_subtitle', { defaultValue: 'Sláðu inn nýtt lykilorð fyrir aðganginn þinn.' })}
                    </p>
                </div>

                {!token ? (
                    <div className="text-center space-y-4">
                        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-bold">
                            {t('missing_token_msg', { defaultValue: 'Enginn endursetningarlykill fannst í slóðinni. Vinsamlegast biðjið um nýjan hlekk.' })}
                        </div>
                        <Link 
                            to="/login"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            {t('back_to_login', { defaultValue: 'Aftur í innskráningu' })}
                        </Link>
                    </div>
                ) : isSuccess ? (
                    <div className="text-center space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs font-bold flex flex-col items-center gap-3">
                            <CheckCircleIcon className="h-10 w-10 text-teal-400" />
                            <span>{t('password_reset_done', { defaultValue: 'Lykilorði þínu hefur verið breytt! Þú getur nú skráð þig inn.' })}</span>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-600/30"
                        >
                            <LockClosedIcon className="h-4 w-4" />
                            {t('go_to_login', { defaultValue: 'Skrá sig inn' })}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                                {t('new_password_label', { defaultValue: 'Nýtt lykilorð (lágmark 8 stafir)' })}
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-4 pr-12 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                >
                                    {showNewPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                                {t('confirm_password_label', { defaultValue: 'Staðfesta nýtt lykilorð' })}
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-4 pr-12 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                        >
                            <LockClosedIcon className="h-4 w-4" />
                            {isSubmitting ? t('saving', { defaultValue: 'Vistar...' }) : t('update_password_btn', { defaultValue: 'Breyta lykilorði' })}
                        </button>

                        <div className="text-center pt-2">
                            <Link 
                                to="/login"
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition"
                            >
                                {t('cancel_back_to_login', { defaultValue: 'Hætta við / Aftur í innskráningu' })}
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
