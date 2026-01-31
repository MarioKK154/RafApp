import React from 'react';
import CableSizingCalculator from '../components/CableSizingCalculator';
import { 
    CalculatorIcon, 
    BookOpenIcon, 
    BoltIcon, 
    ChartBarIcon, 
    BeakerIcon,
    ChevronLeftIcon,
    AcademicCapIcon,
    WrenchScrewdriverIcon,
    InformationCircleIcon,
    ArrowTopRightOnSquareIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

function TutorialsPage() {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            
            {/* Header Section */}
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <AcademicCapIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">RafApp Intelligence</span>
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none mb-4">
                    Utilities & Knowledge Base
                </h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm leading-relaxed font-medium">
                    Technical decision support tools and procedural documentation for electrical infrastructure deployment.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Engineering Calculators (8 cols) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Cable Sizing Module */}
                    <section className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <BoltIcon className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Cable Sizing Terminal</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Standards Compliant (IST 200)</p>
                                </div>
                            </div>
                        </div>
                        
                        

                        <div className="p-8">
                            <div className="mb-8 p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-4">
                                <InformationCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                    Determines minimum cross-sectional area based on load amperage, run distance, and environmental correction factors.
                                </p>
                            </div>

                            {/* THE COMPONENT */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-inner">
                                <CableSizingCalculator />
                            </div>
                        </div>
                    </section>

                    {/* Future Modules Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 opacity-60">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                    <ChartBarIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Voltage Drop</h3>
                            </div>
                            <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Developing Module...</span>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 opacity-60">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                    <BeakerIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Short Circuit Calcs</h3>
                            </div>
                            <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Developing Module...</span>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Column: Library & Tutorials (4 cols) */}
                <div className="lg:col-span-4 space-y-8">
                    <section className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl h-fit">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-600 rounded-xl">
                                <BookOpenIcon className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Manuals</h2>
                        </div>

                        <div className="space-y-4">
                            <TutorialLink title="Grounding & Bonding Protocols" category="Standards" />
                            <TutorialLink title="3-Phase Industrial Wiring" category="Configuration" />
                            <TutorialLink title="EV Charger Load Balancing" category="Technical" />
                            <TutorialLink title="Safe Site Decommissioning" category="Safety" />
                        </div>

                        <div className="mt-10 pt-8 border-t border-gray-800">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Latest Update</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                Technical library version 2.4.0 synced with January 2026 HMS regulatory guidelines.
                            </p>
                        </div>
                    </section>

                    <div className="p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-4 w-4" /> Support Registry
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium mb-6">
                            Can't find a specific calculation or wiring diagram? Request a technical module from the system administrator.
                        </p>
                        <button className="w-full h-12 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-indigo-100 dark:border-indigo-900 transition-all">
                            Submit Request
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Internal Helper: Tutorial Nav Link
 */
function TutorialLink({ title, category }) {
    return (
        <a href="#" className="group block p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl border border-gray-700 transition-all">
            <div className="flex justify-between items-start mb-1">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{category}</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-500 group-hover:text-white transition-colors" />
            </div>
            <p className="text-sm font-bold text-gray-100 group-hover:text-white transition-colors">{title}</p>
        </a>
    );
}

export default TutorialsPage;