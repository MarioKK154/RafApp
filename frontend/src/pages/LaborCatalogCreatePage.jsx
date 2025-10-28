// frontend/src/pages/LaborCatalogCreatePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function LaborCatalogCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        description: '',
        default_unit_price: '',
        unit: 'hour'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axiosInstance.post('/labor-catalog/', {
                ...formData,
                default_unit_price: parseFloat(formData.default_unit_price)
            });
            toast.success('Labor item added to catalog!');
            navigate('/labor-catalog');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create item.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Add New Labor Item to Catalog</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div><label htmlFor="description">Description*</label><input type="text" name="description" id="description" required value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="default_unit_price">Default Price (ISK)*</label><input type="number" name="default_unit_price" id="default_unit_price" required value={formData.default_unit_price} onChange={handleChange} min="0" step="1" className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="unit">Unit*</label><input type="text" name="unit" id="unit" required value={formData.unit} onChange={handleChange} placeholder="e.g., hour, item, visit" className="mt-1 block w-full rounded-md"/></div>
                <div className="flex justify-end space-x-4">
                    <Link to="/labor-catalog" className="px-4 py-2 bg-gray-200 rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Item'}</button>
                </div>
            </form>
        </div>
    );
}
export default LaborCatalogCreatePage;