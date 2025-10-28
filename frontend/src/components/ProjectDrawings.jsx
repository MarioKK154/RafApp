// frontend/src/components/ProjectDrawings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import Modal from 'react-modal';
import { DocumentArrowDownIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

// Ensure react-modal is initialized
Modal.setAppElement('#root');

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';

const DRAWING_STATUSES = ["Draft", "For Approval", "Approved", "As-Built", "Archived"];

function ProjectDrawings({ projectId }) {
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [selectedFile, setSelectedFile] = useState(null);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // State for editing modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDrawing, setEditingDrawing] = useState(null);
    const [editFormData, setEditFormData] = useState({
        description: '', revision: '', discipline: '', status: 'Draft', drawing_date: '', author: ''
    });

    const canManageDrawings = user && ['admin', 'project manager', 'team leader'].includes(user.role);

    const fetchDrawings = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await axiosInstance.get(`/drawings/project/${projectId}`);
            setDrawings(response.data);
        } catch (err) {
            setError('Failed to load drawings.');
            // toast.error('Failed to load drawings.'); // Can be noisy on initial load fail
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
        // Add new fields to upload if desired, otherwise they can be edited later
        // formData.append('revision', 'Initial'); // Example

        try {
            await axiosInstance.post(`/drawings/upload/${projectId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Drawing uploaded successfully!');
            setSelectedFile(null);
            setDescription('');
            document.getElementById('drawing-file-input').value = ''; // Reset file input
            fetchDrawings(); // Refresh list
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to upload drawing.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (drawingId, drawingName) => {
        if (!window.confirm(`Are you sure you want to delete the drawing "${drawingName}"?`)) return;
        try {
            await axiosInstance.delete(`/drawings/${drawingId}`);
            toast.success(`Drawing "${drawingName}" deleted.`);
            fetchDrawings(); // Refresh list
        } catch (err) {
            toast.error('Failed to delete drawing.');
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
            toast.error("Could not download file.");
        }
    };

    // --- Edit Modal Functions ---
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

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingDrawing(null);
    };

    const handleEditFormChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        if (!editingDrawing) return;
        try {
            const payload = {
                ...editFormData,
                drawing_date: editFormData.drawing_date || null // Ensure null if empty
            };
            await axiosInstance.put(`/drawings/${editingDrawing.id}`, payload);
            toast.success("Drawing details updated.");
            closeEditModal();
            fetchDrawings(); // Refresh list
        } catch (err) {
            toast.error("Failed to update drawing details.");
        }
    };
    // --- End Edit Modal Functions ---


    if (isLoading) {
        return <LoadingSpinner text="Loading Drawings..." />;
    }

    return (
        <div className="mt-8 pt-6 border-t dark:border-gray-600">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Project Drawings</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Upload Form */}
            {canManageDrawings && (
                <form onSubmit={handleUpload} className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium">Description (Optional)</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="drawing-file-input" className="block text-sm font-medium">Drawing File*</label>
                        <input type="file" id="drawing-file-input" onChange={handleFileChange} required className="mt-1 block w-full text-sm"/>
                    </div>
                    <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {isUploading ? 'Uploading...' : 'Upload Drawing'}
                    </button>
                </form>
            )}

            {/* Drawings Table */}
            <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left min-w-[800px]"> {/* Added min-width */}
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4">Filename</th>
                            <th className="py-3 px-2">Rev</th>
                            <th className="py-3 px-4">Discipline</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Author</th>
                            <th className="py-3 px-4">Uploaded</th>
                            <th className="py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drawings.map(drawing => (
                            <tr key={drawing.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <td className="py-2 px-4 font-medium">{drawing.filename}</td>
                                <td className="py-2 px-2">{drawing.revision || '-'}</td>
                                <td className="py-2 px-4">{drawing.discipline || '-'}</td>
                                <td className="py-2 px-4">{drawing.status || '-'}</td>
                                <td className="py-2 px-4">{formatDate(drawing.drawing_date)}</td>
                                <td className="py-2 px-4">{drawing.author || '-'}</td>
                                <td className="py-2 px-4 text-xs">{formatDate(drawing.uploaded_at)}</td>
                                <td className="py-2 px-4 flex items-center space-x-2">
                                    <button onClick={() => handleDownload(drawing.id, drawing.filename)} title="Download" className="text-green-600 hover:text-green-800"><DocumentArrowDownIcon className="h-5 w-5"/></button>
                                    {canManageDrawings && (
                                        <>
                                            <button onClick={() => openEditModal(drawing)} title="Edit Details" className="text-blue-600 hover:text-blue-800"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDelete(drawing.id, drawing.filename)} title="Delete" className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {drawings.length === 0 && <p className="p-4 text-center">No drawings uploaded for this project yet.</p>}
            </div>

             {/* Edit Drawing Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onRequestClose={closeEditModal}
                contentLabel="Edit Drawing Details"
                className="modal fixed inset-0 flex items-center justify-center p-4"
                overlayClassName="modal-overlay fixed inset-0 bg-black bg-opacity-50"
            >
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Edit Drawing Details</h2>
                        <button onClick={closeEditModal}><XMarkIcon className="h-6 w-6"/></button>
                    </div>
                    {editingDrawing && (
                        <form onSubmit={handleSaveChanges} className="space-y-4">
                            <p className="text-sm font-semibold">Filename: {editingDrawing.filename}</p>
                            <div><label>Description</label><textarea name="description" value={editFormData.description} onChange={handleEditFormChange} rows="2" className="mt-1 block w-full rounded-md"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label>Revision</label><input type="text" name="revision" value={editFormData.revision} onChange={handleEditFormChange} className="mt-1 block w-full rounded-md"/></div>
                                <div><label>Discipline</label><input type="text" name="discipline" value={editFormData.discipline} onChange={handleEditFormChange} className="mt-1 block w-full rounded-md"/></div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label>Status</label>
                                    <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="mt-1 block w-full rounded-md">
                                        {DRAWING_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div><label>Drawing Date</label><input type="date" name="drawing_date" value={editFormData.drawing_date} onChange={handleEditFormChange} className="mt-1 block w-full rounded-md"/></div>
                             </div>
                             <div><label>Author (Drawn By)</label><input type="text" name="author" value={editFormData.author} onChange={handleEditFormChange} className="mt-1 block w-full rounded-md"/></div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={closeEditModal} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center">
                                    <CheckIcon className="h-5 w-5 mr-1"/> Save Changes
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>

        </div>
    );
}

export default ProjectDrawings;