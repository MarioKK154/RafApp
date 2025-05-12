// frontend/src/pages/LoginPage.jsx
// Uncondensed and Refactored with Single Return
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // Changed to axiosInstance
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // For form-specific errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authIsLoading } = useAuth();

  // Redirect if already authenticated and auth check is done
  useEffect(() => {
    if (!authIsLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authIsLoading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const loginData = new URLSearchParams();
    loginData.append('username', email);
    loginData.append('password', password);

    try {
      const response = await axiosInstance.post( // Changed from global axios
        '/auth/token', // Using relative path from axiosInstance baseURL
        loginData,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const accessToken = response.data.access_token;
      login(accessToken); // AuthContext handles setting token and fetching user
      toast.success('Login successful!');
      navigate('/'); // Navigate after context handles login
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      setError(errorMsg); // Set local form error
      toast.error(errorMsg);
      setIsSubmitting(false); // Re-enable form on error
    }
  };

  // --- Render Logic ---

  if (authIsLoading) {
    return (
        <div className="min-h-screen flex justify-center items-center">
            <p className="text-xl text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
    );
  }
  // If already authenticated (and not loading), redirect handled by useEffect,
  // but can return null or a message to prevent form flash.
  if (isAuthenticated) {
      return null; // Or a "Redirecting..." message
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Login to RafApp
        </h1>
        {/* Display form-specific error message */}
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
            <input
              id="email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              id="password" name="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="********"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
export default LoginPage;