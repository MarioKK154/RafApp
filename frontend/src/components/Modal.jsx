import React, { useEffect } from 'react';

/**
 * A flexible, general-purpose Modal component.
 * Used for forms, details, and standard actions across the RafApp.
 */
function Modal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children, 
    confirmText = "Confirm", 
    confirmColor = "indigo", // Supports 'indigo', 'red', 'green'
    showFooter = true 
}) {
    
    // Prevent scrolling of the background body when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    // Dynamic color mapping for the primary action button
    const colorClasses = {
        indigo: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
        red: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        green: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    };

    const selectedColorClass = colorClasses[confirmColor] || colorClasses.indigo;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop with Fade-in Effect */}
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-in-out"
                    onClick={onClose}
                    aria-hidden="true"
                ></div>

                {/* Vertical centering hack for Tailwind */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal Content */}
                <div
                    className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4 sm:p-8">
                        {/* Header */}
                        {title && (
                            <div className="mb-4">
                                <h3 
                                    className="text-xl font-bold leading-6 text-gray-900 dark:text-white" 
                                    id="modal-title"
                                >
                                    {title}
                                </h3>
                            </div>
                        )}

                        {/* Body */}
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            {children}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    {showFooter && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse gap-3">
                            <button
                                type="button"
                                onClick={onConfirm}
                                className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2.5 text-sm font-bold text-white transition-all sm:ml-0 sm:w-auto ${selectedColorClass} focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                            >
                                {confirmText}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-500 shadow-sm px-5 py-2.5 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Modal;