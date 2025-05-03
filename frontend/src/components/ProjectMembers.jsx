// frontend/src/components/ProjectMembers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function ProjectMembers({ projectId }) {
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // For the 'add' dropdown
  const [selectedUserId, setSelectedUserId] = useState(''); // User ID selected to be added
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState(''); // For add/remove errors
  const { user } = useAuth(); // For potential role checks if needed

  // Function to fetch current members
  const fetchMembers = useCallback(() => {
    if (!projectId) return;
    setIsLoading(true); // Consider separate loading for members vs all users
    setError('');
    axiosInstance.get(`/projects/${projectId}/members`)
      .then(response => {
        setMembers(response.data);
      })
      .catch(err => {
        console.error("Error fetching project members:", err);
        setError('Failed to load project members.');
      })
      .finally(() => setIsLoading(false)); // Stop loading after members fetch
  }, [projectId]);

  // Function to fetch all users (for the add dropdown)
  const fetchAllUsers = useCallback(() => {
      if (!projectId) return; // Or maybe allow fetching users regardless?
      setActionError(''); // Clear action errors on user fetch
       axiosInstance.get('/users/') // Assuming this endpoint lists users (requires Admin/PM role based on backend)
        .then(response => {
            setAllUsers(response.data);
        })
        .catch(err => {
            console.error("Error fetching all users:", err);
            setActionError('Failed to load user list for assignment.'); // Use actionError
        });
  }, [projectId]);


  // Fetch data on mount/projectId change
  useEffect(() => {
    fetchMembers();
    fetchAllUsers();
  }, [fetchMembers, fetchAllUsers]); // Depend on the memoized functions

  // Handle adding a member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setActionError('Please select a user to add.');
      return;
    }
    setActionError('');
    try {
      await axiosInstance.post(`/projects/${projectId}/members`, { user_id: parseInt(selectedUserId, 10) });
      setSelectedUserId(''); // Reset dropdown
      fetchMembers(); // Refresh member list
    } catch (err) {
       console.error("Error adding member:", err);
       setActionError(err.response?.data?.detail || 'Failed to add member.');
    }
  };

  // Handle removing a member
  const handleRemoveMember = async (userIdToRemove) => {
     if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
     }
     setActionError('');
     try {
        await axiosInstance.delete(`/projects/${projectId}/members/${userIdToRemove}`);
        fetchMembers(); // Refresh member list
     } catch (err) {
        console.error("Error removing member:", err);
        setActionError(err.response?.data?.detail || 'Failed to remove member.');
     }
  };

  // --- Render Logic ---

  // Filter users available to be added (not already members)
  const availableUsersToAdd = allUsers.filter(
    u => !members.some(m => m.id === u.id)
  );

  if (isLoading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading members...</p>;

  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Members</h2>

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} className="mb-6 p-4 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-700 space-y-3">
         <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Add Member</h3>
         {actionError && <p className="text-red-500 text-sm">{actionError}</p>}
         <div className="flex items-end space-x-2">
             <div className="flex-grow">
                <label htmlFor="userToAdd" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select User</label>
                <select
                    id="userToAdd"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                    disabled={availableUsersToAdd.length === 0}
                >
                    <option value="" disabled>-- Select User --</option>
                    {availableUsersToAdd.map(u => (
                        <option key={u.id} value={u.id}>
                            {u.full_name || u.email} ({u.role})
                        </option>
                    ))}
                </select>
             </div>
            <button
                type="submit"
                disabled={!selectedUserId}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                Add
            </button>
         </div>
          {availableUsersToAdd.length === 0 && !actionError && <p className="text-xs text-gray-500 mt-1">No available users to add or could not load users.</p>}
      </form>

      {/* Member List */}
       <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Current Members</h3>
       {members.length === 0 && !error ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No members assigned to this project yet.</p>
       ) : (
           <ul className="space-y-2">
               {members.map(member => (
                   <li key={member.id} className="flex justify-between items-center p-2 border rounded dark:border-gray-700 bg-white dark:bg-gray-800">
                       <span>
                           {member.full_name || member.email} <span className="text-xs text-gray-500">({member.role})</span>
                       </span>
                       <button
                           onClick={() => handleRemoveMember(member.id)}
                           className="ml-4 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200 text-xs"
                       >
                           Remove
                       </button>
                   </li>
               ))}
           </ul>
       )}
    </div>
  );
}

export default ProjectMembers;