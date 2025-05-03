// frontend/src/components/TaskComments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function TaskComments({ taskId }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth(); // Get current user for author check

  // Roles that can delete any comment (besides the author)
  const moderatorRoles = ["admin", "project manager", "team leader"];

  // Function to fetch comments
  const fetchComments = useCallback(() => {
    if (!taskId || !isAuthenticated) return;
    setIsLoading(true);
    setError('');
    axiosInstance.get(`/tasks/${taskId}/comments/`)
      .then(response => {
        setComments(response.data);
      })
      .catch(err => {
        console.error("Error fetching comments:", err);
        setError('Failed to load comments.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [taskId, isAuthenticated]);

  // Fetch comments on initial mount and when taskId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle new comment input change
  const handleInputChange = (event) => {
    setNewCommentText(event.target.value);
  };

  // Handle submitting a new comment
  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newCommentText.trim()) return; // Don't submit empty comments

    setIsSubmitting(true);
    setError(''); // Clear previous errors

    try {
      await axiosInstance.post(`/tasks/${taskId}/comments/`, { content: newCommentText });
      setNewCommentText(''); // Clear input field
      fetchComments(); // Refresh comments list
    } catch (err) {
      console.error("Error adding comment:", err);
      setError(err.response?.data?.detail || 'Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId) => {
     if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
     }
     setError('');
     try {
        await axiosInstance.delete(`/comments/${commentId}`);
        fetchComments(); // Refresh the list
     } catch (err) {
         console.error("Error deleting comment:", err);
         setError(err.response?.data?.detail || 'Failed to delete comment.');
     }
  };


  // --- Render Logic ---
  if (isLoading) return <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading comments...</p>;

  return (
    <div className="mt-8 pt-6 border-t dark:border-gray-600">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Comments</h2>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* List Existing Comments */}
      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto"> {/* Added max height and scroll */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
        ) : (
          comments.map(comment => {
             // Determine if current user can delete this comment
             const canDelete = user && (user.id === comment.author?.id || moderatorRoles.includes(user.role));
             return (
                <div key={comment.id} className="p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm">
                  <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        By: {comment.author?.full_name || comment.author?.email || 'Unknown'} on {new Date(comment.created_at).toLocaleString()}
                      </p>
                      {/* Show delete button if user is author or moderator */}
                      {canDelete && (
                          <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-2 px-1 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                              aria-label="Delete comment"
                           >
                              &times; {/* Multiplication sign as 'x' */}
                           </button>
                      )}
                  </div>
                </div>
             );
            })
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-2">
        <label htmlFor="newComment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add a comment</label>
        <textarea
          id="newComment"
          name="newComment"
          rows="3"
          value={newCommentText}
          onChange={handleInputChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Type your comment here..."
        ></textarea>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Add Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskComments;