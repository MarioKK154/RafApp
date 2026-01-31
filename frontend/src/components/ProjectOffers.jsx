import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { 
    PlusIcon, 
    BanknotesIcon, 
    DocumentTextIcon, 
    ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';

/**
 * Formats values to Icelandic Króna (ISK).
 */
const formatCurrencyISK = (value) => {
    if (value === null || value === undefined) return '0 kr.';
    return new Intl.NumberFormat('is-IS', { 
        style: 'currency', 
        currency: 'ISK', 
        maximumFractionDigits: 0 
    }).format(value);
};

function ProjectOffers({ projectId }) {
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    // Permissions: Superadmin has global root access to manage commercial offers
    const isSuperuser = user?.is_superuser;
    const canManageOffers = user && (['admin', 'project manager'].includes(user.role) || isSuperuser);

    const fetchOffers = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/offers/project/${projectId}`);
            setOffers(response.data);
        } catch (err) {
            console.error("Fetch offers error:", err);
            setError('Failed to load commercial offers.');
            toast.error('Could not sync offer database.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const handleCreateOffer = async () => {
        try {
            // Backend will associate the offer with the user's tenant automatically
            const response = await axiosInstance.post('/offers/', { project_id: projectId });
            toast.success('New draft offer generated!');
            navigate(`/offers/${response.data.id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create offer.');
        }
    };

    /**
     * Visual status indicator logic.
     */
    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'accepted': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        }
    };

    if (isLoading) return <LoadingSpinner text="Retrieving financial documents..." size="sm" />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Commercial Offers</h2>
                </div>
                
                {canManageOffers && (
                    <button
                        onClick={handleCreateOffer}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-1.5" /> 
                        Create New Offer
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Offers Table */}
            <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 font-bold">
                            <tr>
                                <th className="py-4 px-6">Offer #</th>
                                <th className="py-4 px-6">Description</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Issue Date</th>
                                <th className="py-4 px-6 text-right">Net Amount</th>
                                <th className="py-4 px-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {offers.length > 0 ? offers.map(offer => (
                                <tr key={offer.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        {offer.offer_number || `OFFER-${offer.id}`}
                                    </td>
                                    <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                                        {offer.title || 'Untitled Proposal'}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(offer.status)}`}>
                                            {offer.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-gray-500">
                                        {new Date(offer.issue_date).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-6 text-right font-black text-gray-900 dark:text-white">
                                        {formatCurrencyISK(offer.total_amount)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <Link 
                                            to={`/offers/${offer.id}`} 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                                        >
                                            Manage <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <DocumentTextIcon className="h-10 w-10 text-gray-200 mb-2" />
                                            <p className="text-sm text-gray-500 italic">No commercial proposals registered.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ProjectOffers;