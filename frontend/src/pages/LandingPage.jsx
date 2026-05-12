import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    NewspaperIcon,
    SparklesIcon,
    BoltIcon,
    WrenchScrewdriverIcon,
    ArrowRightIcon,
    ShieldCheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../api/axiosInstance';
import defaultLogo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

function resolveMediaUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    const base = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}

function LandingPage() {
    const { isAuthenticated } = useAuth();
    const [feed, setFeed] = useState({
        news: [],
        updates: [],
        tools: [],
        interesting: [],
        show_news: true,
        show_updates: true,
        show_tools: true,
        show_interesting: true,
        background_image_urls: [],
        background_slide_seconds: 8,
    });
    const [bgIndex, setBgIndex] = useState(0);
    const [openSections, setOpenSections] = useState({
        News: true,
        Updates: true,
        'Electrical Tools': true,
        'Interesting Stuff': true,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get('/system/landing-feed');
                const data = res.data || {};
                setFeed({
                    news: Array.isArray(data.news) ? data.news : [],
                    updates: Array.isArray(data.updates) ? data.updates : [],
                    tools: Array.isArray(data.tools) ? data.tools : [],
                    interesting: Array.isArray(data.interesting) ? data.interesting : (Array.isArray(data.random) ? data.random : []),
                    show_news: data.show_news !== false,
                    show_updates: data.show_updates !== false,
                    show_tools: data.show_tools !== false,
                    show_interesting: data.show_interesting !== false,
                    background_image_urls: Array.isArray(data.background_image_urls) ? data.background_image_urls : [],
                    background_slide_seconds:
                        typeof data.background_slide_seconds === 'number' && !Number.isNaN(data.background_slide_seconds)
                            ? data.background_slide_seconds
                            : Math.min(600, Math.max(3, parseInt(data.background_slide_seconds, 10) || 8)),
                });
            } catch {
                setFeed({
                    news: [{ title: 'News', text: 'Platform announcements will appear here.' }],
                    updates: [{ title: 'Updates', text: 'Feature and release updates will appear here.' }],
                    tools: [{ title: 'Electrical Tools', text: 'New tool suggestions and field notes will appear here.' }],
                    interesting: [{ title: 'Interesting Stuff', text: 'Team notes and highlights will appear here.' }],
                    show_news: true,
                    show_updates: true,
                    show_tools: true,
                    show_interesting: true,
                    background_image_urls: [],
                    background_slide_seconds: 8,
                });
            }
        };
        load();
    }, []);

    const resolvedBackgrounds = useMemo(() => {
        const raw = feed.background_image_urls;
        if (!Array.isArray(raw)) return [];
        return raw.map(resolveMediaUrl).filter(Boolean);
    }, [feed.background_image_urls]);

    const slideSeconds = useMemo(() => {
        const n = Number(feed.background_slide_seconds);
        if (Number.isFinite(n)) return Math.min(600, Math.max(3, n));
        return 8;
    }, [feed.background_slide_seconds]);

    useEffect(() => {
        setBgIndex(0);
    }, [resolvedBackgrounds.join('|')]);

    useEffect(() => {
        if (resolvedBackgrounds.length <= 1) return undefined;
        const id = window.setInterval(() => {
            setBgIndex((i) => (i + 1) % resolvedBackgrounds.length);
        }, slideSeconds * 1000);
        return () => window.clearInterval(id);
    }, [resolvedBackgrounds.length, slideSeconds]);

    const now = useMemo(() => new Date(), [feed]);

    const isActiveNow = (item) => {
        const starts = item?.starts_at ? new Date(item.starts_at) : null;
        const ends = item?.ends_at ? new Date(item.ends_at) : null;
        if (starts && !Number.isNaN(starts.getTime()) && now < starts) return false;
        if (ends && !Number.isNaN(ends.getTime()) && now > ends) return false;
        return true;
    };

    const itemSourceBadge = (item) => {
        if (item?.source) return item.source;
        if (!item?.link_url) return null;
        try {
            const host = new URL(item.link_url).hostname.replace(/^www\./, '');
            if (host.includes('youtube')) return 'YouTube';
            if (host.includes('github')) return 'GitHub';
            if (host.includes('wikipedia')) return 'Wikipedia';
            return host;
        } catch {
            return 'External';
        }
    };

    const sortedItems = (items) =>
        (items || [])
            .filter(isActiveNow)
            .sort((a, b) => {
                const pa = a?.is_pinned ? 1 : 0;
                const pb = b?.is_pinned ? 1 : 0;
                if (pa !== pb) return pb - pa;
                const ta = a?.starts_at ? new Date(a.starts_at).getTime() : 0;
                const tb = b?.starts_at ? new Date(b.starts_at).getTime() : 0;
                return tb - ta;
            });

    const cards = [
        {
            icon: NewspaperIcon,
            title: 'News',
            items: sortedItems(feed.news),
            show: feed.show_news !== false,
            accents: 'from-blue-500/10 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-800',
            iconColor: 'text-blue-500',
        },
        {
            icon: SparklesIcon,
            title: 'Updates',
            items: sortedItems(feed.updates),
            show: feed.show_updates !== false,
            accents: 'from-indigo-500/10 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800',
            iconColor: 'text-indigo-500',
        },
        {
            icon: WrenchScrewdriverIcon,
            title: 'Electrical Tools',
            items: sortedItems(feed.tools),
            show: feed.show_tools !== false,
            accents: 'from-emerald-500/10 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800',
            iconColor: 'text-emerald-500',
        },
        {
            icon: BoltIcon,
            title: 'Interesting Stuff',
            items: sortedItems(feed.interesting),
            show: feed.show_interesting !== false,
            accents: 'from-amber-500/10 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200 dark:border-amber-800',
            iconColor: 'text-amber-500',
        },
    ];

    const hasBackgrounds = resolvedBackgrounds.length > 0;

    const renderFeedItems = (title, items, show) => {
        if (!show) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    This section is not published on the public home page.
                </p>
            );
        }
        if (items.length > 0) {
            return items.slice(0, 3).map((item, idx) => (
                <div key={`${title}-${idx}`}>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{item.title}</p>
                        {item.is_pinned && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                                Pinned
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.text}</p>
                    {item.image_url && (
                        <img
                            src={resolveMediaUrl(item.image_url)}
                            alt={item.title || 'feed'}
                            className="mt-2 w-full h-28 object-cover rounded-xl border border-gray-100 dark:border-gray-700"
                            loading="lazy"
                        />
                    )}
                    {item.link_url && (
                        <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex mt-2 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                        >
                            <GlobeAltIcon className="h-3.5 w-3.5" />
                            {item.link_label || 'Open Link'}
                        </a>
                    )}
                    {itemSourceBadge(item) && (
                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                            Source: {itemSourceBadge(item)}
                        </p>
                    )}
                </div>
            ));
        }
        return <p className="text-sm text-gray-600 dark:text-gray-300">No items yet.</p>;
    };

    return (
        <div className={`relative min-h-screen overflow-hidden ${hasBackgrounds ? '' : 'bg-gray-50 dark:bg-gray-900'}`}>
            {hasBackgrounds && (
                <>
                    {resolvedBackgrounds.map((url, i) => (
                        <div
                            key={`bg-${url}-${i}`}
                            className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat transition-opacity duration-[1400ms] ease-in-out"
                            style={{
                                backgroundImage: `url(${url})`,
                                opacity: i === bgIndex ? 1 : 0,
                            }}
                            aria-hidden
                        />
                    ))}
                    <div
                        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-gray-950/90"
                        aria-hidden
                    />
                </>
            )}
            <Link
                to="/"
                className={`fixed top-3 left-3 z-30 md:top-4 md:left-4 inline-flex items-center rounded-xl border shadow-md px-2.5 py-2 transition hover:opacity-95 ${
                    hasBackgrounds
                        ? 'border-white/35 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
            >
                <img
                    src={defaultLogo}
                    alt="RafApp"
                    className="h-11 w-auto md:h-12 object-contain"
                />
            </Link>
            <main className="relative z-10 mx-auto max-w-7xl px-6 pb-10 pt-16 md:pt-20 md:pb-16">
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-10 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">
                            rafapp.is
                        </p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                            One place for company news, updates, and field operations.
                        </h1>
                        <p className="mt-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            Welcome to RafApp. This front page is your public entry point with highlights and updates.
                            Sign in from the right panel to continue to your company workspace.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-10 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                                <ShieldCheckIcon className="h-4 w-4" />
                                Secure Login
                            </div>
                            <h2 className="mt-5 text-2xl font-black text-gray-900 dark:text-white">
                                Sign in to your company account
                            </h2>
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                Select your company, then authenticate with email and password.
                            </p>
                        </div>
                        <div className="mt-8">
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest transition"
                                >
                                    Go to dashboard
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest transition"
                                >
                                    Go To Login
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-10 hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {cards.map(({ icon: Icon, title, items, accents, iconColor, show }) => (
                        <article
                            key={title}
                            className={`bg-gradient-to-b ${accents} rounded-2xl border p-6 shadow-sm ${!show ? 'opacity-90' : ''}`}
                        >
                            <Icon className={`h-6 w-6 ${iconColor}`} />
                            <h3 className="mt-4 text-lg font-black text-gray-900 dark:text-white">{title}</h3>
                            <div className="mt-2 space-y-3">{renderFeedItems(title, items, show)}</div>
                        </article>
                    ))}
                </section>

                <section className="mt-8 space-y-3 sm:hidden">
                    {cards.map(({ icon: Icon, title, items, accents, iconColor, show }) => {
                        const isOpen = openSections[title] !== false;
                        return (
                            <article key={title} className={`bg-gradient-to-b ${accents} rounded-2xl border p-4 shadow-sm ${!show ? 'opacity-90' : ''}`}>
                                <button
                                    type="button"
                                    onClick={() => setOpenSections((prev) => ({ ...prev, [title]: !isOpen }))}
                                    className="w-full flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-5 w-5 ${iconColor}`} />
                                        <h3 className="text-base font-black text-gray-900 dark:text-white">{title}</h3>
                                    </div>
                                    {isOpen ? <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : <ChevronDownIcon className="h-5 w-5 text-gray-500" />}
                                </button>
                                {isOpen && <div className="mt-3 space-y-3">{renderFeedItems(title, items, show)}</div>}
                            </article>
                        );
                    })}
                </section>
            </main>
        </div>
    );
}

export default LandingPage;

