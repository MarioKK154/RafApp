// frontend/src/components/OfferEngine.jsx
// ar.is / RSÍ / SART offer calculator — wizard-style, beginner-friendly
// Formula: Final = (C_labor + C_materials + C_direct) × (1 + margin) × 1.24 (VAT)

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useTranslation } from 'react-i18next';
import {
    WrenchScrewdriverIcon,
    ClockIcon,
    TruckIcon,
    CalculatorIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    InformationCircleIcon,
    LightBulbIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── ar.is / RSÍ Rate Table (2024–2027) ───────────────────────────────────────
const REIKNITALA_TABLE = [
    { year: 2024, rate: 542.10, label: 'Feb 2024' },
    { year: 2025, rate: 892.63, label: 'Jan 2025' },
    { year: 2026, rate: 946.19, label: 'Jan 2026', current: true },
    { year: 2027, rate: 1002.96, label: 'Jan 2027' },
];
// L1 fix: derive default from table — update `current: true` entry when rates change, not this constant
const DEFAULT_REIKNITALA = REIKNITALA_TABLE.find(r => r.current)?.rate ?? REIKNITALA_TABLE[REIKNITALA_TABLE.length - 1].rate;

// ─── Official Álagshlutföll (Surcharges) from Ákvæðisgrundvöllur Álagshlutföll.xlsx ───
// Types: 3 = project-wide modifier, 2 = per-item modifier
// All active surcharges are SUMMED (not multiplied)

const SURCHARGE_GROUPS = [
    {
        id: 'project',
        label: 'Project conditions',
        labelIs: 'Verkstæðisaðstæður',
        tip: 'Apply to the whole project if site conditions are non-standard.',
        tipIs: 'Gildir fyrir allt verkið ef aðstæður eru óvenjulegar.',
        items: [
            { id: '3020', code: '3020', emoji: '🏚️', label: 'Old / heritage building',    labelIs: 'Eldri bygging',           desc: 'Pre-1980 construction',                    ratio: 0.10 },
            { id: '3030', code: '3030', emoji: '🏢', label: 'Building in operation',       labelIs: 'Húsnæði í notkun',        desc: 'Occupied during work',                     ratio: 0.10 },
        ],
    },
    {
        id: 'ceiling',
        label: 'Ceiling height at work area',
        labelIs: 'Lofthæð vinnusvæðis',
        tip: 'Height of the ceiling/space where you are installing. Pick ONE.',
        tipIs: 'Hæð lofts þar sem þú setur upp. Veldu EITT.',
        exclusive: true,
        items: [
            { id: '4006', code: '4006', emoji: '🦆', label: 'Ceiling ≤ 0.60 m (crawl)',   labelIs: 'Lofthæð ≤ 0.60 m',       desc: 'Extremely confined / crawl space',         ratio: 0.50 },
            { id: '4015', code: '4015', emoji: '🧎', label: 'Ceiling 0.61–1.50 m (low)',  labelIs: 'Lofthæð 0.61–1.50 m',    desc: 'Low, must crouch',                         ratio: 0.20 },
            { id: '4050', code: '4050', emoji: '📏', label: 'Ceiling 3.00–5.00 m',        labelIs: 'Lofthæð 3.00–5.00 m',    desc: 'High ceiling, step ladder needed',         ratio: 0.10 },
            { id: '4070', code: '4070', emoji: '🪜', label: 'Ceiling 5.01–7.00 m',        labelIs: 'Lofthæð 5.01–7.00 m',    desc: 'Very high, tall ladder or lift',           ratio: 0.25 },
            { id: '4100', code: '4100', emoji: '🏭', label: 'Ceiling 7.01–10.00 m',       labelIs: 'Lofthæð 7.01–10.00 m',   desc: 'Industrial / hall height',                 ratio: 0.40 },
        ],
    },
    {
        id: 'scaffold',
        label: 'Working from scaffold / platform',
        labelIs: 'Vinna af vinnupöllum',
        tip: 'If using a scaffold platform, pick the platform height. Pick ONE.',
        tipIs: 'Ef unnið er af vinnupöllum, veldu hæð þeirra. Veldu EITT.',
        exclusive: true,
        items: [
            { id: '5040', code: '5040', emoji: '🔧', label: 'Scaffold 2.00–4.00 m',       labelIs: 'Vinnupallar 2.00–4.00 m', desc: 'Low scaffold',                             ratio: 0.02 },
            { id: '5060', code: '5060', emoji: '🔧', label: 'Scaffold 4.01–6.00 m',       labelIs: 'Vinnupallar 4.01–6.00 m', desc: 'Medium scaffold',                          ratio: 0.04 },
            { id: '5080', code: '5080', emoji: '🔧', label: 'Scaffold 6.01–8.00 m',       labelIs: 'Vinnupallar 6.01–8.00 m', desc: 'High scaffold',                            ratio: 0.06 },
            { id: '5100', code: '5100', emoji: '🔧', label: 'Scaffold 8.01–10.00 m',      labelIs: 'Vinnupallar 8.01–10.00 m','desc': 'Very high scaffold',                     ratio: 0.08 },
        ],
    },
    {
        id: 'floor',
        label: 'Floor level in building',
        labelIs: 'Hæð hússins (hæðartala)',
        tip: 'Applies from the 5th floor upward. Pick ONE if applicable.',
        tipIs: 'Á við frá 5. hæð og upp. Veldu EITT ef við á.',
        exclusive: true,
        items: [
            { id: '6005', code: '6005', emoji: '5️⃣', label: '5th floor (+2%)',            labelIs: '5. hæð (+2%)',            desc: '',  ratio: 0.02 },
            { id: '6006', code: '6006', emoji: '6️⃣', label: '6th floor (+3%)',            labelIs: '6. hæð (+3%)',            desc: '',  ratio: 0.03 },
            { id: '6007', code: '6007', emoji: '7️⃣', label: '7th floor (+4%)',            labelIs: '7. hæð (+4%)',            desc: '',  ratio: 0.04 },
            { id: '6008', code: '6008', emoji: '8️⃣', label: '8th floor (+5%)',            labelIs: '8. hæð (+5%)',            desc: '',  ratio: 0.05 },
            { id: '6009', code: '6009', emoji: '9️⃣', label: '9th floor (+6%)',            labelIs: '9. hæð (+6%)',            desc: '',  ratio: 0.06 },
            { id: '6010', code: '6010', emoji: '🔟', label: '10th floor (+7%)',            labelIs: '10. hæð (+7%)',           desc: '',  ratio: 0.07 },
            { id: '6011', code: '6011', emoji: '🏢', label: '11th floor (+8%)',            labelIs: '11. hæð (+8%)',           desc: '',  ratio: 0.08 },
            { id: '6012', code: '6012', emoji: '🏢', label: '12th floor (+9%)',            labelIs: '12. hæð (+9%)',           desc: '',  ratio: 0.09 },
            { id: '6013', code: '6013', emoji: '🏢', label: '13th floor (+10%)',           labelIs: '13. hæð (+10%)',          desc: '',  ratio: 0.10 },
            { id: '6014', code: '6014', emoji: '🏢', label: '14th floor (+11%)',           labelIs: '14. hæð (+11%)',          desc: '',  ratio: 0.11 },
            { id: '6015', code: '6015', emoji: '🏢', label: '15th floor (+12%)',           labelIs: '15. hæð (+12%)',          desc: '',  ratio: 0.12 },
            { id: '6016', code: '6016', emoji: '🏢', label: '16th floor (+13%)',           labelIs: '16. hæð (+13%)',          desc: '',  ratio: 0.13 },
        ],
    },
    {
        id: 'special',
        label: 'Special work / discounts',
        labelIs: 'Sérstök verk / afsláttur',
        tip: 'Demolition work, salvage, or agreed discount. Can be negative.',
        tipIs: 'Niðurrif, endurnýting eða saminn afsláttur. Getur verið neikvætt.',
        items: [
            { id: '2030', code: '2030', emoji: '📦', label: 'Panels moved with equipment', labelIs: 'Skápar fluttir með búnaði', desc: 'Moving full populated panels',           ratio: 1.00 },
            { id: '2040', code: '2040', emoji: '🏗️', label: 'Boxes set in concrete/mold',  labelIs: 'Kassar í steypumót/vikur',  desc: 'Set after pouring',                     ratio: 1.00 },
            { id: '2010', code: '2010', emoji: '♻️', label: 'Demolish & reuse material',   labelIs: 'Efni tekið niður, notað aftur','desc': 'Salvage work',                      ratio: -0.50 },
            { id: '2020', code: '2020', emoji: '🗑️', label: 'Demolish, discard material',  labelIs: 'Efni tekið niður, fargað',  desc: 'Tear-out only, material disposed',      ratio: -0.70 },
            { id: '1010', code: '1010', emoji: '🏷️', label: '10% agreed discount',         labelIs: '10% afsláttur',             desc: 'Contractually agreed discount',          ratio: -0.10 },
        ],
    },
];

const DEFAULT_PAYROLL = 0.32; // 32% — statutory (Trygg. 6.35% + Líf. 11.5% + Orlof 10.17% + Sjúkl. 2.5%+)

// ─── Helpers ──────────────────────────────────────────────────────────────────
// L2 fix: Math.round before formatting eliminates IEEE 754 float drift (e.g. 946.19×1000 = 946190.0000001)
const fmtISK = (v) =>
    new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(Math.round(v || 0));

function fmtHours(totalEinningar) {
    // 1 eining = 1 minute of work (ar.is standard: 60 einingar = 1 hour)
    const totalMins = Math.round(totalEinningar);
    if (totalMins <= 0) return '0 min';
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
}

// ─── Tip Component ────────────────────────────────────────────────────────────
function Tip({ children, icon: Icon = LightBulbIcon }) {
    return (
        <div className="flex gap-2.5 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl">
            <Icon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
        </div>
    );
}

// ─── Catalog Search Input ─────────────────────────────────────────────────────
// Searches the labor catalog in both IS + EN, auto-fills einingar on selection.
function CatalogSearchInput({ value, onChange, onSelectCatalogItem, catalog, isIS, placeholder }) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState([]);
    const [open, setOpen]     = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const wrapRef = useRef(null);
    const debounce = useRef(null);

    // Keep local query in sync when parent clears/resets the line
    useEffect(() => { setQuery(value); }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const search = useCallback((q) => {
        clearTimeout(debounce.current);
        if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
        debounce.current = setTimeout(() => {
            const lower = q.toLowerCase();
            const hits = catalog.filter(item => {
                const is_name = (item.description || '').toLowerCase();
                const en_name = (item.description_en || '').toLowerCase();
                const cat_is  = (item.sub_category || '').toLowerCase();
                const cat_en  = (item.sub_category_en || '').toLowerCase();
                return is_name.includes(lower) || en_name.includes(lower) ||
                       cat_is.includes(lower)  || cat_en.includes(lower);
            }).slice(0, 12);
            setResults(hits);
            setOpen(hits.length > 0);
            setHighlight(-1);
        }, 300);
    }, [catalog]);

    const handleChange = (e) => {
        const q = e.target.value;
        setQuery(q);
        onChange(q); // update parent immediately so custom text is captured
        search(q);
    };

    const selectItem = (item) => {
        const name = isIS ? (item.description || item.description_en || '') : (item.description_en || item.description || '');
        const ein  = item.units_per_hour != null ? item.units_per_hour : (item.reference_price || 0);
        setQuery(name);
        setOpen(false);
        setResults([]);
        onSelectCatalogItem(name, ein);
    };

    const handleKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
        if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); selectItem(results[highlight]); }
        if (e.key === 'Escape') { setOpen(false); }
    };

    return (
        <div ref={wrapRef} className="relative w-full">
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
            </div>
            {open && results.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800/40">
                        <BookOpenIcon className="h-3 w-3 text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Catalog hits</span>
                    </div>
                    <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                        {results.map((item, idx) => {
                            const name = isIS ? (item.description || item.description_en || '') : (item.description_en || item.description || '');
                            const ein  = item.units_per_hour != null ? item.units_per_hour : (item.reference_price || 0);
                            const cat  = isIS ? (item.sub_category || '') : (item.sub_category_en || item.sub_category || '');
                            return (
                                <li
                                    key={item.id}
                                    onMouseDown={() => selectItem(item)}
                                    className={`flex items-start justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                                        highlight === idx ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{name}</p>
                                        {cat && <p className="text-[10px] text-gray-400 truncate">{cat}</p>}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono">{ein} ein.</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep, onGoTo }) {
    return (
        <div className="flex items-center gap-1 sm:gap-2">
            {steps.map((step, idx) => {
                const done = idx < currentStep;
                const active = idx === currentStep;
                return (
                    <React.Fragment key={idx}>
                        <button
                            type="button"
                            onClick={() => done && onGoTo(idx)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                active
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                    : done
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                    : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-default'
                            }`}
                        >
                            {done ? (
                                <CheckCircleSolid className="h-3.5 w-3.5" />
                            ) : (
                                <span className="w-3.5 h-3.5 flex items-center justify-center text-[9px]">{idx + 1}</span>
                            )}
                            <span className="hidden sm:inline">{step.shortLabel}</span>
                        </button>
                        {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 min-w-[8px] max-w-[32px] rounded ${idx < currentStep ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OfferEngine({ initialItems = [], onCreateOffer }) {
    const { t, i18n } = useTranslation();
    const isIS = i18n.language?.toLowerCase().startsWith('is');

    // ── Catalog: loaded once for live search in work lines
    const [catalog, setCatalog] = useState([]);
    useEffect(() => {
        axiosInstance.get('/labor-catalog/?limit=2000')
            .then(res => setCatalog(Array.isArray(res.data) ? res.data : []))
            .catch(() => {}); // silent fail — search just won't show results
    }, []);

    // ── Wizard state
    const [step, setStep] = useState(0);

    // ── Step 1: Work lines (einingar)
    const [lines, setLines] = useState(() =>
        initialItems.length > 0
            ? initialItems.map((item, idx) => ({
                id: idx + 1,
                description: item.description || '',
                einingar: parseFloat(item.reference_price) || 0,
                qty: 1,
              }))
            : [{ id: 1, description: '', einingar: 0, qty: 1 }]
    );

    // ── Step 2: Site conditions / surcharges
    const [activeSurcharges, setActiveSurcharges] = useState(new Set());

    // ── Step 3: Costs & rates
    const [reiknitala, setReiknitala] = useState(DEFAULT_REIKNITALA);
    const [materialCost, setMaterialCost] = useState('');
    const [travelFee, setTravelFee] = useState('');
    const [hmsFee, setHmsFee] = useState('');
    const [contractorMargin, setContractorMargin] = useState(18); // as percentage
    const [includeVAT, setIncludeVAT] = useState(true);

    // ── Computations ──────────────────────────────────────────────────────────
    const totalEinningar = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.einingar) || 0) * (parseFloat(l.qty) || 1), 0),
        [lines]
    );

    const surchargeRatio = useMemo(() => {
        let total = 0;
        SURCHARGE_GROUPS.forEach(group => {
            group.items.forEach(item => {
                if (activeSurcharges.has(item.id)) total += item.ratio;
            });
        });
        return total;
    }, [activeSurcharges]);

    // C_labor: einingar × reiknitala × (1 + surcharges) × (1 + launagjöld 32%)
    const C_labor = totalEinningar * reiknitala * (1 + surchargeRatio) * (1 + DEFAULT_PAYROLL);
    const C_mat   = parseFloat(materialCost) || 0;
    const C_direct = (parseFloat(travelFee) || 0) + (parseFloat(hmsFee) || 0);
    const subtotal  = C_labor + C_mat + C_direct;
    const withMargin = subtotal * (1 + contractorMargin / 100);
    const finalPrice = includeVAT ? withMargin * 1.24 : withMargin;

    // ── Line CRUD ─────────────────────────────────────────────────────────────
    const addLine = () =>
        setLines(prev => [...prev, { id: Date.now(), description: '', einingar: 0, qty: 1 }]);

    const updateLine = (id, field, val) => {
        // M11 fix: clamp numeric fields so negatives can never produce a negative offer total
        let sanitised = val;
        if (field === 'einingar') {
            const n = parseFloat(val);
            if (!isNaN(n) && n < 0) sanitised = '0';
        } else if (field === 'qty') {
            const n = parseInt(val, 10);
            if (!isNaN(n) && n < 1) sanitised = '1';
        }
        setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: sanitised } : l));
    };

    // selectCatalogItem: called when user picks a catalog hit — fills description + einingar
    const selectCatalogItem = (lineId, name, ein) => {
        setLines(prev => prev.map(l =>
            l.id === lineId ? { ...l, description: name, einingar: ein } : l
        ));
    };


    const removeLine = (id) =>
        setLines(prev => prev.filter(l => l.id !== id));

    const toggleSurcharge = (id, groupId) => {
        const group = SURCHARGE_GROUPS.find(g => g.id === groupId);
        setActiveSurcharges(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                // For exclusive groups, remove any already-selected item from same group
                if (group?.exclusive) {
                    group.items.forEach(item => next.delete(item.id));
                }
                next.add(id);
            }
            return next;
        });
    };

    // ── Steps definition ──────────────────────────────────────────────────────
    const STEPS = [
        { shortLabel: t('step_work',      { defaultValue: 'Work' }),       icon: WrenchScrewdriverIcon },
        { shortLabel: t('step_site',      { defaultValue: 'Site' }),       icon: ShieldCheckIcon       },
        { shortLabel: t('step_costs',     { defaultValue: 'Costs' }),      icon: CurrencyDollarIcon    },
        { shortLabel: t('step_summary',   { defaultValue: 'Summary' }),    icon: CalculatorIcon        },
    ];

    const canNext = step === 0 ? totalEinningar > 0 : true;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 0 — Work Lines
    // ─────────────────────────────────────────────────────────────────────────
    const renderStep0 = () => (
        <div className="space-y-4">
            <Tip>
                {t('tip_step1', { defaultValue: 'Each work line represents one type of task. Type to search the catalog in Icelandic or English — clicking a result auto-fills the einingar. You can also type a custom description and set einingar manually.' })}
            </Tip>

            <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 px-1">
                    <div className="col-span-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        {t('work_description', { defaultValue: 'Work description' })}
                        <span className="ml-1 text-indigo-400 normal-case font-normal">— {t('search_catalog_hint', { defaultValue: 'search catalog or type custom' })}</span>
                    </div>
                    <div className="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">
                        {t('einingar_col', { defaultValue: 'Einingar' })}
                        <span className="block font-normal normal-case text-gray-300 dark:text-gray-500">(per unit)</span>
                    </div>
                    <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">
                        {t('qty_col', { defaultValue: 'Qty' })}
                    </div>
                    <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">
                        {t('time_col', { defaultValue: 'Time' })}
                    </div>
                </div>

                {/* Lines */}
                {lines.map((line, idx) => {
                    const lineEin = (parseFloat(line.einingar) || 0) * (parseFloat(line.qty) || 1);
                    return (
                        <div key={line.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-colors">
                            <div className="col-span-5">
                                <CatalogSearchInput
                                    value={line.description}
                                    onChange={val => updateLine(line.id, 'description', val)}
                                    onSelectCatalogItem={(name, ein) => selectCatalogItem(line.id, name, ein)}
                                    catalog={catalog}
                                    isIS={isIS}
                                    placeholder={t('line_desc_placeholder', { defaultValue: 'e.g. Install socket outlet' })}
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={line.einingar}
                                    onChange={e => updateLine(line.id, 'einingar', e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-center font-mono text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={line.qty}
                                    onChange={e => updateLine(line.id, 'qty', e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-center font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                />
                            </div>
                            <div className="col-span-1 text-right">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    {fmtHours(lineEin)}
                                </span>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    disabled={lines.length === 1}
                                    className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 disabled:opacity-30 transition rounded"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add line */}
                <button
                    type="button"
                    onClick={addLine}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <PlusIcon className="h-4 w-4" />
                    {t('add_work_line', { defaultValue: 'Add another work line' })}
                </button>
            </div>

            {/* Totals */}
            {totalEinningar > 0 && (
                <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                            {t('total_work_time', { defaultValue: 'Total work time:' })}
                        </span>
                        <span className="text-sm font-black text-indigo-800 dark:text-indigo-200 font-mono">
                            {fmtHours(totalEinningar)}
                        </span>
                    </div>
                    <span className="text-xs text-indigo-500 font-mono">
                        {totalEinningar.toFixed(2)} ein.
                    </span>
                </div>
            )}

            {totalEinningar === 0 && lines.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    ⚠️ {t('enter_einingar_hint', { defaultValue: 'Enter einingar values to continue. Find them in the Labor Catalog.' })}
                </p>
            )}
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 — Site Conditions / Surcharges (Official Álagshlutföll)
    // ─────────────────────────────────────────────────────────────────────────
    const renderStep1 = () => (
        <div className="space-y-5">
            <Tip>
                {t('tip_step2', { defaultValue: 'Select any surcharges that apply to your project. These are official codes from the Ákvæðisgrundvöllur. For exclusive groups (ceiling height, scaffold, floor), only one can apply at a time.' })}
            </Tip>

            {SURCHARGE_GROUPS.map(group => (
                <div key={group.id}>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {isIS ? group.labelIs : group.label}
                        </h4>
                        {group.exclusive && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded font-bold uppercase tracking-wider">pick one</span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">{isIS ? group.tipIs : group.tip}</p>
                    <div className={`grid gap-2 ${
                        group.id === 'floor' ? 'grid-cols-2 sm:grid-cols-3' :
                        group.id === 'scaffold' ? 'grid-cols-2' :
                        'grid-cols-1 sm:grid-cols-2'
                    }`}>
                        {group.items.map(s => {
                            const active = activeSurcharges.has(s.id);
                            const positive = s.ratio > 0;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleSurcharge(s.id, group.id)}
                                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                                        active
                                            ? positive
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                                            group.exclusive ? 'rounded-full' : 'rounded'
                                        } ${
                                            active
                                                ? positive ? 'border-amber-500 bg-amber-500' : 'border-emerald-500 bg-emerald-500'
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                            {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className="text-sm leading-none">{s.emoji}</span>
                                        <span className={`flex-1 text-xs font-semibold ${
                                            active
                                                ? positive ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-800 dark:text-emerald-200'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {isIS ? s.labelIs : s.label}
                                        </span>
                                        <span className={`text-xs font-black px-1.5 py-0.5 rounded flex-shrink-0 ${
                                            active
                                                ? positive ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {s.ratio >= 0 ? '+' : ''}{(s.ratio * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    {s.desc && (
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 ml-6 leading-snug">{s.desc}</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {activeSurcharges.size > 0 ? (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl">
                    <div>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                            {t('total_surcharge', { defaultValue: 'Total surcharge applied:' })}
                        </span>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            {Array.from(activeSurcharges).map(id => {
                                const item = SURCHARGE_GROUPS.flatMap(g => g.items).find(i => i.id === id);
                                return item ? `${item.emoji} ${item.code}` : null;
                            }).filter(Boolean).join(' + ')}
                        </p>
                    </div>
                    <span className={`text-lg font-black ${surchargeRatio >= 0 ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {surchargeRatio >= 0 ? '+' : ''}{(surchargeRatio * 100).toFixed(0)}%
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                        {t('no_surcharges', { defaultValue: 'No surcharges selected — standard conditions.' })}
                    </span>
                </div>
            )}
        </div>
    );


    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 — Costs & Rates
    // ─────────────────────────────────────────────────────────────────────────
    const renderStep2 = () => (
        <div className="space-y-5">
            {/* Reiknitala */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {t('labor_rate_heading', { defaultValue: '1. Labor rate (Reiknitala)' })}
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black rounded uppercase tracking-wider">RSÍ/SART</span>
                </div>
                <Tip icon={InformationCircleIcon}>
                    {t('tip_reiknitala', { defaultValue: 'The Reiknitala is the official rate per eining set by the RSÍ/SART collective agreement. Use the current year\'s rate unless your contract specifies otherwise.' })}
                </Tip>
                <div className="flex flex-wrap gap-2 mt-3">
                    {REIKNITALA_TABLE.map(r => (
                        <button
                            key={r.year}
                            type="button"
                            onClick={() => setReiknitala(r.rate)}
                            className={`flex-1 min-w-[110px] p-3 rounded-xl border-2 text-center transition-all ${
                                Math.abs(reiknitala - r.rate) < 0.01
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                            }`}
                        >
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{r.label}</p>
                            <p className={`text-base font-black font-mono mt-0.5 ${Math.abs(reiknitala - r.rate) < 0.01 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {r.rate.toFixed(2)}
                            </p>
                            <p className="text-[9px] text-gray-400 mt-0.5">ISK/ein.</p>
                            {r.current && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded uppercase">current</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Materials */}
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('materials_heading', { defaultValue: '2. Materials (optional)' })}
                </h4>
                <Tip icon={InformationCircleIcon}>
                    {t('tip_materials', { defaultValue: 'Include the total cost of materials (cables, sockets, panels, etc.) that you will supply. Leave blank if the client supplies materials.' })}
                </Tip>
                <div className="mt-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">ISK</span>
                    <input
                        type="number"
                        min="0"
                        step="1000"
                        value={materialCost}
                        onChange={e => setMaterialCost(e.target.value)}
                        placeholder="0"
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder-gray-300 dark:placeholder-gray-600"
                    />
                </div>
            </div>

            {/* Direct costs */}
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('direct_costs_heading', { defaultValue: '3. Direct costs (optional)' })}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            <TruckIcon className="h-3.5 w-3.5" />
                            {t('travel_label', { defaultValue: 'Travel / Transport (ISK)' })}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="500"
                            value={travelFee}
                            onChange={e => setTravelFee(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder-gray-300 dark:placeholder-gray-600"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{t('travel_hint', { defaultValue: 'Typical: 4,000–7,250 ISK flat (capital area)' })}</p>
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            {t('hms_label', { defaultValue: 'HMS / Inspection fee (ISK)' })}
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={hmsFee}
                            onChange={e => setHmsFee(e.target.value)}
                            placeholder="e.g. 28000"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition placeholder-gray-300 dark:placeholder-gray-600"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">{t('hms_hint', { defaultValue: 'Typical: 25,000–32,000 ISK' })}</p>
                    </div>
                </div>
            </div>

            {/* Margin */}
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {t('margin_heading', { defaultValue: '4. Contractor margin' })}
                </h4>
                <Tip icon={InformationCircleIcon}>
                    {t('tip_margin', { defaultValue: 'Your profit margin on top of all costs. 15–20% is typical in Iceland. This covers company overhead, equipment, and profit.' })}
                </Tip>
                <div className="mt-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {[10, 15, 18, 20, 25, 30].map(pct => (
                            <button
                                key={pct}
                                type="button"
                                onClick={() => setContractorMargin(pct)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    contractorMargin === pct
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/25'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                            >
                                {pct}%
                            </button>
                        ))}
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={contractorMargin}
                                onChange={e => setContractorMargin(Number(e.target.value))}
                                className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono text-center text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                            />
                            <span className="text-sm text-gray-400">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* VAT toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('include_vat_label', { defaultValue: 'Include VAT (VSK 24%)' })}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('vat_note', { defaultValue: 'Most B2B offers are shown excl. VAT. B2C (private clients) usually incl. VAT.' })}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIncludeVAT(v => !v)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${includeVAT ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${includeVAT ? 'translate-x-6' : ''}`} />
                </button>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 — Summary
    // ─────────────────────────────────────────────────────────────────────────
    const renderStep3 = () => (
        <div className="space-y-5">
            {/* Final price hero */}
            <div className="text-center py-6 px-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {t('final_offer_price', { defaultValue: 'Final Offer Price' })}
                </p>
                <p className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                    {fmtISK(finalPrice)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {includeVAT ? t('incl_24_vat', { defaultValue: 'Including 24% VAT' }) : t('excl_vat', { defaultValue: 'Excluding VAT' })}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {fmtHours(totalEinningar)}
                    </span>
                    <span>·</span>
                    <span>{totalEinningar.toFixed(1)} einingar</span>
                    {activeSurcharges.size > 0 && (
                        <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400">+{(surchargeRatio * 100).toFixed(0)}% surcharge</span>
                        </>
                    )}
                </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('cost_breakdown', { defaultValue: 'Cost breakdown' })}</h4>
                </div>
                <div className="p-4 space-y-2.5">
                    {/* Labor rows */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                            {t('base_labor', { defaultValue: 'Base labor' })}
                            <span className="text-[10px] text-gray-400">({totalEinningar.toFixed(1)} ein. × {reiknitala.toFixed(2)} ISK)</span>
                        </span>
                        <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{fmtISK(totalEinningar * reiknitala)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
                            <span className="w-3.5" />
                            {t('payroll_overhead_row', { defaultValue: 'Payroll overhead' })}
                            <span className="text-[10px] text-gray-400">(+{(DEFAULT_PAYROLL * 100).toFixed(0)}%)</span>
                        </span>
                        <span className="font-mono text-gray-500 dark:text-gray-400">{fmtISK(totalEinningar * reiknitala * DEFAULT_PAYROLL)}</span>
                    </div>

                    {surchargeRatio > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <span className="w-3.5" />
                                {t('surcharges_row', { defaultValue: 'Surcharges' })} (+{(surchargeRatio * 100).toFixed(0)}%)
                            </span>
                            <span className="font-mono text-amber-600 dark:text-amber-400">{fmtISK(totalEinningar * reiknitala * surchargeRatio)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">{t('total_labor', { defaultValue: 'Total labor cost' })}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{fmtISK(C_labor)}</span>
                    </div>

                    {C_mat > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{t('materials_row', { defaultValue: 'Materials' })}</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">{fmtISK(C_mat)}</span>
                        </div>
                    )}
                    {C_direct > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{t('direct_costs_row', { defaultValue: 'Direct costs' })}</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">{fmtISK(C_direct)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">{t('subtotal_row', { defaultValue: 'Subtotal' })}</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{fmtISK(subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-violet-600 dark:text-violet-400">{t('margin_row', { defaultValue: 'Contractor margin' })} ({contractorMargin}%)</span>
                        <span className="font-mono text-violet-600 dark:text-violet-400">{fmtISK(subtotal * contractorMargin / 100)}</span>
                    </div>

                    {includeVAT && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-500">VSK (24%)</span>
                            <span className="font-mono text-gray-500 dark:text-gray-500">{fmtISK(withMargin * 0.24)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t-2 border-indigo-300 dark:border-indigo-600 text-base font-black">
                        <span className="text-gray-900 dark:text-white">{t('final_total_row', { defaultValue: 'Final total' })}</span>
                        <span className="font-mono text-indigo-700 dark:text-indigo-300">{fmtISK(finalPrice)}</span>
                    </div>
                </div>
            </div>

            {/* Work lines summary */}
            <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('work_lines_summary', { defaultValue: 'Work lines' })}</h4>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lines.filter(l => l.description || parseFloat(l.einingar) > 0).map(l => {
                        const lineEin = (parseFloat(l.einingar) || 0) * (parseFloat(l.qty) || 1);
                        return (
                            <div key={l.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <div className="flex-1 min-w-0">
                                    <span className="text-gray-700 dark:text-gray-300 truncate block">{l.description || t('unnamed_line', { defaultValue: '(unnamed)' })}</span>
                                    <span className="text-[10px] text-gray-400">×{l.qty} × {l.einingar} ein.</span>
                                </div>
                                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 ml-4 flex-shrink-0">{fmtHours(lineEin)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Market benchmarks */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">{t('market_reference', { defaultValue: 'Market rate reference (2026)' })}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between"><span>{t('daytime_rate', { defaultValue: 'Daytime' })}</span><span className="font-mono font-bold">12,000–12,900 ISK/hr</span></div>
                    <div className="flex justify-between"><span>{t('afterhours_rate', { defaultValue: 'After-hours' })}</span><span className="font-mono font-bold">20,000–22,000 ISK/hr</span></div>
                    <div className="flex justify-between"><span>{t('callout_min', { defaultValue: 'Call-out min.' })}</span><span className="font-mono font-bold">25,000–33,000 ISK</span></div>
                    <div className="flex justify-between"><span>{t('tool_surcharge', { defaultValue: 'Tool surcharge' })}</span><span className="font-mono font-bold">650–760 ISK/hr</span></div>
                </div>
            </div>

            {onCreateOffer && (
                <button
                    type="button"
                    onClick={() => onCreateOffer({ lines, reiknitala, activeSurcharges: Array.from(activeSurcharges), contractorMargin, materialCost: C_mat, directCosts: C_direct, C_labor, totalEinningar, finalPrice, includeVAT })}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-500/20 active:scale-[0.99]"
                >
                    <DocumentTextIcon className="h-5 w-5" />
                    {t('create_offer_btn', { defaultValue: 'Create Offer' })}
                </button>
            )}
        </div>
    );

    const STEP_RENDERERS = [renderStep0, renderStep1, renderStep2, renderStep3];
    const STEP_TITLES = [
        { title: t('step1_title', { defaultValue: 'What work needs to be done?' }), subtitle: t('step1_subtitle', { defaultValue: 'Add each task with its einingar value from the Labor Catalog' }) },
        { title: t('step2_title', { defaultValue: 'Any special site conditions?' }), subtitle: t('step2_subtitle', { defaultValue: 'Select if any surcharges apply (night work, height, etc.)' }) },
        { title: t('step3_title', { defaultValue: 'Materials, costs & margin' }),    subtitle: t('step3_subtitle', { defaultValue: 'Set rates, add costs, and choose your contractor margin' }) },
        { title: t('step4_title', { defaultValue: 'Review your offer' }),            subtitle: t('step4_subtitle', { defaultValue: 'Full cost breakdown — ready to submit' }) },
    ];

    return (
        <div className="space-y-5">
            {/* Step indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <StepIndicator steps={STEPS} currentStep={step} onGoTo={setStep} />
                <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-gray-700" />
                <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">{STEP_TITLES[step].title}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{STEP_TITLES[step].subtitle}</p>
                </div>
            </div>

            {/* Step content */}
            <div className="min-h-[200px]">
                {STEP_RENDERERS[step]()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => setStep(s => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition"
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                    {t('back_btn', { defaultValue: 'Back' })}
                </button>

                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {t('step_counter', { defaultValue: 'Step {{current}} of {{total}}', current: step + 1, total: STEPS.length })}
                </div>

                {step < STEPS.length - 1 ? (
                    <button
                        type="button"
                        onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                        disabled={!canNext}
                        className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-sm shadow-indigo-500/20 active:scale-[0.99]"
                    >
                        {t('next_btn', { defaultValue: 'Next' })}
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t('start_new_btn', { defaultValue: 'Start new' })}
                    </button>
                )}
            </div>
        </div>
    );
}
