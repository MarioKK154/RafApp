// frontend/src/pages/ProjectEditPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom'; // Import useParams
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

// Helper function to format date for input type="date"
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Returns 'YYYY-MM-DD'
    } catch (e) {
        return ''; // Handle potential invalid date format from API
    }
};

function ProjectEditPage() {
  const { projectId } = useParams(); // Get project ID from URL parameter
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching data
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch project data when component mounts or projectId changes
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && projectId) {
      setIsLoading(true);
      setError('');
      axiosInstance.get(`/projects/${projectId}`)
        .then(response => {
            const project = response.data;
            // Format dates before setting state
            setFormData({
                name: project.name || '',
                description: project.description || '',
                address: project.address || '',
                status: project.status || '',
                start_date: formatDateForInput(project.start_date),
                end_date: formatDateForInput(project.end_date),
            });
        })
        .catch(err => {
          console.error("Error fetching project data:", err);
          setError('Failed to load project data.');
          if (err.response?.status === 404) {
             setError('Project not found.');
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login'); // Redirect if not logged in
    }
  }, [projectId, isAuthenticated, authIsLoading, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value, // No need to convert to null here, handled before sending
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

     // Prepare data, converting empty strings to null for optional date fields
    const dataToSend = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
    };
    // Remove fields that are empty strings if backend expects null or omitted fields for no change
    // Depending on backend PUT logic, you might want to filter out unchanged fields
    // or fields that are empty if they shouldn't overwrite existing values with empty ones.
    // For simplicity here, we send all potentially updated fields.

    try {
      await axiosInstance.put(`/projects/${projectId}`, dataToSend);
      // On success, navigate back to the projects list
      navigate('/projects');
    } catch (err) {
      console.error("Error updating project:", err);
      setError(err.response?.data?.detail || 'Failed to update project.');
      setIsSubmitting(false);
    }
  };

  // Render Logic
  if (authIsLoading || isLoading) return <p>Loading project details...</p>; // Or a spinner

  // Could check for error state here if fetch failed (e.g. project not found)
  if (error && error.includes('not found')) {
     return <div className="container mx-auto p-6 text-red-500">{error} <Link to="/projects" className="text-blue-500 underline">Go Back</Link></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Project</h1>

      {error && !error.includes('not found') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
         {/* Project Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label>
          <input
            type="text" name="name" id="name" required
            value={formData.name} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            name="description" id="description" rows="3"
            value={formData.description} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
          <input
            type="text" name="address" id="address"
            value={formData.address} onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Status */}
         <div>
           <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
           <select
             name="status" id="status" required
             value={formData.status} onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           >
             <option value="Planning">Planning</option>
             <option value="In Progress">In Progress</option>
             <option value="Completed">Completed</option>
             <option value="On Hold">On Hold</option>
           </select>
         </div>

        {/* Start Date */}
        <div>
           <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
           <input
             type="date" name="start_date" id="start_date"
             value={formData.start_date} onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           />
         </div>

         {/* End Date */}
        <div>
           <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
           <input
             type="date" name="end_date" id="end_date"
             value={formData.end_date} onChange={handleChange}
             className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
           />
         </div>


        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link to="/projects" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectEditPage;