// frontend/src/pages/LaborCatalogEditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function LaborCatalogEditPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ description: '', default_unit_price: '', unit: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchItem = useCallback(() => {
        axiosInstance.get(`/labor-catalog/${itemId}`)
            .then(response => {
                setFormData({
                    description: response.data.description || '',
                    default_unit_price: response.data.default_unit_price || '',
                    unit: response.data.unit || '',
                });
            })
            .catch(() => toast.error('Failed to load item data.'))
            .finally(() => setIsLoading(false));
    }, [itemId]);

    useEffect(() => { fetchItem(); }, [fetchItem]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axiosInstance.put(`/labor-catalog/${itemId}`, {
                 ...formData,
                default_unit_price: parseFloat(formData.default_unit_price)
            });
            toast.success('Labor item updated!');
            navigate('/labor-catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update item.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) { return <LoadingSpinner text="Loading item data..." />; }

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Edit Labor Catalog Item</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <div><label htmlFor="description">Description*</label><input type="text" name="description" id="description" required value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="default_unit_price">Default Price (ISK)*</label><input type="number" name="default_unit_price" id="default_unit_price" required value={formData.default_unit_price} onChange={handleChange} min="0" step="1" className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="unit">Unit*</label><input type="text" name="unit" id="unit" required value={formData.unit} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div className="flex justify-end space-x-4">
                    <Link to="/labor-catalog" className="px-4 py-2 bg-gray-200 rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </div>
    );
}
export default LaborCatalogEditPage;