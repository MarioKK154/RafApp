import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    UserIcon, 
    KeyIcon, 
    PhotoIcon, 
    IdentificationIcon, 
    DevicePhoneMobileIcon,
    MapPinIcon,
    ShieldCheckIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    EnvelopeIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';

function AccountSettingsPage() {
    const { t } = useTranslation();
    const { user, isAuthenticated, isLoading: authIsLoading, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    // Password Terminal State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Visual Identity State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    /**
     * Protocol: Security Boundary Check
     */
    useEffect(() => {
        if (!authIsLoading && !isAuthenticated) {
            toast.error(t('auth_required', { defaultValue: 'Security clearance required.' }));
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authIsLoading, navigate, t]);

    /**
     * Protocol: Credential Rotation Logic
     */
    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword.length < 8) {
            toast.error(t('password_too_short', { defaultValue: 'Security keys must be at least 8 characters.' }));
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error(t('passwords_mismatch', { defaultValue: 'Key confirmation mismatch.' }));
            return;
        }

        setIsSubmittingPassword(true);
        try {
            await axiosInstance.post('/users/me/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success(t('security_updated', { defaultValue: 'Credentials updated. Re-authentication required.' }));
            
            // Security protocol: Force logout after credential change
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 2000);
        } catch (error) {
            console.error('Password update failed:', error);
            toast.error(error.response?.data?.detail || t('update_failed'));
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    /**
     * Protocol: Visual Assets Handling
     */
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(t('file_too_large', { defaultValue: 'Asset exceeds 5MB threshold.' }));
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        try {
            const response = await axiosInstance.post('/users/me/profile-picture', formData);
            updateUser(response.data);
            toast.success(t('avatar_updated', { defaultValue: 'Visual identity synchronized.' }));
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error('Profile photo upload failed:', error);
            toast.error(t('upload_failed', { defaultValue: 'Registry sync failed.' }));
        } finally {
            setIsUploading(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text={t('syncing')} size="lg" />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header: Identity Management */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">
                        {t('account_settings')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] italic">
                        {t('profile_management', { defaultValue: 'Personal Identity & Security Protocols' })}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Information & Security Matrix (Left) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Personnel Registry Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <IdentificationIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('personal_registry', { defaultValue: 'Personnel Records' })}</h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoItem label={t('full_name')} value={user.full_name} icon={<UserIcon className="h-4 w-4" />} />
                            <InfoItem label={t('email')} value={user.email} icon={<EnvelopeIcon className="h-4 w-4" />} />
                            <InfoItem label={t('role', { defaultValue: 'Company Role' })} value={user.role} badge />
                            <InfoItem label={t('employee_id', { defaultValue: 'Employee ID' })} value={user.employee_id} icon={<IdentificationIcon className="h-4 w-4" />} />
                            <InfoItem label={t('kennitala', { defaultValue: 'National ID' })} value={user.kennitala} icon={<ShieldCheckIcon className="h-4 w-4" />} />
                            <InfoItem label={t('phone', { defaultValue: 'Phone' })} value={user.phone_number} icon={<DevicePhoneMobileIcon className="h-4 w-4" />} />
                            <div className="md:col-span-2">
                                <InfoItem label={t('location', { defaultValue: 'Assigned Base' })} value={user.location} icon={<MapPinIcon className="h-4 w-4" />} />
                            </div>
                        </div>
                    </div>

                    {/* Security Credential Rotation Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center gap-3">
                            <KeyIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('security_credentials', { defaultValue: 'Encryption Keys' })}</h2>
                        </div>
                        <form onSubmit={handlePasswordChangeSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('current_password', { defaultValue: 'Active Password' })}</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={currentPassword} 
                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                    className="modern-input" 
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('new_password', { defaultValue: 'Target Password' })}</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="modern-input"
                                        placeholder="MIN. 8 CHARS"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">{t('confirm_password', { defaultValue: 'Verify Protocol' })}</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={confirmNewPassword} 
                                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                                        className="modern-input" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-50 dark:border-gray-700">
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingPassword} 
                                    className="inline-flex items-center px-10 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingPassword ? (
                                        <><ArrowPathIcon className="h-5 w-5 animate-spin mr-3" /> {t('syncing')}</>
                                    ) : (
                                        <><ShieldCheckIcon className="h-5 w-5 mr-3" /> {t('update_credentials', { defaultValue: 'Update Security Keys' })}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Visual Identity Terminal (Right) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center">
                        <div className="w-full flex items-center gap-3 mb-8">
                            <PhotoIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('visual_identity', { defaultValue: 'System Avatar' })}</h2>
                        </div>
                        
                        <div className="relative group">
                            <div className="w-56 h-56 rounded-full p-2 border-2 border-indigo-100 dark:border-indigo-900/50 border-dashed animate-in zoom-in duration-700">
                                <img 
                                    src={previewUrl || user.profile_picture_url || '/default-avatar.png'} 
                                    alt="Identity Preview" 
                                    className="w-full h-full rounded-full object-cover shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                                    onError={(e) => { e.target.src='/default-avatar.png' }}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-full flex flex-col items-center justify-center">
                                        <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">{t('syncing')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 w-full space-y-3">
                            <input type="file" id="profilePicInput" hidden accept="image/*" onChange={handleFileChange} />
                            <label 
                                htmlFor="profilePicInput" 
                                className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
                            >
                                <PhotoIcon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    {selectedFile ? t('change_asset', { defaultValue: 'Replace Asset' }) : t('choose_photo', { defaultValue: 'Choose Visual' })}
                                </span>
                            </label>
                            
                            {selectedFile && (
                                <button 
                                    onClick={handleUpload} 
                                    disabled={isUploading} 
                                    className="w-full h-12 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                                >
                                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                    {t('commit_asset', { defaultValue: 'Commit Visualization' })}
                                </button>
                            )}
                        </div>
                        <p className="mt-6 text-[8px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">Format: JPG/PNG/GIF • limit: 5MB</p>
                    </div>

                    {/* Root Privilege Indicator */}
                    {user.is_superuser && (
                        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldCheckIcon className="h-20 w-20" />
                            </div>
                            <div className="flex items-center gap-3 mb-4 relative">
                                <ShieldCheckIcon className="h-5 w-5 text-indigo-400" />
                                <h3 className="text-xs font-black uppercase tracking-widest">{t('root_access', { defaultValue: 'Root Authority' })}</h3>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-bold uppercase tracking-tight relative">
                                {t('root_warning', { defaultValue: 'System-wide administrative privileges active. Cross-tenant visibility and registry override enabled.' })}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Technical Component: Profile Data Point
 */
function InfoItem({ label, value, icon, badge = false }) {
    return (
        <div className="group">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{label}</p>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10 transition-colors">
                {icon && <span className="text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
                <span className={`text-sm font-bold truncate ${badge ? 'uppercase tracking-tighter text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {value || '---'}
                </span>
            </div>
        </div>
    );
}

export default AccountSettingsPage;