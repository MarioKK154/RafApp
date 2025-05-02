// frontend/src/pages/ProjectsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // To check authentication
import axiosInstance from '../api/axiosInstance'; // Use our configured instance
import { Link } from 'react-router-dom';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, isLoading: authIsLoading } = useAuth(); // Get auth state

  useEffect(() => {
    // Only fetch projects if the user is authenticated and auth check is complete
    if (!authIsLoading && isAuthenticated) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/projects/') // Use instance, interceptor adds token
        .then(response => {
          setProjects(response.data);
        })
        .catch(err => {
          console.error("Error fetching projects:", err);
          setError('Failed to load projects.');
          // Error could be 401 if token became invalid, or server error
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      // If user is not authenticated and auth check is done, stop loading
      setIsLoading(false);
      setError('You must be logged in to view projects.');
    }
     // Re-run effect if authentication status changes
  }, [isAuthenticated, authIsLoading]);

  // Show loading states (initial auth check or data fetching)
  if (authIsLoading || isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><p>Loading projects...</p></div>;
  }

  // Show error or login prompt if not authenticated
  if (!isAuthenticated) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Please log in to view projects.'}</p>
            <Link
                to="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
            >
                Go to Login
            </Link>
        </div>
     )
  }

  // Show projects list or error message
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      {error && <p className="text-red-500">{error}</p>}
      {projects.length === 0 && !error ? (
        <p>No projects found. Create one?</p> // TODO: Add create project button/link
      ) : (
        <ul className="space-y-2">
          {projects.map(project => (
            <li key={project.id} className="p-2 border rounded dark:border-gray-600">
              <h2 className="text-lg font-semibold">{project.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
              <p className="text-xs text-gray-500">Status: {project.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectsPage;