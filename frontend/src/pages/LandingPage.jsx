import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRightIcon,
    ShieldCheckIcon,
    EnvelopeIcon,
    PhoneIcon,
    CheckCircleIcon,
    LanguageIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../api/axiosInstance';
import defaultLogo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

function resolveMediaUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const u = url.trim();
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    const base = (axiosInstance.defaults.baseURL || '').replace(/\/$/, '');
    const rootBase = base.endsWith('/api') ? base.slice(0, -4) : base;
    return `${rootBase}${u.startsWith('/') ? u : `/${u}`}`;
}

function LandingPage() {
    const { t, i18n } = useTranslation();
    const { isAuthenticated, user } = useAuth();
    const isSuperadmin = user?.is_superuser;
    
    const [editMode, setEditMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'is' : 'en';
        i18n.changeLanguage(newLang);
    };

    const [feed, setFeed] = useState({
        news: [
            {
                title: 'Interactive Gantt & Task Scheduler',
                text: 'Project managers can now schedule milestones, map task dependencies, and allocate technicians directly on the interactive Gantt chart. Schedules sync instantly to field technicians\' mobile calendars.'
            },
            {
                title: 'Relevance-Sorted Materials Search',
                text: 'Search our materials index with a smart sorting engine that prioritizes exact matches (e.g. \'nym-j\') and lists similar items (e.g. halogen-free cables) lower down. Eliminates catalog search friction.'
            },
            {
                title: 'Advanced HR & Leave Pipeline',
                text: 'Track electrician logs, check-in locations, and request reviews in a unified workspace. Approve leave requests and export certified hours directly to accounting for payroll.'
            }
        ],
        pricing_tiers: [
            {
                name: 'Sóló & Lítil (1-10)',
                price: '16,390 ISK / mo',
                features: ['Includes 2 users in base', '3,190 ISK per additional user', 'Maximum cap of 41,910 ISK / mo'],
                button_text: 'Get Started',
                is_popular: false
            },
            {
                name: 'Meðalstór (11-25)',
                price: '43,890 ISK / mo',
                features: ['Includes 10 users in base', '2,750 ISK per additional user', 'Maximum cap of 85,140 ISK / mo'],
                button_text: 'Go Team',
                is_popular: true
            },
            {
                name: 'Stórhópur (26-65)',
                price: '82,390 ISK / mo',
                features: ['Includes 25 users in base', '2,200 ISK per additional user', 'Maximum cap of 170,390 ISK / mo'],
                button_text: 'Go Business',
                is_popular: false
            },
            {
                name: 'Fyrirtæki (66+)',
                price: '164,890 ISK / mo',
                features: ['Includes 65 users in base', '1,650 ISK per additional user', 'Scales with growth'],
                button_text: 'Contact Sales',
                is_popular: false
            }
        ],
        hero_title: 'Unify Your Electrical Business Operations',
        hero_subtitle: 'The ultimate operating system for electrical contractors. Merging time logs, scheduling, materials tracking, and asset telemetry in one sleek dashboard.',
        about_us_text: '',
        about_us_text_en: 'RafApp is a premium operations dashboard tailor-made for electrical contractors. Built by industry experts, it addresses the core operational bottlenecks of field-service coordination:\n\n• Real-Time Mobile Time-Tracking: Electricians can clock in or out of specific project codes, with built-in location and overlap safety checks.\n• Visual Gantt Project Milestones: Plan dependencies, track project percentage status, and manage schedules.\n• Material Requests Index: Search our 640+ item catalog (including Cables, Trays, and Pipes) to construct shopping and requisition lists.\n• Shared Tool Registry: Log tool check-outs, report damaged assets needing workshop repair, and ensure telemetry transparency.\n\nRafApp streamlines the entire workflow from the initial client offer to field execution and final payroll export, replacing spreadsheets and paperwork with a fast, modern app.',
        about_us_text_is: 'RafApp er fyrsta flokks rekstrarlausn hönnuð sérstaklega fyrir rafvirkjafyrirtæki og undirverktaka. Kerfið leysir helstu flöskuhálsa í skipulagningu og daglegum rekstri á vettvangi:\n\n• Rauntíma tímaskráning á verk: Rafvirkjar stimpla sig inn og út af verknúmerum með snjallsíma. Kerfið kemur í veg fyrir skörun og tvískráningar.\n• Gagnvirkt Gantt-skipulag: PMs geta skipulagt verkþætti, fylgst með framvindu í prósentum og úthlutað mönnum á verk.\n• Stafrænn efnislisti: Leitaðu í yfir 640 vörum (kaplar, brautir, rör) til að búa til innkaupalista og efnispantanir af vettvangi.\n• Samnýtt Verkfæraskrá: Fylgstu með hvaða starfsmaður er með hvaða verkfæri í láni, skráðu skemmd verkfæri í viðgerð og tryggðu gagnsæi.\n\nRafApp tengir saman alla ferla frá tilboðsgerð til vettvangsvinnu og launavinnslu. Sparar tíma, lágmarkar mistök og útrýmir pappírsvinnu.',
        contact_persons: [
            {
                name: 'Maríus Rafn',
                title: 'Founder & Lead Architect',
                email: 'marius@rafapp.com',
                phone: '+354 888 1234',
                image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80'
            }
        ],
        background_image_urls: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80'],
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Lead Form State
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [selectedTierForLead, setSelectedTierForLead] = useState(null);
    const [leadForm, setLeadForm] = useState({ name: '', email: '', company: '', phone: '' });
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);

    // Interactive Calculator State
    const [calcUsers, setCalcUsers] = useState(5);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get('/system/landing-feed');
                const data = res.data || {};
                
                // If it returned default values (e.g. empty or default title), let's merge or use our rich defaults!
                if (!data.hero_title || 
                    data.hero_title === 'Welcome to Our Platform' || 
                    data.hero_title === 'Welcome' || 
                    !data.news || 
                    data.news.length === 0) {
                    return;
                }

                setFeed(prev => ({
                    news: Array.isArray(data.news) && data.news.length > 0 ? data.news : prev.news,
                    pricing_tiers: Array.isArray(data.pricing_tiers) && data.pricing_tiers.length > 0 ? data.pricing_tiers : prev.pricing_tiers,
                    hero_title: data.hero_title || prev.hero_title,
                    hero_subtitle: data.hero_subtitle || prev.hero_subtitle,
                    about_us_text: data.about_us_text || prev.about_us_text,
                    about_us_text_en: data.about_us_text_en || prev.about_us_text_en,
                    about_us_text_is: data.about_us_text_is || prev.about_us_text_is,
                    contact_persons: Array.isArray(data.contact_persons) && data.contact_persons.length > 0 ? data.contact_persons : prev.contact_persons,
                    background_image_urls: Array.isArray(data.background_image_urls) && data.background_image_urls.length > 0 ? data.background_image_urls : prev.background_image_urls,
                }));
            } catch (err) {
                console.error("Failed to load landing feed", err);
            }
        };
        load();
    }, []);

    const heroImageUrl = useMemo(() => {
        const raw = feed.background_image_urls;
        if (Array.isArray(raw) && raw.length > 0) {
            return resolveMediaUrl(raw[0]);
        }
        return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80'; // Fallback
    }, [feed.background_image_urls]);

    const scrollToSection = (id) => {
        setIsMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleOpenLeadForm = (tierName) => {
        setSelectedTierForLead(tierName);
        setLeadForm({ name: '', email: '', company: '', phone: '' });
        setIsLeadModalOpen(true);
    };

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingLead(true);
        try {
            await axiosInstance.post('/system/leads', {
                ...leadForm,
                selected_tier: selectedTierForLead
            });
            toast.success(t('lead_success', { defaultValue: "Thank you! We will be in touch shortly." }));
            setIsLeadModalOpen(false);
        } catch (error) {
            toast.error(t('lead_error', { defaultValue: "Failed to submit form. Please try again or contact us directly." }));
        } finally {
            setIsSubmittingLead(false);
        }
    };

    const handleSaveLandingFeed = async () => {
        try {
            const payload = {
                news: feed.news,
                pricing_tiers: feed.pricing_tiers,
                show_news: true,
                show_updates: true,
                background_image_urls: feed.background_image_urls,
                background_slide_seconds: 8,
                hero_title: feed.hero_title,
                hero_subtitle: feed.hero_subtitle,
                about_us_text: feed.about_us_text,
                about_us_text_en: feed.about_us_text_en,
                about_us_text_is: feed.about_us_text_is,
                contact_persons: feed.contact_persons,
            };
            await axiosInstance.post('/system/landing-feed', payload);
            toast.success(t('landing_feed_saved', { defaultValue: 'Landing page design published successfully!' }));
            setEditMode(false);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to publish landing page design.');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (section, idx) => {
        if (draggedIndex === null) return;
        const arr = [...feed[section]];
        const [moved] = arr.splice(draggedIndex, 1);
        arr.splice(idx, 0, moved);
        setFeed({ ...feed, [section]: arr });
        setDraggedIndex(null);
    };

    const calculatePricing = (users) => {
        let base, extra, extraRate, total, cap, capped;
        let tierName = '';
        
        if (users <= 10) {
            tierName = 'Sóló & Lítil (1-10)';
            base = 16390;
            extra = Math.max(0, users - 2);
            extraRate = 3190;
            cap = 41910;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else if (users <= 25) {
            tierName = 'Meðalstór (11-25)';
            base = 43890;
            extra = Math.max(0, users - 10);
            extraRate = 2750;
            cap = 85140;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else if (users <= 65) {
            tierName = 'Stórhópur (26-65)';
            base = 82390;
            extra = Math.max(0, users - 25);
            extraRate = 2200;
            cap = 170390;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else {
            tierName = 'Fyrirtæki (66+)';
            base = 164890;
            extra = Math.max(0, users - 65);
            extraRate = 1650;
            total = base + extra * extraRate;
            capped = false;
            cap = Infinity;
        }

        if (billingCycle === 'yearly') {
            base = Math.round(base * 0.85);
            extraRate = Math.round(extraRate * 0.85);
            total = Math.round(total * 0.85);
            if (cap !== Infinity) {
                cap = Math.round(cap * 0.85);
            }
        }

        return {
            tier: tierName,
            base,
            extraUsers: extra,
            extraRate,
            total,
            capped
        };
    };

    const getCardPrice = (basePriceString) => {
        const num = parseInt(basePriceString.replace(/\D/g, ''), 10);
        if (isNaN(num)) return basePriceString;
        
        if (billingCycle === 'yearly') {
            const discounted = Math.round(num * 0.85);
            return `${discounted.toLocaleString()} ISK`;
        }
        return `${num.toLocaleString()} ISK`;
    };

    const calcResult = calculatePricing(calcUsers);

    return (
        <div className="min-h-screen bg-[#1a202c] text-white font-sans selection:bg-[#0096FF] selection:text-white">
            {/* Header / Navbar */}
            <header className="fixed top-0 w-full z-40 bg-[#1a202c]/90 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={defaultLogo} alt="Logo" className="h-10 w-auto object-contain" />
                        <span className="text-xl font-black tracking-widest uppercase text-white">RafApp</span>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-bold tracking-widest uppercase">
                        <button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-[#0096FF] transition">{t('home', { defaultValue: 'Home' })}</button>
                        <button onClick={() => scrollToSection('news')} className="text-gray-300 hover:text-[#0096FF] transition">{t('news', { defaultValue: 'News' })}</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-[#0096FF] transition">{t('pricing', { defaultValue: 'Pricing' })}</button>
                        <button onClick={() => scrollToSection('about')} className="text-gray-300 hover:text-[#0096FF] transition">{t('about_us', { defaultValue: 'About Us' })}</button>
                        <button onClick={() => scrollToSection('contact')} className="text-gray-300 hover:text-[#0096FF] transition">{t('contact', { defaultValue: 'Contact' })}</button>
                        
                        <button onClick={toggleLanguage} className="flex items-center gap-1 text-gray-300 hover:text-white transition bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700">
                            <LanguageIcon className="h-4 w-4" />
                            <span className="text-xs">{i18n.language === 'en' ? 'IS' : 'EN'}</span>
                        </button>

                        {isSuperadmin && (
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="bg-[#0096FF]/20 text-[#0096FF] px-4 py-1.5 rounded-full border border-[#0096FF]/30 text-xs font-black uppercase tracking-wider hover:bg-[#0096FF]/35 transition"
                            >
                                {editMode ? t('exit_edit_layout', { defaultValue: 'Exit Customize' }) : t('edit_layout', { defaultValue: 'Customize Page' })}
                            </button>
                        )}

                        <Link 
                            to={isAuthenticated ? "/dashboard" : "/login"} 
                            className="bg-[#0096FF] hover:bg-blue-500 text-white px-6 py-2 rounded-full transition shadow-lg shadow-[#0096FF]/30"
                        >
                            {isAuthenticated ? 'Dashboard' : 'Login'}
                        </Link>
                    </nav>

                    {/* Mobile Nav Toggle */}
                    <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>
                
                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-[#1a202c] border-b border-gray-800 p-4 flex flex-col gap-4 text-sm font-bold uppercase tracking-widest text-center">
                        <button onClick={() => scrollToSection('home')} className="py-2 text-gray-300">{t('home', { defaultValue: 'Home' })}</button>
                        <button onClick={() => scrollToSection('news')} className="py-2 text-gray-300">{t('news', { defaultValue: 'News' })}</button>
                        <button onClick={() => scrollToSection('pricing')} className="py-2 text-gray-300">{t('pricing', { defaultValue: 'Pricing' })}</button>
                        <button onClick={() => scrollToSection('about')} className="py-2 text-gray-300">{t('about_us', { defaultValue: 'About Us' })}</button>
                        <button onClick={() => scrollToSection('contact')} className="py-2 text-gray-300">{t('contact', { defaultValue: 'Contact' })}</button>
                        
                        <button onClick={toggleLanguage} className="flex items-center justify-center gap-2 py-2 text-gray-300">
                            <LanguageIcon className="h-5 w-5" />
                            <span>{i18n.language === 'en' ? 'Switch to Icelandic' : 'Switch to English'}</span>
                        </button>

                        {isSuperadmin && (
                            <button
                                onClick={() => {
                                    setEditMode(!editMode);
                                    setIsMenuOpen(false);
                                }}
                                className="py-2 text-[#0096FF] font-black uppercase"
                            >
                                {editMode ? 'Exit Customize' : 'Customize Page'}
                            </button>
                        )}

                        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="py-2 text-[#0096FF]">
                            {isAuthenticated ? t('dashboard', { defaultValue: 'Dashboard' }) : t('login', { defaultValue: 'Login' })}
                        </Link>
                    </div>
                )}
            </header>

            {/* Builder Toolbar when Edit Mode is active */}
            {editMode && (
                <div className="fixed top-20 left-0 w-full bg-indigo-600 text-white z-50 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in slide-in-from-top-4 duration-300 border-b border-indigo-700">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest">Landing Page Builder (Superadmin)</h2>
                        <p className="text-[10px] text-indigo-200 mt-0.5">Edit text fields inline, upload photos, reorder cards with drag-and-drop, and publish directly to visitors.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setEditMode(false);
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSaveLandingFeed}
                            className="px-5 py-2 bg-white text-indigo-600 hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-xl shadow transition"
                        >
                            Publish Changes
                        </button>
                    </div>
                </div>
            )}

            <main className={editMode ? "pt-36" : "pt-20"}>
                {/* Hero Section */}
                <section id="home" className="pt-12 pb-20 lg:pt-28 lg:pb-32 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="z-10 relative text-left">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-[#0096FF]/10 text-[#0096FF] font-black uppercase tracking-widest text-[10px] mb-6 border border-[#0096FF]/20">
                                {t('hero_eyebrow', { defaultValue: 'RafApp - Elevating Your Workflow' })}
                            </div>
                            
                            {editMode ? (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Title</label>
                                        <input 
                                            type="text" 
                                            value={feed.hero_title}
                                            onChange={(e) => setFeed({ ...feed, hero_title: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-2xl font-black focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Subtitle</label>
                                        <textarea 
                                            value={feed.hero_subtitle}
                                            onChange={(e) => setFeed({ ...feed, hero_subtitle: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-medium focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Image URL</label>
                                        <input 
                                            type="text" 
                                            value={feed.background_image_urls?.[0] || ''}
                                            onChange={(e) => {
                                                const urls = [...(feed.background_image_urls || [])];
                                                urls[0] = e.target.value;
                                                setFeed({ ...feed, background_image_urls: urls });
                                            }}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-mono focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            placeholder="Paste image URL here"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
                                        {t(feed.hero_title, { defaultValue: feed.hero_title })}
                                    </h1>
                                    <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                                        {t(feed.hero_subtitle, { defaultValue: feed.hero_subtitle })}
                                    </p>
                                </>
                            )}

                            <div className="flex flex-wrap items-center gap-4">
                                <Link 
                                    to={isAuthenticated ? "/dashboard" : "/login"}
                                    className="bg-[#0096FF] hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition flex items-center gap-2 shadow-xl shadow-[#0096FF]/20"
                                >
                                    {t('get_started', { defaultValue: 'Get Started' })}
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                                <button 
                                    onClick={() => scrollToSection('about')}
                                    className="px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm border border-gray-600 hover:border-gray-400 hover:bg-gray-800 transition"
                                >
                                    {t('learn_more', { defaultValue: 'Learn More' })}
                                </button>
                            </div>
                        </div>
                        <div className="relative z-0 hidden lg:block">
                            {/* Organic Shape Blob */}
                            <div className="absolute inset-0 bg-[#0096FF] blur-[120px] opacity-20 rounded-full w-[120%] h-[120%] -top-[10%] -left-[10%]"></div>
                            <div 
                                className="w-[120%] aspect-square relative -right-[20%] transition-transform duration-700 hover:scale-[1.02]"
                                style={{
                                    borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 50px -12px rgba(0, 150, 255, 0.25)'
                                }}
                            >
                                <img 
                                    src={heroImageUrl} 
                                    alt="Hero" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </section>
 
                {/* News Section */}
                <section id="news" className="py-20 bg-gray-900 border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">{t('latest_news', { defaultValue: 'Latest News & Updates' })}</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">{t('news_subtitle', { defaultValue: 'Stay up to date with the latest features, releases, and announcements.' })}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {feed.news.length > 0 ? (
                                feed.news.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`bg-gray-800 rounded-3xl p-8 border transition group relative ${editMode ? 'border-dashed border-indigo-500/80 cursor-move' : 'border-gray-700 hover:border-[#0096FF]/50'}`}
                                        draggable={editMode}
                                        onDragStart={() => setDraggedIndex(idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop('news', idx)}
                                    >
                                        {editMode ? (
                                            <div className="space-y-4 text-left">
                                                <div className="flex justify-between items-center text-[9px] font-black text-indigo-400">
                                                    <span>☰ DRAG TO REORDER</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const arr = feed.news.filter((_, i) => i !== idx);
                                                            setFeed({ ...feed, news: arr });
                                                        }}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        [Delete]
                                                    </button>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={item.title || ''} 
                                                    onChange={(e) => {
                                                        const arr = [...feed.news];
                                                        arr[idx] = { ...arr[idx], title: e.target.value };
                                                        setFeed({ ...feed, news: arr });
                                                    }}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    placeholder="Announcement Title"
                                                />
                                                <textarea 
                                                    value={item.text || ''} 
                                                    onChange={(e) => {
                                                        const arr = [...feed.news];
                                                        arr[idx] = { ...arr[idx], text: e.target.value };
                                                        setFeed({ ...feed, news: arr });
                                                    }}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                    placeholder="Details or text body..."
                                                    rows={3}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4 text-[#0096FF]">
                                                    <ShieldCheckIcon className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-xl font-bold mb-3 group-hover:text-[#0096FF] transition text-left">{item.title}</h3>
                                                <p className="text-gray-400 text-sm leading-relaxed text-left">{item.text}</p>
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-full text-center">{t('no_news', { defaultValue: 'No news items currently published.' })}</p>
                            )}
                            
                            {editMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFeed({
                                            ...feed,
                                            news: [
                                                ...feed.news,
                                                { title: 'New Announcement', text: 'Detail explanation goes here...' }
                                            ]
                                        });
                                    }}
                                    className="col-span-full py-8 border-2 border-dashed border-indigo-500/40 rounded-3xl text-indigo-400 font-black uppercase tracking-widest text-xs hover:bg-indigo-950/20 transition"
                                >
                                    + Add New Announcement Card
                                </button>
                            )}
                        </div>
                    </div>
                </section>
 
                {/* Pricing Section */}
                <section id="pricing" className="py-20 bg-[#1a202c]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">{t('pricing_plans', { defaultValue: 'Pricing Plans' })}</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto mb-8">{t('pricing_subtitle', { defaultValue: 'Choose the perfect plan for your business needs.' })}</p>
                            
                            {/* Billing Cycle Toggle */}
                            <div className="inline-flex items-center gap-4 bg-gray-800 p-1.5 rounded-2xl border border-gray-700 shadow-inner">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                        billingCycle === 'monthly'
                                            ? 'bg-[#0096FF] text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {t('monthly', { defaultValue: 'Monthly' })}
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                        billingCycle === 'yearly'
                                            ? 'bg-[#0096FF] text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {t('yearly', { defaultValue: 'Yearly' })}
                                    <span className="bg-green-500/20 text-green-400 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-normal">
                                        -15%
                                    </span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-8 items-stretch mb-16">
                            {feed.pricing_tiers && feed.pricing_tiers.length > 0 ? (
                                feed.pricing_tiers.map((tier, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`w-full md:w-80 rounded-3xl p-8 border transition-transform relative flex flex-col justify-between ${
                                            tier.is_popular 
                                                ? 'bg-gradient-to-b from-[#0096FF]/20 to-gray-800 border-[#0096FF] shadow-xl shadow-[#0096FF]/10' 
                                                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                                        } ${editMode ? 'border-dashed border-indigo-500/80 cursor-move' : ''}`}
                                        draggable={editMode}
                                        onDragStart={() => setDraggedIndex(idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop('pricing_tiers', idx)}
                                    >
                                        {editMode && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0096FF] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer z-10"
                                                onClick={() => {
                                                    const arr = [...feed.pricing_tiers];
                                                    arr[idx] = { ...arr[idx], is_popular: !arr[idx].is_popular };
                                                    setFeed({ ...feed, pricing_tiers: arr });
                                                }}
                                            >
                                                {tier.is_popular ? 'Featured ★' : 'Make Featured'}
                                            </div>
                                        )}
                                        {!editMode && tier.is_popular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0096FF] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {t('most_popular', { defaultValue: 'Most Popular' })}
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h3 className="text-2xl font-bold mb-4 text-left">{t(tier.name, { defaultValue: tier.name })}</h3>
                                            <div className="text-4xl font-black mb-1 text-[#0096FF] text-left">{getCardPrice(tier.price)}</div>
                                            {billingCycle === 'yearly' && !editMode && (
                                                <span className="block text-[9px] font-bold text-green-400 uppercase tracking-wider text-left mb-6">
                                                    {t('billed_annually', { defaultValue: 'Billed annually (15% Off)' })}
                                                </span>
                                            )}
                                            {billingCycle !== 'yearly' && !editMode && (
                                                <div className="mb-6"></div>
                                            )}
                                            
                                            {editMode ? (
                                                <div className="space-y-4 text-left pt-2">
                                                    <div className="flex justify-between items-center text-[9px] font-black text-indigo-400">
                                                        <span>☰ DRAG PLAN</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const arr = feed.pricing_tiers.filter((_, i) => i !== idx);
                                                                setFeed({ ...feed, pricing_tiers: arr });
                                                            }}
                                                            className="text-red-400 font-bold"
                                                        >
                                                            [Delete]
                                                        </button>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={tier.name || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.pricing_tiers];
                                                            arr[idx] = { ...arr[idx], name: e.target.value };
                                                            setFeed({ ...feed, pricing_tiers: arr });
                                                        }}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Plan Name"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={tier.price || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.pricing_tiers];
                                                            arr[idx] = { ...arr[idx], price: e.target.value };
                                                            setFeed({ ...feed, pricing_tiers: arr });
                                                        }}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Price Description (e.g. 50.000 ISK / mo)"
                                                    />
                                                    
                                                    <div className="space-y-2">
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-wider">Features</label>
                                                        {(tier.features || []).map((feat, fIdx) => (
                                                            <div key={fIdx} className="flex gap-2 items-center">
                                                                <input 
                                                                    type="text" 
                                                                    value={feat}
                                                                    onChange={(e) => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features = [...arr[idx].features];
                                                                        features[fIdx] = e.target.value;
                                                                        arr[idx] = { ...arr[idx], features };
                                                                        setFeed({ ...feed, pricing_tiers: arr });
                                                                    }}
                                                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features = arr[idx].features.filter((_, fi) => fi !== fIdx);
                                                                        arr[idx] = { ...arr[idx], features };
                                                                        setFeed({ ...feed, pricing_tiers: arr });
                                                                    }}
                                                                    className="text-red-400 text-xs font-bold"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const arr = [...feed.pricing_tiers];
                                                                const features = [...arr[idx].features, 'New feature detail'];
                                                                arr[idx] = { ...arr[idx], features };
                                                                setFeed({ ...feed, pricing_tiers: arr });
                                                            }}
                                                            className="text-[8px] font-black uppercase text-[#0096FF] tracking-wider hover:underline"
                                                        >
                                                            + Add Feature Detail
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <ul className="space-y-4 mb-8">
                                                    {(tier.features || []).map((feature, fIdx) => (
                                                        <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-300">
                                                            <CheckCircleIcon className="h-5 w-5 text-[#0096FF] shrink-0" />
                                                            <span className="text-left">{t(feature, { defaultValue: feature })}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        
                                        {!editMode && (
                                            <button 
                                                onClick={() => handleOpenLeadForm(tier.name)}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition ${
                                                tier.is_popular 
                                                    ? 'bg-[#0096FF] hover:bg-blue-500 text-white' 
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                            }`}>
                                                {tier.button_text || t('get_started', { defaultValue: 'Get Started' })}
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center">{t('custom_pricing_msg', { defaultValue: 'Contact us for custom pricing tailored to your needs.' })}</p>
                            )}
                            {editMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFeed({
                                            ...feed,
                                            pricing_tiers: [
                                                ...feed.pricing_tiers,
                                                { name: 'Custom Plan Name', price: 'Price Description', features: ['Feature 1', 'Feature 2'], button_text: 'Get Started', is_popular: false }
                                            ]
                                        });
                                    }}
                                    className="w-full md:w-80 py-16 border-2 border-dashed border-indigo-500/40 rounded-3xl text-indigo-400 font-black uppercase tracking-widest text-xs hover:bg-indigo-950/20 transition flex items-center justify-center"
                                >
                                    + Add Plan Tier Card
                                </button>
                            )}
                        </div>

                        {/* Interactive Calculator */}
                        <div className="w-full max-w-2xl mx-auto mt-16 bg-gray-800 rounded-3xl p-8 border border-gray-700 text-left shadow-2xl">
                            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                <span className="text-[#0096FF]">📊</span>
                                {t('calc_title', { defaultValue: 'Calculate Your Monthly Cost' })}
                            </h3>
                            <p className="text-gray-400 text-xs mb-6">
                                {t('calc_subtitle', { defaultValue: 'Drag the slider to input your company size and get an instant pricing breakdown.' })}
                            </p>
                            
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex-1 w-full">
                                        <div className="flex justify-between text-xs font-bold text-gray-300 mb-2">
                                            <span>{t('company_size_label', { defaultValue: 'Company Size:' })}</span>
                                            <span className="text-[#0096FF] font-black text-sm">{calcUsers} {t('people_label', { defaultValue: 'People' })}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={calcUsers}
                                            onChange={(e) => setCalcUsers(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#0096FF]"
                                        />
                                    </div>
                                    <div className="bg-gray-900 rounded-2xl p-4 min-w-[180px] text-center border border-gray-800">
                                        <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider">{t('calculated_tier', { defaultValue: 'Active Tier' })}</span>
                                        <span className="text-sm font-black text-white">{calcResult.tier}</span>
                                    </div>
                                </div>
                                
                                <div className="border-t border-gray-700/50 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 text-xs text-gray-400">
                                        <div className="flex justify-between">
                                            <span>{t('base_price', { defaultValue: 'Base Price (Excl. VSK):' })}</span>
                                            <span className="text-white font-bold">{calcResult.base.toLocaleString()} ISK</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('additional_users', { defaultValue: 'Additional Users:' })} ({calcResult.extraUsers} × {calcResult.extraRate.toLocaleString()} ISK)</span>
                                            <span className="text-white font-bold">{(calcResult.extraUsers * calcResult.extraRate).toLocaleString()} ISK</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-700/50 pt-2 font-bold text-gray-300">
                                            <span>Subtotal (Excl. VSK):</span>
                                            <span>{calcResult.total.toLocaleString()} ISK</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>VSK (24%):</span>
                                            <span>{(calcResult.total * 0.24).toLocaleString()} ISK</span>
                                        </div>
                                        {calcResult.capped && (
                                            <div className="text-emerald-400 text-[10px] font-bold">
                                                ✓ {t('capped_msg', { defaultValue: 'Tier maximum cap applied!' })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-[#0096FF]/10 rounded-2xl p-5 border border-[#0096FF]/20 flex flex-col justify-center items-center">
                                        <span className="text-[10px] font-black text-[#0096FF] uppercase tracking-widest mb-1">{t('total_price_label', { defaultValue: 'Total (Incl. 24% VSK)' })}</span>
                                        <span className="text-3xl font-black text-white text-center">
                                            {(calcResult.total * 1.24).toLocaleString()} ISK 
                                            <span className="text-xs font-bold text-gray-400"> / {t('month', { defaultValue: 'mo' })}</span>
                                        </span>
                                        {billingCycle === 'yearly' && (
                                            <span className="text-[10px] font-bold text-green-400 mt-2">
                                                (Billed yearly: {(calcResult.total * 1.24 * 12).toLocaleString()} ISK / yr)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
 
                {/* About Us & Contact Section */}
                <section id="about" className="py-20 bg-gray-900 border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="text-left">
                            <h2 className="text-3xl md:text-4xl font-black mb-6">{t('about_us_title', { defaultValue: 'About Us' })}</h2>
                            <div className="w-20 h-1 bg-[#0096FF] mb-8 rounded-full"></div>
                            {editMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">About Us Text (English)</label>
                                        <textarea
                                            value={feed.about_us_text_en || ''}
                                            onChange={(e) => setFeed({ ...feed, about_us_text_en: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            rows={5}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">About Us Text (Icelandic)</label>
                                        <textarea
                                            value={feed.about_us_text_is || ''}
                                            onChange={(e) => setFeed({ ...feed, about_us_text_is: e.target.value })}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            rows={5}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-wrap">
                                    {(i18n.language === 'is' && feed.about_us_text_is) 
                                        ? feed.about_us_text_is 
                                        : (i18n.language === 'en' && feed.about_us_text_en) 
                                            ? feed.about_us_text_en 
                                            : feed.about_us_text || 'We are dedicated to providing the best tools and solutions for your business. Our mission is to streamline your workflow and enhance productivity through innovative software.'}
                                </p>
                            )}
                        </div>
                        <div id="contact" className="bg-gray-800 p-10 rounded-3xl border border-gray-700 relative overflow-hidden">
                            {/* Decorative background blob */}
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#0096FF] blur-[100px] opacity-20 rounded-full"></div>
                            
                            <h2 className="text-3xl md:text-4xl font-black mb-6 relative z-10 text-left">{t('contact_us', { defaultValue: 'Contact Us' })}</h2>
                            <div className="w-20 h-1 bg-[#0096FF] mb-10 rounded-full relative z-10"></div>
                            
                            <div className="space-y-6 relative z-10 max-h-[400px] overflow-y-auto pr-2">
                                {feed.contact_persons && feed.contact_persons.length > 0 ? (
                                    feed.contact_persons.map((person, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`bg-gray-900/50 p-4 rounded-2xl border flex items-start gap-4 transition text-left ${editMode ? 'border-dashed border-indigo-500/80 cursor-move' : 'border-gray-700/50'}`}
                                            draggable={editMode}
                                            onDragStart={() => setDraggedIndex(idx)}
                                            onDragOver={handleDragOver}
                                            onDrop={() => handleDrop('contact_persons', idx)}
                                        >
                                            {editMode ? (
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex justify-between items-center text-[8px] font-black text-indigo-400">
                                                        <span>☰ DRAG CONTACT</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const arr = feed.contact_persons.filter((_, i) => i !== idx);
                                                                setFeed({ ...feed, contact_persons: arr });
                                                            }}
                                                            className="text-red-400 font-bold"
                                                        >
                                                            [Delete]
                                                        </button>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={person.name || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.contact_persons];
                                                            arr[idx] = { ...arr[idx], name: e.target.value };
                                                            setFeed({ ...feed, contact_persons: arr });
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2 py-1 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Name"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={person.title || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.contact_persons];
                                                            arr[idx] = { ...arr[idx], title: e.target.value };
                                                            setFeed({ ...feed, contact_persons: arr });
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Title (e.g. Lead Developer)"
                                                    />
                                                    <input 
                                                        type="email" 
                                                        value={person.email || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.contact_persons];
                                                            arr[idx] = { ...arr[idx], email: e.target.value };
                                                            setFeed({ ...feed, contact_persons: arr });
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Email Address"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={person.phone || ''} 
                                                        onChange={(e) => {
                                                            const arr = [...feed.contact_persons];
                                                            arr[idx] = { ...arr[idx], phone: e.target.value };
                                                            setFeed({ ...feed, contact_persons: arr });
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                        placeholder="Phone Number"
                                                    />
                                                    
                                                    {/* Photo Upload Widget */}
                                                    <div className="space-y-1">
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-wider">Photo Upload</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const fd = new FormData();
                                                                fd.append('file', file);
                                                                try {
                                                                    const res = await axiosInstance.post('/system/landing-background', fd);
                                                                    const url = res.data?.url;
                                                                    if (url) {
                                                                        const arr = [...feed.contact_persons];
                                                                        arr[idx] = { ...arr[idx], image_url: url };
                                                                        setFeed({ ...feed, contact_persons: arr });
                                                                        toast.success('Contact photo uploaded successfully!');
                                                                    }
                                                                } catch (err) {
                                                                    toast.error('Upload failed. Please try again.');
                                                                }
                                                            }}
                                                            className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {person.image_url && (
                                                        <img src={resolveMediaUrl(person.image_url)} alt={person.name} className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-gray-700 animate-in fade-in" />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="mb-3">
                                                            <h3 className="text-xl font-bold text-white">{person.name}</h3>
                                                            {person.title && <p className="text-[#0096FF] text-sm font-black uppercase tracking-widest">{person.title}</p>}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {person.email && (
                                                                <div className="flex items-center gap-3">
                                                                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                                                                    <a href={`mailto:${person.email}`} className="text-gray-300 hover:text-white transition">{person.email}</a>
                                                                </div>
                                                            )}
                                                            {person.phone && (
                                                                <div className="flex items-center gap-3">
                                                                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                                                                    <a href={`tel:${person.phone}`} className="text-gray-300 hover:text-white transition">{person.phone}</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">{t('no_contact_info', { defaultValue: 'No contact information available.' })}</p>
                                )}
                                {editMode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFeed({
                                                ...feed,
                                                contact_persons: [
                                                    ...feed.contact_persons,
                                                    { name: 'Contact Name', title: 'Consultant', email: 'sales@rafapp.com', phone: '', image_url: '' }
                                                ]
                                            });
                                        }}
                                        className="w-full py-4 border-2 border-dashed border-indigo-500/40 rounded-2xl text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-950/20 transition"
                                    >
                                        + Add Contact Person
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
 
            <footer className="py-8 bg-black text-center text-gray-600 text-xs uppercase tracking-widest font-bold">
                <p>&copy; {new Date().getFullYear()} RafApp. All rights reserved.</p>
            </footer>
 
            {/* Lead Capture Modal */}
            <Modal
                isOpen={isLeadModalOpen}
                onClose={() => !isSubmittingLead && setIsLeadModalOpen(false)}
                title={`${t('get_started', { defaultValue: 'Get Started' })} - ${selectedTierForLead}`}
                showFooter={false}
            >
                <form onSubmit={handleLeadSubmit} className="space-y-4 pt-4 text-left">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('your_name', { defaultValue: 'Your Name' })}</label>
                        <input 
                            type="text" 
                            required 
                            value={leadForm.name} 
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('company_name', { defaultValue: 'Company Name' })}</label>
                        <input 
                            type="text" 
                            required 
                            value={leadForm.company} 
                            onChange={e => setLeadForm({...leadForm, company: e.target.value})}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('email_address', { defaultValue: 'Email Address' })}</label>
                        <input 
                            type="email" 
                            required 
                            value={leadForm.email} 
                            onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('phone_optional', { defaultValue: 'Phone Number (Optional)' })}</label>
                        <input 
                            type="tel" 
                            value={leadForm.phone} 
                            onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                        />
                    </div>
                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmittingLead}
                            className="w-full bg-[#0096FF] hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition disabled:opacity-50"
                        >
                            {isSubmittingLead ? t('sending', { defaultValue: 'Sending...' }) : t('request_access', { defaultValue: 'Request Access' })}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default LandingPage;
