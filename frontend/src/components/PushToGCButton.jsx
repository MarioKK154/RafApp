import React, { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';

/**
 * A generic button to push data to configured GC integrations (Procore, ACC, Ajour).
 * 
 * @param {string} entityType - 'task', 'timelog', or 'material'
 * @param {number} entityId - The DB ID of the entity to push
 * @param {string} buttonLabel - Optional custom label for the button
 */
function PushToGCButton({ entityType, entityId, buttonLabel = 'Export to GC' }) {
    const [isPushing, setIsPushing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handlePush = async (provider) => {
        setShowMenu(false);
        setIsPushing(true);
        const toastId = toast.loading(`Pushing ${entityType} to ${provider}...`);
        
        try {
            const res = await axiosInstance.post('/integrations/push', {
                entity_type: entityType,
                entity_id: entityId,
                provider: provider
            });
            
            toast.update(toastId, {
                render: `Successfully pushed to ${provider}!`,
                type: "success",
                isLoading: false,
                autoClose: 3000
            });
            console.log("Push Result:", res.data);
            
        } catch (error) {
            console.error("Push Error", error);
            const msg = error.response?.data?.detail || `Failed to push to ${provider}`;
            toast.update(toastId, {
                render: msg,
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
        } finally {
            setIsPushing(false);
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                disabled={isPushing}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-sm ring-1 ring-inset ring-indigo-300 dark:ring-indigo-700 disabled:opacity-50 transition-colors"
            >
                <CloudArrowUpIcon className="h-4 w-4" />
                {isPushing ? 'Pushing...' : buttonLabel}
            </button>

            {showMenu && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={() => handlePush('PROCORE')}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Push to Procore
                        </button>
                        <button
                            onClick={() => handlePush('ACC')}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Push to Autodesk Build
                        </button>
                        <button
                            onClick={() => handlePush('AJOUR')}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Push to Ajour System
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PushToGCButton;
