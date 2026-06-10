import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
    CheckCircleIcon, 
    LockClosedIcon, 
    TrashIcon, 
    PlusIcon, 
    LockOpenIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

function TaskChecklists({ taskId, taskAssigneeId }) {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    
    const [items, setItems] = useState([]);
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemPrivate, setNewItemPrivate] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPrivileged = currentUser?.is_superuser || 
                         currentUser?.id === taskAssigneeId || 
                         ['admin', 'project manager'].includes(currentUser?.role);

    const fetchItems = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`/tasks/${taskId}/checklists/`);
            setItems(res.data);
        } catch (error) {
            console.error('Failed to fetch checklists', error);
        } finally {
            setIsLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemContent.trim()) return;
        setIsSubmitting(true);
        try {
            await axiosInstance.post(`/tasks/${taskId}/checklists/`, {
                content: newItemContent.trim(),
                is_private: newItemPrivate
            });
            setNewItemContent('');
            fetchItems();
            toast.success(t('item_added', { defaultValue: 'Checklist item added.' }));
        } catch (error) {
            toast.error(t('action_failed', { defaultValue: 'Failed to add item.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleComplete = async (item) => {
        try {
            await axiosInstance.put(`/tasks/${taskId}/checklists/${item.id}`, {
                is_completed: !item.is_completed
            });
            fetchItems();
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error(t('access_denied', { defaultValue: 'Access denied.' }));
            } else {
                toast.error(t('action_failed', { defaultValue: 'Action failed.' }));
            }
        }
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm(t('confirm_delete', { defaultValue: 'Are you sure?' }))) return;
        try {
            await axiosInstance.delete(`/tasks/${taskId}/checklists/${itemId}`);
            fetchItems();
            toast.success(t('item_deleted', { defaultValue: 'Item deleted.' }));
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error(t('access_denied', { defaultValue: 'Access denied.' }));
            } else {
                toast.error(t('delete_failed', { defaultValue: 'Failed to delete.' }));
            }
        }
    };

    if (isLoading) return <div className="text-sm text-gray-500 animate-pulse p-4">Loading checklists...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-indigo-500" />
                    {t('checklists', { defaultValue: 'Task Checklists' })}
                </h3>
            </div>

            {items.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic font-bold">
                    {t('no_checklists', { defaultValue: 'No checklists added yet.' })}
                </p>
            ) : (
                <ul className="space-y-3">
                    {items.map(item => (
                        <li key={item.id} className="flex items-start justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 group transition">
                            <div className="flex items-start gap-3 flex-1">
                                <button 
                                    onClick={() => handleToggleComplete(item)}
                                    className="mt-0.5 flex-shrink-0 text-indigo-500 hover:text-indigo-600 transition"
                                >
                                    {item.is_completed ? (
                                        <CheckCircleIconSolid className="h-6 w-6" />
                                    ) : (
                                        <CheckCircleIcon className="h-6 w-6" />
                                    )}
                                </button>
                                <div className={`text-sm font-medium ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {item.content}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                {item.is_private && (
                                    <span className="text-xs flex items-center gap-1 font-bold tracking-wider text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md uppercase">
                                        <LockClosedIcon className="h-3 w-3" /> Private
                                    </span>
                                )}
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isPrivileged && (
                <form onSubmit={handleAddItem} className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            value={newItemContent}
                            onChange={(e) => setNewItemContent(e.target.value)}
                            placeholder={t('add_checklist_item', { defaultValue: 'Add a new checklist item...' })}
                            className="modern-input text-sm font-medium"
                            disabled={isSubmitting}
                        />
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setNewItemPrivate(!newItemPrivate)}
                                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition ${
                                    newItemPrivate 
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {newItemPrivate ? <LockClosedIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
                                {newItemPrivate ? 'Private (Assignee only)' : 'Public'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !newItemContent.trim()}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition disabled:opacity-50"
                            >
                                <PlusIcon className="h-4 w-4" />
                                {t('add', { defaultValue: 'Add' })}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}

export default TaskChecklists;
