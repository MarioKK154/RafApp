import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import { 
    DocumentArrowDownIcon, 
    PencilIcon, 
    TrashIcon, 
    CloudArrowUpIcon,
    DocumentTextIcon,
    UserIcon,
    CalendarIcon,
    FolderIcon,
    ChevronRightIcon,
    HomeIcon,
    PlusIcon,
    FolderPlusIcon,
    EyeIcon,
    ArrowPathIcon,
    TagIcon,
    ArrowLeftIcon,
    CloudIcon,
    DevicePhoneMobileIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { checkIfCached, getDrawingBlobUrl, cacheDrawing, purgeDrawingFromCache } from '../utils/drawingCache';

const DRAWING_STATUSES = ["Draft", "For Approval", "Approved", "As-Built", "Archived"];
const DISCIPLINES = ["General", "Electrical", "Lighting", "Fire Alarm", "Data/Network", "Security/CCTV", "HVAC Control"];

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

function ProjectDrawings({ projectId, onBack }) {
    const { t, i18n } = useTranslation();
    const isIcelandic = i18n.language === 'is';
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [drawings, setDrawings] = useState([]);
    const [folders, setFolders] = useState([]);

    // --- CACHE STATE ---
    const [cachedMap, setCachedMap] = useState({});
    const [isBatchCaching, setIsBatchCaching] = useState(false);

    // --- NAVIGATION STATE ---
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    // --- UPLOAD / REPLACEMENT STATE ---
    const [selectedFile, setSelectedFile] = useState(null);
    const fileReplaceInputRef = useRef(null); // Ref for hidden update input
    const [activeDrawingForReplace, setActiveDrawingForReplace] = useState(null);
    
    const [uploadData, setUploadData] = useState({
        description: '',
        revision: 'A',
        discipline: 'Electrical',
        status: 'Draft',
        drawing_date: new Date().toISOString().split('T')[0],
        author: user?.full_name || '' 
    });
    const [isUploading, setIsUploading] = useState(false);

    // --- MODALS STATE ---
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [drawingToDelete, setDrawingToDelete] = useState(null);

    // Only Admin and PM can manage (upload/delete/edit)
    const canManage = user && (['admin', 'project manager'].includes(user.role) || user.is_superuser);

    // Sync author automatically
    useEffect(() => {
        if (user?.full_name) {
            setUploadData(prev => ({ ...prev, author: user.full_name }));
        }
    }, [user]);

    const fetchContent = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const [drawingsRes, foldersRes] = await Promise.all([
                axiosInstance.get(`/drawings/project/${projectId}`).catch(() => ({ data: [] })),
                axiosInstance.get(`/drawings/folders/project/${projectId}`).catch(() => ({ data: [] }))
            ]);

            const rawDrawings = Array.isArray(drawingsRes.data) ? drawingsRes.data : [];
            const rawFolders = Array.isArray(foldersRes.data) ? foldersRes.data : [];

            const currentDrawings = rawDrawings.filter(d => d.folder_id === currentFolderId);
            setDrawings(currentDrawings);
            setFolders(rawFolders.filter(f => f.parent_id === currentFolderId));

            // Scan drawing cache statuses
            const cacheStatus = {};
            for (const d of currentDrawings) {
                cacheStatus[d.id] = await checkIfCached(d.filepath);
            }
            setCachedMap(cacheStatus);
        } catch (error) {
            console.error('Drawings sync failed:', error);
            toast.error(isIcelandic ? 'Mistókst að samstilla teikningar.' : 'Failed to sync drawing registry.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, currentFolderId, isIcelandic]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    // --- ACTION: In-Browser Viewer ---
    const handleViewFile = async (drawing) => {
        if (!drawing.filepath) return toast.error("Storage path undefined.");
        try {
            const isCached = await checkIfCached(drawing.filepath);
            if (isCached) {
                const blobUrl = await getDrawingBlobUrl(drawing.filepath);
                if (blobUrl) {
                    window.open(blobUrl, '_blank');
                    return;
                }
            }
            // Fallback to online redirect
            const base = axiosInstance.defaults.baseURL || "";
            const cleanBase = base.includes('/api') ? base.split('/api')[0] : base;
            window.open(`${cleanBase}/${drawing.filepath}`, '_blank');
        } catch (error) {
            console.error('View file error:', error);
            toast.error(isIcelandic ? 'Gat ekki opnað skrá.' : 'Could not open file.');
        }
    };

    // --- ACTION: Download & Cache Locally ---
    const handleToggleCache = async (drawing) => {
        try {
            const isCurrentlyCached = cachedMap[drawing.id];
            if (isCurrentlyCached) {
                await purgeDrawingFromCache(drawing.filepath);
                setCachedMap(prev => ({ ...prev, [drawing.id]: false }));
                toast.info(isIcelandic ? 'Skrá eytt úr skyndiminni tækis.' : 'File removed from local device cache.');
            } else {
                toast.info(isIcelandic ? 'Sækir teikningu og vistar í tæki...' : 'Downloading and saving drawing to device...');
                await cacheDrawing(drawing.id, drawing.filepath, axiosInstance);
                setCachedMap(prev => ({ ...prev, [drawing.id]: true }));
                toast.success(isIcelandic ? 'Teikning vistuð í tæki og tilbúin fyrir án-nets notkun!' : 'Drawing saved locally and ready for offline use!');
            }
        } catch (error) {
            console.error('Cache toggle failed:', error);
            toast.error(isIcelandic ? 'Mistókst að vista teikningu í tæki.' : 'Failed to update local cache.');
        }
    };

    // --- ACTION: Download All Drawings in Folder ---
    const handleCacheAll = async () => {
        if (drawings.length === 0) {
            return toast.info(isIcelandic ? 'Engar teikningar í þessari möppu til að vista.' : 'No drawings in this directory to cache.');
        }
        setIsBatchCaching(true);
        toast.info(isIcelandic ? 'Halar niður öllum teikningum í tæki...' : 'Downloading all drawings to device...');
        try {
            let count = 0;
            for (const d of drawings) {
                if (!cachedMap[d.id]) {
                    await cacheDrawing(d.id, d.filepath, axiosInstance);
                    setCachedMap(prev => ({ ...prev, [d.id]: true }));
                    count++;
                }
            }
            toast.success(isIcelandic ? `Tókst að vista ${count} teikningar í tæki!` : `Successfully cached ${count} drawings for offline use.`);
        } catch (error) {
            console.error('Batch cache failed:', error);
            toast.error(isIcelandic ? 'Sumar teikningar gætu hafa mistekist að vista.' : 'Some drawings failed to cache.');
        } finally {
            setIsBatchCaching(false);
        }
    };

    // --- ACTION: Trigger Update (Bumps Rev + Replace File) ---
    const triggerUpdateProtocol = (drawing) => {
        setActiveDrawingForReplace(drawing);
        if (fileReplaceInputRef.current) fileReplaceInputRef.current.click();
    };

    const handleUpdateUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeDrawingForReplace) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axiosInstance.post(`/drawings/${activeDrawingForReplace.id}/replace`, formData);
            toast.success(isIcelandic ? 'Ný útgáfa teikningar hefur verið vistuð.' : 'Drawing promoted to next revision.');
            // Purge old local cache since file changed
            await purgeDrawingFromCache(activeDrawingForReplace.filepath);
            fetchContent();
        } catch (error) {
            console.error('Drawing version update failed:', error);
            toast.error(isIcelandic ? 'Uppfærsla teikningar mistókst.' : 'Version update failed.');
        } finally {
            setIsUploading(false);
            setActiveDrawingForReplace(null);
            e.target.value = null; // Reset input
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return toast.warn(isIcelandic ? 'Veldu fyrst skrá.' : 'Select a file first.');
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        Object.keys(uploadData).forEach(key => formData.append(key, uploadData[key]));
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        try {
            await axiosInstance.post(`/drawings/upload/${projectId}`, formData);
            toast.success(isIcelandic ? 'Teikning hefur verið skráð.' : 'Drawing successfully indexed.');
            setSelectedFile(null);
            setUploadData(prev => ({ ...prev, description: '' }));
            fetchContent();
        } catch (error) {
            console.error('Drawing upload failed:', error);
            toast.error(isIcelandic ? 'Skráning mistókst.' : 'Upload protocol failed.');
        } finally {
            setIsUploading(false);
        }
    };

    // --- NAVIGATION ---
    const navigateToFolder = (folder) => {
        setCurrentFolderId(folder.id);
        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    };

    const navigateToBreadcrumb = (index) => {
        if (index === -1) {
            setCurrentFolderId(null);
            setBreadcrumbs([]);
        } else {
            const target = breadcrumbs[index];
            setCurrentFolderId(target.id);
            setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            await axiosInstance.post(`/drawings/folders/`, {
                name: newFolderName,
                project_id: projectId,
                parent_id: currentFolderId,
                tenant_id: user.tenant_id
            });
            toast.success(isIcelandic ? 'Mappa stofnuð.' : 'Directory created.');
            setNewFolderName('');
            setIsFolderModalOpen(false);
            fetchContent();
        } catch (error) {
            console.error('Folder creation failed:', error);
            toast.error(isIcelandic ? 'Mistókst að stofna möppu.' : 'Folder creation failed.');
        }
    };

    if (isLoading && drawings.length === 0 && folders.length === 0) return <LoadingSpinner />;

    return (
        <div className="mt-6">
            {/* Hidden Input for Updates */}
            <input type="file" ref={fileReplaceInputRef} onChange={handleUpdateUpload} className="hidden" accept=".pdf,.dwg,.jpg,.png" />

            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 px-4">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button 
                            type="button" 
                            onClick={onBack} 
                            className="p-2 mr-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition text-gray-500 hover:text-indigo-600"
                        >
                            <ArrowLeftIcon className="h-5 w-5 stroke-[2.5px]" />
                        </button>
                    )}
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                        {isIcelandic ? 'Teikningagrunnur' : 'Drawings Database'}
                    </h2>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={handleCacheAll}
                        disabled={isBatchCaching || drawings.length === 0}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" /> {isIcelandic ? 'Sækja allt í tæki' : 'Save all offline'}
                    </button>
                    {canManage && (
                        <button 
                            onClick={() => setIsFolderModalOpen(true)} 
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition transform active:scale-95"
                        >
                            <FolderPlusIcon className="h-5 w-5" /> {isIcelandic ? 'Ný mappa' : 'New directory'}
                        </button>
                    )}
                </div>
            </header>

            {/* Breadcrumbs Navigation */}
            <div className="flex items-center gap-2 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 overflow-x-auto">
                <button onClick={() => navigateToBreadcrumb(-1)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition text-gray-400 hover:text-indigo-600">
                    <HomeIcon className="h-4 w-4" />
                </button>
                {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={bc.id}>
                        <ChevronRightIcon className="h-3 w-3 text-gray-300 shrink-0" />
                        <button onClick={() => navigateToBreadcrumb(idx)} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-600 whitespace-nowrap px-2">
                            {bc.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Detailed Upload Console */}
            {canManage && (
                <div className="mb-10 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 border-b pb-4">
                        {isIcelandic ? 'Skrá nýja teikningu' : 'New Asset Ingestion'}
                    </h3>
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    {isIcelandic ? 'Lýsing teikningar' : 'Document Title'}
                                </label>
                                <input type="text" value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} placeholder="e.g., Main Distribution Board Schematic" className="modern-input h-14 font-bold" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    {isIcelandic ? 'Hala inn skrá (PDF/DWG)' : 'Binary Source (PDF/DWG)'}
                                </label>
                                <input type="file" onChange={e => setSelectedFile(e.target.files[0])} className="modern-input h-14 pt-3.5 text-xs font-bold" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Discipline</label>
                                <select value={uploadData.discipline} onChange={e => setUploadData({...uploadData, discipline: e.target.value})} className="modern-input h-12 text-[10px] font-black uppercase">
                                    {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Status</label>
                                <select value={uploadData.status} onChange={e => setUploadData({...uploadData, status: e.target.value})} className="modern-input h-12 text-[10px] font-black uppercase">
                                    {DRAWING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Init Rev</label>
                                <input type="text" value={uploadData.revision} onChange={e => setUploadData({...uploadData, revision: e.target.value.toUpperCase()})} className="modern-input h-12 text-center font-black" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Registry Date</label>
                                <input type="date" value={uploadData.drawing_date} onChange={e => setUploadData({...uploadData, drawing_date: e.target.value})} className="modern-input h-12 text-xs font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Author</label>
                                <input type="text" value={uploadData.author} readOnly className="modern-input h-12 bg-gray-50 dark:bg-gray-900/40 text-gray-400 font-bold text-xs" />
                            </div>
                        </div>
                        <button type="submit" disabled={isUploading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition flex items-center justify-center gap-3">
                            <CloudArrowUpIcon className="h-5 w-5" /> {isUploading ? (isIcelandic ? 'Flyt inn skrá...' : 'Transferring assets...') : (isIcelandic ? 'Skrá teikningu í kerfi' : 'Commit to site database')}
                        </button>
                    </form>
                </div>
            )}

            {/* Folder Interface */}
            {folders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
                    {folders.map(folder => (
                        <div key={folder.id} onClick={() => navigateToFolder(folder)} className="group p-5 bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-3xl cursor-pointer hover:border-indigo-500 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center gap-4">
                            <FolderIcon className="h-10 w-10 text-amber-400 group-hover:scale-110 transition-transform" />
                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{folder.name}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Registry Explorer Table */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 dark:bg-gray-700/30 border-b">
                            <tr>
                                <th className="py-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Node</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage Cache</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rev</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Author</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry Date</th>
                                <th className="py-6 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {drawings.length > 0 ? drawings.map(drawing => {
                                const isCached = cachedMap[drawing.id];
                                return (
                                    <tr key={drawing.id} className="group hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors">
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                                    <DocumentTextIcon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-gray-900 dark:text-white uppercase text-xs truncate max-w-[200px]">{drawing.filename}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 truncate max-w-[200px]">{drawing.description || 'No metadata'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* CACHE STATUS */}
                                        <td className="py-6 px-4">
                                            <button 
                                                type="button" 
                                                onClick={() => handleToggleCache(drawing)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest border transition-all ${
                                                    isCached 
                                                        ? 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-200' 
                                                        : 'bg-gray-50 dark:bg-gray-900/40 text-gray-400 border-gray-250'
                                                }`}
                                            >
                                                {isCached ? (
                                                    <>
                                                        <DevicePhoneMobileIcon className="h-3 w-3" />
                                                        <span>{isIcelandic ? 'Tæki' : 'Device'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CloudIcon className="h-3 w-3" />
                                                        <span>{isIcelandic ? 'Net' : 'Cloud'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-6 px-4">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 font-black font-mono text-[10px] rounded-lg border border-indigo-100">
                                                v{drawing.revision || 'A'}
                                            </span>
                                        </td>
                                        <td className="py-6 px-4">
                                            <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest border ${
                                                drawing.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' : 
                                                drawing.status === 'As-Built' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {drawing.status || 'Draft'}
                                            </span>
                                        </td>
                                        <td className="py-6 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-3 w-3 text-gray-400" />
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">
                                                    {drawing.author || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="h-3 w-3 text-gray-400" />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                    {formatDate(drawing.drawing_date)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8 text-center">
                                            <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleViewFile(drawing)} className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm" title={isIcelandic ? 'Skoða' : 'View in Browser'}>
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                {canManage && (
                                                    <>
                                                        <button onClick={() => triggerUpdateProtocol(drawing)} className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-amber-500 hover:text-white transition shadow-sm" title={isIcelandic ? 'Uppfæra (Ný Útgáfa)' : 'Upload New Version (Bumps Rev)'}>
                                                            <ArrowPathIcon className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setDrawingToDelete(drawing); setIsDeleteModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-red-600 transition" title={isIcelandic ? 'Eyða' : 'Delete'}>
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] italic">
                                        {isIcelandic ? 'Engar teikningar fundust í þessari möppu.' : 'No drawings in this directory.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} onConfirm={handleCreateFolder} title={isIcelandic ? 'Ný mappa' : 'New Directory'} confirmText={isIcelandic ? 'Stofna möppu' : 'Create Folder'}>
                <div className="py-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                        {isIcelandic ? 'Nafn möppu' : 'Directory Name'}
                    </label>
                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g., Electrical Ground Floor" className="modern-input h-14 font-black uppercase text-xs" />
                </div>
            </Modal>

            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={async () => {
                try {
                    await axiosInstance.delete(`/drawings/${drawingToDelete.id}`);
                    toast.success(isIcelandic ? 'Teikningu eytt.' : 'Asset purged.');
                    setIsDeleteModalOpen(false);
                    fetchContent();
                } catch (error) {
                    console.error('Drawing delete failed:', error);
                    toast.error(isIcelandic ? 'Eyðing mistókst.' : 'Purge failed.');
                }
            }} title={isIcelandic ? 'Eyða teikningu' : 'Purge Node'} message={isIcelandic ? `Ertu viss um að þú viljir eyða teikningu "${drawingToDelete?.filename}" varanlega?` : `CRITICAL: Permanently delete drawing "${drawingToDelete?.filename}"?`} confirmText={isIcelandic ? 'Já, eyða teikningu' : 'Delete Asset'} type="danger" />
        </div>
    );
}

export default ProjectDrawings;