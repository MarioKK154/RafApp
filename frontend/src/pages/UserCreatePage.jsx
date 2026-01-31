import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// Role options - "employee" removed as requested
const ROLES_LIST = ['admin', 'project manager', 'team leader', 'electrician', 'accountant'];

function UserCreatePage() {
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated, isLoading: authIsLoading } = useAuth();
    
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
        employee_id: '',
        kennitala: '',
        phone_number: '',
        location: '',
        role: ROLES_LIST[3], // Default to Electrician
        is_active: true,
        is_superuser: false,
        tenant_id: '', // Used by Superadmins to assign users to companies
    });

    const [tenants, setTenants] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSuperuser = currentUser?.is_superuser;
    const isAdmin = currentUser?.role === 'admin' || isSuperuser;

    // Fetch tenants list for superuser selection
    const fetchTenants = useCallback(async () => {
        if (isSuperuser) {
            try {
                const response = await axiosInstance.get('/tenants/');
                setTenants(response.data);
            } catch (err) {
                toast.error("Failed to load tenants list.");
            }
        }
    }, [isSuperuser]);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("You must be logged in to access this page.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: Admin permissions required.");
                navigate('/', { replace: true });
            } else {
                fetchTenants();
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate, fetchTenants]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isAdmin) {
            toast.error("You do not have permission to create users.");
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }

        setError('');
        setIsSubmitting(true);

        const dataToSend = {
            email: formData.email,
            full_name: formData.full_name || null,
            password: formData.password,
            employee_id: formData.employee_id || null,
            kennitala: formData.kennitala || null,
            phone_number: formData.phone_number || null,
            location: formData.location || null,
            role: formData.role,
            is_active: formData.is_active,
            is_superuser: formData.is_superuser,
        };

        // If Superadmin, include the selected tenant_id
        if (isSuperuser && formData.tenant_id) {
            dataToSend.tenant_id = parseInt(formData.tenant_id, 10);
        }

        try {
            const response = await axiosInstance.post('/users/', dataToSend);
            toast.success(`User "${response.data.full_name || response.data.email}" created successfully!`);
            navigate('/users');
        } catch (err) {
            console.error("User creation error:", err);
            const errorMsg = err.response?.data?.detail || 'Failed to create user.';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authIsLoading) {
        return <LoadingSpinner text="Authenticating..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New User</h1>
                
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700 space-y-4">
                    
                    {/* Superadmin Tenant Selection */}
                    {isSuperuser && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Assign to Tenant <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="tenant_id"
                                required={isSuperuser}
                                value={formData.tenant_id}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">-- Select Company --</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password *</label>
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="Min 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <hr className="my-4 border-gray-200 dark:border-gray-700" />
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Employee Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label>
                            <input
                                type="text"
                                name="employee_id"
                                value={formData.employee_id}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kennitala</label>
                            <input
                                type="text"
                                name="kennitala"
                                value={formData.kennitala}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                            <input
                                type="tel"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Role *</label>
                        <select
                            name="role"
                            required
                            value={formData.role}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {ROLES_LIST.map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col space-y-2 pt-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Active User (Able to log in)
                            </label>
                        </div>

                        {isSuperuser && (
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_superuser"
                                    id="is_superuser"
                                    checked={formData.is_superuser}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_superuser" className="ml-2 block text-sm font-bold text-red-600">
                                    Superuser (Global Root Access)
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                        <Link to="/users" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UserCreatePage;