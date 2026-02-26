import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { 
    CameraIcon, 
    CloudArrowUpIcon, 
    TrashIcon, 
    ArrowDownTrayIcon,
    PhotoIcon,
    UserIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

const PHOTO_MODERATOR_ROLES = ["admin", "project manager", "team leader"];

function TaskPhotos({ taskId }) {
    const [photos, setPhotos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    const { user, isAuthenticated } = useAuth();

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);
    const [, setDownloadingPhotoId] = useState(null);

    // Permission Logic
    const isSuperuser = user?.is_superuser;
    const canModerate = user && (PHOTO_MODERATOR_ROLES.includes(user.role) || isSuperuser);

    const fetchPhotos = useCallback(async () => {
        if (!taskId || !isAuthenticated) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/task_photos/task/${taskId}`);
            setPhotos(response.data);
        } catch (error) {
            console.error('Fetch photos error:', error);
            setError('Unable to load photo gallery.');
        } finally {
            setIsLoading(false);
        }
    }, [taskId, isAuthenticated]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
        } else {
            setSelectedFile(null);
            toast.error("Please select a valid image file (JPG, PNG).");
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (description) formData.append('description', description);

        try {
            await axiosInstance.post(`/task_photos/upload/${taskId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success("Photo uploaded to task.");
            setSelectedFile(null);
            setDescription('');
            // Reset the native file input
            const fileInput = document.getElementById(`file-upload-${taskId}`);
            if (fileInput) fileInput.value = '';
            fetchPhotos();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (photoId, filename) => {
        setDownloadingPhotoId(photoId);
        try {
            const response = await axiosInstance.get(`/task_photos/download/${photoId}`, { 
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error("Download failed.");
        } finally {
            setDownloadingPhotoId(null);
        }
    };

    const triggerDelete = (photo) => {
        setPhotoToDelete(photo);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!photoToDelete) return;
        try {
            await axiosInstance.delete(`/task_photos/${photoToDelete.id}`);
            toast.success("Photo removed.");
            fetchPhotos();
        } catch (error) {
            console.error('Delete photo failed:', error);
            toast.error("Delete failed.");
        } finally {
            setIsDeleteModalOpen(false);
            setPhotoToDelete(null);
        }
    };

    if (isLoading) return <LoadingSpinner text="Developing photos..." size="sm" />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <CameraIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Evidence & Site Photos</h2>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-xl">{error}</div>}
            {isAuthenticated && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Select Image</label>
                            <input
                                id={`file-upload-${taskId}`}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                            />
                        </div>
                        <div className="md:col-span-5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Notes</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is shown in this photo?"
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                disabled={isUploading || !selectedFile}
                                className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                            >
                                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {photos.map(photo => (
                        <div key={photo.id} className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Image Wrapper */}
                            <div className="aspect-square bg-gray-100 dark:bg-gray-900 relative">
                                <img
                                    src={`${axiosInstance.defaults.baseURL}/task_photos/download/${photo.id}`}
                                    alt={photo.description || photo.filename}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/400x400?text=Private+Image';
                                    }}
                                />
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleDownload(photo.id, photo.filename)}
                                        className="p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:scale-110 transition transform"
                                        title="Download Original"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </button>
                                    {(isSuperuser || user?.id === photo.uploader_id || canModerate) && (
                                        <button
                                            onClick={() => triggerDelete(photo)}
                                            className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition transform"
                                            title="Delete Photo"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="p-3">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate" title={photo.filename}>
                                    {photo.filename}
                                </p>
                                {photo.description && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {photo.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                                    <UserIcon className="h-3 w-3 text-gray-400" />
                                    <span className="text-[9px] font-bold text-gray-400 uppercase truncate">
                                        {photo.uploader?.full_name || 'System'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <PhotoIcon className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 italic">No photographic evidence attached to this task.</p>
                </div>
            )}

            {/* Standard Deletion Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setPhotoToDelete(null); }}
                onConfirm={confirmDelete}
                title="Permanently Delete Photo"
                message={`Are you sure you want to delete "${photoToDelete?.filename}"? This will remove the file from site records forever.`}
                confirmText="Delete File"
                type="danger"
            />
        </div>
    );
}

export default TaskPhotos;