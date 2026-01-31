import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
    PlusIcon, 
    TrashIcon, 
    PencilIcon, 
    MagnifyingGlassIcon, 
    UserGroupIcon, 
    EnvelopeIcon, 
    PhoneIcon, 
    MapPinIcon,
    IdentificationIcon,
    UserIcon,
    BuildingOfficeIcon,
    ChevronRightIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

/**
 * Debounce hook to minimize unnecessary filtering computations.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

function CustomerListPage() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

    // Data States
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal & Search States
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Permissions: Admin or Superuser for CRM directory
    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    /**
     * Auth Guard: Protect the directory from unauthorized access.
     */
    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Global authentication required.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Access Denied: You do not have permission to view the client registry.");
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, authIsLoading, isAdmin, navigate]);

    const fetchCustomers = useCallback(async () => {
        if (!isAdmin) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get('/customers/', { params: { limit: 1000 } });
            setCustomers(response.data);
        } catch (err) {
            console.error("CRM Sync Error:", err);
            setError('Failed to synchronize with client database.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
    
    /**
     * Client-side search logic.
     */
    const filteredCustomers = useMemo(() => {
        if (!debouncedSearchTerm) return customers;
        const query = debouncedSearchTerm.toLowerCase();
        return customers.filter(cust =>
            cust.name.toLowerCase().includes(query) ||
            (cust.contact_person && cust.contact_person.toLowerCase().includes(query)) ||
            (cust.email && cust.email.toLowerCase().includes(query)) ||
            (cust.kennitala && cust.kennitala.includes(query))
        );
    }, [customers, debouncedSearchTerm]);

    const triggerDelete = (customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await axiosInstance.delete(`/customers/${customerToDelete.id}`);
            toast.success(`Client "${customerToDelete.name}" purged from registry.`);
            fetchCustomers();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to remove customer.');
        } finally {
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        }
    };

    if (authIsLoading || (isLoading && customers.length === 0)) {
        return <LoadingSpinner text="Accessing client registry..." />;
    }
    
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <UserGroupIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Customer Directory</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {isSuperuser ? "Global CRM Management" : `Verified clients for ${user?.tenant?.name}`}
                    </p>
                </div>

                <button 
                    onClick={() => navigate('/customers/new')}
                    className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition transform active:scale-95"
                >
                    <PlusIcon className="h-5 w-5 mr-1.5" /> 
                    Register New Client
                </button>
            </header>

            {/* Global Controls */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by Name, Kennitala, Contact or Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 h-12 rounded-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <UserGroupIcon className="h-4 w-4" /> {filteredCustomers.length} Records Found
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-bold">{error}</div>}

            {/* Customer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                    <div key={cust.id} className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                        
                        {/* Header: Name & SSN */}
                        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-700">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                {cust.name}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <IdentificationIcon className="h-3 w-3" />
                                SSN: {cust.kennitala || 'No SSN Recorded'}
                            </div>
                        </div>

                        {/* Body: Contact Details */}
                        <div className="p-6 flex-grow space-y-3">
                            <div className="flex items-start gap-3">
                                <UserIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Primary Contact</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{cust.contact_person || 'No Contact Listed'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <MapPinIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Address</p>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-tight">{cust.address || 'Location Unknown'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                {cust.phone_number && (
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                                        {cust.phone_number}
                                    </div>
                                )}
                                {cust.email && (
                                    <a href={`mailto:${cust.email}`} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate min-w-0">
                                        <EnvelopeIcon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{cust.email}</span>
                                    </a>
                                )}
                            </div>

                            {isSuperuser && cust.tenant && (
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-tighter">
                                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                                    Owner: {cust.tenant.name}
                                </div>
                            )}
                        </div>

                        {/* Footer: Actions */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => navigate(`/customers/edit/${cust.id}`)} 
                                    className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                    title="Edit Client Profile"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => triggerDelete(cust)} 
                                    className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition"
                                    title="Purge Record"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <Link 
                                to={`/customers/edit/${cust.id}`} 
                                className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:gap-2 transition-all"
                            >
                                Management <ChevronRightIcon className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <UserGroupIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Empty Registry</h3>
                        <p className="text-sm text-gray-500 mt-1">Initialize your first customer to start tracking commercial site project associations.</p>
                    </div>
                )}
            </div>

            {/* Deletion Confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Customer Record"
                message={`Are you sure you want to permanently delete "${customerToDelete?.name}"? This will remove their profile from all future project creation associations.`}
                confirmText="Purge Record"
                type="danger"
            />
        </div>
    );
}

export default CustomerListPage;