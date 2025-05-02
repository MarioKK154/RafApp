// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectEditPage from './pages/ProjectEditPage';
import TasksListPage from './pages/TasksListPage';       // Import Task List Page
import TaskCreatePage from './pages/TaskCreatePage';     // Import Task Create Page
import TaskEditPage from './pages/TaskEditPage';       // Import Task Edit Page
// TODO: Import Inventory Pages
import NotFoundPage from './pages/NotFoundPage';

function App() {
  // TODO: Replace placeholder Navbar with a real one that uses AuthContext
  return (
    <>
      <nav className="bg-gray-100 dark:bg-gray-700 shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-lg font-bold text-indigo-600 dark:text-indigo-300">RafApp</Link>
            <div>
                <Link to="/projects" className="mx-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Projects</Link>
                <Link to="/tasks" className="mx-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Tasks</Link> {/* Add Tasks Link */}
                 {/* TODO: Add Inventory Link */}
                 <Link to="/login" className="mx-2 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300">Login</Link> {/* TODO: Conditional Login/Logout */}
            </div>
        </div>
       </nav>

      <main className="mt-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes (currently protected inside component logic) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectCreatePage />} />
          <Route path="/projects/edit/:projectId" element={<ProjectEditPage />} />

          <Route path="/tasks" element={<TasksListPage />} />           {/* Add Task List Route */}
          <Route path="/tasks/new" element={<TaskCreatePage />} />      {/* Add Task Create Route */}
          <Route path="/tasks/edit/:taskId" element={<TaskEditPage />} /> {/* Add Task Edit Route */}

          {/* TODO: Add routes for Inventory */}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;