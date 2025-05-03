// frontend/src/components/ProjectDrawings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const API_BASE_URL = 'http://localhost:8000';

function ProjectDrawings({ projectId }) {
  const [drawings, setDrawings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // Get user info
  const { user, isAuthenticated } = useAuth();

  // Determine if user can manage drawings (Admin, PM)
  const canManageDrawings = user && ['admin', 'project manager'].includes(user.role);

  // Fetch drawings (remains the same)
  const fetchDrawings = useCallback(() => { /* ... same fetch logic ... */
    if (!projectId || !isAuthenticated) return;
    setIsLoading(true); setError('');
    axiosInstance.get(`/drawings/project/${projectId}`)
      .then(response => { setDrawings(response.data); })
      .catch(err => { console.error("Error fetching drawings:", err); setError('Failed to load drawings...'); })
      .finally(() => { setIsLoading(false); });
  }, [projectId, isAuthenticated]);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  // Handle file change (remains the same)
  const handleFileChange = (event) => { /* ... */ setSelectedFile(event.target.files[0]); };
  const handleDescriptionChange = (event) => { /* ... */ setDescription(event.target.value); };

  // Handle file upload (remains the same)
  const handleUpload = async (event) => { /* ... same upload logic ... */
     event.preventDefault();
     if (!selectedFile || !projectId || !canManageDrawings) return; // Add canManage check
     setUploadError(''); setIsUploading(true);
     const formData = new FormData(); /* ... append file/desc ... */
     formData.append('file', selectedFile); formData.append('description', description);
     try {
       await axiosInstance.post(`/drawings/upload/${projectId}`, formData, { headers: {'Content-Type': 'multipart/form-data'} });
       setSelectedFile(null); setDescription(''); event.target.reset(); fetchDrawings();
     } catch (err) { console.error("Error uploading drawing:", err); setUploadError(err.response?.data?.detail || 'File upload failed.');
     } finally { setIsUploading(false); }
  };

  // Handle drawing deletion (remains the same, backend handles final check)
  const handleDelete = async (drawingId) => { /* ... same delete logic ... */
    if (!window.confirm('Are you sure...?') || !canManageDrawings) return; // Add canManage check
    try {
        setError(''); await axiosInstance.delete(`/drawings/${drawingId}`); fetchDrawings();
    } catch (err) { console.error("Error deleting drawing:", err); setError('Failed to delete drawing.'); }
  };

  // --- Render Logic ---
  if (isLoading) return <p className="...">Loading drawings...</p>;

  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 ...">Project Drawings</h2>

      {/* --- RBAC: Show Upload Form only for Admin/PM --- */}
      {canManageDrawings && (
          <form onSubmit={handleUpload} className="mb-6 p-4 border ...">
            <h3 className="text-lg ...">Upload New Drawing</h3>
            {uploadError && <p className="text-red-500 ...">{uploadError}</p>}
            <div>
               <label htmlFor="drawingFile" className="...">File</label>
               <input type="file" name="drawingFile" id="drawingFile" required onChange={handleFileChange} className="..."/>
            </div>
             <div>
               <label htmlFor="drawingDescription" className="...">Description (Optional)</label>
               <input type="text" name="description" id="drawingDescription" value={description} onChange={handleDescriptionChange} className="..."/>
             </div>
             <button type="submit" disabled={isUploading || !selectedFile} className="...">
               {isUploading ? 'Uploading...' : 'Upload Drawing'}
             </button>
          </form>
      )}

      {/* Drawings List */}
      <h3 className="text-lg font-medium mb-2 ...">Uploaded Drawings</h3>
      {error && <p className="text-red-500 ...">{error}</p>}
      {drawings.length === 0 && !error ? ( /* ... no drawings ... */
         <p className="text-sm ...">No drawings uploaded for this project yet.</p>
      ) : (
        <ul className="space-y-2">
          {drawings.map(drawing => (
            <li key={drawing.id} className="flex justify-between items-center ...">
              <div>
                {/* Download Link (visible to all logged-in users for now) */}
                <a href={`${API_BASE_URL}/drawings/download/${drawing.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 ...">
                   {drawing.filename}
                 </a>
                 {/* Other details */}
                 <p className="text-xs ..."> {drawing.description || 'No description'} ... </p>
              </div>
              {/* --- RBAC: Show Delete Button only for Admin/PM --- */}
              {canManageDrawings && (
                  <button onClick={() => handleDelete(drawing.id)} className="ml-4 px-2 py-1 bg-red-600 ...">
                    Delete
                  </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectDrawings;