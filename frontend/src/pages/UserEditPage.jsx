// frontend/src/pages/UserEditPage.jsx
// Uncondensed Version: Re-verified for Project Assignment Section
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician']; // "employee" role removed

function UserEditPage() {
  const { userId } = useParams(); // User ID being edited
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    employee_id: '',
    kennitala: '',
    phone_number: '',
    location: '',
    role: '',
    is_active: true,
    is_superuser: false,
  });
  const [initialUserData, setInitialUserData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For fetching user to edit
  const [error, setError] = useState(''); // For form submission or critical fetch errors
  const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);

  // State for Project Assignments
  const [allProjects, setAllProjects] = useState([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState(new Set());
  const [projectDataLoading, setProjectDataLoading] = useState(true);
  const [projectAssignmentError, setProjectAssignmentError] = useState('');

  const isAdmin = currentUser && currentUser.role === 'admin';

  // Fetch user data and all projects
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
          email: fetchedUser.email ?? '',
          full_name: fetchedUser.full_name ?? '',
          employee_id: fetchedUser.employee_id ?? '',
          kennitala: fetchedUser.kennitala ?? '',
          phone_number: fetchedUser.phone_number ?? '',
          location: fetchedUser.location ?? '',
          role: fetchedUser.role ?? ROLES_LIST[ROLES_LIST.length - 1],
          is_active: fetchedUser.is_active ?? true,
          is_superuser: fetchedUser.is_superuser ?? false,
        });
        setIsLoadingData(false); // User data loaded

        // Fetch all projects for assignment
        const projectsResponse = await axiosInstance.get('/projects/');
        setAllProjects(projectsResponse.data);

        // Fetch current project assignments for this user
        // This is the INEFFICIENT part for many projects.
        // A backend endpoint GET /users/{userId}/projects would be better.
        const currentAssignments = new Set();
        // We need to know which projects this user is ALREADY a member of.
        // The /users/{userId} endpoint doesn't return this.
        // The /projects/{projectId}/members endpoint returns members for a project.
        // So, to find which projects user `userId` is in, we'd have to iterate all projects
        // and for each project, fetch its members and see if `userId` is in that list.
        // This is too many API calls for the initial load of this page.
        //
        // Alternative (Simpler for now, but relies on ProjectRead having members, which it might not):
        // If projectsResponse.data contained project.members, we could do:
        // projectsResponse.data.forEach(project => {
        //   if (project.members && project.members.some(member => member.id === parseInt(userId, 10))) {
        //     currentAssignments.add(project.id);
        //   }
        // });
        //
        // For now, let's initialize assignedProjectIds as empty and let the admin manage from scratch,
        // or fetch them one by one if truly necessary.
        // A better UX would be to pre-populate, which requires backend support for GET /users/{userId}/projects
        // Let's fetch members for *visible* projects to attempt pre-population - still inefficient but demonstrates
        // For demonstration, let's just fetch the first few projects' members. This logic needs refinement.
        if (projectsResponse.data.length > 0) {
            for (const project of projectsResponse.data) { // Limiting for demo, remove slice for real use
                try {
                    const membersResponse = await axiosInstance.get(`/projects/${project.id}/members`);
                    if (membersResponse.data.some(member => member.id === parseInt(userId, 10))) {
                        currentAssignments.add(project.id);
                    }
                } catch (memberErr) {
                    console.warn(`Could not fetch members for project ${project.id} during initial load`, memberErr);
                }
            }
        }
        setAssignedProjectIds(currentAssignments);
        setProjectDataLoading(false); // Project data loaded

      } catch (err) {
        console.error("Error fetching page data for User Edit:", err);
        const errorMsg = err.response?.status === 404 ? 'User or essential data not found.' : 'Failed to load user or project data.';
        setError(errorMsg);
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
    if (!isAdmin) {
        toast.error("You do not have permission to save changes.");
        return;
    }
    setError('');
    setIsSubmittingUserDetails(true);

    const updatePayload = {};
    if (initialUserData) {
        if (formData.email !== initialUserData.email) updatePayload.email = formData.email;
        if (formData.full_name !== (initialUserData.full_name ?? '')) updatePayload.full_name = formData.full_name || null;
        if (formData.employee_id !== (initialUserData.employee_id ?? '')) updatePayload.employee_id = formData.employee_id || null;
        if (formData.kennitala !== (initialUserData.kennitala ?? '')) updatePayload.kennitala = formData.kennitala || null;
        if (formData.phone_number !== (initialUserData.phone_number ?? '')) updatePayload.phone_number = formData.phone_number || null;
        if (formData.location !== (initialUserData.location ?? '')) updatePayload.location = formData.location || null;
        if (formData.role !== initialUserData.role) updatePayload.role = formData.role;
        if (formData.is_active !== initialUserData.is_active) updatePayload.is_active = formData.is_active;
        if (formData.is_superuser !== initialUserData.is_superuser) {
             // Prevent admin from unchecking superuser for themselves if they are the one being edited
            if (currentUser.id === parseInt(userId, 10) && initialUserData.is_superuser && !formData.is_superuser) {
                toast.warn("Admin cannot remove their own superuser status.");
            } else {
                updatePayload.is_superuser = formData.is_superuser;
            }
        }
    } else {
        toast.error("Original user data not available. Cannot determine changes.");
        setIsSubmittingUserDetails(false);
        return;
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
      // navigate('/users'); // Optionally navigate, or allow further edits
    } catch (err) {
      console.error("Error updating user details:", err);
      const errorMsg = err.response?.data?.detail || 'Failed to update user details.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmittingUserDetails(false);
    }
  };

  const handleProjectAssignmentChange = async (projectId, isAssigned) => {
    if (!isAdmin || !initialUserData) return;
    const userIdBeingEdited = initialUserData.id;
    const projectName = allProjects.find(p => p.id === projectId)?.name || `Project ID ${projectId}`;
    setProjectAssignmentError('');

    const originalAssignments = new Set(assignedProjectIds);

    // Optimistic UI update
    setAssignedProjectIds(prevIds => {
        const newIds = new Set(prevIds);
        if (isAssigned) { newIds.add(projectId); } else { newIds.delete(projectId); }
        return newIds;
    });

    try {
      if (isAssigned) {
        await axiosInstance.post(`/projects/${projectId}/members`, { user_id: userIdBeingEdited });
        toast.success(`User assigned to project "${projectName}".`);
      } else {
        await axiosInstance.delete(`/projects/${projectId}/members/${userIdBeingEdited}`);
        toast.success(`User unassigned from project "${projectName}".`);
      }
    } catch (err) {
      console.error("Error updating project assignment:", err);
      const errorMsg = err.response?.data?.detail || `Failed to update assignment for "${projectName}".`;
      setProjectAssignmentError(errorMsg);
      toast.error(errorMsg);
      setAssignedProjectIds(originalAssignments); // Revert optimistic update
    }
  };

  // --- Render Logic ---
  if (authIsLoading || isLoadingData) {
    return (
        <div className="container mx-auto p-6 text-center">
            <p className="text-xl text-gray-500 dark:text-gray-400">Loading user data...</p>
        </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>Please log in to continue.</p>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</Link>
        </div>
    );
  }

  if (!isAdmin || error && (!initialUserData || (initialUserData && !initialUserData.email))) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error || "Access Denied."}</p>
            <Link to={isAdmin ? "/users" : "/"} className="text-blue-500 underline ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Go Back</Link>
        </div>
     );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Edit User: {initialUserData?.full_name || initialUserData?.email || `ID ${userId}`}
      </h1>

      {/* Form submission errors */}
      {error && !error.toLowerCase().includes('not found') && !error.toLowerCase().includes('access denied') && (
        <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{error}</p>
      )}

      {/* User Details Form */}
      <form onSubmit={handleSubmitUserDetails} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md mb-8">
        <legend className="text-lg font-medium text-gray-900 dark:text-white mb-2">User Details</legend>
        {/* Email */}
        <div> <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label> <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Full Name */}
        <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label> <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Employee ID */}
        <div> <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label> <input type="text" name="employee_id" id="employee_id" value={formData.employee_id} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Kennitala */}
        <div> <label htmlFor="kennitala" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kennitala</label> <input type="text" name="kennitala" id="kennitala" value={formData.kennitala} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Phone Number */}
        <div> <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label> <input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Location */}
        <div> <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label> <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70"/> </div>
        {/* Role */}
        <div> <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role <span className="text-red-500">*</span></label> <select name="role" id="role" required value={formData.role} onChange={handleChange} disabled={isSubmittingUserDetails} className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-70">{ROLES_LIST.map(r => (<option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>))}</select> </div>
        {/* Is Active */}
        <div className="flex items-center"> <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmittingUserDetails} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/> <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label> </div>
        {/* Is Superuser */}
        <div className="flex items-center"> <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={isSubmittingUserDetails || (currentUser && currentUser.id === parseInt(userId, 10))} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded disabled:opacity-70"/> <label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Full Admin Privileges)</label> {currentUser && currentUser.id === parseInt(userId, 10) && <span className="ml-2 text-xs text-yellow-500">(Cannot change for self)</span>}</div>
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4"> <Link to="/users" className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</Link> <button type="submit" disabled={isSubmittingUserDetails} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmittingUserDetails ? 'opacity-50 cursor-not-allowed' : ''}`}> {isSubmittingUserDetails ? 'Saving Details...' : 'Save User Details'} </button> </div>
      </form>

      {/* Project Assignments Section */}
      {projectDataLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading project assignments...</p>
      ) : (
        <div className="max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Assignments</h2>
            {projectAssignmentError && ( <p className="text-red-500 mb-4 bg-red-100 dark:bg-red-900 dark:text-red-300 p-3 rounded">{projectAssignmentError}</p> )}
            {allProjects.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No projects available to assign.</p>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto"> {/* Added scroll for many projects */}
                    {allProjects.map(project => (
                        <div key={project.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`project-assign-${project.id}-${userId}`} // Unique ID for checkbox
                                checked={assignedProjectIds.has(project.id)}
                                onChange={(e) => handleProjectAssignmentChange(project.id, e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-500 rounded"
                            />
                            <label htmlFor={`project-assign-${project.id}-${userId}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                {project.name}
                            </label>
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