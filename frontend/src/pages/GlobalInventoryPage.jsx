import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
    CircleStackIcon, 
    MagnifyingGlassIcon, 
    PlusIcon, 
    ChevronRightIcon,
    ExclamationTriangleIcon,
    CubeIcon,
    TagIcon,
    AdjustmentsHorizontalIcon,
    ShoppingCartIcon,
    ArchiveBoxIcon,
    HashtagIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';

function GlobalInventoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const canManageInventory = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    /**
     * Protocol: Synchronize with /inventory/catalog registry
     */
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            // FIXED: Path synchronized with backend router @router.get("/catalog")
            const response = await axiosInstance.get('/inventory/catalog', { 
                params: { search: searchTerm, limit: 1000 } 
            });
            setItems(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Registry Sync Failure:", err);
            toast.error(t('error_loading_inventory', { defaultValue: 'Connection to registry lost.' }));
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, t]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    if (isLoading && items.length === 0) return <LoadingSpinner text={t('syncing')} />;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                            <CircleStackIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tighter uppercase italic">
                                {t('inventory')}
                            </h1>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">
                                CENTRALIZED LOGISTICS CLUSTER
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Link 
                        to="/shopping-list"
                        className="flex-1 md:flex-none h-14 px-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-indigo-600 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition"
                    >
                        <ShoppingCartIcon className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Procurement</span>
                    </Link>
                    {canManageInventory && (
                        <Link 
                            to="/inventory/new"
                            className="flex-1 md:flex-none h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <PlusIcon className="h-4 w-4 stroke-[3px]" /> 
                            {t('create_new')}
                        </Link>
                    )}
                </div>
            </header>

            {/* Tactical Filtering Terminal */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 relative group">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="modern-input pl-12 h-14 !rounded-[1.25rem] font-bold"
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[1.25rem] px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-500" /> 
                    <span className="text-gray-900 dark:text-gray-100">{items.length} SKUs Active</span>
                </div>
            </div>

            {/* Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {items.length > 0 ? items.map(item => (
                    <div key={item.id} className="group bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        
                        <div className="h-44 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center relative overflow-hidden border-b border-gray-50 dark:border-gray-800">
                            {item.local_image_path ? (
                                <img src={item.local_image_path} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                                <ArchiveBoxIcon className="h-14 w-14 text-gray-200 dark:text-gray-700" />
                            )}
                            
                            {item.quantity <= (item.low_stock_threshold || 5) && (
                                <div className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-xl shadow-2xl animate-pulse flex items-center gap-2 border-2 border-white dark:border-gray-800">
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter pr-1">Low Stock</span>
                                </div>
                            )}
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <h2 className="text-md font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate mb-1 italic">
                                {item.name}
                            </h2>
                            <div className="flex items-center gap-2 mb-6">
                                <HashtagIcon className="h-3 w-3 text-indigo-500" />
                                <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest leading-none pt-0.5">
                                    SKU-{item.id.toString().padStart(4, '0')}
                                </span>
                            </div>

                            <div className="mt-auto space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/80 rounded-2xl border border-transparent group-hover:border-indigo-100 transition-colors">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{t('stock_level')}</p>
                                        <p className={`text-xl font-black tracking-tighter ${item.quantity <= (item.low_stock_threshold || 5) ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                            {item.quantity} <span className="text-xs text-gray-400 uppercase font-black ml-1">{item.unit || 'pcs'}</span>
                                        </p>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                                        <TagIcon className="h-5 w-5 text-indigo-500" />
                                    </div>
                                </div>

                                <Link 
                                    to={`/inventory/edit/${item.id}`}
                                    className="flex items-center justify-center gap-3 w-full h-12 bg-gray-900 dark:bg-gray-700 text-white hover:bg-indigo-600 transition-all rounded-[1.25rem] shadow-lg"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('edit')}</span>
                                    <ChevronRightIcon className="h-4 w-4 stroke-[3px]" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-800 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CubeIcon className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">{t('no_data')}</h3>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GlobalInventoryPage;