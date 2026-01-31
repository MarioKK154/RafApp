import React from 'react';

/**
 * A standardized loading spinner for the RafApp ecosystem.
 * Supports various sizes and optional status text.
 */
function LoadingSpinner({ text = "Loading...", size = "md" }) {
  // Define size-specific classes for the spinner and border thickness
  let spinnerSizeClasses = "h-8 w-8 border-4"; // Default: md
  
  if (size === "sm") {
    spinnerSizeClasses = "h-5 w-5 border-2";
  } else if (size === "lg") {
    spinnerSizeClasses = "h-12 w-12 border-4";
  } else if (size === "xl") {
    spinnerSizeClasses = "h-16 w-16 border-8";
  }

  return (
    <div 
      className="flex flex-col justify-center items-center space-y-3 py-8 w-full"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`
          ${spinnerSizeClasses} 
          animate-spin 
          rounded-full 
          border-solid 
          border-indigo-600 
          border-t-transparent 
          dark:border-indigo-400 
          dark:border-t-transparent
        `}
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
      
      {text && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

export default LoadingSpinner;