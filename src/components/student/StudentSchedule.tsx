import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    CalendarBlank, Clock, BookOpen, ChalkboardTeacher, CaretLeft, CaretRight,
    Video, Rows, SquaresFour, WarningCircle, MapPin, X, Target, CalendarDots,
    CheckCircle, XCircle, Bell, PaperPlaneRight, FileText, Users, Student, ClipboardText
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useSettings } from '../../context/SettingsContext';
import { StudentClassmate, StudentScheduleItem, StudentWeeklyStats, timetableService } from '../../services/timetableService';
import { weeklyProgressService, WeeklyProgressData } from '../../services/weeklyProgressService';
import { NotificationDropdown } from './NotificationDropdown';
import { notificationService } from '../../services/notificationService';
import { upcomingTaskService, UpcomingTask } from '../../services/upcomingTaskService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_NAMES_FULL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const HOURS_START = 7;
const HOURS_END = 18;
const HOURS = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => i + HOURS_START);

type ViewMode = 'week' | 'day' | 'month';
type EventStatus = 'past' | 'upcoming' | 'ongoing';

interface NotificationItem {
    title: string;
    desc: string;
    time: string;
    read: boolean;
    level: 'urgent' | 'info';
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

interface ScheduleEntry {
    timetableID: number;
    id: string;
    dateKey: string;
    dayOfWeek: number;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
    subject: string;
    teacher: string;
    initials: string;
    bg: string;
    meet?: string;
    topic?: string;
    className?: string;
    room?: string;
    hasHomework?: boolean;
    homeworkCount?: number;
    attendanceStatus?: 'present' | 'absent' | 'none';
    materials?: { name: string; url: string; type: 'pdf' | 'slide' }[];
    studentsCount?: number;
    classmates?: StudentClassmate[];
}

const STATS_META = [
    { key: 'totalClassesThisWeek', label: 'Tiết học tuần này', icon: BookOpen, bg: '#FCE38A' },
    { key: 'totalHoursStudied', label: 'Giờ học', icon: Clock, bg: '#B8B5FF' },
    { key: 'totalSubjects', label: 'Môn học', icon: ChalkboardTeacher, bg: '#95E1D3' },
    { key: 'totalExams', label: 'Bài kiểm tra', icon: CalendarBlank, bg: '#FFB5B5' },
] as const;

// Upcoming task colors by type
const UPCOMING_BG: Record<string, string> = {
    TEST: '#FFB5B5',
    ASSIGNMENT: '#FCE38A',
};

/** Return a human-readable countdown string and urgency flag. */
function formatCountdown(targetDate: Date, now: Date): { text: string; isUrgent: boolean } {
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return { text: 'Đã hết hạn', isUrgent: true };

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMinutes < 60) {
        return { text: `Mở sau ${diffMinutes} phút`, isUrgent: true };
    }
    if (diffHours < 24) {
        return { text: `Mở sau ${diffHours} giờ`, isUrgent: true };
    }
    return { text: '', isUrgent: false };
}

function formatDurationShort(diffMs: number): string {
    const safeMs = Math.max(0, diffMs);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildUpcomingTaskUiState(task: UpcomingTask, now: Date): {
    countdownText: string;
    isUrgent: boolean;
    buttonDisabled: boolean;
    buttonLabel: string;
} {
    if (task.type !== 'TEST') {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        if (!deadline) {
            return {
                countdownText: '',
                isUrgent: false,
                buttonDisabled: false,
                buttonLabel: 'Làm bài ngay',
            };
        }

        const countdown = formatCountdown(deadline, now);
        return {
            countdownText: countdown.text,
            isUrgent: countdown.isUrgent,
            buttonDisabled: false,
            buttonLabel: 'Làm bài ngay',
        };
    }

    const startTime = task.startTime ? new Date(task.startTime) : null;
    const endTime = task.deadline ? new Date(task.deadline) : null;

    if (startTime && now.getTime() < startTime.getTime()) {
        const countdown = formatCountdown(startTime, now);
        return {
            countdownText: countdown.text,
            isUrgent: countdown.isUrgent,
            buttonDisabled: true,
            buttonLabel: 'Chưa mở',
        };
    }

    if (endTime && now.getTime() >= endTime.getTime()) {
        return {
            countdownText: 'Đã kết thúc',
            isUrgent: true,
            buttonDisabled: true,
            buttonLabel: 'Đã đóng',
        };
    }

    if (endTime) {
        const remainingMs = endTime.getTime() - now.getTime();
        const isNearEnd = remainingMs > 0 && remainingMs < 15 * 60 * 1000;
        return {
            countdownText: isNearEnd ? `Sắp kết thúc < ${formatDurationShort(remainingMs)}` : 'Đang mở',
            isUrgent: isNearEnd,
            buttonDisabled: false,
            buttonLabel: 'Đã mở',
        };
    }

    return {
        countdownText: 'Đang mở',
        isUrgent: false,
        buttonDisabled: false,
        buttonLabel: 'Đã mở',
    };
}

const EVENT_STATUS_STYLES: Record<EventStatus, { bg: string; border: string; dot: string; text: string }> = {
    past: { bg: '#F3F4F6', border: '#D1D5DB', dot: 'bg-gray-400', text: 'text-gray-500' },
    upcoming: { bg: '#E7EEFF', border: '#A8B8FF', dot: 'bg-indigo-400', text: 'text-indigo-600' },
    ongoing: { bg: '#DCFCE7', border: '#22C55E', dot: 'bg-emerald-500', text: 'text-emerald-600' },
};

function getEventStatusInfo(startHour: number, startMin: number, endHour: number, endMin: number, dateKey: string, now: Date) {
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    
    let isJoinable = false;
    let status: EventStatus = 'ongoing';

    if (dateKey < todayStr) status = 'past';
    else if (dateKey > todayStr) status = 'upcoming';
    else {
        if (currentMins < startMins) status = 'upcoming';
        else if (currentMins > endMins) status = 'past';
        else status = 'ongoing';
    }

    if (dateKey === todayStr) {
        if (status === 'ongoing' || (status === 'upcoming' && (startMins - currentMins <= 10 && startMins - currentMins >= 0))) {
            isJoinable = true;
        }
    }

    return { status, isJoinable };
}

function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function mapAttendanceStatus(status: StudentScheduleItem['attendanceStatus']): ScheduleEntry['attendanceStatus'] {
    if (status === 'PRESENT') return 'present';
    if (status === 'ABSENT') return 'absent';
    return 'none';
}

function formatStudentId(studentID: number): string {
    return `HS-${String(studentID).padStart(4, '0')}`;
}

function normalizeAvatarUrl(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || !rawUrl.trim()) return null;

    const trimmed = rawUrl.trim();

    // Absolute URL from backend (S3/public domain).
    if (/^https?:\/\//i.test(trimmed)) {
        return encodeURI(trimmed);
    }

    // Relative path/object key -> resolve against API host.
    try {
        const baseOrigin = new URL(API_BASE_URL).origin;
        const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        return `${baseOrigin}${encodeURI(normalizedPath)}`;
    } catch {
        return encodeURI(trimmed);
    }
}

