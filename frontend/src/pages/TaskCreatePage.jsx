// frontend/src/pages/TaskCreatePage.jsx
// Uncondensed Version: Added Toast Notifications
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify'; // Import toast

const formatDateForInput = (dateString) => { /* ... */ }; // Keep helper
const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function TaskCreatePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'To Do', priority: 'Medium', start_date: '', due_date: '', project_id: '', assignee_id: '', });
  const [error, setError] = useState(''); // Keep for form validation errors if needed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState('');

  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch filter data (as before)
  useEffect(() => { /* ... same useEffect for fetching projects/users ... */ }, [/* dependencies */]);

  const handleChange = (e) => { /* ... as before ... */ };

  // Handle form submission with toasts
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { setError('Please select a project.'); return; }
    if (!canManageTasks) { toast.error('You do not have permission to create tasks.'); return; } // Use toast

    setError(''); // Clear local form errors
    setIsSubmitting(true);
    const dataToSend = { /* ... create dataToSend ... */ };
    dataToSend.start_date = formData.start_date || null;
    dataToSend.due_date = formData.due_date || null;
    dataToSend.assignee_id = formData.assignee_id === '' ? null : formData.assignee_id;


    try {
      const response = await axiosInstance.post('/tasks/', dataToSend);
      toast.success(`Task "${response.data.title}" created successfully!`); // Success toast
      navigate('/tasks'); // Navigate after success
    } catch (err) {
      console.error("Error creating task:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to create task.';
      // setError(errorMsg); // Optionally still set local error for form fields
      toast.error(errorMsg); // Show error toast
      setIsSubmitting(false); // Re-enable form only on error
    }
  };

  // Render Logic (as before, but maybe remove local error display if toast is sufficient)
  if (authIsLoading || dataLoadingError) { /* ... loading/error for data ... */ }
  if (!canManageTasks) { /* ... access denied ... */ }

  const assignableUsers = users.filter(u => ASSIGNABLE_ROLES.includes(u.role));

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Task</h1>
      {/* Remove or keep local error display depending on preference */}
      {/* {error && <p className="text-red-500 ...">{error}</p>} */}
      {dataLoadingError && <p className="text-red-500 ...">{dataLoadingError}</p>}

      <form onSubmit={handleSubmit} className="...">
        {/* Form fields as before... */}
         {/* Project Select */}
         {/* Title Input */}
         {/* Description Textarea */}
         {/* Status Select */}
         {/* Priority Select */}
         {/* Start Date Input */}
         {/* Due Date Input */}
         {/* Assignee Select */}
         {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
            <Link to="/tasks" className="..."> Cancel </Link>
            <button type="submit" disabled={isSubmitting || !!dataLoadingError || !formData.project_id} className="...">
                {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
         </div>
      </form>
    </div>
  );
}
export default TaskCreatePage;