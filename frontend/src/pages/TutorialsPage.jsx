import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import CableSizingCalculator from '../components/CableSizingCalculator';
import CreateTutorialModal from '../components/CreateTutorialModal';
import { 
    CalculatorIcon, 
    BookOpenIcon, 
    BoltIcon, 
    ChartBarIcon, 
    BeakerIcon,
    ListBulletIcon,
    WrenchScrewdriverIcon,
    InformationCircleIcon,
    ArrowTopRightOnSquareIcon,
    SparklesIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    PhotoIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

const CATEGORY_LABELS = {
    fire_system: "Fire Systems",
    lights_system: "Lighting Systems",
    dali_system: "DALI & Controls",
    smart_home: "Smart Homes / IoT",
    access_system: "Access & Security",
    industrial: "Industrial & 3-Phase",
    distribution: "Panels & Distribution",
    ev_charging: "EV Charging",
    renewables: "Solar & Renewables",
    data_comms: "Data & Networking",
    safety_code: "Safety Code",
    tools_equip: "Tool Manuals"
};

function TutorialsPage() {
    const { user } = useAuth();
    const [tutorials, setTutorials] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Permission Check
    const canCreate = user && (['admin', 'project manager', 'team leader'].includes(user.role) || user.is_superuser);

    /**
     * MISSION CONTROL: Registry Synchronization
     */
    const fetchTutorials = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/tutorials/');
            setTutorials(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Knowledge base sync failed:', error);
        }
    }, []);

    useEffect(() => {
        fetchTutorials();
    }, [fetchTutorials]);

    // Tactical Filter Logic
    const filteredTutorials = tutorials.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             t.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            
            {/* Modal for new protocols */}
            <CreateTutorialModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSuccess={fetchTutorials}
            />

            {/* Header Section */}
            <header className="mb-12">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <ListBulletIcon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.2em]">RafApp Intelligence</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none mb-4 tracking-tighter italic">
                        Utilities & Knowledge Base
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm leading-relaxed font-medium">
                        Standardized technical schematics, regulatory protocols, and standard engineering calculators for field deployment.
                    </p>
                </div>

                {canCreate && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition shadow-xl shadow-indigo-100 dark:shadow-none transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 stroke-[3px]" /> Create Protocol
                    </button>
                )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Engineering Calculators (7 cols) */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Cable Sizing Module */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <BoltIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Cable Sizing Terminal</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">IST 200 Standard Compliant</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="mb-8 p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-4">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                    Determines minimum cross-sectional area based on load amperage, run distance, and correction factors.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-inner">
                                <CableSizingCalculator />
                            </div>
                        </div>
                    </section>

                    {/* Future Modules Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DummyTool icon={<ChartBarIcon />} title="Voltage Drop" />
                        <DummyTool icon={<BeakerIcon />} title="Circuit Analysis" />
                    </div>
                </div>

                {/* RIGHT COLUMN: Library & Tutorials (5 cols) */}
                <div className="lg:col-span-5 space-y-8">
                    <section className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full min-h-[700px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl">
                                    <BookOpenIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Registry</h2>
                            </div>
                            <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                {filteredTutorials.length} Units
                            </span>
                        </div>

                        {/* Search Bar - Internal Library Style */}
                        <div className="relative mb-4">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search schematics..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl pl-12 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                        {/* Category filter */}
                        <div className="mb-6 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('All')}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                All
                            </button>
                            {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedCategory(key)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${selectedCategory === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Protocol List */}
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow max-h-[500px]">
                            {filteredTutorials.length > 0 ? filteredTutorials.map(tutorial => (
                                <TutorialLink key={tutorial.id} tutorial={tutorial} />
                            )) : (
                                <div className="py-20 text-center text-gray-400 dark:text-gray-500">
                                    <SparklesIcon className="h-8 w-8 mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No matching protocols found.</p>
                                </div>
                            )}
                        </div>

                        {/* Telemetry Footer */}
                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                                <WrenchScrewdriverIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Support Registry</span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium uppercase italic">
                                Knowledge base version 3.1.0 // Synced with Jan 2026 Safety Protocols.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

/**
 * COMPONENT: Protocol Item Link
 */
function TutorialLink({ tutorial }) {
    const getFullUrl = (path) => {
        const base = axiosInstance.defaults.baseURL || "";
        const cleanBase = base.includes('/api') ? base.split('/api')[0] : base;
        return `${cleanBase}/${path}`;
    };

    return (
        <div className="group w-full p-5 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-100 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                    {CATEGORY_LABELS[tutorial.category] || tutorial.category}
                </span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight mb-3">
                {tutorial.title}
            </p>
            
            {/* View Selection Row */}
            <div className="flex gap-2">
                {tutorial.image_path && (
                    <button 
                        onClick={() => window.open(getFullUrl(tutorial.image_path), '_blank')}
                        className="flex-1 h-8 bg-gray-200 dark:bg-gray-600 hover:bg-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 hover:text-white"
                    >
                        <PhotoIcon className="h-3 w-3" /> Schematic
                    </button>
                )}
                {tutorial.file_path && (
                    <button 
                        onClick={() => window.open(getFullUrl(tutorial.file_path), '_blank')}
                        className="flex-1 h-8 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2 text-red-700 dark:text-red-300 hover:text-white"
                    >
                        <DocumentTextIcon className="h-3 w-3" /> Manual
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * COMPONENT: Development Placeholder
 */
function DummyTool({ icon, title }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl mb-4 text-gray-400">
                {React.cloneElement(icon, { className: "h-6 w-6" })}
            </div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{title}</h3>
            <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mt-2 italic tracking-widest">System Development in Progress</span>
        </div>
    );
}

export default TutorialsPage;