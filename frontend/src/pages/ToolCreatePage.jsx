// frontend/src/pages/ToolCreatePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function ToolCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', brand: '', model: '', description: '', serial_number: '', purchase_date: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = { ...formData, purchase_date: formData.purchase_date || null };
        try {
            const response = await axiosInstance.post('/tools/', payload);
            const newToolId = response.data.id;
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/tools/${newToolId}/image`, imageFormData);
            }
            toast.success('Tool created successfully!');
            navigate('/tools');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create tool.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-6">Add New Tool</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium">Tool Name</label>
                    <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="brand">Brand</label>
                        <input type="text" name="brand" id="brand" value={formData.brand} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="model">Model</label>
                        <input type="text" name="model" id="model" value={formData.model} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm" />
                    </div>
                </div>
                <div>
                    <label htmlFor="description">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md shadow-sm"></textarea>
                </div>
                <div>
                    <label htmlFor="serial_number">Serial Number</label>
                    <input type="text" name="serial_number" id="serial_number" value={formData.serial_number} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="purchase_date">Purchase Date</label>
                    <input type="date" name="purchase_date" id="purchase_date" value={formData.purchase_date} onChange={handleChange} className="mt-1 block w-full rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="image">Tool Image</label>
                    <input type="file" name="image" id="image" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-sm" />
                </div>
                <div className="flex justify-end space-x-4">
                    <Link to="/tools" className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Add Tool'}
                    </button>
                </div>
            </form>
        </div>
    );
}
export default ToolCreatePage;