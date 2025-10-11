// frontend/src/pages/UserEditPage.jsx
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
        email: '',
        full_name: '',
        employee_id: '',
        kennitala: '',
        phone_number: '',
        location: '',
        role: '',
        is_active: true,
        is_superuser: false,
        hourly_rate: '',
        tenant_id: '',
    });
    const [initialUserData, setInitialUserData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);
    
    const canViewPage = currentUser && ['admin', 'project manager', 'superuser'].includes(currentUser.role);
    const canSaveChanges = currentUser && ['admin', 'superuser'].includes(currentUser.role);
    const isSuperuserEditing = currentUser?.is_superuser;

    const [newPasswordByAdmin, setNewPasswordByAdmin] = useState('');
    const [confirmNewPasswordByAdmin, setConfirmNewPasswordByAdmin] = useState('');
    const [resetPasswordError, setResetPasswordError] = useState('');
    const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

    const [allProjects, setAllProjects] = useState([]);
    const [allTenants, setAllTenants] = useState([]);
    const [assignedProjectIds, setAssignedProjectIds] = useState(new Set());
    const [projectDataLoading, setProjectDataLoading] = useState(true);
    const [projectAssignmentError, setProjectAssignmentError] = useState('');

    const fetchPageData = useCallback(async () => {
        if (!authIsLoading && isAuthenticated && canViewPage && userId) {
            setIsLoadingData(true);
            setProjectDataLoading(true);
            setError('');
            try {
                const promises = [
                    axiosInstance.get(`/users/${userId}`),
                    axiosInstance.get('/projects/')
                ];
                if (isSuperuserEditing) {
                    promises.push(axiosInstance.get('/tenants/'));
                }
                const responses = await Promise.all(promises);
                
                const fetchedUser = responses[0].data;
                const projects = responses[1].data;
                
                setInitialUserData(fetchedUser);
                setFormData({
                    email: fetchedUser.email ?? '',
                    full_name: fetchedUser.full_name ?? '',
                    employee_id: fetchedUser.employee_id ?? '',
                    kennitala: fetchedUser.kennitala ?? '',
                    phone_number: fetchedUser.phone_number ?? '',
                    location: fetchedUser.location ?? '',
                    role: fetchedUser.role ?? '',
                    is_active: fetchedUser.is_active ?? true,
                    is_superuser: fetchedUser.is_superuser ?? false,
                    hourly_rate: fetchedUser.hourly_rate ?? '',
                    tenant_id: fetchedUser.tenant_id ?? '',
                });
                
                setAllProjects(projects);

                if (isSuperuserEditing) {
                    setAllTenants(responses[2].data);
                }

                setIsLoadingData(false);
                
                const currentAssignments = new Set();
                for (const project of projects) {
                    try {
                        const membersResponse = await axiosInstance.get(`/projects/${project.id}/members`);
                        if (membersResponse.data.some(member => member.id === parseInt(userId, 10))) {
                            currentAssignments.add(project.id);
                        }
                    } catch (memberErr) {
                        console.warn(`Could not fetch members for project ${project.id}`, memberErr);
                    }
                }
                setAssignedProjectIds(currentAssignments);
                setProjectDataLoading(false);

            } catch (err) {
                const errorMsg = err.response?.status === 404 ? 'User not found.' : 'Failed to load user data.';
                setError(errorMsg);
                toast.error(errorMsg);
                setIsLoadingData(false);
                setProjectDataLoading(false);
            }
        } else if (!authIsLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        } else if (!authIsLoading && !canViewPage) {
            setError('Access Denied. You do not have permission to view this page.');
            setIsLoadingData(false);
            setProjectDataLoading(false);
        }
    }, [userId, isAuthenticated, authIsLoading, canViewPage, isSuperuserEditing, navigate]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmitUserDetails = async (e) => {
        e.preventDefault();
        if (!canSaveChanges) {
            toast.error("You do not have permission to save changes.");
            return;
        }
        setIsSubmittingUserDetails(true);
        const updatePayload = {};
        
        if (formData.email !== initialUserData.email) updatePayload.email = formData.email;
        if (formData.full_name !== (initialUserData.full_name ?? '')) updatePayload.full_name = formData.full_name || null;
        if (formData.employee_id !== (initialUserData.employee_id ?? '')) updatePayload.employee_id = formData.employee_id || null;
        if (formData.kennitala !== (initialUserData.kennitala ?? '')) updatePayload.kennitala = formData.kennitala || null;
        if (formData.phone_number !== (initialUserData.phone_number ?? '')) updatePayload.phone_number = formData.phone_number || null;
        if (formData.location !== (initialUserData.location ?? '')) updatePayload.location = formData.location || null;
        if (formData.role !== initialUserData.role) updatePayload.role = formData.role;
        if (formData.is_active !== initialUserData.is_active) updatePayload.is_active = formData.is_active;
        const initialRate = initialUserData.hourly_rate ?? '';
        const currentRate = formData.hourly_rate ?? '';
        if (String(currentRate) !== String(initialRate)) {
            updatePayload.hourly_rate = formData.hourly_rate === '' ? null : parseFloat(formData.hourly_rate);
        }
        if (isSuperuserEditing && formData.is_superuser !== initialUserData.is_superuser) {
            updatePayload.is_superuser = formData.is_superuser;
        }
        if (isSuperuserEditing && formData.tenant_id !== (initialUserData.tenant_id ?? '')) {
            updatePayload.tenant_id = formData.tenant_id ? parseInt(formData.tenant_id, 10) : null;
        }

        if (Object.keys(updatePayload).length === 0) {
            toast.info("No changes detected.");
            setIsSubmittingUserDetails(false);
            return;
        }

        try {
            const response = await axiosInstance.put(`/users/${userId}`, updatePayload);
            toast.success(`User "${response.data.email}" updated successfully!`);
            setInitialUserData(response.data);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Failed to update user.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmittingUserDetails(false);
        }
    };
    
    const handleAdminResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (!canSaveChanges) { toast.error("No permission."); return; }
        if (currentUser && currentUser.id === parseInt(userId, 10)) { toast.error("Use Account Settings for own password."); return; }
        setResetPasswordError('');
        if (newPasswordByAdmin.length < 8) { setResetPasswordError('New password min 8 chars.'); toast.error('New password min 8 chars.'); return; }
        if (newPasswordByAdmin !== confirmNewPasswordByAdmin) { setResetPasswordError('Passwords do not match.'); toast.error('Passwords do not match.'); return; }
        setIsSubmittingNewPassword(true);
        try {
            await axiosInstance.post(`/users/${userId}/set-password`, { new_password: newPasswordByAdmin });
            toast.success(`Password for user ${initialUserData?.email || userId} reset successfully.`);
            setNewPasswordByAdmin(''); setConfirmNewPasswordByAdmin('');
        } catch (err) { 
            const errorMsg = err.response?.data?.detail || 'Failed to reset password.'; 
            setResetPasswordError(errorMsg); 
            toast.error(errorMsg);
        } finally { setIsSubmittingNewPassword(false); }
    };

    const handleProjectAssignmentChange = async (projectId, isAssigned) => {
        if (!canSaveChanges) return;
        const userIdBeingEdited = initialUserData.id;
        const projectName = allProjects.find(p => p.id === projectId)?.name || `Project ID ${projectId}`;
        setProjectAssignmentError('');
        const originalAssignments = new Set(assignedProjectIds);
        setAssignedProjectIds(prevIds => { 
            const newIds = new Set(prevIds); 
            if (isAssigned) newIds.add(projectId); 
            else newIds.delete(projectId); 
            return newIds; 
        });
        try {
            if (isAssigned) {
                await axiosInstance.post(`/projects/${projectId}/members`, { user_id: userIdBeingEdited });
                toast.success(`User assigned to "${projectName}".`);
            } else {
                await axiosInstance.delete(`/projects/${projectId}/members/${userIdBeingEdited}`);
                toast.success(`User unassigned from "${projectName}".`);
            }
        } catch (err) { 
            const errorMsg = err.response?.data?.detail || `Failed for "${projectName}".`; 
            setProjectAssignmentError(errorMsg); 
            toast.error(errorMsg); 
            setAssignedProjectIds(originalAssignments); 
        }
    };

    if (authIsLoading || isLoadingData) {
        return <LoadingSpinner text="Loading user data..." />;
    }
    if (!isAuthenticated || !canViewPage) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>{error || "Access Denied."}</p><Link to="/users" className="text-blue-500 underline ml-2">Back to User List</Link></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white"> View / Edit User: {initialUserData?.full_name || initialUserData?.email} </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <fieldset disabled={!canSaveChanges || isSubmittingUserDetails}>
                        <form onSubmit={handleSubmitUserDetails} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                            <legend className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                User Details { !canSaveChanges && <span className="text-sm font-normal text-yellow-500">(Read-Only)</span> }
                            </legend>
                            
                            <div> <label htmlFor="email" className="block text-sm font-medium">Email <span className="text-red-500">*</span></label> <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>
                            <div> <label htmlFor="full_name" className="block text-sm font-medium">Full Name</label> <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>
                            <div> <label htmlFor="employee_id" className="block text-sm font-medium">Employee ID</label> <input type="text" name="employee_id" id="employee_id" value={formData.employee_id} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>
                            <div> <label htmlFor="kennitala" className="block text-sm font-medium">Kennitala</label> <input type="text" name="kennitala" id="kennitala" value={formData.kennitala} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>
                            <div> <label htmlFor="phone_number" className="block text-sm font-medium">Phone Number</label> <input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>
                            <div> <label htmlFor="location" className="block text-sm font-medium">Location</label> <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full rounded-md"/> </div>

                            {canSaveChanges && (
                                <div>
                                    <label htmlFor="hourly_rate" className="block text-sm font-medium">Hourly Rate (ISK)</label>
                                    <input type="number" name="hourly_rate" id="hourly_rate" value={formData.hourly_rate} onChange={handleChange} step="1" placeholder="e.g., 5000" className="mt-1 block w-full rounded-md"/>
                                </div>
                            )}

                            <div> <label htmlFor="role" className="block text-sm font-medium">Role <span className="text-red-500">*</span></label> <select name="role" id="role" required value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md">{ROLES_LIST.map(r => (<option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>))}</select> </div>
                            
                            {isSuperuserEditing && !formData.is_superuser && (
                                <div>
                                    <label htmlFor="tenant_id" className="block text-sm font-medium">Tenant</label>
                                    <select name="tenant_id" id="tenant_id" value={formData.tenant_id || ''} onChange={handleChange} className="mt-1 block w-full rounded-md">
                                        <option value="" disabled>-- Select Tenant --</option>
                                        {allTenants.map(tenant => (
                                            <option key={tenant.id} value={tenant.id}>{tenant.name} (ID: {tenant.id})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center"> <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded"/> <label htmlFor="is_active" className="ml-2 block text-sm">Active User</label></div>
                            
                            {isSuperuserEditing && (
                                <div className="flex items-center">
                                    <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={currentUser.id === parseInt(userId, 10)} className="h-4 w-4 rounded"/>
                                    <label htmlFor="is_superuser" className="ml-2 block text-sm">Superuser</label>
                                    {currentUser.id === parseInt(userId, 10) && <span className="ml-2 text-xs text-yellow-500">(Cannot change for self)</span>}
                                </div>
                            )}
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <Link to="/users" className="px-4 py-2 border rounded-md shadow-sm">Cancel</Link>
                                {canSaveChanges && (
                                    <button type="submit" disabled={isSubmittingUserDetails} className="px-4 py-2 border rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                                        {isSubmittingUserDetails ? 'Saving...' : 'Save Details'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </fieldset>
                    
                    {canSaveChanges && currentUser.id !== parseInt(userId, 10) && (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                             <h2 className="text-xl font-semibold mb-4">Reset User's Password</h2>
                             {resetPasswordError && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{resetPasswordError}</div>}
                             <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-4">
                                 <div><label htmlFor="newPasswordByAdmin">New Password</label><input type="password" name="newPasswordByAdmin" required minLength="8" value={newPasswordByAdmin} onChange={(e) => setNewPasswordByAdmin(e.target.value)} disabled={isSubmittingNewPassword} className="mt-1 block w-full rounded-md" /></div>
                                 <div><label htmlFor="confirmNewPasswordByAdmin">Confirm New Password</label><input type="password" name="confirmNewPasswordByAdmin" required minLength="8" value={confirmNewPasswordByAdmin} onChange={(e) => setConfirmNewPasswordByAdmin(e.target.value)} disabled={isSubmittingNewPassword} className="mt-1 block w-full rounded-md" /></div>
                                 <div className="flex justify-end pt-2"><button type="submit" disabled={isSubmittingNewPassword} className="px-4 py-2 border rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50">{isSubmittingNewPassword ? 'Resetting...' : 'Reset Password'}</button></div>
                             </form>
                         </div>
                    )}
                </div>
                
                <div>
                    {projectDataLoading ? (
                        <LoadingSpinner text="Loading project assignments..." />
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                            <h2 className="text-xl font-semibold mb-4">Project Assignments</h2>
                            {projectAssignmentError && <p className="text-red-500 mb-4 p-3 rounded">{projectAssignmentError}</p>}
                            {allProjects.length === 0 ? <p className="text-sm">No projects available.</p> : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {allProjects.map(project => (
                                        <div key={project.id} className="flex items-center">
                                            <input type="checkbox" id={`project-assign-${project.id}`} checked={assignedProjectIds.has(project.id)} onChange={(e) => handleProjectAssignmentChange(project.id, e.target.checked)} disabled={!canSaveChanges} className="h-4 w-4 rounded"/>
                                            <label htmlFor={`project-assign-${project.id}`} className="ml-2 block text-sm"> {project.name} </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserEditPage;