// frontend/src/pages/ShopEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function ShopEditPage() {
    const { shopId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', address: '', contact_person: '', phone_number: '', email: '', website: '', notes: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchShop = useCallback(() => {
        axiosInstance.get(`/shops/${shopId}`)
            .then(response => {
                const shop = response.data;
                setFormData({
                    name: shop.name || '',
                    address: shop.address || '',
                    contact_person: shop.contact_person || '',
                    phone_number: shop.phone_number || '',
                    email: shop.email || '',
                    website: shop.website || '',
                    notes: shop.notes || '',
                });
            })
            .catch(() => toast.error('Failed to load shop data.'))
            .finally(() => setIsLoading(false));
    }, [shopId]);

    useEffect(() => { fetchShop(); }, [fetchShop]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axiosInstance.put(`/shops/${shopId}`, formData);
            toast.success('Shop updated successfully!');
            navigate('/shops');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update shop.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading shop data..." />; }

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Edit Shop</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div><label htmlFor="name">Shop Name</label><input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="address">Address</label><input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="contact_person">Contact Person</label><input type="text" name="contact_person" id="contact_person" value={formData.contact_person} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="phone_number">Phone Number</label><input type="tel" name="phone_number" id="phone_number" value={formData.phone_number} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="email">Email</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="website">Website</label><input type="url" name="website" id="website" value={formData.website} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="notes">Notes</label><textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md"></textarea></div>
                <div className="flex justify-end space-x-4">
                    <Link to="/shops" className="px-4 py-2 bg-gray-200 rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </div>
    );
}

export default ShopEditPage;