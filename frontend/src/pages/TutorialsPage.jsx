import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import CableSizingCalculator from '../components/CableSizingCalculator';
import ConduitFillCalculator from '../components/ConduitFillCalculator';
import PhaseBalancingCalculator from '../components/PhaseBalancingCalculator';
import VoltageDropCalculator from '../components/VoltageDropCalculator';
import ShortCircuitCalculator from '../components/ShortCircuitCalculator';
import CreateTutorialModal from '../components/CreateTutorialModal';
import CreateFolderModal from '../components/CreateFolderModal';
import PageHeader from '../components/PageHeader';
import {
    CalculatorIcon,
    BookOpenIcon,
    BoltIcon,
    ChartBarIcon,
    BeakerIcon,
    WrenchScrewdriverIcon,
    ArrowTopRightOnSquareIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    PhotoIcon,
    DocumentTextIcon,
    XMarkIcon,
    FolderOpenIcon,
    FolderPlusIcon,
    LinkIcon,
    TrashIcon,
    GlobeAltIcon,
    ChevronRightIcon,
    DocumentArrowDownIcon,
    InformationCircleIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { FolderIcon } from '@heroicons/react/24/solid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(tut) {
    if (tut.content_type?.startsWith('image/') || tut.image_path) return 'image';
    if (tut.content_type === 'application/pdf' || tut.file_path?.endsWith('.pdf')) return 'pdf';
    if (tut.external_url) return 'link';
    return 'doc';
}

function buildUrl(path) {
    if (!path) return null;
    const base = axiosInstance.defaults.baseURL || '';
    const cleanBase = base.includes('/api') ? base.split('/api')[0] : base;
    return `${cleanBase}/${path}`;
}

