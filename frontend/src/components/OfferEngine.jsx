// frontend/src/components/OfferEngine.jsx
// ar.is / RSÍ / SART standard offer engine
// Formula: Final = (C_labor + C_material + C_direct) × (1 + margin) × 1.24 (VAT)
// C_labor = totalEinningar × Reiknitala × (1 + SUM álagshlutföll) × (1 + launagjöld)

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import {
    CalculatorIcon,
    InformationCircleIcon,
    PlusIcon,
    TrashIcon,
    BanknotesIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    WrenchScrewdriverIcon,
    TruckIcon,
    ShieldCheckIcon,
    DocumentPlusIcon,
} from '@heroicons/react/24/outline';

// ─── ar.is / RSÍ Constants ────────────────────────────────────────────────────
// Reiknitala ákvæðisvinnu (RSÍ/SART collective agreement 2024–2028)
const REIKNITALA_TABLE = [
    { year: 2024, rate: 542.10, label: 'Feb 2024' },
    { year: 2025, rate: 892.63, label: 'Jan 2025' },
    { year: 2026, rate: 946.19, label: 'Jan 2026' },  // <-- current
    { year: 2027, rate: 1002.96, label: 'Jan 2027' },
];
const DEFAULT_REIKNITALA = 946.19; // 2026 rate

// Álagshlutföll — standard RSÍ/SART surcharge ratios
const STANDARD_MODIFIERS = [
    { id: 'evening', label: 'Evening work (17:00–24:00)', labelIs: 'Eftirvinna (17:00–24:00)', ratio: 0.33, type: 'time' },
    { id: 'night', label: 'Night / Weekend work', labelIs: 'Nætur- og helgarvinna', ratio: 0.45, type: 'time' },
    { id: 'holiday', label: 'Major holiday (stórhátíðarálag)', labelIs: 'Stórhátíðarálag', ratio: 0.90, type: 'time' },
    { id: 'occupied', label: 'Occupied / operating premises', labelIs: 'Virkur rekstaraðili á svæðinu', ratio: 0.10, type: 'site' },
    { id: 'height_mid', label: 'Height work 15–50m (towers/masts)', labelIs: 'Hæðarálag 15–50m', ratio: 0.20, type: 'site' },
    { id: 'height_high', label: 'Height work >50m', labelIs: 'Hæðarálag >50m', ratio: 0.30, type: 'site' },
    { id: 'difficult', label: 'Difficult / hazardous conditions', labelIs: 'Erfiðar / hættulegar aðstæður', ratio: 0.15, type: 'site' },
    { id: 'outdoor', label: 'Outdoor / exposed installation', labelIs: 'Útiuppsetning / veðurútsett', ratio: 0.10, type: 'site' },
];

// Payroll overhead components (statutory + union)
// Tryggingagjald 6.35% + Lífeyrissjóður 11.5% + Orlof 10.17% + Sick/Training 2.5%
const DEFAULT_PAYROLL_OVERHEAD = 0.32; // 32%

// ISK formatter
const fmtISK = (v) =>
    new Intl.NumberFormat('is-IS', { style: 'currency', currency: 'ISK', maximumFractionDigits: 0 }).format(v || 0);

const fmtNum = (v, d = 2) => (v == null ? '—' : Number(v).toFixed(d));

// Convert einingar to hours (60 einingar = 1 hour in the ÁR system)
const einingToHours = (ein) => ein / 60;

