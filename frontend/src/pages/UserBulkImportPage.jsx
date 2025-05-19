// frontend/src/pages/UserBulkImportPage.jsx
// Uncondensed Version: UI for Admin to bulk import users from CSV
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner'; // For submission state

function UserBulkImportPage() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // To store results like { created_count, skipped_count, errors, parse_errors }
  const [uploadError, setUploadError] = useState(''); // For errors during the upload request itself

  const isAdmin = currentUser && currentUser.role === 'admin';

  // Effect for permission check and redirect
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        toast.error("You must be logged in.");
        navigate('/login', { replace: true });
      } else if (!isAdmin) {
        toast.error("Access Denied: You do not have permission to import users.");
        navigate('/users', { replace: true }); // Redirect to user list or home
      }
    }
  }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

  const handleFileChange = (event) => {
    setUploadResult(null); // Clear previous results
    setUploadError('');   // Clear previous errors
    const file = event.target.files[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        toast.error("Invalid file type. Please select a .csv file.");
        setSelectedFile(null);
        event.target.value = null; // Clear the file input
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.warn("Please select a CSV file to upload.");
      return;
    }
    if (!isAdmin) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axiosInstance.post('/users/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResult(response.data);
      toast.success(`CSV processed. Created: ${response.data.created_count}, Skipped/Errors: ${response.data.skipped_count + (response.data.parse_errors?.length || 0)}`);
    } catch (err) {
      console.error("Error uploading CSV:", err);
      const errorMsg = err.response?.data?.detail || 'File upload failed. Please ensure the file is a valid CSV and try again.';
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      // Clear the file input after submission attempt
      const fileInput = document.getElementById('csvFile');
      if (fileInput) {
        fileInput.value = null;
      }
      setSelectedFile(null);
    }
  };

  // --- Render Logic ---
  if (authIsLoading) {
    return ( <div className="min-h-screen flex justify-center items-center"><LoadingSpinner text="Loading page..." size="lg"/></div> );
  }
  if (!isAuthenticated || !isAdmin) {
    // useEffect handles redirect, this is a fallback or for the brief moment before redirect
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>{uploadError || "Access Denied or not authenticated. Redirecting..."}</p><Link to="/" className="text-blue-500 underline ml-2">Go Home</Link></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Bulk Import Users</h1>
        <Link to="/users" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          &larr; Back to User List
        </Link>
      </div>

      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Upload a CSV file to bulk create users.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Required CSV columns: <strong>Name</strong> (optional), <strong>Email</strong> (required), <strong>Employee ID</strong> (optional), <strong>Kennitala</strong> (optional), <strong>Phone</strong> (optional), <strong>Location</strong> (optional).
          <br/>
          Default password for new users will be "testpassword123". Default role will be "electrician".
          <br/>
          Users with existing Email, Employee ID, or Kennitala will be skipped. Employee IDs 252, 276, 323 will also be skipped.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select CSV File
            </label>
            <input
              type="file"
              id="csvFile"
              name="csvFile"
              accept=".csv, text/csv"
              onChange={handleFileChange}
              required
              className="mt-1 block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:placeholder-gray-400"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isUploading ? <LoadingSpinner text="Uploading..." size="sm" /> : 'Upload and Import Users'}
            </button>
          </div>
        </form>

        {/* Display Upload Results */}
        {uploadResult && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Import Results:</h3>
            <p className="text-sm text-green-600 dark:text-green-400">Users Created: {uploadResult.created_count}</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Users Skipped/Errors: {uploadResult.skipped_count + (uploadResult.parse_errors?.length || 0)}</p>

            {(uploadResult.errors?.length > 0 || uploadResult.parse_errors?.length > 0) && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Details:</p>
                <ul className="list-disc list-inside text-xs text-red-500 dark:text-red-400 max-h-40 overflow-y-auto">
                  {uploadResult.parse_errors?.map((err, index) => (
                    <li key={`parse-err-${index}`}>{err}</li>
                  ))}
                  {uploadResult.errors?.map((err, index) => (
                    <li key={`crud-err-${index}`}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
             {uploadResult.created_count > 0 && uploadResult.created_users_emails?.length > 0 && (
                <div className="mt-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Created User Emails:</p>
                    <ul className="list-disc list-inside text-xs text-green-500 dark:text-green-400 max-h-40 overflow-y-auto">
                        {uploadResult.created_users_emails.map((email, index) => (
                            <li key={`created-${index}`}>{email}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
        {/* Display general upload error if the request itself failed */}
        {uploadError && !uploadResult && (
             <div className="mt-6 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
                {uploadError}
            </div>
        )}

      </div>
    </div>
  );
}

export default UserBulkImportPage;