// frontend/src/components/TaskPhotos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// Base URL for constructing download/display links
const API_BASE_URL = 'http://localhost:8000';

// Define roles allowed to delete photos (besides the original uploader)
const PHOTO_MODERATOR_ROLES = ["admin", "project manager", "team leader"];

function TaskPhotos({ taskId }) {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user, isAuthenticated } = useAuth(); // Get current user for auth/permission checks

  // Function to fetch photos for the task
  const fetchPhotos = useCallback(() => {
    if (!taskId || !isAuthenticated) return;
    setIsLoading(true);
    setError('');
    axiosInstance.get(`/task_photos/task/${taskId}`)
      .then(response => {
        setPhotos(response.data);
      })
      .catch(err => {
        console.error("Error fetching task photos:", err);
        setError('Failed to load photos for this task.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [taskId, isAuthenticated]);

  // Fetch photos on mount/taskId change
  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Handle file input change
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        setSelectedFile(file);
        setUploadError(''); // Clear previous error if valid image selected
    } else {
        setSelectedFile(null);
        setUploadError('Please select a valid image file (e.g., JPG, PNG, GIF).');
    }
  };

  // Handle description change
  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  // Handle file upload
  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile || !taskId || !isAuthenticated) {
      setUploadError('File or Task ID missing, or not authenticated.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Only append description if it's not empty
    if (description) {
        formData.append('description', description);
    }

    try {
      await axiosInstance.post(`/task_photos/upload/${taskId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFile(null);
      setDescription('');
      event.target.reset(); // Reset file input
      fetchPhotos(); // Refresh list
    } catch (err) {
      console.error("Error uploading photo:", err);
      setUploadError(err.response?.data?.detail || 'Photo upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle photo deletion
  const handleDelete = async (photoId) => {
     // Find the photo to check uploader ID before confirming
     const photoToDelete = photos.find(p => p.id === photoId);
     const canDelete = user && photoToDelete &&
                       (user.id === photoToDelete.uploader_id || PHOTO_MODERATOR_ROLES.includes(user.role));

     if (!canDelete) {
         alert("You don't have permission to delete this photo.");
         return;
     }

     if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
     }
     setError(''); // Clear list errors
     try {
        await axiosInstance.delete(`/task_photos/${photoId}`);
        fetchPhotos(); // Refresh the list
     } catch (err) {
        console.error("Error deleting photo:", err);
        setError(err.response?.data?.detail || 'Failed to delete photo.');
     }
  };


  // --- Render Logic ---
  if (isLoading) return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading photos...</p>;
  if (!isAuthenticated) return <p className="text-sm text-red-500 dark:text-red-400 mt-4">Please log in to manage photos.</p>;


  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Task Photos</h2>

      {/* Upload Form - Allow any authenticated user to upload */}
      <form onSubmit={handleUpload} className="mb-6 p-4 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-700 space-y-3">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Upload New Photo</h3>
        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
        <div>
           <label htmlFor="taskPhotoFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image File</label>
           <input
             type="file" name="taskPhotoFile" id="taskPhotoFile" required
             accept="image/*" // Suggest image files to the browser
             onChange={handleFileChange}
             className="mt-1 block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
           />
        </div>
         <div>
           <label htmlFor="photoDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
           <input
             type="text" name="description" id="photoDescription"
             value={description} onChange={handleDescriptionChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
             placeholder="Brief description of the photo..."
           />
         </div>
         <button
           type="submit"
           disabled={isUploading || !selectedFile}
           className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {isUploading ? 'Uploading...' : 'Upload Photo'}
         </button>
      </form>

      {/* Photos List */}
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Uploaded Photos</h3>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {photos.length === 0 && !error ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No photos uploaded for this task yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map(photo => {
            const canDelete = user && (user.id === photo.uploader?.id || PHOTO_MODERATOR_ROLES.includes(user.role));
            const downloadUrl = `${API_BASE_URL}/task_photos/download/${photo.id}`;
            return (
                <div key={photo.id} className="relative border rounded dark:border-gray-700 p-2 bg-white dark:bg-gray-800 shadow">
                    {/* Link to download the image */}
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer" title={`Download ${photo.filename}`}>
                        {/* Basic image preview - uses the same download URL */}
                        <img
                            src={downloadUrl}
                            alt={photo.description || photo.filename}
                            className="w-full h-32 object-cover rounded mb-2" // Fixed height image preview
                            loading="lazy" // Lazy load images
                            onError={(e) => { e.target.style.display = 'none'; /* Hide if image fails */ }}
                         />
                    </a>
                     <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={photo.filename}>{photo.filename}</p>
                    {photo.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={photo.description}>{photo.description}</p>}
                    <p className="text-xs text-gray-400">By: {photo.uploader?.full_name || photo.uploader?.email || 'N/A'}</p>
                    {/* Delete button - position absolute top-right */}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(photo.id)}
                            className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs leading-none"
                            aria-label="Delete photo"
                        >
                            &times;
                        </button>
                    )}
                </div>
            );
           })}
        </div>
      )}
    </div>
  );
}

export default TaskPhotos;