function getScheduleColor(index: number): string {
    const palette = ['#FCE38A', '#B8B5FF', '#95E1D3', '#FFB5B5', '#FFD9A0', '#C8F7C5'];
    return palette[index % palette.length];
}

function mapStudentScheduleToEntry(item: StudentScheduleItem, index: number): ScheduleEntry {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);

    return {
        timetableID: item.timetableID,
        id: `evt-${item.timetableID}-${item.startTime}`,
        dateKey: toDateKey(start),
        dayOfWeek: (start.getDay() + 6) % 7,
        startHour: start.getHours(),
        startMin: start.getMinutes(),
        endHour: end.getHours(),
        endMin: end.getMinutes(),
        subject: item.subjectName,
        teacher: item.teacherName || 'Chưa cập nhật',
        initials: toInitials(item.teacherName || item.subjectName),
        bg: getScheduleColor(index),
        meet: item.meetUrl || undefined,
        topic: item.topic || undefined,
        className: item.className,
        room: item.room || undefined,
        studentsCount: item.studentCount,
        attendanceStatus: mapAttendanceStatus(item.attendanceStatus),
        classmates: item.classmates ?? [],
    };
}

function EventTooltip({ event, x, y, now }: { event: ScheduleEntry; x: number; y: number; now: Date }) {
    const { status } = getEventStatusInfo(event.startHour, event.startMin, event.endHour, event.endMin, event.dateKey, now);
    const style = EVENT_STATUS_STYLES[status];

    return (
        <div
            className="fixed z-[100] pointer-events-none animate-[tooltipIn_0.15s_ease-out]"
            style={{ left: x + 14, top: y - 12 }}
        >
            <div className="bg-[#1A1A1A] text-white rounded-xl px-4 py-3 text-xs shadow-2xl max-w-[280px] border border-[#1A1A1A]/20">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot} ${status === 'ongoing' ? 'animate-pulse' : ''}`} />
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${style.text}`}>
                        {status === 'ongoing' ? 'Đang diễn ra' : status === 'past' ? 'Đã kết thúc' : 'Sắp diễn ra'}
                    </span>
                </div>
                <div className="font-extrabold text-sm mb-1.5">{event.subject}</div>
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
                        <span>{pad(event.startHour)}:{pad(event.startMin)} - {pad(event.endHour)}:{pad(event.endMin)}</span>
                    </div>
                    {event.meet ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <Video className="w-3 h-3 shrink-0" />
                            <span>Có link Meet</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-yellow-400">
                            <WarningCircle className="w-3 h-3 shrink-0" />
                            <span>Chưa có link Meet</span>
                        </div>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-[#1A1A1A]/20 text-[10px] text-white/40 font-bold">
                    Nhấp để xem chi tiết
                </div>
            </div>
        </div>
    );
}

