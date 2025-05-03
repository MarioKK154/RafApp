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
    // Only fetch if user is Manager or Admin and auth check is done
    if (!authIsLoading && isAuthenticated && isManagerOrAdmin) {
      setIsLoading(true);
      setError('');
      axiosInstance.get('/users/') // Fetch all users
        .then(response => {
          setUsers(response.data);
        })
        .catch(err => {
          console.error("Error fetching users:", err);
          setError('Failed to load users.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!authIsLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login');
    } else if (!authIsLoading && !isManagerOrAdmin) {
        // If logged in but not Manager/Admin, show forbidden message
        setIsLoading(false);
        setError('You do not have permission to view this page.');
    }
  }, [isAuthenticated, authIsLoading, isManagerOrAdmin, navigate]);

  // Render Logic
  if (authIsLoading || isLoading) {
    return <div className="min-h-screen flex justify-center items-center"><p>Loading users...</p></div>;
  }

  // Handle insufficient permissions after loading check
  if (!isManagerOrAdmin) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
            <p className="text-red-600 mb-4">{error || 'Access Denied.'}</p>
            <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Home</Link>
        </div>
     );
  }

  // Handle other errors (like fetch failure)
  if (error) {
     return (
        <div className="container mx-auto p-6 text-center text-red-500">
            <p>{error}</p>
            {/* Optionally add a retry button */}
        </div>
     );
  }


  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Manage Users</h1>
        {/* TODO: Add "Create New User" button for Admins */}

      {users.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No users found.</p> // Should at least show the admin/pm
      ) : (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="py-3 px-6">ID</th>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">Email</th>
                        <th scope="col" className="py-3 px-6">Role</th>
                        <th scope="col" className="py-3 px-6">Status</th>
                        {isAdmin && <th scope="col" className="py-3 px-6">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {users.map(listUser => (
                        <tr key={listUser.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="py-4 px-6">{listUser.id}</td>
                            <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                {listUser.full_name || '-'}
                            </th>
                            <td className="py-4 px-6">{listUser.email}</td>
                            <td className="py-4 px-6">{listUser.role}</td>
                            <td className="py-4 px-6">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listUser.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                    {listUser.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            {/* Show Edit button only if current user is Admin */}
                            {isAdmin && (
                                <td className="py-4 px-6">
                                    <Link
                                        to={`/users/edit/${listUser.id}`}
                                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                        // Prevent admin from easily clicking edit on themselves? (Optional)
                                        // onClick={(e) => { if (listUser.id === user.id) e.preventDefault();}}
                                    >
                                        Edit
                                    </Link>
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