import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import {
    PhotoIcon,
    DocumentArrowUpIcon,
    FolderOpenIcon,
    LinkIcon,
    GlobeAltIcon,
    XMarkIcon,
    DocumentTextIcon,
    PlusCircleIcon,
} from '@heroicons/react/24/outline';

function CreateTutorialModal({ isOpen, onClose, onSuccess, folders = [], defaultFolderId = null, onCreateFolder }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'bulk' | 'folder' | 'link'

    const [formData, setFormData] = useState({
        title: '',
        folder_id: defaultFolderId || (folders[0]?.id ?? ''),
        description: '',
        tutorial_text: '',
        external_url: '',
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [bulkFiles, setBulkFiles] = useState([]);
    const folderInputRef = useRef();
    const multiInputRef = useRef();

    // Sync default folder when folders load
    useEffect(() => {
        if (defaultFolderId) {
            setFormData(fd => ({ ...fd, folder_id: defaultFolderId }));
        } else if (folders.length && !formData.folder_id) {
            setFormData(fd => ({ ...fd, folder_id: folders[0].id }));
        }
    }, [folders, defaultFolderId]);

    const reset = () => {
        setFormData({ title: '', folder_id: defaultFolderId || (folders[0]?.id ?? ''), description: '', tutorial_text: '', external_url: '' });
        setSelectedImage(null);
        setSelectedPdf(null);
        setBulkFiles([]);
        setIsGlobal(false);
        setUploadMode('single');
    };

    // -----------------------------------------------------------------------
    // Single file / link submit
    // -----------------------------------------------------------------------
    const handleSingleSubmit = async () => {
        if (uploadMode !== 'link' && !formData.title.trim()) {
            return toast.warn(t('protocol_title_required', { defaultValue: 'Title is required.' }));
        }
        if (uploadMode === 'link' && !formData.external_url.trim()) {
            return toast.warn(t('url_required', { defaultValue: 'URL is required for link entries.' }));
        }

        setSubmitting(true);
        const data = new FormData();
        data.append('title', formData.title.trim() || formData.external_url.trim());
        if (formData.folder_id) data.append('folder_id', formData.folder_id);
        data.append('description', formData.description);
        data.append('tutorial_text', formData.tutorial_text);
        if (formData.external_url) data.append('external_url', formData.external_url.trim());
        if (user?.is_superuser && isGlobal) data.append('is_global', 'true');
        if (selectedImage) data.append('image', selectedImage);
        if (selectedPdf) data.append('pdf_file', selectedPdf);

        try {
            await axiosInstance.post('/tutorials/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(t('protocol_indexed', { defaultValue: 'Entry successfully added.' }));
            reset();
            onSuccess();
            onClose();
        } catch {
            toast.error(t('registry_injection_failed', { defaultValue: 'Failed to save entry.' }));
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Bulk / folder upload submit
    // -----------------------------------------------------------------------
    const handleBulkSubmit = async () => {
        if (!formData.folder_id) {
            return toast.warn(t('select_folder_first', { defaultValue: 'Please select or create a folder first.' }));
        }
        if (!bulkFiles.length) {
            return toast.warn(t('no_files_selected', { defaultValue: 'No files selected.' }));
        }
        setSubmitting(true);
        const data = new FormData();
        data.append('folder_id', formData.folder_id);
        if (user?.is_superuser && isGlobal) data.append('is_global', 'true');
        bulkFiles.forEach(f => data.append('files', f));

        try {
            const res = await axiosInstance.post('/tutorials/bulk/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(t('bulk_uploaded', { defaultValue: `${res.data.length} file(s) uploaded successfully.` }));
            reset();
            onSuccess();
            onClose();
        } catch {
            toast.error(t('bulk_upload_failed', { defaultValue: 'Bulk upload failed.' }));
        } finally {
            setSubmitting(false);
        }
    };

    const isBulkMode = uploadMode === 'bulk' || uploadMode === 'folder';
    const confirmText = submitting
        ? t('uploading', { defaultValue: 'Uploading…' })
        : isBulkMode
            ? t('upload_all_files', { defaultValue: `Upload ${bulkFiles.length} File(s)` })
            : t('push_to_registry', { defaultValue: 'Add to Registry' });

    const handleConfirm = isBulkMode ? handleBulkSubmit : handleSingleSubmit;

    const selectedFolder = folders.find(f => String(f.id) === String(formData.folder_id));

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { reset(); onClose(); }}
            onConfirm={handleConfirm}
            title={t('add_to_knowledge_base', { defaultValue: 'Add to Knowledge Base' })}
            confirmText={confirmText}
            size="lg"
        >
            <div className="space-y-5 py-2">

                {/* Upload Mode Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    {[
                        { key: 'single', icon: DocumentArrowUpIcon, label: t('single_file', { defaultValue: 'Single File' }) },
                        { key: 'bulk', icon: FolderOpenIcon, label: t('multiple_files', { defaultValue: 'Multiple Files' }) },
                        { key: 'folder', icon: FolderOpenIcon, label: t('whole_folder', { defaultValue: 'Whole Folder' }) },
                        { key: 'link', icon: LinkIcon, label: t('external_link', { defaultValue: 'External Link' }) },
                    ].map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => { setUploadMode(key); setBulkFiles([]); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                                uploadMode === key
                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Folder Selector */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {t('destination_folder', { defaultValue: 'Destination Folder' })} *
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={formData.folder_id}
                            onChange={e => setFormData({ ...formData, folder_id: e.target.value })}
                            className="modern-input h-11 flex-1 text-xs font-bold"
                        >
                            <option value="">{t('select_folder', { defaultValue: '— Select a folder —' })}</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.is_global ? '🌐 ' : '📁 '}{f.name}
                                    {f.tutorial_count != null ? ` (${f.tutorial_count})` : ''}
                                </option>
                            ))}
                        </select>
                        {onCreateFolder && (
                            <button
                                type="button"
                                onClick={onCreateFolder}
                                className="h-11 px-3 flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer shrink-0"
                            >
                                <PlusCircleIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('new_folder', { defaultValue: 'New' })}</span>
                            </button>
                        )}
                    </div>
                    {selectedFolder && (
                        <p className="text-[9px] text-gray-400 ml-1">
                            {selectedFolder.is_global ? '🌐 Global' : '📁 Tenant'} · {selectedFolder.tutorial_count ?? 0} entries
                        </p>
                    )}
                </div>

                {/* -------- SINGLE FILE MODE -------- */}
                {uploadMode === 'single' && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('title', { defaultValue: 'Title' })} *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('protocol_title_placeholder', { defaultValue: 'e.g. 3-Phase Panel Layout' })}
                                className="modern-input h-12 font-bold text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    {t('schematic_image', { defaultValue: 'Schematic (Image)' })}
                                </label>
                                <div className="relative group">
                                    <input type="file" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <div className={`modern-input h-11 flex items-center justify-between px-3 transition-colors ${selectedImage ? 'border-indigo-400' : 'group-hover:border-indigo-300'}`}>
                                        <span className="text-[9px] font-bold text-gray-400 truncate">
                                            {selectedImage ? selectedImage.name : t('choose_image', { defaultValue: 'Choose image…' })}
                                        </span>
                                        <PhotoIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                                    </div>
                                </div>
                                {selectedImage && (
                                    <button type="button" onClick={() => setSelectedImage(null)}
                                        className="text-[8px] text-red-400 hover:text-red-600 ml-1 flex items-center gap-1">
                                        <XMarkIcon className="h-3 w-3" /> Remove
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    {t('manual_pdf', { defaultValue: 'Document (PDF)' })}
                                </label>
                                <div className="relative group">
                                    <input type="file" accept=".pdf,.doc,.docx" onChange={e => setSelectedPdf(e.target.files[0])}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <div className={`modern-input h-11 flex items-center justify-between px-3 transition-colors ${selectedPdf ? 'border-red-400' : 'group-hover:border-red-300'}`}>
                                        <span className="text-[9px] font-bold text-gray-400 truncate">
                                            {selectedPdf ? selectedPdf.name : t('choose_pdf', { defaultValue: 'Choose PDF…' })}
                                        </span>
                                        <DocumentArrowUpIcon className="h-4 w-4 text-red-500 shrink-0" />
                                    </div>
                                </div>
                                {selectedPdf && (
                                    <button type="button" onClick={() => setSelectedPdf(null)}
                                        className="text-[8px] text-red-400 hover:text-red-600 ml-1 flex items-center gap-1">
                                        <XMarkIcon className="h-3 w-3" /> Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('description', { defaultValue: 'Short Description' })}
                            </label>
                            <input type="text" value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('short_desc_placeholder', { defaultValue: 'Brief description…' })}
                                className="modern-input h-11 text-sm" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('technical_notes', { defaultValue: 'Technical Notes' })}
                            </label>
                            <textarea rows={3} value={formData.tutorial_text}
                                onChange={e => setFormData({ ...formData, tutorial_text: e.target.value })}
                                placeholder={t('detailed_notes_placeholder', { defaultValue: 'Detailed technical notes…' })}
                                className="modern-input p-3 text-sm resize-none" />
                        </div>
                    </>
                )}

                {/* -------- BULK / MULTIPLE FILES MODE -------- */}
                {uploadMode === 'bulk' && (
                    <div className="space-y-3">
                        <div className="relative group cursor-pointer">
                            <input
                                ref={multiInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={e => setBulkFiles(Array.from(e.target.files))}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                            />
                            <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl p-8 flex flex-col items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/10 group-hover:border-indigo-500 transition-colors">
                                <FolderOpenIcon className="h-10 w-10 text-indigo-400" />
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">
                                    {t('click_to_select_files', { defaultValue: 'Click to Select Multiple Files' })}
                                </p>
                                <p className="text-[10px] text-gray-400">PDF, images, Word documents</p>
                            </div>
                        </div>
                        {bulkFiles.length > 0 && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {bulkFiles.length} {t('files_selected', { defaultValue: 'files selected' })}
                                </p>
                                {bulkFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <DocumentTextIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-xs">{f.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* -------- WHOLE FOLDER MODE -------- */}
                {uploadMode === 'folder' && (
                    <div className="space-y-3">
                        <div className="relative group cursor-pointer">
                            <input
                                ref={folderInputRef}
                                type="file"
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={e => setBulkFiles(Array.from(e.target.files))}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                            />
                            <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-2xl p-8 flex flex-col items-center gap-3 bg-amber-50/50 dark:bg-amber-900/10 group-hover:border-amber-500 transition-colors">
                                <FolderOpenIcon className="h-10 w-10 text-amber-500" />
                                <p className="text-sm font-black text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                                    {t('click_to_select_folder', { defaultValue: 'Click to Select Entire Folder' })}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    {t('folder_upload_hint', { defaultValue: 'All files inside the selected folder will be uploaded into the chosen category folder.' })}
                                </p>
                            </div>
                        </div>
                        {bulkFiles.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/40">
                                <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">
                                    {bulkFiles.length} {t('files_ready', { defaultValue: 'files ready to upload' })}
                                </p>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {bulkFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <DocumentTextIcon className="h-3 w-3 text-amber-500 shrink-0" />
                                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* -------- EXTERNAL LINK MODE -------- */}
                {uploadMode === 'link' && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('external_url_label', { defaultValue: 'External URL' })} *
                            </label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                                <input
                                    type="url"
                                    value={formData.external_url}
                                    onChange={e => setFormData({ ...formData, external_url: e.target.value })}
                                    placeholder="https://www.iec.ch/standards/..."
                                    className="modern-input h-12 pl-10 text-sm font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('display_title', { defaultValue: 'Display Title' })} *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder={t('protocol_title_placeholder', { defaultValue: 'e.g. IEC 60364-4-41 — Protection Against Shock' })}
                                className="modern-input h-12 font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('description', { defaultValue: 'Description' })}
                            </label>
                            <input type="text" value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('short_desc_placeholder', { defaultValue: 'Brief description…' })}
                                className="modern-input h-11 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {t('technical_notes', { defaultValue: 'Technical Notes' })}
                            </label>
                            <textarea rows={3} value={formData.tutorial_text}
                                onChange={e => setFormData({ ...formData, tutorial_text: e.target.value })}
                                placeholder={t('detailed_notes_placeholder', { defaultValue: 'Detailed technical notes…' })}
                                className="modern-input p-3 text-sm resize-none" />
                        </div>
                    </>
                )}

                {/* Global toggle for superadmin */}
                {user?.is_superuser && (
                    <div
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            isGlobal
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40'
                                : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700'
                        }`}
                        onClick={() => setIsGlobal(g => !g)}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isGlobal ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                <GlobeAltIcon className="h-4 w-4" />
                            </div>
                            <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                {t('global_visibility', { defaultValue: 'Global (all tenants)' })}
                            </p>
                        </div>
                        <div className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${isGlobal ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isGlobal ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default CreateTutorialModal;