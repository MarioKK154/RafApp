// frontend/src/pages/CarCreatePage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';

function CarCreatePage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        make: '', model: '', year: '', license_plate: '', vin: '',
        purchase_date: '', last_oil_change_km: '', next_oil_change_due_km: '',
        service_needed: false, service_notes: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = {
            ...formData,
            year: formData.year ? parseInt(formData.year, 10) : null,
            purchase_date: formData.purchase_date || null,
            last_oil_change_km: formData.last_oil_change_km ? parseInt(formData.last_oil_change_km, 10) : null,
            next_oil_change_due_km: formData.next_oil_change_due_km ? parseInt(formData.next_oil_change_due_km, 10) : null,
        };
        try {
            const response = await axiosInstance.post('/cars/', payload);
            if (selectedFile) {
                const imageFormData = new FormData();
                imageFormData.append('file', selectedFile);
                await axiosInstance.post(`/cars/${response.data.id}/image`, imageFormData);
            }
            toast.success('Car added successfully!');
            navigate('/cars');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to add car.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Add New Car to Fleet</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="make">Make</label><input type="text" name="make" id="make" required value={formData.make} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                    <div><label htmlFor="model">Model</label><input type="text" name="model" id="model" required value={formData.model} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="license_plate">License Plate</label><input type="text" name="license_plate" id="license_plate" required value={formData.license_plate} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                    <div><label htmlFor="year">Year Manufactured</label><input type="number" name="year" id="year" value={formData.year} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                </div>
                <div><label htmlFor="vin">VIN</label><input type="text" name="vin" id="vin" value={formData.vin} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <div><label htmlFor="purchase_date">Purchase Date</label><input type="date" name="purchase_date" id="purchase_date" value={formData.purchase_date} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                <hr/>
                <h3 className="text-lg font-medium">Service Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="last_oil_change_km">Last Oil Change (km)</label><input type="number" name="last_oil_change_km" id="last_oil_change_km" value={formData.last_oil_change_km} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                    <div><label htmlFor="next_oil_change_due_km">Next Oil Change Due (km)</label><input type="number" name="next_oil_change_due_km" id="next_oil_change_due_km" value={formData.next_oil_change_due_km} onChange={handleChange} className="mt-1 block w-full rounded-md"/></div>
                </div>
                 <div className="flex items-center"><input type="checkbox" name="service_needed" id="service_needed" checked={formData.service_needed} onChange={handleChange} className="h-4 w-4 rounded"/><label htmlFor="service_needed" className="ml-2">Service Needed?</label></div>
                <div><label htmlFor="service_notes">Service Notes</label><textarea name="service_notes" id="service_notes" value={formData.service_notes} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md"></textarea></div>
                <hr/>
                <div><label htmlFor="image">Car Image</label><input type="file" name="image" id="image" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-sm" /></div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/cars" className="px-4 py-2 bg-gray-200 rounded-md">Cancel</Link>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">{isSaving ? 'Saving...' : 'Add Car'}</button>
                </div>
            </form>
        </div>
    );
}
export default CarCreatePage;