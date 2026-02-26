import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    InformationCircleIcon,
    HashtagIcon
} from '@heroicons/react/24/outline';

/**
 * Technical Protocol: Debounce search to minimize registry re-renders.
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const isSuperuser = user?.is_superuser;
    const isAdmin = user && (user.role === 'admin' || isSuperuser);

    useEffect(() => {
        if (!authIsLoading) {
            if (!isAuthenticated) {
                toast.error("Authentication required.");
                navigate('/login', { replace: true });
            } else if (!isAdmin) {
                toast.error("Clearance Level Insufficient.");
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
            setError('Registry Error: Failed to synchronize with client database.');
            toast.error('Registry sync failed.');
        } finally {
            setIsLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
    
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
            toast.success(`Client purged from registry: ${customerToDelete.name}`);
            fetchCustomers();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Purge protocol failed.');
        } finally {
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        }
    };

    if (authIsLoading || (isLoading && customers.length === 0)) {
        return <LoadingSpinner text="Accessing Client Registry..." />;
    }
    
    if (!isAdmin) return null;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Protocol */}
            <header className="mb-12">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <UserGroupIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-none">{t('customer_directory')}</h1>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => navigate('/customers/new')}
                    className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition transform active:scale-95 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" /> 
                    {t('new_client')}
                </button>
                </div>
            </header>

            {/* Tactical Search Terminal */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={t('filter_by_entity')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem]"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] p-4 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <IdentificationIcon className="h-4 w-4 text-indigo-500" />
                    <span className="text-gray-900 dark:text-gray-100">{t('verified_records', { count: filteredCustomers.length })}</span>
                </div>
            </div>

            {error && <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-black uppercase tracking-widest">{error}</div>}

            {/* Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCustomers.length > 0 ? filteredCustomers.map(cust => (
                    <div key={cust.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col overflow-hidden">
                        
                        {/* Card Header Node */}
                        <div className="p-8 pb-6 border-b border-gray-50 dark:border-gray-700/50">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cust.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <HashtagIcon className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="text-sm font-mono font-black text-gray-400 uppercase tracking-widest leading-none">
                                    {cust.kennitala || 'UNREGISTERED'}
                                </span>
                            </div>
                        </div>

                        {/* Telemetry Grid */}
                        <div className="p-8 flex-grow space-y-5">
                            <DetailRow 
                                icon={<UserIcon />} 
                                label="Primary Liaison" 
                                value={cust.contact_person} 
                            />
                            <DetailRow 
                                icon={<MapPinIcon />} 
                                label="HQ / Billing Address" 
                                value={cust.address} 
                            />

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                {cust.phone_number && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
                                        <PhoneIcon className="h-3.5 w-3.5" />
                                        {cust.phone_number}
                                    </div>
                                )}
                                {cust.email && (
                                    <a href={`mailto:${cust.email}`} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors">
                                        <EnvelopeIcon className="h-3.5 w-3.5" />
                                        Registry Email
                                    </a>
                                )}
                            </div>

                            {isSuperuser && cust.tenant && (
                                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-[0.2em]">
                                    <BuildingOfficeIcon className="h-4 w-4" />
                                    Cluster Owner: {cust.tenant.name}
                                </div>
                            )}
                        </div>

                        {/* Action Terminal */}
                        <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => navigate(`/customers/edit/${cust.id}`)} 
                                    className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition transform active:scale-95"
                                    title="Modify Profile"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => triggerDelete(cust)} 
                                    className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition transform active:scale-95"
                                    title="Purge Node"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <Link 
                                to={`/customers/edit/${cust.id}`} 
                                className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                            >
                                Management Hub <ChevronRightIcon className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <UserGroupIcon className="h-16 w-16 text-gray-200 dark:text-gray-700 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">No clients detected in registry</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust search filters or initialize a new customer node.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={t('purge_customer_registry')}
                message={`CRITICAL: Are you sure you want to permanently delete "${customerToDelete?.name}"? This will terminate all active project associations for this entity.`}
                confirmText="PURGE RECORD"
                type="danger"
            />
        </div>
    );
}

/**
 * Helper Node: Telemetry Row
 */
function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 text-indigo-500 h-4 w-4 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1.5">{label}</p>
                <p className="text-sm font-black text-gray-800 dark:text-gray-200 truncate leading-tight uppercase tracking-tight">
                    {value || 'DATA MISSING'}
                </p>
            </div>
        </div>
    );
}

export default CustomerListPage;