// frontend/src/components/OfferEngine.jsx
// ar.is / RSÍ / SART offer calculator — wizard-style, beginner-friendly
// Formula: Final = (C_labor + C_materials + C_direct) × (1 + margin) × 1.24 (VAT)

import React, { useState, useMemo } from 'react';
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
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ─── ar.is / RSÍ Rate Table (2024–2027) ───────────────────────────────────────
const REIKNITALA_TABLE = [
    { year: 2024, rate: 542.10, label: 'Feb 2024' },
    { year: 2025, rate: 892.63, label: 'Jan 2025' },
    { year: 2026, rate: 946.19, label: 'Jan 2026', current: true },
    { year: 2027, rate: 1002.96, label: 'Jan 2027' },
];
const DEFAULT_REIKNITALA = 946.19;

// Standard surcharges (Álagshlutföll) per ar.is collective agreement
const SURCHARGES = [
    { id: 'evening',    emoji: '🌆', label: 'Evening work',        labelIs: 'Eftirvinna',          desc: '17:00–24:00',                              ratio: 0.33, color: 'amber'  },
    { id: 'night',      emoji: '🌙', label: 'Night / Weekend',     labelIs: 'Næturvinna / Helgi',   desc: 'After midnight or full weekends',          ratio: 0.45, color: 'indigo' },
    { id: 'holiday',    emoji: '🎉', label: 'Public holiday',      labelIs: 'Stórhátíð',            desc: 'Christmas, New Year, etc.',                ratio: 0.90, color: 'red'   },
    { id: 'occupied',   emoji: '🏢', label: 'Occupied premises',   labelIs: 'Virkur rekstur',       desc: 'Working around operating businesses',      ratio: 0.10, color: 'blue'  },
    { id: 'height_mid', emoji: '🏗️', label: 'Height 15–50m',      labelIs: 'Hæðarvinna 15–50m',    desc: 'Towers, masts, high ceilings',             ratio: 0.20, color: 'blue'  },
    { id: 'height_high',emoji: '🏔️', label: 'Height >50m',        labelIs: 'Hæðarvinna >50m',      desc: 'Very high structures',                     ratio: 0.30, color: 'blue'  },
    { id: 'difficult',  emoji: '⚠️', label: 'Difficult conditions',labelIs: 'Erfiðar aðstæður',    desc: 'Confined spaces, hazardous materials',     ratio: 0.15, color: 'orange'},
    { id: 'outdoor',    emoji: '🌧️', label: 'Outdoor / exposed',   labelIs: 'Útiuppsetning',        desc: 'Exposed to weather, unprotected sites',    ratio: 0.10, color: 'teal'  },
];

const DEFAULT_PAYROLL = 0.32; // 32% — statutory (Trygg. 6.35% + Líf. 11.5% + Orlof 10.17% + Sjúkl. 2.5%+)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtISK = (v) =>
    new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(v || 0);

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

    const surchargeRatio = useMemo(
        () => SURCHARGES.filter(s => activeSurcharges.has(s.id)).reduce((acc, s) => acc + s.ratio, 0),
        [activeSurcharges]
    );

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

    const updateLine = (id, field, val) =>
        setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

    const removeLine = (id) =>
        setLines(prev => prev.filter(l => l.id !== id));

    const toggleSurcharge = (id) =>
        setActiveSurcharges(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

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
                {t('tip_step1', { defaultValue: 'Each work line represents one type of task. Enter the "einingar" (work units) from the Labor Catalog — these are standardized time values from the ar.is collective agreement. 60 einingar = 1 hour of work.' })}
            </Tip>

            <div className="space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 px-1">
                    <div className="col-span-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        {t('work_description', { defaultValue: 'Work description' })}
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
                                <input
                                    type="text"
                                    value={line.description}
                                    onChange={e => updateLine(line.id, 'description', e.target.value)}
                                    placeholder={t('line_desc_placeholder', { defaultValue: 'e.g. Install socket outlet' })}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
    // STEP 1 — Site Conditions / Surcharges
    // ─────────────────────────────────────────────────────────────────────────
    const renderStep1 = () => (
        <div className="space-y-4">
            <Tip>
                {t('tip_step2', { defaultValue: 'If the job has special conditions (night work, height, hazardous areas), you must add surcharges as required by the ar.is collective agreement. Skip this step if it\'s a standard daytime job.' })}
            </Tip>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SURCHARGES.map(s => {
                    const active = activeSurcharges.has(s.id);
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSurcharge(s.id)}
                            className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                                active
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/25 shadow-sm'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                    active
                                        ? 'border-indigo-500 bg-indigo-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                    {active && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-base leading-none">{s.emoji}</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            {isIS ? s.labelIs : s.label}
                                        </span>
                                        <span className={`ml-auto text-xs font-black px-1.5 py-0.5 rounded ${
                                            active
                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            +{(s.ratio * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {activeSurcharges.size > 0 ? (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        {t('total_surcharge', { defaultValue: 'Total surcharge applied:' })}
                    </span>
                    <span className="text-sm font-black text-amber-800 dark:text-amber-200">
                        +{(surchargeRatio * 100).toFixed(0)}%
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                        {t('no_surcharges', { defaultValue: 'Standard daytime work — no surcharges.' })}
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
