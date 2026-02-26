import React from 'react';
import { 
    BookOpenIcon, 
    ShieldCheckIcon, 
    ScaleIcon, 
    DocumentTextIcon, 
    GlobeAltIcon,
    ArrowTopRightOnSquareIcon,
    ExclamationTriangleIcon,
    BuildingLibraryIcon
} from '@heroicons/react/24/outline';

function LawsPage() {
    // Structured data for legal resources
    const legalCategories = [
        {
            title: "National Safety Framework",
            description: "Core laws governing the security and safety of electrical installations in Iceland.",
            icon: <ShieldCheckIcon className="h-6 w-6 text-indigo-600" />,
            links: [
                { name: "Lög um öryggi raforkuvirkja (146/1996)", url: "https://www.althingi.is/lagas/153b/1996146.html" },
                { name: "Reglugerð um raforkuvirki (678/2009)", url: "https://www.reglugerd.is/reglugerdir/allar/nr/678-2009" }
            ]
        },
        {
            title: "Building & Construction",
            description: "Regulations handled by HMS regarding technical installation standards.",
            icon: <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />,
            links: [
                { name: "Byggingarreglugerð (112/2012)", url: "https://www.reglugerd.is/reglugerdir/allar/nr/112-2012" },
                { name: "HMS Electrical Safety Portal", url: "https://hms.is/rafmagn/oryggi-rafbunaðar" }
            ]
        },
        {
            title: "Technical Standards (ÍST)",
            description: "Icelandic and European standards (EN) for wiring and grounding protocols.",
            icon: <DocumentTextIcon className="h-6 w-6 text-indigo-600" />,
            links: [
                { name: "ÍST 200:2006 (Wiring Rules)", url: "https://www.stadlar.is/" },
                { name: "ÍST EN 50110 (Operation of Installations)", url: "https://www.stadlar.is/" }
            ]
        }
    ];

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="mb-10">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <BookOpenIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.2em]">Compliance Registry</span>
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-none mb-4">
                    Icelandic Electrical Laws & Standards <span className="inline-block ml-2">🇮🇸</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm leading-relaxed">
                    Access critical legal frameworks and technical regulations mandatory for all RafApp deployments. 
                    Ensure all site work complies with <strong className="text-gray-900 dark:text-white">HMS (Húsnæðis- og mannvirkjastofnun)</strong> requirements.
                </p>
                </div>
            </header>

            {/* Warning Note */}
            <div className="mb-10 p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-[2rem] flex items-start gap-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-1">Mandatory Compliance</p>
                    <p className="text-xs text-orange-600 dark:text-orange-300 font-medium leading-relaxed">
                        Violating National Electrical Codes (ÍST 200) can result in the revocation of commercial licenses and system shut-downs. 
                        Always consult the latest revisions on <a href="https://www.hms.is" target="_blank" className="underline font-bold">hms.is</a>.
                    </p>
                </div>
            </div>

            {/* Grid of Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {legalCategories.map((category, index) => (
                    <section key={index} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full group hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                {category.icon}
                            </div>
                            <BookOpenIcon className="h-5 w-5 text-gray-200 dark:text-gray-700" />
                        </div>

                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                            {category.title}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 flex-grow font-medium leading-relaxed">
                            {category.description}
                        </p>

                        <div className="space-y-3">
                            {category.links.map((link, lIndex) => (
                                <a 
                                    key={lIndex}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl group/link hover:bg-indigo-600 transition-all"
                                >
                                    <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest group-hover/link:text-white truncate pr-2">
                                        {link.name}
                                    </span>
                                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover/link:text-white shrink-0" />
                                </a>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* International/Standards Body Footer */}
            <footer className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <GlobeAltIcon className="h-8 w-8 text-gray-300" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Affiliated Bodies</p>
                        <p className="text-xs font-bold text-gray-500">CENELEC / IEC International Standards</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <img src="https://hms.is/assets/images/hms-logo.svg" alt="HMS" className="h-8 opacity-50 grayscale hover:grayscale-0 transition" title="Mannvirkjastofnun" />
                    <img src="https://www.stadlar.is/assets/images/logo.svg" alt="Staðlaráð" className="h-6 opacity-30 grayscale hover:grayscale-0 transition" title="Icelandic Standards Body" />
                </div>
            </footer>
        </div>
    );
}

export default LawsPage;