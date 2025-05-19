// frontend/src/components/LoadingSpinner.jsx
// Uncondensed and Manually Checked
import React from 'react';

function LoadingSpinner({ text = "Loading...", size = "md" }) {
  let spinnerSizeClasses = "h-8 w-8"; // Default medium size
  if (size === "sm") {
    spinnerSizeClasses = "h-5 w-5";
  } else if (size === "lg") {
    spinnerSizeClasses = "h-12 w-12";
  }

  return (
    <div className="flex flex-col justify-center items-center space-y-2 py-4">
      <div
        className={`${spinnerSizeClasses} animate-spin rounded-full border-4 border-solid border-indigo-600 border-t-transparent dark:border-indigo-400 dark:border-t-transparent`}
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;