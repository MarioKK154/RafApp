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
    return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}

function LandingPage() {
    const { t, i18n } = useTranslation();
    const { isAuthenticated } = useAuth();
    
    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'is' : 'en';
        i18n.changeLanguage(newLang);
    };

    const [feed, setFeed] = useState({
        news: [],
        pricing_tiers: [],
        hero_title: 'Welcome to Our Platform',
        hero_subtitle: 'We provide the best tools for your business.',
        about_us_text: '',
        about_us_text_en: '',
        about_us_text_is: '',
        contact_persons: [],
        background_image_urls: [],
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Lead Form State
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [selectedTierForLead, setSelectedTierForLead] = useState(null);
    const [leadForm, setLeadForm] = useState({ name: '', email: '', company: '', phone: '' });
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get('/system/landing-feed');
                const data = res.data || {};
                setFeed({
                    news: Array.isArray(data.news) ? data.news : [],
                    pricing_tiers: Array.isArray(data.pricing_tiers) ? data.pricing_tiers : [],
                    hero_title: data.hero_title || 'Welcome to Our Platform',
                    hero_subtitle: data.hero_subtitle || 'We provide the best tools for your business.',
                    about_us_text: data.about_us_text || '',
                    about_us_text_en: data.about_us_text_en || '',
                    about_us_text_is: data.about_us_text_is || '',
                    contact_persons: Array.isArray(data.contact_persons) ? data.contact_persons : [],
                    background_image_urls: Array.isArray(data.background_image_urls) ? data.background_image_urls : [],
                });
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

                        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="py-2 text-[#0096FF]">
                            {isAuthenticated ? t('dashboard', { defaultValue: 'Dashboard' }) : t('login', { defaultValue: 'Login' })}
                        </Link>
                    </div>
                )}
            </header>

            <main className="pt-20">
                {/* Hero Section */}
                <section id="home" className="pt-12 pb-20 lg:pt-28 lg:pb-32 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="z-10 relative">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-[#0096FF]/10 text-[#0096FF] font-black uppercase tracking-widest text-[10px] mb-6 border border-[#0096FF]/20">
                                {t('hero_eyebrow', { defaultValue: 'RafApp - Elevating Your Workflow' })}
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
                                {t(feed.hero_title, { defaultValue: feed.hero_title })}
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                                {t(feed.hero_subtitle, { defaultValue: feed.hero_subtitle })}
                            </p>
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
                                feed.news.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="bg-gray-800 rounded-3xl p-8 border border-gray-700 hover:border-[#0096FF]/50 transition group">
                                        <div className="mb-4 text-[#0096FF]">
                                            <ShieldCheckIcon className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-[#0096FF] transition">{item.title}</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed mb-6">{item.text}</p>
                                        {item.link_url && (
                                            <a href={item.link_url} className="text-[#0096FF] text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:gap-3 transition-all">
                                                {item.link_label || t('read_more', { defaultValue: 'Read More' })}
                                                <ArrowRightIcon className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 col-span-full text-center">{t('no_news', { defaultValue: 'No news items currently published.' })}</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-20 bg-[#1a202c]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">{t('pricing_plans', { defaultValue: 'Pricing Plans' })}</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto">{t('pricing_subtitle', { defaultValue: 'Choose the perfect plan for your business needs.' })}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-8 items-center">
                            {feed.pricing_tiers && feed.pricing_tiers.length > 0 ? (
                                feed.pricing_tiers.map((tier, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`w-full md:w-80 rounded-3xl p-8 border transition-transform hover:-translate-y-2 relative ${
                                            tier.is_popular 
                                                ? 'bg-gradient-to-b from-[#0096FF]/20 to-gray-800 border-[#0096FF] shadow-xl shadow-[#0096FF]/10' 
                                                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        {tier.is_popular && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0096FF] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {t('most_popular', { defaultValue: 'Most Popular' })}
                                            </div>
                                        )}
                                        <h3 className="text-2xl font-bold mb-2">{t(tier.name, { defaultValue: tier.name })}</h3>
                                        <div className="text-4xl font-black mb-6 text-[#0096FF]">{tier.price}</div>
                                        <ul className="space-y-4 mb-8">
                                            {(tier.features || []).map((feature, fIdx) => (
                                                <li key={fIdx} className="flex items-start gap-3 text-sm text-gray-300">
                                                    <CheckCircleIcon className="h-5 w-5 text-[#0096FF] shrink-0" />
                                                    <span>{t(feature, { defaultValue: feature })}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button 
                                            onClick={() => handleOpenLeadForm(tier.name)}
                                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition ${
                                            tier.is_popular 
                                                ? 'bg-[#0096FF] hover:bg-blue-500 text-white' 
                                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                                        }`}>
                                            {tier.button_text || t('get_started', { defaultValue: 'Get Started' })}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center">{t('custom_pricing_msg', { defaultValue: 'Contact us for custom pricing tailored to your needs.' })}</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* About Us & Contact Section */}
                <section id="about" className="py-20 bg-gray-900 border-t border-gray-800">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black mb-6">{t('about_us_title', { defaultValue: 'About Us' })}</h2>
                            <div className="w-20 h-1 bg-[#0096FF] mb-8 rounded-full"></div>
                            <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-wrap">
                                {(i18n.language === 'is' && feed.about_us_text_is) 
                                    ? feed.about_us_text_is 
                                    : (i18n.language === 'en' && feed.about_us_text_en) 
                                        ? feed.about_us_text_en 
                                        : feed.about_us_text || 'We are dedicated to providing the best tools and solutions for your business. Our mission is to streamline your workflow and enhance productivity through innovative software.'}
                            </p>
                        </div>
                        <div id="contact" className="bg-gray-800 p-10 rounded-3xl border border-gray-700 relative overflow-hidden">
                            {/* Decorative background blob */}
                            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#0096FF] blur-[100px] opacity-20 rounded-full"></div>
                            
                            <h2 className="text-3xl md:text-4xl font-black mb-6 relative z-10">{t('contact_us', { defaultValue: 'Contact Us' })}</h2>
                            <div className="w-20 h-1 bg-[#0096FF] mb-10 rounded-full relative z-10"></div>
                            
                            <div className="space-y-6 relative z-10 max-h-[400px] overflow-y-auto pr-2">
                                {feed.contact_persons && feed.contact_persons.length > 0 ? (
                                    feed.contact_persons.map((person, idx) => (
                                        <div key={idx} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700/50 flex items-start gap-4">
                                            {person.image_url && (
                                                <img src={resolveMediaUrl(person.image_url)} alt={person.name} className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-gray-700" />
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
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">{t('no_contact_info', { defaultValue: 'No contact information available.' })}</p>
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
