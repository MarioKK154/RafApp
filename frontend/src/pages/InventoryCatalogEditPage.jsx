// frontend/src/pages/InventoryCatalogEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function InventoryCatalogEditPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        shop_url_1: '',
        local_image_path: '',
    });
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchItemData = useCallback(() => {
        setIsLoadingData(true);
        axiosInstance.get(`/inventory/${itemId}`)
            .then(response => {
                const item = response.data;
                setFormData({
                    name: item.name ?? '',
                    description: item.description ?? '',
                    unit: item.unit ?? '',
                    shop_url_1: item.shop_url_1 ?? '',
                    local_image_path: item.local_image_path ?? '',
                });
            })
            .catch(() => toast.error('Failed to load material data.'))
            .finally(() => setIsLoadingData(false));
    }, [itemId]);

    useEffect(() => {
        fetchItemData();
    }, [fetchItemData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axiosInstance.put(`/inventory/${itemId}`, formData);
            toast.success('Material updated successfully!');
            navigate('/inventory/catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update material.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return <LoadingSpinner text="Loading material details..." />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Edit Catalog Material: {formData.name}</h1>
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
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InventoryCatalogEditPage;