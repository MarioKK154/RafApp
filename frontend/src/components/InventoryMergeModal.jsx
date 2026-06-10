import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export default function InventoryMergeModal({ isOpen, onClose, selectedItems, onMerge }) {
    const { t } = useTranslation();
    const [primaryId, setPrimaryId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!primaryId) return;
        
        setIsSaving(true);
        const secondaryIds = selectedItems.map(i => i.id).filter(id => id.toString() !== primaryId.toString());
        
        try {
            await onMerge({
                primary_item_id: parseInt(primaryId, 10),
                secondary_item_ids: secondaryIds
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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-orange-500 mr-2" />
                                        Merge Inventory Items
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="mt-2 text-sm text-gray-500 mb-6">
                                    You are about to merge <strong>{selectedItems.length}</strong> items. Select the primary item that will be kept. 
                                    All other items will have their shop links and references transferred to the primary item, and then they will be permanently deleted.
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Primary Item</label>
                                        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                                            {selectedItems.map((item) => (
                                                <label key={item.id} className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="primaryItem"
                                                        value={item.id}
                                                        checked={primaryId === item.id.toString()}
                                                        onChange={(e) => setPrimaryId(e.target.value)}
                                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <div className="ml-3 text-sm">
                                                        <span className="font-medium text-gray-900">{item.name}</span>
                                                        <div className="text-gray-500 text-xs mt-0.5">
                                                            {item.brand && <span className="mr-2">Brand: {item.brand}</span>}
                                                            {item.category && <span>Category: {item.category}</span>}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
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
                                            disabled={isSaving || !primaryId}
                                            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Merging...' : 'Merge Items'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
