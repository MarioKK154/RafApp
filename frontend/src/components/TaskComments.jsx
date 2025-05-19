// frontend/src/components/TaskComments.jsx
// Uncondensed Version: Re-verified add comment logic & toasts, includes delete modal
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal'; // Ensure this path is correct
import { toast } from 'react-toastify';

const COMMENT_MODERATOR_ROLES = ["admin", "project manager", "team leader"];

function TaskComments({ taskId }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Loading comments
  const [error, setError] = useState(''); // Error for fetching comments
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Submitting new comment
  const { user, isAuthenticated } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const fetchComments = useCallback(() => {
    if (!taskId || !isAuthenticated) {
        setIsLoading(false); // Stop loading if no taskId or not auth
        setComments([]); // Clear comments
        return;
    }
    setIsLoading(true);
    setError('');
    axiosInstance.get(`/tasks/${taskId}/comments/`)
        .then(response => {
            setComments(response.data);
        })
        .catch(err => {
            console.error("Error fetching comments:", err);
            setError('Failed to load comments.');
            // toast.error('Failed to load comments.'); // Can be noisy on initial load
        })
        .finally(() => {
            setIsLoading(false);
        });
  }, [taskId, isAuthenticated]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleInputChange = (event) => {
    setNewCommentText(event.target.value);
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newCommentText.trim()) {
        toast.warn("Comment cannot be empty.");
        return;
    }
    if (!isAuthenticated) {
        toast.error("You must be logged in to comment.");
        return;
    }

    setIsSubmitting(true);
    // setError(''); // Clear previous list error, not form error

    try {
        // The backend expects: {"content": "your comment text"}
        await axiosInstance.post(`/tasks/${taskId}/comments/`, { content: newCommentText });
        toast.success("Comment added successfully!");
        setNewCommentText(''); // Clear input field
        fetchComments(); // Refresh comments list
    } catch (err) {
        console.error("Error adding comment:", err);
        const errorMsg = err.response?.data?.detail || 'Failed to add comment.';
        // setError(errorMsg); // This would display above the list
        toast.error(errorMsg); // Display as toast
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (comment) => {
    const canDelete = user && (user.id === comment.author?.id || COMMENT_MODERATOR_ROLES.includes(user.role));
    if (!canDelete) {
        toast.error("You don't have permission to delete this comment.");
        return;
    }
    setCommentToDelete(comment);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
        await axiosInstance.delete(`/comments/${commentToDelete.id}`);
        toast.success("Comment deleted successfully.");
        fetchComments();
    } catch (err) {
        console.error("Error deleting comment:", err);
        toast.error(err.response?.data?.detail || 'Failed to delete comment.');
    } finally {
        setIsDeleteModalOpen(false);
        setCommentToDelete(null);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading comments...</p>;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Comments</h2>

      {/* Error display for fetching comments */}
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Add Comment Form (Only if authenticated) */}
      {isAuthenticated && (
        <form onSubmit={handleAddComment} className="mb-6 space-y-3">
          <div>
            <label htmlFor={`newComment-${taskId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add a comment</label>
            <textarea
              id={`newComment-${taskId}`} // Unique ID if component used multiple times
              name="newComment"
              rows="3"
              value={newCommentText}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-70"
              placeholder="Type your comment here..."
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !newCommentText.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </form>
      )}

      {/* List Existing Comments */}
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Existing Comments</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Added padding-right for scrollbar */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
        ) : (
          comments.map(comment => {
             const canCurrentUserDelete = user && (user.id === comment.author?.id || COMMENT_MODERATOR_ROLES.includes(user.role));
             return (
                <div key={comment.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-sm shadow-sm">
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        By: {comment.author?.full_name || comment.author?.email || 'Unknown User'}
                        <span className="mx-1">|</span>
                        On: {new Date(comment.created_at).toLocaleString()}
                      </p>
                      {canCurrentUserDelete && (
                          <button
                            onClick={() => handleDeleteClick(comment)}
                            className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete comment"
                            aria-label="Delete comment"
                           >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                           </button>
                      )}
                  </div>
                </div>
             );
            })
        )}
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setCommentToDelete(null); }}
        onConfirm={confirmDeleteComment}
        title="Confirm Comment Deletion"
      >
        Are you sure you want to delete this comment?
        {commentToDelete && <blockquote className="mt-2 p-2 border-l-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 italic text-xs">"{commentToDelete.content.substring(0,100)}{commentToDelete.content.length > 100 ? '...' : ''}"</blockquote>}
      </Modal>
    </div>
  );
}

export default TaskComments;