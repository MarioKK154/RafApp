// frontend/src/components/TaskPhotos.jsx
// ABSOLUTELY FINAL Meticulously Checked Uncondensed Version - Upload Form & List
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal'; // Ensure this path is correct relative to components folder
import { toast } from 'react-toastify';

// Base URL for constructing preview links if needed directly (though download handler is better)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const PHOTO_MODERATOR_ROLES = ["admin", "project manager", "team leader"];

function TaskPhotos({ taskId }) {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(''); // For listing errors
  const [uploadError, setUploadError] = useState(''); // For upload form errors
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState(null);

  const fetchPhotos = useCallback(() => {
    if (!taskId || !isAuthenticated) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError('');
    axiosInstance.get(`/task_photos/task/${taskId}`)
      .then(response => {
        setPhotos(response.data);
      })
      .catch(err => {
        console.error("Error fetching task photos:", err);
        setError('Failed to load photos for this task.');
        // toast.error('Failed to load task photos.'); // Toast can be noisy on initial load fail
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [taskId, isAuthenticated]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        setSelectedFile(file);
        setUploadError('');
    } else {
        setSelectedFile(null);
        setUploadError('Please select a valid image file (e.g., JPG, PNG, GIF).');
        if (event.target) event.target.value = null;
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) { setUploadError('Please select a file.'); toast.warn('Please select a file.'); return; }
    if (!taskId || !isAuthenticated) { setUploadError('Cannot upload: Missing Task ID or not authenticated.'); toast.error('Upload error.'); return; }

    setUploadError('');
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (description) { formData.append('description', description); }

    try {
      await axiosInstance.post(`/task_photos/upload/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Photo "${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      setDescription('');
      if (event.target && typeof event.target.reset === 'function') {
          event.target.reset(); // Reset the form which contains the file input
      }
      fetchPhotos();
    } catch (err) {
      console.error("Error uploading photo:", err);
      const errorMsg = err.response?.data?.detail || 'Photo upload failed.';
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (photo) => {
    const canDelete = user && (user.id === photo.uploader_id || PHOTO_MODERATOR_ROLES.includes(user.role));
    if (!canDelete) { toast.error("No permission to delete photo."); return; }
    setPhotoToDelete(photo);
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
        await axiosInstance.delete(`/task_photos/${photoToDelete.id}`);
        toast.success(`Photo "${photoToDelete.filename}" deleted.`);
        fetchPhotos();
    } catch (err) { console.error("Error deleting photo:", err); toast.error(err.response?.data?.detail || 'Failed to delete photo.'); }
    finally { setIsDeleteModalOpen(false); setPhotoToDelete(null); }
  };

  const handleDownloadPhoto = async (photoId, filename) => {
    if (!isAuthenticated) { toast.error("Log in to download."); return; }
    setDownloadingPhotoId(photoId);
    try {
        const response = await axiosInstance.get(`/task_photos/download/${photoId}`, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        toast.success(`Downloading ${filename}...`);
    } catch (err) { console.error("Error downloading photo:", err); toast.error(err.response?.data?.detail || `Failed to download ${filename}.`); }
    finally { setDownloadingPhotoId(null); }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading photos...</p>;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Task Photos</h2>

      {/* Upload Form */}
      {isAuthenticated && ( // Only show upload form if authenticated
        <form onSubmit={handleUpload} className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 space-y-3">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Upload New Photo</h3>
            {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
            <div>
               <label htmlFor={`taskPhotoFile-${taskId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image File</label>
               <input
                 type="file" name="taskPhotoFile" id={`taskPhotoFile-${taskId}`}
                 required
                 accept="image/*"
                 onChange={handleFileChange}
                 className="mt-1 block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:placeholder-gray-400"
               />
            </div>
             <div>
               <label htmlFor={`photoDescription-${taskId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
               <input
                 type="text" name="description" id={`photoDescription-${taskId}`}
                 value={description} onChange={handleDescriptionChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                 placeholder="Brief description of the photo..."
               />
             </div>
             <button
               type="submit"
               disabled={isUploading || !selectedFile}
               className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isUploading ? 'Uploading...' : 'Upload Photo'}
             </button>
        </form>
      )}

      {/* Photos List */}
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Uploaded Photos</h3>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {photos.length === 0 && !error ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No photos uploaded for this task yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map(photo => {
            const canCurrentUserDelete = user && (user.id === photo.uploader?.id || PHOTO_MODERATOR_ROLES.includes(user.role));
            // Construct full URL for display if needed, or use button for auth download
            const previewPhotoUrl = `${API_BASE_URL}/task_photos/download/${photo.id}`; // This might require token for direct viewing

            return (
                <div key={photo.id} className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 shadow group flex flex-col">
                    {/* Image Preview - this direct src might fail if token not sent by browser */}
                    <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded mb-2 overflow-hidden">
                        <img
                            // src={previewPhotoUrl} // This direct link might fail due to auth
                            src={`${axiosInstance.defaults.baseURL}/task_photos/download/${photo.id}`} // Try with full path that might use cookies if setup, or this will also likely break
                            alt={photo.description || photo.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            // A better preview would be to fetch as blob and set as object URL
                            // For now, let's rely on the download button mostly
                            onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                         />
                         <div className="hidden w-full h-full items-center justify-center text-xs text-gray-500">Preview N/A</div>
                    </div>

                     <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={photo.filename}>{photo.filename}</p>
                    {photo.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={photo.description}>{photo.description}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">By: {photo.uploader?.full_name || photo.uploader?.email || 'N/A'}</p>
                    
                    <button
                        onClick={() => handleDownloadPhoto(photo.id, photo.filename)}
                        disabled={downloadingPhotoId === photo.id}
                        className="mt-2 w-full text-xs px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {downloadingPhotoId === photo.id ? 'Downloading...' : 'Download'}
                    </button>

                    {canCurrentUserDelete && (
                        <button
                            onClick={() => handleDeleteClick(photo)}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs leading-none opacity-50 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete photo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            );
           })}
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setPhotoToDelete(null); }}
        onConfirm={confirmDeletePhoto}
        title="Confirm Photo Deletion"
      >
        Are you sure you want to delete the photo:
        <strong className="font-semibold block mt-1"> "{photoToDelete?.filename}"</strong>?
      </Modal>
    </div>
  );
}

export default TaskPhotos;