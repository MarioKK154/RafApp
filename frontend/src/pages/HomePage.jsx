// frontend/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  console.log('HomePage rendering -> isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6 bg-gray-100 dark:bg-gray-800">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        RafApp Dashboard
      </h1>

      {isAuthenticated && user ? (
        // Content shown when user IS authenticated
        <div className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, {user.full_name || user.email}!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
             (Role: {user.role})
          </p>
          {/* Link to Projects Page */}
          <Link
            to="/projects"
            className="block w-full max-w-xs mx-auto mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200"
          >
            View Projects
          </Link>
          <button
            onClick={logout}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition duration-200"
          >
            Logout
          </button>
        </div>
      ) : (
        // Content shown when user IS NOT authenticated
        <div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access your projects and tasks.
          </p>
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
          >
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomePage;