import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlass, Bell, ArrowRight, CheckCircle, Info,
    Fire, Timer, NotePencil, Play, Pause, ArrowCounterClockwise,
    Warning, MapTrifold, BookOpen, CalendarBlank, Trash, Plus,
    Eye, Gear, ArrowLeft, X, CoffeeBean,
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { API_BASE_URL } from '../../services/env';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockNotificationsData = [
    { id: 1, title: 'Lịch học mới', desc: 'Thầy Bình vừa cập nhật tài liệu cho tiết Toán học sáng nay.', time: '5 phút trước', icon: Info, iconColor: '#2563EB', unread: true },
    { id: 2, title: 'Bài tập sắp đến hạn', desc: 'Bạn còn 2 bài tập Tiếng Anh cần nộp trước 23:59 hôm nay.', time: '2 giờ trước', icon: Bell, iconColor: '#FF6B4A', unread: true },
    { id: 3, title: 'Kết quả bài kiểm tra', desc: 'Chúc mừng! Bạn đã đạt 9.5 điểm trong bài kiểm tra Hóa học.', time: 'Hôm qua', icon: CheckCircle, iconColor: '#10B981', unread: false },
    { id: 4, title: 'Lời mời nhóm học', desc: 'Lê Văn Cường đã mời bạn vào nhóm ôn tập "Toán 12A1".', time: '2 ngày trước', icon: Info, iconColor: '#2563EB', unread: false },
];

const roadmapSteps = [
    { week: 1, title: 'Hàm số & Đồ thị', done: true },
    { week: 2, title: 'Mũ & Logarit', done: true },
    { week: 3, title: 'Nguyên hàm & Tích phân', done: false, current: true },
    { week: 4, title: 'Số phức', done: false },
    { week: 5, title: 'Hình học không gian', done: false },
    { week: 6, title: 'Xác suất thống kê', done: false },
    { week: 7, title: 'Lượng giác', done: false },
    { week: 8, title: 'Ôn tập tổng hợp', done: false },
];

const deadlineItems = [
    { id: 1, subject: 'Toán học', color: '#FCE38A', title: 'Bài tập Tích phân nâng cao', due: '2 giờ nữa', urgent: true, action: 'exercises' },
    { id: 2, subject: 'Tiếng Anh', color: '#B8B5FF', title: 'Nộp bài Writing Task 2', due: 'Ngày mai', urgent: false, action: 'exercises' },
    { id: 3, subject: 'Ngữ Văn', color: '#95E1D3', title: 'Phân tích đoạn trích Truyện Kiều', due: '3 ngày nữa', urgent: false, action: 'exercises' },
    { id: 4, subject: 'Toán học', color: '#FCE38A', title: 'Kiểm tra 15 phút – Số phức', due: 'Thứ 6', urgent: false, action: 'schedule' },
    { id: 5, subject: 'Tiếng Anh', color: '#B8B5FF', title: 'Luyện đề IELTS Mock Test 3', due: 'Tuần sau', urgent: false, action: 'review' },
];

const streakDays = [
    { label: 'T2', done: true },
    { label: 'T3', done: true },
    { label: 'T4', done: true },
    { label: 'T5', done: true, today: true },
    { label: 'T6', done: false },
    { label: 'T7', done: false },
    { label: 'CN', done: false },
];

