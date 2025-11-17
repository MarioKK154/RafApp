// frontend/src/pages/CustomerCreatePage.jsx
import React, { useState, useEffect } from 'react'; // <-- 1. ADD useEffect
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; // <-- 2. IMPORT useAuth
import LoadingSpinner from '../components/LoadingSpinner'; // <-- 3. IMPORT LoadingSpinner

function CustomerCreatePage() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth(); // <-- 4. GET AUTH STATE
    const [formData, setFormData] = useState({
        name: '', address: '', kennitala: '', contact_person: '', phone_number: '', email: '', notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- 5. ADD PERMISSION VARIABLE AND AUTH GUARD ---
    const isAdmin = user && (user.role === 'admin' || user.is_superuser);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("You must be logged in.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: You do not have permission.");
                navigate('/customers', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);
    // --- END AUTH GUARD ---


    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        // 6. Check permission on submit
        if (!isAdmin) {
            toast.error("You do not have permission to perform this action.");
            return;
        }
        setIsSaving(true);
        try {
            await axiosInstance.post('/customers/', formData);
            toast.success('Customer created successfully!');
            navigate('/customers');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create customer.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- 7. ADD LOADING/ACCESS DENIED STATES ---
    if (authIsLoading) {
        return <LoadingSpinner text="Loading..." />;
    }
    
    if (!isAdmin) {
        return <div className="container mx-auto p-6 text-center text-red-500"><p>Access Denied. Redirecting...</p></div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div><label htmlFor="name" className="block text-sm font-medium">Customer Name*</label><input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="kennitala" className="block text-sm font-medium">Kennitala (SSN)</label><input type="text" name="kennitala" id="kennitala" value={formData.kennitala} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="address" className="block text-sm font-medium">Address</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="contact_person" className="block text-sm font-medium">Contact Person</label><input type="text" name="contact_person" id="contact_person" value={formData.contact_person} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="phone_number" className="block text-sm font-medium">Phone Number</label><input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="email" className="block text-sm font-medium">Email</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="notes" className="block text-sm font-medium">Notes</label><textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md"></textarea></div>
                <div className="flex justify-end space-x-4">
                    <Link to="/customers" className="px-4 py-2 bg-gray-200 rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Customer'}</button>
                </div>
            </form>
        </div>
    );
}
export default CustomerCreatePage;