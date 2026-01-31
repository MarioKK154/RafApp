import React, { useState, useEffect, useCallback } from 'react';
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
    TagIcon,
    UserIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';

const DRAWING_STATUSES = ["Draft", "For Approval", "Approved", "As-Built", "Archived"];

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';

function ProjectDrawings({ projectId }) {
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    // Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDrawing, setEditingDrawing] = useState(null);
    const [editFormData, setEditFormData] = useState({
        description: '', revision: '', discipline: '', status: 'Draft', drawing_date: '', author: ''
    });

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [drawingToDelete, setDrawingToDelete] = useState(null);

    // Permissions: Superadmin has global root access
    const canManageDrawings = user && (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);

    const fetchDrawings = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/drawings/project/${projectId}`);
            setDrawings(response.data);
        } catch (err) {
            setError('Failed to load drawing registry.');
            console.error("Fetch drawings error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchDrawings();
    }, [fetchDrawings]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.warn("Please select a file to upload.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('description', description);

        try {
            await axiosInstance.post(`/drawings/upload/${projectId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Drawing uploaded successfully!');
            setSelectedFile(null);
            setDescription('');
            const fileInput = document.getElementById('drawing-file-input');
            if (fileInput) fileInput.value = ''; 
            fetchDrawings();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (drawingId, filename) => {
         try {
            const response = await axiosInstance.get(`/drawings/download/${drawingId}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("File download failed.");
        }
    };

    // --- Modal Management ---
    const openEditModal = (drawing) => {
        setEditingDrawing(drawing);
        setEditFormData({
            description: drawing.description || '',
            revision: drawing.revision || '',
            discipline: drawing.discipline || '',
            status: drawing.status || 'Draft',
            drawing_date: formatDateForInput(drawing.drawing_date),
            author: drawing.author || '',
        });
        setIsEditModalOpen(true);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        if (!editingDrawing) return;
        try {
            const payload = { ...editFormData, drawing_date: editFormData.drawing_date || null };
            await axiosInstance.put(`/drawings/${editingDrawing.id}`, payload);
            toast.success("Registry updated.");
            setIsEditModalOpen(false);
            fetchDrawings();
        } catch (err) {
            toast.error("Update failed.");
        }
    };

    const triggerDelete = (drawing) => {
        setDrawingToDelete(drawing);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await axiosInstance.delete(`/drawings/${drawingToDelete.id}`);
            toast.success(`Deleted ${drawingToDelete.filename}`);
            setIsDeleteModalOpen(false);
            fetchDrawings();
        } catch (err) {
            toast.error("Deletion failed.");
        }
    };

    if (isLoading) return <LoadingSpinner text="Accessing blueprints..." />;

    return (
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Project Drawings & Documentation</h2>
            </div>

            {/* Modernized Upload Form */}
            {canManageDrawings && (
                <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Description</label>
                            <input 
                                type="text" 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="e.g., First Floor Electrical Plan"
                                className="block w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Select File (PDF/DWG)</label>
                            <input 
                                type="file" 
                                id="drawing-file-input" 
                                onChange={handleFileChange} 
                                required 
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <button 
                                type="submit" 
                                disabled={isUploading} 
                                className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                            >
                                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                                {isUploading ? 'Sending...' : 'Upload'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Drawings Table */}
            <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[900px]">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 font-bold">
                            <tr>
                                <th className="py-4 px-6">Document Name</th>
                                <th className="py-4 px-2">Rev</th>
                                <th className="py-4 px-4">Discipline</th>
                                <th className="py-4 px-4">Status</th>
                                <th className="py-4 px-4">Author</th>
                                <th className="py-4 px-4">Registry Date</th>
                                <th className="py-4 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {drawings.length > 0 ? drawings.map(drawing => (
                                <tr key={drawing.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={drawing.filename}>
                                            {drawing.filename}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{drawing.description || 'No description'}</div>
                                    </td>
                                    <td className="py-4 px-2 font-mono text-xs">{drawing.revision || '0'}</td>
                                    <td className="py-4 px-4 text-gray-500">{drawing.discipline || 'General'}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter ${
                                            drawing.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {drawing.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-gray-500 flex items-center gap-1">
                                        <UserIcon className="h-3 w-3" /> {drawing.author || 'N/A'}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 text-xs">
                                        {formatDate(drawing.drawing_date)}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center items-center gap-3">
                                            <button 
                                                onClick={() => handleDownload(drawing.id, drawing.filename)} 
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                title="Download PDF/DWG"
                                            >
                                                <DocumentArrowDownIcon className="h-5 w-5"/>
                                            </button>
                                            {canManageDrawings && (
                                                <>
                                                    <button onClick={() => openEditModal(drawing)} className="p-2 text-gray-400 hover:text-blue-600 transition">
                                                        <PencilIcon className="h-5 w-5"/>
                                                    </button>
                                                    <button onClick={() => triggerDelete(drawing)} className="p-2 text-gray-400 hover:text-red-600 transition">
                                                        <TrashIcon className="h-5 w-5"/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-500 italic">No blueprints uploaded for this site yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Edit Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onConfirm={handleSaveChanges}
                title="Update Drawing Metadata"
                confirmText="Save Registry"
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                        <textarea 
                            name="description" 
                            value={editFormData.description} 
                            onChange={handleEditFormChange} 
                            rows="2" 
                            className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Revision</label>
                            <input type="text" name="revision" value={editFormData.revision} onChange={handleEditFormChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Discipline</label>
                            <input type="text" name="discipline" value={editFormData.discipline} onChange={handleEditFormChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                            <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white">
                                {DRAWING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Drawing Date</label>
                            <input type="date" name="drawing_date" value={editFormData.drawing_date} onChange={handleEditFormChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Author</label>
                        <input type="text" name="author" value={editFormData.author} onChange={handleEditFormChange} className="w-full rounded-xl border-gray-300 dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>
            </Modal>

            {/* Custom Confirmation Modal */}
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Purge Drawing"
                message={`Are you sure you want to permanently delete "${drawingToDelete?.filename}"? This will remove the file from the cloud storage.`}
                confirmText="Delete Permanently"
            />
        </div>
    );
}

export default ProjectDrawings;