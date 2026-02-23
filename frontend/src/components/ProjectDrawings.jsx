import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    TagIcon
} from '@heroicons/react/24/outline';

const DRAWING_STATUSES = ["Draft", "For Approval", "Approved", "As-Built", "Archived"];
const DISCIPLINES = ["General", "Electrical", "Lighting", "Fire Alarm", "Data/Network", "Security/CCTV", "HVAC Control"];

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

function ProjectDrawings({ projectId }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [drawings, setDrawings] = useState([]);
    const [folders, setFolders] = useState([]);

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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDrawing, setEditingDrawing] = useState(null);
    const [editFormData, setEditFormData] = useState({
        description: '', revision: '', discipline: '', status: 'Draft', drawing_date: '', author: ''
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [drawingToDelete, setDrawingToDelete] = useState(null);

    const canManage = user && (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);

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

            setDrawings(rawDrawings.filter(d => d.folder_id === currentFolderId));
            setFolders(rawFolders.filter(f => f.parent_id === currentFolderId));
        } catch (err) {
            toast.error('Failed to sync drawing registry.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, currentFolderId]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    // --- ACTION: In-Browser Viewer ---
    const handleViewFile = (drawing) => {
        if (!drawing.filepath) return toast.error("Storage path undefined.");
        // Safely extract static URL from base
        const base = axiosInstance.defaults.baseURL || "";
        const cleanBase = base.includes('/api') ? base.split('/api')[0] : base;
        window.open(`${cleanBase}/${drawing.filepath}`, '_blank');
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
            // Using the /replace endpoint we discussed for backend
            await axiosInstance.post(`/drawings/${activeDrawingForReplace.id}/replace`, formData);
            toast.success(`Drawing promoted to next revision.`);
            fetchContent();
        } catch (err) {
            toast.error("Version update failed.");
        } finally {
            setIsUploading(false);
            setActiveDrawingForReplace(null);
            e.target.value = null; // Reset input
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return toast.warn("Select a file first.");
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        Object.keys(uploadData).forEach(key => formData.append(key, uploadData[key]));
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        try {
            await axiosInstance.post(`/drawings/upload/${projectId}`, formData);
            toast.success('Drawing successfully indexed.');
            setSelectedFile(null);
            setUploadData(prev => ({ ...prev, description: '' }));
            fetchContent();
        } catch (err) {
            toast.error('Upload protocol failed.');
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
            toast.success(`Directory created.`);
            setNewFolderName('');
            setIsFolderModalOpen(false);
            fetchContent();
        } catch (err) {
            toast.error("Folder creation failed.");
        }
    };

    if (isLoading && drawings.length === 0 && folders.length === 0) return <LoadingSpinner />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            {/* Hidden Input for Updates */}
            <input type="file" ref={fileReplaceInputRef} onChange={handleUpdateUpload} className="hidden" accept=".pdf,.dwg,.jpg,.png" />

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl">
                        <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Structural Database</h2>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] leading-none mt-1">Managed Asset Registry</p>
                    </div>
                </div>
                {canManage && (
                    <button onClick={() => setIsFolderModalOpen(true)} className="h-12 px-6 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition flex items-center gap-2">
                        <FolderPlusIcon className="h-5 w-5" /> New Directory
                    </button>
                )}
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
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 border-b pb-4">New Asset Ingestion</h3>
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Title</label>
                                <input type="text" value={uploadData.description} onChange={e => setUploadData({...uploadData, description: e.target.value})} placeholder="e.g., Main Distribution Board Schematic" className="modern-input h-14 font-bold" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Binary Source (PDF/DWG)</label>
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
                        <button type="submit" disabled={isUploading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-3">
                            <CloudArrowUpIcon className="h-5 w-5" /> {isUploading ? 'Transferring Assets...' : 'Commit to Site Database'}
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
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rev</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                {/* NEW COLUMNS */}
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Author</th>
                                <th className="py-6 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry Date</th>
                                <th className="py-6 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {drawings.length > 0 ? drawings.map(drawing => (
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
                                    {/* AUTHOR DATA */}
                                    <td className="py-6 px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="h-3 w-3 text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">
                                                {drawing.author || 'System'}
                                            </span>
                                        </div>
                                    </td>
                                    {/* DATE DATA */}
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
                                            <button onClick={() => handleViewFile(drawing)} className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm" title="View in Browser">
                                                <EyeIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => triggerUpdateProtocol(drawing)} className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-amber-500 hover:text-white transition shadow-sm" title="Upload New Version (Bumps Rev)">
                                                <ArrowPathIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => { setDrawingToDelete(drawing); setIsDeleteModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-red-600 transition">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] italic">No assets in directory node.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} onConfirm={handleCreateFolder} title="New Directory" confirmText="Create Folder">
                <div className="py-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Directory Name</label>
                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g., Electrical Ground Floor" className="modern-input h-14 font-black uppercase text-xs" />
                </div>
            </Modal>

            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={async () => {
                try {
                    await axiosInstance.delete(`/drawings/${drawingToDelete.id}`);
                    toast.success("Asset purged.");
                    setIsDeleteModalOpen(false);
                    fetchContent();
                } catch (err) { toast.error("Purge failed."); }
            }} title="Purge Node" message={`CRITICAL: Permanently delete drawing "${drawingToDelete?.filename}"?`} confirmText="Delete Asset" type="danger" />
        </div>
    );
}

export default ProjectDrawings;