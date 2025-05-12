// frontend/src/components/Modal.jsx
// Uncondensed and Manually Checked
import React from 'react';

function Modal({ isOpen, onClose, onConfirm, title, children }) {
    if (!isOpen) {
        return null;
    }

    return (
        // Backdrop
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out"
            onClick={onClose} // Close if backdrop is clicked
        >
            {/* Modal Content */}
            <div
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all duration-300 ease-in-out scale-100"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
            >
                {/* Modal Header */}
                {title && (
                    <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white mb-4">
                        {title}
                    </h3>
                )}

                {/* Modal Body (Content) */}
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                    {children}
                </div>

                {/* Modal Footer (Actions) */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        // Standardized delete button color
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Modal;