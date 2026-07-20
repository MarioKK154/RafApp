import React, { useMemo, useRef, useEffect, useState } from 'react';
import { format, differenceInDays, addDays, startOfDay, startOfMonth, endOfMonth } from 'date-fns';

// Vibrant color palette matching the reference Gantt style
const BAR_COLORS = [
    { bg: '#22c55e', text: '#fff', label: 'Planning' },       // green
    { bg: '#3b82f6', text: '#fff', label: 'Design' },          // blue
    { bg: '#8b5cf6', text: '#fff', label: 'Development' },     // purple
    { bg: '#f97316', text: '#fff', label: 'Testing' },         // orange
    { bg: '#eab308', text: '#fff', label: 'Adjustments' },     // yellow
    { bg: '#06b6d4', text: '#fff', label: 'Deployment' },      // cyan
    { bg: '#ec4899', text: '#fff', label: 'Review' },          // pink
    { bg: '#ef4444', text: '#fff', label: 'Critical' },        // red
];

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 64;
const CELL_MIN_WIDTH = 36;

function getStatusColor(status, index) {
    const map = {
        'Done': BAR_COLORS[0],
        'Commissioned': BAR_COLORS[5],
        'In Progress': BAR_COLORS[2],
        'Planning': BAR_COLORS[0],
        'On Hold': BAR_COLORS[3],
        'Review': BAR_COLORS[6],
        'Testing': BAR_COLORS[3],
    };
    return map[status] || BAR_COLORS[index % BAR_COLORS.length];
}

export default function CustomGanttChart({ tasks, projects, onTaskClick }) {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(1200);

    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            if (entries[0]) setContainerWidth(entries[0].contentRect.width);
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const validTasks = useMemo(() =>
        tasks.filter(t => t.start_date && t.due_date),
        [tasks]
    );

    const { minDate, maxDate } = useMemo(() => {
        if (validTasks.length === 0) return { minDate: new Date(), maxDate: addDays(new Date(), 30) };
        const starts = validTasks.map(t => new Date(t.start_date));
        const ends = validTasks.map(t => new Date(t.due_date));
        const min = new Date(Math.min(...starts));
        const max = new Date(Math.max(...ends));
        return {
            minDate: addDays(startOfDay(min), -2),
            maxDate: addDays(startOfDay(max), 4),
        };
    }, [validTasks]);

    const totalDays = differenceInDays(maxDate, minDate) + 1;
    const chartWidth = Math.max(containerWidth, totalDays * CELL_MIN_WIDTH);
    const dayWidth = chartWidth / totalDays;

    // Month groups for header
    const months = useMemo(() => {
        const result = [];
        let current = startOfMonth(minDate);
        while (current <= maxDate) {
            const mStart = current < minDate ? minDate : current;
            const mEnd = endOfMonth(current) > maxDate ? maxDate : endOfMonth(current);
            const days = differenceInDays(mEnd, mStart) + 1;
            result.push({ label: format(current, 'MMMM yyyy'), days, startDate: mStart });
            current = addDays(endOfMonth(current), 1);
        }
        return result;
    }, [minDate, maxDate]);

    // Week markers for sub-header
    const dayColumns = useMemo(() => {
        const result = [];
        let d = minDate;
        while (d <= maxDate) {
            result.push(new Date(d));
            d = addDays(d, 7);
        }
        return result;
    }, [minDate, maxDate]);

    if (validTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 opacity-30">
                <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-black uppercase tracking-widest text-gray-500">No tasks with dates to display</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-900">
            <div className="overflow-x-auto custom-scrollbar">
                <div style={{ minWidth: chartWidth }}>

                    {/* ─── HEADER ─── */}
                    {/* Month row */}
                    <div style={{ height: HEADER_HEIGHT / 2 }} className="flex bg-[#1e293b] border-b border-gray-700">
                        {months.map((m, i) => (
                            <div
                                key={i}
                                style={{ width: m.days * dayWidth, flexShrink: 0 }}
                                className="flex items-center justify-center border-r border-gray-600"
                            >
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{m.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Week sub-header */}
                    <div style={{ height: HEADER_HEIGHT / 2, position: 'relative' }} className="bg-[#263548] border-b-2 border-gray-700">
                        {dayColumns.map((d, i) => {
                            const left = differenceInDays(d, minDate) * dayWidth;
                            return (
                                <div
                                    key={i}
                                    style={{ position: 'absolute', left, width: 7 * dayWidth, top: 0, bottom: 0 }}
                                    className="flex items-center justify-center border-r border-gray-600/40"
                                >
                                    <span className="text-[9px] font-bold text-gray-400">{format(d, 'MMM d')}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* ─── TASK ROWS ─── */}
                    {validTasks.map((task, i) => {
                        const color = getStatusColor(task.status, i);
                        const taskStart = new Date(task.start_date);
                        const taskEnd = new Date(task.due_date);
                        const left = differenceInDays(taskStart, minDate) * dayWidth;
                        const width = Math.max((differenceInDays(taskEnd, taskStart) + 1) * dayWidth, 6);
                        const pct = task.status === 'Done' || task.status === 'Commissioned' ? 100
                            : task.status === 'In Progress' ? 50 : 0;

                        return (
                            <div
                                key={task.id}
                                style={{ height: ROW_HEIGHT, position: 'relative' }}
                                className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors"
                            >
                                {/* Vertical week grid lines */}
                                {dayColumns.map((d, gi) => {
                                    const gl = differenceInDays(d, minDate) * dayWidth;
                                    return (
                                        <div
                                            key={gi}
                                            style={{ position: 'absolute', left: gl, top: 0, bottom: 0, width: 1 }}
                                            className="bg-gray-100 dark:bg-gray-800"
                                        />
                                    );
                                })}

                                {/* Gantt bar */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: left + 2,
                                        width: width - 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: 34,
                                        backgroundColor: color.bg,
                                        borderRadius: 8,
                                        boxShadow: `0 2px 8px ${color.bg}55`,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => onTaskClick && onTaskClick(task)}
                                    className="transition-transform hover:scale-y-105"
                                    title={`${task.title} (${format(taskStart, 'MMM d')} → ${format(taskEnd, 'MMM d')})`}
                                >
                                    {/* Progress fill */}
                                    {pct > 0 && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0, top: 0, bottom: 0,
                                                width: `${pct}%`,
                                                background: 'rgba(0,0,0,0.18)',
                                                borderRadius: 8,
                                            }}
                                        />
                                    )}
                                    {/* Bar text */}
                                    <div className="absolute inset-0 flex items-center px-3">
                                        <span
                                            className="font-black text-white truncate select-none leading-none"
                                            style={{ fontSize: Math.min(11, Math.max(8, width / 12)) }}
                                        >
                                            {task.title}
                                            {task.description ? ` · ${task.description.slice(0, 40)}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── COLOR LEGEND ─── */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex flex-wrap gap-4">
                {[...new Map(validTasks.map((t, i) => {
                    const c = getStatusColor(t.status, i);
                    return [t.status, { status: t.status, color: c.bg }];
                })).values()].map(({ status, color }) => (
                    <div key={status} className="flex items-center gap-2">
                        <span className="h-3 w-6 rounded-full inline-block" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
