import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import Modal from './Modal';
import { FolderPlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

function CreateFolderModal({ isOpen, onClose, onSuccess }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isGlobal, setIsGlobal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (!trimmed) return toast.warn(t('folder_name_required', { defaultValue: 'Folder name is required.' }));

        setSubmitting(true);
        try {
            const res = await axiosInstance.post('/tutorials/folders/', {
                name: trimmed,
                description: description.trim() || null,
                is_global: user?.is_superuser && isGlobal,
                sort_order: 0,
            });
            toast.success(t('folder_created', { defaultValue: 'Folder created successfully.' }));
            onSuccess(res.data);
            setName('');
            setDescription('');
            setIsGlobal(false);
            onClose();
        } catch (err) {
            toast.error(t('folder_create_failed', { defaultValue: 'Failed to create folder.' }));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleSubmit}
            title={t('new_folder', { defaultValue: 'New Category Folder' })}
            confirmText={submitting ? t('creating', { defaultValue: 'Creating…' }) : t('create_folder', { defaultValue: 'Create Folder' })}
        >
            <div className="space-y-5 py-2">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                        <FolderPlusIcon className="h-5 w-5" />
                    </div>
                    <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-200 leading-relaxed">
                        {t('folder_category_info', { defaultValue: 'Each folder you create becomes a category in the knowledge base. All files uploaded into it will be grouped under this category.' })}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {t('folder_name', { defaultValue: 'Folder Name' })} *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={t('folder_name_placeholder', { defaultValue: 'e.g. IEC Standards, Wiring Schematics…' })}
                        className="modern-input h-12 font-bold text-sm"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        {t('description_optional', { defaultValue: 'Description (optional)' })}
                    </label>
                    <textarea
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={t('folder_desc_placeholder', { defaultValue: 'Brief description of what this folder contains…' })}
                        className="modern-input p-3 text-sm resize-none"
                    />
                </div>

                {user?.is_superuser && (
                    <div
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                            isGlobal
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
                                : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700'
                        }`}
                        onClick={() => setIsGlobal(g => !g)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isGlobal ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                <GlobeAltIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
                                    {t('global_folder', { defaultValue: 'Global Folder' })}
                                </p>
                                <p className="text-[9px] text-gray-400">
                                    {t('visible_all_tenants', { defaultValue: 'Visible to all RafApp tenants' })}
                                </p>
                            </div>
                        </div>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGlobal ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${isGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default CreateFolderModal;
