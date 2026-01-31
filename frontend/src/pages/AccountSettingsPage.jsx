import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    ArrowPathIcon
} from '@heroicons/react/24/outline';

function AccountSettingsPage() {
    const { user, isAuthenticated, isLoading: authIsLoading, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Profile Pic State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!authIsLoading && !isAuthenticated) {
            toast.error("Authentication required.");
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authIsLoading, navigate]);

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error('Minimum password length is 8 characters.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error('New passwords do not match.');
            return;
        }

        setIsSubmittingPassword(true);
        try {
            await axiosInstance.post('/users/me/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Security credentials updated. Please log in again.');
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 2000);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Update failed.');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File exceeds 5MB limit.");
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
            toast.success("Profile visualization updated.");
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            toast.error("Failed to sync profile picture.");
        } finally {
            setIsUploading(false);
        }
    };

    if (authIsLoading) return <LoadingSpinner text="Retrieving account profile..." />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your personal identity and security credentials.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Information & Security */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* User Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                            <IdentificationIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Personal Registry</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoItem label="Full Name" value={user.full_name} icon={<UserIcon className="h-4 w-4" />} />
                            <InfoItem label="Email Address" value={user.email} icon={<ShieldCheckIcon className="h-4 w-4" />} />
                            <InfoItem label="Company Role" value={user.role} badge />
                            <InfoItem label="Employee ID" value={user.employee_id} icon={<IdentificationIcon className="h-4 w-4" />} />
                            <InfoItem label="Kennitala" value={user.kennitala} />
                            <InfoItem label="Phone" value={user.phone_number} icon={<DevicePhoneMobileIcon className="h-4 w-4" />} />
                            <div className="md:col-span-2">
                                <InfoItem label="Assigned Base Location" value={user.location} icon={<MapPinIcon className="h-4 w-4" />} />
                            </div>
                        </div>
                    </div>

                    {/* Password Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                            <KeyIcon className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Security Credentials</h2>
                        </div>
                        <form onSubmit={handlePasswordChangeSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">Current Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={currentPassword} 
                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                    className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">New Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                        placeholder="Min. 8 chars"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase mb-1 ml-1">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        required 
                                        value={confirmNewPassword} 
                                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                                        className="block w-full rounded-2xl border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingPassword} 
                                    className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmittingPassword ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheckIcon className="h-5 w-5 mr-2" />}
                                    Update Credentials
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Visual Identity */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <PhotoIcon className="h-5 w-5 text-indigo-600" />
                            Visual Identity
                        </h2>
                        <div className="flex flex-col items-center">
                            <div className="relative group">
                                <img 
                                    src={previewUrl || user.profile_picture_url || '/default-avatar.png'} 
                                    alt="User Profile"
                                    className="w-48 h-48 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-xl"
                                    onError={(e) => { e.target.src='/default-avatar.png' }}
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center">
                                        <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 w-full space-y-3">
                                <input type="file" id="profilePicInput" hidden accept="image/*" onChange={handleFileChange} />
                                <label 
                                    htmlFor="profilePicInput" 
                                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-sm font-bold text-gray-500 dark:text-gray-400"
                                >
                                    <PhotoIcon className="h-5 w-5 mr-2" />
                                    {selectedFile ? 'Change Image' : 'Choose New Photo'}
                                </label>
                                
                                {selectedFile && (
                                    <button 
                                        onClick={handleUpload} 
                                        disabled={isUploading} 
                                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 disabled:opacity-50"
                                    >
                                        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                                        Save Changes
                                    </button>
                                )}
                            </div>
                            <p className="mt-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">JPG, PNG or GIF • Max 5MB</p>
                        </div>
                    </div>

                    {/* God Mode Indicator */}
                    {user.is_superuser && (
                        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheckIcon className="h-6 w-6" />
                                <h3 className="font-black uppercase tracking-tighter">System Administrator</h3>
                            </div>
                            <p className="text-xs text-orange-100 leading-relaxed">
                                You are operating with global root privileges. All tenant boundaries are visible to this account.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Reusable layout for profile data points
 */
function InfoItem({ label, value, icon, badge = false }) {
    return (
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">{label}</p>
            <div className={`flex items-center gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600`}>
                {icon && <span className="text-indigo-500">{icon}</span>}
                <span className={`text-sm font-bold ${badge ? 'uppercase tracking-tighter text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {value || '—'}
                </span>
            </div>
        </div>
    );
}

export default AccountSettingsPage;