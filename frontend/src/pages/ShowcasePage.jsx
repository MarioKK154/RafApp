import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    BriefcaseIcon, 
    DocumentDuplicateIcon, 
    BanknotesIcon, 
    Squares2X2Icon, 
    WrenchScrewdriverIcon, 
    SparklesIcon, 
    PlayIcon, 
    CheckCircleIcon, 
    ArrowRightIcon,
    DevicePhoneMobileIcon,
    CloudIcon,
    ShieldCheckIcon,
    SunIcon,
    ChartBarSquareIcon
} from '@heroicons/react/24/outline';

const FEATURE_MODULES = [
    {
        id: 'drawings',
        title_is: 'Teikningaskrá og án-nets geymsla (Ajour)',
        title_en: 'Drawings Database & Offline Storage (Ajour)',
        desc_is: 'Ajour-skrá yfir öll verkefni með flokkun í fagsvið (rafmagn, lýsing, brunaútkall) og innbyggðri skyndiminni-tækni (Cache Storage) til að skoða teikningar á vinnustað án internets.',
        desc_en: 'Ajour directory for all projects with discipline classification (Electrical, Lighting, Fire Alarm) and offline Cache Storage to view drawings on job sites without internet.',
        icon: <DocumentDuplicateIcon className="h-6 w-6 text-indigo-500" />,
        badge_is: 'Sparaðu gagnamagn',
        badge_en: 'Bandwidth Saver',
        highlights: [
            { is: 'Sjálfvirk útgáfustýring (vA, vB, vC)', en: 'Automatic revision tracking (vA, vB, vC)' },
            { is: 'Vistað í tæki með einum smelli', en: 'One-click local device offline caching' },
            { is: 'Stjórnunaraðgangur fyrir Admin & PM', en: 'Restricted management for Admin & PM' }
        ]
    },
    {
        id: 'salary',
        title_is: 'Íslensk launaáætlun & launaseðlar (RSÍ)',
        title_en: 'Icelandic Salary & Payslip Engine (RSÍ)',
        desc_is: 'Reiknivél miðuð við kjarasamninga RSÍ. Reiknar yfirvinnu I & II (1.56x / 1.794x), áunnið orlof (10.17%, 10.64%, 12.07%), staðgreiðslustig árin 2023-2026 og býr til opinbera PDF launaseðla.',
        desc_en: 'Calculators tailored to RSÍ agreements. Computes OT I & II (1.56x / 1.794x), accrued holiday pay (Orlof), tax brackets (2023-2026), and exports certified PDF payslips.',
        icon: <BanknotesIcon className="h-6 w-6 text-emerald-500" />,
        badge_is: '100% Nákvæmni',
        badge_en: '100% Precision Math',
        highlights: [
            { is: 'Sjálfvirk samstilling skattára (2023–2026)', en: 'Automatic tax year sync (2023–2026)' },
            { is: 'Stéttarfélagsgjald RSÍ (1,0%) og lífeyrir', en: 'RSÍ Union fee (1.0%) & pension split' },
            { is: 'Sækja staðfesta PDF launaseðla', en: 'Certified PDF payslips generation' }
        ]
    },
    {
        id: 'scheduling',
        title_is: 'Vaktaplön og verkefnastýring',
        title_en: 'Scheduling Grid & Operations',
        desc_is: 'Gantt-línurit, lifandi tímaskráningar starfsmanna í rauntíma, tenging við veðurspá og gagnvirkt yfirlit yfir tæki, tól og bílaflota.',
        desc_en: 'Gantt charts, real-time live clock-in monitoring, integration with live weather API, and logistics management for tools and vehicle fleets.',
        icon: <Squares2X2Icon className="h-6 w-6 text-amber-500" />,
        badge_is: 'Stjórnun í rauntíma',
        badge_en: 'Real-time Operations',
        highlights: [
            { is: 'Lifandi yfirlit yfir stimplanir á verkstað', en: 'Live site clock-in telemetry' },
            { is: 'Gantt og dagbókarsýn fyrir verkefni', en: 'Gantt timelines & project calendar' },
            { is: 'Tækjaskrá og bílafloti með myndum', en: 'Equipment & fleet tracking with photo manifests' }
        ]
    }
];

