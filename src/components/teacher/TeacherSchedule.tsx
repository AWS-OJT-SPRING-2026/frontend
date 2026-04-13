import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    CaretLeft, CaretRight, Video, Warning,
    X, CalendarBlank, Clock,
    Check, CalendarDots, Rows, SquaresFour, Users, BookOpen, LinkSimple, LinkBreak,
} from '@phosphor-icons/react';
import { Input } from '../ui/input';
import { AttendanceModal } from '../shared/AttendanceModal';
import { timetableService, type TimetableItem, type TeacherScheduleStats } from '../../services/timetableService';
import { useSettings } from '../../context/SettingsContext';
import { parseVnDate } from '../../lib/timeUtils';

/* ── Status-based color system ── */
type EventStatus = 'past' | 'upcoming' | 'ongoing';

function getStatusStyles(isDark: boolean): Record<EventStatus, { bg: string; border: string; text: string; label: string; dot: string }> {
    return isDark
        ? {
            past: { bg: '#1f2630', border: '#3e4b60', text: '#cbd5e1', label: 'Đã kết thúc', dot: '#94a3b8' },
            upcoming: { bg: '#312817', border: '#7a5b25', text: '#fde68a', label: 'Sắp diễn ra', dot: '#f59e0b' },
            ongoing: { bg: '#13352c', border: '#1f6b54', text: '#a7f3d0', label: 'Đang diễn ra', dot: '#34d399' },
        }
        : {
            past: { bg: '#F3F4F6', border: '#D1D5DB', text: '#4B5563', label: 'Đã kết thúc', dot: '#6B7280' },
            upcoming: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E', label: 'Sắp diễn ra', dot: '#D97706' },
            ongoing: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', label: 'Đang diễn ra', dot: '#22C55E' },
        };
}

function getEventStatus(ev: ScheduleEvent, now: Date): EventStatus {
    const start = parseVnDate(ev.startTime);
    const end = parseVnDate(ev.endTime);
    if (now > end) return 'past';
    if (now < start) return 'upcoming';
    return 'ongoing';
}

/* ── Types ── */
interface ScheduleEvent {
    id: number;
    classID: number;
    title: string;       // subjectName
    className: string;
    topic: string;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
    dayOfWeek: number;   // 0=Mon .. 6=Sun
    date: string;        // "DD/MM"
    meetLink: string;
    startTime: string;   // ISO
    endTime: string;     // ISO
    time: string;        // "HH:MM - HH:MM"
    dateKey: string;     // "YYYY-MM-DD"
}

type ViewMode = 'week' | 'day' | 'month';

/* ── Helpers ── */
const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_NAMES_FULL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const HOURS_START = 7;
const HOURS_END = 21;
const HOURS = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => i + HOURS_START);

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtHM(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }

