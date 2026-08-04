import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import CableSizingCalculator from '../components/CableSizingCalculator';
import ConduitFillCalculator from '../components/ConduitFillCalculator';
import PhaseBalancingCalculator from '../components/PhaseBalancingCalculator';
import VoltageDropCalculator from '../components/VoltageDropCalculator';
import ShortCircuitCalculator from '../components/ShortCircuitCalculator';
import CreateTutorialModal from '../components/CreateTutorialModal';
import PageHeader from '../components/PageHeader';
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
    DocumentTextIcon,
    XMarkIcon,
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
    const { t } = useTranslation();
    const { user } = useAuth();
    const [tutorials, setTutorials] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTutorial, setActiveTutorial] = useState(null);

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

            {/* Tutorial detail overlay */}
            {activeTutorial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                    <BookOpenIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                                        {t('category_' + activeTutorial.category, { defaultValue: CATEGORY_LABELS[activeTutorial.category] || activeTutorial.category })}
                                    </p>
                                    <h2 className="text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight mt-1">
                                        {activeTutorial.title}
                                    </h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTutorial(null)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-4 overflow-y-auto custom-scrollbar space-y-4 text-sm text-gray-700 dark:text-gray-200">
                            {activeTutorial.description && (
                                <p className="font-semibold text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                    {activeTutorial.description}
                                </p>
                            )}
                            {activeTutorial.tutorial_text ? (
                                <p className="whitespace-pre-line leading-relaxed text-[13px]">
                                    {activeTutorial.tutorial_text}
                                </p>
                            ) : (
                                <p className="text-[12px] text-gray-500 italic">
                                    {t('no_detailed_text', { defaultValue: 'No detailed text stored for this entry yet. Use the schematic/manual buttons if available.' })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                icon={BookOpenIcon}
                title={t('utilities_knowledge_base', { defaultValue: 'Engineering Knowledge Base & Calculators' })}
                subtitle={t('utilities_knowledge_base_desc', { defaultValue: 'Standardized Technical Schematics, Field Guides & Engineering Calculators' })}
                stats={[
                    { label: `${filteredTutorials.length} ${t('protocols', { defaultValue: 'Protocols' })}`, dotColor: 'bg-green-400 animate-pulse' },
                ]}
                actions={
                    canCreate && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/30 transform active:scale-95 cursor-pointer"
                        >
                            <PlusIcon className="h-5 w-5" /> {t('create_protocol', { defaultValue: 'Create Protocol' })}
                        </button>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Engineering Calculators (7 cols) */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Cable Sizing Module */}
                    <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                                    <BoltIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('calc_cable_sizing_title', { defaultValue: 'Cable Sizing Terminal' })}</h2>
                                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{t('calc_cable_sizing_subtitle', { defaultValue: 'IST 200 Standard Compliant' })}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                                IEC / IST 200
                            </span>
                        </div>
                        <div className="p-6">
                            <div className="mb-6 p-4 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 flex gap-3 items-center">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                                <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
                                    {t('calc_cable_sizing_desc', { defaultValue: 'Determines minimum cross-sectional area based on load amperage, run distance, and correction factors.' })}
                                </p>
                            </div>
                            <CableSizingCalculator />
                        </div>
                    </section>

                    {/* Conduit Fill Module */}
                    <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-teal-50/30 to-transparent dark:from-indigo-950/20 dark:via-teal-950/10 dark:to-transparent">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                                    <BeakerIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('calc_conduit_fill_title', { defaultValue: 'Conduit Fill Calculator' })}</h2>
                                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{t('calc_conduit_fill_subtitle', { defaultValue: 'Indicative fill based on conductor diameters' })}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                                Geometry Engine
                            </span>
                        </div>
                        <div className="p-6">
                            <ConduitFillCalculator />
                        </div>
                    </section>

                    {/* Phase Balancing Module */}
                    <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-amber-50/30 to-transparent dark:from-indigo-950/20 dark:via-amber-950/10 dark:to-transparent">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                                    <ChartBarIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('calc_phase_balance_title', { defaultValue: 'Phase Balance Analyzer' })}</h2>
                                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{t('calc_phase_balance_subtitle', { defaultValue: 'Visualize three-phase loading by circuit' })}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                                3Ø Balancer
                            </span>
                        </div>
                        <div className="p-6">
                            <PhaseBalancingCalculator />
                        </div>
                    </section>

                    {/* Voltage Drop Module */}
                    <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                                    <CalculatorIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('calc_voltage_drop_title', { defaultValue: 'Voltage Drop Checker' })}</h2>
                                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{t('calc_voltage_drop_subtitle', { defaultValue: 'Quick drop estimation along feeders' })}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                                Feeder Check
                            </span>
                        </div>
                        <div className="p-6">
                            <VoltageDropCalculator />
                        </div>
                    </section>

                    {/* Short-Circuit Current Module */}
                    <section className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xl shadow-indigo-500/5 overflow-hidden backdrop-blur-md">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-blue-50/30 to-transparent dark:from-indigo-950/20 dark:via-blue-950/10 dark:to-transparent">
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/30">
                                    <BoltIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('calc_short_circuit_title', { defaultValue: 'Short-Circuit Estimator' })}</h2>
                                    <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{t('calc_short_circuit_subtitle', { defaultValue: 'Approximate Ik at panel and breaker kA class' })}</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800/60 hidden sm:inline-block">
                                Fault Rating
                            </span>
                        </div>
                        <div className="p-6">
                            <ShortCircuitCalculator />
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: Library & Tutorials (5 cols) */}
                <div className="lg:col-span-5 space-y-8">
                    <section className="saas-card p-6 flex flex-col h-full min-h-[700px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl">
                                    <BookOpenIcon className="h-4 w-4 text-white" />
                                </div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('registry_title', { defaultValue: 'Registry' })}</h2>
                            </div>
                            <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                {filteredTutorials.length}
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder={t('search_schematics', { defaultValue: 'Search schematics...' })}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl pl-10 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                        {/* Category filter */}
                        <div className="mb-5 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('All')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {t('all_categories', { defaultValue: 'All' })}
                            </button>
                            {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedCategory(key)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${selectedCategory === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                                >
                                    {t('category_' + key, { defaultValue: label })}
                                </button>
                            ))}
                        </div>

                        {/* Protocol List */}
                        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-grow max-h-[500px]">
                            {filteredTutorials.length > 0 ? filteredTutorials.map(tutorial => (
                                <TutorialLink key={tutorial.id} tutorial={tutorial} onOpen={() => setActiveTutorial(tutorial)} />
                            )) : (
                                <div className="py-20 text-center text-gray-400 dark:text-gray-500">
                                    <SparklesIcon className="h-8 w-8 mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{t('no_matching_protocols', { defaultValue: 'No matching protocols found.' })}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <WrenchScrewdriverIcon className="h-4 w-4 text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t('support_registry', { defaultValue: 'Support Registry' })}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                {t('knowledge_base_version', { defaultValue: 'Knowledge base v3.1.0 · Jan 2026 Safety Protocols' })}
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
function TutorialLink({ tutorial, onOpen }) {
    const { t } = useTranslation();
    const getFullUrl = (path) => {
        const base = axiosInstance.defaults.baseURL || "";
        const cleanBase = base.includes('/api') ? base.split('/api')[0] : base;
        return `${cleanBase}/${path}`;
    };

    return (
        <div className="group w-full p-5 bg-gray-50 dark:bg-gray-700/50 rounded-3xl border border-gray-100 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer" onClick={onOpen}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                    {t('category_' + tutorial.category, { defaultValue: CATEGORY_LABELS[tutorial.category] || tutorial.category })}
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
                        <PhotoIcon className="h-3 w-3" /> {t('schematic', { defaultValue: 'Schematic' })}
                    </button>
                )}
                {tutorial.file_path && (
                    <button 
                        onClick={() => window.open(getFullUrl(tutorial.file_path), '_blank')}
                        className="flex-1 h-8 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2 text-red-700 dark:text-red-300 hover:text-white"
                    >
                        <DocumentTextIcon className="h-3 w-3" /> {t('manual', { defaultValue: 'Manual' })}
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
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl mb-4 text-gray-400">
                {React.cloneElement(icon, { className: "h-6 w-6" })}
            </div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{title}</h3>
            <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mt-2 italic tracking-widest">{t('system_dev_in_progress', { defaultValue: 'System Development in Progress' })}</span>
        </div>
    );
}

export default TutorialsPage;