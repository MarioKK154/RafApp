import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';

export default function InventoryCategoryModal({ isOpen, onClose, selectedIds, onSave }) {
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Stores the raw tuples: { master_category, category, subcategory }
    const [relations, setRelations] = useState([]);

    const [masterSelect, setMasterSelect] = useState('');
    const [masterNew, setMasterNew] = useState('');

    const [categorySelect, setCategorySelect] = useState('');
    const [categoryNew, setCategoryNew] = useState('');

    const [subcategorySelect, setSubcategorySelect] = useState('');
    const [subcategoryNew, setSubcategoryNew] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            setMasterSelect('');
            setMasterNew('');
            setCategorySelect('');
            setCategoryNew('');
            setSubcategorySelect('');
            setSubcategoryNew('');
        }
    }, [isOpen]);

    // Cascading resets
    useEffect(() => {
        setCategorySelect('');
        setCategoryNew('');
        setSubcategorySelect('');
        setSubcategoryNew('');
    }, [masterSelect]);

    useEffect(() => {
        setSubcategorySelect('');
        setSubcategoryNew('');
    }, [categorySelect]);

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
            const res = await axiosInstance.get('/inventory/catalog/all-categories-distinct');
            setRelations(res.data || []);
        } catch (err) {
            console.error('Failed to load categories', err);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    // Derived lists based on selection
    const availableMasters = useMemo(() => {
        const set = new Set(relations.map(r => r.master_category).filter(Boolean));
        return Array.from(set).sort();
    }, [relations]);

    const availableCategories = useMemo(() => {
        if (masterSelect === '[NEW]') return []; // No existing categories under a newly typed master
        let filtered = relations;
        if (masterSelect && masterSelect !== '[CLEAR]') {
            filtered = filtered.filter(r => r.master_category === masterSelect);
        }
        const set = new Set(filtered.map(r => r.category).filter(Boolean));
        return Array.from(set).sort();
    }, [relations, masterSelect]);

    const availableSubcategories = useMemo(() => {
        if (categorySelect === '[NEW]' || masterSelect === '[NEW]') return [];
        let filtered = relations;
        if (masterSelect && masterSelect !== '[CLEAR]') {
            filtered = filtered.filter(r => r.master_category === masterSelect);
        }
        if (categorySelect && categorySelect !== '[CLEAR]') {
            filtered = filtered.filter(r => r.category === categorySelect);
        }
        const set = new Set(filtered.map(r => r.subcategory).filter(Boolean));
        return Array.from(set).sort();
    }, [relations, masterSelect, categorySelect]);

    const getFinalValue = (selectVal, newVal) => {
        if (selectVal === '') return null; // Do not change
        if (selectVal === '[CLEAR]') return ''; // Map to empty string to clear it
        if (selectVal === '[NEW]') return newVal || null; // Use the typed text, or null if empty
        return selectVal;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const mCat = getFinalValue(masterSelect, masterNew);
            const cat = getFinalValue(categorySelect, categoryNew);
            const subCat = getFinalValue(subcategorySelect, subcategoryNew);

            await onSave({
                item_ids: selectedIds,
                master_category: mCat,
                category: cat,
                subcategory: subCat
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Move / Edit Category
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="mt-2 text-sm text-gray-500 mb-4">
                                    You are editing <strong>{selectedIds.length}</strong> item(s).
                                </div>

                                {isLoadingCategories ? (
                                    <div className="text-sm text-gray-500">Loading categories...</div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        
                                        {/* Master Category */}
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Master Category</label>
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-2"
                                                value={masterSelect}
                                                onChange={(e) => setMasterSelect(e.target.value)}
                                            >
                                                <option value="">-- Do not change --</option>
                                                <option value="[NEW]">+ Create New Folder...</option>
                                                <option value="[CLEAR]">- Clear (Remove) -</option>
                                                <optgroup label="Existing Folders">
                                                    {availableMasters.map(m => <option key={m} value={m}>{m}</option>)}
                                                </optgroup>
                                            </select>
                                            {masterSelect === '[NEW]' && (
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                    value={masterNew}
                                                    onChange={(e) => setMasterNew(e.target.value)}
                                                    placeholder="Type new Master Category..."
                                                />
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div className={`p-3 rounded-lg border transition-colors ${(!masterSelect || masterSelect === '[CLEAR]') ? 'bg-gray-100 border-gray-100 opacity-50 pointer-events-none' : 'bg-gray-50 border-gray-200'}`}>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-2"
                                                value={categorySelect}
                                                onChange={(e) => setCategorySelect(e.target.value)}
                                                disabled={!masterSelect || masterSelect === '[CLEAR]'}
                                            >
                                                <option value="">-- Do not change --</option>
                                                <option value="[NEW]">+ Create New Folder...</option>
                                                <option value="[CLEAR]">- Clear (Remove) -</option>
                                                <optgroup label="Existing Folders (Filtered by Master)">
                                                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </optgroup>
                                            </select>
                                            {categorySelect === '[NEW]' && (
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                    value={categoryNew}
                                                    onChange={(e) => setCategoryNew(e.target.value)}
                                                    placeholder="Type new Category..."
                                                />
                                            )}
                                        </div>

                                        {/* Subcategory */}
                                        <div className={`p-3 rounded-lg border transition-colors ${(!categorySelect || categorySelect === '[CLEAR]') ? 'bg-gray-100 border-gray-100 opacity-50 pointer-events-none' : 'bg-gray-50 border-gray-200'}`}>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Subcategory</label>
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-2"
                                                value={subcategorySelect}
                                                onChange={(e) => setSubcategorySelect(e.target.value)}
                                                disabled={!categorySelect || categorySelect === '[CLEAR]'}
                                            >
                                                <option value="">-- Do not change --</option>
                                                <option value="[NEW]">+ Create New Folder...</option>
                                                <option value="[CLEAR]">- Clear (Remove) -</option>
                                                <optgroup label="Existing Folders (Filtered by Category)">
                                                    {availableSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                                </optgroup>
                                            </select>
                                            {subcategorySelect === '[NEW]' && (
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                                    value={subcategoryNew}
                                                    onChange={(e) => setSubcategoryNew(e.target.value)}
                                                    placeholder="Type new Subcategory..."
                                                />
                                            )}
                                        </div>

                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {isSaving ? 'Saving...' : 'Apply Changes'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
