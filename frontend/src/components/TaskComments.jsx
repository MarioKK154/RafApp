import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { 
    ChatBubbleLeftRightIcon, 
    TrashIcon, 
    PaperAirplaneIcon,
    UserCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

const COMMENT_MODERATOR_ROLES = ["admin", "project manager", "team leader"];

function TaskComments({ taskId }) {
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, isAuthenticated } = useAuth();

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);

    /**
     * Fetches all comments for the given task.
     */
    const fetchComments = useCallback(() => {
        if (!taskId || !isAuthenticated) {
            setIsLoading(false);
            setComments([]);
            return;
        }
        setIsLoading(true);
        setError('');
        axiosInstance.get(`/tasks/${taskId}/comments/`)
            .then(response => {
                setComments(response.data);
            })
            .catch(error => {
                console.error('Fetch comments error:', error);
                setError('Failed to load comments registry.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [taskId, isAuthenticated]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleAddComment = async (event) => {
        event.preventDefault();
        const trimmedText = newCommentText.trim();
        
        if (!trimmedText) {
            toast.warn("Empty comments are not allowed.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.post(`/tasks/${taskId}/comments/`, { content: trimmedText });
            toast.success("Comment posted.");
            setNewCommentText('');
            fetchComments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to post comment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Determines if the current user has the authority to delete a specific comment.
     * Includes Superuser "God Mode" bypass.
     */
    const canDeleteComment = (comment) => {
        if (!user) return false;
        if (user.is_superuser) return true; // God Mode
        if (user.id === comment.author?.id) return true; // Author
        return COMMENT_MODERATOR_ROLES.includes(user.role); // Managerial Roles
    };

    const triggerDelete = (comment) => {
        if (!canDeleteComment(comment)) {
            toast.error("You do not have permission to moderate this comment.");
            return;
        }
        setCommentToDelete(comment);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            await axiosInstance.delete(`/comments/${commentToDelete.id}`);
            toast.success("Comment removed.");
            fetchComments();
        } catch (error) {
            console.error('Delete comment failed:', error);
            toast.error("Failed to delete comment.");
        } finally {
            setIsDeleteModalOpen(false);
            setCommentToDelete(null);
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Syncing discussion..." size="sm" />;
    }

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Discussion</h2>
            </div>

            {error && <div className="mb-4 text-xs text-red-500 font-medium">{error}</div>}

            {/* Comment Input Section */}
            {isAuthenticated && (
                <form onSubmit={handleAddComment} className="mb-8 group">
                    <div className="relative">
                        <textarea
                            rows="3"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            disabled={isSubmitting}
                            className="block w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                            placeholder="Add a progress update or internal note..."
                        ></textarea>
                        <div className="absolute right-3 bottom-3">
                            <button
                                type="submit"
                                disabled={isSubmitting || !newCommentText.trim()}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Posting...' : (
                                    <>
                                        Post <PaperAirplaneIcon className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Comments Thread */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 italic">No notes have been added to this task yet.</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div 
                            key={comment.id} 
                            className="relative flex gap-4 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50"
                        >
                            <div className="flex-shrink-0">
                                {comment.author?.profile_picture_url ? (
                                    <img 
                                        src={comment.author.profile_picture_url} 
                                        alt="" 
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                        <UserCircleIcon className="h-8 w-8" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {comment.author?.full_name || 'Anonymous'}
                                        </span>
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">
                                            {comment.author?.role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        
                                        {canDeleteComment(comment) && (
                                            <button
                                                onClick={() => triggerDelete(comment)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition"
                                                title="Delete note"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Standardized Deletion Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setCommentToDelete(null); }}
                onConfirm={confirmDeleteComment}
                title="Remove Comment"
                message="Are you sure you want to permanently delete this comment? This action cannot be undone."
                confirmText="Delete Note"
                type="danger"
            />
        </div>
    );
}

export default TaskComments;