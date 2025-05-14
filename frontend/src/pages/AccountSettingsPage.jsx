// frontend/src/pages/AccountSettingsPage.jsx
// Uncondensed Version: Corrected typos in useState declarations
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function AccountSettingsPage() {
  const { user, isAuthenticated, isLoading: authIsLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState(''); // Corrected
  const [passwordError, setPasswordError] = useState('');          // Corrected
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Redirect if not authenticated or auth is still loading
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
      setPasswordError('New password must be at least 8 characters long.');
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      toast.error('New passwords do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await axiosInstance.post('/users/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully! Please log in again with your new password.');
      logout(); // This will clear context and local storage
      navigate('/login'); // Redirect to login page
    } catch (err) {
      console.error("Error changing password:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to change password. Please check your current password.';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmittingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400">Loading account details...</p>
        </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>You must be logged in to view this page. Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Account Settings</h1>

      {/* User Details Section */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-8 max-w-lg">
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
        {user.role === 'admin' && (
            <div className="mt-4">
                <Link to={`/users/edit/${user.id}`} className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Edit full profile (Admin)
                </Link>
            </div>
        )}
      </div>

      {/* Change Password Form */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Change Password</h2>
        {passwordError && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {passwordError}
          </div>
        )}
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmittingPassword}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input
              type="password"
              name="newPassword"
              id="newPassword"
              required
              minLength="8"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmittingPassword}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input
              type="password"
              name="confirmNewPassword"
              id="confirmNewPassword"
              required
              minLength="8"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              disabled={isSubmittingPassword}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmittingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountSettingsPage;