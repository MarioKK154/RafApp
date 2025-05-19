// frontend/src/pages/AdminToolsPage.jsx
// Uncondensed Version: UI for Admin Clean Slate operation
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const CONFIRMATION_PHRASE = "PERFORM CLEAN SLATE"; // Case-sensitive

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

  // Effect for permission check and redirect
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in as a Superuser.");
        navigate('/login', { replace: true });
      } else if (!isSuperuser) {
        toast.error("Access Denied: This page is for Superusers only.");
        navigate('/', { replace: true }); // Redirect to home
      }
    }
  }, [isAuthenticated, authIsLoading, isSuperuser, navigate]);

  const handleCleanSlateSubmit = async (event) => {
    event.preventDefault();
    if (!isSuperuser) {
      toast.error("Unauthorized action.");
      return;
    }
    if (confirmationInput !== CONFIRMATION_PHRASE) {
      setError(`Please type "${CONFIRMATION_PHRASE}" exactly to confirm.`);
      toast.error("Confirmation text does not match.");
      return;
    }
    if (!mainAdminEmail.trim()) {
        setError("Please enter the email of the admin account to keep.");
        toast.error("Main admin email is required.");
        return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    setResultSummary(null);

    try {
      const response = await axiosInstance.post('/admin-tools/perform-clean-slate', {
        main_admin_email: mainAdminEmail
      });
      setSuccessMessage(response.data.message || "Clean slate operation initiated successfully.");
      setResultSummary(response.data.summary);
      toast.success("Clean Slate operation completed successfully!");
      // Optionally clear form, or suggest manual refresh/re-login
      setMainAdminEmail('');
      setConfirmationInput('');
    } catch (err) {
      console.error("Clean Slate operation error:", err);
      const errorMsg = err.response?.data?.detail || 'Clean Slate operation failed.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return (<div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading..." size="lg" /></div>);
  }

  if (!isAuthenticated || !isSuperuser) {
    // useEffect handles redirect, this is a fallback
    return (<div className="container mx-auto p-6 text-center text-red-500"><p>Access Denied. Redirecting...</p></div>);
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Administrator Tools</h1>

      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl border border-red-500 dark:border-red-700">
        <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">Perform Clean Slate Operation</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          <strong className="font-bold text-red-600 dark:text-red-400">WARNING:</strong> This is a highly destructive operation.
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
          <li>All users (except the one specified below) will be marked as <strong className="font-medium">inactive</strong>.</li>
          <li>Projects created by deactivated users will be reassigned to the specified main admin.</li>
          <li>Projects managed by deactivated users will have their Project Manager cleared.</li>
          <li>Tasks assigned to deactivated users will become unassigned.</li>
          <li>This operation is primarily for resetting a test environment or preparing for a fresh start while preserving one admin account.</li>
          <li><strong className="font-bold">Ensure the email provided below is correct and belongs to an existing Superuser account that you wish to preserve.</strong></li>
        </ul>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
          </div>
        )}
        {successMessage && !error && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-md" role="alert">
            {successMessage}
            {resultSummary && (
                <pre className="mt-2 text-xs whitespace-pre-wrap">
                    {JSON.stringify(resultSummary, null, 2)}
                </pre>
            )}
          </div>
        )}

        <form onSubmit={handleCleanSlateSubmit} className="space-y-6">
          <div>
            <label htmlFor="mainAdminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email of Superuser Admin to Keep <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="mainAdminEmail"
              name="mainAdminEmail"
              value={mainAdminEmail}
              onChange={(e) => setMainAdminEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              placeholder="admin_to_keep@example.com"
            />
          </div>

          <div>
            <label htmlFor="confirmationInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type "<span className="font-mono text-red-500">{CONFIRMATION_PHRASE}</span>" to confirm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="confirmationInput"
              name="confirmationInput"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"
              placeholder={CONFIRMATION_PHRASE}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || confirmationInput !== CONFIRMATION_PHRASE || !mainAdminEmail}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
{isSubmitting ? <LoadingSpinner text="Processing..." size="sm" /> : 'Perform Clean Slate'}
</button>
</div>
</form>
</div>
</div>
);
}

export default AdminToolsPage;