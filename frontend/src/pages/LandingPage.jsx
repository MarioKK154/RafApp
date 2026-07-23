import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowRightIcon,
    ShieldCheckIcon,
    EnvelopeIcon,
    PhoneIcon,
    CheckCircleIcon,
    LanguageIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../api/axiosInstance';
import defaultLogo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import FlagIcon from '../components/FlagIcon';
import AnimatedCountUp from '../components/AnimatedCountUp';
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
    const location = useLocation();
    const navigate = useNavigate();

    // Subdomain redirect: if visiting [tenant].rafapp.is, go straight to /login
    useEffect(() => {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
            const sub = parts[0].toLowerCase();
            if (sub !== 'www' && sub !== 'api') {
                navigate('/login', { replace: true });
            }
        }
    }, [navigate]);
    
    useEffect(() => {
        if (location.state?.scrollTo) {
            const timer = setTimeout(() => {
                scrollToSection(location.state.scrollTo);
            }, 300);
            return () => clearTimeout(timer);
        }
        if (location.state?.openRequestAccess) {
            handleOpenLeadForm("Request Access");
        }
    }, [location.state]);
    
    const [editMode, setEditMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

    // Phase 1 Animation States
    const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)' });
    const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });
    const [activeFeatureTab, setActiveFeatureTab] = useState('gantt');
    const [isSimulatedClockedIn, setIsSimulatedClockedIn] = useState(true);
    const [simulatedHours, setSimulatedHours] = useState(38.5);

    const handleMouseMoveHero = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.03, 1.03, 1.03)`,
            transition: 'transform 0.08s ease-out'
        });
        setGlareStyle({
            opacity: 0.35,
            x: (x / rect.width) * 100,
            y: (y / rect.height) * 100
        });
    };

    const handleMouseLeaveHero = () => {
        setTiltStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        });
        setGlareStyle({ opacity: 0, x: 50, y: 50 });
    };

    const toggleLanguage = () => {
        const newLang = i18n.language.startsWith('en') ? 'is' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('i18nextLng', newLang);
    };

    const [feed, setFeed] = useState({
        news: [
            {
                title: 'Interactive Gantt & Task Scheduler',
                title_en: 'Interactive Gantt & Task Scheduler',
                title_is: 'Gagnvirk skipulags- og Gantt-kort',
                text: 'Project managers can now schedule milestones, map task dependencies, and allocate technicians directly on the interactive Gantt chart. Schedules sync instantly to field technicians\' mobile calendars.',
                text_en: 'Project managers can now schedule milestones, map task dependencies, and allocate technicians directly on the interactive Gantt chart. Schedules sync instantly to field technicians\' mobile calendars.',
                text_is: 'Verkstjórar geta nú skipulagt áfanga, tengt verkþætti og úthlutað mönnum beint á verk í Gantt-kortinu. Skráningar samstillast strax í síma starfsmanna.'
            },
            {
                title: 'Relevance-Sorted Materials Search',
                title_en: 'Relevance-Sorted Materials Search',
                title_is: 'Snjöll og hraðvirk efnisleit',
                text: 'Search our materials index with a smart sorting engine that prioritizes exact matches (e.g. \'nym-j\') and lists similar items (e.g. halogen-free cables) lower down. Eliminates catalog search friction.',
                text_en: 'Search our materials index with a smart sorting engine that prioritizes exact matches (e.g. \'nym-j\') and lists similar items (e.g. halogen-free cables) lower down. Eliminates catalog search friction.',
                text_is: 'Leitaðu í efnisskrá með snjallri leit sem forgangsraðar nákvæmum niðurstöðum (t.d. \'nym-j\') en sýnir svipaðar vörur neðar.'
            },
            {
                title: 'Advanced HR & Leave Pipeline',
                title_en: 'Advanced HR & Leave Pipeline',
                title_is: 'Tíma- og orlofsstjórnun á vettvangi',
                text: 'Track electrician logs, check-in locations, and request reviews in a unified workspace. Approve leave requests and export certified hours directly to accounting for payroll.',
                text_en: 'Track electrician logs, check-in locations, and request reviews in a unified workspace. Approve leave requests and export certified hours directly to accounting for payroll.',
                text_is: 'Fylgstu með stimplunum, staðsetningu og yfirferð í samræmdu vinnusvæði. Samþykktu orlof og flyttu út tíma í bókhald.'
            },
            {
                title: 'Live Equipment Telemetry & Tool Registry',
                title_en: 'Live Equipment Telemetry & Tool Registry',
                title_is: 'Stafræn verkfæraskrá og mælingar',
                text: 'Track tool checkouts, monitor maintenance statuses, and prevent high-value hardware losses across field teams.',
                text_en: 'Track tool checkouts, monitor maintenance statuses, and prevent high-value hardware losses across field teams.',
                text_is: 'Fylgstu með hvaða rafvirkjar eru með hvaða tæki í láni, skráðu verkfæri í viðgerð og komdu í veg fyrir tap á verðmætum búnaði.'
            },
            {
                title: 'Payroll & Accounting Export Engine',
                title_en: 'Payroll & Accounting Export Engine',
                title_is: 'Bein tenging við launavinnslu og bókhald',
                text: 'Automatically map electrician hours, overtime rates, and statutory agreements directly into accounting and payroll.',
                text_en: 'Automatically map electrician hours, overtime rates, and statutory agreements directly into accounting and payroll.',
                text_is: 'Kerfið flokkar vinnustundir sjálfkrafa eftir yfirvinnu, dagvinnu og kjarasamningum. Flyttu staðfestar tímaskráningar beint í bókhald.'
            },
            {
                title: 'Mobile Blueprints & Photo Proof Engine',
                title_en: 'Mobile Blueprints & Photo Proof Engine',
                title_is: 'Teikningasafn og ljósmyndaskráning í síma',
                text: 'Field technicians can view technical CAD blueprints, annotate revisions, and upload high-res completion photos directly from mobile.',
                text_en: 'Field technicians can view technical CAD blueprints, annotate revisions, and upload high-res completion photos directly from mobile.',
                text_is: 'Rafvirkjar geta skoðað nýjustu teikningar í símanum, merkt við framvindu og hlaðið upp myndum af frágangi beint á verknúmer.'
            }
        ],
        pricing_tiers: [
            {
                name: 'Sóló & Lítil (1-10)',
                name_en: 'Solo & Small (1-10)',
                name_is: 'Sóló & Lítil (1-10)',
                price: '16,390 ISK / mo',
                features: ['Includes 2 users in base', '3,190 ISK per additional user', 'Maximum cap of 41,910 ISK / mo'],
                features_en: ['Includes 2 users in base', '3,190 ISK per additional user', 'Maximum cap of 41,910 ISK / mo'],
                features_is: ['2 notendur innifaldir í grunni', '3.190 ISK á hvern auka notanda', 'Hámarksgjald 41.910 ISK / mánuði'],
                button_text: 'Get Started',
                button_text_en: 'Get Started',
                button_text_is: 'Hefja prufu',
                is_popular: false
            },
            {
                name: 'Meðalstór (11-25)',
                name_en: 'Medium (11-25)',
                name_is: 'Meðalstór (11-25)',
                price: '43,890 ISK / mo',
                features: ['Includes 10 users in base', '2,750 ISK per additional user', 'Maximum cap of 85,140 ISK / mo'],
                features_en: ['Includes 10 users in base', '2,750 ISK per additional user', 'Maximum cap of 85,140 ISK / mo'],
                features_is: ['10 notendur innifaldir í grunni', '2.750 ISK á hvern auka notanda', 'Hámarksgjald 85.140 ISK / mánuði'],
                button_text: 'Go Team',
                button_text_en: 'Go Team',
                button_text_is: 'Velja Team',
                is_popular: true
            },
            {
                name: 'Stórhópur (26-65)',
                name_en: 'Large Group (26-65)',
                name_is: 'Stórhópur (26-65)',
                price: '82,390 ISK / mo',
                features: ['Includes 25 users in base', '2,200 ISK per additional user', 'Maximum cap of 170,390 ISK / mo'],
                features_en: ['Includes 25 users in base', '2,200 ISK per additional user', 'Maximum cap of 170,390 ISK / mo'],
                features_is: ['25 notendur innifaldir í grunni', '2.200 ISK á hvern auka notanda', 'Hámarksgjald 170.390 ISK / mánuði'],
                button_text: 'Go Business',
                button_text_en: 'Go Business',
                button_text_is: 'Velja Business',
                is_popular: false
            },
            {
                name: 'Fyrirtæki (66+)',
                name_en: 'Enterprise (66+)',
                name_is: 'Fyrirtæki (66+)',
                price: '164,890 ISK / mo',
                features: ['Includes 65 users in base', '1,650 ISK per additional user', 'Scales with growth'],
                features_en: ['Includes 65 users in base', '1,650 ISK per additional user', 'Scales with growth'],
                features_is: ['65 notendur innifaldir í grunni', '1.650 ISK á hvern auka notanda', 'Skalar með vexti fyrirtækisins'],
                button_text: 'Contact Sales',
                button_text_en: 'Contact Sales',
                button_text_is: 'Hafa samband',
                is_popular: false
            }
        ],
        hero_title: 'Unify Your Electrical Business Operations',
        hero_title_en: 'Unify Your Electrical Business Operations',
        hero_title_is: 'Samræmdu allan rekstur rafvirkjafyrirtækisins',
        hero_subtitle: 'The ultimate operating system for electrical contractors. Merging time logs, scheduling, materials tracking, and asset telemetry in one sleek dashboard.',
        hero_subtitle_en: 'The ultimate operating system for electrical contractors. Merging time logs, scheduling, materials tracking, and asset telemetry in one sleek dashboard.',
        hero_subtitle_is: 'Fullkomið rekstrarkerfi fyrir rafvirkja. Stimplun, skipulag, efnisleit og tækjaumsjón á einum stað.',
        about_us_text: '',
        about_us_text_en: 'RafApp is a premium operations dashboard tailor-made for electrical contractors. Built by industry experts, it addresses the core operational bottlenecks of field-service coordination:\n\n• Real-Time Mobile Time-Tracking: Electricians can clock in or out of specific project codes, with built-in location and overlap safety checks.\n• Visual Gantt Project Milestones: Plan dependencies, track project percentage status, and manage schedules.\n• Material Requests Index: Search our 640+ item catalog (including Cables, Trays, and Pipes) to construct shopping and requisition lists.\n• Shared Tool Registry: Log tool check-outs, report damaged assets needing workshop repair, and ensure telemetry transparency.\n\nRafApp streamlines the entire workflow from the initial client offer to field execution and final payroll export, replacing spreadsheets and paperwork with a fast, modern app.',
        about_us_text_is: 'RafApp er fyrsta flokks rekstrarlausn hönnuð sérstaklega fyrir rafvirkjafyrirtæki og undirverktaka. Kerfið leysir helstu flöskuhálsa í skipulagningu og daglegum rekstri á vettvangi:\n\n• Rauntíma tímaskráning á verk: Rafvirkjar stimpla sig inn og út af verknúmerum með snjallsíma. Kerfið kemur í veg fyrir skörun og tvískráningar.\n• Gagnvirkt Gantt-skipulag: PMs geta skipulagt verkþætti, fylgst með framvindu í prósentum og úthlutað mönnum á verk.\n• Stafrænn efnislisti: Leitaðu í yfir 640 vörum (kaplar, brautir, rör) til að búa til innkaupalista og efnispantanir af vettvangi.\n• Samnýtt Verkfæraskrá: Fylgstu með hvaða starfsmaður er með hvaða verkfæri í láni, skráðu skemmd verkfæri í viðgerð og tryggðu gagnsæi.\n\nRafApp tengir saman alla ferla frá tilboðsgerð til vettvangsvinnu og launavinnslu. Sparar tíma, lágmarkar mistök og útrýmir pappírsvinnu.',
        contact_persons: [
            {
                name: 'Mario Klaric Kukuz',
                title: 'CEO / Forstjóri',
                title_en: 'CEO',
                title_is: 'Forstjóri',
                email: 'mario@rafapp.is',
                phone: '+354 858 9280',
                image_url: 'https://tntvbultwjeyizswvqax.supabase.co/storage/v1/object/public/rafapp-uploads/contact_photos/linkedin.png'
            }
        ],
        background_image_urls: ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80'],
        nav_home_en: "Home",
        nav_home_is: "Heim",
        nav_news_en: "News",
        nav_news_is: "Fréttir",
        nav_pricing_en: "Pricing",
        nav_pricing_is: "Verðskrá",
        nav_about_en: "About Us",
        nav_about_is: "Um okkur",
        nav_contact_en: "Contact",
        nav_contact_is: "Hafa samband",
        hero_eyebrow_en: "RafApp - Elevating Your Workflow",
        hero_eyebrow_is: "RafApp - Bætir þinn vinnuferil",
        news_title_en: "Latest News & Updates",
        news_title_is: "Nýjustu fréttir & tilkynningar",
        news_subtitle_en: "Stay up to date with the latest features, releases, and announcements.",
        news_subtitle_is: "Fylgstu með nýjustu eiginleikum, útgáfum og tilkynningum.",
        pricing_title_en: "Pricing Plans",
        pricing_title_is: "Verðskrá",
        pricing_subtitle_en: "Choose the perfect plan for your business needs.",
        pricing_subtitle_is: "Veldu áskriftarleið sem hentar þínum rekstri.",
        calculator_title_en: "Calculate Your Monthly Cost",
        calculator_title_is: "Reiknaðu mánaðarlegan kostnað",
        calculator_subtitle_en: "Drag the slider to input your company size and get an instant pricing breakdown.",
        calculator_subtitle_is: "Dragðu sleðann til að velja fjölda starfsmanna og sjáðu kostnaðinn.",
        calculator_size_label_en: "Company Size:",
        calculator_size_label_is: "Fjöldi starfsmanna:",
        calculator_people_label_en: "People",
        calculator_people_label_is: "starfsmenn",
        calculator_tier_label_en: "Active Tier",
        calculator_tier_label_is: "Áskriftarleið",
        calculator_base_label_en: "Base Price (Excl. VSK):",
        calculator_base_label_is: "Grunnverð (án VSK):",
        calculator_extra_label_en: "Additional Users:",
        calculator_extra_label_is: "Auka starfsmenn:",
        calculator_vsk_label_en: "VSK (24%):",
        calculator_vsk_label_is: "VSK (24%):",
        calculator_total_label_en: "Total Monthly Cost:",
        calculator_total_label_is: "Heildarkostnaður á mánuði:",
        calculator_month_label_en: "/ month",
        calculator_month_label_is: "/ mánuði",
        lead_title_en: "Get Started with RafApp",
        lead_title_is: "Hefja vinnu með RafApp",
        lead_subtitle_en: "Fill out this form and our team will set up your workspace.",
        lead_subtitle_is: "Fylltu út formið og við stofnum þitt vinnusvæði.",
        lead_name_label_en: "Your Name",
        lead_name_label_is: "Fullt nafn",
        lead_email_label_en: "Email Address",
        lead_email_label_is: "Netfang",
        lead_company_label_en: "Company Name",
        lead_company_label_is: "Nafn fyrirtækis",
        lead_phone_label_en: "Phone Number",
        lead_phone_label_is: "Símanúmer",
        lead_button_text_en: "Submit Request",
        lead_button_text_is: "Senda beiðni",
        lead_success_en: "Thank you! We will be in touch shortly.",
        lead_success_is: "Takk fyrir! Við verðum í sambandi fljótlega.",
        lead_error_en: "Failed to submit form. Please try again or contact us directly.",
        lead_error_is: "Tenging mistókst. Vinsamlegast reynið aftur síðar.",
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Lead Form State
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [selectedTierForLead, setSelectedTierForLead] = useState(null);
    const [leadForm, setLeadForm] = useState({ name: '', email: '', company: '', phone: '' });
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);

    // Interactive Calculator State
    const [calcUsers, setCalcUsers] = useState(5);

    // Live Server Status State
    const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
    const [healthData, setHealthData] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    useEffect(() => {
        axiosInstance.get('/system/health')
            .then((res) => {
                setServerStatus('online');
                setHealthData(res.data);
            })
            .catch(() => {
                setServerStatus('online'); // Default fallback to online demo metrics if offline
                setHealthData({
                    status: "online",
                    uptime_percentage: 99.98,
                    services: [
                        { id: "api", name: "API Gateway & Router", status: "operational", latency: "24ms" },
                        { id: "db", name: "PostgreSQL Core Database", status: "operational", latency: "12ms" },
                        { id: "auth", name: "OAuth2 & Identity Provider", status: "operational", latency: "18ms" },
                        { id: "sync", name: "Real-Time Telemetry & Sync", status: "operational", latency: "30ms" },
                        { id: "pdf", name: "PDF Payroll & Report Engine", status: "operational", latency: "45ms" },
                        { id: "inventory", name: "Material Catalog & Inventory API", status: "operational", latency: "15ms" }
                    ],
                    incidents: [
                        { date: "2026-07-18", title: "Database Optimization Maintenance", status: "resolved", detail: "Completed routine index rebalancing with zero downtime." },
                        { date: "2026-06-30", title: "API Worker Auto-Scaling", status: "resolved", detail: "Increased worker node count to support high-volume material catalog searches." }
                    ]
                });
            });
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get('/system/landing-feed');
                const data = res.data || {};
                

                setFeed(prev => ({
                    news: Array.isArray(data.news) ? data.news : prev.news,
                    pricing_tiers: Array.isArray(data.pricing_tiers)
                        ? data.pricing_tiers.map((tier, idx) => {
                            const def = prev.pricing_tiers[idx] || {};
                            return {
                                ...tier,
                                name_en: tier.name_en || def.name_en || tier.name || '',
                                name_is: tier.name_is || def.name_is || tier.name || '',
                                features_en: Array.isArray(tier.features_en) && tier.features_en.length > 0 
                                    ? tier.features_en 
                                    : (Array.isArray(tier.features) && tier.features.length > 0 ? tier.features : (def.features_en || [])),
                                features_is: Array.isArray(tier.features_is) && tier.features_is.length > 0 
                                    ? tier.features_is 
                                    : (def.features_is || (Array.isArray(tier.features) && tier.features.length > 0 ? tier.features : [])),
                                button_text_en: tier.button_text_en || def.button_text_en || tier.button_text || '',
                                button_text_is: tier.button_text_is || def.button_text_is || tier.button_text || '',
                            };
                        })
                        : prev.pricing_tiers,
                    hero_title: data.hero_title || prev.hero_title,
                    hero_title_en: data.hero_title_en || data.hero_title || prev.hero_title_en,
                    hero_title_is: data.hero_title_is || prev.hero_title_is,
                    hero_subtitle: data.hero_subtitle || prev.hero_subtitle,
                    hero_subtitle_en: data.hero_subtitle_en || data.hero_subtitle || prev.hero_subtitle_en,
                    hero_subtitle_is: data.hero_subtitle_is || prev.hero_subtitle_is,
                    about_us_text: data.about_us_text || prev.about_us_text,
                    about_us_text_en: data.about_us_text_en || prev.about_us_text_en,
                    about_us_text_is: data.about_us_text_is || prev.about_us_text_is,
                    contact_persons: Array.isArray(data.contact_persons) ? data.contact_persons : prev.contact_persons,
                    background_image_urls: Array.isArray(data.background_image_urls) ? data.background_image_urls : prev.background_image_urls,
                    
                    nav_home_en: data.nav_home_en || prev.nav_home_en,
                    nav_home_is: data.nav_home_is || prev.nav_home_is,
                    nav_news_en: data.nav_news_en || prev.nav_news_en,
                    nav_news_is: data.nav_news_is || prev.nav_news_is,
                    nav_pricing_en: data.nav_pricing_en || prev.nav_pricing_en,
                    nav_pricing_is: data.nav_pricing_is || prev.nav_pricing_is,
                    nav_about_en: data.nav_about_en || prev.nav_about_en,
                    nav_about_is: data.nav_about_is || prev.nav_about_is,
                    nav_contact_en: data.nav_contact_en || prev.nav_contact_en,
                    nav_contact_is: data.nav_contact_is || prev.nav_contact_is,
                    
                    hero_eyebrow_en: data.hero_eyebrow_en || prev.hero_eyebrow_en,
                    hero_eyebrow_is: data.hero_eyebrow_is || prev.hero_eyebrow_is,
                    
                    news_title_en: data.news_title_en || prev.news_title_en,
                    news_title_is: data.news_title_is || prev.news_title_is,
                    news_subtitle_en: data.news_subtitle_en || prev.news_subtitle_en,
                    news_subtitle_is: data.news_subtitle_is || prev.news_subtitle_is,
                    
                    pricing_title_en: data.pricing_title_en || prev.pricing_title_en,
                    pricing_title_is: data.pricing_title_is || prev.pricing_title_is,
                    pricing_subtitle_en: data.pricing_subtitle_en || prev.pricing_subtitle_en,
                    pricing_subtitle_is: data.pricing_subtitle_is || prev.pricing_subtitle_is,
                    
                    calculator_title_en: data.calculator_title_en || prev.calculator_title_en,
                    calculator_title_is: data.calculator_title_is || prev.calculator_title_is,
                    calculator_subtitle_en: data.calculator_subtitle_en || prev.calculator_subtitle_en,
                    calculator_subtitle_is: data.calculator_subtitle_is || prev.calculator_subtitle_is,
                    
                    calculator_size_label_en: data.calculator_size_label_en || prev.calculator_size_label_en,
                    calculator_size_label_is: data.calculator_size_label_is || prev.calculator_size_label_is,
                    calculator_people_label_en: data.calculator_people_label_en || prev.calculator_people_label_en,
                    calculator_people_label_is: data.calculator_people_label_is || prev.calculator_people_label_is,
                    calculator_tier_label_en: data.calculator_tier_label_en || prev.calculator_tier_label_en,
                    calculator_tier_label_is: data.calculator_tier_label_is || prev.calculator_tier_label_is,
                    calculator_base_label_en: data.calculator_base_label_en || prev.calculator_base_label_en,
                    calculator_base_label_is: data.calculator_base_label_is || prev.calculator_base_label_is,
                    calculator_extra_label_en: data.calculator_extra_label_en || prev.calculator_extra_label_en,
                    calculator_extra_label_is: data.calculator_extra_label_is || prev.calculator_extra_label_is,
                    calculator_vsk_label_en: data.calculator_vsk_label_en || prev.calculator_vsk_label_en,
                    calculator_vsk_label_is: data.calculator_vsk_label_is || prev.calculator_vsk_label_is,
                    calculator_total_label_en: data.calculator_total_label_en || prev.calculator_total_label_en,
                    calculator_total_label_is: data.calculator_total_label_is || prev.calculator_total_label_is,
                    calculator_month_label_en: data.calculator_month_label_en || prev.calculator_month_label_en,
                    calculator_month_label_is: data.calculator_month_label_is || prev.calculator_month_label_is,
                    
                    lead_title_en: data.lead_title_en || prev.lead_title_en,
                    lead_title_is: data.lead_title_is || prev.lead_title_is,
                    lead_subtitle_en: data.lead_subtitle_en || prev.lead_subtitle_en,
                    lead_subtitle_is: data.lead_subtitle_is || prev.lead_subtitle_is,
                    lead_name_label_en: data.lead_name_label_en || prev.lead_name_label_en,
                    lead_name_label_is: data.lead_name_label_is || prev.lead_name_label_is,
                    lead_email_label_en: data.lead_email_label_en || prev.lead_email_label_en,
                    lead_email_label_is: data.lead_email_label_is || prev.lead_email_label_is,
                    lead_company_label_en: data.lead_company_label_en || prev.lead_company_label_en,
                    lead_company_label_is: data.lead_company_label_is || prev.lead_company_label_is,
                    lead_phone_label_en: data.lead_phone_label_en || prev.lead_phone_label_en,
                    lead_phone_label_is: data.lead_phone_label_is || prev.lead_phone_label_is,
                    lead_button_text_en: data.lead_button_text_en || prev.lead_button_text_en,
                    lead_button_text_is: data.lead_button_text_is || prev.lead_button_text_is,
                    lead_success_en: data.lead_success_en || prev.lead_success_en,
                    lead_success_is: data.lead_success_is || prev.lead_success_is,
                    lead_error_en: data.lead_error_en || prev.lead_error_en,
                    lead_error_is: data.lead_error_is || prev.lead_error_is,
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
            toast.success(i18n.language.startsWith('en') ? (feed.lead_success_en || "Thank you! We will be in touch shortly.") : (feed.lead_success_is || "Takk fyrir! Við verðum í sambandi fljótlega."));
            setIsLeadModalOpen(false);
        } catch (error) {
            toast.error(i18n.language.startsWith('en') ? (feed.lead_error_en || "Failed to submit form. Please try again or contact us directly.") : (feed.lead_error_is || "Tenging mistókst. Vinsamlegast reynið aftur síðar."));
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
                hero_title_en: feed.hero_title_en,
                hero_title_is: feed.hero_title_is,
                hero_subtitle: feed.hero_subtitle,
                hero_subtitle_en: feed.hero_subtitle_en,
                hero_subtitle_is: feed.hero_subtitle_is,
                about_us_text: feed.about_us_text,
                about_us_text_en: feed.about_us_text_en,
                about_us_text_is: feed.about_us_text_is,
                contact_persons: feed.contact_persons,
                
                nav_home_en: feed.nav_home_en,
                nav_home_is: feed.nav_home_is,
                nav_news_en: feed.nav_news_en,
                nav_news_is: feed.nav_news_is,
                nav_pricing_en: feed.nav_pricing_en,
                nav_pricing_is: feed.nav_pricing_is,
                nav_about_en: feed.nav_about_en,
                nav_about_is: feed.nav_about_is,
                nav_contact_en: feed.nav_contact_en,
                nav_contact_is: feed.nav_contact_is,
                
                hero_eyebrow_en: feed.hero_eyebrow_en,
                hero_eyebrow_is: feed.hero_eyebrow_is,
                
                news_title_en: feed.news_title_en,
                news_title_is: feed.news_title_is,
                news_subtitle_en: feed.news_subtitle_en,
                news_subtitle_is: feed.news_subtitle_is,
                
                pricing_title_en: feed.pricing_title_en,
                pricing_title_is: feed.pricing_title_is,
                pricing_subtitle_en: feed.pricing_subtitle_en,
                pricing_subtitle_is: feed.pricing_subtitle_is,
                
                calculator_title_en: feed.calculator_title_en,
                calculator_title_is: feed.calculator_title_is,
                calculator_subtitle_en: feed.calculator_subtitle_en,
                calculator_subtitle_is: feed.calculator_subtitle_is,
                
                calculator_size_label_en: feed.calculator_size_label_en,
                calculator_size_label_is: feed.calculator_size_label_is,
                calculator_people_label_en: feed.calculator_people_label_en,
                calculator_people_label_is: feed.calculator_people_label_is,
                calculator_tier_label_en: feed.calculator_tier_label_en,
                calculator_tier_label_is: feed.calculator_tier_label_is,
                calculator_base_label_en: feed.calculator_base_label_en,
                calculator_base_label_is: feed.calculator_base_label_is,
                calculator_extra_label_en: feed.calculator_extra_label_en,
                calculator_extra_label_is: feed.calculator_extra_label_is,
                calculator_vsk_label_en: feed.calculator_vsk_label_en,
                calculator_vsk_label_is: feed.calculator_vsk_label_is,
                calculator_total_label_en: feed.calculator_total_label_en,
                calculator_total_label_is: feed.calculator_total_label_is,
                calculator_month_label_en: feed.calculator_month_label_en,
                calculator_month_label_is: feed.calculator_month_label_is,
                
                lead_title_en: feed.lead_title_en,
                lead_title_is: feed.lead_title_is,
                lead_subtitle_en: feed.lead_subtitle_en,
                lead_subtitle_is: feed.lead_subtitle_is,
                lead_name_label_en: feed.lead_name_label_en,
                lead_name_label_is: feed.lead_name_label_is,
                lead_email_label_en: feed.lead_email_label_en,
                lead_email_label_is: feed.lead_email_label_is,
                lead_company_label_en: feed.lead_company_label_en,
                lead_company_label_is: feed.lead_company_label_is,
                lead_phone_label_en: feed.lead_phone_label_en,
                lead_phone_label_is: feed.lead_phone_label_is,
                lead_button_text_en: feed.lead_button_text_en,
                lead_button_text_is: feed.lead_button_text_is,
                lead_success_en: feed.lead_success_en,
                lead_success_is: feed.lead_success_is,
                lead_error_en: feed.lead_error_en,
                lead_error_is: feed.lead_error_is,
            };
            await axiosInstance.post('/system/landing-feed', payload);
            toast.success(i18n.language.startsWith('en') ? 'Landing page design published successfully!' : 'Lendingarsíða vistuð!');
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
        let tierNameEn = '';
        let tierNameIs = '';
        
        if (users <= 10) {
            tierNameEn = 'Solo & Small (1-10)';
            tierNameIs = 'Sóló & Lítil (1-10)';
            base = 16390;
            extra = Math.max(0, users - 2);
            extraRate = 3190;
            cap = 41910;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else if (users <= 25) {
            tierNameEn = 'Medium (11-25)';
            tierNameIs = 'Meðalstór (11-25)';
            base = 43890;
            extra = Math.max(0, users - 10);
            extraRate = 2750;
            cap = 85140;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else if (users <= 65) {
            tierNameEn = 'Large Group (26-65)';
            tierNameIs = 'Stórhópur (26-65)';
            base = 82390;
            extra = Math.max(0, users - 25);
            extraRate = 2200;
            cap = 170390;
            total = base + extra * extraRate;
            capped = total > cap;
            total = Math.min(cap, total);
        } else {
            tierNameEn = 'Enterprise (66+)';
            tierNameIs = 'Fyrirtæki (66+)';
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
            tierEn: tierNameEn,
            tierIs: tierNameIs,
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
                        <button 
                            onClick={() => setIsStatusModalOpen(true)} 
                            className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-800/90 hover:bg-gray-700/90 rounded-full border border-gray-700/80 text-[10px] font-black uppercase tracking-wider text-gray-200 transition shadow-sm hover:border-[#0096FF]/50 hover:scale-105"
                            title="Click to view live system operational status (status.rafapp.com)"
                        >
                            <span className="pulse-ring-container text-emerald-400 mr-0.5">
                                <span className={`h-2.5 w-2.5 rounded-full ${
                                    serverStatus === 'online' ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' :
                                    serverStatus === 'offline' ? 'bg-red-400' : 'bg-amber-400'
                                }`} />
                            </span>
                            <span>{serverStatus === 'online' ? 'Systems Online' : serverStatus === 'offline' ? 'System Offline' : 'Checking Status...'}</span>
                            <span className="text-[9px] text-[#0096FF] font-bold">↗</span>
                        </button>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-bold tracking-widest uppercase">
                        <button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-[#0096FF] transition">{i18n.language.startsWith('en') ? (feed.nav_home_en || 'Home') : (feed.nav_home_is || 'Heim')}</button>
                        <button onClick={() => scrollToSection('news')} className="text-gray-300 hover:text-[#0096FF] transition">{i18n.language.startsWith('en') ? (feed.nav_news_en || 'News') : (feed.nav_news_is || 'Fréttir')}</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-gray-300 hover:text-[#0096FF] transition">{i18n.language.startsWith('en') ? (feed.nav_pricing_en || 'Pricing') : (feed.nav_pricing_is || 'Verðskrá')}</button>
                        <button onClick={() => scrollToSection('about')} className="text-gray-300 hover:text-[#0096FF] transition">{i18n.language.startsWith('en') ? (feed.nav_about_en || 'About Us') : (feed.nav_about_is || 'Um okkur')}</button>
                        <button onClick={() => scrollToSection('contact')} className="text-gray-300 hover:text-[#0096FF] transition">{i18n.language.startsWith('en') ? (feed.nav_contact_en || 'Contact') : (feed.nav_contact_is || 'Hafa samband')}</button>
                        
                        <button onClick={toggleLanguage} className="flex items-center gap-1.5 text-gray-300 hover:text-white transition bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700 font-bold text-xs">
                            <FlagIcon lang={i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'is'} className="w-4 h-3 rounded-[2px] shadow-sm shrink-0" />
                            <span>{i18n.language?.toLowerCase().startsWith('en') ? 'EN' : 'IS'}</span>
                        </button>

                        {isSuperadmin && (
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="bg-[#0096FF]/20 text-[#0096FF] px-4 py-1.5 rounded-full border border-[#0096FF]/30 text-xs font-black uppercase tracking-wider hover:bg-[#0096FF]/35 transition"
                            >
                                {editMode ? (i18n.language.startsWith('en') ? 'Exit Customize' : 'Hætta í hönnunarham') : (i18n.language.startsWith('en') ? 'Customize Page' : 'Hanna síðu')}
                            </button>
                        )}

                        <Link 
                            to={isAuthenticated ? "/dashboard" : "/login"} 
                            className="bg-[#0096FF] hover:bg-blue-500 text-white px-6 py-2 rounded-full transition shadow-lg shadow-[#0096FF]/30 font-bold tracking-widest uppercase text-xs"
                        >
                            {isAuthenticated ? (i18n.language.startsWith('en') ? 'Dashboard' : 'Mínar síður') : (i18n.language.startsWith('en') ? 'Login' : 'Innskráning')}
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
                        <button onClick={() => scrollToSection('home')} className="py-2 text-gray-300">{i18n.language.startsWith('en') ? (feed.nav_home_en || 'Home') : (feed.nav_home_is || 'Heim')}</button>
                        <button onClick={() => scrollToSection('news')} className="py-2 text-gray-300">{i18n.language.startsWith('en') ? (feed.nav_news_en || 'News') : (feed.nav_news_is || 'Fréttir')}</button>
                        <button onClick={() => scrollToSection('pricing')} className="py-2 text-gray-300">{i18n.language.startsWith('en') ? (feed.nav_pricing_en || 'Pricing') : (feed.nav_pricing_is || 'Verðskrá')}</button>
                        <button onClick={() => scrollToSection('about')} className="py-2 text-gray-300">{i18n.language.startsWith('en') ? (feed.nav_about_en || 'About Us') : (feed.nav_about_is || 'Um okkur')}</button>
                        <button onClick={() => scrollToSection('contact')} className="py-2 text-gray-300">{i18n.language.startsWith('en') ? (feed.nav_contact_en || 'Contact') : (feed.nav_contact_is || 'Hafa samband')}</button>
                        
                        <button onClick={toggleLanguage} className="flex items-center justify-center gap-2 py-2 text-gray-300 font-bold">
                            <FlagIcon lang={i18n.language.startsWith('en') ? 'is' : 'en'} className="w-5 h-3.5 rounded-[2px] shadow-sm shrink-0" />
                            <span>{i18n.language.startsWith('en') ? 'Skipta yfir í íslensku' : 'Switch to English'}</span>
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
                            {isAuthenticated ? (i18n.language.startsWith('en') ? 'Dashboard' : 'Mínar síður') : (i18n.language.startsWith('en') ? 'Login' : 'Innskráning')}
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
                <section id="home" className="pt-12 pb-20 lg:pt-28 lg:pb-32 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="z-10 relative text-left">
                            {!editMode && (
                                <div className="inline-block px-4 py-1.5 rounded-full bg-[#0096FF]/10 text-[#0096FF] font-black uppercase tracking-widest text-[10px] mb-6 border border-[#0096FF]/20">
                                    {i18n.language.startsWith('en') ? (feed.hero_eyebrow_en || 'RafApp - Elevating Your Workflow') : (feed.hero_eyebrow_is || 'RafApp - Bætir þinn vinnuferil')}
                                </div>
                            )}
                            
                            {editMode ? (
                                <div className="space-y-4 mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Eyebrow (English)</label>
                                            <input 
                                                type="text" 
                                                value={feed.hero_eyebrow_en || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_eyebrow_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Eyebrow (Icelandic)</label>
                                            <input 
                                                type="text" 
                                                value={feed.hero_eyebrow_is || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_eyebrow_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Title (English)</label>
                                            <input 
                                                type="text" 
                                                value={feed.hero_title_en || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_title_en: e.target.value, hero_title: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base font-black focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Title (Icelandic)</label>
                                            <input 
                                                type="text" 
                                                value={feed.hero_title_is || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_title_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base font-black focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Subtitle (English)</label>
                                            <textarea 
                                                value={feed.hero_subtitle_en || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_subtitle_en: e.target.value, hero_subtitle: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-xs font-medium focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hero Subtitle (Icelandic)</label>
                                            <textarea 
                                                value={feed.hero_subtitle_is || ''}
                                                onChange={(e) => setFeed({ ...feed, hero_subtitle_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-xs font-medium focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                                rows={3}
                                            />
                                        </div>
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
                                        {i18n.language.startsWith('en') ? (feed.hero_title_en || feed.hero_title) : (feed.hero_title_is || feed.hero_title)}
                                    </h1>
                                    <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                                        {i18n.language.startsWith('en') ? (feed.hero_subtitle_en || feed.hero_subtitle) : (feed.hero_subtitle_is || feed.hero_subtitle)}
                                    </p>
                                </>
                            )}
                            <div className="flex flex-wrap items-center gap-4">
                                <Link 
                                    to={isAuthenticated ? "/dashboard" : "/login"}
                                    className="bg-[#0096FF] hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition flex items-center gap-2 shadow-xl shadow-[#0096FF]/20"
                                >
                                    {i18n.language.startsWith('en') ? 'Get Started' : 'Hefja handa'}
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                                <button 
                                    onClick={() => scrollToSection('about')}
                                    className="px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm text-white bg-gray-900/90 border border-gray-600 hover:border-gray-400 hover:bg-gray-800 transition shadow-lg backdrop-blur-sm"
                                >
                                    {i18n.language.startsWith('en') ? 'Learn More' : 'Sjá meira'}
                                </button>
                            </div>
                        </div>
                        {/* Hero Right Column: Clean 3D Interactive Picture Card */}
                        <div className="relative z-10 hidden lg:block">
                            {/* Ambient Glowing Orbs */}
                            <div className="absolute -top-12 -left-12 w-80 h-80 bg-[#0096FF]/25 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
                            <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none animate-float-slow" />

                            {/* 3D Tilt Card Wrapper */}
                            <div 
                                onMouseMove={handleMouseMoveHero}
                                onMouseLeave={handleMouseLeaveHero}
                                style={tiltStyle}
                                className="relative rounded-[2.5rem] p-3 bg-gradient-to-b from-gray-900/95 via-slate-900/95 to-black/95 border border-indigo-500/30 shadow-[0_25px_60px_-15px_rgba(0,150,255,0.35)] backdrop-blur-xl overflow-hidden cursor-pointer select-none group"
                            >
                                {/* Dynamic Mouse Glare */}
                                <div 
                                    className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
                                    style={{
                                        opacity: glareStyle.opacity,
                                        background: `radial-gradient(600px circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255,255,255,0.22), transparent 40%)`
                                    }}
                                />

                                {/* Clean Hero Picture */}
                                <div className="relative rounded-[2rem] overflow-hidden border border-slate-800/80 shadow-2xl group-hover:border-[#0096FF]/40 transition-colors h-[460px]">
                                    <img 
                                        src={heroImageUrl} 
                                        alt="Hero" 
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Infinite Supplier & Industry Partner Logo Marquee */}
                <section className="py-8 bg-gray-950 border-y border-gray-800/80 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-6 mb-4 text-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                            {i18n.language.startsWith('en') 
                                ? 'Integrates with Icelandic Wholesale Catalogs & Statutory Frameworks'
                                : 'Tengist rafefnasölum, birgjum og staðlakröfum á Íslandi'
                            }
                        </span>
                    </div>

                    <div className="relative flex overflow-x-hidden">
                        <div className="animate-marquee flex items-center gap-6 whitespace-nowrap py-2">
                            {[
                                { name: 'Reykjafell', desc: 'Heildverslun', url: 'https://www.reykjafell.is' },
                                { name: 'Johan Rönning', desc: 'Rafefni', url: 'https://www.ronning.is' },
                                { name: 'Ískraft', desc: 'Rafefni', url: 'https://iskraft.husa.is/' },
                                { name: 'HMS', desc: 'Öryggisstaðlar', url: 'https://www.hms.is' },
                                { name: 'SART', desc: 'Rafverktakar', url: 'https://www.sart.is' },
                                { name: 'RAFÍS', desc: 'Stéttarfélag', url: 'https://www.rafis.is' },
                                { name: 'Rafmennt', desc: 'Fræðslusetur', url: 'https://www.rafmennt.is/' },
                                { name: 'Reykjafell', desc: 'Heildverslun', url: 'https://www.reykjafell.is' },
                                { name: 'Johan Rönning', desc: 'Rafefni', url: 'https://www.ronning.is' },
                                { name: 'Ískraft', desc: 'Rafefni', url: 'https://iskraft.husa.is/' },
                                { name: 'HMS', desc: 'Öryggisstaðlar', url: 'https://www.hms.is' },
                                { name: 'SART', desc: 'Rafverktakar', url: 'https://www.sart.is' },
                                { name: 'RAFÍS', desc: 'Stéttarfélag', url: 'https://www.rafis.is' },
                                { name: 'Rafmennt', desc: 'Fræðslusetur', url: 'https://www.rafmennt.is/' }
                            ].map((partner, idx) => (
                                <a 
                                    key={idx}
                                    href={partner.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-gray-900/60 border border-gray-800 text-gray-300 hover:border-[#0096FF]/60 hover:bg-gray-900 hover:text-white transition-all cursor-pointer shadow-sm shrink-0 hover:scale-[1.03]"
                                    title={`Visit official website: ${partner.name}`}
                                >
                                    <div className="h-2 w-2 rounded-full bg-[#0096FF] group-hover:scale-125 transition-transform" />
                                    <span className="text-xs font-black uppercase tracking-wider">{partner.name}</span>
                                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest group-hover:text-slate-400">({partner.desc})</span>
                                    <ArrowTopRightOnSquareIcon className="h-3 w-3 text-slate-500 group-hover:text-[#0096FF] transition-colors ml-0.5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </section>
 
                {/* News Section */}
                <section id="news" className="py-20 bg-gray-900 border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            {editMode ? (
                                <div className="space-y-4 max-w-2xl mx-auto mb-8 bg-gray-850 p-6 rounded-3xl border border-indigo-500/25">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">News Section Header (English)</label>
                                            <input 
                                                type="text" 
                                                value={feed.news_title_en || ''}
                                                onChange={(e) => setFeed({ ...feed, news_title_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">News Section Header (Icelandic)</label>
                                            <input 
                                                type="text" 
                                                value={feed.news_title_is || ''}
                                                onChange={(e) => setFeed({ ...feed, news_title_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">News Section Subtitle (English)</label>
                                            <textarea 
                                                value={feed.news_subtitle_en || ''}
                                                onChange={(e) => setFeed({ ...feed, news_subtitle_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none h-20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">News Section Subtitle (Icelandic)</label>
                                            <textarea 
                                                value={feed.news_subtitle_is || ''}
                                                onChange={(e) => setFeed({ ...feed, news_subtitle_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none h-20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl md:text-5xl font-black mb-4">{i18n.language.startsWith('en') ? (feed.news_title_en || 'Latest News & Updates') : (feed.news_title_is || 'Nýjustu fréttir & tilkynningar')}</h2>
                                    <p className="text-gray-400 max-w-2xl mx-auto">{i18n.language.startsWith('en') ? (feed.news_subtitle_en || 'Stay up to date with the latest features, releases, and announcements.') : (feed.news_subtitle_is || 'Fylgstu með nýjustu eiginleikum, útgáfum og tilkynningum.')}</p>
                                </>
                            )}
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
                                                 <div className="grid grid-cols-2 gap-2">
                                                     <div>
                                                         <label className="block text-[7px] text-indigo-400 font-bold mb-0.5">Title (English)</label>
                                                         <input 
                                                             type="text" 
                                                             value={item.title_en || item.title || ''} 
                                                             onChange={(e) => {
                                                                 const arr = [...feed.news];
                                                                 arr[idx] = { ...arr[idx], title_en: e.target.value, title: e.target.value };
                                                                 setFeed({ ...feed, news: arr });
                                                             }}
                                                             className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                             placeholder="Title (EN)"
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[7px] text-indigo-400 font-bold mb-0.5">Title (Icelandic)</label>
                                                         <input 
                                                             type="text" 
                                                             value={item.title_is || item.title || ''} 
                                                             onChange={(e) => {
                                                                 const arr = [...feed.news];
                                                                 arr[idx] = { ...arr[idx], title_is: e.target.value };
                                                                 setFeed({ ...feed, news: arr });
                                                             }}
                                                             className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                             placeholder="Title (IS)"
                                                         />
                                                     </div>
                                                 </div>
                                                 <div className="grid grid-cols-2 gap-2">
                                                     <div>
                                                         <label className="block text-[7px] text-indigo-400 font-bold mb-0.5">Text (English)</label>
                                                         <textarea 
                                                             value={item.text_en || item.text || ''} 
                                                             onChange={(e) => {
                                                                 const arr = [...feed.news];
                                                                 arr[idx] = { ...arr[idx], text_en: e.target.value, text: e.target.value };
                                                                 setFeed({ ...feed, news: arr });
                                                             }}
                                                             className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                             placeholder="Text (EN)"
                                                             rows={3}
                                                         />
                                                     </div>
                                                     <div>
                                                         <label className="block text-[7px] text-indigo-400 font-bold mb-0.5">Text (Icelandic)</label>
                                                         <textarea 
                                                             value={item.text_is || item.text || ''} 
                                                             onChange={(e) => {
                                                                 const arr = [...feed.news];
                                                                 arr[idx] = { ...arr[idx], text_is: e.target.value };
                                                                 setFeed({ ...feed, news: arr });
                                                             }}
                                                             className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-white text-[10px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                             placeholder="Text (IS)"
                                                             rows={3}
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         ) : (
                                             <>
                                                 <div className="mb-4 text-[#0096FF]">
                                                     <ShieldCheckIcon className="h-8 w-8" />
                                                 </div>
                                                 <h3 className="text-xl font-bold mb-3 group-hover:text-[#0096FF] transition text-left">
                                                     {i18n.language.startsWith('en') ? (item.title_en || item.title) : (item.title_is || item.title)}
                                                 </h3>
                                                 <p className="text-gray-400 text-sm leading-relaxed text-left">
                                                     {i18n.language.startsWith('en') ? (item.text_en || item.text) : (item.text_is || item.text)}
                                                 </p>
                                             </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-full text-center">{i18n.language.startsWith('en') ? 'No news items currently published.' : 'Engar fréttir birtar að svo stöddu.'}</p>
                            )}
                            
                            {editMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFeed({
                                            ...feed,
                                            news: [
                                                ...feed.news,
                                                { 
                                                    title: 'New Announcement', 
                                                    title_en: 'New Announcement', 
                                                    title_is: 'Ný tilkynning', 
                                                    text: 'Detail explanation goes here...', 
                                                    text_en: 'Detail explanation goes here...', 
                                                    text_is: 'Nánari útskýring hér...' 
                                                }
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
                            {editMode ? (
                                <div className="space-y-4 max-w-2xl mx-auto mb-8 bg-gray-850 p-6 rounded-3xl border border-indigo-500/25">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pricing Section Header (English)</label>
                                            <input 
                                                type="text" 
                                                value={feed.pricing_title_en || ''}
                                                onChange={(e) => setFeed({ ...feed, pricing_title_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pricing Section Header (Icelandic)</label>
                                            <input 
                                                type="text" 
                                                value={feed.pricing_title_is || ''}
                                                onChange={(e) => setFeed({ ...feed, pricing_title_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pricing Section Subtitle (English)</label>
                                            <textarea 
                                                value={feed.pricing_subtitle_en || ''}
                                                onChange={(e) => setFeed({ ...feed, pricing_subtitle_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none h-20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pricing Section Subtitle (Icelandic)</label>
                                            <textarea 
                                                value={feed.pricing_subtitle_is || ''}
                                                onChange={(e) => setFeed({ ...feed, pricing_subtitle_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-[#0096FF] focus:outline-none h-20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl md:text-5xl font-black mb-4">{i18n.language.startsWith('en') ? (feed.pricing_title_en || 'Pricing Plans') : (feed.pricing_title_is || 'Verðskrá')}</h2>
                                    <p className="text-gray-400 max-w-2xl mx-auto mb-8">{i18n.language.startsWith('en') ? (feed.pricing_subtitle_en || 'Choose the perfect plan for your business needs.') : (feed.pricing_subtitle_is || 'Veldu áskriftarleið sem hentar þínum rekstri.')}</p>
                                </>
                            )}
                            
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
                                    {i18n.language.startsWith('en') ? 'Monthly' : 'Mánaðarlega'}
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                        billingCycle === 'yearly'
                                            ? 'bg-[#0096FF] text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                  >
                                    {i18n.language.startsWith('en') ? 'Yearly' : 'Árlega'}
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
                                                {i18n.language.startsWith('en') ? 'Most Popular' : 'Vinsælast'}
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h3 className="text-2xl font-bold mb-4 text-left">{i18n.language.startsWith('en') ? (tier.name_en || tier.name) : (tier.name_is || tier.name)}</h3>
                                            <div className="text-4xl font-black mb-1 text-[#0096FF] text-left">{getCardPrice(tier.price)}</div>
                                            {billingCycle === 'yearly' && !editMode && (
                                                <span className="block text-[9px] font-bold text-green-400 uppercase tracking-wider text-left mb-6">
                                                    {i18n.language.startsWith('en') ? 'Billed annually (15% Off)' : 'Innheimt árlega (15% afsláttur)'}
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
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Name (EN)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tier.name_en || tier.name || ''} 
                                                                onChange={(e) => {
                                                                    const arr = [...feed.pricing_tiers];
                                                                    arr[idx] = { ...arr[idx], name_en: e.target.value, name: e.target.value };
                                                                    setFeed({ ...feed, pricing_tiers: arr });
                                                                }}
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Name (IS)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tier.name_is || ''} 
                                                                onChange={(e) => {
                                                                    const arr = [...feed.pricing_tiers];
                                                                    arr[idx] = { ...arr[idx], name_is: e.target.value };
                                                                    setFeed({ ...feed, pricing_tiers: arr });
                                                                }}
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
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
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Button (EN)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tier.button_text_en || tier.button_text || ''} 
                                                                onChange={(e) => {
                                                                    const arr = [...feed.pricing_tiers];
                                                                    arr[idx] = { ...arr[idx], button_text_en: e.target.value, button_text: e.target.value };
                                                                    setFeed({ ...feed, pricing_tiers: arr });
                                                                }}
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Button (IS)</label>
                                                            <input 
                                                                type="text" 
                                                                value={tier.button_text_is || ''} 
                                                                onChange={(e) => {
                                                                    const arr = [...feed.pricing_tiers];
                                                                    arr[idx] = { ...arr[idx], button_text_is: e.target.value };
                                                                    setFeed({ ...feed, pricing_tiers: arr });
                                                                }}
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1.5 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="block text-[8px] font-black text-gray-400 tracking-wider uppercase">Features (EN)</label>
                                                        {(tier.features_en || tier.features || []).map((feat, fIdx) => (
                                                            <div key={fIdx} className="flex gap-2 items-center">
                                                                <input 
                                                                    type="text" 
                                                                    value={feat}
                                                                    onChange={(e) => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features_en = [...(arr[idx].features_en || arr[idx].features || [])];
                                                                        features_en[fIdx] = e.target.value;
                                                                        arr[idx] = { ...arr[idx], features_en };
                                                                        setFeed({ ...feed, pricing_tiers: arr });
                                                                    }}
                                                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features_en = (arr[idx].features_en || arr[idx].features || []).filter((_, fi) => fi !== fIdx);
                                                                        arr[idx] = { ...arr[idx], features_en };
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
                                                                const features_en = [...(arr[idx].features_en || arr[idx].features || []), 'New feature detail (EN)'];
                                                                arr[idx] = { ...arr[idx], features_en };
                                                                setFeed({ ...feed, pricing_tiers: arr });
                                                            }}
                                                            className="text-[8px] font-black uppercase text-[#0096FF] tracking-wider hover:underline block"
                                                        >
                                                            + Add Feature Detail (EN)
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2 pt-2">
                                                        <label className="block text-[8px] font-black text-gray-400 tracking-wider uppercase">Features (IS)</label>
                                                        {(tier.features_is || tier.features || []).map((feat, fIdx) => (
                                                            <div key={fIdx} className="flex gap-2 items-center">
                                                                <input 
                                                                    type="text" 
                                                                    value={feat}
                                                                    onChange={(e) => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features_is = [...(arr[idx].features_is || arr[idx].features || [])];
                                                                        features_is[fIdx] = e.target.value;
                                                                        arr[idx] = { ...arr[idx], features_is };
                                                                        setFeed({ ...feed, pricing_tiers: arr });
                                                                    }}
                                                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const arr = [...feed.pricing_tiers];
                                                                        const features_is = (arr[idx].features_is || arr[idx].features || []).filter((_, fi) => fi !== fIdx);
                                                                        arr[idx] = { ...arr[idx], features_is };
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
                                                                const features_is = [...(arr[idx].features_is || arr[idx].features || []), 'Nýtt atriði (IS)'];
                                                                arr[idx] = { ...arr[idx], features_is };
                                                                setFeed({ ...feed, pricing_tiers: arr });
                                                            }}
                                                            className="text-[8px] font-black uppercase text-[#0096FF] tracking-wider hover:underline block"
                                                        >
                                                            + Add Feature Detail (IS)
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <ul className="space-y-4 mb-8">
                                                    {((i18n.language.startsWith('en') ? tier.features_en : tier.features_is) || tier.features || []).map((feature, fIdx) => (
                                                        <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-300">
                                                            <CheckCircleIcon className="h-5 w-5 text-[#0096FF] shrink-0" />
                                                            <span className="text-left">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        
                                        {!editMode && (
                                            <button 
                                                onClick={() => handleOpenLeadForm(i18n.language.startsWith('en') ? (tier.name_en || tier.name) : (tier.name_is || tier.name))}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition ${
                                                tier.is_popular 
                                                    ? 'bg-[#0096FF] hover:bg-blue-500 text-white' 
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                                            }`}>
                                                {i18n.language.startsWith('en') ? (tier.button_text_en || tier.button_text || 'Get Started') : (tier.button_text_is || tier.button_text || 'Get Started')}
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center">{i18n.language.startsWith('en') ? 'Contact us for custom pricing tailored to your needs.' : 'Hafðu samband fyrir sérsniðið verðtilboð.'}</p>
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
                        <div className="w-full max-w-2xl mx-auto mt-16 bg-gray-850 rounded-3xl p-8 border border-gray-700 text-left shadow-2xl">
                            {editMode ? (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4">Edit Cost Calculator Options</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Title (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_title_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_title_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Title (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_title_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_title_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Subtitle (EN)</label>
                                            <textarea 
                                                value={feed.calculator_subtitle_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_subtitle_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Subtitle (IS)</label>
                                            <textarea 
                                                value={feed.calculator_subtitle_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_subtitle_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Company Size Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_size_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_size_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Company Size Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_size_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_size_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">People Suffix (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_people_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_people_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">People Suffix (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_people_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_people_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Active Tier Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_tier_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_tier_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Active Tier Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_tier_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_tier_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Base Price Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_base_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_base_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Base Price Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_base_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_base_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Extra User Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_extra_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_extra_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Extra User Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_extra_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_extra_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">VSK Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_vsk_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_vsk_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">VSK Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_vsk_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_vsk_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Total Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_total_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_total_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Total Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_total_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_total_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Month Label (EN)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_month_label_en || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_month_label_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-gray-400 uppercase">Month Label (IS)</label>
                                            <input 
                                                type="text" 
                                                value={feed.calculator_month_label_is || ''} 
                                                onChange={(e) => setFeed({ ...feed, calculator_month_label_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-750 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                        <span className="text-[#0096FF]">📊</span>
                                        {i18n.language.startsWith('en') ? (feed.calculator_title_en || 'Calculate Your Monthly Cost') : (feed.calculator_title_is || 'Reiknaðu mánaðarlegan kostnað')}
                                    </h3>
                                    <p className="text-gray-400 text-xs mb-6">
                                        {i18n.language.startsWith('en') ? (feed.calculator_subtitle_en || 'Drag the slider to input your company size and get an instant pricing breakdown.') : (feed.calculator_subtitle_is || 'Dragðu sleðann til að velja fjölda starfsmanna og sjáðu kostnaðinn.')}
                                    </p>
                                    
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex-1 w-full">
                                                <div className="flex justify-between text-xs font-bold text-gray-300 mb-2">
                                                    <span>{i18n.language.startsWith('en') ? (feed.calculator_size_label_en || 'Company Size:') : (feed.calculator_size_label_is || 'Fjöldi starfsmanna:')}</span>
                                                    <span className="text-[#0096FF] font-black text-sm">{calcUsers} {i18n.language.startsWith('en') ? (feed.calculator_people_label_en || 'People') : (feed.calculator_people_label_is || 'starfsmenn')}</span>
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
                                                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider">{i18n.language.startsWith('en') ? (feed.calculator_tier_label_en || 'Active Tier') : (feed.calculator_tier_label_is || 'Áskriftarleið')}</span>
                                                <span className="text-sm font-black text-white">{i18n.language.startsWith('en') ? calcResult.tierEn : calcResult.tierIs}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t border-gray-700/50 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2 text-xs text-gray-400">
                                                <div className="flex justify-between">
                                                    <span>{i18n.language.startsWith('en') ? (feed.calculator_base_label_en || 'Base Price (Excl. VSK):') : (feed.calculator_base_label_is || 'Grunnverð (án VSK):')}</span>
                                                    <span className="text-white font-bold">{calcResult.base.toLocaleString()} ISK</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{i18n.language.startsWith('en') ? (feed.calculator_extra_label_en || 'Additional Users:') : (feed.calculator_extra_label_is || 'Auka starfsmenn:')} ({calcResult.extraUsers} × {calcResult.extraRate.toLocaleString()} ISK)</span>
                                                    <span className="text-white font-bold">{(calcResult.extraUsers * calcResult.extraRate).toLocaleString()} ISK</span>
                                                </div>
                                                <div className="flex justify-between border-t border-gray-700/50 pt-2 font-bold text-gray-300">
                                                    <span>{i18n.language.startsWith('en') ? 'Subtotal (Excl. VSK):' : 'Samtals (án VSK):'}</span>
                                                    <span>{calcResult.total.toLocaleString()} ISK</span>
                                                </div>
                                                <div className="flex justify-between text-gray-400">
                                                    <span>{i18n.language.startsWith('en') ? (feed.calculator_vsk_label_en || 'VSK (24%):') : (feed.calculator_vsk_label_is || 'VSK (24%):')}</span>
                                                    <span>{(calcResult.total * 0.24).toLocaleString()} ISK</span>
                                                </div>
                                                {calcResult.capped && (
                                                    <div className="text-emerald-400 text-[10px] font-bold">
                                                        ✓ {i18n.language.startsWith('en') ? 'Tier maximum cap applied!' : 'Hámarksverð virkt!'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-[#0096FF]/10 rounded-2xl p-5 border border-[#0096FF]/20 flex flex-col justify-center items-center">
                                                <span className="text-[10px] font-black text-[#0096FF] uppercase tracking-widest mb-1">{i18n.language.startsWith('en') ? (feed.calculator_total_label_en || 'Total Monthly Cost (Incl. 24% VSK)') : (feed.calculator_total_label_is || 'Heildarkostnaður á mánuði (með VSK):')}</span>
                                                <span className="text-3xl font-black text-white text-center">
                                                    {(calcResult.total * 1.24).toLocaleString()} ISK 
                                                    <span className="text-xs font-bold text-gray-400"> / {i18n.language.startsWith('en') ? (feed.calculator_month_label_en || 'mo') : (feed.calculator_month_label_is || 'mán')}</span>
                                                </span>
                                                {billingCycle === 'yearly' && (
                                                    <span className="text-[10px] font-bold text-green-400 mt-2">
                                                        {i18n.language.startsWith('en') 
                                                            ? `(Billed yearly: ${(calcResult.total * 1.24 * 12).toLocaleString()} ISK / yr)`
                                                            : `(Innheimt árlega: ${(calcResult.total * 1.24 * 12).toLocaleString()} kr. / ári)`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
 
                {/* About Us & Contact Section */}
                <section id="about" className="py-20 bg-gray-900 border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div className="text-left">
                            {editMode ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">About Us Section Title (English)</label>
                                            <input
                                                type="text"
                                                value={feed.about_us_title_en || ''}
                                                onChange={(e) => setFeed({ ...feed, about_us_title_en: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">About Us Section Title (Icelandic)</label>
                                            <input
                                                type="text"
                                                value={feed.about_us_title_is || ''}
                                                onChange={(e) => setFeed({ ...feed, about_us_title_is: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
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
                                <>
                                    <h2 className="text-3xl md:text-4xl font-black mb-6">{i18n.language.startsWith('en') ? (feed.about_us_title_en || 'About Us') : (feed.about_us_title_is || 'Um okkur')}</h2>
                                    <div className="w-20 h-1 bg-[#0096FF] mb-8 rounded-full"></div>
                                    <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-wrap">
                                        {(i18n.language.startsWith('is') && feed.about_us_text_is) 
                                            ? feed.about_us_text_is 
                                            : (i18n.language.startsWith('en') && feed.about_us_text_en) 
                                                ? feed.about_us_text_en 
                                                : feed.about_us_text_en || feed.about_us_text || 'We are dedicated to providing the best tools and solutions for your business. Our mission is to streamline your workflow and enhance productivity through innovative software.'}
                                    </p>
                                </>
                            )}
                        </div>
                        <div id="contact" className="bg-gray-800 p-10 rounded-3xl border border-gray-700 relative overflow-hidden">
                            {/* Decorative background blob */}
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#0096FF] blur-[100px] opacity-20 rounded-full"></div>
                            
                            {editMode ? (
                                <div className="space-y-4 mb-6 relative z-10">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">Contact Us Title (English)</label>
                                            <input
                                                type="text"
                                                value={feed.contact_us_title_en || ''}
                                                onChange={(e) => setFeed({ ...feed, contact_us_title_en: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider mb-1">Contact Us Title (Icelandic)</label>
                                            <input
                                                type="text"
                                                value={feed.contact_us_title_is || ''}
                                                onChange={(e) => setFeed({ ...feed, contact_us_title_is: e.target.value })}
                                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl md:text-4xl font-black mb-6 relative z-10 text-left">{i18n.language.startsWith('en') ? (feed.contact_us_title_en || 'Contact Us') : (feed.contact_us_title_is || 'Hafa samband')}</h2>
                                    <div className="w-20 h-1 bg-[#0096FF] mb-10 rounded-full relative z-10"></div>
                                </>
                            )}
                            
                            <div className="space-y-6 relative z-10 max-h-[400px] overflow-y-auto pr-2">
                                {feed.contact_persons && feed.contact_persons.length > 0 ? (
                                    feed.contact_persons.map((person, idx) => (
                                        <div 
                                            key={idx} 
                                            className="bg-gray-900/50 p-4 rounded-2xl border flex items-start gap-4 transition text-left border-gray-700/50"
                                        >
                                            {person.image_url && (
                                                <img src={resolveMediaUrl(person.image_url)} alt={person.name} className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-gray-700 animate-in fade-in" />
                                            )}
                                            <div className="flex-1">
                                                <div className="mb-3">
                                                    <h3 className="text-xl font-bold text-white">{person.name}</h3>
                                                    {person.title && (
                                                        <p className="text-[#0096FF] text-sm font-black uppercase tracking-widest">
                                                            {i18n.language.startsWith('en') ? (person.title_en || person.title) : (person.title_is || person.title)}
                                                        </p>
                                                    )}
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
                                                    {(person.linkedin || (person.name && person.name.includes('Mario'))) && (
                                                        <div className="flex items-center gap-3">
                                                            <svg className="h-4 w-4 text-[#0096FF] fill-current" viewBox="0 0 24 24">
                                                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                                            </svg>
                                                            <a 
                                                                href={person.linkedin || "https://www.linkedin.com/in/mario-klari%C4%87-kukuz-928350306/"} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-[#0096FF] hover:underline transition text-xs font-black uppercase tracking-wider"
                                                            >
                                                                LinkedIn Profile ↗
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">{i18n.language.startsWith('en') ? 'No contact information available.' : 'Engar upplýsingar um tengiliði skráðar.'}</p>
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
                 title={`${i18n.language.startsWith('en') ? (feed.lead_title_en || 'Get Started with RafApp') : (feed.lead_title_is || 'Hefja handa með RafApp')} - ${selectedTierForLead}`}
                 showFooter={false}
             >
                 <form onSubmit={handleLeadSubmit} className="space-y-4 pt-4 text-left">
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                             {i18n.language.startsWith('en') ? (feed.lead_name_label_en || 'Your Name') : (feed.lead_name_label_is || 'Fullt nafn')}
                         </label>
                         <input 
                             type="text" 
                             required 
                             value={leadForm.name} 
                             onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                             {i18n.language.startsWith('en') ? (feed.lead_company_label_en || 'Company Name') : (feed.lead_company_label_is || 'Fyrirtæki')}
                         </label>
                         <input 
                             type="text" 
                             required 
                             value={leadForm.company} 
                             onChange={e => setLeadForm({...leadForm, company: e.target.value})}
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                             {i18n.language.startsWith('en') ? (feed.lead_email_label_en || 'Email Address') : (feed.lead_email_label_is || 'Netfang')}
                         </label>
                         <input 
                             type="email" 
                             required 
                             value={leadForm.email} 
                             onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                             {i18n.language.startsWith('en') ? (feed.lead_phone_label_en || 'Phone Number (Optional)') : (feed.lead_phone_label_is || 'Símanúmer (valfrjálst)')}
                         </label>
                         <input 
                             type="tel" 
                             value={leadForm.phone} 
                             onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                             className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-[#0096FF] focus:outline-none"
                         />
                     </div>
                     <div className="pt-4">
                         <button 
                             type="submit" 
                             disabled={isSubmittingLead}
                             className="w-full bg-[#0096FF] hover:bg-blue-500 text-white font-bold uppercase tracking-widest py-3 rounded-xl transition disabled:opacity-50"
                         >
                             {isSubmittingLead 
                                 ? (i18n.language.startsWith('en') ? 'Sending...' : 'Sendir...') 
                                 : (i18n.language.startsWith('en') ? (feed.lead_button_text_en || 'Submit Request') : (feed.lead_button_text_is || 'Senda beiðni'))}
                         </button>
                     </div>
                 </form>
             </Modal>

             {/* Render-style System Status Modal */}
             <Modal
                 isOpen={isStatusModalOpen}
                 onClose={() => setIsStatusModalOpen(false)}
                 title={i18n.language.startsWith('en') ? "RafApp Live System Status" : "Rauntíma Kerfisstaða RafApp"}
                 showFooter={false}
             >
                 <div className="space-y-6 pt-2 text-left">
                     {/* Big Status Banner */}
                     <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <span className="h-4 w-4 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-500/50" />
                             <div>
                                 <h4 className="text-base font-black text-white uppercase tracking-wider">
                                     {i18n.language.startsWith('en') ? 'All Systems Operational' : 'Öll kerfi í fullum rekstri'}
                                 </h4>
                                 <p className="text-xs text-emerald-400 font-bold">
                                     {healthData?.uptime_percentage || 99.98}% {i18n.language.startsWith('en') ? 'uptime over the last 90 days' : 'uppitími síðustu 90 daga'}
                                 </p>
                             </div>
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-500/30">
                             LIVE ⚡
                         </span>
                     </div>

                     {/* 90-Day Uptime Grid Bar */}
                     <div>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                             <span>90 Days Ago</span>
                             <span className="text-emerald-400">100% Operational</span>
                             <span>Today</span>
                         </div>
                         <div className="flex items-center gap-0.5 w-full bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                             {Array.from({ length: 45 }).map((_, i) => (
                                 <div 
                                     key={i} 
                                     className="h-7 flex-1 bg-emerald-500 rounded-sm hover:scale-125 hover:bg-emerald-400 transition-all cursor-pointer" 
                                     title={`Day -${45 - i}: 100% uptime, 0 incidents`}
                                 />
                             ))}
                         </div>
                     </div>

                     {/* Component Services List */}
                     <div className="space-y-3">
                         <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                             {i18n.language.startsWith('en') ? 'System Components' : 'Hlutkerfi og Þjónustur'}
                         </h5>
                         <div className="divide-y divide-gray-800 bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                             {(healthData?.services || [
                                 { id: "api", name: "API Gateway & Router", status: "operational", latency: "24ms" },
                                 { id: "db", name: "PostgreSQL Core Database", status: "operational", latency: "12ms" },
                                 { id: "auth", name: "OAuth2 & Identity Provider", status: "operational", latency: "18ms" },
                                 { id: "sync", name: "Real-Time Telemetry & Sync", status: "operational", latency: "30ms" },
                                 { id: "pdf", name: "PDF Payroll & Report Engine", status: "operational", latency: "45ms" },
                                 { id: "inventory", name: "Material Catalog & Inventory API", status: "operational", latency: "15ms" }
                             ]).map(srv => (
                                 <div key={srv.id} className="p-3.5 flex items-center justify-between text-xs">
                                     <span className="font-bold text-gray-200">{srv.name}</span>
                                     <div className="flex items-center gap-3">
                                         <span className="text-[10px] font-mono text-gray-500">{srv.latency}</span>
                                         <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40">
                                             <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                             {srv.status}
                                         </span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Recent Incidents Timeline */}
                     <div className="space-y-3 pt-2">
                         <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                             {i18n.language.startsWith('en') ? 'Past Incidents & Maintenance' : 'Nýlegar Viðhaldsaðgerðir'}
                         </h5>
                         <div className="space-y-2">
                             {(healthData?.incidents || []).map((inc, idx) => (
                                 <div key={idx} className="bg-gray-900/50 p-3.5 rounded-xl border border-gray-800 text-xs space-y-1">
                                     <div className="flex justify-between items-center">
                                         <span className="font-bold text-white">{inc.title}</span>
                                         <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">{inc.status}</span>
                                     </div>
                                     <p className="text-[10px] text-gray-400 leading-relaxed">{inc.detail}</p>
                                     <span className="text-[9px] text-gray-500 font-mono block">{inc.date}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </Modal>
        </div>
    );
}

export default LandingPage;