// Format hours → "Xhr Ymin"
function fmtHours(hours) {
    if (!hours || hours <= 0) return '0min';
    const totalMins = Math.round(hours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}hr`;
    return `${h}hr ${m}min`;
}

export default function OfferEngine({ initialItems = [], onCreateOffer }) {
    const { t, i18n } = useTranslation();
    const isIS = i18n.language?.toLowerCase().startsWith('is');

    // ── Offer Lines ──────────────────────────────────────────────────────────
    const [lines, setLines] = useState(() =>
        initialItems.length > 0
            ? initialItems.map((item, idx) => ({
                id: idx + 1,
                description: item.description || '',
                einingar: parseFloat(item.reference_price) || 0,
                qty: 1,
                laborCatalogItemId: item.id || null,
              }))
            : [{ id: 1, description: '', einingar: 0, qty: 1, laborCatalogItemId: null }]
    );

    // ── Engine Parameters ────────────────────────────────────────────────────
    const [reiknitala, setReiknitala] = useState(DEFAULT_REIKNITALA);
    const [selectedModifiers, setSelectedModifiers] = useState(new Set());
    const [payrollOverhead, setPayrollOverhead] = useState(DEFAULT_PAYROLL_OVERHEAD);
    const [contractorMargin, setContractorMargin] = useState(0.18); // 18% default

    // ── Direct Expenses ──────────────────────────────────────────────────────
    const [materialCost, setMaterialCost] = useState(0);
    const [travelFee, setTravelFee] = useState(0);
    const [hmsFee, setHmsFee] = useState(0);
    const [scaffoldingFee, setScaffoldingFee] = useState(0);

    // ── Output Options ───────────────────────────────────────────────────────
    const [includeVAT, setIncludeVAT] = useState(true);
    const [showFormula, setShowFormula] = useState(false);
    const [showModifiers, setShowModifiers] = useState(true);

    // ── Computations ─────────────────────────────────────────────────────────
    const totalEinningar = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.einingar) || 0) * (parseFloat(l.qty) || 1), 0),
        [lines]
    );

    const totalHours = einingToHours(totalEinningar);

    // Sum of selected modifier ratios (additive)
    const totalModifierRatio = useMemo(() => {
        return STANDARD_MODIFIERS.filter(m => selectedModifiers.has(m.id)).reduce((s, m) => s + m.ratio, 0);
    }, [selectedModifiers]);

    // C_labor = totalEinningar × reiknitala × (1 + álagshlutföll) × (1 + launagjöld)
    const C_labor = totalEinningar * reiknitala * (1 + totalModifierRatio) * (1 + payrollOverhead);

    // C_direct = travel + hms + scaffolding
    const C_direct = (parseFloat(travelFee) || 0) + (parseFloat(hmsFee) || 0) + (parseFloat(scaffoldingFee) || 0);

    // C_material
    const C_mat = parseFloat(materialCost) || 0;

    // Subtotal before margin
    const subtotal = C_labor + C_mat + C_direct;

    // After margin
    const withMargin = subtotal * (1 + contractorMargin);

    // VAT (24%)
    const finalPrice = includeVAT ? withMargin * 1.24 : withMargin;

    // ── Line CRUD ─────────────────────────────────────────────────────────────
    const addLine = () => {
        setLines(prev => [...prev, { id: Date.now(), description: '', einingar: 0, qty: 1, laborCatalogItemId: null }]);
    };

    const updateLine = (id, field, value) => {
        setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLine = (id) => {
        setLines(prev => prev.filter(l => l.id !== id));
    };

    const toggleModifier = (modId) => {
        setSelectedModifiers(prev => {
            const next = new Set(prev);
            if (next.has(modId)) next.delete(modId);
            else next.add(modId);
            return next;
        });
    };

    // ── Create Offer ──────────────────────────────────────────────────────────
    const handleCreateOffer = useCallback(() => {
        if (onCreateOffer) {
            onCreateOffer({
                lines,
                reiknitala,
                selectedModifiers: Array.from(selectedModifiers),
                payrollOverhead,
                contractorMargin,
                materialCost: C_mat,
                directCosts: C_direct,
                C_labor,
                totalEinningar,
                totalHours,
                finalPrice,
                includeVAT,
            });
        }
    }, [lines, reiknitala, selectedModifiers, payrollOverhead, contractorMargin, C_mat, C_direct, C_labor, totalEinningar, totalHours, finalPrice, includeVAT, onCreateOffer]);

    return (
        <div className="space-y-6">
            {/* Header info strip */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                <InformationCircleIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                        {t('offer_engine_subtitle', { defaultValue: 'RSÍ/SART certified labor costing with Reiknitala 2026' })}
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {t('engine_formula_note', { defaultValue: 'Formula: (Labor + Materials + Direct) × (1 + Margin) × 1.24 (VAT)' })}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowFormula(f => !f)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 transition"
                >
                    {showFormula ? t('hide_formula', { defaultValue: 'Hide formula' }) : t('show_formula', { defaultValue: 'Full formula' })}
                </button>
            </div>

            {/* Formula breakdown */}
            {showFormula && (
                <div className="p-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-[11px] font-mono text-gray-600 dark:text-gray-400 space-y-1 animate-in fade-in duration-200">
                    <p className="font-black text-gray-900 dark:text-white text-xs mb-2">{t('formula_title', { defaultValue: 'ar.is / RSÍ / SART Formula (2026)' })}</p>
                    <p>C<sub>labor</sub> = {t('formula_labor', { defaultValue: 'Σ(Q × Einingar) × Reiknitala × (1 + Σ Álagshlutföll) × (1 + Launagjöld)' })}</p>
                    <p>C<sub>mat</sub> = {t('formula_mat_desc', { defaultValue: 'Total material cost' })}</p>
                    <p>C<sub>direct</sub> = {t('formula_direct', { defaultValue: 'Travel + HMS + Scaffolding' })}</p>
                    <p>{t('subtotal', { defaultValue: 'Subtotal' })} = C<sub>labor</sub> + C<sub>mat</sub> + C<sub>direct</sub></p>
                    <p>{t('formula_with_margin', { defaultValue: 'With margin' })} = Subtotal × (1 + Margin%)</p>
                    <p className="font-black text-indigo-600 dark:text-indigo-400">{t('formula_final', { defaultValue: 'Final = With margin × 1.24 (VSK 24%)' })}</p>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                        <p className="text-gray-500">{t('formula_reiknitala_desc', { defaultValue: 'Reiknitala ákvæðisvinnu (RSÍ/SART 2024–2028 kjarasamningur):' })}</p>
                        <div className="flex flex-wrap gap-3">
                            {REIKNITALA_TABLE.map(r => (
                                <span key={r.year} className={`px-2 py-0.5 rounded ${r.year === 2026 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black' : 'text-gray-500'}`}>
                                    {r.label}: {fmtNum(r.rate, 2)} ISK/ein.
                                </span>
                            ))}
                        </div>
                        <p className="text-gray-500 mt-2">{t('formula_payroll_desc', { defaultValue: 'Launagjöld ~32%: Tryggingagjald 6.35% + Lífeyrissjóður 11.5% + Orlof 10.17% + Sjúkl./Þjálfun 2.5%+' })}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT: Line items + engine params */}
                <div className="xl:col-span-2 space-y-6">

                    {/* ── Work Lines ──────────────────────────────────────── */}
                    <div className="saas-card overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <WrenchScrewdriverIcon className="h-4 w-4 text-indigo-500" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {t('work_lines', { defaultValue: 'Work Lines (Einingar)' })}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {fmtHours(totalHours)} · {fmtNum(totalEinningar, 2)} ein.
                                </span>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                                >
                                    <PlusIcon className="h-3.5 w-3.5" /> {t('add_line', { defaultValue: 'Add Line' })}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 font-black">
                                    <tr>
                                        <th className="py-3 px-4 text-left">{t('service_description', { defaultValue: 'Description' })}</th>
                                        <th className="py-3 px-3 text-right w-24">{t('col_eining', { defaultValue: 'Einingar' })}</th>
                                        <th className="py-3 px-3 text-right w-20">{t('qty', { defaultValue: 'Qty' })}</th>
                                        <th className="py-3 px-3 text-right w-28">{t('total_einingar', { defaultValue: 'Total ein.' })}</th>
                                        <th className="py-3 px-3 text-right w-28">{t('estimated_hours', { defaultValue: 'Est. Hours' })}</th>
                                        <th className="py-3 px-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {lines.map((line) => {
                                        const lineEin = (parseFloat(line.einingar) || 0) * (parseFloat(line.qty) || 1);
                                        const lineHours = einingToHours(lineEin);
                                        return (
                                            <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-2 px-4">
                                                    <input
                                                        type="text"
                                                        value={line.description}
                                                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                                                        placeholder={t('service_description', { defaultValue: 'Work description...' })}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.einingar}
                                                        onChange={e => updateLine(line.id, 'einingar', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-right font-mono text-indigo-600 dark:text-indigo-400 focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={line.qty}
                                                        onChange={e => updateLine(line.id, 'qty', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-right font-mono text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                    {fmtNum(lineEin, 2)}
                                                </td>
                                                <td className="py-2 px-3 text-right text-xs text-gray-500 dark:text-gray-400">
                                                    {fmtHours(lineHours)}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(line.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition rounded"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-black">
                                        <td className="py-3 px-4 text-xs text-indigo-700 dark:text-indigo-300">{t('total', { defaultValue: 'Total' })}</td>
                                        <td colSpan={2}></td>
                                        <td className="py-3 px-3 text-right font-mono text-sm text-indigo-700 dark:text-indigo-300">
                                            {fmtNum(totalEinningar, 2)} ein.
                                        </td>
                                        <td className="py-3 px-3 text-right text-sm text-indigo-700 dark:text-indigo-300 flex items-center justify-end gap-1">
                                            <ClockIcon className="h-3.5 w-3.5" />
                                            {fmtHours(totalHours)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* ── Reiknitala & Payroll ─────────────────────────────── */}
                    <div className="saas-card p-5 space-y-5">
                        <div className="flex items-center gap-2 mb-1">
                            <BanknotesIcon className="h-4 w-4 text-violet-500" />
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {t('rate_settings', { defaultValue: 'Rate Settings' })}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    {t('reiknitala_label', { defaultValue: 'Reiknitala (ISK/ein.)' })}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={reiknitala}
                                    onChange={e => setReiknitala(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="mt-1.5 flex gap-1.5 flex-wrap">
                                    {REIKNITALA_TABLE.map(r => (
                                        <button
                                            key={r.year}
                                            type="button"
                                            onClick={() => setReiknitala(r.rate)}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition ${
                                                Math.abs(reiknitala - r.rate) < 0.01
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1">{t('reiknitala_hint', { defaultValue: 'RSÍ/SART rate: 946.19 ISK/ein. (Jan 2026)' })}</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    {t('payroll_overhead', { defaultValue: 'Payroll Overhead' })} (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={(payrollOverhead * 100).toFixed(1)}
                                    onChange={e => setPayrollOverhead(parseFloat(e.target.value) / 100 || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[9px] text-gray-400 mt-1">{t('payroll_breakdown', { defaultValue: 'Trygg. 6.35% + Líf. 11.5% + Orlof 10.17% + Sjúkl. 2.5%...' })}</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                    {t('contractor_margin', { defaultValue: 'Contractor Margin (%)' })}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={(contractorMargin * 100).toFixed(0)}
                                    onChange={e => setContractorMargin(parseFloat(e.target.value) / 100 || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="mt-1.5 flex gap-1.5">
                                    {[15, 18, 20, 25].map(pct => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => setContractorMargin(pct / 100)}
                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition ${
                                                Math.abs(contractorMargin * 100 - pct) < 0.5
                                                    ? 'bg-violet-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                                        {t('include_vat', { defaultValue: 'Include VAT (24%)' })}
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div
                                            onClick={() => setIncludeVAT(v => !v)}
                                            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${includeVAT ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${includeVAT ? 'translate-x-5' : ''}`} />
                                        </div>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                                            {includeVAT ? t('incl_vat', { defaultValue: 'incl. 24% VAT' }) : t('excl_vat', { defaultValue: 'excl. VAT' })}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Álagshlutföll ────────────────────────────────────── */}
                    <div className="saas-card overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowModifiers(m => !m)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4 text-amber-500" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {t('site_modifiers', { defaultValue: 'Site & Overtime Modifiers (Álagshlutföll)' })}
                                </h3>
                                {selectedModifiers.size > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded uppercase tracking-wider">
                                        +{(totalModifierRatio * 100).toFixed(0)}%
                                    </span>
                                )}
                            </div>
                            {showModifiers ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                        </button>

                        {showModifiers && (
                            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                    {STANDARD_MODIFIERS.map(mod => {
                                        const active = selectedModifiers.has(mod.id);
                                        return (
                                            <label
                                                key={mod.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    active
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={active}
                                                    onChange={() => toggleModifier(mod.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                                                        {isIS ? mod.labelIs : mod.label}
                                                    </p>
                                                    <span className={`text-[9px] font-black ${
                                                        mod.type === 'time'
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                        {mod.type === 'time' ? '⏱ ' : '📍 '}
                                                        +{(mod.ratio * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Direct Expenses ──────────────────────────────────── */}
                    <div className="saas-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TruckIcon className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {t('direct_expenses', { defaultValue: 'Direct Expenses' })}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('material_cost', { defaultValue: 'Materials (ISK)' })}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={materialCost}
                                    onChange={e => setMaterialCost(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('travel_fee', { defaultValue: 'Travel / Transport (ISK)' })}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={travelFee}
                                    onChange={e => setTravelFee(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                                <p className="text-[9px] text-gray-400 mt-1">{t('travel_fee_hint', { defaultValue: 'Flat: 4,000–7,250 ISK (capital) or per-km' })}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('hms_fee', { defaultValue: 'HMS / Inspection (ISK)' })}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={hmsFee}
                                    onChange={e => setHmsFee(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                                <p className="text-[9px] text-gray-400 mt-1">{t('hms_fee_hint', { defaultValue: 'Typical: 25,000–32,000 ISK' })}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{t('scaffolding_fee', { defaultValue: 'Scaffolding / Equipment (ISK)' })}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={scaffoldingFee}
                                    onChange={e => setScaffoldingFee(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Summary & breakdown */}
                <div className="space-y-5">

                    {/* Final Price Card */}
                    <div className="saas-card p-6 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            {t('final_offer_price', { defaultValue: 'Final Offer Price' })}
                        </p>
                        <p className="text-4xl font-black text-gray-900 dark:text-white leading-none">
                            {fmtISK(finalPrice)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {includeVAT ? t('incl_vat', { defaultValue: 'incl. 24% VAT' }) : t('excl_vat', { defaultValue: 'excl. VAT' })}
                        </p>

                        {onCreateOffer && (
                            <button
                                type="button"
                                onClick={handleCreateOffer}
                                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition shadow-md shadow-indigo-500/20"
                            >
                                <DocumentPlusIcon className="h-4 w-4" />
                                {t('create_offer_from_engine', { defaultValue: 'Create Offer from Engine' })}
                            </button>
                        )}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="saas-card p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('technical_breakdown', { defaultValue: 'Cost Breakdown' })}</h4>

                        {/* Labor */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400 text-xs">{t('base_labor_cost', { defaultValue: 'Base Labor' })}</span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{fmtISK(totalEinningar * reiknitala)}</span>
                            </div>
                            {totalModifierRatio > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">+ {t('site_modifiers', { defaultValue: 'Álagshlutföll' })} (+{(totalModifierRatio * 100).toFixed(0)}%)</span>
                                    <span className="font-mono text-amber-600 dark:text-amber-400 text-xs">+{fmtISK(totalEinningar * reiknitala * totalModifierRatio)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 text-xs">+ {t('payroll_overhead', { defaultValue: 'Launagjöld' })} (+{(payrollOverhead * 100).toFixed(0)}%)</span>
                                <span className="font-mono text-gray-600 dark:text-gray-400 text-xs">+{fmtISK(totalEinningar * reiknitala * (1 + totalModifierRatio) * payrollOverhead)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">{t('total_labor_cost', { defaultValue: 'Total Labor Cost' })}</span>
                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">{fmtISK(C_labor)}</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
                            {C_mat > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">{t('material_cost', { defaultValue: 'Materials' })}</span>
                                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{fmtISK(C_mat)}</span>
                                </div>
                            )}
                            {C_direct > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">{t('direct_expenses', { defaultValue: 'Direct Expenses' })}</span>
                                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{fmtISK(C_direct)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">{t('subtotal', { defaultValue: 'Subtotal' })}</span>
                                <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">{fmtISK(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400 text-xs">+ {t('contractor_margin', { defaultValue: 'Margin' })} ({(contractorMargin * 100).toFixed(0)}%)</span>
                                <span className="font-mono text-violet-600 dark:text-violet-400 text-xs">+{fmtISK(subtotal * contractorMargin)}</span>
                            </div>
                            {includeVAT && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400 text-xs">+ {t('vat_24', { defaultValue: 'VSK (24%)' })}</span>
                                    <span className="font-mono text-gray-600 dark:text-gray-400 text-xs">+{fmtISK(withMargin * 0.24)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t-2 border-indigo-200 dark:border-indigo-700">
                                <span className="text-gray-900 dark:text-white font-black text-sm">{t('final_offer_price', { defaultValue: 'Final Price' })}</span>
                                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">{fmtISK(finalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Labor metrics */}
                    <div className="saas-card p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('labor_hours_estimate', { defaultValue: 'Labor Hours Estimate' })}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('total_einingar', { defaultValue: 'Einingar' })}</p>
                                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{fmtNum(totalEinningar, 1)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('estimated_hours', { defaultValue: 'Est. Hours' })}</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white">{fmtHours(totalHours)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center col-span-2">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Reiknitala</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{fmtNum(reiknitala, 2)} <span className="text-xs font-normal text-gray-500">ISK/ein.</span></p>
                            </div>
                        </div>

                        {/* Market rate comparison */}
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">{t('market_rate_comparison', { defaultValue: 'Market Rate Comparison (2026)' })}</p>
                            <div className="space-y-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                                <div className="flex justify-between">
                                    <span>{t('market_rate_daytime', { defaultValue: 'Daytime (Dagvinna):' })}</span>
                                    <span className="font-mono">12,000–12,900 ISK/hr</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('market_rate_after_hours', { defaultValue: 'After-hours (Yfirvinna):' })}</span>
                                    <span className="font-mono">20,000–22,000 ISK/hr</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('market_rate_callout', { defaultValue: 'Call-out min. (Lágmark):' })}</span>
                                    <span className="font-mono">25,000–33,000 ISK</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('market_rate_tool', { defaultValue: 'Tool surcharge (Verkfæragjald):' })}</span>
                                    <span className="font-mono">650–760 ISK/hr</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
