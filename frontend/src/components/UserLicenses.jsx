import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { 
    IdentificationIcon, 
    ArrowDownTrayIcon, 
    TrashIcon, 
    PlusIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

function UserLicenses({ userId }) {
    const [licenses, setLicenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();

    // Upload Form State
    const [description, setDescription] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [licenseToDelete, setLicenseToDelete] = useState(null);

    // Permissions: Superadmin has global root access to manage any license
    const isSuperuser = currentUser?.is_superuser;
    const canManageLicenses = currentUser && (
        isSuperuser || 
        currentUser.role === 'admin' || 
        currentUser.id === parseInt(userId, 10)
    );

    const fetchLicenses = useCallback(async () => {
        if (!userId || !canManageLicenses) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/users/${userId}/licenses/`);
            setLicenses(response.data);
        } catch (error) {
            console.error('Fetch licenses error:', error);
            setError('Failed to synchronize certification registry.');
        } finally {
            setIsLoading(false);
        }
    }, [userId, canManageLicenses]);

    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                toast.error("Certification documents must be in PDF format.");
                e.target.value = '';
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !description) {
            toast.warn("Please provide a name/description and select the PDF file.");
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
            toast.success('License added to registry.');
            
            // Reset form
            setDescription(''); setIssueDate(''); setExpiryDate(''); setSelectedFile(null);
            const fileInput = document.getElementById('license-file-input');
            if (fileInput) fileInput.value = '';
            
            fetchLicenses();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const triggerDelete = (license) => {
        setLicenseToDelete(license);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!licenseToDelete) return;
        try {
            await axiosInstance.delete(`/users/licenses/${licenseToDelete.id}`);
            toast.success(`Removed: ${licenseToDelete.description}`);
            fetchLicenses();
        } catch (error) {
            console.error('Delete license failed:', error);
            toast.error('Could not delete document.');
        } finally {
            setIsDeleteModalOpen(false);
            setLicenseToDelete(null);
        }
    };

    const handleDownload = async (licenseId, filename) => {
        try {
            const response = await axiosInstance.get(`/users/licenses/${licenseId}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `license_${licenseId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('License download failed:', error);
            toast.error("File retrieval failed.");
        }
    };

    /**
     * Checks if a license is expired or expires within 30 days.
     */
    const getLicenseStatus = (expiryDate) => {
        if (!expiryDate) return null;
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'warning';
        return 'valid';
    };

    if (!canManageLicenses) {
        return (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 mt-8">
                <p className="text-sm text-gray-500 italic flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5" />
                    License data is restricted to administrative staff.
                </p>
            </div>
        );
    }

    if (isLoading) return <LoadingSpinner text="Accessing personnel certifications..." size="sm" />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <IdentificationIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Licenses & Certifications</h2>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs">{error}</div>}

            {/* Upload Form */}
            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Register New Certification</h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Document Title*</label>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="e.g., Master Electrician License"
                                required 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Select PDF Document*</label>
                            <input 
                                type="file" 
                                id="license-file-input" 
                                onChange={handleFileChange} 
                                required 
                                accept="application/pdf"
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Issue Date</label>
                            <input 
                                type="date" 
                                value={issueDate} 
                                onChange={e => setIssueDate(e.target.value)} 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Expiry Date</label>
                            <input 
                                type="date" 
                                value={expiryDate} 
                                onChange={e => setExpiryDate(e.target.value)} 
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isUploading || !selectedFile} 
                            className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            <PlusIcon className="h-5 w-5 mr-1.5" />
                            {isUploading ? 'Registering...' : 'Upload Certification'}
                        </button>
                    </div>
                </form>
            </div>

            {/* License Registry List */}
            <div className="space-y-3">
                {licenses.length > 0 ? (
                    licenses.map(license => {
                        const status = getLicenseStatus(license.expiry_date);
                        return (
                            <div key={license.id} className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${
                                        status === 'expired' ? 'bg-red-50 text-red-600' : 
                                        status === 'warning' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                        <DocumentTextIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            {license.description}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1 uppercase font-medium">
                                                <CalendarIcon className="h-3 w-3" />
                                                Issued: {formatDate(license.issue_date)}
                                            </p>
                                            {license.expiry_date && (
                                                <p className={`text-[10px] flex items-center gap-1 uppercase font-bold ${
                                                    status === 'expired' ? 'text-red-600' : 
                                                    status === 'warning' ? 'text-orange-600' : 'text-gray-400'
                                                }`}>
                                                    {status === 'expired' && <ExclamationTriangleIcon className="h-3 w-3" />}
                                                    Expires: {formatDate(license.expiry_date)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(license.id, license.filename)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                        title="Download PDF"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </button>
                                    {(isSuperuser || currentUser.role === 'admin') && (
                                        <button
                                            onClick={() => triggerDelete(license)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition"
                                            title="Delete Entry"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                        <IdentificationIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 italic">No professional certifications found for this user.</p>
                    </div>
                )}
            </div>

            {/* Standardized Deletion Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setLicenseToDelete(null); }}
                onConfirm={confirmDelete}
                title="Purge Certification Record"
                message={`Are you sure you want to delete "${licenseToDelete?.description}"? This document will be removed from legal personnel records.`}
                confirmText="Permanently Delete"
                type="danger"
            />
        </div>
    );
}

export default UserLicenses;