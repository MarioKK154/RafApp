// frontend/src/pages/AccountSettingsPage.jsx
// Final, synchronized version with all features.

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function AccountSettingsPage() {
    const { user, isAuthenticated, isLoading: authIsLoading, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    // State for Password Change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // State for Profile Picture
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!authIsLoading && !isAuthenticated) {
            toast.error("You must be logged in to view account settings.");
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authIsLoading, navigate]);

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (newPassword.length < 8) {
            const msg = 'New password must be at least 8 characters long.';
            setPasswordError(msg);
            toast.error(msg);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            const msg = 'New passwords do not match.';
            setPasswordError(msg);
            toast.error(msg);
            return;
        }
        setIsSubmittingPassword(true);
        try {
            await axiosInstance.post('/users/me/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Password changed successfully! Please log in again.');
            logout();
            navigate('/login');
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to change password.';
            setPasswordError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmittingPassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("File is too large. Maximum size is 5MB.");
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
            updateUser(response.data); // Update global user state
            toast.success("Profile picture updated successfully!");
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Failed to upload picture.";
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    if (authIsLoading) {
        return <LoadingSpinner text="Loading account details..." />;
    }

    if (!isAuthenticated || !user) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>Redirecting to login...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Account Settings</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details & Password */}
                <div className="lg:col-span-2 space-y-8">
                    {/* User Details Section */}
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Your Information</h2>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Full Name:</strong> {user.full_name || 'Not set'}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Email:</strong> {user.email}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Role:</strong> {user.role}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Employee ID:</strong> {user.employee_id || '-'}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Kennitala:</strong> {user.kennitala || '-'}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Phone:</strong> {user.phone_number || '-'}</p>
                            <p><strong className="font-medium text-gray-800 dark:text-gray-100">Location:</strong> {user.location || '-'}</p>
                        </div>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Change Password</h2>
                        {passwordError && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{passwordError}</div>}
                        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="currentPassword">Current Password</label>
                                <input type="password" name="currentPassword" id="currentPassword" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isSubmittingPassword} className="mt-1 block w-full rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label htmlFor="newPassword">New Password</label>
                                <input type="password" name="newPassword" id="newPassword" required minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSubmittingPassword} className="mt-1 block w-full rounded-md shadow-sm" placeholder="Min. 8 characters"/>
                            </div>
                            <div>
                                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                                <input type="password" name="confirmNewPassword" id="confirmNewPassword" required minLength="8" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} disabled={isSubmittingPassword} className="mt-1 block w-full rounded-md shadow-sm"/>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isSubmittingPassword} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                                    {isSubmittingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Profile Picture */}
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 h-fit">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Profile Picture</h2>
                    <div className="flex flex-col items-center space-y-4">
                        <img 
                            src={previewUrl || user.profile_picture_url || '/default-avatar.png'} 
                            alt="Profile"
                            className="w-48 h-48 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                            onError={(e) => { e.target.onerror = null; e.target.src='/default-avatar.png' }}
                        />
                        <input type="file" id="profilePicInput" hidden accept="image/jpeg, image/png, image/gif" onChange={handleFileChange} />
                        <label htmlFor="profilePicInput" className="cursor-pointer w-full text-center px-4 py-2 border rounded-md shadow-sm">
                            Choose Image
                        </label>
                        {selectedFile && (
                            <div className="w-full text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">Selected: {selectedFile.name}</p>
                                <button onClick={handleUpload} disabled={isUploading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                                    {isUploading ? 'Uploading...' : 'Save Picture'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AccountSettingsPage;