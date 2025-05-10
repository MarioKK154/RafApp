// frontend/src/App.jsx
// Uncondensed Version: Added react-toastify container
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// --- react-toastify Imports ---
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// --- End Imports ---

// Import Components
import Navbar from './components/Navbar';

// Import Page Components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectCreatePage from './pages/ProjectCreatePage';
import ProjectEditPage from './pages/ProjectEditPage';
import TasksListPage from './pages/TasksListPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskEditPage from './pages/TaskEditPage';
import InventoryListPage from './pages/InventoryListPage';
import InventoryCreatePage from './pages/InventoryCreatePage';
import InventoryEditPage from './pages/InventoryEditPage';
import TimeLogsPage from './pages/TimeLogsPage';
import UserListPage from './pages/UserListPage';
import UserCreatePage from './pages/UserCreatePage';
import UserEditPage from './pages/UserEditPage';
import ShoppingListPage from './pages/ShoppingListPage';
import GanttChartPage from './pages/GanttChartPage';
import NotFoundPage from './pages/NotFoundPage';


function App() {
    return (
        <>
            {/* Navbar stays at the top */}
            <Navbar />

            {/* --- Toast Container (Add Once) --- */}
            {/* Place it preferably high in the component tree but inside main div/fragment */}
            {/* Configure position, autoClose time (ms), etc. */}
            <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
             />
            {/* --- End Toast Container --- */}


            {/* Main content area */}
            <main className="pt-4">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/new" element={<ProjectCreatePage />} />
                    <Route path="/projects/edit/:projectId" element={<ProjectEditPage />} />
                    <Route path="/tasks" element={<TasksListPage />} />
                    <Route path="/tasks/new" element={<TaskCreatePage />} />
                    <Route path="/tasks/edit/:taskId" element={<TaskEditPage />} />
                    <Route path="/inventory" element={<InventoryListPage />} />
                    <Route path="/inventory/new" element={<InventoryCreatePage />} />
                    <Route path="/inventory/edit/:itemId" element={<InventoryEditPage />} />
                    <Route path="/timelogs" element={<TimeLogsPage />} />
                    <Route path="/users" element={<UserListPage />} />
                    <Route path="/users/new" element={<UserCreatePage />} />
                    <Route path="/users/edit/:userId" element={<UserEditPage />} />
                    <Route path="/shopping-list" element={<ShoppingListPage />} />
                    <Route path="/gantt" element={<GanttChartPage />} />

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;