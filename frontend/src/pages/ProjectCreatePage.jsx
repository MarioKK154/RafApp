// frontend/src/pages/ProjectCreatePage.jsx
// FINAL REFACTORED v2 - Explicit blocks for conditional returns
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '', description: '', address: '',
    status: 'Planning', start_date: '', end_date: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageProjects = user && ['admin', 'project manager'].includes(user.role);

  // Redirect check
  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !canManageProjects) {
      // Set error state instead of returning directly from effect
      setError('You do not have permission to create projects.');
    }
  }, [isAuthenticated, authIsLoading, canManageProjects, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value === '' ? null : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageProjects) { setError('No permission.'); return; } // Double check permission
    setError(''); setIsSubmitting(true);
    const dataToSend = { ...formData, start_date: formData.start_date || null, end_date: formData.end_date || null };
    try {
      await axiosInstance.post('/projects/', dataToSend);
      navigate('/projects');
    } catch (err) { console.error("Error creating project:", err); setError(err.response?.data?.detail || 'Failed to create project.'); setIsSubmitting(false); }
  };

  // --- Render Logic ---

  if (authIsLoading) {
     // Use explicit block structure for return
     return (
        <div className="container mx-auto p-6 text-center">
             <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
     );
  }

  // Check permissions AFTER loading is done
  if (!canManageProjects) {
      // Use explicit block structure for return
      return (
          <div className="container mx-auto p-6 text-center text-red-500">
               {error || 'Access Denied.'}
               <Link to="/" className="text-blue-500 underline ml-2">Go Home</Link>
          </div>
      );
  }

  // Main return
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Project</h1>
      {/* Display submission errors */}
      {error && !error.includes('Access Denied') && <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
        {/* Project Name */}
        <div> <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label> <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/> </div>
        {/* Description */}
        <div> <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label> <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"></textarea> </div>
        {/* Address */}
        <div> <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label> <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/> </div>
        {/* Status */}
         <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label> <select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"> <option value="Planning">Planning</option> <option value="In Progress">In Progress</option> <option value="Completed">Completed</option> <option value="On Hold">On Hold</option> </select> </div>
        {/* Start Date */}
        <div> <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label> <input type="date" name="start_date" id="start_date" value={formData.start_date || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/> </div>
         {/* End Date */}
        <div> <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label> <input type="date" name="end_date" id="end_date" value={formData.end_date || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"/> </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/projects" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"> Cancel </Link> <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Creating...' : 'Create Project'} </button> </div>
      </form>
    </div>
  );
}

export default ProjectCreatePage;