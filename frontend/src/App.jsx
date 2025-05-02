// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage'; // Import Create Page
import ProjectEditPage from './pages/ProjectEditPage';   // Import Edit Page
import NotFoundPage from './pages/NotFoundPage';

// TODO: Add components for Tasks, Inventory later
// TODO: Implement ProtectedRoute component

function App() {
  return (
    <>
      {/* Basic Navbar Placeholder - Replace with dedicated component later */}
      <nav className="bg-gray-100 dark:bg-gray-700 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-lg font-bold text-indigo-600 dark:text-indigo-300">RafApp</Link>
            <div>
                {/* Links visible to all */}
                <Link to="/projects" className="mx-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Projects</Link>
                 {/* TODO: Add links to Tasks, Inventory etc. */}

                {/* TODO: Add conditional links for Login/Register/Logout based on auth state */}
                 <Link to="/login" className="mx-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Login</Link>
            </div>
        </div>
       </nav>

      {/* Main content area where routes are rendered */}
      <main className="mt-4"> {/* Add some margin top */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes (currently protected inside component logic) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectCreatePage />} /> {/* Add route for create */}
          <Route path="/projects/edit/:projectId" element={<ProjectEditPage />} /> {/* Add route for edit */}
          {/* TODO: Add routes for Tasks, Inventory */}


          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;