const DEADLINE_TABS = ['Tất cả', 'Toán học', 'Tiếng Anh', 'Ngữ Văn'];
const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentHomepage() {
    const navigate = useNavigate();
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    // Notification dropdown
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(mockNotificationsData);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => n.unread).length;

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

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node))
                setShowNotifications(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        fetch(`${API_BASE_URL}/quotes/today`)
            .then(r => r.json())
            .then(d => { if (Array.isArray(d) && d.length > 0) setQuote({ q: d[0].q, a: d[0].a }); })
            .catch(() => {});
    }, []);

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

    const switchPomMode = (mode: 'work' | 'break') => {
        setPomRunning(false);
        setPomMode(mode);
        setPomTime(mode === 'work' ? pomFocusMins * 60 : pomBreakMins * 60);
    };

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

    const markAllAsRead = () => setNotifications(p => p.map(n => ({ ...n, unread: false })));
    const markAsRead = (id: number) => setNotifications(p => p.map(n => n.id === id ? { ...n, unread: false } : n));

    const filteredDeadlines = deadlineTab === 'Tất cả'
        ? deadlineItems
        : deadlineItems.filter(d => d.subject === deadlineTab);

    const pomProgress = pomMode === 'work'
        ? ((pomFocusMins * 60 - pomTime) / (pomFocusMins * 60)) * 100
        : ((pomBreakMins * 60 - pomTime) / (pomBreakMins * 60)) * 100;

    const stepsToShow = roadmapExpanded ? roadmapSteps : roadmapSteps.slice(0, 5);
    const completedSteps = roadmapSteps.filter(s => s.done).length;

    // ── Card style helpers ────────────────────────────────────────────────────
    const card = isDark
        ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300'
        : 'bg-white shadow-sm hover:shadow-md transition-all duration-300';

    const cardFlat = isDark
        ? 'bg-[#1A1A1A] border border-white/10'
        : 'bg-white border border-gray-100';

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
                        Chào mừng đến với <span className="text-[#FF6B4A]">Slothub</span>
                    </p>
                    {quote ? (
                        <>
                            <h1 className={`text-2xl font-extrabold max-w-xl leading-snug ${text}`}>&ldquo;{quote.q}&rdquo;</h1>
                            <p className={`mt-1 text-sm font-bold ${textMuted}`}>— {quote.a}</p>
                        </>
                    ) : (
                        <h1 className={`text-3xl font-extrabold ${text}`}>Chào buổi sáng, Văn A!</h1>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <MagnifyingGlass className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
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

                        {showNotifications && (
                            <div className={`absolute right-0 mt-3 w-80 rounded-3xl shadow-2xl z-[100] overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE]' : 'bg-white border-2 border-[#1A1A1A]/5'}`}>
                                <div className={`px-6 py-4 flex items-center justify-between ${isDark ? 'border-b border-white/10 bg-[#15161a]' : 'border-b border-gray-100 bg-gray-50/50'}`}>
                                    <h3 className={`font-extrabold text-sm ${text}`}>Thông báo</h3>
                                    <button onClick={markAllAsRead} disabled={unreadCount === 0} className="text-[10px] font-extrabold text-[#FF6B4A] hover:underline uppercase tracking-widest disabled:opacity-50">
                                        Đánh dấu đã đọc
                                    </button>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    {notifications.slice(0, 5).map(n => (
                                        <div key={n.id} onClick={() => markAsRead(n.id)} className={`px-6 py-4 flex gap-4 cursor-pointer relative ${hoverRow} ${n.unread ? (isDark ? 'bg-[#FF6B4A]/10' : 'bg-blue-50/10') : ''}`}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: n.iconColor + '15' }}>
                                                <n.icon className="w-5 h-5" style={{ color: n.iconColor }} weight="fill" />
                                            </div>
                                            <div className="space-y-1 pr-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-xs font-extrabold ${text}`}>{n.title}</p>
                                                    <span className={`text-[10px] font-bold whitespace-nowrap ${textMuted}`}>{n.time}</span>
                                                </div>
                                                <p className={`text-[11px] font-semibold leading-relaxed ${textMuted}`}>{n.desc}</p>
                                            </div>
                                            {n.unread && <div className="absolute top-1/2 -translate-y-1/2 right-4 w-1.5 h-1.5 bg-[#FF6B4A] rounded-full" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-12 h-12 bg-[#FF6B4A] rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm cursor-pointer" onClick={() => navigate('/student/account')}>V</div>
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
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>Streak học tập</p>
                        <p className={`text-2xl font-extrabold ${text}`}>15 ngày 🔥</p>
                        <div className="flex gap-1 mt-2">
                            {streakDays.map(d => (
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
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>Pomodoro hôm nay</p>
                        <p className={`text-2xl font-extrabold ${text}`}>{pomSessions} phiên 🍅</p>
                        <p className={`text-xs font-semibold mt-1 ${textMuted}`}>{pomSessions * 25} phút tập trung</p>
                    </div>
                </div>

                {/* AI chat shortcut */}
                <button
                    onClick={() => navigate('/student/chat')}
                    className={`rounded-3xl p-5 flex items-center gap-4 cursor-pointer text-left ${card}`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-[#95E1D3]/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-[#10B981]" weight="fill" />
                    </div>
                    <div className="flex-1">
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-0.5 ${textMuted}`}>Slozy AI Tutor</p>
                        <p className={`text-base font-extrabold ${text}`}>Hỏi Slozy ngay</p>
                        <p className={`text-xs font-semibold mt-1 ${textMuted}`}>Giải đáp bài tập tức thì →</p>
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
                                <h2 className={`text-lg font-extrabold ${text}`}>Lộ trình đang học</h2>
                                <p className={`text-xs font-semibold ${textMuted}`}>Toán học · Ôn thi THPT Quốc gia</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/student/roadmap')} className="text-sm font-bold text-[#FF6B4A] hover:text-[#ff5535] flex items-center gap-1">
                            Xem chi tiết <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                        <div className={`flex justify-between text-xs font-bold mb-2 ${textMuted}`}>
                            <span>Tiến độ tổng thể</span>
                            <span>{completedSteps}/{roadmapSteps.length} tuần hoàn thành</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                            <div className="h-full rounded-full bg-[#FF6B4A] transition-all" style={{ width: `${(completedSteps / roadmapSteps.length) * 100}%` }} />
                        </div>
                    </div>

                    {/* Steps */}
                    <div className={`flex flex-col divide-y ${divider}`}>
                        {stepsToShow.map((step, i) => (
                            <div
                                key={i}
                                onClick={() => navigate('/student/roadmap')}
                                className={`flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl cursor-pointer transition-colors ${hoverRow} ${step.current ? (isDark ? 'bg-[#FF6B4A]/10' : 'bg-[#FF6B4A]/5') : ''}`}
                            >
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-[#10B981]' : step.current ? 'bg-[#FF6B4A]' : (isDark ? 'bg-white/10' : 'bg-gray-100')}`}>
                                    {step.done
                                        ? <CheckCircle className="w-4 h-4 text-white" weight="fill" />
                                        : <span className={`text-xs font-extrabold ${step.current ? 'text-white' : textMuted}`}>{step.week}</span>
                                    }
                                </div>

                                {/* Title */}
                                <div className="flex-1">
                                    <p className={`text-sm font-extrabold ${step.done ? textMuted : text} ${step.done ? 'line-through' : ''}`}>{step.title}</p>
                                    <p className={`text-[11px] font-semibold ${textMuted}`}>Tuần {step.week}</p>
                                </div>

                                {/* Badge */}
                                {step.current && (
                                    <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-2.5 py-1 rounded-full uppercase tracking-widest">Đang học</span>
                                )}
                                {step.done && (
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest ${isDark ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#10B981]/10 text-[#10B981]'}`}>Hoàn thành</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setRoadmapExpanded(v => !v)}
                            className={`text-xs font-extrabold ${textMuted} hover:text-[#FF6B4A] transition-colors`}
                        >
                            {roadmapExpanded ? '▲ Thu gọn' : `▼ Xem thêm ${roadmapSteps.length - 5} tuần`}
                        </button>
                        <button
                            onClick={() => navigate('/student/roadmap')}
                            className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2.5 rounded-2xl transition-all shadow-sm hover:shadow-md"
                        >
                            Bắt đầu tuần này →
                        </button>
                    </div>
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
                                <h2 className={`text-lg font-extrabold ${text}`}>Deadline & Thông báo</h2>
                                <p className={`text-xs font-semibold ${textMuted}`}>
                                    {deadlineItems.filter(d => d.urgent).length > 0 && (
                                        <span className="text-[#FF6B4A] font-extrabold">
                                            {deadlineItems.filter(d => d.urgent).length} việc cần làm ngay ·{' '}
                                        </span>
                                    )}
                                    {unreadCount} thông báo chưa đọc
                                </p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/student/exercises')} className="text-sm font-bold text-[#FF6B4A] hover:text-[#ff5535] flex items-center gap-1">
                            Xem tất cả <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Subject tabs */}
                    <div className="flex gap-2 mb-5">
                        {DEADLINE_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setDeadlineTab(tab)}
                                className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all ${deadlineTab === tab
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
                                    {item.action === 'schedule' ? 'Xem lịch' : item.action === 'review' ? 'Ôn tập' : 'Làm bài'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Recent notifications */}
                    <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${textMuted}`}>Thông báo gần đây</p>
                        <div className="flex flex-col gap-2">
                            {notifications.filter(n => n.unread).slice(0, 2).map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markAsRead(n.id)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${isDark ? 'bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/15' : 'bg-[#FF6B4A]/5 hover:bg-[#FF6B4A]/10'}`}
                                >
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: n.iconColor + '20' }}>
                                        <n.icon className="w-4 h-4" style={{ color: n.iconColor }} weight="fill" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-extrabold truncate ${text}`}>{n.title}</p>
                                        <p className={`text-[11px] font-semibold truncate ${textMuted}`}>{n.desc}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold whitespace-nowrap ${textMuted}`}>{n.time}</span>
                                    <div className="w-1.5 h-1.5 bg-[#FF6B4A] rounded-full shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Notes — col-span-1 */}
                <div className={`rounded-3xl p-6 flex flex-col gap-4 ${card}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#B8B5FF]/20 flex items-center justify-center">
                            <NotePencil className="w-5 h-5 text-[#7C6FFF]" weight="fill" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-extrabold ${text}`}>Ghi chú nhanh</h2>
                            <p className={`text-xs font-semibold ${textMuted}`}>{savedNotes.length} ghi chú đã lưu</p>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) saveNote(); }}
                            placeholder="Nhập ghi chú... (Ctrl+Enter để lưu)"
                            rows={3}
                            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-[#7C6FFF]/40 ${isDark ? 'bg-white/5 text-[#f3f4f6] placeholder:text-gray-600 border border-white/10' : 'bg-gray-50 text-[#1A1A1A] placeholder:text-gray-400 border border-gray-200'}`}
                        />
                        <button
                            onClick={saveNote}
                            disabled={!noteText.trim()}
                            className="w-full py-2.5 rounded-2xl bg-[#7C6FFF] hover:bg-[#6a5de8] disabled:opacity-40 text-white text-sm font-extrabold transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" weight="bold" /> Lưu ghi chú
                        </button>
                    </div>

                    {/* Notes list */}
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                        {savedNotes.length === 0 ? (
                            <p className={`text-xs font-semibold text-center py-4 ${textMuted}`}>Chưa có ghi chú nào</p>
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
                © 2024 Slothub – Nền tảng học tập thông minh.
            </footer>
        </div>
    );
}