function ShowcasePage() {
    const { i18n } = useTranslation();
    const isIcelandic = i18n.language === 'is';
    const [activeTab, setActiveTab] = useState('drawings');
    const [simulatedOrlof, setSimulatedOrlof] = useState('10.17');
    const [simulatedYear, setSimulatedYear] = useState('2026');
    const [simulatedHours, setSimulatedHours] = useState('140');
    const [isCachedDemo, setIsCachedDemo] = useState(false);

    const activeModule = FEATURE_MODULES.find(m => m.id === activeTab) || FEATURE_MODULES[0];

    // Simple math simulation for interactive calculator demo
    const hours = parseFloat(simulatedHours) || 140;
    const rate = 5129;
    const regPay = hours * rate;
    const otPay = 10 * rate * 1.56;
    const subtotal = regPay + otPay;
    const orlof = subtotal * (parseFloat(simulatedOrlof) / 100);
    const gross = subtotal + orlof;
    const pension = gross * 0.04;
    const union = gross * 0.01;
    const credit = simulatedYear === '2026' ? 72492 : simulatedYear === '2024' ? 64926 : 59665;
    const taxEst = Math.max(0, (gross - pension) * 0.3149 - credit);
    const net = Math.max(0, gross - pension - union - taxEst - orlof);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500 space-y-10">
            {/* Header / Hero */}
            <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-900 via-indigo-950 to-gray-900 text-white p-8 md:p-12 shadow-2xl border border-indigo-800/50">
                <div className="relative z-10 max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                        <SparklesIcon className="h-4 w-4 text-indigo-400" />
                        {isIcelandic ? 'RafApp Sýningarsalur & Eiginleikar' : 'RafApp Interactive Feature Showcase'}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">
                        {isIcelandic ? 'Framtíðarlausn fyrir Rafverktaka' : 'Next-Gen Electrical Contracting Operating System'}
                    </h1>
                    <p className="text-sm md:text-base text-gray-300 font-medium">
                        {isIcelandic 
                            ? 'Upplifðu hvernig RafApp einfaldar teikningastýringu, launaútgjöf RSÍ, og verkefnastjórnun í rauntíma.'
                            : 'Explore how RafApp streamlines drawings management, RSÍ payroll compliance, and site operations in real-time.'}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link 
                            to="/dashboard"
                            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                        >
                            <PlayIcon className="h-4 w-4 fill-current" />
                            {isIcelandic ? 'Fara í Stjórnborð' : 'Launch Operating Dashboard'}
                        </Link>
                        <Link 
                            to="/drawings"
                            className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2"
                        >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                            {isIcelandic ? 'Skoða Teikningaskrá' : 'Open Drawings DB'}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FEATURE_MODULES.map((mod) => {
                    const isSelected = mod.id === activeTab;
                    return (
                        <button
                            key={mod.id}
                            onClick={() => setActiveTab(mod.id)}
                            className={`p-6 rounded-[2rem] text-left transition-all border ${
                                isSelected 
                                    ? 'bg-white dark:bg-gray-800 border-indigo-500 shadow-xl ring-2 ring-indigo-500/20' 
                                    : 'bg-white/60 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                    {mod.icon}
                                </div>
                                <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-900">
                                    {isIcelandic ? mod.badge_is : mod.badge_en}
                                </span>
                            </div>
                            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm mb-1">
                                {isIcelandic ? mod.title_is : mod.title_en}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {isIcelandic ? mod.desc_is : mod.desc_en}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Interactive Live Demo Stage */}
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Interactive Interactive Sandbox</span>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic mt-1">
                            {isIcelandic ? activeModule.title_is : activeModule.title_en}
                        </h2>
                    </div>
                    <ul className="flex flex-wrap gap-3">
                        {activeModule.highlights.map((hl, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-xl">
                                <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>{isIcelandic ? hl.is : hl.en}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* TAB 1: DRAWINGS DEMO */}
                {activeTab === 'drawings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase">
                                    {isIcelandic ? 'Ajour Teikningaskrá meó tækjaskyndiminni' : 'Ajour Registry & Local Device Cache'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {isIcelandic 
                                        ? 'Teikningar eru geymdar í flokkuðum möppum samkvæmt fagsviðum. Með Cache Storage tækninni getur rafvirki hlaðið öllum teikningum verksins í símann eða spjaldtölvuna og skoðað þær á vinnustað án nettengingar.'
                                        : 'Drawings are organized in discipline folders. With Cache Storage, electricians can download all project drawings to their mobile or tablet for seamless offline viewing on site.'}
                                </p>
                            </div>

                            <div className="p-6 bg-gray-50 dark:bg-gray-900/40 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        {isIcelandic ? 'Prófaðu að breyta geymslustöðu:' : 'Test Cache State Toggle:'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsCachedDemo(!isCachedDemo)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                            isCachedDemo 
                                                ? 'bg-green-50 text-green-600 border-green-200' 
                                                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                        }`}
                                    >
                                        {isCachedDemo ? <DevicePhoneMobileIcon className="h-4 w-4" /> : <CloudIcon className="h-4 w-4" />}
                                        {isCachedDemo ? (isIcelandic ? 'Vistað í tæki (Án nets)' : 'Cached on Device (Offline)') : (isIcelandic ? 'Aðeins á neti' : 'Online Only')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Visual Mockup Card */}
                        <div className="lg:col-span-6 bg-gray-900 text-white p-6 rounded-[2rem] shadow-2xl space-y-4 border border-gray-800">
                            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                <span className="text-xs font-mono text-indigo-400 font-bold">NODE: PROJ-104 / Electrical</span>
                                <span className="text-[10px] font-black uppercase bg-indigo-900/60 text-indigo-300 px-2.5 py-1 rounded-lg">Ajour v2.4</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-800/80 rounded-xl border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <DocumentDuplicateIcon className="h-5 w-5 text-indigo-400" />
                                        <div>
                                            <p className="text-xs font-black uppercase">E-101 Ground Floor Power Plan.pdf</p>
                                            <p className="text-[9px] text-gray-400">Rev vB • 19.07.2026 • Eng. Mario</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 ${
                                        isCachedDemo ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400'
                                    }`}>
                                        {isCachedDemo ? <DevicePhoneMobileIcon className="h-3 w-3" /> : <CloudIcon className="h-3 w-3" />}
                                        {isCachedDemo ? 'Device' : 'Cloud'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: SALARY DEMO */}
                {activeTab === 'salary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-6 space-y-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase">
                                    {isIcelandic ? 'Gagnvirk Launareiknivél RSÍ' : 'Interactive RSÍ Salary Engine'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {isIcelandic 
                                        ? 'Breyttu tímum, skattári eða orlofsprósentu til að sjá nákvæman útreikning sem passar við launaseðilinn þinn upp á krónu.'
                                        : 'Adjust hours, tax year, or Orlof percentage to see precise calculations matching your payslip to the krona.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {isIcelandic ? 'Dagvinnutímar' : 'Regular Hours'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={simulatedHours} 
                                        onChange={(e) => setSimulatedHours(e.target.value)} 
                                        className="modern-input h-10 text-xs font-bold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {isIcelandic ? 'Skattár' : 'Tax Year'}
                                    </label>
                                    <select 
                                        value={simulatedYear} 
                                        onChange={(e) => setSimulatedYear(e.target.value)} 
                                        className="modern-input h-10 text-xs font-bold"
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2024">2024</option>
                                        <option value="2023">2023</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {isIcelandic ? 'Orlofsprósenta' : 'Orlof %'}
                                    </label>
                                    <select 
                                        value={simulatedOrlof} 
                                        onChange={(e) => setSimulatedOrlof(e.target.value)} 
                                        className="modern-input h-10 text-xs font-bold"
                                    >
                                        <option value="10.17">10.17% (24 dagar)</option>
                                        <option value="10.64">10.64% (25 dagar)</option>
                                        <option value="12.07">12.07% (30 dagar)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Salary Output Card */}
                        <div className="lg:col-span-6 bg-indigo-950 text-white p-6 rounded-[2rem] shadow-2xl space-y-4 border border-indigo-900">
                            <div className="flex justify-between items-center border-b border-indigo-900 pb-3">
                                <span className="text-xs font-black uppercase text-indigo-300">Live Salary Telemetry</span>
                                <span className="text-[10px] font-mono text-indigo-200">Year: {simulatedYear}</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-indigo-200">
                                    <span>Dagvinna ({hours} klst)</span>
                                    <span className="font-bold">{Math.round(regPay).toLocaleString('is-IS')} ISK</span>
                                </div>
                                <div className="flex justify-between text-indigo-300">
                                    <span>Áunnið orlof ({simulatedOrlof}%)</span>
                                    <span className="font-bold">{Math.round(orlof).toLocaleString('is-IS')} ISK</span>
                                </div>
                                <div className="flex justify-between border-t border-indigo-900 pt-2 font-black text-sm text-indigo-300">
                                    <span>Brúttólaun</span>
                                    <span>{Math.round(gross).toLocaleString('is-IS')} ISK</span>
                                </div>
                                <div className="flex justify-between text-indigo-200 pt-2">
                                    <span>Lífeyrissjóður (4%)</span>
                                    <span>-{Math.round(pension).toLocaleString('is-IS')} ISK</span>
                                </div>
                                <div className="flex justify-between text-indigo-200">
                                    <span>Stéttarfélag RSÍ (1,0%)</span>
                                    <span>-{Math.round(union).toLocaleString('is-IS')} ISK</span>
                                </div>
                            </div>
                            <div className="bg-indigo-900/60 p-4 rounded-2xl border border-indigo-850">
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Útborgað (Nettó)</span>
                                <p className="text-2xl font-black text-green-400">{Math.round(net).toLocaleString('is-IS')} ISK</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: SCHEDULING DEMO */}
                {activeTab === 'scheduling' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-6 space-y-4">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase">
                                {isIcelandic ? 'Verkefnastýring & Vaktaskráning' : 'Scheduling Grid & Operations'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {isIcelandic 
                                    ? 'Fylgstu með stimplunum starfsmanna á korti, útbúa stundaskrár og haltu utan um verkfæri og bifreiðar á einum stað.'
                                    : 'Track worker clock-ins on active job sites, manage project schedules, and audit heavy tools and company cars.'}
                            </p>
                            <Link 
                                to="/scheduling" 
                                className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                            >
                                {isIcelandic ? 'Skoða vaktaplan' : 'Open Scheduling Grid'} <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="lg:col-span-6 bg-gray-900 text-white p-6 rounded-[2rem] shadow-2xl space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                <span className="text-xs font-bold text-gray-300">Live Site Telemetry</span>
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-black rounded-lg uppercase">Active</span>
                            </div>
                            <div className="p-3 bg-gray-800 rounded-xl flex items-center justify-between">
                                <span className="text-xs font-bold">Reykjavík Site A — Electrician Mario</span>
                                <span className="text-[10px] font-mono text-indigo-400">Clocked In: 07:30</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShowcasePage;
