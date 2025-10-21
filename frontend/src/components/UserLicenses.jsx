// frontend/src/components/UserLicenses.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { DocumentArrowDownIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/solid';

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

function UserLicenses({ userId }) {
    const [licenses, setLicenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();

    // State for the upload form
    const [description, setDescription] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const canManageLicenses = currentUser && (currentUser.is_superuser || currentUser.role === 'admin' || currentUser.id === parseInt(userId, 10));

    const fetchLicenses = useCallback(async () => {
        if (!userId || !canManageLicenses) {
            setIsLoading(false);
            return; // No need to fetch if no permission or ID
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/users/${userId}/licenses/`);
            setLicenses(response.data);
        } catch (err) {
            setError('Failed to load user licenses.');
            toast.error('Failed to load licenses.');
        } finally {
            setIsLoading(false);
        }
    }, [userId, canManageLicenses]);

    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            if (e.target.files[0].type !== 'application/pdf') {
                toast.error("Only PDF files are allowed.");
                e.target.value = ''; // Reset file input
                setSelectedFile(null);
            } else {
                setSelectedFile(e.target.files[0]);
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !description) {
            toast.warn("Please provide a description and select a PDF file.");
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('description', description);
        if (issueDate) formData.append('issue_date', issueDate);
        if (expiryDate) formData.append('expiry_date', expiryDate);
        formData.append('file', selectedFile);

        try {
            await axiosInstance.post(`/users/${userId}/licenses/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('License uploaded successfully!');
            // Reset form and refetch
            setDescription(''); setIssueDate(''); setExpiryDate(''); setSelectedFile(null);
            document.getElementById('license-file-input').value = ''; // Clear file input visually
            fetchLicenses();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to upload license.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (licenseId, licenseDesc) => {
        if (!window.confirm(`Are you sure you want to delete the license "${licenseDesc}"?`)) return;
        try {
            await axiosInstance.delete(`/users/licenses/${licenseId}`);
            toast.success(`License "${licenseDesc}" deleted.`);
            fetchLicenses();
        } catch (err) {
            toast.error('Failed to delete license.');
        }
    };

    const handleDownload = async (licenseId, filename) => {
        try {
            const response = await axiosInstance.get(`/users/licenses/${licenseId}/download`, {
                responseType: 'blob', // Important for file download
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `license_${licenseId}.pdf`); // Use original filename
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Could not download file.");
            console.error("Download error:", error);
        }
    };


    if (!canManageLicenses) {
        return <p className="text-sm text-gray-500">License information is private or requires higher permission.</p>;
    }

    if (isLoading) {
        return <LoadingSpinner text="Loading Licenses..." />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">User Licenses</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 space-y-3">
                <h3 className="font-medium">Upload New License (PDF only)</h3>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium">Description*</label>
                    <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full rounded-md"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="issueDate" className="block text-sm font-medium">Issue Date</label>
                        <input type="date" id="issueDate" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="mt-1 block w-full rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium">Expiry Date</label>
                        <input type="date" id="expiryDate" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-1 block w-full rounded-md"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="license-file-input" className="block text-sm font-medium">PDF File*</label>
                    <input type="file" id="license-file-input" onChange={handleFileChange} required accept="application/pdf" className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
                <button type="submit" disabled={isUploading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center disabled:opacity-50">
                    <PlusIcon className="h-5 w-5 mr-1"/> {isUploading ? 'Uploading...' : 'Upload License'}
                </button>
            </form>

            {/* List of Licenses */}
            {licenses.length > 0 ? (
                <ul className="divide-y dark:divide-gray-700">
                    {licenses.map(license => (
                        <li key={license.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium">{license.description}</p>
                                <p className="text-sm text-gray-500">
                                    Issued: {formatDate(license.issue_date)}
                                    {license.expiry_date && ` | Expires: ${formatDate(license.expiry_date)}`}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleDownload(license.id, license.filename)}
                                    title="Download PDF"
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                >
                                    <DocumentArrowDownIcon className="h-5 w-5"/>
                                </button>
                                <button
                                    onClick={() => handleDelete(license.id, license.description)}
                                    title="Delete License"
                                    className="p-1 text-red-600 hover:text-red-800"
                                >
                                    <TrashIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500">No licenses uploaded for this user.</p>
            )}
        </div>
    );
}

export default UserLicenses;