function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}
function getSunday(monday: Date): Date {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

function getWeekNumber(d: Date): number {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime() + ((start.getDay() + 6) % 7) * 86400000;
    return Math.ceil(diff / 604800000);
}

function formatDateRange(monday: Date): string {
    const sun = new Date(monday);
    sun.setDate(sun.getDate() + 6);
    return `${monday.getDate()}/${monday.getMonth() + 1} - ${sun.getDate()}/${sun.getMonth() + 1}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

/** Convert TimetableItem from API → ScheduleEvent */
function mapToScheduleEvent(item: TimetableItem): ScheduleEvent {
    const start = parseVnDate(item.startTime);
    const end = parseVnDate(item.endTime);
    const dayOfWeek = (start.getDay() + 6) % 7; // 0=Mon

    return {
        id: item.timetableID,
        classID: item.classID,
        title: item.subjectName,
        className: item.className,
        topic: item.topic || '',
        startHour: start.getHours(),
        startMin: start.getMinutes(),
        endHour: end.getHours(),
        endMin: end.getMinutes(),
        dayOfWeek,
        date: `${start.getDate()}/${start.getMonth() + 1}`,
        meetLink: item.googleMeetLink || '',
        startTime: item.startTime,
        endTime: item.endTime,
        time: `${fmtHM(start.getHours(), start.getMinutes())} - ${fmtHM(end.getHours(), end.getMinutes())}`,
        dateKey: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    };
}

/* ── Skeleton ── */
function SkeletonEvent() {
    return (
        <div className="rounded-2xl border-2 border-[#1A1A1A]/10 p-3 animate-pulse space-y-2">
            <div className="h-3 bg-[#1A1A1A]/10 rounded w-3/4" />
            <div className="h-2.5 bg-[#1A1A1A]/10 rounded w-1/2" />
            <div className="h-2 bg-[#1A1A1A]/10 rounded w-1/3" />
        </div>
    );
}

/* ── Tooltip Component ── */
function EventTooltip({ event, x, y, now, isDark }: { event: ScheduleEvent; x: number; y: number; now: Date; isDark: boolean }) {
    const status = getEventStatus(event, now);
    const style = getStatusStyles(isDark)[status];

    return (
        <div
            className="fixed z-[100] pointer-events-none animate-[tooltipIn_0.15s_ease-out]"
            style={{ left: x + 14, top: y - 12 }}
        >
            <div className={`text-white rounded-xl px-4 py-3 text-xs shadow-2xl max-w-[280px] border ${isDark ? 'bg-[#0f1218] border-white/15' : 'bg-[#1A1A1A] border-white/10'}`}>
                {/* Status badge */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.dot }} />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: style.dot }}>{style.label}</span>
                </div>
                <div className="font-extrabold text-sm mb-1.5">{event.title}</div>
                <div className="space-y-1 text-white/75">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-3 h-3 shrink-0" />
                        <span>Lớp: {event.className}</span>
                    </div>
                    {event.topic && (
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span>Chủ đề: {event.topic}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{event.time}</span>
                    </div>
                    {event.meetLink ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <LinkSimple className="w-3 h-3 shrink-0" />
                            <span>Có link Google Meet</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-yellow-400">
                            <LinkBreak className="w-3 h-3 shrink-0" />
                            <span>Chưa có link Meet</span>
                        </div>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/40 font-bold">
                    Nhấp để xem chi tiết
                </div>
            </div>
        </div>
    );
}

/* ── Event Detail Panel ── */
function EventDetailPanel({
    event,
    onClose,
    onUpdateMeetLink,
    onOpenAttendance,
    now,
    isDark,
}: {
    event: ScheduleEvent;
    onClose: () => void;
    onUpdateMeetLink: (event: ScheduleEvent, meetLink: string) => Promise<void>;
    onOpenAttendance: () => void;
    now: Date;
    isDark: boolean;
}) {
    const [meetLink, setMeetLink] = useState(event.meetLink);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const status = getEventStatus(event, now);
    const style = getStatusStyles(isDark)[status];

    useEffect(() => {
        setMeetLink(event.meetLink);
        setSaveMessage(null);
    }, [event.id, event.meetLink]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await onUpdateMeetLink(event, meetLink.trim());
            setSaveMessage('Đã cập nhật link Google Meet.');
        } catch {
            setSaveMessage('Không thể cập nhật link. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={`w-full xl:w-80 rounded-3xl border-2 overflow-hidden shrink-0 animate-[slideInRight_0.3s_ease-out] ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
            <div className={`px-6 py-4 border-b-2 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`} style={{ backgroundColor: style.bg }}>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: style.dot }} />
                    <h3 className="font-extrabold text-lg" style={{ color: style.text }}>Chi tiết buổi học</h3>
                </div>
                <button onClick={onClose} className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-100' : 'bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20'}`}>
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="p-5 space-y-4">
                <div className="rounded-2xl p-4 border-2 space-y-3" style={{ backgroundColor: style.bg, borderColor: style.border }}>
                    <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 text-white" style={{ backgroundColor: style.dot }}>
                            {event.title.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Môn học</div>
                            <div className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{event.title}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        {[
                            ['Lớp học', event.className],
                            ['Thời gian', event.time],
                            ['Chủ đề', event.topic || '—'],
                            ['Ngày dạy', `${DAY_NAMES[event.dayOfWeek]}, ${event.date}`],
                        ].map(([l, v]) => (
                            <div key={l}>
                                <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{l}</div>
                                <div className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#FF6B4A]" weight="fill" />
                        <span className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Link Google Meet</span>
                    </div>
                    <Input
                        value={meetLink}
                        onChange={e => setMeetLink(e.target.value)}
                        placeholder="Dán link Google Meet..."
                        className={`rounded-2xl border-2 font-semibold focus:border-[#FF6B4A] transition-colors ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100' : 'border-[#1A1A1A]/20 bg-[#F7F7F2]'}`}
                    />
                    {!meetLink && (
                        <div className="flex items-center gap-1.5 text-xs text-[#FF6B4A] font-bold">
                            <Warning className="w-3.5 h-3.5" weight="fill" />
                            Chưa có link Meet cho buổi học này
                        </div>
                    )}
                    {meetLink && (
                        <a href={meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline">
                            <Video className="w-3.5 h-3.5" weight="fill" />
                            Mở link Meet
                        </a>
                    )}
                </div>
            </div>

            <div className={`p-5 border-t-2 space-y-3 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 bg-[#FF6B4A] hover:bg-[#ff5535] disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <Check className="w-4 h-4" weight="bold" /> {isSaving ? 'Đang cập nhật...' : 'Cập nhật link buổi học'}
                </button>
                <button
                    onClick={onOpenAttendance}
                    className={`w-full py-3 font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-100 border-white/10' : 'bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/10'}`}
                >
                    <Users className="w-4 h-4" weight="bold" /> Điểm danh học sinh
                </button>
                {saveMessage && <p className="text-xs font-bold text-[#1A1A1A]/60">{saveMessage}</p>}
                <p className="text-xs font-bold text-gray-400">
                    Giáo viên chỉ được cập nhật link Google Meet cho buổi học này.
                </p>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                        */
/* ══════════════════════════════════════════════════════ */
export function TeacherSchedule() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const today = new Date();
    const [now, setNow] = useState(new Date());

    const [currentDate, setCurrentDate] = useState(today);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [tooltipData, setTooltipData] = useState<{ event: ScheduleEvent; x: number; y: number } | null>(null);
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();

    // API data
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [stats, setStats] = useState<TeacherScheduleStats>({ totalSessions: 0, hasLinkSessions: 0, missingLinkSessions: 0 });

    const monday = getMonday(currentDate);
    const weekNum = getWeekNumber(currentDate);

    // ── Fetch data from API ──
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            let start: Date, end: Date;

            if (viewMode === 'month') {
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            } else {
                start = getMonday(currentDate);
                end = getSunday(start);
            }

            const [items, statsData] = await Promise.all([
                timetableService.getMyScheduleList(start, end),
                timetableService.getMyScheduleStats(start, end),
            ]);

            const mapped = items.map(item => mapToScheduleEvent(item));
            setEvents(mapped);
            setStats(statsData);
        } catch (err: any) {
            console.error('Failed to fetch schedule:', err);
            setError(err?.message || 'Không thể tải lịch dạy');
        } finally {
            setIsLoading(false);
        }
    }, [currentDate.toISOString(), viewMode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Keep time-based status chips fresh without requiring user interaction.
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // ── Update meet link via API ──
    const handleUpdateMeetLink = useCallback(async (event: ScheduleEvent, meetLink: string) => {
        const updated = await timetableService.updateMeetLink(event.id, meetLink);

        // Update local state
        setEvents(prev => prev.map(ev => {
            if (ev.id !== event.id) return ev;
            return { ...ev, meetLink: updated.googleMeetLink || '' };
        }));

        setSelectedEvent(prev => {
            if (!prev || prev.id !== event.id) return prev;
            return { ...prev, meetLink: updated.googleMeetLink || '' };
        });

        // Refresh stats
        try {
            let start: Date, end: Date;
            if (viewMode === 'month') {
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            } else {
                start = getMonday(currentDate);
                end = getSunday(start);
            }
            const newStats = await timetableService.getMyScheduleStats(start, end);
            setStats(newStats);
        } catch { /* stats refresh is best-effort */ }
    }, [currentDate, viewMode]);

    // Tooltip handlers
    const showTooltip = useCallback((ev: ScheduleEvent, e: React.MouseEvent) => {
        clearTimeout(tooltipTimeout.current);
        setTooltipData({ event: ev, x: e.clientX, y: e.clientY });
    }, []);

    const hideTooltip = useCallback(() => {
        tooltipTimeout.current = setTimeout(() => setTooltipData(null), 200);
    }, []);

    // Days for week view
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            return {
                name: DAY_NAMES[i],
                date: d.getDate(),
                month: d.getMonth() + 1,
                isToday: isSameDay(d, today),
                fullDate: new Date(d),
                dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            };
        });
    }, [monday.toISOString()]);

    // Navigation
    const goToday = useCallback(() => setCurrentDate(new Date()), []);
    const goPrev = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() - 7);
        else if (viewMode === 'day') d.setDate(d.getDate() - 1);
        else d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
        setSelectedEvent(null);
    }, [currentDate, viewMode]);
    const goNext = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() + 7);
        else if (viewMode === 'day') d.setDate(d.getDate() + 1);
        else d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
        setSelectedEvent(null);
    }, [currentDate, viewMode]);

    // Month calendar days
    const monthDays = useMemo(() => {
        if (viewMode !== 'month') return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDow = (firstDay.getDay() + 6) % 7;
        const days: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean; dateKey: string }[] = [];

        for (let i = startDow - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d.getDate(), month: d.getMonth(), year: d.getFullYear(), isCurrentMonth: false, isToday: false, dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({ date: i, month, year, isCurrentMonth: true, isToday: isSameDay(d, today), dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(i)}` });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push({ date: i, month: month + 1, year: d.getFullYear(), isCurrentMonth: false, isToday: false, dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(i)}` });
        }
        return days;
    }, [currentDate.toISOString(), viewMode]);

    // Day view events
    const dayEvents = useMemo(() => {
        const dateKey = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
        return events.filter(e => e.dateKey === dateKey);
    }, [events, currentDate.toISOString()]);

    const headerText = useMemo(() => {
        if (viewMode === 'week') return `Tuần ${weekNum} (${formatDateRange(monday)})`;
        if (viewMode === 'day') return `${DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7]}, ${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }, [viewMode, currentDate.toISOString()]);

    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* ═══ Header ═══ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Thời khóa biểu dạy học</p>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Lịch dạy của tôi</h1>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className={`flex rounded-2xl p-1 border-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/10'}`}>
                        {([
                            { mode: 'day' as ViewMode, icon: Rows, label: 'Ngày' },
                            { mode: 'week' as ViewMode, icon: SquaresFour, label: 'Tuần' },
                            { mode: 'month' as ViewMode, icon: CalendarDots, label: 'Tháng' },
                        ]).map(v => (
                            <button
                                key={v.mode}
                                onClick={() => { setViewMode(v.mode); setSelectedEvent(null); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === v.mode
                                        ? isDark ? 'bg-[#20242b] text-gray-100 shadow-sm' : 'bg-white text-[#1A1A1A] shadow-sm'
                                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70'
                                    }`}
                            >
                                <v.icon className="w-4 h-4" weight={viewMode === v.mode ? 'fill' : 'regular'} />
                                {v.label}
                            </button>
                        ))}
                    </div>

                    <div className={`flex items-center border-2 rounded-2xl p-1 gap-1 ${isDark ? 'bg-[#20242b] border-white/15' : 'bg-white border-[#1A1A1A]/20'}`}>
                        <button onClick={goPrev} className={`p-2 rounded-xl transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#1A1A1A]/5'}`}>
                            <CaretLeft className={`w-4 h-4 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} />
                        </button>
                        <span className={`px-3 font-extrabold text-sm whitespace-nowrap ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{headerText}</span>
                        <button onClick={goNext} className={`p-2 rounded-xl transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#1A1A1A]/5'}`}>
                            <CaretRight className={`w-4 h-4 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} />
                        </button>
                    </div>

                    <button onClick={goToday} className="px-4 h-10 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-sm rounded-2xl active:scale-95 transition-all">
                        Hôm nay
                    </button>
                </div>
            </div>

            {/* ═══ Quick Stats from API ═══ */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Buổi trong tuần', value: stats.totalSessions, bg: '#FCE38A', icon: CalendarBlank },
                    { label: 'Có link Meet', value: stats.hasLinkSessions, bg: '#95E1D3', icon: Video },
                    { label: 'Chưa có link', value: stats.missingLinkSessions, bg: '#FFB5B5', icon: Warning },
                ].map((s, i) => (
                    <div key={i} className={`rounded-2xl p-4 border-2 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`} style={{ backgroundColor: isDark ? (i === 0 ? '#2f2a1a' : i === 1 ? '#173434' : '#3a2025') : s.bg }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-black/40' : 'bg-[#1A1A1A]'}`}>
                            <s.icon className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{s.label}</div>
                            <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* ═══════════════════════════════════════════════ */}
                {/* WEEK VIEW                                       */}
                {/* ═══════════════════════════════════════════════ */}
                {viewMode === 'week' && (
                    <div className={`flex-1 rounded-3xl border-2 overflow-hidden min-w-0 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                        {/* Day headers */}
                        <div className={`grid grid-cols-[60px_repeat(7,1fr)] border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                            <div className={isDark ? 'border-r-2 border-white/10' : 'border-r-2 border-[#1A1A1A]/20'} />
                            {weekDays.map((day, i) => (
                                <div
                                    key={i}
                                    className={`py-4 text-center border-r-2 last:border-r-0 transition-colors cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5'} ${day.isToday ? 'bg-[#FF6B4A]' : ''}`}
                                    onClick={() => { setCurrentDate(day.fullDate); setViewMode('day'); }}
                                >
                                    <div className={`text-[11px] font-extrabold mb-1 ${day.isToday ? 'text-white/70' : 'text-gray-400'}`}>{day.name}</div>
                                    <div className={`text-2xl font-extrabold ${day.isToday ? 'text-white' : 'text-[#1A1A1A]'}`}>{day.date}</div>
                                </div>
                            ))}
                        </div>

                        {/* Time grid */}
                        <div className="relative">
                            <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                                {HOURS.map(hour => (
                                    <div key={hour} className="contents">
                                        <div className={`h-16 border-r-2 border-b flex items-start justify-end pr-2 pt-1 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                                            <span className="text-[10px] font-extrabold text-gray-400">{pad(hour)}:00</span>
                                        </div>
                                        {weekDays.map((day, di) => (
                                            <div
                                                key={di}
                                                className={`h-16 border-r-2 border-b last:border-r-0 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'} ${day.isToday ? isDark ? 'bg-[#FF6B4A]/[0.08]' : 'bg-[#FF6B4A]/[0.03]' : ''}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Events overlay */}
                            {!isLoading && events.map(ev => {
                                const topOffset = ((ev.startHour - HOURS_START) * 60 + ev.startMin) * (64 / 60);
                                const heightPx = ((ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin)) * (64 / 60);
                                // Find which column from dateKey
                                const colIdx = weekDays.findIndex(d => d.dateKey === ev.dateKey);
                                if (colIdx < 0) return null;
                                const dayColumnWidth = 'calc((100% - 60px) / 7)';
                                const leftOffset = `calc(60px + ${colIdx} * ${dayColumnWidth})`;
                                const evStatus = getEventStatus(ev, now);
                                const evStyle = getStatusStyles(isDark)[evStatus];

                                return (
                                    <div
                                        key={ev.id}
                                        className="absolute px-1"
                                        style={{
                                            top: `${topOffset}px`,
                                            left: leftOffset,
                                            width: dayColumnWidth,
                                            height: `${heightPx}px`,
                                            zIndex: hoveredEventId === ev.id ? 20 : 10,
                                        }}
                                    >
                                        <div
                                            className={`h-full p-2.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col ${selectedEvent?.id === ev.id ? 'shadow-lg ring-2 ring-[#FF6B4A]/30 scale-[1.02]' : 'hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01]'
                                                }`}
                                            style={{ backgroundColor: evStyle.bg, borderColor: selectedEvent?.id === ev.id ? evStyle.dot : evStyle.border }}
                                            onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
                                            onMouseEnter={(e) => { setHoveredEventId(ev.id); showTooltip(ev, e); }}
                                            onMouseLeave={() => { setHoveredEventId(null); hideTooltip(); }}
                                        >
                                            {/* Title + Class */}
                                            <div className="font-extrabold text-[11px] leading-tight text-[#1A1A1A]">{ev.title}</div>
                                            <div className="text-[10px] font-bold mt-0.5" style={{ color: evStyle.text }}>Lớp {ev.className}</div>
                                            <div className="text-[9px] font-bold mt-0.5" style={{ color: `${evStyle.text}99` }}>{ev.time}</div>
                                            {/* Time status + Meet link indicator */}
                                            <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                                                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${evStyle.dot}20`, color: evStyle.text }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: evStyle.dot }} />
                                                    {evStyle.label}
                                                </span>
                                                {!ev.meetLink ? (
                                                    <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-[#3a2025] text-[#fca5a5]' : 'bg-[#FFF7ED] text-[#C2410C]'}`}>
                                                        <Warning className="w-2.5 h-2.5" weight="fill" /> Chưa link
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-[#13352c] text-[#6ee7b7]' : 'bg-[#ECFDF5] text-[#047857]'}`}>
                                                        <Video className="w-2.5 h-2.5" weight="fill" /> Meet
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Loading skeletons */}
                            {isLoading && (
                                <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] p-2 gap-2" style={{ paddingLeft: '60px' }}>
                                    {[0, 2, 4].map(col => (
                                        <div key={col} className="space-y-4" style={{ gridColumn: col + 2 }}>
                                            <SkeletonEvent />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/* DAY VIEW                                        */}
                {/* ═══════════════════════════════════════════════ */}
                {viewMode === 'day' && (
                    <div className={`flex-1 rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                        <div className={`px-6 py-5 border-b-2 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                            <div>
                                <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                                    {DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7]}
                                </div>
                                <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                                    {currentDate.getDate()} {MONTH_NAMES[currentDate.getMonth()]}
                                </div>
                            </div>
                            <div className="text-sm font-bold text-gray-400">
                                {dayEvents.length} buổi học
                            </div>
                        </div>

                        <div className="relative">
                            {HOURS.map(hour => (
                                <div key={hour} className={`flex border-b ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                                    <div className="w-16 h-20 flex items-start justify-end pr-3 pt-2 shrink-0">
                                        <span className="text-[11px] font-extrabold text-gray-400">{pad(hour)}:00</span>
                                    </div>
                                    <div className={`flex-1 h-20 border-l-2 relative ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                                        {!isLoading && dayEvents.filter(e => e.startHour === hour).map(ev => {
                                            const durationMins = (ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin);
                                            const heightPx = durationMins * (80 / 60);
                                            const evStatus = getEventStatus(ev, now);
                                            const evStyle = getStatusStyles(isDark)[evStatus];
                                            return (
                                                <div
                                                    key={ev.id}
                                                    className="absolute left-2 right-4 z-10"
                                                    style={{ top: `${(ev.startMin / 60) * 80}px`, height: `${heightPx}px` }}
                                                >
                                                    <div
                                                        className={`h-full p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col ${selectedEvent?.id === ev.id ? 'shadow-lg ring-2 ring-[#FF6B4A]/30 scale-[1.01]' : 'hover:shadow-md hover:-translate-y-0.5'
                                                            }`}
                                                        style={{ backgroundColor: evStyle.bg, borderColor: selectedEvent?.id === ev.id ? evStyle.dot : evStyle.border }}
                                                        onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
                                                        onMouseEnter={(e) => { setHoveredEventId(ev.id); showTooltip(ev, e); }}
                                                        onMouseLeave={() => { setHoveredEventId(null); hideTooltip(); }}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{ev.title}</h4>
                                                                <p className="text-xs font-bold mt-0.5" style={{ color: evStyle.text }}>Lớp {ev.className}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1.5 text-xs font-bold" style={{ color: `${evStyle.text}99` }}>
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</span>
                                                        </div>
                                                        {/* Time status + Meet link indicator */}
                                                        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${evStyle.dot}20`, color: evStyle.text }}>
                                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: evStyle.dot }} />
                                                                {evStyle.label}
                                                            </span>
                                                            {!ev.meetLink ? (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${isDark ? 'bg-[#3a2025] text-[#fca5a5]' : 'bg-[#FFF7ED] text-[#C2410C]'}`}>
                                                                    <Warning className="w-3 h-3" weight="fill" /> Chưa có link
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${isDark ? 'bg-[#13352c] text-[#6ee7b7]' : 'bg-[#ECFDF5] text-[#047857]'}`}>
                                                                    <Video className="w-3 h-3" weight="fill" /> Có link
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {dayEvents.length === 0 && !isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-3">
                                        <CalendarBlank className="w-16 h-16 text-gray-300 mx-auto" />
                                        <p className="font-extrabold text-gray-400">Không có buổi học nào</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════ */}
                {/* MONTH VIEW                                      */}
                {/* ═══════════════════════════════════════════════ */}
                {viewMode === 'month' && (
                    <div className={`flex-1 rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                        <div className={`grid grid-cols-7 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                            {DAY_NAMES.map(name => (
                                <div key={name} className={`py-3 text-center text-xs font-extrabold text-gray-400 uppercase tracking-widest border-r-2 last:border-r-0 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/20'}`}>
                                    {name}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7">
                            {monthDays.map((day, i) => {
                                const dayEvs = events.filter(e => e.dateKey === day.dateKey);

                                return (
                                    <div
                                        key={i}
                                        className={`min-h-[90px] p-2 border-r-2 border-b-2 last:border-r-0 transition-colors cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-[#1A1A1A]/10 hover:bg-[#FF6B4A]/5'} ${day.isToday ? 'bg-[#FF6B4A]/10' : ''
                                            } ${!day.isCurrentMonth ? 'opacity-30' : ''}`}
                                        onClick={() => {
                                            if (day.isCurrentMonth) {
                                                const nd = new Date(day.year, day.month, day.date);
                                                setCurrentDate(nd);
                                                setViewMode('day');
                                            }
                                        }}
                                    >
                                        <div className={`text-sm font-extrabold mb-1 ${day.isToday ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]'}`}>
                                            {day.isToday ? (
                                                <span className="inline-flex w-7 h-7 rounded-full bg-[#FF6B4A] text-white items-center justify-center">
                                                    {day.date}
                                                </span>
                                            ) : (
                                                day.date
                                            )}
                                        </div>
                                        {dayEvs.length > 0 && (
                                            <div className="space-y-1">
                                                {dayEvs.slice(0, 2).map(ev => {
                                                    const evStatus = getEventStatus(ev, now);
                                                    const evStyleM = getStatusStyles(isDark)[evStatus];
                                                    return (
                                                        <div
                                                            key={ev.id}
                                                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg truncate border cursor-pointer hover:brightness-95 transition-colors flex items-center gap-1"
                                                            style={{ backgroundColor: evStyleM.bg, borderColor: evStyleM.border, color: evStyleM.text }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEvent(ev);
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.stopPropagation();
                                                                showTooltip(ev, e);
                                                            }}
                                                            onMouseLeave={() => hideTooltip()}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: evStyleM.dot }} />
                                                            {ev.title}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvs.length > 2 && (
                                                    <div className="text-[9px] font-bold text-gray-400 pl-1">
                                                        +{dayEvs.length - 2} thêm
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ Detail Panel ═══ */}
                {selectedEvent && !isAttendanceOpen && (
                    <EventDetailPanel
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onUpdateMeetLink={handleUpdateMeetLink}
                        onOpenAttendance={() => setIsAttendanceOpen(true)}
                        now={now}
                        isDark={isDark}
                    />
                )}
            </div>

            <AttendanceModal
                isOpen={isAttendanceOpen}
                onClose={() => setIsAttendanceOpen(false)}
                event={selectedEvent}
                isAdmin={false}
            />

            {/* ═══ Tooltip ═══ */}
            {tooltipData && (
                <EventTooltip event={tooltipData.event} x={tooltipData.x} y={tooltipData.y} now={now} isDark={isDark} />
            )}

            {/* ═══ Legend ═══ */}
            <div className="flex flex-wrap gap-4 items-center">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Chú thích trạng thái:</span>
                {Object.entries(getStatusStyles(isDark)).map(([, s]) => (
                    <div key={s.label} className="flex items-center gap-2 px-2.5 py-1 rounded-lg border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.dot }} />
                        <span className="text-xs font-bold" style={{ color: s.text }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* ═══ Keyframes ═══ */}
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes tooltipIn {
                    from { opacity: 0; transform: translateY(4px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
