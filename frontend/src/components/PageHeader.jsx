import React from 'react';

/**
 * Reusable PageHeader component matching the Gantt chart signature design:
 * - Dark slate/navy gradient background (from-[#1e293b] via-[#1e3a5f] to-[#0f172a])
 * - Ambient decorative blur orbs
 * - Glowing gradient icon badge (from-indigo-500 to-blue-600)
 * - Italic uppercase high-contrast title & tracking-widest subtitle
 * - Glassmorphic stat pills & action button container
 */
function PageHeader({ icon: Icon, title, subtitle, stats = [], actions }) {
    return (
        <header className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] via-[#1e3a5f] to-[#0f172a] px-6 py-6 md:px-8 md:py-8 shadow-2xl">
                {/* Decorative ambient blur orbs */}
                <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Left side: Icon + Title + Subtitle */}
                    <div className="flex items-center gap-4">
                        {Icon && (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/40">
                                <Icon className="h-7 w-7 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-tight">
                                {typeof title === 'object' && title !== null ? (title.title || JSON.stringify(title)) : String(title || '')}
                            </h1>
                            {subtitle && (
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                    {typeof subtitle === 'object' && subtitle !== null ? (subtitle.subtitle || JSON.stringify(subtitle)) : String(subtitle)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right side: Stat pills and Actions */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                        {Array.isArray(stats) && stats.map((stat, idx) => {
                            const rawLabel = stat?.label ?? stat;
                            const displayLabel = typeof rawLabel === 'object' && rawLabel !== null ? JSON.stringify(rawLabel) : String(rawLabel ?? '');
                            return (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10"
                                >
                                    {stat?.dotColor && (
                                        <div className={`h-2 w-2 rounded-full ${stat.dotColor}`} />
                                    )}
                                    {stat?.icon && (
                                        <span className="text-indigo-300">{stat.icon}</span>
                                    )}
                                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">
                                        {displayLabel}
                                    </span>
                                </div>
                            );
                        })}

                        {actions && (
                            <div className="flex items-center gap-3">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default PageHeader;
