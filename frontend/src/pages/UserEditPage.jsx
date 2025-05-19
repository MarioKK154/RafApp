// frontend/src/pages/UserEditPage.jsx
// Uncondensed Version: Re-verified data loading & display, Admin Reset Password
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician'];

function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '', full_name: '', employee_id: '', kennitala: '',
    phone_number: '', location: '', role: '',
    is_active: true, is_superuser: false,
  });
  const [initialUserData, setInitialUserData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For fetching user to edit
  const [error, setError] = useState(''); // For general page errors or user details form errors

  // State for Admin Reset Password Form
  const [newPasswordByAdmin, setNewPasswordByAdmin] = useState('');
  const [confirmNewPasswordByAdmin, setConfirmNewPasswordByAdmin] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

  // State for Project Assignments
  const [allProjects, setAllProjects] = useState([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState(new Set());
  const [projectDataLoading, setProjectDataLoading] = useState(true);
  const [projectAssignmentError, setProjectAssignmentError] = useState('');

  const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false); // For main form submission

  const isAdmin = currentUser && currentUser.role === 'admin';

  const fetchPageData = useCallback(async () => {
    if (!authIsLoading && isAuthenticated && isAdmin && userId) {
      setIsLoadingData(true);
      setProjectDataLoading(true);
      setError('');
      setProjectAssignmentError('');

      try {
        // Fetch user being edited
        const userResponse = await axiosInstance.get(`/users/${userId}`);
        const fetchedUser = userResponse.data;
        setInitialUserData(fetchedUser);
        setFormData({
          email: fetchedUser.email ?? '', full_name: fetchedUser.full_name ?? '',
          employee_id: fetchedUser.employee_id ?? '', kennitala: fetchedUser.kennitala ?? '',
          phone_number: fetchedUser.phone_number ?? '', location: fetchedUser.location ?? '',
          role: fetchedUser.role ?? ROLES_LIST[ROLES_LIST.length - 1],
          is_active: fetchedUser.is_active ?? true,
          is_superuser: fetchedUser.is_superuser ?? false,
        });
        setIsLoadingData(false);

        // Fetch all projects for assignment
        const projectsResponse = await axiosInstance.get('/projects/');
        setAllProjects(projectsResponse.data);

        // Determine current project assignments for this user
        const currentAssignments = new Set();
        if (projectsResponse.data.length > 0) {
          for (const project of projectsResponse.data) {
            try {
              // We need to see if the user (userId) is in project.members
              // The /projects/{id}/members endpoint is the source of truth for this.
              const membersResponse = await axiosInstance.get(`/projects/${project.id}/members`);
              if (membersResponse.data.some(member => member.id === parseInt(userId, 10))) {
                currentAssignments.add(project.id);
              }
            } catch (memberErr) {
              console.warn(`Could not fetch members for project ${project.id} for user edit page`, memberErr);
            }
          }
        }
        setAssignedProjectIds(currentAssignments);
        setProjectDataLoading(false);

      } catch (err) {
        console.error("Error fetching page data for User Edit:", err);
        const errorMsg = err.response?.status === 404 ? 'User or essential project data not found.' : 'Failed to load data for user editing.';
        setError(errorMsg); // Set main page error
        toast.error(errorMsg);
        setIsLoadingData(false);
        setProjectDataLoading(false);
      }
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!authIsLoading && !isAdmin) {
      setError('Access Denied. You do not have permission to edit users.');
      setIsLoadingData(false);
      setProjectDataLoading(false);
    } else if (!userId && !authIsLoading) {
      setError("User ID is missing from URL.");
      setIsLoadingData(false);
      setProjectDataLoading(false);
    }
  }, [userId, isAuthenticated, authIsLoading, isAdmin, navigate]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmitUserDetails = async (e) => {
    e.preventDefault();
    if (!isAdmin) { toast.error("No permission."); return; }
    setError('');
    setIsSubmittingUserDetails(true);

    const updatePayload = {};
    if (!initialUserData) { // Should not happen if data loaded
        toast.error("Original user data not loaded. Cannot save changes.");
        setIsSubmittingUserDetails(false);
        return;
    }

    if (formData.email !== initialUserData.email) updatePayload.email = formData.email;
    if (formData.full_name !== (initialUserData.full_name ?? '')) updatePayload.full_name = formData.full_name || null;
    if (formData.employee_id !== (initialUserData.employee_id ?? '')) updatePayload.employee_id = formData.employee_id || null;
    if (formData.kennitala !== (initialUserData.kennitala ?? '')) updatePayload.kennitala = formData.kennitala || null;
    if (formData.phone_number !== (initialUserData.phone_number ?? '')) updatePayload.phone_number = formData.phone_number || null;
    if (formData.location !== (initialUserData.location ?? '')) updatePayload.location = formData.location || null;
    if (formData.role !== initialUserData.role) updatePayload.role = formData.role;
    if (formData.is_active !== initialUserData.is_active) updatePayload.is_active = formData.is_active;
    
    // Prevent admin from unchecking superuser for themselves if they are the one being edited
    if (currentUser && currentUser.id === parseInt(userId, 10) && initialUserData.is_superuser && !formData.is_superuser) {
        toast.warn("Admin cannot remove their own superuser status. This change will be ignored.");
    } else if (formData.is_superuser !== initialUserData.is_superuser) {
        updatePayload.is_superuser = formData.is_superuser;
    }


    if (Object.keys(updatePayload).length === 0) {
        toast.info("No changes detected in user details.");
        setIsSubmittingUserDetails(false);
        return;
    }

    try {
      const response = await axiosInstance.put(`/users/${userId}`, updatePayload);
      toast.success(`User "${response.data.email}" details updated successfully!`);
      setInitialUserData(response.data); // Update initial data to reflect saved changes
      // Consider if navigation is desired or stay on page
      // navigate('/users');
    } catch (err) {
      console.error("Error updating user details:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update user details.';
      setError(errorMsg); // For form error display
      toast.error(errorMsg);
    } finally {
      setIsSubmittingUserDetails(false);
    }
  };

  const handleAdminResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) { toast.error("No permission."); return; }
    if (currentUser && currentUser.id === parseInt(userId, 10)) { toast.error("Use Account Settings for own password."); setNewPasswordByAdmin(''); setConfirmNewPasswordByAdmin(''); return; }
    setResetPasswordError('');
    if (newPasswordByAdmin.length < 8) { setResetPasswordError('New password min 8 chars.'); toast.error('New password min 8 chars.'); return; }
    if (newPasswordByAdmin !== confirmNewPasswordByAdmin) { setResetPasswordError('Passwords do not match.'); toast.error('Passwords do not match.'); return; }

    setIsSubmittingNewPassword(true);
    try {
      await axiosInstance.post(`/users/${userId}/set-password`, { new_password: newPasswordByAdmin });
      toast.success(`Password for user ${initialUserData?.email || userId} reset successfully.`);
      setNewPasswordByAdmin(''); setConfirmNewPasswordByAdmin('');
    } catch (err) { console.error("Error resetting password:", err); const errorMsg = err.response?.data?.detail || 'Failed to reset password.'; setResetPasswordError(errorMsg); toast.error(errorMsg);
    } finally { setIsSubmittingNewPassword(false); }
  };

  const handleProjectAssignmentChange = async (projectId, isAssigned) => {
    if (!isAdmin || !initialUserData) return;
    const userIdBeingEdited = initialUserData.id;
    const projectName = allProjects.find(p => p.id === projectId)?.name || `Project ID ${projectId}`;
    setProjectAssignmentError('');
    const originalAssignments = new Set(assignedProjectIds);

    setAssignedProjectIds(prevIds => { const newIds = new Set(prevIds); if (isAssigned) { newIds.add(projectId); } else { newIds.delete(projectId); } return newIds; });

    try {
      if (isAssigned) {
        await axiosInstance.post(`/projects/${projectId}/members`, { user_id: userIdBeingEdited });
        toast.success(`User assigned to "${projectName}".`);
      } else {
        await axiosInstance.delete(`/projects/${projectId}/members/${userIdBeingEdited}`);
        toast.success(`User unassigned from "${projectName}".`);
      }
    } catch (err) { console.error("Error updating assignment:", err); const errorMsg = err.response?.data?.detail || `Failed for "${projectName}".`; setProjectAssignmentError(errorMsg); toast.error(errorMsg); setAssignedProjectIds(originalAssignments); }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingData) { // Main user data loading
    return ( <div className="container mx-auto p-6 text-center"><LoadingSpinner text="Loading user data..." size="lg" /></div> );
  }
  if (!isAuthenticated) { // Should be redirected
    return ( <div className="container mx-auto p-6 text-center text-red-500"><p>Please log in.</p><Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</Link></div> );
  }
  if (!isAdmin || error && (!initialUserData || (initialUserData && !initialUserData.email))) { // Permission or critical fetch error
     return ( <div className="container mx-auto p-6 text-center text-red-500"><p>{error || "Access Denied."}</p><Link to={isAdmin ? "/users" : "/"} className="text-blue-500 underline ml-2 ...">Go Back</Link></div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white"> Edit User: {initialUserData?.full_name || initialUserData?.email || `ID ${userId}`} </h1>
      {error && !error.toLowerCase().includes('not found') && !error.toLowerCase().includes('access denied') && ( <p className="text-red-500 mb-4 ...">{error}</p> )}

      {/* User Details Form */}
      <form onSubmit={handleSubmitUserDetails} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md mb-8">
        <legend className="text-lg font-medium text-gray-900 dark:text-white mb-2">User Details</legend>
        {/* Email */} <div> <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label> <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Full Name */} <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label> <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Employee ID */} <div> <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label> <input type="text" name="employee_id" id="employee_id" value={formData.employee_id} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Kennitala */} <div> <label htmlFor="kennitala" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kennitala</label> <input type="text" name="kennitala" id="kennitala" value={formData.kennitala} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Phone Number */} <div> <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label> <input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Location */} <div> <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label> <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Role */} <div> <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role <span className="text-red-500">*</span></label> <select name="role" id="role" required value={formData.role} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70">{ROLES_LIST.map(r => (<option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>))}</select> </div>
        {/* Is Active */} <div className="flex items-center"> <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmittingUserDetails || (currentUser && currentUser.id === parseInt(userId, 10) && initialUserData?.is_active)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/> <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label> {currentUser && currentUser.id === parseInt(userId, 10) && <span className="ml-2 text-xs text-yellow-500">(Cannot deactivate self)</span>}</div>
        {/* Is Superuser */} <div className="flex items-center"> <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmittingUserDetails || (currentUser && currentUser.id === parseInt(userId, 10))} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/> <label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Full Admin Privileges)</label> {currentUser && currentUser.id === parseInt(userId, 10) && <span className="ml-2 text-xs text-yellow-500">(Cannot change for self)</span>}</div>
        {/* Buttons */} <div className="flex justify-end space-x-3 pt-4"> <Link to="/users" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link> <button type="submit" disabled={isSubmittingUserDetails} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmittingUserDetails ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmittingUserDetails ? 'Saving User Details...' : 'Save User Details'} </button> </div>
      </form>

      {/* Admin Reset Password Form */}
      {isAdmin && currentUser && currentUser.id !== parseInt(userId, 10) && (
        <div className="max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md mb-8 mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Reset User's Password</h2>
            {resetPasswordError && ( <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert"> {resetPasswordError} </div> )}
            <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-4">
                <div> <label htmlFor="newPasswordByAdmin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password for User</label> <input type="password" name="newPasswordByAdmin" id="newPasswordByAdmin" required minLength="8" value={newPasswordByAdmin} onChange={(e) => setNewPasswordByAdmin(e.target.value)} disabled={isSubmittingNewPassword} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70" placeholder="Min. 8 characters"/> </div>
                <div> <label htmlFor="confirmNewPasswordByAdmin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label> <input type="password" name="confirmNewPasswordByAdmin" id="confirmNewPasswordByAdmin" required minLength="8" value={confirmNewPasswordByAdmin} onChange={(e) => setConfirmNewPasswordByAdmin(e.target.value)} disabled={isSubmittingNewPassword} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
                <div className="flex justify-end pt-2"> <button type="submit" disabled={isSubmittingNewPassword} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"> {isSubmittingNewPassword ? 'Resetting...' : 'Reset Password'} </button> </div>
            </form>
        </div>
      )}

      {/* Project Assignments Section */}
      {projectDataLoading ? (
          <LoadingSpinner text="Loading project assignments..." />
      ) : (
        <div className="max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Assignments</h2>
            {projectAssignmentError && ( <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{projectAssignmentError}</p> )}
            {allProjects.length === 0 ? ( <p className="text-sm text-gray-500 dark:text-gray-400">No projects available to assign.</p> ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allProjects.map(project => (
                        <div key={project.id} className="flex items-center">
                            <input type="checkbox" id={`project-assign-${project.id}-${userId}`} checked={assignedProjectIds.has(project.id)} onChange={(e) => handleProjectAssignmentChange(project.id, e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded"/>
                            <label htmlFor={`project-assign-${project.id}-${userId}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300"> {project.name} </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
}
export default UserEditPage;