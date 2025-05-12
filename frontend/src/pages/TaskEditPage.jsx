// frontend/src/pages/TaskEditPage.jsx
// Uncondensed and Refactored with Single Return & Toasts
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import TaskComments from '../components/TaskComments';
import TaskPhotos from '../components/TaskPhotos';
import { toast } from 'react-toastify';

const formatDateForInput = (dateString) => { if (!dateString) return ''; try { const d=new Date(dateString); return isNaN(d.getTime())?'':d.toISOString().split('T')[0]; } catch(e){ console.error("Error formatting date:", dateString, e); return ''; } };
const ASSIGNABLE_ROLES = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

function TaskEditPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'To Do', priority: 'Medium', start_date: '', due_date: '', project_id: '', assignee_id: '' });
  const [initialLoading, setInitialLoading] = useState(true); // For all initial data fetches
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadingError, setDataLoadingError] = useState('');

  const canManageTasks = user && ['admin', 'project manager', 'team leader'].includes(user.role);

  // Fetch initial data (task, projects, users)
  const fetchPageData = useCallback(() => {
    if (!authIsLoading && isAuthenticated && taskId) {
        setInitialLoading(true); setDataLoadingError(''); setError('');
        Promise.all([
            axiosInstance.get(`/tasks/${taskId}`),
            axiosInstance.get('/projects/'),
            axiosInstance.get('/users/')
        ]).then(([taskResponse, projectsResponse, usersResponse]) => {
            const task = taskResponse.data;
            setProjects(projectsResponse.data);
            setUsers(usersResponse.data.filter(u => ASSIGNABLE_ROLES.includes(u.role)));
            setFormData({
                title: task.title ?? '', description: task.description ?? '',
                status: task.status ?? 'To Do', priority: task.priority ?? 'Medium',
                start_date: formatDateForInput(task.start_date),
                due_date: formatDateForInput(task.due_date),
                project_id: task.project_id?.toString() ?? '',
                assignee_id: task.assignee_id?.toString() ?? '',
            });
        }).catch(err => {
            console.error("Error fetching data for task edit:", err);
            if (err?.response?.status === 404) { setError('Task not found.'); }
            else { setError('Failed to load required data.'); }
            toast.error(err.response?.data?.detail || "Failed to load data.");
        }).finally(() => { setInitialLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) {
        navigate('/login', { replace: true });
    } else if (!authIsLoading && !taskId) {
        setError("Task ID missing."); setInitialLoading(false);
    }
  }, [taskId, isAuthenticated, authIsLoading, navigate]); // Correct dependencies

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);


  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: (name === 'project_id' || name === 'assignee_id') && value !== '' ? parseInt(value, 10) : value, })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { toast.error('Please select a project.'); return; }
    if (!canManageTasks) { toast.error("No permission."); return; }
    setError(''); setIsSubmitting(true);
    const dataToSend = {
        title: formData.title, description: formData.description, status: formData.status,
        priority: formData.priority, start_date: formData.start_date || null,
        due_date: formData.due_date || null, project_id: Number(formData.project_id),
        assignee_id: formData.assignee_id === '' || formData.assignee_id === null ? null : Number(formData.assignee_id),
    };
    try {
      const response = await axiosInstance.put(`/tasks/${taskId}`, dataToSend);
      toast.success(`Task "${response.data.title}" updated successfully!`);
      navigate('/tasks');
    } catch (err) {
      console.error("Error updating task:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update task.';
      setError(errorMsg); toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (authIsLoading || initialLoading) {
    return ( <div className="container mx-auto p-6 text-center"><p className="text-xl ...">Loading task details...</p></div> );
  }
  if (!isAuthenticated) { // Should be redirected
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>Redirecting to login...</p></div>);
  }
  // If general error or permission error (and not specific 'not found' which is handled below)
  if (error && !error.toLowerCase().includes('not found')) {
    return ( <div className="container mx-auto p-6 text-center text-red-500">{error} <Link to="/tasks" className="text-blue-500 underline ml-2">Back to Tasks</Link></div> );
  }
  if (!canManageTasks && !error) { // If no general error, but no permission
    return ( <div className="container mx-auto p-6 text-center text-red-500">Access Denied. You do not have permission to edit this task.<Link to="/tasks" className="text-blue-500 underline ml-2">Back to Tasks</Link></div> );
  }
   // Handle "Task not found" error specifically for the main form
  if (error && error.toLowerCase().includes('not found')) {
    return (<div className="container mx-auto p-6 text-center text-red-500">{error}<Link to="/tasks" className="text-blue-500 underline ml-2">Back to Tasks</Link></div>);
  }


  const assignableUsers = users; // Already filtered in fetch

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit Task: {formData.title || `ID ${taskId}`}</h1>
      {/* Form Submission Errors (if not 'not found') */}
      {error && !error.toLowerCase().includes('not found') && <p className="text-red-500 mb-4 ...">{error}</p>}
      {dataLoadingError && <p className="text-red-500 mb-4 ...">{dataLoadingError}</p>}

      <fieldset disabled={!canManageTasks || isSubmitting} className="disabled:opacity-70 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
            {/* Form fields as before... */}
             <div><label htmlFor="project_id" className="block text-sm ...">Project *</label><select name="project_id" id="project_id" required value={formData.project_id} onChange={handleChange} disabled={projects.length === 0 || dataLoadingError} className="mt-1 ...">{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{projects.length === 0 && !dataLoadingError && <p>...</p>}</div>
             <div><label htmlFor="title" className="block text-sm ...">Task Title *</label><input type="text" name="title" id="title" required value={formData.title} onChange={handleChange} className="mt-1 ..."/></div>
             <div><label htmlFor="description" className="block text-sm ...">Description</label><textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 ..."></textarea></div>
             <div><label htmlFor="status" className="block text-sm ...">Status</label><select name="status" id="status" required value={formData.status} onChange={handleChange} className="mt-1 ..."><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option></select></div>
             <div><label htmlFor="priority" className="block text-sm ...">Priority</label><select name="priority" id="priority" required value={formData.priority} onChange={handleChange} className="mt-1 ..."><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
             <div><label htmlFor="start_date" className="block text-sm ...">Start Date</label><input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-1 ..."/></div>
             <div><label htmlFor="due_date" className="block text-sm ...">Due Date</label><input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} className="mt-1 ..."/></div>
             <div> <label htmlFor="assignee_id" className="block text-sm ...">Assign To</label> <select name="assignee_id" id="assignee_id" value={formData.assignee_id} onChange={handleChange} disabled={users.length === 0 || dataLoadingError} className="mt-1 ..."> <option value="">-- Unassigned --</option> {assignableUsers.map(u => ( <option key={u.id} value={u.id}> {u.full_name || u.email} ({u.role}) </option> ))} </select> {users.length === 0 && !dataLoadingError && <p>...</p>} </div>
            <div className="flex justify-end space-x-3 pt-4"> <Link to="/tasks" className="px-4 py-2 border ...">Cancel</Link> {canManageTasks && ( <button type="submit" disabled={isSubmitting || dataLoadingError} className={`px-4 py-2 border ... ${isSubmitting || dataLoadingError ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmitting ? 'Saving...' : 'Save Changes'} </button> )} </div>
          </form>
      </fieldset>

      <TaskComments taskId={taskId} />
      <TaskPhotos taskId={taskId} />
    </div>
  );
}
export default TaskEditPage;