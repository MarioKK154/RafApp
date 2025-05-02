// frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-red-50 dark:bg-red-900">
      <h1 className="text-4xl font-bold text-red-700 dark:text-red-300 mb-4">
        404 - Not Found
      </h1>
      <p className="text-red-600 dark:text-red-400 mb-6">
        Oops! The page you are looking for does not exist.
      </p>
      <Link
        to="/" // Link back to the home page
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
      >
        Go Back Home
      </Link>
    </div>
  );
}

export default NotFoundPage;