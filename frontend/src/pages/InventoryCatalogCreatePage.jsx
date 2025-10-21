// frontend/src/pages/InventoryCatalogCreatePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

function InventoryCatalogCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        shop_url_1: '',
        local_image_path: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This permission check can be more robust if needed
    const canManageCatalog = user && ['admin', 'project manager'].includes(user.role);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageCatalog) {
            toast.error("You don't have permission to perform this action.");
            return;
        }
        setIsSubmitting(true);
        try {
            await axiosInstance.post('/inventory/', formData);
            toast.success(`Material "${formData.name}" created in catalog!`);
            navigate('/inventory/catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create material.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Add New Material to Catalog</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded shadow-md">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">Material Name</label>
                    <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium">Unit (e.g., pcs, m, kg)</label>
                    <input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium">Description</label>
                    <textarea name="description" id="description" rows="3" value={formData.description} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"></textarea>
                </div>
                <div>
                    <label htmlFor="local_image_path" className="block text-sm font-medium">Local Image Path</label>
                    <input type="text" name="local_image_path" id="local_image_path" value={formData.local_image_path} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                 <div>
                    <label htmlFor="shop_url_1" className="block text-sm font-medium">Shop URL</label>
                    <input type="url" name="shop_url_1" id="shop_url_1" value={formData.shop_url_1} onChange={handleChange} disabled={isSubmitting} className="mt-1 block w-full rounded-md"/>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Link to="/inventory/catalog" className="px-4 py-2 border rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-indigo-600 rounded-md disabled:opacity-50">
                        {isSubmitting ? 'Saving...' : 'Add to Catalog'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InventoryCatalogCreatePage;