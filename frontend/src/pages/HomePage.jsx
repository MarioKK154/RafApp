// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-50 dark:bg-gray-800">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        RafApp Dashboard (Placeholder)
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Welcome! You are logged in (conceptually).
      </p>
      {/* Example Link (will be replaced by logout later) */}
      <Link
        to="/login"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        Go to Login (temp)
      </Link>
    </div>
  );
}

export default HomePage;