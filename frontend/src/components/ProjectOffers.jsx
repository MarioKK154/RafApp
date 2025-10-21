// frontend/src/components/ProjectOffers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { PlusIcon } from '@heroicons/react/24/solid';

const formatCurrencyISK = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(value);
};

function ProjectOffers({ projectId }) {
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const canManageOffers = user && ['admin', 'project manager'].includes(user.role);

    const fetchOffers = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/offers/project/${projectId}`);
            setOffers(response.data);
        } catch (err) {
            setError('Failed to load offers for this project.');
            toast.error('Failed to load offers.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const handleCreateOffer = async () => {
        try {
            const response = await axiosInstance.post('/offers/', { project_id: projectId });
            toast.success('New draft offer created!');
            // Navigate directly to the new offer's page
            navigate(`/offers/${response.data.id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create offer.');
        }
    };

    if (isLoading) {
        return <LoadingSpinner text="Loading Offers..." />;
    }
    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <div className="mt-8 pt-6 border-t dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Client Offers</h2>
                {canManageOffers && (
                    <button
                        onClick={handleCreateOffer}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <PlusIcon className="h-5 w-5 mr-1" /> Create New Offer
                    </button>
                )}
            </div>

            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-6">Offer #</th>
                            <th className="py-3 px-6">Title</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Issue Date</th>
                            <th className="py-3 px-6 text-right">Total Amount</th>
                            <th className="py-3 px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offers.map(offer => (
                            <tr key={offer.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-4 px-6 font-mono">{offer.offer_number}</td>
                                <td className="py-4 px-6 font-medium">{offer.title}</td>
                                <td className="py-4 px-6">{offer.status}</td>
                                <td className="py-4 px-6">{new Date(offer.issue_date).toLocaleDateString()}</td>
                                <td className="py-4 px-6 text-right">{formatCurrencyISK(offer.total_amount)}</td>
                                <td className="py-4 px-6">
                                    <Link to={`/offers/${offer.id}`} className="text-blue-600 hover:underline">View/Edit</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {offers.length === 0 && <p className="p-4 text-center">No offers have been created for this project yet.</p>}
            </div>
        </div>
    );
}

export default ProjectOffers;