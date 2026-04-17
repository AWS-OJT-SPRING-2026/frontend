import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlass, Bell, ArrowRight, CheckCircle, Fire,
    Timer, NotePencil, Play, Pause, ArrowCounterClockwise,
    Warning, MapTrifold, BookOpen, CalendarBlank, Trash, Plus,
    Eye, Gear, ArrowLeft, X, CoffeeBean, ChartBar, CaretDown,
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { weeklyProgressService, WeeklyProgressData } from '../../services/weeklyProgressService';
import { notificationService } from '../../services/notificationService';
import { studentDashboardService, type StudentDashboardResponse } from '../../services/studentDashboardService';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { FAST_API_BASE_URL as FAST_API_URL } from '../../services/env';

const POMODORO_WORK = 25 * 60;

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentHomepage() {
    const navigate = useNavigate();
    const { theme, t } = useSettings();
    const { user } = useAuth();
    const isDark = theme === 'dark';

    // Notification dropdown
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const notificationsRef = useRef<HTMLDivElement>(null);

    // Weekly progress
    const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData | null>(null);

    // Dashboard Data
    const [dashboardData, setDashboardData] = useState<StudentDashboardResponse | null>(null);

    // Quote
    const [quote, setQuote] = useState<{ q: string; a: string } | null>(null);

    // Pomodoro
    const [pomFocusMins, setPomFocusMins] = useState(25);
    const [pomBreakMins, setPomBreakMins] = useState(5);
    const [pomLongBreakMins, setPomLongBreakMins] = useState(15);
    const [pomLongBreakAfter, setPomLongBreakAfter] = useState(4);
    const [pomTime, setPomTime] = useState(POMODORO_WORK);
    const [pomRunning, setPomRunning] = useState(false);
    const [pomMode, setPomMode] = useState<'work' | 'break'>('work');
    const [pomSessions, setPomSessions] = useState(0);
    const [pomSettings, setPomSettings] = useState(false);
    const [pomSettingsView, setPomSettingsView] = useState<'main' | 'focus' | 'shortBreak' | 'longBreak' | 'longBreakAfter'>('main');

    // Notes
    const [noteText, setNoteText] = useState('');
    const [savedNotes, setSavedNotes] = useState<{ id: number; text: string; time: string }[]>([]);

    // Deadline tab
    const [deadlineTab, setDeadlineTab] = useState('Tất cả');

    // Roadmap expanded
    const [roadmapExpanded, setRoadmapExpanded] = useState(false);

    // AI Roadmaps for homepage card
    const [homepageRoadmaps, setHomepageRoadmaps] = useState<any[]>([]);
    const [selectedHomepageRoadmapId, setSelectedHomepageRoadmapId] = useState<number | null>(null);

    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // ── Effects ──────────────────────────────────────────────────────────────

    // Initial effect to fetch current user ID
    useEffect(() => {
        let mounted = true;
        const resolveUser = async () => {
            try {
                const token = authService.getToken();
                if (!token) return;
                const p = await profileService.getMyProfile(token);
                const c = Number(p.userID ?? p.studentID ?? p.teacherID);
                if (Number.isFinite(c) && c > 0 && mounted) {
                    setCurrentUserId(c);
                }
            } catch { }
        };
        resolveUser();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node))
                setShowNotifications(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch AI roadmaps for homepage card
    useEffect(() => {
        if (!currentUserId) return;
        fetch(`${FAST_API_URL}/roadmap/all/${currentUserId}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setHomepageRoadmaps(data);
                    setSelectedHomepageRoadmapId(data[0].roadmapid);
                }
            })
            .catch(() => {});
    }, [currentUserId]);

    useEffect(() => {
        const token = authService.getToken();
        api.get<any>('/quotes/today', token)
            .then(d => {
                // API may return [{q,a}] or [{quote,author}] or {quote,author}
                const item = Array.isArray(d) ? d[0] : d;
                if (item) {
                    const q = item.q || item.quote || '';
                    const a = item.a || item.author || '';
                    if (q) setQuote({ q, a });
                }
            })
            .catch(() => {});
    }, []);

    // Fetch unread notification count on mount
    useEffect(() => {
        notificationService.getMyNotifications('ALL')
            .then(items => setUnreadCount(items.filter(n => !n.isRead).length))
            .catch(() => {});
    }, []);

    // Fetch weekly progress on mount
    useEffect(() => {
        weeklyProgressService.getMyWeeklyProgress()
            .then(data => setWeeklyProgress(data))
            .catch(() => {});
    }, []);

    // Fetch dashboard on mount — both sources merged atomically
    useEffect(() => {
        if (!currentUserId) return;
        const FAST_API = import.meta.env.VITE_FAST_API_BASE_URL || 'http://localhost:8000/api/v1';

        const dashboardP = studentDashboardService.getMyDashboard().catch(() => null);
        const roadmapP = fetch(`${FAST_API}/roadmap/current/${currentUserId}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        Promise.all([dashboardP, roadmapP]).then(([dashboard, roadmap]) => {
            // Build roadmap steps from AI data
            let roadmapSteps: any[] = [];
            if (roadmap && roadmap.chapters && Array.isArray(roadmap.chapters)) {
                roadmapSteps = roadmap.chapters.map((ch: any, i: number) => ({
                    week: i + 1,
                    title: ch.title,
                    done: false,
                    current: i === 0,
                }));
            }

            // Merge: use BE dashboard as base, overlay roadmap steps from AI
            const merged: StudentDashboardResponse = {
                streakCount: dashboard?.streakCount ?? 0,
                streakDays: dashboard?.streakDays ?? [],
                pomodoroSessions: dashboard?.pomodoroSessions ?? 0,
                totalFocusMinutes: dashboard?.totalFocusMinutes ?? 0,
                roadmapSteps: roadmapSteps.length > 0 ? roadmapSteps : (dashboard?.roadmapSteps ?? []),
                completedRoadmapSteps: dashboard?.completedRoadmapSteps ?? 0,
                totalRoadmapSteps: roadmapSteps.length > 0 ? roadmapSteps.length : (dashboard?.totalRoadmapSteps ?? 0),
                deadlines: dashboard?.deadlines ?? [],
            };

            setDashboardData(merged);
        });
    }, [currentUserId]);

    useEffect(() => {
        if (!pomRunning) return;
        const id = setInterval(() => {
            setPomTime(prev => {
                if (prev <= 1) {
                    setPomRunning(false);
                    if (pomMode === 'work') {
                        setPomSessions(s => s + 1);
                        setPomMode('break');
                        return pomBreakMins * 60;
                    }
                    setPomMode('work');
                    return pomFocusMins * 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [pomRunning, pomMode, pomFocusMins, pomBreakMins]);

    // Sync timer when settings change and timer is stopped
    useEffect(() => {
        if (!pomRunning) setPomTime(pomMode === 'work' ? pomFocusMins * 60 : pomBreakMins * 60);
    }, [pomFocusMins, pomBreakMins]);

    useEffect(() => {
        const stored = localStorage.getItem('slozy_quickNotes');
        if (stored) setSavedNotes(JSON.parse(stored));
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const formatTime = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const resetPomodoro = () => { setPomRunning(false); setPomMode('work'); setPomTime(pomFocusMins * 60); };

    const getPomSettingValue = (view: string) => {
        if (view === 'focus') return pomFocusMins;
        if (view === 'shortBreak') return pomBreakMins;
        if (view === 'longBreak') return pomLongBreakMins;
        return pomLongBreakAfter;
    };

    const adjustPomSetting = (view: string, delta: number) => {
        if (view === 'focus') setPomFocusMins(v => Math.max(1, Math.min(60, v + delta)));
        else if (view === 'shortBreak') setPomBreakMins(v => Math.max(1, Math.min(30, v + delta)));
        else if (view === 'longBreak') setPomLongBreakMins(v => Math.max(1, Math.min(60, v + delta)));
        else setPomLongBreakAfter(v => Math.max(1, Math.min(10, v + delta)));
    };

    const pomSettingLabel = (view: string) => {
        if (view === 'focus') return 'Focus Session';
        if (view === 'shortBreak') return 'Short Break';
        if (view === 'longBreak') return 'Long Break';
        return 'Long Break After';
    };

    const saveNote = () => {
        if (!noteText.trim()) return;
        const n = { id: Date.now(), text: noteText.trim(), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
        const updated = [n, ...savedNotes].slice(0, 5);
        setSavedNotes(updated);
        localStorage.setItem('slozy_quickNotes', JSON.stringify(updated));
        setNoteText('');
    };

    const deleteNote = (id: number) => {
        const updated = savedNotes.filter(n => n.id !== id);
        setSavedNotes(updated);
        localStorage.setItem('slozy_quickNotes', JSON.stringify(updated));
    };

    const safeDeadlines = dashboardData?.deadlines || [];
    const dynamicDeadlineTabs = ['Tất cả', ...Array.from(new Set(safeDeadlines.map(d => d.subject)))];

    const filteredDeadlines = deadlineTab === 'Tất cả'
        ? safeDeadlines
        : safeDeadlines.filter(d => d.subject === deadlineTab);

    const pomProgress = pomMode === 'work'
        ? ((pomFocusMins * 60 - pomTime) / (pomFocusMins * 60)) * 100
        : ((pomBreakMins * 60 - pomTime) / (pomBreakMins * 60)) * 100;

    const safeRoadmapSteps = dashboardData?.roadmapSteps || [];
    const stepsToShow = roadmapExpanded ? safeRoadmapSteps : safeRoadmapSteps.slice(0, 5);
    const completedSteps = dashboardData?.completedRoadmapSteps || 0;
    const streakCount = dashboardData?.streakCount || 0;
    const safeStreakDays = dashboardData?.streakDays || [];

    // Homepage roadmap card data
    const activeHomepageRoadmap = homepageRoadmaps.find(r => r.roadmapid === selectedHomepageRoadmapId);
    const roadmapChapters = activeHomepageRoadmap?.chapters || [];
    const chaptersToShow = roadmapExpanded ? roadmapChapters : roadmapChapters.slice(0, 4);

    // ── Card style helpers ────────────────────────────────────────────────────
    const card = isDark
        ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300'
        : 'bg-white shadow-sm hover:shadow-md transition-all duration-300';

    const text = isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]';
    const textMuted = isDark ? 'text-[#94a3b8]' : 'text-gray-400';
    const divider = isDark ? 'divide-white/10' : 'divide-gray-100';
    const hoverRow = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${textMuted}`}>
                        {t.studentHome.welcomeHeader}
                    </p>
                    {quote ? (
                        <>
                            <h1 className={`text-2xl font-extrabold max-w-xl leading-snug ${text}`}>&ldquo;{quote.q}&rdquo;</h1>
                            <p className={`mt-1 text-sm font-bold ${textMuted}`}>— {quote.a}</p>
                        </>
                    ) : (
                        <h1 className={`text-3xl font-extrabold ${text}`}>{t.studentHome.greeting}</h1>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <MagnifyingGlass className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                        <input
                            type="text"
                            placeholder={t.studentHome.searchPlaceholder}
                            className={`pl-11 pr-5 py-3 rounded-2xl border-none shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 w-64 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] text-[#f3f4f6] placeholder:text-[#9ca3af]' : 'bg-white text-gray-700 placeholder-gray-400'}`}
                        />
                    </div>

                    {/* Bell */}
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={() => setShowNotifications(v => !v)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${card}`}
                        >
                            <Bell className={`w-5 h-5 ${text}`} weight={showNotifications ? 'fill' : 'regular'} />
                            {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF6B4A] rounded-full" />}
                        </button>

                        <NotificationDropdown
                            open={showNotifications}
                            onClose={() => setShowNotifications(false)}
                        />
                    </div>

                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user?.name || 'User'}
                            className="w-12 h-12 rounded-2xl object-cover shadow-sm cursor-pointer ring-2 ring-[#FF6B4A]/30 hover:ring-[#FF6B4A] transition-all"
                            onClick={() => navigate('/student/account')}
                        />
                    ) : (
                        <div className="w-12 h-12 bg-[#FF6B4A] rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm cursor-pointer hover:bg-[#ff5535] transition-colors" onClick={() => navigate('/student/account')}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stat strip ────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Streak */}
                <button
                    onClick={() => navigate('/student/roadmap')}
                    className={`rounded-3xl p-5 flex items-center gap-4 cursor-pointer text-left ${card}`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-[#FF6B4A]/15 flex items-center justify-center shrink-0">
                        <Fire className="w-6 h-6 text-[#FF6B4A]" weight="fill" />
                    </div>
                    <div className="flex-1">
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>{t.studentHome.streakLabel}</p>
                        <p className={`text-2xl font-extrabold ${text}`}>{streakCount} {t.studentHome.streakUnit}</p>
                        <div className="flex gap-1 mt-2">
                            {safeStreakDays.map(d => (
                                <div key={d.label} className="flex flex-col items-center gap-1">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${d.done ? 'bg-[#FF6B4A]' : d.today ? 'border-2 border-[#FF6B4A]' : (isDark ? 'bg-white/10' : 'bg-gray-100')}`}>
                                        {d.done && <CheckCircle className="w-3 h-3 text-white" weight="fill" />}
                                    </div>
                                    <span className={`text-[9px] font-bold ${d.today ? 'text-[#FF6B4A]' : textMuted}`}>{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </button>

                {/* Sessions today */}
                <div className={`rounded-3xl p-5 flex items-center gap-4 ${card}`}>
                    <div className="w-12 h-12 rounded-2xl bg-[#B8B5FF]/20 flex items-center justify-center shrink-0">
                        <Timer className="w-6 h-6 text-[#7C6FFF]" weight="fill" />
                    </div>
                    <div>
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>{t.studentHome.pomodoroLabel}</p>
                        <p className={`text-2xl font-extrabold ${text}`}>{pomSessions} {t.studentHome.pomodoroUnit}</p>
                        <p className={`text-xs font-semibold mt-1 ${textMuted}`}>{pomSessions * 25} {t.studentHome.pomodoroFocus}</p>
                    </div>
                </div>

                {/* AI chat shortcut */}
                <button
                    onClick={() => navigate('/student/study')}
                    className={`rounded-3xl p-5 flex items-center gap-4 cursor-pointer text-left ${card}`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-[#95E1D3]/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-[#10B981]" weight="fill" />
                    </div>
                    <div className="flex-1">
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>{t.studentHome.tutorLabel}</p>
                        <p className={`text-base font-extrabold ${text}`}>{t.studentHome.tutorCTA}</p>
                        <p className={`text-xs font-semibold mt-1 ${textMuted}`}>{t.studentHome.tutorDesc}</p>
                    </div>
                </button>
            </div>

            {/* ── Main grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-5 mb-5">

                {/* Roadmap card — col-span-2 */}
                <div className={`lg:col-span-2 rounded-3xl p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FCE38A]/30 flex items-center justify-center">
                                <MapTrifold className="w-5 h-5 text-[#D97706]" weight="fill" />
                            </div>
                            <div>
                                <h2 className={`text-lg font-extrabold ${text}`}>{t.studentHome.roadmapTitle}</h2>
                                {homepageRoadmaps.length > 1 ? (
                                    <div className="relative mt-0.5">
                                        <select
                                            value={selectedHomepageRoadmapId?.toString() || ''}
                                            onChange={(e) => setSelectedHomepageRoadmapId(Number(e.target.value))}
                                            className={`text-xs font-bold pr-5 pl-0 py-0 border-none bg-transparent cursor-pointer focus:outline-none appearance-none ${textMuted}`}
                                        >
                                            {homepageRoadmaps.map(r => (
                                                <option key={r.roadmapid} value={r.roadmapid.toString()}>
                                                    {r.subject_name} · {r.total_time} {t.studentRoadmap.weeksUnit}
                                                </option>
                                            ))}
                                        </select>
                                        <CaretDown className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${textMuted}`} />
                                    </div>
                                ) : (
                                    <p className={`text-xs font-semibold ${textMuted}`}>
                                        {activeHomepageRoadmap ? `${activeHomepageRoadmap.subject_name} · ${activeHomepageRoadmap.total_time} ${t.studentRoadmap.weeksUnit}` : t.studentHome.roadmapEmpty}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => navigate('/student/roadmap')} className="text-sm font-bold text-[#FF6B4A] hover:text-[#ff5535] flex items-center gap-1">
                            {t.studentHome.viewAll} <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {homepageRoadmaps.length === 0 ? (
                        <div className="text-center py-6">
                            <p className={`text-sm font-semibold ${textMuted} mb-3`}>{t.studentHome.roadmapEmpty}</p>
                            <button onClick={() => navigate('/student/roadmap')} className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl transition-all">
                                {t.studentHome.roadmapCreate}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Progress bar */}
                            <div className="mb-5">
                                <div className={`flex justify-between text-xs font-bold mb-2 ${textMuted}`}>
                                    <span>{t.studentHome.progressLabel}</span>
                                    <span>{roadmapChapters.length} {t.studentHome.chaptersUnit} · {roadmapChapters.reduce((s: number, c: any) => s + (c.lessons?.length || 0), 0)} {t.studentHome.lessonsUnit}</span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <div className="h-full rounded-full bg-[#FF6B4A] transition-all" style={{ width: '0%' }} />
                                </div>
                            </div>

                            {/* Chapter steps */}
                            <div className={`flex flex-col divide-y ${divider}`}>
                                {chaptersToShow.map((chapter: any, i: number) => (
                                    <div
                                        key={chapter.chapterid || i}
                                        onClick={() => navigate('/student/roadmap')}
                                        className={`flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl cursor-pointer transition-colors ${hoverRow} ${i === 0 ? (isDark ? 'bg-[#FF6B4A]/10' : 'bg-[#FF6B4A]/5') : ''}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-[#FF6B4A]' : (isDark ? 'bg-white/10' : 'bg-gray-100')}`}>
                                            <span className={`text-xs font-extrabold ${i === 0 ? 'text-white' : textMuted}`}>{i + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-extrabold ${text}`}>{chapter.title}</p>
                                            <p className={`text-[11px] font-semibold ${textMuted}`}>{chapter.lessons?.length || 0} {t.studentHome.lessonsUnit}</p>
                                        </div>
                                        {i === 0 && (
                                            <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-2.5 py-1 rounded-full uppercase tracking-widest">{t.studentHome.startChapter}</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <button
                                    onClick={() => setRoadmapExpanded(v => !v)}
                                    className={`text-xs font-extrabold ${textMuted} hover:text-[#FF6B4A] transition-colors`}
                                >
                                    {roadmapExpanded ? t.studentHome.collapseBtn : `▼ ${t.studentHome.showMore} ${roadmapChapters.length - 4 > 0 ? roadmapChapters.length - 4 : ''} ${t.studentHome.chaptersUnit}`}
                                </button>
                                <button
                                    onClick={() => navigate('/student/study')}
                                    className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                >
                                    {t.studentHome.startBtn}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Pomodoro — col-span-1 */}
                <div className="rounded-3xl overflow-hidden bg-[#0f0f0f] flex flex-col">
                    {pomSettings ? (
                        /* ── Settings panel ── */
                        <div className="p-6 flex flex-col flex-1">
                            {pomSettingsView === 'main' ? (
                                <>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-base font-extrabold text-white">Settings</h3>
                                        <button
                                            onClick={() => setPomSettings(false)}
                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                        >
                                            <X className="w-4 h-4 text-white" weight="bold" />
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex rounded-2xl bg-white/8 p-1 mb-5 border border-white/10">
                                        <button className="flex-1 py-2 text-[11px] font-extrabold bg-white/15 text-white rounded-xl uppercase tracking-widest">Duration</button>
                                        <button className="flex-1 py-2 text-[11px] font-extrabold text-gray-600 uppercase tracking-widest">Notifications</button>
                                    </div>

                                    {/* Rows */}
                                    {([
                                        { label: 'Focus Session', val: pomFocusMins, unit: 'min', view: 'focus' },
                                        { label: 'Short break',   val: pomBreakMins, unit: 'min', view: 'shortBreak' },
                                        { label: 'Long break',    val: pomLongBreakMins, unit: 'min', view: 'longBreak' },
                                        { label: 'Long break after', val: pomLongBreakAfter, unit: 'Sess.', view: 'longBreakAfter' },
                                    ] as const).map(row => (
                                        <button
                                            key={row.label}
                                            onClick={() => setPomSettingsView(row.view)}
                                            className="flex items-center justify-between py-4 border-b border-white/8 hover:bg-white/5 px-2 -mx-2 rounded-xl transition-colors"
                                        >
                                            <span className="text-sm font-semibold text-white">{row.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-extrabold text-white">{row.val.toString().padStart(2, '0')}</span>
                                                <span className="text-xs font-semibold text-gray-500">{row.unit}</span>
                                                <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
                                            </div>
                                        </button>
                                    ))}
                                </>
                            ) : (
                                /* ── Detail adjust view ── */
                                <>
                                    <button
                                        onClick={() => setPomSettingsView('main')}
                                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center mb-5 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-white" weight="bold" />
                                    </button>
                                    <h3 className="text-base font-extrabold text-white text-center mb-8">
                                        {pomSettingLabel(pomSettingsView)}
                                    </h3>
                                    <div className="flex items-center justify-center gap-5">
                                        <button
                                            onClick={() => adjustPomSetting(pomSettingsView, -1)}
                                            className="w-12 h-12 rounded-2xl border border-white/20 hover:bg-white/10 text-white text-2xl font-light flex items-center justify-center transition-colors"
                                        >−</button>
                                        <div className="text-center min-w-[80px]">
                                            <span className="text-5xl font-extrabold text-white">
                                                {getPomSettingValue(pomSettingsView).toString().padStart(2, '0')}
                                            </span>
                                            <p className="text-xs font-semibold text-gray-500 mt-1">
                                                {pomSettingsView === 'longBreakAfter' ? 'Sessions' : 'min'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => adjustPomSetting(pomSettingsView, 1)}
                                            className="w-12 h-12 rounded-2xl border border-white/20 hover:bg-white/10 text-white text-2xl font-light flex items-center justify-center transition-colors"
                                        >+</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* ── Main timer view ── */
                        <div className="p-6 flex flex-col items-center">
                            {/* Mode label top */}
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gray-600 mb-4">
                                {pomMode === 'work' ? 'FOCUS' : 'SHORT BREAK'}
                            </p>

                            {/* Ring */}
                            <div className="relative w-52 h-52 mb-3">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                                    <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" />
                                    <circle
                                        cx="80" cy="80" r="68" fill="none"
                                        stroke={pomMode === 'work' ? '#FF6B4A' : '#10B981'}
                                        strokeWidth="7"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 68}`}
                                        strokeDashoffset={`${2 * Math.PI * 68 * (1 - pomProgress / 100)}`}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                {/* Center */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    {pomMode === 'work'
                                        ? <Eye className="w-5 h-5 text-gray-600" weight="regular" />
                                        : <CoffeeBean className="w-5 h-5 text-gray-600" weight="regular" />
                                    }
                                    <span className="text-[2.6rem] font-extrabold text-white tracking-tight leading-none">
                                        {formatTime(pomTime)}
                                    </span>
                                </div>
                            </div>

                            {/* Session dots */}
                            <div className="flex gap-2 mb-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${i < (pomSessions % 4) ? 'bg-[#FF6B4A]' : 'bg-white/12'}`} />
                                ))}
                            </div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-600 mb-6">
                                {pomMode === 'work' ? 'FOCUS' : 'SHORT BREAK'}
                            </p>

                            {/* 3-button controls */}
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={resetPomodoro}
                                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/18 flex items-center justify-center transition-colors shrink-0"
                                >
                                    <ArrowCounterClockwise className="w-4 h-4 text-gray-400" weight="bold" />
                                </button>
                                <button
                                    onClick={() => setPomRunning(v => !v)}
                                    className="flex-1 py-3 rounded-full bg-[#242424] hover:bg-[#2e2e2e] text-white font-extrabold text-sm tracking-[0.15em] uppercase transition-all border border-white/10"
                                >
                                    {pomRunning
                                        ? <span className="flex items-center justify-center gap-2"><Pause className="w-4 h-4" weight="fill" />PAUSE</span>
                                        : <span className="flex items-center justify-center gap-2"><Play className="w-4 h-4" weight="fill" />START</span>
                                    }
                                </button>
                                <button
                                    onClick={() => { setPomSettings(true); setPomSettingsView('main'); }}
                                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/18 flex items-center justify-center transition-colors shrink-0"
                                >
                                    <Gear className="w-4 h-4 text-gray-400" weight="regular" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-5">

                {/* Deadlines & Notifications — col-span-2 */}
                <div className={`lg:col-span-2 rounded-3xl p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FF6B4A]/15 flex items-center justify-center">
                                <CalendarBlank className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                            </div>
                            <div>
                                <h2 className={`text-lg font-extrabold ${text}`}>{t.studentHome.deadlineTitle}</h2>
                                <p className={`text-xs font-semibold ${textMuted}`}>
                                    {safeDeadlines.filter(d => d.urgent).length > 0 && (
                                        <span className="text-[#FF6B4A] font-extrabold">
                                            {safeDeadlines.filter(d => d.urgent).length} {t.studentHome.urgentUnit} ·{' '}
                                        </span>
                                    )}
                                    {unreadCount} {t.studentHome.unreadUnit}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/student/exercises')} className="text-sm font-bold text-[#FF6B4A] hover:text-[#ff5535] flex items-center gap-1">
                            {t.studentHome.viewAll} <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Subject tabs */}
                    <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar pb-2">
                        {dynamicDeadlineTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setDeadlineTab(tab)}
                                className={`px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${deadlineTab === tab
                                    ? (isDark ? 'bg-white text-[#1A1A1A]' : 'bg-[#1A1A1A] text-white')
                                    : (isDark ? 'bg-white/5 text-gray-500 hover:bg-white/10 border border-white/10' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200')
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Deadline list */}
                    <div className={`flex flex-col divide-y ${divider}`}>
                        {filteredDeadlines.map(item => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/student/${item.action}`)}
                                className={`flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-xl cursor-pointer transition-colors ${hoverRow}`}
                            >
                                {/* Subject dot */}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '40' }}>
                                    {item.urgent
                                        ? <Warning className="w-4 h-4" style={{ color: '#FF6B4A' }} weight="fill" />
                                        : <CalendarBlank className="w-4 h-4" style={{ color: '#1A1A1A' }} weight="fill" />
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <p className={`text-sm font-extrabold ${text}`}>{item.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color + '60', color: '#1A1A1A' }}>
                                            {item.subject}
                                        </span>
                                        {item.missing && (
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${isDark ? 'bg-[#3a3f46] text-[#ff8b63] border border-[#ff8b63]/40' : 'bg-[#3b3b3b] text-[#ffb1a0]'}`}>
                                                {t.studentHome.missedLabel}
                                            </span>
                                        )}
                                        <span className={`text-xs font-semibold ${item.urgent ? 'text-[#FF6B4A] font-extrabold' : textMuted}`}>
                                            {item.urgent && '⚠️ '}{item.due}
                                        </span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={e => { e.stopPropagation(); navigate(`/student/${item.action}`); }}
                                    className={`text-xs font-extrabold px-3 py-1.5 rounded-xl transition-colors ${item.urgent
                                        ? 'bg-[#FF6B4A] text-white hover:bg-[#ff5535]'
                                        : (isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                                    }`}
                                >
                                    {item.action === 'schedule' ? t.studentHome.scheduleBtn : item.action === 'review' ? t.studentHome.reviewBtn : t.studentHome.assignmentBtn}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Recent notifications hint */}
                    {unreadCount > 0 && (
                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                            <button
                                onClick={() => setShowNotifications(true)}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-colors ${isDark ? 'bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/15' : 'bg-[#FF6B4A]/5 hover:bg-[#FF6B4A]/10'}`}
                            >
                                <p className={`text-xs font-extrabold ${text}`}>{t.studentHome.unreadBanner.replace('{n}', String(unreadCount))}</p>
                                <Bell className="w-4 h-4 text-[#FF6B4A]" weight="fill" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Notes — col-span-1 */}
                <div className={`rounded-3xl p-6 flex flex-col gap-4 ${card}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#B8B5FF]/20 flex items-center justify-center">
                            <NotePencil className="w-5 h-5 text-[#7C6FFF]" weight="fill" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-extrabold ${text}`}>{t.studentHome.notesTitle}</h2>
                            <p className={`text-xs font-semibold ${textMuted}`}>{savedNotes.length} {t.studentHome.notesUnit}</p>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) saveNote(); }}
                            placeholder={t.studentHome.notePlaceholder}
                            rows={3}
                            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-[#7C6FFF]/40 ${isDark ? 'bg-white/5 text-[#f3f4f6] placeholder:text-gray-600 border border-white/10' : 'bg-gray-50 text-[#1A1A1A] placeholder:text-gray-400 border border-gray-200'}`}
                        />
                        <button
                            onClick={saveNote}
                            disabled={!noteText.trim()}
                            className="w-full py-2.5 rounded-2xl bg-[#7C6FFF] hover:bg-[#6a5de8] disabled:opacity-40 text-white text-sm font-extrabold transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" weight="bold" /> {t.studentHome.noteSaveBtn}
                        </button>
                    </div>

                    {/* Notes list */}
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                        {savedNotes.length === 0 ? (
                            <p className={`text-xs font-semibold text-center py-4 ${textMuted}`}>{t.studentHome.noNotes}</p>
                        ) : (
                            savedNotes.map(n => (
                                <div key={n.id} className={`p-3 rounded-2xl flex gap-3 group ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}>
                                    <p className={`text-xs font-semibold flex-1 leading-relaxed whitespace-pre-wrap ${text}`}>{n.text}</p>
                                    <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                                        <button
                                            onClick={() => deleteNote(n.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash className="w-3.5 h-3.5 text-red-400 hover:text-red-500" weight="fill" />
                                        </button>
                                        <span className={`text-[10px] font-bold ${textMuted}`}>{n.time}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <footer className={`mt-10 text-center text-xs font-semibold ${textMuted}`}>
                {t.studentHome.footer}
            </footer>
        </div>
    );
}
