import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';
import {
    BookOpen,
    Users,
    Brain,
    ChartBar,
    Clock,
    Lightning,
    Star,
    ArrowRight,
    CaretRight,
    CheckCircle,
} from '@phosphor-icons/react';

export function LandingPage() {
    const navigate = useNavigate();
    const { t, theme } = useSettings();
    const isDark = theme === 'dark';

    return (
        <div
            className="min-h-screen transition-colors duration-300"
            style={{
                fontFamily: "'Nunito', sans-serif",
                backgroundColor: isDark ? '#465C88' : '#F7F7F2',
                backgroundImage: isDark
                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23FFFFFF' fill-opacity='0.05' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`
                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`,
                backgroundBlendMode: 'normal',
            }}
        >
            {/* ── NAVBAR ── */}
            <header className={cn(
                'sticky top-0 z-50 border-b-2 transition-colors duration-300',
                isDark ? 'bg-[#12161f] border-white/10' : 'bg-white border-[#1A1A1A]/10'
            )}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 select-none">
                        <img
                            src="/logo.svg"
                            alt="SlothubEdu"
                            className="h-12 w-12 shrink-0 rounded-2xl shadow-lg block"
                        />
                        <span className={cn('text-xl font-extrabold tracking-tight leading-none', isDark ? 'text-white' : 'text-[#1A1A1A]')}>
                            Slothub<span className="text-[#FF6B4A]">Edu</span>
                        </span>
                    </div>
                    <nav className={cn(
                        'hidden md:flex items-center gap-8 text-sm font-extrabold',
                        isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'
                    )}>
                        <a href="#contact" className="hover:text-[#FF6B4A] transition-colors">{t.landing.contact}</a>
                        <a href="#highlights" className="hover:text-[#FF6B4A] transition-colors">{t.landing.highlights}</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <ThemeSwitcher />
                        <button
                            onClick={() => navigate('/login')}
                            className={cn(
                                'text-sm font-extrabold transition-colors',
                                isDark ? 'text-gray-300 hover:text-white' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                            )}
                        >
                            {t.auth.login}
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2 rounded-2xl transition-colors flex items-center gap-1.5"
                        >
                            {t.auth.startNow} <CaretRight className="w-4 h-4" weight="bold" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO ── */}
            <section className="relative overflow-hidden bg-[#1A1A1A] text-white">
                {/* Decorative geometric shapes */}
                <div className="absolute top-12 right-12 w-32 h-32 rounded-3xl border-4 border-[#FCE38A]/20 rotate-12 pointer-events-none" />
                <div className="absolute bottom-8 left-8 w-20 h-20 rounded-full border-4 border-[#B8B5FF]/20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-2xl border-2 border-[#95E1D3]/15 -rotate-6 pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
                    {/* Text */}
                    <div className="flex-1 space-y-6">
                        <span className="inline-flex items-center gap-2 text-xs font-extrabold bg-[#FCE38A] text-[#1A1A1A] px-4 py-1.5 rounded-full uppercase tracking-widest">
                            <Star className="w-3 h-3" weight="fill" />
                            {t.landing.heroTagline}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                            {t.landing.heroTitle1}<br />
                            <span className="text-[#FF6B4A]">{t.landing.heroTitle2}</span><br />
                            {t.landing.heroTitle3}
                        </h1>
                        <p className="text-white/60 text-lg leading-relaxed max-w-lg font-semibold">
                            {t.landing.heroDesc}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-8 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
                            >
                                {t.landing.exploreNow} <ArrowRight className="w-4 h-4" weight="bold" />
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="border-2 border-white/20 hover:border-white/40 text-white font-extrabold px-8 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
                            >
                                {t.landing.viewDemo}
                            </button>
                        </div>
                        <div className="flex items-center gap-6 pt-2 text-sm text-white/50 font-bold">
                            {[`10,000+ ${t.landing.teachers}`, `50,000+ ${t.landing.students}`, t.landing.ready247].map((s) => (
                                <span key={s} className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-[#95E1D3]" weight="fill" /> {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Hero card */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-sm">
                            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-[#FCE38A] border-2 border-white/20 rounded-2xl flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-white text-sm">{t.landing.aiAssistant}</p>
                                        <p className="text-white/50 text-xs font-bold">{t.landing.online}</p>
                                    </div>
                                </div>
                                <p className="text-white/70 text-sm italic leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: t.landing.aiGreeting }} />
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { icon: ChartBar, label: t.landing.avgScore, value: '8.5', bg: '#95E1D3' },
                                        { icon: Clock, label: t.landing.studyHours, value: '120h', bg: '#FCE38A' },
                                        { icon: BookOpen, label: t.landing.subjects, value: '6', bg: '#B8B5FF' },
                                        { icon: Users, label: t.landing.friends, value: '32', bg: '#FFB5B5' },
                                    ].map(({ icon: Icon, label, value, bg }) => (
                                        <div key={label} className="rounded-2xl p-3 border border-white/10 flex items-center gap-2" style={{ backgroundColor: bg + '30' }}>
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                                                <Icon className="w-3.5 h-3.5 text-[#1A1A1A]" weight="fill" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/50 font-bold">{label}</p>
                                                <p className="font-extrabold text-white text-sm">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* badge */}
                            <div className="absolute -top-3 -right-3 bg-[#FCE38A] text-[#1A1A1A] text-xs font-extrabold px-3 py-1.5 rounded-2xl border-2 border-[#1A1A1A] rotate-3">
                                ✦ AI Powered
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HIGHLIGHTS ── */}
            <section id="highlights" className={cn('py-20 transition-colors duration-300', isDark ? 'bg-[#111722]' : 'bg-white')}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <p className={cn('text-xs font-extrabold uppercase tracking-widest mb-2', isDark ? 'text-gray-500' : 'text-gray-400')}>{t.landing.highlightsSubtitle}</p>
                        <h2 className={cn('text-3xl font-extrabold', isDark ? 'text-white' : 'text-[#1A1A1A]')}>{t.landing.highlightsTitle}</h2>
                        <p className={cn('mt-3 max-w-xl mx-auto font-semibold', isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50')}>
                            {t.landing.highlightsDesc}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Brain,
                                badge: t.landing.featureAIBadge,
                                title: t.landing.featureAI,
                                desc: t.landing.featureAIDesc,
                                topBg: '#B8B5FF',
                            },
                            {
                                icon: Users,
                                badge: t.landing.featureClassBadge,
                                title: t.landing.featureClass,
                                desc: t.landing.featureClassDesc,
                                topBg: '#FCE38A',
                            },
                            {
                                icon: Lightning,
                                badge: t.landing.featureRealtimeBadge,
                                title: t.landing.featureRealtime,
                                desc: t.landing.featureRealtimeDesc,
                                topBg: '#FFB5B5',
                            },
                        ].map(({ icon: Icon, badge, title, desc, topBg }) => (
                            <div key={title} className={cn(
                                'rounded-3xl overflow-hidden border-2 group hover:shadow-lg transition-shadow',
                                isDark ? 'border-white/20 shadow-black/30' : 'border-[#1A1A1A]'
                            )}>
                                <div className="h-2" style={{ backgroundColor: topBg }} />
                                <div className={cn('p-8 transition-colors duration-300', isDark ? 'bg-[#1a2130]' : 'bg-white')}>
                                    <span className={cn(
                                        'text-xs font-extrabold px-3 py-1 rounded-full border-2',
                                        isDark ? 'text-white border-white/20' : 'text-[#1A1A1A] border-[#1A1A1A]/20'
                                    )} style={{ backgroundColor: topBg }}>{badge}</span>
                                    <div className={cn(
                                        'w-12 h-12 rounded-2xl border-2 flex items-center justify-center mt-5 mb-4 group-hover:scale-105 transition-transform',
                                        isDark ? 'border-white/20' : 'border-[#1A1A1A]/20'
                                    )} style={{ backgroundColor: topBg }}>
                                        <Icon className="w-6 h-6 text-[#1A1A1A]" weight="fill" />
                                    </div>
                                    <h3 className={cn('text-lg font-extrabold mb-3', isDark ? 'text-white' : 'text-[#1A1A1A]')}>{title}</h3>
                                    <p className={cn('text-sm leading-relaxed font-semibold', isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50')}>{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section className="py-16 bg-[#1A1A1A]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '10,000+', label: t.landing.teachers, bg: '#FCE38A' },
                            { value: '50,000+', label: t.landing.students, bg: '#B8B5FF' },
                            { value: '200+', label: t.landing.schools, bg: '#FFB5B5' },
                            { value: '98%', label: t.landing.satisfaction, bg: '#95E1D3' },
                        ].map((s) => (
                            <div key={s.label} className="text-center">
                                <div className="text-3xl font-extrabold mb-1" style={{ color: s.bg }}>{s.value}</div>
                                <div className="text-white/50 text-sm font-extrabold uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section id="contact" className={cn('py-20 transition-colors duration-300', isDark ? 'bg-[#0b0d12]' : 'bg-[#F7F7F2]')}>
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-[#1A1A1A] rounded-3xl p-12 border-2 border-[#1A1A1A] text-center space-y-6 relative overflow-hidden">
                        {/* Geometric deco */}
                        <div className="absolute top-6 right-6 w-20 h-20 rounded-2xl border-2 border-[#FCE38A]/20 rotate-12 pointer-events-none" />
                        <div className="absolute bottom-6 left-6 w-14 h-14 rounded-full border-2 border-[#B8B5FF]/20 pointer-events-none" />
                        <p className="text-xs font-extrabold text-white/40 uppercase tracking-widest">{t.landing.ctaSubtitle}</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight relative z-10">
                            {t.landing.ctaTitle1}<br />{t.landing.ctaTitle2} Slothub<span className="text-[#FF6B4A]">Edu</span>?
                        </h2>
                        <p className="text-white/50 text-lg max-w-xl mx-auto font-semibold relative z-10">
                            {t.landing.ctaDesc}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 relative z-10">
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-10 py-3.5 rounded-2xl transition-colors text-base"
                            >
                                {t.landing.registerNow}
                            </button>
                            <button className="border-2 border-white/20 hover:border-white/40 text-white font-extrabold px-10 py-3.5 rounded-2xl transition-colors text-base">
                                {t.landing.contactConsult}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="bg-[#1A1A1A] text-white/40 py-12 border-t-2 border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <img src="/logo.svg" alt="SlothubEdu" className="h-8 w-8 rounded-xl shadow-sm" />
                                <span className="font-extrabold text-white text-lg">Slothub<span className="text-[#FF6B4A]">Edu</span></span>
                            </div>
                            <p className="text-sm leading-relaxed font-semibold">
                                {t.landing.footerDesc}
                            </p>
                            <div className="flex gap-3">
                                {['#FCE38A', '#B8B5FF', '#FFB5B5'].map((c) => (
                                    <div key={c} className="w-8 h-8 rounded-xl border-2 border-white/10 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        {[
                            { title: t.landing.footerSolutions, links: [t.landing.footerForAdmin, t.landing.footerForTeacher, t.landing.footerForStudent, t.landing.footerForParent] },
                            { title: t.landing.footerCompany, links: [t.landing.footerAbout, t.landing.footerCareers, t.landing.footerNews, t.landing.footerBlog] },
                            { title: t.landing.footerSupport, links: [t.landing.footerHelpCenter, t.landing.footerAPIDocs, t.landing.footerSecurity, t.landing.footerPolicy] },
                        ].map(({ title, links }) => (
                            <div key={title}>
                                <h4 className="text-white font-extrabold text-sm mb-4 uppercase tracking-widest">{title}</h4>
                                <ul className="space-y-2">
                                    {links.map((l) => (
                                        <li key={l}>
                                            <a href="#" className="text-sm hover:text-white transition-colors font-semibold">{l}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
                        <p>© 2026 SlothubEdu Corporation. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