// ---------------------------------------------------------------------------
// TutorialsPage
// ---------------------------------------------------------------------------
function TutorialsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Data
    const [folders, setFolders] = useState([]);
    const [tutorials, setTutorials] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeFolderId, setActiveFolderId] = useState('all'); // 'all' | number
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('registry'); // 'registry' | 'calculators'
    const [activeTutorial, setActiveTutorial] = useState(null);
    const [renamingFolder, setRenamingFolder] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Modals
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [defaultUploadFolder, setDefaultUploadFolder] = useState(null);

    const canManage = user && (user.is_superuser || ['admin', 'project manager', 'team_lead'].includes(user.role));

    // -------------------------------------------------------------------------
    // Data fetching
    // -------------------------------------------------------------------------
    const fetchFolders = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/tutorials/folders/');
            setFolders(Array.isArray(res.data) ? res.data : []);
        } catch {
            console.error('Failed to fetch tutorial folders');
        }
    }, []);

    const fetchTutorials = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/tutorials/');
            setTutorials(Array.isArray(res.data) ? res.data : []);
        } catch {
            console.error('Failed to fetch tutorials');
        }
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchFolders(), fetchTutorials()]);
        setLoading(false);
    }, [fetchFolders, fetchTutorials]);

    useEffect(() => { refresh(); }, [refresh]);

    // -------------------------------------------------------------------------
    // Filtering
    // -------------------------------------------------------------------------
    const filteredTutorials = tutorials.filter(t => {
        const matchesFolder =
            activeFolderId === 'all' ||
            String(t.folder_id) === String(activeFolderId);
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            !q ||
            t.title?.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.original_filename?.toLowerCase().includes(q);
        return matchesFolder && matchesSearch;
    });

    // Group tutorials by folder for "All" view
    const groupedByFolder = React.useMemo(() => {
        if (activeFolderId !== 'all') return null;
        const groups = {};
        filteredTutorials.forEach(tut => {
            const key = tut.folder_name || tut.category || 'Uncategorized';
            if (!groups[key]) groups[key] = [];
            groups[key].push(tut);
        });
        return groups;
    }, [activeFolderId, filteredTutorials]);

    // -------------------------------------------------------------------------
    // Delete actions
    // -------------------------------------------------------------------------
    const handleDeleteTutorial = async (id) => {
        if (!window.confirm(t('confirm_delete_tutorial', { defaultValue: 'Remove this entry from the registry?' }))) return;
        try {
            await axiosInstance.delete(`/tutorials/${id}`);
            toast.success(t('tutorial_deleted', { defaultValue: 'Entry removed.' }));
            setTutorials(prev => prev.filter(t => t.id !== id));
            if (activeTutorial?.id === id) setActiveTutorial(null);
        } catch {
            toast.error(t('delete_failed', { defaultValue: 'Failed to delete entry.' }));
        }
    };

    const handleDeleteFolder = async (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        const count = tutorials.filter(t => t.folder_id === folderId).length;
        if (!window.confirm(
            t('confirm_delete_folder', {
                defaultValue: `Delete folder "${folder?.name}" and all ${count} entries inside?`,
                name: folder?.name,
                count,
            })
        )) return;
        try {
            await axiosInstance.delete(`/tutorials/folders/${folderId}`);
            toast.success(t('folder_deleted', { defaultValue: 'Folder deleted.' }));
            if (String(activeFolderId) === String(folderId)) setActiveFolderId('all');
            await refresh();
        } catch {
            toast.error(t('delete_failed', { defaultValue: 'Failed to delete folder.' }));
        }
    };

    const handleRenameFolder = async (folderId) => {
        if (!renameValue.trim()) return;
        try {
            await axiosInstance.patch(`/tutorials/folders/${folderId}`, {
                name: renameValue.trim(),
                sort_order: folders.find(f => f.id === folderId)?.sort_order ?? 0,
            });
            toast.success(t('folder_renamed', { defaultValue: 'Folder renamed.' }));
            setRenamingFolder(null);
            setRenameValue('');
            await refresh();
        } catch {
            toast.error(t('rename_failed', { defaultValue: 'Failed to rename folder.' }));
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    const activeFolder = folders.find(f => String(f.id) === String(activeFolderId));

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-8xl animate-in fade-in duration-500">

            {/* Modals */}
            <CreateFolderModal
                isOpen={folderModalOpen}
                onClose={() => setFolderModalOpen(false)}
                onSuccess={async (newFolder) => {
                    await refresh();
                    setActiveFolderId(newFolder.id);
                }}
            />
            <CreateTutorialModal
                isOpen={uploadModalOpen}
                onClose={() => { setUploadModalOpen(false); setDefaultUploadFolder(null); }}
                onSuccess={refresh}
                folders={folders}
                defaultFolderId={defaultUploadFolder}
                onCreateFolder={() => { setUploadModalOpen(false); setFolderModalOpen(true); }}
            />

            {/* Tutorial Detail Overlay */}
            {activeTutorial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setActiveTutorial(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/60 to-transparent dark:from-indigo-950/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                                    <BookOpenIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                                        {activeTutorial.folder_name || activeTutorial.category || 'Uncategorized'}
                                    </p>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                        {activeTutorial.title}
                                    </h2>
                                </div>
                            </div>
                            <button onClick={() => setActiveTutorial(null)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer">
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 overflow-y-auto custom-scrollbar space-y-4">
                            {activeTutorial.description && (
                                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    {activeTutorial.description}
                                </p>
                            )}
                            {activeTutorial.tutorial_text ? (
                                <pre className="whitespace-pre-wrap leading-relaxed text-[13px] text-gray-700 dark:text-gray-200 font-sans">
                                    {activeTutorial.tutorial_text}
                                </pre>
                            ) : (
                                <p className="text-[12px] text-gray-400 italic">
                                    {t('no_detailed_text', { defaultValue: 'No detailed notes stored for this entry.' })}
                                </p>
                            )}

                            {/* File/Link actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {activeTutorial.image_path && (
                                    <a href={buildUrl(activeTutorial.image_path)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition">
                                        <PhotoIcon className="h-4 w-4" /> View Schematic
                                    </a>
                                )}
                                {activeTutorial.file_path && (
                                    <a href={buildUrl(activeTutorial.file_path)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-100 transition">
                                        <DocumentArrowDownIcon className="h-4 w-4" /> Download
                                    </a>
                                )}
                                {activeTutorial.external_url && (
                                    <a href={activeTutorial.external_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-green-100 transition">
                                        <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open Link
                                    </a>
                                )}
                            </div>

                            {activeTutorial.is_global && (
                                <div className="flex items-center gap-2 mt-2">
                                    <GlobeAltIcon className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Global Resource</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <PageHeader
                icon={BookOpenIcon}
                title={t('utilities_knowledge_base', { defaultValue: 'Engineering Knowledge Base' })}
                subtitle={t('utilities_knowledge_base_desc', { defaultValue: 'Technical Schematics, Field Guides, Standards & Engineering Calculators' })}
                stats={[
                    { label: `${folders.length} ${t('folders_stat', { defaultValue: 'Folders' })}`, dotColor: 'bg-indigo-400' },
                    { label: `${tutorials.length} ${t('entries_stat', { defaultValue: 'Entries' })}`, dotColor: 'bg-green-400 animate-pulse' },
                ]}
                actions={
                    canManage && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFolderModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 font-black text-[10px] uppercase tracking-widest rounded-xl transition hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
                            >
                                <FolderPlusIcon className="h-4 w-4" />
                                {t('new_folder', { defaultValue: 'New Folder' })}
                            </button>
                            <button
                                onClick={() => { setDefaultUploadFolder(activeFolderId !== 'all' ? activeFolderId : null); setUploadModalOpen(true); }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/30 transform active:scale-95 cursor-pointer"
                            >
                                <PlusIcon className="h-4 w-4" />
                                {t('upload_files', { defaultValue: 'Upload Files' })}
                            </button>
                        </div>
                    )
                }
            />

            {/* Main Tab Switch */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl mb-6 w-fit">
                {[
                    { key: 'registry', icon: FolderOpenIcon, label: t('registry_title', { defaultValue: 'Registry' }) },
                    { key: 'calculators', icon: CalculatorIcon, label: t('calculators', { defaultValue: 'Calculators' }) },
                ].map(({ key, icon: Icon, label }) => (
                    <button key={key} type="button" onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                            activeTab === key
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                        }`}>
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ================================================================
                REGISTRY TAB
            ================================================================ */}
            {activeTab === 'registry' && (
                <div className="flex gap-6 min-h-[600px]">

                    {/* ---- LEFT: Folder Sidebar ---- */}
                    <aside className="w-60 shrink-0 space-y-1">
                        <div className="mb-3 px-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                {t('categories', { defaultValue: 'Categories' })}
                            </p>
                        </div>

                        {/* All Entries */}
                        <SidebarFolder
                            name={t('all_entries', { defaultValue: 'All Entries' })}
                            count={tutorials.length}
                            isActive={activeFolderId === 'all'}
                            isGlobal={false}
                            onClick={() => setActiveFolderId('all')}
                        />

                        {/* Folder list */}
                        {loading ? (
                            <div className="space-y-2 pt-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : folders.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <FolderIcon className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                                    {t('no_folders_yet', { defaultValue: 'No folders yet' })}
                                </p>
                                {canManage && (
                                    <button onClick={() => setFolderModalOpen(true)}
                                        className="mt-3 text-[9px] text-indigo-500 hover:text-indigo-700 font-black uppercase tracking-widest cursor-pointer">
                                        + {t('create_first_folder', { defaultValue: 'Create First Folder' })}
                                    </button>
                                )}
                            </div>
                        ) : folders.map(folder => {
                            const count = tutorials.filter(t => t.folder_id === folder.id).length;
                            const isActive = String(activeFolderId) === String(folder.id);
                            const isRenaming = renamingFolder === folder.id;

                            return (
                                <div key={folder.id} className="group relative">
                                    {isRenaming ? (
                                        <div className="flex items-center gap-1 px-2 py-1">
                                            <input
                                                autoFocus
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleRenameFolder(folder.id);
                                                    if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue(''); }
                                                }}
                                                className="flex-1 text-xs bg-white dark:bg-gray-800 border border-indigo-400 rounded-lg px-2 py-1 outline-none"
                                            />
                                            <button onClick={() => handleRenameFolder(folder.id)}
                                                className="text-[8px] font-black text-indigo-600 uppercase cursor-pointer">OK</button>
                                            <button onClick={() => { setRenamingFolder(null); setRenameValue(''); }}
                                                className="text-[8px] font-black text-gray-400 uppercase cursor-pointer">✕</button>
                                        </div>
                                    ) : (
                                        <SidebarFolder
                                            name={folder.name}
                                            count={count}
                                            isActive={isActive}
                                            isGlobal={folder.is_global}
                                            onClick={() => setActiveFolderId(folder.id)}
                                            onRename={canManage ? () => { setRenamingFolder(folder.id); setRenameValue(folder.name); } : null}
                                            onDelete={canManage ? () => handleDeleteFolder(folder.id) : null}
                                            onUpload={canManage ? () => { setDefaultUploadFolder(folder.id); setUploadModalOpen(true); } : null}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </aside>

                    {/* ---- RIGHT: Content Area ---- */}
                    <div className="flex-1 min-w-0">
                        {/* Top bar: search + folder name */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className="relative flex-1 max-w-sm">
                                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('search_schematics', { defaultValue: 'Search…' })}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full h-10 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {activeFolder && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                            {activeFolder.name}
                                        </span>
                                        {activeFolder.is_global && (
                                            <GlobeAltIcon className="h-3.5 w-3.5 text-amber-500" title="Global folder" />
                                        )}
                                    </div>
                                )}
                                <span className="text-[10px] font-mono text-gray-400">
                                    {filteredTutorials.length} {t('entries_stat', { defaultValue: 'entries' })}
                                </span>
                            </div>
                            {canManage && activeFolderId !== 'all' && (
                                <button
                                    onClick={() => { setDefaultUploadFolder(activeFolderId); setUploadModalOpen(true); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition cursor-pointer"
                                >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    {t('upload_here', { defaultValue: 'Upload Here' })}
                                </button>
                            )}
                        </div>

                        {/* Content: grouped by folder (All) or flat list */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {[1,2,3,4,5,6].map(i => (
                                    <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredTutorials.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <SparklesIcon className="h-10 w-10 mb-4 opacity-40" />
                                <p className="text-xs font-black uppercase tracking-widest">
                                    {searchTerm
                                        ? t('no_matching_protocols', { defaultValue: 'No matching entries found.' })
                                        : t('folder_empty', { defaultValue: 'This folder is empty. Upload files to get started.' })}
                                </p>
                                {canManage && !searchTerm && (
                                    <button
                                        onClick={() => { setDefaultUploadFolder(activeFolderId !== 'all' ? activeFolderId : null); setUploadModalOpen(true); }}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition cursor-pointer"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        {t('upload_files', { defaultValue: 'Upload Files' })}
                                    </button>
                                )}
                            </div>
                        ) : activeFolderId === 'all' && groupedByFolder ? (
                            /* Grouped view */
                            <div className="space-y-8">
                                {Object.entries(groupedByFolder).sort(([a], [b]) => a.localeCompare(b)).map(([folderName, items]) => (
                                    <div key={folderName}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <FolderIcon className="h-4 w-4 text-indigo-500" />
                                            <h3 className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                                                {folderName}
                                            </h3>
                                            <span className="text-[9px] font-mono text-gray-400 ml-1">({items.length})</span>
                                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/60 ml-2" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {items.map(tut => (
                                                <TutorialCard
                                                    key={tut.id}
                                                    tutorial={tut}
                                                    canManage={canManage}
                                                    onOpen={() => setActiveTutorial(tut)}
                                                    onDelete={() => handleDeleteTutorial(tut.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Flat view for specific folder */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredTutorials.map(tut => (
                                    <TutorialCard
                                        key={tut.id}
                                        tutorial={tut}
                                        canManage={canManage}
                                        onOpen={() => setActiveTutorial(tut)}
                                        onDelete={() => handleDeleteTutorial(tut.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                CALCULATORS TAB
            ================================================================ */}
            {activeTab === 'calculators' && (
                <div className="space-y-8">
                    <CalculatorSection
                        icon={<BoltIcon className="h-5 w-5" />}
                        title={t('calc_cable_sizing_title', { defaultValue: 'Cable Sizing Terminal' })}
                        subtitle="IEC / IST 200"
                        color="indigo"
                        desc={t('calc_cable_sizing_desc', { defaultValue: 'Determines minimum cross-sectional area based on load amperage, run distance, and correction factors.' })}
                    >
                        <CableSizingCalculator />
                    </CalculatorSection>

                    <CalculatorSection
                        icon={<BeakerIcon className="h-5 w-5" />}
                        title={t('calc_conduit_fill_title', { defaultValue: 'Conduit Fill Calculator' })}
                        subtitle="Geometry Engine"
                        color="teal"
                    >
                        <ConduitFillCalculator />
                    </CalculatorSection>

                    <CalculatorSection
                        icon={<ChartBarIcon className="h-5 w-5" />}
                        title={t('calc_phase_balance_title', { defaultValue: 'Phase Balance Analyzer' })}
                        subtitle="3Ø Balancer"
                        color="amber"
                    >
                        <PhaseBalancingCalculator />
                    </CalculatorSection>

                    <CalculatorSection
                        icon={<CalculatorIcon className="h-5 w-5" />}
                        title={t('calc_voltage_drop_title', { defaultValue: 'Voltage Drop Checker' })}
                        subtitle="Feeder Check"
                        color="purple"
                    >
                        <VoltageDropCalculator />
                    </CalculatorSection>

                    <CalculatorSection
                        icon={<BoltIcon className="h-5 w-5" />}
                        title={t('calc_short_circuit_title', { defaultValue: 'Short-Circuit Estimator' })}
                        subtitle="Fault Rating"
                        color="blue"
                    >
                        <ShortCircuitCalculator />
                    </CalculatorSection>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarFolder({ name, count, isActive, isGlobal, onClick, onRename, onDelete, onUpload }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
            }`}
            onClick={onClick}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {isGlobal
                ? <GlobeAltIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-200' : 'text-amber-500'}`} />
                : <FolderIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-200' : 'text-indigo-400'}`} />
            }
            <span className="flex-1 text-xs font-bold truncate">{name}</span>
            <span className={`text-[9px] font-mono shrink-0 ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>
                {count}
            </span>

            {/* Hover actions */}
            {showActions && (onRename || onDelete || onUpload) && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-gray-700 rounded-lg shadow-md border border-gray-100 dark:border-gray-600 px-1 py-0.5 z-10"
                    onClick={e => e.stopPropagation()}>
                    {onUpload && (
                        <button onClick={onUpload} title="Upload into folder"
                            className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 cursor-pointer">
                            <PlusIcon className="h-3 w-3" />
                        </button>
                    )}
                    {onRename && (
                        <button onClick={onRename} title="Rename folder"
                            className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-500 cursor-pointer">
                            <PencilSquareIcon className="h-3 w-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} title="Delete folder"
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 cursor-pointer">
                            <TrashIcon className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function TutorialCard({ tutorial, canManage, onOpen, onDelete }) {
    const fileType = getFileIcon(tutorial);

    const typeConfig = {
        image: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: PhotoIcon, color: 'text-indigo-500', label: 'Image' },
        pdf:   { bg: 'bg-red-50 dark:bg-red-900/20',     icon: DocumentTextIcon, color: 'text-red-500', label: 'PDF' },
        link:  { bg: 'bg-green-50 dark:bg-green-900/20', icon: LinkIcon, color: 'text-green-500', label: 'Link' },
        doc:   { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: DocumentTextIcon, color: 'text-blue-500', label: 'Doc' },
    }[fileType];

    const TypeIcon = typeConfig.icon;

    const openTarget = tutorial.external_url || buildUrl(tutorial.file_path) || buildUrl(tutorial.image_path);

    return (
        <div className="group relative bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden">

            {/* Top strip */}
            <div className={`h-1 w-full ${fileType === 'image' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : fileType === 'pdf' ? 'bg-gradient-to-r from-red-400 to-rose-500' : fileType === 'link' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-cyan-500'}`} />

            <div className="p-4 cursor-pointer" onClick={onOpen}>
                {/* Type badge + global indicator */}
                <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${typeConfig.bg}`}>
                        <TypeIcon className={`h-3 w-3 ${typeConfig.color}`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${typeConfig.color}`}>
                            {typeConfig.label}
                        </span>
                    </div>
                    {tutorial.is_global && (
                        <GlobeAltIcon className="h-3.5 w-3.5 text-amber-400" title="Global resource" />
                    )}
                </div>

                {/* Title */}
                <h3 className="text-[13px] font-black text-gray-900 dark:text-white leading-tight mb-1.5 line-clamp-2">
                    {tutorial.title}
                </h3>

                {/* Description */}
                {tutorial.description && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {tutorial.description}
                    </p>
                )}

                {/* File size */}
                {tutorial.file_size_bytes > 0 && (
                    <p className="text-[9px] text-gray-400 font-mono">{formatBytes(tutorial.file_size_bytes)}</p>
                )}
            </div>

            {/* Action footer */}
            <div className="px-4 pb-3 flex items-center gap-2">
                {openTarget && (
                    <a
                        href={openTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition bg-gray-100 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-gray-600 dark:text-gray-300 cursor-pointer"
                    >
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        {tutorial.external_url ? 'Open' : 'View'}
                    </a>
                )}
                <button
                    onClick={e => { e.stopPropagation(); onOpen(); }}
                    className="h-8 px-3 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition cursor-pointer"
                    title="View details"
                >
                    <InformationCircleIcon className="h-4 w-4" />
                </button>
                {canManage && (
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="h-8 w-8 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        title="Delete"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

function CalculatorSection({ icon, title, subtitle, color, desc, children }) {
    const colorMap = {
        indigo: 'from-indigo-50/50 via-purple-50/30 dark:from-indigo-950/20 dark:via-purple-950/10',
        teal:   'from-indigo-50/50 via-teal-50/30 dark:from-indigo-950/20 dark:via-teal-950/10',
        amber:  'from-indigo-50/50 via-amber-50/30 dark:from-indigo-950/20 dark:via-amber-950/10',
        purple: 'from-indigo-50/50 via-purple-50/30 dark:from-indigo-950/20 dark:via-purple-950/10',
        blue:   'from-indigo-50/50 via-blue-50/30 dark:from-indigo-950/20 dark:via-blue-950/10',
    };
    return (
        <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
            <div className={`p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r ${colorMap[color] || colorMap.indigo} to-transparent`}>
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{title}</h2>
                        {subtitle && <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {subtitle && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                        {subtitle}
                    </span>
                )}
            </div>
            <div className="p-6">
                {desc && (
                    <div className="mb-6 p-4 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 flex gap-3 items-center">
                        <InformationCircleIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                        <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">{desc}</p>
                    </div>
                )}
                {children}
            </div>
        </section>
    );
}

export default TutorialsPage;