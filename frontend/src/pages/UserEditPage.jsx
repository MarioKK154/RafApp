// frontend/src/pages/UserEditPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function UserEditPage() {
  const { userId } = useParams(); // Get userId from URL
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth(); // Current logged-in user
  const [userData, setUserData] = useState(null); // User being edited
  const [formData, setFormData] = useState({ // Form state
    email: '',
    full_name: '',
    role: '',
    is_active: true,
    is_superuser: false, // Include if needed/editable
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current logged-in user is admin
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Fetch user data to edit
  useEffect(() => {
    // Ensure current user is admin and auth check done
    if (!authIsLoading && isAuthenticated && isAdmin && userId) {
      setIsLoading(true);
      setError('');
      axiosInstance.get(`/users/${userId}`) // Use the new endpoint
        .then(response => {
          const fetchedUser = response.data;
          setUserData(fetchedUser);
          // Populate form state
          setFormData({
            email: fetchedUser.email || '',
            full_name: fetchedUser.full_name || '',
            role: fetchedUser.role || 'employee',
            is_active: fetchedUser.is_active ?? true,
            is_superuser: fetchedUser.is_superuser ?? false,
          });
        })
        .catch(err => {
          console.error("Error fetching user data:", err);
          setError(err.response?.status === 404 ? 'User not found.' : 'Failed to load user data.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      navigate('/login'); // Redirect if not logged in
    } else if (!authIsLoading && !isAdmin) {
      // If logged in but not Admin, show error
      setIsLoading(false);
      setError('You do not have permission to edit users.');
    }
  }, [userId, isAuthenticated, authIsLoading, isAdmin, navigate]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Shouldn't happen if UI is correct, but double-check
    setError('');
    setIsSubmitting(true);

    // Prepare only the fields that are in UserUpdateAdmin schema
    const updatePayload = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
        is_superuser: formData.is_superuser,
    };
    // Optional: Filter out unchanged values to send a smaller payload
    // const changedPayload = {};
    // for (const key in updatePayload) {
    //    if (updatePayload[key] !== userData[key]) { // Compare with initial fetched data
    //        changedPayload[key] = updatePayload[key];
    //    }
    // }

    try {
      await axiosInstance.put(`/users/${userId}`, updatePayload); // Send PUT request
      navigate('/users'); // Navigate back to user list on success
    } catch (err) {
      console.error("Error updating user:", err);
      setError(err.response?.data?.detail || 'Failed to update user.');
      setIsSubmitting(false); // Re-enable form on error
    }
  };

  // Render Logic
  if (authIsLoading || isLoading) return <p>Loading user details...</p>;

  // Handle errors like permission denied or user not found
  if (error) {
     return (
         <div className="container mx-auto p-6 text-center text-red-500">
             {error} <Link to={isAdmin ? "/users" : "/"} className="text-blue-500 underline ml-2">Go Back</Link>
         </div>
     );
  }

  if (!isAuthenticated || !isAdmin || !userData) {
     // Should have been handled above or by redirects, but catch all
     return <p>Access Denied or User not loaded.</p>;
  }

  // Available roles (could fetch from backend later if dynamic)
  const roles = ['admin', 'project manager', 'team leader', 'electrician', 'employee'];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Edit User: {userData.full_name || userData.email}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg bg-white dark:bg-gray-800 p-6 rounded shadow-md">
         {/* Email */}
         <div>
             <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
             <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full ..." />
         </div>
         {/* Full Name */}
          <div>
             <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
             <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} className="mt-1 block w-full ..." />
         </div>
         {/* Role */}
         <div>
             <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
             <select name="role" id="role" required value={formData.role} onChange={handleChange} className="mt-1 block w-full ...">
                 {roles.map(role => ( <option key={role} value={role}>{role}</option> ))}
             </select>
         </div>
         {/* Is Active */}
         <div className="flex items-center">
             <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
             <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active User</label>
         </div>
          {/* Is Superuser */}
         <div className="flex items-center">
             <input type="checkbox" name="is_superuser" id="is_superuser" checked={formData.is_superuser} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
             <label htmlFor="is_superuser" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Superuser (Admin Privileges)</label>
         </div>

         {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Link to="/users" className="px-4 py-2 border border-gray-300 rounded-md ...">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border ... ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserEditPage;