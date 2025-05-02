// frontend/src/components/ProjectDrawings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext'; // Optional: for auth check if needed

// Base URL for constructing download links (assuming backend runs on 8000)
const API_BASE_URL = 'http://localhost:8000';

function ProjectDrawings({ projectId }) {
  const [drawings, setDrawings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { isAuthenticated } = useAuth(); // Ensure user is authenticated

  // Function to fetch drawings for the project
  const fetchDrawings = useCallback(() => {
    if (!projectId || !isAuthenticated) return;
    setIsLoading(true);
    setError('');
    axiosInstance.get(`/drawings/project/${projectId}`)
      .then(response => {
        setDrawings(response.data);
      })
      .catch(err => {
        console.error("Error fetching drawings:", err);
        setError('Failed to load drawings for this project.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId, isAuthenticated]); // Dependencies for useCallback

  // Fetch drawings on initial mount and when projectId changes
  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]); // useEffect depends on the memoized fetchDrawings

  // Handle file selection
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]); // Get the first file
  };

  // Handle description change
  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  // Handle file upload
  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!projectId) {
         setUploadError('Cannot upload without a valid project ID.');
         return;
    }

    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('description', description);

    try {
      // Post as multipart/form-data
      await axiosInstance.post(`/drawings/upload/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Clear form and refresh list on success
      setSelectedFile(null);
      setDescription('');
      event.target.reset(); // Reset file input visually
      fetchDrawings(); // Refresh the list
    } catch (err) {
      console.error("Error uploading drawing:", err);
      setUploadError(err.response?.data?.detail || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drawing deletion
  const handleDelete = async (drawingId) => {
     if (!window.confirm('Are you sure you want to delete this drawing?')) {
      return;
    }
    try {
      setError(''); // Clear previous list errors
      await axiosInstance.delete(`/drawings/${drawingId}`);
      // Refresh list after delete
      fetchDrawings();
    } catch (err) {
       console.error("Error deleting drawing:", err);
       setError('Failed to delete drawing.'); // Show error relevant to the list
    }
  };

  // --- Render Logic ---
  if (isLoading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading drawings...</p>;

  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Drawings</h2>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="mb-6 p-4 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-700 space-y-3">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Upload New Drawing</h3>
        {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
        <div>
           <label htmlFor="drawingFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">File</label>
           <input
             type="file" name="drawingFile" id="drawingFile" required
             onChange={handleFileChange}
             className="mt-1 block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
           />
        </div>
         <div>
           <label htmlFor="drawingDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
           <input
             type="text" name="description" id="drawingDescription"
             value={description} onChange={handleDescriptionChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
           />
         </div>
         <button
           type="submit"
           disabled={isUploading || !selectedFile}
           className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {isUploading ? 'Uploading...' : 'Upload Drawing'}
         </button>
      </form>

      {/* Drawings List */}
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Uploaded Drawings</h3>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {drawings.length === 0 && !error ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No drawings uploaded for this project yet.</p>
      ) : (
        <ul className="space-y-2">
          {drawings.map(drawing => (
            <li key={drawing.id} className="flex justify-between items-center p-2 border rounded dark:border-gray-700 bg-white dark:bg-gray-800">
              <div>
                {/* Direct download link */}
                <a
                    href={`${API_BASE_URL}/drawings/download/${drawing.id}`}
                    target="_blank" // Open in new tab (optional)
                    rel="noopener noreferrer" // Security measure
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    // Note: This requires the browser to handle the token via cookies
                    // or won't work if server strictly requires Authorization header.
                    // A button calling a fetch function might be needed for header auth.
                    // Let's assume direct link works for simplicity first.
                 >
                   {drawing.filename}
                 </a>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {drawing.description || 'No description'} - Uploaded: {new Date(drawing.uploaded_at).toLocaleDateString()}
                    {drawing.size_bytes && ` - ${(drawing.size_bytes / 1024).toFixed(1)} KB`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(drawing.id)}
                className="ml-4 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectDrawings;