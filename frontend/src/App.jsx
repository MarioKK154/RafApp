// frontend/src/App.jsx
import React from 'react';
// Import routing components
import { Routes, Route, Link } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <>
      {/* Optional: Basic Navigation (can be moved to a dedicated Navbar component later) */}
      {/* <nav className="bg-gray-200 dark:bg-gray-700 p-4 text-center">
        <Link to="/" className="mx-2 text-blue-600 dark:text-blue-300 hover:underline">Home</Link>
        <Link to="/login" className="mx-2 text-blue-600 dark:text-blue-300 hover:underline">Login</Link>
        <Link to="/register" className="mx-2 text-blue-600 dark:text-blue-300 hover:underline">Register</Link>
      </nav> */}

      {/* Main content area where routes are rendered */}
      <main>
        <Routes>
          {/* Define routes: path maps to element (component) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Catch-all route for 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;