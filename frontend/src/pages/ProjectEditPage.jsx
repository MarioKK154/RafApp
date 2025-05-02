// frontend/src/pages/ProjectEditPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ProjectDrawings from '../components/ProjectDrawings'; // Import the new component

// Helper function to format date
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try { return new Date(dateString).toISOString().split('T')[0]; } catch (e) { return ''; }
};

function ProjectEditPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({ /* ... initial state ... */ });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project data (useEffect remains the same as before)
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && projectId) {
      setIsLoading(true); setError('');
      axiosInstance.get(`/projects/${projectId}`)
        .then(response => {
            const project = response.data;
            setFormData({
                name: project.name || '', description: project.description || '',
                address: project.address || '', status: project.status || '',
                start_date: formatDateForInput(project.start_date),
                end_date: formatDateForInput(project.end_date),
            });
        })
        .catch(err => {
          console.error("Error fetching project data:", err);
          setError(err.response?.status === 404 ? 'Project not found.' : 'Failed to load project data.');
        }).finally(() => { setIsLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) { navigate('/login'); }
  }, [projectId, isAuthenticated, authIsLoading, navigate]);

  // Handle input changes (remains the same)
  const handleChange = (e) => { /* ... */
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // Handle form submission (remains the same)
  const handleSubmit = async (e) => { /* ... */
    e.preventDefault(); setError(''); setIsSubmitting(true);
    const dataToSend = { ...formData, start_date: formData.start_date || null, end_date: formData.end_date || null, };
    try {
      await axiosInstance.put(`/projects/${projectId}`, dataToSend);
      navigate('/projects');
    } catch (err) {
      console.error("Error updating project:", err);
      setError(err.response?.data?.detail || 'Failed to update project.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading || isLoading) return <p>Loading project details...</p>;

  if (error && error.includes('not found')) {
     return <div className="container mx-auto p-6 text-red-500">{error} <Link to="/projects" className="text-blue-500 underline">Go Back</Link></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Project</h1>

      {error && !error.includes('not found') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      {/* --- Edit Project Form --- */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Form fields (name, description, etc.) remain the same as before */}
        <div>
          <label htmlFor="name">Project Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full ..." />
        </div>
        <div>
           <label htmlFor="description">Description</label>
           <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full ..."></textarea>
        </div>
        <div>
           <label htmlFor="address">Address</label>
           <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full ..." />
        </div>
         <div>
           <label htmlFor="status">Status</label>
           <select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full ...">
              {/* Options */}
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
           </select>
         </div>
        <div>
           <label htmlFor="start_date">Start Date</label>
           <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 block w-full ..." />
         </div>
        <div>
           <label htmlFor="end_date">End Date</label>
           <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-1 block w-full ..." />
         </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link to="/projects" className="...">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="...">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      {/* --- End Edit Project Form --- */}


      {/* --- Drawings Section --- */}
      {/* Render the ProjectDrawings component, passing the projectId */}
      <ProjectDrawings projectId={projectId} />
      {/* --- End Drawings Section --- */}

    </div>
  );
}

export default ProjectEditPage;