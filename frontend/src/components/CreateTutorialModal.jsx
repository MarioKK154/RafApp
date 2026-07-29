import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { 
    PhotoIcon, 
    DocumentTextIcon, 
    TagIcon,
    GlobeAltIcon,
    ExclamationTriangleIcon,
    DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

const CATEGORIES = [
    { value: 'fire_system', label: 'Fire Systems' },
    { value: 'lights_system', label: 'Lighting Systems' },
    { value: 'dali_system', label: 'DALI & Controls' },
    { value: 'smart_home', label: 'Smart Homes / IoT' },
    { value: 'access_system', label: 'Access & Security' },
    { value: 'industrial', label: 'Industrial & 3-Phase' },
    { value: 'distribution', label: 'Panels & Distribution' },
    { value: 'ev_charging', label: 'EV Charging' },
    { value: 'renewables', label: 'Solar & Renewables' },
    { value: 'data_comms', label: 'Data & Networking' },
    { value: 'safety_code', label: 'Safety Code' },
    { value: 'tools_equip', label: 'Tool Manuals' }
];

function CreateTutorialModal({ isOpen, onClose, onSuccess }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        category: 'industrial',
        description: '',
        tutorial_text: ''
    });
    
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);

    const handleSubmit = async () => {
        if (!formData.title) return toast.warn(t('protocol_title_required', { defaultValue: 'Protocol title is required.' }));
        
        setIsSubmitting(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('category', formData.category);
        data.append('description', formData.description);
        data.append('tutorial_text', formData.tutorial_text);
        
        if (user?.is_superuser && isGlobal) {
            data.append('is_global', 'true');
        }

        if (selectedImage) data.append('image', selectedImage);
        if (selectedPdf) data.append('pdf_file', selectedPdf);

        try {
            await axiosInstance.post('/tutorials/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(t('protocol_indexed', { defaultValue: 'Technical protocol successfully indexed.' }));
            
            // Reset
            setFormData({ title: '', category: 'industrial', description: '', tutorial_text: '' });
            setSelectedImage(null);
            setSelectedPdf(null);
            setIsGlobal(false);
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Create tutorial failed:', error);
            toast.error(t('registry_injection_failed', { defaultValue: 'Registry injection failed.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            onConfirm={handleSubmit}
            title={t('init_tech_protocol', { defaultValue: 'Initialize Technical Protocol' })}
            confirmText={isSubmitting ? t('syncing', { defaultValue: 'Syncing...' }) : t('push_to_registry', { defaultValue: 'Push to Registry' })}
        >
            <div className="space-y-6 py-2">
                
                {/* Global Toggle (Superadmin Only) */}
                {user?.is_superuser && (
                    <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                        isGlobal ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/40'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isGlobal ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <GlobeAltIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('global_visibility', { defaultValue: 'Global Visibility' })}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{t('make_visible_all_tenants', { defaultValue: 'Make visible to all RafApp tenants' })}</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setIsGlobal(!isGlobal)} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGlobal ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGlobal ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <TagIcon className="h-3 w-3" /> {t('protocol_identification', { defaultValue: 'Protocol Identification' })}
                    </label>
                    <input 
                        type="text" 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        placeholder={t('protocol_title_placeholder', { defaultValue: 'e.g. Standard 3-Phase Panel Layout' })}
                        className="modern-input h-14 font-black uppercase text-xs" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('classification', { defaultValue: 'Classification' })}</label>
                        <select 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value})} 
                            className="modern-input h-14 text-[10px] font-black uppercase"
                        >
                            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{t(cat.value, { defaultValue: cat.label })}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('schematic_jpg_png', { defaultValue: 'Schematic (JPG/PNG)' })}</label>
                        <div className="relative group">
                            <input type="file" onChange={e => setSelectedImage(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                            <div className="modern-input h-14 flex items-center justify-between px-4 group-hover:border-indigo-400 transition-colors">
                                <span className="text-[9px] font-bold text-gray-400 truncate w-20">{selectedImage ? selectedImage.name : t('image', { defaultValue: 'Image' })}</span>
                                <PhotoIcon className="h-5 w-5 text-indigo-500" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('manual_pdf', { defaultValue: 'Manual (PDF)' })}</label>
                        <div className="relative group">
                            <input type="file" onChange={e => setSelectedPdf(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".pdf" />
                            <div className="modern-input h-14 flex items-center justify-between px-4 group-hover:border-red-400 transition-colors">
                                <span className="text-[9px] font-bold text-gray-400 truncate w-20">{selectedPdf ? selectedPdf.name : t('pdf', { defaultValue: 'PDF' })}</span>
                                <DocumentArrowUpIcon className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('tactical_summary', { defaultValue: 'Tactical Summary' })}</label>
                    <input 
                        type="text" 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        placeholder={t('short_desc_placeholder', { defaultValue: 'Short description for gallery...' })}
                        className="modern-input h-14 text-xs font-bold" 
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('methodology', { defaultValue: 'Methodology' })}</label>
                    <textarea 
                        rows="4" 
                        value={formData.tutorial_text} 
                        onChange={e => setFormData({...formData, tutorial_text: e.target.value})} 
                        placeholder={t('detailed_notes_placeholder', { defaultValue: 'Detailed technical notes...' })}
                        className="modern-input p-5 text-xs font-medium leading-relaxed resize-none"
                    ></textarea>
                </div>

                <div className="flex gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 shrink-0" />
                    <p className="text-[9px] font-bold text-orange-700 dark:text-orange-400 uppercase leading-normal">
                        {t('verify_schematics_warning', { defaultValue: 'Verify all schematics against current ÍST 200 standards before indexing. Regulatory compliance is mandatory.' })}
                    </p>
                </div>
            </div>
        </Modal>
    );
}

export default CreateTutorialModal;