function EventDetailDialog({ event, onClose, onViewHomework }: { event: ScheduleEntry | null; onClose: () => void; onViewHomework: (event: ScheduleEntry) => void }) {
    if (!event) return null;

    return (
        <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="rounded-3xl max-w-lg border-2 border-[#1A1A1A]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm border-2 border-[#1A1A1A]/20" style={{ backgroundColor: event.bg }}>
                            {event.initials}
                        </span>
                        <div>
                            <DialogTitle className="text-xl font-extrabold text-[#1A1A1A]">
                                {event.subject}
                            </DialogTitle>
                            <DialogDescription className="font-bold">
                                Lớp {event.className || '—'} · {event.teacher}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4 space-y-3 text-sm font-semibold text-[#1A1A1A]">
                        <div className="flex items-center justify-between gap-2 border-b-2 border-[#1A1A1A]/5 pb-2">
                            <span className="text-[#1A1A1A]/60 font-extrabold uppercase tracking-widest text-[10px]">Thời gian</span>
                            <span className="font-extrabold text-[#1A1A1A] flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-[#FF6B4A]" weight="bold" />
                                {pad(event.startHour)}:{pad(event.startMin)} - {pad(event.endHour)}:{pad(event.endMin)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-b-2 border-[#1A1A1A]/5 pb-2">
                            <span className="text-[#1A1A1A]/60 font-extrabold uppercase tracking-widest text-[10px]">Phòng học</span>
                            <span className="font-extrabold text-[#1A1A1A] flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-[#95E1D3]" weight="bold" />
                                {event.room || 'Online'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-b-2 border-[#1A1A1A]/5 pb-2">
                            <span className="text-[#1A1A1A]/60 font-extrabold uppercase tracking-widest text-[10px]">Danh sách bạn học</span>
                            <span onClick={() => {onClose(); window.dispatchEvent(new CustomEvent('openClassmates', { detail: event }))}} className="font-extrabold text-[#1A1A1A] flex items-center gap-1.5 cursor-pointer hover:underline">
                                <Users className="w-4 h-4 text-[#3B82F6]" weight="bold" />
                                {event.studentsCount || 0} học sinh
                            </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-[#1A1A1A]/60 font-extrabold uppercase tracking-widest text-[10px] whitespace-nowrap pt-1">Chủ đề</span>
                            <span className="font-bold text-[#1A1A1A] text-right">{event.topic || 'Chưa cập nhật'}</span>
                        </div>
                    </div>

                    {event.materials && event.materials.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/60 mb-1">Tài liệu bài giảng</div>
                            <div className="grid grid-cols-1 gap-2">
                                {event.materials.map((m, i) => (
                                    <a key={i} href={m.url} className="flex items-center gap-3 p-3 bg-white border-2 border-[#1A1A1A]/10 rounded-xl hover:border-[#FF6B4A] transition-colors cursor-pointer group">
                                        <div className="w-8 h-8 rounded-lg bg-[#F7F7F2] flex items-center justify-center group-hover:bg-[#FF6B4A]/10 transition-colors">
                                            <FileText className="w-4 h-4 text-[#FF6B4A]" weight="fill" />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-sm text-[#1A1A1A]">{m.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 capitalize">{m.type}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {event.meet && (
                            <a
                                href={event.meet}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#2563EB]/20 bg-[#EEF4FF] px-3 py-3.5 text-[#2563EB] hover:bg-[#E2ECFF] text-sm font-extrabold transition-colors active:scale-95"
                            >
                                <Video className="w-5 h-5" weight="fill" />
                                Tham gia Meet
                            </a>
                        )}
                        {event.hasHomework && (
                            <button
                                onClick={() => onViewHomework(event)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#D97706]/20 bg-[#FEF3C7] px-3 py-3.5 text-[#D97706] hover:bg-[#FDE68A] text-sm font-extrabold transition-colors active:scale-95"
                            >
                                <WarningCircle className="w-5 h-5" weight="fill" />
                                Xem bài tập ({event.homeworkCount || 1})
                            </button>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-extrabold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                        <X className="w-4 h-4" weight="bold" /> Đóng
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function StudentSchedule() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const location = useLocation();
    const today = new Date();
    const [now, setNow] = useState(new Date());
    const [currentDate, setCurrentDate] = useState(today);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEntry | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [upcomingTab, setUpcomingTab] = useState<'all' | 'test' | 'hw'>('all');
    const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
    const [tooltipData, setTooltipData] = useState<{ event: ScheduleEntry; x: number; y: number } | null>(null);
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();

    const [weeklyStats, setWeeklyStats] = useState<StudentWeeklyStats>({
        totalClassesThisWeek: 0,
        totalHoursStudied: 0,
        totalSubjects: 0,
        totalExams: 0,
    });
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEntry[]>([]);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [brokenAvatarIds, setBrokenAvatarIds] = useState<Set<number>>(new Set());

    const [showClassmates, setShowClassmates] = useState<ScheduleEntry | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const focusedNotificationRef = useRef<string | null>(null);

    // ── Weekly Progress state ──────────────────────────────────────────────
    const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData | null>(null);

    // ── Upcoming tasks from API ───────────────────────────────────────────
    const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

    // ── Real notification unread count ─────────────────────────────────────
    const [realUnreadCount, setRealUnreadCount] = useState(0);

    useEffect(() => {
        const handleOpenClassmates = (e: any) => setShowClassmates(e.detail);
        window.addEventListener('openClassmates', handleOpenClassmates);
        return () => window.removeEventListener('openClassmates', handleOpenClassmates);
    }, []);

    useEffect(() => {
        // Reset avatar fail cache each time modal data changes.
        setBrokenAvatarIds(new Set());
    }, [showClassmates?.id]);

    useEffect(() => {
        if (!isNotificationsOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!notificationsRef.current?.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationsOpen]);

    // ── Fetch weekly progress ─────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        weeklyProgressService.getMyWeeklyProgress()
            .then(data => { if (!cancelled) setWeeklyProgress(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // ── Fetch upcoming tasks (re-fetch every 3 minutes) ────────────────────
    useEffect(() => {
        let cancelled = false;

        const fetchUpcoming = () => {
            upcomingTaskService.getUpcomingTasks()
                .then(data => { if (!cancelled) setUpcomingTasks(data); })
                .catch(() => {});
        };

        fetchUpcoming(); // initial fetch
        const interval = setInterval(fetchUpcoming, 3 * 60 * 1000); // every 3 min

        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    // ── Fetch real notification count ─────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        notificationService.getMyNotifications('ALL')
            .then(items => {
                if (!cancelled) setRealUnreadCount(items.filter(n => !n.isRead).length);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isNotificationsOpen]); // refresh count when dropdown closes

    const showTooltip = (ev: ScheduleEntry, e: React.MouseEvent) => {
        clearTimeout(tooltipTimeout.current);
        setTooltipData({ event: ev, x: e.clientX, y: e.clientY });
    };

    const hideTooltip = () => {
        tooltipTimeout.current = setTimeout(() => setTooltipData(null), 200);
    };

    const unreadNotificationsCount = realUnreadCount;

    const monday = useMemo(() => getMonday(currentDate), [currentDate]);

    const weekRange = useMemo(() => {
        const start = new Date(monday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(monday);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 0);

        return { start, end };
    }, [monday]);

    const scheduleRange = useMemo(() => {
        if (viewMode === 'month') {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
            return { start, end };
        }

        if (viewMode === 'day') {
            const start = new Date(currentDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(currentDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        return weekRange;
    }, [viewMode, currentDate, weekRange]);

    const statsCards = useMemo(() => {
        return STATS_META.map((item) => {
            let value = '0';

            if (item.key === 'totalClassesThisWeek') value = String(weeklyStats.totalClassesThisWeek);
            if (item.key === 'totalHoursStudied') value = `${weeklyStats.totalHoursStudied}h`;
            if (item.key === 'totalSubjects') value = String(weeklyStats.totalSubjects);
            if (item.key === 'totalExams') value = String(weeklyStats.totalExams);

            return { ...item, value };
        });
    }, [weeklyStats]);

    useEffect(() => {
        let isMounted = true;

        const fetchScheduleData = async () => {
            try {
                setScheduleError(null);

                const scheduleResult = await timetableService.getStudentSchedule(scheduleRange.start, scheduleRange.end);

                if (!isMounted) return;

                setScheduleEvents(scheduleResult.map((item, index) => mapStudentScheduleToEntry(item, index)));
            } catch (error) {
                if (!isMounted) return;
                const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu lịch học.';
                setScheduleError(message);
                setScheduleEvents([]);
            }
        };

        void fetchScheduleData();

        return () => {
            isMounted = false;
        };
    }, [scheduleRange.start.getTime(), scheduleRange.end.getTime()]);

    useEffect(() => {
        let isMounted = true;

        const fetchWeeklyStats = async () => {
            try {
                const statsResult = await timetableService.getStudentScheduleStats(weekRange.start, weekRange.end);

                if (!isMounted) return;
                setWeeklyStats(statsResult);
            } catch {
                if (!isMounted) return;
            }
        };

        void fetchWeeklyStats();

        return () => {
            isMounted = false;
        };
    }, [weekRange.start.getTime(), weekRange.end.getTime()]);

    // Keep "now" fresh
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);


    const upcomingEvents = useMemo(() => {
        return upcomingTasks.map(task => {
            const startDate = task.startTime ? new Date(task.startTime) : null;
            const deadlineDate = task.deadline ? new Date(task.deadline) : null;
            const uiState = buildUpcomingTaskUiState(task, now);
            const fullDate = task.type === 'TEST'
                ? (startDate ?? deadlineDate ?? new Date())
                : (deadlineDate ?? new Date());
            const tabType = task.type === 'TEST' ? 'test' : 'hw';
            const bg = UPCOMING_BG[task.type] || '#B8B5FF';
            const targetUrl = task.type === 'TEST'
                ? '/student/exercises?tab=available&category=exam'
                : '/student/exercises?tab=available&category=homework';

            return {
                id: task.id,
                subject: task.title,
                type: tabType,
                bg,
                color: '#1A1A1A',
                fullDate,
                time: `${pad(fullDate.getHours())}:${pad(fullDate.getMinutes())}`,
                displayDate: isSameDay(fullDate, now)
                    ? 'Hôm nay'
                    : isSameDay(new Date(now.getTime() + 86400000), fullDate)
                        ? 'Ngày mai'
                        : `${DAYS[(fullDate.getDay() + 6) % 7]}, ${pad(fullDate.getDate())}/${pad(fullDate.getMonth() + 1)}`,
                isUrgent: uiState.isUrgent,
                countdownText: uiState.countdownText,
                buttonDisabled: uiState.buttonDisabled,
                buttonLabel: uiState.buttonLabel,
                progress: task.progress ?? undefined,
                actionUrl: targetUrl,
            };
        }).filter(u => upcomingTab === 'all' || u.type === upcomingTab);
    }, [upcomingTasks, now, upcomingTab]);

    const filteredUpcoming = useMemo(() => {
        return [...upcomingEvents].sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    }, [upcomingEvents]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            return {
                name: DAYS[i],
                date: d.getDate(),
                isToday: isSameDay(d, today),
                fullDate: new Date(d),
                dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            };
        });
    }, [monday.toISOString()]);

    const dayCols = useMemo(() => {
        if (viewMode === 'day') {
            return [{
                name: DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7],
                date: currentDate.getDate(),
                isToday: isSameDay(currentDate, today),
                fullDate: new Date(currentDate),
                dateKey: `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`,
            }];
        }
        return weekDays;
    }, [viewMode, currentDate, weekDays]);

    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({
                date: d.getDate(),
                isCurrentMonth: false,
                isToday: isSameDay(d, today),
                fullDate: d,
                dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const d = new Date(year, month, i);
            days.push({
                date: i,
                isCurrentMonth: true,
                isToday: isSameDay(d, today),
                fullDate: d,
                dateKey: `${year}-${pad(month + 1)}-${pad(i)}`
            });
        }
        const remainingCells = 42 - days.length;
        for(let i=1; i<=remainingCells; i++) {
            const d = new Date(year, month + 1, i);
            days.push({
                date: i,
                isCurrentMonth: false,
                isToday: isSameDay(d, today),
                fullDate: d,
                dateKey: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            });
        }
        return days;
    }, [currentDate, today]);

    const allEvents = useMemo(() => scheduleEvents, [scheduleEvents]);


    const displayEvents = viewMode === 'day'
        ? allEvents.filter(e => e.dateKey === dayCols[0].dateKey)
        : viewMode === 'week' 
            ? allEvents.filter(e => weekDays.some(wd => wd.dateKey === e.dateKey))
            : allEvents;


    const goToday = () => setCurrentDate(new Date());
    const goPrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() - 7);
        else if (viewMode === 'day') d.setDate(d.getDate() - 1);
        else d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
    };
    const goNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'week') d.setDate(d.getDate() + 7);
        else if (viewMode === 'day') d.setDate(d.getDate() + 1);
        else d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
    };

    const handleViewHomework = (event: ScheduleEntry) => {
        if (!event.hasHomework) return;

        const params = new URLSearchParams({
            source: 'schedule',
            tab: 'available',
            category: 'homework',
            subject: event.subject,
            className: event.className ?? '',
            lessonKey: `${event.subject}|${event.className ?? ''}|${pad(event.startHour)}:${pad(event.startMin)}`,
            date: event.dateKey,
            time: `${pad(event.startHour)}:${pad(event.startMin)} - ${pad(event.endHour)}:${pad(event.endMin)}`,
        });

        setSelectedEvent(null);
        navigate(`/student/exercises?${params.toString()}`);
    };

    return (
        <div className="p-8 pb-20 space-y-6 min-h-screen" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400'}`}>Lịch trình cá nhân</p>
                        <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-[#1A1A1A]'}'}`}>Lịch học của tôi</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Real notification dropdown */}
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={() => setIsNotificationsOpen(prev => !prev)}
                            className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isDark ? 'bg-[#1a1a1f] border-none hover:bg-white/5' : 'bg-white border-2 border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5'}`}
                        >
                            <Bell className={`w-5 h-5 ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`} weight={isNotificationsOpen ? 'fill' : 'regular'} />
                            {unreadNotificationsCount > 0 && (
                                <span className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center ${isDark ? 'border border-[#111]' : 'border-2 border-white'}`}>
                                    {unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        <NotificationDropdown open={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} compact />
                    </div>
                    <div className={`flex rounded-2xl p-1 ${isDark ? 'bg-[#18181b] border-none' : 'bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/10'}`}>
                        <button
                            onClick={() => { setViewMode('day'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'day' ? (isDark ? 'bg-white text-[#1A1A1A] shadow-sm' : 'bg-white text-[#1A1A1A] shadow-sm') : (isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70')}`}
                        >
                            <Rows className="w-4 h-4" weight={viewMode === 'day' ? 'fill' : 'regular'} /> Ngày
                        </button>
                        <button
                            onClick={() => { setViewMode('week'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'week' ? (isDark ? 'bg-white text-[#1A1A1A] shadow-sm' : 'bg-white text-[#1A1A1A] shadow-sm') : (isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70')}`}
                        >
                            <SquaresFour className="w-4 h-4" weight={viewMode === 'week' ? 'fill' : 'regular'} /> Tuần
                        </button>
                        <button
                            onClick={() => { setViewMode('month'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'month' ? (isDark ? 'bg-white text-[#1A1A1A] shadow-sm' : 'bg-white text-[#1A1A1A] shadow-sm') : (isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70')}`}
                        >
                            <CalendarDots className="w-4 h-4" weight={viewMode === 'month' ? 'fill' : 'regular'} /> Tháng
                        </button>
                    </div>

                    <div className={`flex items-center rounded-2xl p-1 gap-1 ${isDark ? 'bg-[#1a1a1f] border-none' : 'bg-white border-2 border-[#1A1A1A]/20'}`}>
                        <button onClick={goPrev} className={`p-2 rounded-xl transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#1A1A1A]/5'}`}>
                            <CaretLeft className="w-4 h-4 text-[#1A1A1A]" />
                        </button>
                        <span className={`px-3 font-extrabold text-sm whitespace-nowrap ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                            {viewMode === 'week'
                                ? `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(weekDays[6].date)}/${pad(weekDays[6].fullDate.getMonth() + 1)}`
                                : viewMode === 'day' 
                                    ? `${DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7]}, ${pad(currentDate.getDate())}/${pad(currentDate.getMonth() + 1)}`
                                    : `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`
                            }
                        </span>
                        <button onClick={goNext} className={`p-2 rounded-xl transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#1A1A1A]/5'}`}>
                            <CaretRight className="w-4 h-4 text-[#1A1A1A]" />
                        </button>
                    </div>

                    <button onClick={goToday} className="px-5 h-10 bg-[#ff7849] hover:bg-[#ff8b63] text-white font-extrabold text-sm rounded-2xl active:scale-95 transition-all shadow-sm">
                        Hôm nay
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {statsCards.map((s, i) => (
                    <div key={i} className={`rounded-3xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all shadow-sm ${isDark ? 'border border-[#1A1A1A]/20' : 'border-2 border-[#1A1A1A]'}`} style={{ backgroundColor: isDark ? `${s.bg}66` : s.bg }}>
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#1b1b20]' : 'bg-[#1A1A1A]'}`}>
                            <s.icon className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <p className={`text-2xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{s.value}</p>
                            <p className={`text-sm font-extrabold ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/70'}`}>{s.label}</p>
                        </div>
                    </div>
                ))}
                
                {/* Weekly Progress – live API data */}
                <div className={`rounded-3xl p-5 flex flex-col justify-between hover:-translate-y-0.5 transition-all shadow-sm ${isDark ? 'border border-[#1A1A1A]/20 bg-[#232328]' : 'border-2 border-[#1A1A1A] bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-extrabold uppercase tracking-widest ${isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400'}`}>Tiến độ tuần</span>
                        <span className={`text-sm font-extrabold ${weeklyProgress && weeklyProgress.progressPercent >= 80 ? 'text-emerald-500' : weeklyProgress && weeklyProgress.progressPercent >= 50 ? 'text-amber-500' : 'text-[#FF6B4A]'}`}>
                            {weeklyProgress?.progressPercent ?? 0}%
                        </span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                weeklyProgress && weeklyProgress.progressPercent >= 80 ? 'bg-emerald-500'
                                : weeklyProgress && weeklyProgress.progressPercent >= 50 ? 'bg-amber-500'
                                : 'bg-[#ff7849]'
                            }`}
                            style={{ width: `${weeklyProgress?.progressPercent ?? 0}%` }}
                        />
                    </div>
                    {weeklyProgress?.breakdown && (
                        <div className="flex items-center gap-2 mt-1.5 flex-nowrap overflow-x-auto">
                            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                <BookOpen className="inline-block w-3 h-3 mr-1" weight="fill" />
                                BT: {weeklyProgress.breakdown.assignmentDone}/{weeklyProgress.breakdown.assignmentTotal}
                            </span>
                            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                                <ClipboardText className="inline-block w-3 h-3 mr-1" weight="fill" />
                                KT: {weeklyProgress.breakdown.testDone}/{weeklyProgress.breakdown.testTotal}
                            </span>
                            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                <CheckCircle className="inline-block w-3 h-3 mr-1" weight="fill" />
                                ĐD: {weeklyProgress.breakdown.attendanceDone}/{weeklyProgress.breakdown.attendanceTotal}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance Legend */}
            <div className={`flex items-center gap-6 text-sm font-extrabold pb-1 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/70'}`}>
                <span className={`uppercase tracking-widest font-extrabold text-xs ${isDark ? 'text-white' : ''}`}>Trạng thái điểm danh:</span>
                <div className="flex items-center gap-2"><CheckCircle className="text-emerald-500 w-5 h-5" weight="fill" /> Có mặt</div>
                <div className="flex items-center gap-2"><XCircle className="text-red-500 w-5 h-5" weight="fill" /> Vắng mặt</div>
            </div>

            {scheduleError && (
                <div className={`text-sm font-bold ${isDark ? 'text-[#fca5a5]' : 'text-red-500'}`}>
                    {scheduleError}
                </div>
            )}

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="flex-1 overflow-hidden min-w-0">
                    
                    {viewMode === 'month' ? (
                        <div className={`rounded-[2rem] overflow-hidden shadow-sm ${isDark ? 'bg-[#18181b] border-none' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                            <div className={`grid grid-cols-7 ${isDark ? 'bg-[#1c1c1e] border-b border-[#1A1A1A]/20' : 'bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/10'}`}>
                                {DAYS.map(d => <div key={d} className={`py-3 text-center text-xs font-extrabold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7">
                                {monthDays.map((day, i) => {
                                    const dayEvents = displayEvents.filter(e => e.dateKey === day.dateKey).sort((a,b) => (a.startHour*60+a.startMin) - (b.startHour*60+b.startMin));
                                    
                                    return (
                                        <div key={i} className={`min-h-[140px] p-2 flex flex-col ${isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-[#1A1A1A]/5'} ${i % 7 !== 6 ? 'border-r' : ''} ${i < 35 ? 'border-b' : ''} ${!day.isCurrentMonth ? (isDark ? 'bg-[#16161a]' : 'bg-[#1A1A1A]/[0.02]') : (isDark ? 'bg-[#18181b]' : 'bg-white')} ${day.isToday ? (isDark ? 'bg-[#ff7849]/10' : 'bg-[#FF6B4A]/[0.02]') : ''}`}>
                                            <div className={`text-xs font-extrabold mb-2 ${day.isToday ? 'text-white bg-[#ff7849] w-6 h-6 rounded-full flex items-center justify-center' : day.isCurrentMonth ? (isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]') : 'text-gray-400'}`}>
                                                {day.date}
                                            </div>
                                            <div className="space-y-1.5 flex-1 max-h-[105px] overflow-y-auto pr-0.5 custom-scrollbar">
                                                {dayEvents.map(ev => {
                                                    const { status } = getEventStatusInfo(ev.startHour, ev.startMin, ev.endHour, ev.endMin, ev.dateKey, now);
                                                    const baseStyle = EVENT_STATUS_STYLES[status];
                                                    const style = isDark
                                                        ? status === 'past'
                                                            ? { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.28)', dot: baseStyle.dot, text: 'text-[#94a3b8]' }
                                                            : status === 'upcoming'
                                                                ? { bg: 'rgba(99,102,241,0.18)', border: 'rgba(129,140,248,0.45)', dot: baseStyle.dot, text: 'text-[#c7d2fe]' }
                                                                : { bg: 'rgba(255,120,73,0.14)', border: 'rgba(255,120,73,0.38)', dot: baseStyle.dot, text: 'text-[#ffb094]' }
                                                        : baseStyle;
                                                    return (
                                                        <div 
                                                            key={ev.id}
                                                            onClick={() => setSelectedEvent(ev)}
                                                            onMouseEnter={(e) => { setHoveredEventId(ev.id); showTooltip(ev, e); }}
                                                            onMouseLeave={() => { setHoveredEventId(null); hideTooltip(); }}
                                                            className={`px-2 py-1.5 rounded-lg truncate text-[11px] font-extrabold cursor-pointer transition-transform hover:scale-[1.02] border flex flex-col ${status === 'ongoing' ? 'animate-border-blink shadow-sm' : status === 'past' ? 'opacity-70' : 'opacity-100'}`}
                                                            style={{ backgroundColor: style.bg, borderColor: style.border }}
                                                        >
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className="truncate">{pad(ev.startHour)}:{pad(ev.startMin)}</span>
                                                                {ev.attendanceStatus === 'present' && <CheckCircle className="text-emerald-600 shrink-0 w-3 h-3" weight="fill" />}
                                                                {ev.attendanceStatus === 'absent' && <XCircle className="text-red-600 shrink-0 w-3 h-3" weight="fill" />}
                                                            </div>
                                                            <span className={`truncate text-[11px] font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{ev.subject}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : ( 
                    <div className={`rounded-[2rem] overflow-hidden shadow-sm ${isDark ? 'bg-[#18181b] border-none' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                    {/* Headers */}
                    <div className={`grid ${viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'} ${isDark ? 'border-b border-[rgba(255,255,255,0.06)]' : 'border-b-2 border-[#1A1A1A]'}`}>
                        <div className={`${isDark ? 'border-r border-[rgba(255,255,255,0.06)] bg-[#16161a]' : 'border-r-2 border-[#1A1A1A]/10 bg-[#1A1A1A]/[0.02]'}`} />
                        {dayCols.map((day, i) => (
                            <div
                                key={i}
                                className={`py-4 text-center last:border-r-0 transition-colors ${isDark ? 'border-r border-[rgba(255,255,255,0.06)]' : 'border-r-2 border-[#1A1A1A]/10'} ${viewMode === 'week' ? (isDark ? 'cursor-pointer hover:bg-white/5' : 'cursor-pointer hover:bg-[#1A1A1A]/5') : ''} ${day.isToday ? (isDark ? 'bg-[#ff7849]/12' : 'bg-[#FF6B4A]/10') : ''}`}
                                onClick={() => { if (viewMode === 'week') { setCurrentDate(day.fullDate); setViewMode('day'); } }}
                            >
                                <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${day.isToday ? 'text-[#ff7849]' : (isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400')}`}>{day.name}</div>
                                <div className={`text-2xl font-extrabold ${day.isToday ? 'text-[#ff7849]' : (isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]')}`}>{day.date}</div>
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className={`relative ${isDark ? 'bg-[#18181b]' : 'bg-[#FDFDFD]'}`}>
                        <div className={`grid ${viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'}`}>
                            {HOURS.map(hour => (
                                <div key={hour} className="contents">
                                    <div className={`h-[80px] flex items-start justify-end pr-2 pt-2 ${isDark ? 'border-r border-b border-[rgba(255,255,255,0.06)] bg-[#16161a]' : 'border-r-2 border-b-2 border-[#1A1A1A]/10 bg-[#1A1A1A]/[0.02]'}`}>
                                        <span className={`text-[10px] font-extrabold ${isDark ? 'text-[#9ca3af]' : 'text-gray-400'}`}>{pad(hour)}:00</span>
                                    </div>
                                    {dayCols.map((day, di) => (
                                        <div
                                            key={di}
                                            className={`h-[80px] last:border-r-0 ${isDark ? 'border-r border-b border-[rgba(255,255,255,0.06)]' : 'border-r-2 border-b-2 border-[#1A1A1A]/5'} ${day.isToday ? (isDark ? 'bg-[#ff7849]/8' : 'bg-[#FF6B4A]/[0.02]') : ''}`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Events overlay */}
                        {displayEvents.map(ev => {
                            const durationMins = (ev.endHour - ev.startHour) * 60 + (ev.endMin - ev.startMin);
                            const topOffset = ((ev.startHour - HOURS_START) * 60 + ev.startMin) * (80 / 60);
                            const heightPx = durationMins * (80 / 60);
                            const isDayCard = viewMode === 'day';
                            const isCompactDayCard = isDayCard && heightPx < 120;
                            const isUltraCompactDayCard = isDayCard && heightPx < 90;

                            const colIdx = dayCols.findIndex(d => d.dateKey === ev.dateKey);
                            if (colIdx < 0) return null;
                            const dayColumnWidth = viewMode === 'week' ? 'calc((100% - 60px) / 7)' : 'calc(100% - 60px)';
                            const leftOffset = viewMode === 'week' ? `calc(60px + ${colIdx} * ${dayColumnWidth})` : '60px';
                            
                            const { status, isJoinable } = getEventStatusInfo(ev.startHour, ev.startMin, ev.endHour, ev.endMin, ev.dateKey, now);
                            const baseStyle = EVENT_STATUS_STYLES[status];
                            const style = isDark
                                ? status === 'past'
                                    ? { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.30)', dot: baseStyle.dot, text: 'text-[#94a3b8]' }
                                    : status === 'upcoming'
                                        ? { bg: 'rgba(79,70,229,0.2)', border: 'rgba(129,140,248,0.45)', dot: baseStyle.dot, text: 'text-[#c7d2fe]' }
                                        : { bg: 'rgba(255,120,73,0.14)', border: 'rgba(255,120,73,0.35)', dot: baseStyle.dot, text: 'text-[#ffb094]' }
                                : baseStyle;

                            return (
                                <div
                                    key={ev.id}
                                    className="absolute p-1.5"
                                    style={{
                                        top: `${topOffset}px`,
                                        left: leftOffset,
                                        width: dayColumnWidth,
                                        height: `${heightPx}px`,
                                        zIndex: hoveredEventId === ev.id ? 20 : 10,
                                    }}
                                >
                                    <div
                                        className={`group relative h-full rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden flex flex-col ${isCompactDayCard ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${isDark ? 'border' : 'border-2'} ${selectedEvent?.id === ev.id ? (isDark ? 'shadow-lg scale-[1.02] ring-2 ring-white/20' : 'shadow-lg scale-[1.02] ring-2 ring-[#1A1A1A]/20') : 'hover:shadow-md hover:-translate-y-0.5'} ${status === 'ongoing' ? 'animate-border-blink shadow-xl scale-[1.01]' : ''}`}
                                        style={{ backgroundColor: style.bg, borderColor: style.border, opacity: status === 'past' ? 0.76 : 1 }}
                                        onClick={() => setSelectedEvent(ev)}
                                        onMouseEnter={(e) => { setHoveredEventId(ev.id); showTooltip(ev, e); }}
                                        onMouseLeave={() => { setHoveredEventId(null); hideTooltip(); }}
                                    >
                                        {status === 'ongoing' && (
                                            <span className={`absolute right-2.5 flex w-2 h-2 ${isCompactDayCard ? 'top-2' : 'top-2.5'}`}>
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                                            </span>
                                        )}

                                        {ev.attendanceStatus === 'present' && (
                                            <div className={`absolute right-2.5 flex ${isCompactDayCard ? 'top-2' : 'top-2.5'}`} title="Đã điểm danh">
                                                <CheckCircle className={`${isCompactDayCard ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-500`} weight="fill" />
                                            </div>
                                        )}
                                        {ev.attendanceStatus === 'absent' && (
                                            <div className={`absolute right-2.5 flex ${isCompactDayCard ? 'top-2' : 'top-2.5'}`} title="Vắng mặt">
                                                <XCircle className={`${isCompactDayCard ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-500`} weight="fill" />
                                            </div>
                                        )}

                                        <div className="min-h-0">
                                            {isDayCard ? (
                                                <>
                                                    <div className={`font-extrabold leading-tight line-clamp-1 pr-6 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'} ${isCompactDayCard ? 'text-[15px]' : 'text-[17px]'}`}>
                                                        {ev.subject} - Lớp {ev.className || '—'}
                                                    </div>

                                                    {!isUltraCompactDayCard && (
                                                        <div className={`font-extrabold mt-0.5 line-clamp-1 ${isDark ? 'text-[#1A1A1A]/65' : 'text-[#1A1A1A]/80'} ${isCompactDayCard ? 'text-[12px]' : 'text-[13px]'}`}>
                                                            GV: {ev.teacher}
                                                        </div>
                                                    )}

                                                    {!isCompactDayCard && ev.topic && (
                                                        <div className={`font-semibold text-[12px] mt-1 line-clamp-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/80'}`}>{ev.topic}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`font-extrabold leading-tight line-clamp-1 pr-6 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'} text-[13px]`}>{ev.subject}</div>
                                                    <div className={`font-extrabold mt-0.5 line-clamp-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/75'} text-[11px]`}>Lớp {ev.className}</div>
                                                    <div className={`font-extrabold mt-1 line-clamp-1 ${isDark ? 'text-[#e5e7eb]' : 'text-[#1A1A1A]'} text-[11px]`}>
                                                        GV: {ev.teacher}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className={`mt-auto flex items-center justify-between gap-2 ${isUltraCompactDayCard ? 'pt-1' : 'pt-2'}`}>
                                            <span className={`font-extrabold line-clamp-1 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/80'} ${isDayCard ? (isCompactDayCard ? 'text-[11px]' : 'text-[12px]') : 'text-[10px]'}`}>
                                                {pad(ev.startHour)}:{pad(ev.startMin)} - {pad(ev.endHour)}:{pad(ev.endMin)}
                                            </span>
                                            <div className="flex items-center gap-1.5 justify-end shrink-0">
                                            {ev.hasHomework && status !== 'ongoing' && !isUltraCompactDayCard && (
                                                <div className={`rounded-lg p-1 ${isDark ? 'bg-white/10 text-[#f4b27a]' : 'bg-white/50 text-[#D97706]'}`} title="Có bài tập">
                                                    <WarningCircle className="w-3.5 h-3.5" weight="bold" />
                                                </div>
                                            )}
                                            {ev.meet && (isDayCard || status !== 'past') ? (
                                                <a href={ev.meet} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={`rounded-lg px-1.5 py-1 flex items-center gap-1 font-extrabold ${isCompactDayCard ? 'text-[10px]' : 'text-[9px]'} ${isJoinable ? (isDark ? 'bg-emerald-500/20 text-emerald-200 animate-pulse' : 'bg-emerald-100 text-emerald-700 animate-pulse') : (isDark ? 'bg-white/10 text-emerald-300' : 'bg-white/60 text-[#047857]')}`} title={isJoinable ? 'Vào học ngay' : 'Có link Meet'}>
                                                    <Video className="w-3 h-3" weight="fill" />
                                                </a>
                                            ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div> 
                    )}

                    {viewMode !== 'month' && (
                        <div className={`flex flex-wrap items-center gap-4 text-xs font-bold pt-4 pb-8 px-2 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>
                            <span className="uppercase tracking-widest font-extrabold text-[10px]">Trạng thái môn học:</span>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border border-gray-300 bg-gray-100"></div> Đã kết thúc</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400 ring-2 ring-emerald-400 animate-pulse border border-emerald-300"></div> Đang diễn ra</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border border-indigo-300" style={{backgroundColor: '#EEF2FF'}}></div> Sắp diễn ra</div>
                            <div className="flex items-center gap-1.5"><WarningCircle className="w-3.5 h-3.5 text-[#D97706]" weight="bold" /> Có bài tập</div>
                            <div className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-[#047857]" weight="fill" /> Có Meet</div>
                        </div>
                    )}
                </div>

                <div className={`shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-full lg:w-80' : 'w-12'}`}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 mb-4 font-extrabold text-sm transition-all ${isDark ? 'bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30' : 'bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30'} ${!sidebarOpen && 'px-0'}`}
                        title={sidebarOpen ? "Thu gọn Sidebar" : "Mở rộng Sidebar"}
                    >
                        {sidebarOpen ? (
                            <>
                                <CaretRight className="w-4 h-4" weight="bold" />
                                <span className="hidden xl:inline">Thu gọn</span>
                            </>
                        ) : (
                            <CaretLeft className="w-4 h-4" weight="bold" />
                        )}
                    </button>

                    {sidebarOpen && (
                        <div className={`rounded-[2rem] p-5 space-y-5 shadow-sm min-h-[500px] ${isDark ? 'bg-[#1a1a1f] border-none' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                            <div>
                                <h2 className={`font-extrabold text-lg ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Sắp tới</h2>
                                <p className={`text-xs font-bold mt-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400'}`}>Nhiệm vụ và sự kiện</p>
                            </div>

                            <div className={`flex p-1 rounded-2xl gap-1 ${isDark ? 'bg-[#18181b] border-none' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/10'}`}>
                                {[{ id: 'all', label: 'Tất cả' }, { id: 'test', label: 'Kiểm tra' }, { id: 'hw', label: 'Bài tập' }].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setUpcomingTab(t.id as 'all' | 'test' | 'hw')}
                                        className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-colors ${upcomingTab === t.id ? (isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300 text-white shadow-sm' : 'bg-[#1A1A1A] text-white shadow-sm') : (isDark ? 'text-[#1A1A1A]/50 hover:bg-white/5' : 'text-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5')}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-4">
                                {filteredUpcoming.length === 0 ? (
                                    <div className="py-8 text-center bg-[#F7F7F2] rounded-2xl border-2 border-dashed border-[#1A1A1A]/10">
                                        <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="font-extrabold text-gray-400 text-sm">Chưa có đầu việc nào</p>
                                    </div>
                                ) : (
                                    filteredUpcoming.map((ev: any, i) => (
                                        <div key={i} className={`group rounded-2xl ${isDark ? '' : 'border-2'} ${ev.isUrgent ? (isDark ? 'border-2 border-[#d48a84] bg-[#2a1f21]' : 'border-red-400 shadow-[0_4px_12px_rgba(248,113,113,0.15)] bg-red-50/20') : (isDark ? 'bg-[#1A1A1A] border-2 border-[#1A1A1A] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'border-[#1A1A1A] bg-white')} p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden`} >
                                            <div className={`absolute top-0 left-0 w-1.5 h-full`} style={{ backgroundColor: ev.isUrgent ? (isDark ? '#d48a84' : '#F87171') : ev.bg }} />
                                            <div className="pl-2">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <p className={`font-extrabold text-sm leading-tight pr-4 ${ev.isUrgent ? (isDark ? 'text-[#f5b1a8]' : 'text-red-600') : (isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]')}`}>{ev.subject}</p>
                                                        {ev.isUrgent && ev.countdownText && (
                                                            <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded animate-pulse ${isDark ? 'text-[#ffd5d0] bg-[#8f4b45]/40' : 'text-red-600 bg-red-100'}`}>
                                                                <WarningCircle className="w-3 h-3" /> {ev.countdownText}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: isDark ? `${ev.bg}2a` : `${ev.bg}20`, color: isDark ? '#e5e7eb' : ev.bg === '#FCE38A' ? '#D97706' : ev.bg === '#FFB5B5' ? '#DC2626' : '#1A1A1A' }}>
                                                        {ev.type === 'test' ? 'Kiểm tra' : ev.type === 'hw' ? 'Nộp bài' : 'Sự kiện'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'text-[#1A1A1A]/50 bg-white/8' : 'text-[#1A1A1A]/60 bg-[#1A1A1A]/5'}`}>
                                                        <CalendarBlank className="w-3 h-3" /> {ev.displayDate}
                                                    </span>
                                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'text-[#1A1A1A]/50 bg-white/8' : 'text-[#1A1A1A]/60 bg-[#1A1A1A]/5'}`}>
                                                        <Clock className="w-3 h-3" /> {ev.time}
                                                    </span>
                                                </div>

                                                {ev.progress !== undefined && (
                                                    <div className="mt-3">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className={`text-[9px] font-extrabold uppercase ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'}`}>Tiến độ</span>
                                                            <span className={`text-[9px] font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{ev.progress}%</span>
                                                        </div>
                                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                                                            <div className={`h-full rounded-full transition-all duration-500 ease-out bg-[#1A1A1A]`} style={{ width: `${ev.progress}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (ev.buttonDisabled) return;
                                                        navigate(ev.actionUrl);
                                                    }}
                                                    disabled={ev.buttonDisabled}
                                                    className={`w-full mt-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors ${ev.buttonDisabled ? 'bg-[#1A1A1A]/20 text-[#1A1A1A]/50 cursor-not-allowed' : 'bg-[#ff7849] hover:bg-[#ff8b63] text-white active:scale-95'}`}
                                                >
                                                    <PaperPlaneRight className="w-3.5 h-3.5" weight="fill" /> {ev.buttonLabel}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className={`pt-4 mt-auto ${isDark ? 'border-t border-[#1A1A1A]/20' : 'border-t-2 border-[#1A1A1A]/10'}`}>
                                <h3 className={`font-extrabold text-sm mb-2 flex items-center gap-1.5 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                    <FileText className="w-4 h-4 text-[#FF6B4A]" weight="fill" /> Ghi chú nhanh
                                </h3>
                                <textarea 
                                    className={`w-full rounded-2xl p-3 text-xs font-bold resize-none focus:outline-none transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#FF6B4A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#FF6B4A]'}`}
                                    rows={3}
                                    placeholder="Nhập ghi chú nhanh cho tuần học..."
                                    defaultValue="Nhớ mang compa cho giờ Toán thứ Tư."
                                ></textarea>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} onViewHomework={handleViewHomework} />
            {tooltipData && <EventTooltip event={tooltipData.event} x={tooltipData.x} y={tooltipData.y} now={now} />}

            {/* Classmates Dialog */}
            <Dialog open={!!showClassmates} onOpenChange={(open) => !open && setShowClassmates(null)}>
                <DialogContent className="rounded-3xl max-w-md border-2 border-[#1A1A1A]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#3B82F6]" weight="fill" />
                            Danh sách Lớp {showClassmates?.className}
                        </DialogTitle>
                        <DialogDescription className="font-bold">
                            Tổng số lượng: {showClassmates?.studentsCount || 0} học sinh
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 py-2">
                        {(showClassmates?.classmates?.length ?? 0) === 0 ? (
                            <div className="text-center py-8 bg-[#F7F7F2] rounded-xl border border-dashed border-[#1A1A1A]/10">
                                <p className="text-sm font-extrabold text-gray-400">Chưa có dữ liệu bạn học</p>
                            </div>
                        ) : (
                            showClassmates?.classmates?.map((classmate) => (
                                <div key={classmate.studentID} className="flex items-center gap-3 p-2 bg-[#F7F7F2] rounded-xl border border-[#1A1A1A]/5">
                                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center font-extrabold text-xs text-[#1A1A1A] overflow-hidden">
                                        {classmate.avatarUrl && !brokenAvatarIds.has(classmate.studentID) ? (
                                            <img
                                                src={normalizeAvatarUrl(classmate.avatarUrl) ?? undefined}
                                                alt={classmate.fullName}
                                                className="w-full h-full object-cover"
                                                onError={() => {
                                                    setBrokenAvatarIds(prev => new Set(prev).add(classmate.studentID));
                                                }}
                                            />
                                        ) : (
                                            <Student className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-extrabold text-[#1A1A1A]">{classmate.fullName}</p>
                                        <p className="text-[10px] font-bold text-gray-400">ID: {formatStudentId(classmate.studentID)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="pt-2">
                        <button onClick={() => setShowClassmates(null)} className="w-full bg-[#1A1A1A] text-white py-3 rounded-2xl font-extrabold text-sm active:scale-95 transition-transform">
                            Đóng danh sách
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
                <DialogContent className={`rounded-2xl max-w-md ${isDark ? 'border border-[#1A1A1A]/20 bg-[#1b1b22]' : 'border-2 border-[#1A1A1A] bg-white'}`}>
                    <DialogHeader>
                        <DialogTitle className={`text-xl font-extrabold flex items-center gap-2 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                            <Bell className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> Chi tiết thông báo
                        </DialogTitle>
                        <DialogDescription className={`font-bold ${isDark ? 'text-[#94a3b8]' : ''}`}>
                            {selectedNotification?.time}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className={`rounded-2xl p-4 ${selectedNotification?.read ? (isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]') : (isDark ? 'border border-red-400/40 bg-red-500/10' : 'border-2 border-red-200 bg-red-50/40')}`}>
                            <p className={`text-lg font-extrabold ${selectedNotification?.read ? (isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]') : 'text-red-500'}`}>
                                {selectedNotification?.title}
                            </p>
                            <p className={`text-sm font-semibold mt-2 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/70'}`}>{selectedNotification?.desc}</p>
                        </div>
                        <button
                            onClick={() => setSelectedNotification(null)}
                            className={`w-full font-extrabold py-3 rounded-2xl transition-colors ${isDark ? 'bg-white/10 hover:bg-white/15 text-white border border-[#1A1A1A]/20' : 'bg-[#1A1A1A] hover:bg-[#333] text-white'}`}
                        >
                            Đóng
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
