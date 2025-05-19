// frontend/src/components/ProjectDrawings.jsx
// Uncondensed Version: Implemented authenticated download & updated notifications
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance'; // Use your configured axiosInstance
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { toast } from 'react-toastify';

// API_BASE_URL is not strictly needed if all calls go via axiosInstance or for previews
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function ProjectDrawings({ projectId }) {
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(''); // For listing errors
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(''); // For upload form errors
    const { user, isAuthenticated } = useAuth();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [drawingToDelete, setDrawingToDelete] = useState(null);
    const [downloadingDrawingId, setDownloadingDrawingId] = useState(null);


    const canManageDrawings = user && ['admin', 'project manager', 'team leader'].includes(user.role);

    const fetchDrawings = useCallback(() => {
        if (!projectId || !isAuthenticated) {
            setIsLoading(false); // Ensure loading stops
            return;
        }
        setIsLoading(true);
        setError('');
        axiosInstance.get(`/drawings/project/${projectId}`)
            .then(response => {
                setDrawings(response.data);
            })
            .catch(err => {
                console.error("Error fetching drawings:", err);
                setError('Failed to load drawings for this project.');
                // toast.error('Failed to load drawings.'); // Can be noisy on initial load fail
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [projectId, isAuthenticated]);

    useEffect(() => {
        fetchDrawings();
    }, [fetchDrawings]);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setUploadError(''); // Clear previous upload error
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.warn("Please select a file to upload.");
            setUploadError("Please select a file.");
            return;
        }
        if (!canManageDrawings) {
            toast.error("You don't have permission to upload drawings.");
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('description', description);
        // uploader_id is set by the backend based on current_user

        setIsUploading(true);
        setUploadError('');
        setError(''); // Clear general list errors

        try {
            await axiosInstance.post(`/drawings/upload/${projectId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(`Drawing "${selectedFile.name}" uploaded successfully!`);
            setSelectedFile(null);
            setDescription('');
            if (e.target && typeof e.target.reset === 'function') {
                e.target.reset(); // Reset the form, including file input
            }
            fetchDrawings(); // Refresh the list
        } catch (err) {
            console.error("Error uploading drawing:", err);
            const errorMsg = err.response?.data?.detail || 'Failed to upload drawing.';
            setUploadError(errorMsg); // Set specific upload error
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClick = (drawing) => {
        // Add permission check: only uploader or Admin/PM/TL can delete
        const canDelete = user && (user.id === drawing.uploader_id || ['admin', 'project manager', 'team leader'].includes(user.role));
        if (!canDelete) {
            toast.error("You don't have permission to delete this drawing.");
            return;
        }
        setDrawingToDelete(drawing);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteDrawing = async () => {
        if (!drawingToDelete) return;
        try {
            await axiosInstance.delete(`/drawings/${drawingToDelete.id}`);
            toast.success(`Drawing "${drawingToDelete.filename}" deleted successfully.`);
            fetchDrawings();
        } catch (err) {
            console.error("Error deleting drawing:", err);
            toast.error(err.response?.data?.detail || 'Failed to delete drawing.');
        } finally {
            setIsDeleteModalOpen(false);
            setDrawingToDelete(null);
        }
    };

    // --- NEW: Handle Drawing Download ---
    const handleDownloadDrawing = async (drawingId, filename) => {
        if (!isAuthenticated) {
            toast.error("Please log in to download drawings.");
            return;
        }
        setDownloadingDrawingId(drawingId);
        try {
            const response = await axiosInstance.get(`/drawings/download/${drawingId}`, {
                responseType: 'blob', // Crucial for file downloads
            });

            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename); // Use the original filename
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            toast.success(`Downloading ${filename}...`);
        } catch (err) {
            console.error("Error downloading drawing:", err);
            toast.error(err.response?.data?.detail || `Failed to download ${filename}.`);
        } finally {
            setDownloadingDrawingId(null);
        }
    };
    // --- End New Handler ---


    if (isLoading) {
        return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading drawings...</p>;
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Drawings</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {canManageDrawings && (
                <form onSubmit={handleUpload} className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 space-y-3">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Upload New Drawing</h3>
                    {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
                    <div>
                        <label htmlFor={`drawingFile-${projectId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Drawing File (PDF, Images)</label>
                        <input
                            type="file"
                            name="drawingFile"
                            id={`drawingFile-${projectId}`} // Unique ID for label
                            required
                            // Consider specific accept types: "application/pdf,image/*"
                            onChange={handleFileChange}
                            className="mt-1 block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:placeholder-gray-400"
                        />
                    </div>
                    <div>
                        <label htmlFor={`drawingDescription-${projectId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                        <input
                            type="text"
                            name="description"
                            id={`drawingDescription-${projectId}`} // Unique ID
                            value={description}
                            onChange={handleDescriptionChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Brief description of the drawing..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isUploading || !selectedFile}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading...' : 'Upload Drawing'}
                    </button>
                </form>
            )}

            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Uploaded Drawings</h3>
            {drawings.length === 0 && !error ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No drawings uploaded for this project yet.</p>
            ) : (
                <ul className="space-y-3">
                    {drawings.map(drawing => (
                        <li key={drawing.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 flex justify-between items-center shadow-sm">
                            <div className="flex-grow">
                                <span className="font-medium text-gray-900 dark:text-white">{drawing.filename}</span>
                                {drawing.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{drawing.description}</p>}
                                <p className="text-xs text-gray-400 dark:text-gray-500">Uploaded: {new Date(drawing.uploaded_at).toLocaleDateString()}</p>
                                {/* Download Button */}
                                <button
                                    onClick={() => handleDownloadDrawing(drawing.id, drawing.filename)}
                                    disabled={downloadingDrawingId === drawing.id}
                                    className="mt-1 text-xs px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                >
                                    {downloadingDrawingId === drawing.id ? 'Downloading...' : 'Download'}
                                </button>
                            </div>
                            {canManageDrawings && ( // Or more specific permission check
                                <button
                                    onClick={() => handleDeleteClick(drawing)}
                                    className="ml-4 px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                                    aria-label="Delete drawing"
                                >
                                    Delete
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setDrawingToDelete(null); }}
                onConfirm={confirmDeleteDrawing}
                title="Confirm Drawing Deletion"
            >
                Are you sure you want to delete the drawing:
                <strong className="font-semibold block mt-1"> "{drawingToDelete?.filename}"</strong>?
            </Modal>
        </div>
    );
}

export default ProjectDrawings;