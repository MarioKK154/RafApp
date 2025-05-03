// frontend/src/pages/UserListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

function UserListPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

  // Determine roles
  const isManagerOrAdmin = user && ['admin', 'project manager'].includes(user.role);
  const isAdmin = user && user.role === 'admin';

  // Fetch users function
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && isManagerOrAdmin) {
      setIsLoading(true); setError('');
      axiosInstance.get('/users/')
        .then(response => { setUsers(response.data); })
        .catch(err => { console.error("Error fetching users:", err); setError('Failed to load users.'); })
        .finally(() => { setIsLoading(false); });
    } else if (!authIsLoading && !isAuthenticated) { navigate('/login'); }
    else if (!authIsLoading && !isManagerOrAdmin) { setIsLoading(false); setError('You do not have permission to view this page.'); }
  }, [isAuthenticated, authIsLoading, isManagerOrAdmin, navigate]); // Added navigate

  // Render Logic
  if (authIsLoading || isLoading) { /* ... loading ... */ }
  if (!isManagerOrAdmin) { /* ... access denied ... */ }
  if (error) { /* ... fetch error ... */ }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Manage Users</h1>
        {/* --- RBAC: Show Create Button only for Admin --- */}
        {isAdmin && (
          <Link
            to="/users/new" // Link to the new user creation page
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition duration-200 text-sm md:text-base"
          >
            Create New User
          </Link>
        )}
      </div>

      {/* Error Display */}
      {error && <p className="text-red-500 ...">{error}</p>}

      {/* User Table */}
      {users.length === 0 && !error ? ( <p>...</p> ) : (
        <div className="overflow-x-auto ...">
            <table className="w-full ...">
                <thead className="...">
                    <tr>
                        <th scope="col" className="...">ID</th>
                        <th scope="col" className="...">Name</th>
                        <th scope="col" className="...">Email</th>
                        <th scope="col" className="...">Role</th>
                        <th scope="col" className="...">Status</th>
                        {isAdmin && <th scope="col" className="...">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {users.map(listUser => (
                        <tr key={listUser.id} className="...">
                            <td className="...">{listUser.id}</td>
                            <th scope="row" className="..."> {listUser.full_name || '-'} </th>
                            <td className="...">{listUser.email}</td>
                            <td className="...">{listUser.role}</td>
                            <td className="..."> <span className={`... ${listUser.is_active ? 'bg-green-100 text-green-800 ...' : 'bg-red-100 text-red-800 ...'}`}> {listUser.is_active ? 'Active' : 'Inactive'} </span> </td>
                            {isAdmin && (
                                <td className="py-4 px-6">
                                    <Link to={`/users/edit/${listUser.id}`} className="..."> Edit </Link>
                                    {/* TODO: Add Delete User button/logic */}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}

export default UserListPage;