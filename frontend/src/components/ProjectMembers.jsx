// frontend/src/components/ProjectMembers.jsx
// Uncondensed Version: Integrated Confirmation Modal for Remove Member
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal'; // Import Modal
import { toast } from 'react-toastify';   // Import toast

function ProjectMembers({ projectId }) {
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { user } = useAuth(); // For role checks, though backend handles primary auth

  // --- NEW: State for Remove Member Modal ---
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null); // Store {id, name/email}

  // Fetch members and all users (as before)
  const fetchMembers = useCallback(() => { /* ... */ }, [projectId]);
  const fetchAllUsers = useCallback(() => { /* ... */ }, [projectId]);
  useEffect(() => { fetchMembers(); fetchAllUsers(); }, [fetchMembers, fetchAllUsers]);

  // Handle adding a member (as before, add toasts)
  const handleAddMember = async (e) => {
      e.preventDefault(); /* ... */
      setActionError('');
      try {
          await axiosInstance.post(`/projects/${projectId}/members`, { user_id: parseInt(selectedUserId,10) });
          toast.success("Member added successfully!");
          setSelectedUserId(''); fetchMembers();
      } catch (err) { /* ... setActionError; toast.error(...) ... */ }
  };

  // --- MODIFIED: Handle Opening Remove Modal ---
  const handleRemoveClick = (member) => {
    // Assuming Admins/PMs can remove members (backend enforces this)
    setMemberToRemove(member);
    setIsRemoveModalOpen(true);
  };

  // --- NEW: Actual Remove Action from Modal ---
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setActionError('');
    try {
        await axiosInstance.delete(`/projects/${projectId}/members/${memberToRemove.id}`);
        toast.success(`Member "${memberToRemove.full_name || memberToRemove.email}" removed.`);
        fetchMembers();
    } catch (err) {
        console.error("Error removing member:", err);
        const errorMsg = err.response?.data?.detail || 'Failed to remove member.';
        setActionError(errorMsg);
        toast.error(errorMsg);
    } finally {
        setIsRemoveModalOpen(false);
        setMemberToRemove(null);
    }
  };

  const availableUsersToAdd = allUsers.filter(u => !members.some(m => m.id === u.id));
  if (isLoading) return <p>Loading members...</p>;

  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl ...">Project Members</h2>
      {error && <p className="text-red-500 ...">{error}</p>}
      {/* Add Member Form (as before) */}
      <form onSubmit={handleAddMember} className="mb-6 ..."> {/* ... */} </form>

      <h3 className="text-lg ...">Current Members</h3>
      {actionError && !error && <p className="text-red-500 ...">{actionError}</p>} {/* Show specific action errors */}
      {members.length === 0 && !error ? ( <p>...</p> ) : (
          <ul className="space-y-2">
              {members.map(member => (
                  <li key={member.id} className="flex ...">
                      <span>{member.full_name || member.email} ({member.role})</span>
                      {/* --- MODIFIED: Remove Button --- */}
                      <button onClick={() => handleRemoveClick(member)} className="ml-4 px-2 ... bg-red-600 ...">Remove</button>
                  </li>
              ))}
          </ul>
      )}
      {/* --- NEW: Remove Member Confirmation Modal --- */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => { setIsRemoveModalOpen(false); setMemberToRemove(null); }}
        onConfirm={confirmRemoveMember}
        title="Confirm Member Removal"
      >
        Are you sure you want to remove
        <strong className="font-semibold"> "{memberToRemove?.full_name || memberToRemove?.email}"</strong>
        from this project?
      </Modal>
    </div>
  );
}
export default ProjectMembers;