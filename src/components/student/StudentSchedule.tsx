import { useMemo, useState, useEffect, useRef } from 'react';
import {
    CalendarBlank, Clock, BookOpen, ChalkboardTeacher, CaretLeft, CaretRight,
    Video, Rows, SquaresFour, WarningCircle, MapPin, X, Target, CalendarDots,
    CheckCircle, XCircle, Bell, PaperPlaneRight, FileText, Users, Student, Eye
} from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_NAMES_FULL = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const HOURS_START = 7;
const HOURS_END = 18;
const HOURS = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => i + HOURS_START);

type ViewMode = 'week' | 'day' | 'month';
type TabType = 'all' | 'test' | 'hw' | 'event';
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
    attendanceStatus?: 'present' | 'absent' | 'none';
    materials?: { name: string; url: string; type: 'pdf' | 'slide' }[];
    studentsCount?: number;
}

const BASE_EVENTS = [
    { dayOfWeek: 0, time: '08:00-09:30', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', meet: 'https://meet.google.com', topic: 'Đại số tổ hợp', className: '11C1', hasHomework: true, attendanceStatus: 'present', materials: [{name: 'BT_Dai_So_11.pdf', url: '#', type: 'pdf'}], studentsCount: 45 },
    { dayOfWeek: 0, time: '13:30-15:00', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', initials: 'EW', bg: '#B8B5FF', topic: 'Grammar and Vocabulary', className: '11C1', room: 'P.302', attendanceStatus: 'absent', studentsCount: 45 },
    { dayOfWeek: 1, time: '08:00-09:30', subject: 'Ngữ văn', teacher: 'Cô Trần Thị Lan', initials: 'TL', bg: '#95E1D3', meet: 'https://meet.google.com', topic: 'Phân tích tác phẩm', className: '11C1', attendanceStatus: 'present', studentsCount: 45 },
    { dayOfWeek: 1, time: '10:00-11:30', subject: 'Vật lý', teacher: 'Thầy Lê Văn Hùng', initials: 'LH', bg: '#FFB5B5', topic: 'Động lực học', className: '11C1', hasHomework: true, room: 'Lab Lý 1', studentsCount: 45 },
    { dayOfWeek: 2, time: '07:30-09:00', subject: 'Hóa học', teacher: 'Cô Phạm Ngọc Bích', initials: 'PB', bg: '#FFD9A0', meet: 'https://meet.google.com', topic: 'Phản ứng hóa học', className: '11C1', materials: [{name: 'Slide_Phan_Ung.pdf', url: '#', type: 'slide'}], studentsCount: 45 },
    { dayOfWeek: 2, time: '14:00-15:30', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', topic: 'Xác suất', className: '11C1', studentsCount: 45 },
    { dayOfWeek: 3, time: '08:00-09:30', subject: 'Lịch sử', teacher: 'Thầy Đặng Minh Tuấn', initials: 'DT', bg: '#C8F7C5', meet: 'https://meet.google.com', topic: 'Chiến tranh thế giới', className: '11C1', hasHomework: true, materials: [{name: 'The_Chien_II.pdf', url: '#', type: 'pdf'}], studentsCount: 45 },
    { dayOfWeek: 4, time: '07:30-09:00', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', initials: 'EW', bg: '#B8B5FF', meet: 'https://meet.google.com', topic: 'Reading Comprehension', className: '11C1', studentsCount: 45 },
    { dayOfWeek: 4, time: '10:00-11:30', subject: 'Sinh học', teacher: 'Cô Hoàng Thu Hà', initials: 'HH', bg: '#95E1D3', topic: 'Di truyền học', className: '11C1', room: 'Lab Sinh', studentsCount: 45 },
];

const UPCOMING = [
    { subject: 'Kiểm tra Toán giữa kỳ', dateOffset: 0, time: '10:00', type: 'test', bg: '#FF6B4A', color: '#fff', isUrgent: true },
    { subject: 'Nộp bài Văn học', dateOffset: 0, time: '17:00', type: 'hw', bg: '#FCE38A', color: '#1A1A1A', progress: 85, isUrgent: true },
    { subject: 'Seminar Vật lý', dateOffset: 2, time: '14:00', type: 'event', bg: '#95E1D3', color: '#1A1A1A' },
    { subject: 'Kiểm tra Hóa học', dateOffset: 4, time: '09:00', type: 'test', bg: '#FFB5B5', color: '#1A1A1A' },
    { subject: 'Nộp bài Tiếng Anh', dateOffset: 5, time: '23:59', type: 'hw', bg: '#B8B5FF', color: '#1A1A1A', progress: 30 },
];

const STATS = [
    { label: 'Tiết học tuần này', value: '9', icon: BookOpen, bg: '#FCE38A' },
    { label: 'Giờ học', value: '13.5h', icon: Clock, bg: '#B8B5FF' },
    { label: 'Môn học', value: '7', icon: ChalkboardTeacher, bg: '#95E1D3' },
    { label: 'Bài kiểm tra', value: '2', icon: CalendarBlank, bg: '#FFB5B5' },
];

const NOTIFICATIONS: NotificationItem[] = [
    { title: 'Bài kiểm tra 15 phút', desc: 'Có bài kiểm tra môn Toán lúc 10:00.', time: '10 phút trước', read: false, level: 'urgent' },
    { title: 'Phản hồi bài tập', desc: 'Cô Lan đã nhận xét bài tập Ngữ văn.', time: '2 giờ trước', read: false, level: 'urgent' },
    { title: 'Thay đổi lịch', desc: 'Môn Vật lý đổi phòng tuần này sang Lab Lý 1.', time: 'Hôm qua', read: true, level: 'info' },
];

const EVENT_STATUS_STYLES: Record<EventStatus, { bg: string; border: string; dot: string; text: string }> = {
    past: { bg: '#F3F4F6', border: '#D1D5DB', dot: 'bg-gray-400', text: 'text-gray-500' },
    upcoming: { bg: '#EEF2FF', border: '#C7D2FE', dot: 'bg-indigo-400', text: 'text-indigo-600' },
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

function EventTooltip({ event, x, y, now }: { event: ScheduleEntry; x: number; y: number; now: Date }) {
    const { status } = getEventStatusInfo(event.startHour, event.startMin, event.endHour, event.endMin, event.dateKey, now);
    const style = EVENT_STATUS_STYLES[status];

    return (
        <div
            className="fixed z-[100] pointer-events-none animate-[tooltipIn_0.15s_ease-out]"
            style={{ left: x + 14, top: y - 12 }}
        >
            <div className="bg-[#1A1A1A] text-white rounded-xl px-4 py-3 text-xs shadow-2xl max-w-[280px] border border-white/10">
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
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/40 font-bold">
                    Nhấp để xem chi tiết
                </div>
            </div>
        </div>
    );
}

function EventDetailDialog({ event, onClose }: { event: ScheduleEntry | null; onClose: () => void; now: Date }) {
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
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#D97706]/20 bg-[#FEF3C7] px-3 py-3.5 text-[#D97706] hover:bg-[#FDE68A] text-sm font-extrabold transition-colors active:scale-95"
                            >
                                <WarningCircle className="w-5 h-5" weight="fill" />
                                Xem bài tập
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
    const today = new Date();
    const [now, setNow] = useState(new Date());
    const [currentDate, setCurrentDate] = useState(today);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEntry | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [upcomingTab, setUpcomingTab] = useState<TabType>('all');
    const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
    const [tooltipData, setTooltipData] = useState<{ event: ScheduleEntry; x: number; y: number } | null>(null);
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
    
    const [showClassmates, setShowClassmates] = useState<ScheduleEntry | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

    useEffect(() => {
        const handleOpenClassmates = (e: any) => setShowClassmates(e.detail);
        window.addEventListener('openClassmates', handleOpenClassmates);
        return () => window.removeEventListener('openClassmates', handleOpenClassmates);
    }, []);

    const showTooltip = (ev: ScheduleEntry, e: React.MouseEvent) => {
        clearTimeout(tooltipTimeout.current);
        setTooltipData({ event: ev, x: e.clientX, y: e.clientY });
    };

    const hideTooltip = () => {
        tooltipTimeout.current = setTimeout(() => setTooltipData(null), 200);
    };

    const unreadNotificationsCount = NOTIFICATIONS.filter(n => !n.read).length;

    const monday = getMonday(currentDate);

    // Keep "now" fresh
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);


    const upcomingEvents = useMemo(() => {
        return UPCOMING.map(u => {
            const d = new Date(now);
            d.setDate(d.getDate() + u.dateOffset);
            return {
                ...u,
                fullDate: d,
                displayDate: isSameDay(d, now) ? 'Hôm nay' : isSameDay(new Date(now.getTime() + 86400000), d) ? 'Ngày mai' : `${DAYS[(d.getDay() + 6) % 7]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
            };
        }).filter(u => upcomingTab === 'all' || u.type === upcomingTab);
    }, [now, upcomingTab]);

    const filteredUpcoming = useMemo(() => {
        return upcomingEvents.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
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

    const allEvents = useMemo(() => {
        const events: ScheduleEntry[] = [];
        monthDays.forEach(day => {
            const dayOfWeek = (day.fullDate.getDay() + 6) % 7;
            BASE_EVENTS.forEach((bev, i) => {
                if(bev.dayOfWeek === dayOfWeek) {
                    const [start, end] = bev.time.split('-');
                    const [sh, sm] = start.split(':').map(Number);
                    const [eh, em] = end.split(':').map(Number);
                    events.push({
                        ...bev,
                        attendanceStatus: bev.attendanceStatus as ScheduleEntry['attendanceStatus'],
                        materials: bev.materials as ScheduleEntry['materials'],
                        id: `evt-${i}-${day.dateKey}`,
                        dateKey: day.dateKey,
                        startHour: sh,
                        startMin: sm,
                        endHour: eh,
                        endMin: em,
                    });
                }
            });
        });
        return events;
    }, [monthDays]);

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

    return (
        <div className="p-8 pb-20 space-y-6 bg-[#F7F7F2] min-h-screen" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Lịch trình cá nhân</p>
                        <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Lịch học của tôi</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                        <DropdownMenuTrigger asChild>
                            <button className="relative w-10 h-10 bg-white border-2 border-[#1A1A1A]/20 rounded-2xl flex items-center justify-center hover:bg-[#1A1A1A]/5 transition-colors">
                                <Bell className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white">
                                        {unreadNotificationsCount}
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={8} className="w-[340px] p-0 rounded-2xl border-2 border-[#1A1A1A]/20 shadow-2xl overflow-hidden">
                            <div className="bg-[#1A1A1A] px-4 py-3 text-white flex items-center justify-between">
                                <h3 className="font-extrabold text-base flex items-center gap-2">
                                    <Bell className="w-4 h-4" weight="fill" /> Thông báo
                                </h3>
                                <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">{unreadNotificationsCount} mới</span>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto px-2 py-2 space-y-2 bg-white">
                                {NOTIFICATIONS.map((notif, i) => (
                                    <div key={i} className={`rounded-xl border p-3 ${notif.read ? 'border-[#1A1A1A]/10' : 'border-red-200 bg-red-50/50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-extrabold ${notif.read ? 'text-[#1A1A1A]' : 'text-red-600'}`}>{notif.title}</p>
                                                <p className="text-xs font-semibold text-[#1A1A1A]/70 mt-1 line-clamp-2">{notif.desc}</p>
                                            </div>
                                            {!notif.read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-gray-400">{notif.time}</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedNotification(notif);
                                                    setIsNotificationsOpen(false);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] text-white text-[11px] font-extrabold hover:bg-[#333] transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" weight="bold" /> Chi tiết
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex bg-[#1A1A1A]/5 rounded-2xl p-1 border-2 border-[#1A1A1A]/10">
                        <button
                            onClick={() => { setViewMode('day'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'day' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70'}`}
                        >
                            <Rows className="w-4 h-4" weight={viewMode === 'day' ? 'fill' : 'regular'} /> Ngày
                        </button>
                        <button
                            onClick={() => { setViewMode('week'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'week' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70'}`}
                        >
                            <SquaresFour className="w-4 h-4" weight={viewMode === 'week' ? 'fill' : 'regular'} /> Tuần
                        </button>
                        <button
                            onClick={() => { setViewMode('month'); setSelectedEvent(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold transition-all ${viewMode === 'month' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/70'}`}
                        >
                            <CalendarDots className="w-4 h-4" weight={viewMode === 'month' ? 'fill' : 'regular'} /> Tháng
                        </button>
                    </div>

                    <div className="flex items-center bg-white border-2 border-[#1A1A1A]/20 rounded-2xl p-1 gap-1">
                        <button onClick={goPrev} className="p-2 hover:bg-[#1A1A1A]/5 rounded-xl transition-colors active:scale-95">
                            <CaretLeft className="w-4 h-4 text-[#1A1A1A]" />
                        </button>
                        <span className="px-3 font-extrabold text-sm text-[#1A1A1A] whitespace-nowrap">
                            {viewMode === 'week'
                                ? `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(weekDays[6].date)}/${pad(weekDays[6].fullDate.getMonth() + 1)}`
                                : viewMode === 'day' 
                                    ? `${DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7]}, ${pad(currentDate.getDate())}/${pad(currentDate.getMonth() + 1)}`
                                    : `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`
                            }
                        </span>
                        <button onClick={goNext} className="p-2 hover:bg-[#1A1A1A]/5 rounded-xl transition-colors active:scale-95">
                            <CaretRight className="w-4 h-4 text-[#1A1A1A]" />
                        </button>
                    </div>

                    <button onClick={goToday} className="px-5 h-10 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-sm rounded-2xl active:scale-95 transition-all shadow-sm">
                        Hôm nay
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {STATS.map((s, i) => (
                    <div key={i} className="rounded-3xl p-5 border-2 border-[#1A1A1A] flex items-center gap-4 hover:-translate-y-0.5 transition-all shadow-sm" style={{ backgroundColor: s.bg }}>
                        <div className="w-11 h-11 bg-[#1A1A1A] rounded-2xl flex items-center justify-center shrink-0">
                            <s.icon className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-[#1A1A1A]">{s.value}</p>
                            <p className="text-sm font-extrabold text-[#1A1A1A]/70">{s.label}</p>
                        </div>
                    </div>
                ))}
                
                {/* Gamification Progress */}
                <div className="rounded-3xl p-5 border-2 border-[#1A1A1A] bg-white flex flex-col justify-between hover:-translate-y-0.5 transition-all shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Tiến độ tuần</span>
                        <span className="text-sm font-extrabold text-[#1A1A1A]">75%</span>
                    </div>
                    <div className="w-full bg-[#1A1A1A]/10 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#FF6B4A] h-full rounded-full w-3/4"></div>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-2">Đã hoàn thành 6/8 nhiệm vụ</p>
                </div>
            </div>

            {/* Attendance Legend */}
            <div className="flex items-center gap-6 text-sm font-extrabold text-[#1A1A1A]/70 pb-1">
                <span className="uppercase tracking-widest font-extrabold text-xs">Trạng thái điểm danh:</span>
                <div className="flex items-center gap-2"><CheckCircle className="text-emerald-500 w-5 h-5" weight="fill" /> Có mặt</div>
                <div className="flex items-center gap-2"><XCircle className="text-red-500 w-5 h-5" weight="fill" /> Vắng mặt</div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="flex-1 overflow-hidden min-w-0">
                    
                    {viewMode === 'month' ? (
                        <div className="bg-white rounded-[2rem] border-2 border-[#1A1A1A] overflow-hidden shadow-sm">
                            <div className="grid grid-cols-7 bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/10">
                                {DAYS.map(d => <div key={d} className="py-3 text-center text-xs font-extrabold text-[#1A1A1A]/60">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7">
                                {monthDays.map((day, i) => {
                                    const dayEvents = displayEvents.filter(e => e.dateKey === day.dateKey).sort((a,b) => (a.startHour*60+a.startMin) - (b.startHour*60+b.startMin));
                                    
                                    return (
                                        <div key={i} className={`min-h-[140px] p-2 flex flex-col border-[#1A1A1A]/5 ${i % 7 !== 6 ? 'border-r-2' : ''} ${i < 35 ? 'border-b-2' : ''} ${!day.isCurrentMonth ? 'bg-[#1A1A1A]/[0.02]' : 'bg-white'} ${day.isToday ? 'bg-[#FF6B4A]/[0.02]' : ''}`}>
                                            <div className={`text-xs font-extrabold mb-2 ${day.isToday ? 'text-white bg-[#FF6B4A] w-6 h-6 rounded-full flex items-center justify-center' : day.isCurrentMonth ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>
                                                {day.date}
                                            </div>
                                            <div className="space-y-1.5 flex-1 max-h-[105px] overflow-y-auto pr-0.5 custom-scrollbar">
                                                {dayEvents.map(ev => {
                                                    const { status } = getEventStatusInfo(ev.startHour, ev.startMin, ev.endHour, ev.endMin, ev.dateKey, now);
                                                    const style = EVENT_STATUS_STYLES[status];
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
                                                                {status === 'past' && ev.attendanceStatus === 'present' && <CheckCircle className="text-emerald-600 shrink-0 w-3 h-3" weight="fill" />}
                                                                {status === 'past' && ev.attendanceStatus === 'absent' && <XCircle className="text-red-600 shrink-0 w-3 h-3" weight="fill" />}
                                                            </div>
                                                            <span className="truncate text-[11px] font-extrabold text-[#1A1A1A]">{ev.subject}</span>
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
                    <div className="bg-white rounded-[2rem] border-2 border-[#1A1A1A] overflow-hidden shadow-sm">
                    {/* Headers */}
                    <div className={`grid ${viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'} border-b-2 border-[#1A1A1A]`}>
                        <div className="border-r-2 border-[#1A1A1A]/10 bg-[#1A1A1A]/[0.02]" />
                        {dayCols.map((day, i) => (
                            <div
                                key={i}
                                className={`py-4 text-center border-r-2 border-[#1A1A1A]/10 last:border-r-0 transition-colors ${viewMode === 'week' ? 'cursor-pointer hover:bg-[#1A1A1A]/5' : ''} ${day.isToday ? 'bg-[#FF6B4A]/10' : ''}`}
                                onClick={() => { if (viewMode === 'week') { setCurrentDate(day.fullDate); setViewMode('day'); } }}
                            >
                                <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${day.isToday ? 'text-[#FF6B4A]' : 'text-gray-400'}`}>{day.name}</div>
                                <div className={`text-2xl font-extrabold ${day.isToday ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]'}`}>{day.date}</div>
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="relative bg-[#FDFDFD]">
                        <div className={`grid ${viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'}`}>
                            {HOURS.map(hour => (
                                <div key={hour} className="contents">
                                    <div className="h-[80px] border-r-2 border-b-2 border-[#1A1A1A]/10 flex items-start justify-end pr-2 pt-2 bg-[#1A1A1A]/[0.02]">
                                        <span className="text-[10px] font-extrabold text-gray-400">{pad(hour)}:00</span>
                                    </div>
                                    {dayCols.map((day, di) => (
                                        <div
                                            key={di}
                                            className={`h-[80px] border-r-2 border-b-2 border-[#1A1A1A]/5 last:border-r-0 ${day.isToday ? 'bg-[#FF6B4A]/[0.02]' : ''}`}
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
                            
                            const colIdx = dayCols.findIndex(d => d.dateKey === ev.dateKey);
                            if (colIdx < 0) return null;
                            const dayColumnWidth = viewMode === 'week' ? 'calc((100% - 60px) / 7)' : 'calc(100% - 60px)';
                            const leftOffset = viewMode === 'week' ? `calc(60px + ${colIdx} * ${dayColumnWidth})` : '60px';
                            
                            const { status, isJoinable } = getEventStatusInfo(ev.startHour, ev.startMin, ev.endHour, ev.endMin, ev.dateKey, now);
                            const style = EVENT_STATUS_STYLES[status];

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
                                        className={`group relative h-full rounded-2xl border-2 px-3 py-2 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col ${selectedEvent?.id === ev.id ? 'shadow-lg scale-[1.02] ring-2 ring-[#1A1A1A]/20' : 'hover:shadow-md hover:-translate-y-0.5'} ${status === 'ongoing' ? 'animate-border-blink shadow-xl scale-[1.01]' : ''}`}
                                        style={{ backgroundColor: style.bg, borderColor: style.border, opacity: status === 'past' ? 0.76 : 1 }}
                                        onClick={() => setSelectedEvent(ev)}
                                        onMouseEnter={(e) => { setHoveredEventId(ev.id); showTooltip(ev, e); }}
                                        onMouseLeave={() => { setHoveredEventId(null); hideTooltip(); }}
                                    >
                                        {status === 'ongoing' && (
                                            <span className="absolute top-2.5 right-2.5 flex w-2 h-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                                            </span>
                                        )}

                                        {status === 'past' && ev.attendanceStatus === 'present' && (
                                            <div className="absolute top-2.5 right-2.5 flex" title="Đã điểm danh">
                                                <CheckCircle className="text-emerald-500 w-4 h-4" weight="fill" />
                                            </div>
                                        )}
                                        {status === 'past' && ev.attendanceStatus === 'absent' && (
                                            <div className="absolute top-2.5 right-2.5 flex" title="Vắng mặt">
                                                <XCircle className="text-red-500 w-4 h-4" weight="fill" />
                                            </div>
                                        )}
                                        
                                        <div className={`font-extrabold leading-tight text-[#1A1A1A] ${viewMode === 'day' ? 'text-[17px]' : 'text-[13px]'}`}>{ev.subject}</div>
                                        <div className={`font-extrabold mt-0.5 text-[#1A1A1A]/75 ${viewMode === 'day' ? 'text-[13px]' : 'text-[11px]'}`}>Lớp {ev.className}</div>
                                        <div className={`font-extrabold text-[#1A1A1A] ${viewMode === 'day' ? 'text-[13px] mt-1 line-clamp-1' : 'text-[11px] mt-0.5 line-clamp-1'}`}>
                                            GV: {ev.teacher}
                                        </div>
                                        
                                        {viewMode === 'day' && (
                                            <div className="font-semibold text-[#1A1A1A]/80 text-[12px] mt-1.5 line-clamp-1">{ev.topic}</div>
                                        )}

                                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                                            <span className={`font-extrabold text-[#1A1A1A]/80 ${viewMode === 'day' ? 'text-[12px]' : 'text-[10px]'}`}>
                                                {pad(ev.startHour)}:{pad(ev.startMin)} - {pad(ev.endHour)}:{pad(ev.endMin)}
                                            </span>
                                            <div className="flex items-center gap-1.5 justify-end">
                                            {ev.hasHomework && status !== 'ongoing' && (
                                                <div className="bg-white/50 rounded-lg p-1 text-[#D97706]" title="Có bài tập">
                                                    <WarningCircle className="w-3.5 h-3.5" weight="bold" />
                                                </div>
                                            )}
                                            {ev.meet && (viewMode === 'day' || status !== 'past') ? (
                                                <a href={ev.meet} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={`rounded-lg px-1.5 py-1 flex items-center gap-1 text-[9px] font-extrabold ${isJoinable ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-white/60 text-[#047857]'}`} title={isJoinable ? 'Vào học ngay' : 'Có link Meet'}>
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
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#1A1A1A]/60 pt-4 pb-8 px-2">
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
                        className={`w-full flex items-center justify-center gap-2 bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A] rounded-2xl py-2.5 mb-4 font-extrabold text-sm hover:bg-[#1A1A1A]/5 hover:border-[#1A1A1A]/30 transition-all ${!sidebarOpen && 'px-0'}`}
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
                        <div className="bg-white rounded-[2rem] border-2 border-[#1A1A1A] p-5 space-y-5 shadow-sm min-h-[500px]">
                            <div>
                                <h2 className="font-extrabold text-lg text-[#1A1A1A]">Sắp tới</h2>
                                <p className="text-xs font-bold text-gray-400 mt-1">Nhiệm vụ và sự kiện</p>
                            </div>

                            <div className="flex bg-[#F7F7F2] p-1 rounded-2xl border-2 border-[#1A1A1A]/10 gap-1">
                                {[{ id: 'all', label: 'Tất cả' }, { id: 'test', label: 'Kiểm tra' }, { id: 'hw', label: 'Bài tập' }].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setUpcomingTab(t.id as TabType)}
                                        className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-colors ${upcomingTab === t.id ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#1A1A1A]/50 hover:bg-[#1A1A1A]/5'}`}
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
                                        <div key={i} className={`group rounded-2xl border-2 ${ev.isUrgent ? 'border-red-400 shadow-[0_4px_12px_rgba(248,113,113,0.15)] bg-red-50/20' : 'border-[#1A1A1A] bg-white'} p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer relative overflow-hidden`} >
                                            <div className={`absolute top-0 left-0 w-1.5 h-full`} style={{ backgroundColor: ev.isUrgent ? '#F87171' : ev.bg }} />
                                            <div className="pl-2">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <p className={`font-extrabold text-sm leading-tight pr-4 ${ev.isUrgent ? 'text-red-600' : 'text-[#1A1A1A]'}`}>{ev.subject}</p>
                                                        {ev.isUrgent && (
                                                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse">
                                                                <WarningCircle className="w-3 h-3" /> Hạn chót &lt; 2h
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${ev.bg}20`, color: ev.bg === '#FCE38A' ? '#D97706' : ev.bg === '#FFB5B5' ? '#DC2626' : '#1A1A1A' }}>
                                                        {ev.type === 'test' ? 'Kiểm tra' : ev.type === 'hw' ? 'Nộp bài' : 'Sự kiện'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-1.5 py-0.5 rounded-md">
                                                        <CalendarBlank className="w-3 h-3" /> {ev.displayDate}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#1A1A1A]/60 bg-[#1A1A1A]/5 px-1.5 py-0.5 rounded-md">
                                                        <Clock className="w-3 h-3" /> {ev.time}
                                                    </span>
                                                </div>

                                                {ev.progress !== undefined && (
                                                    <div className="mt-3">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] font-extrabold text-[#1A1A1A]/50 uppercase">Tiến độ</span>
                                                            <span className="text-[9px] font-extrabold text-[#1A1A1A]">{ev.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-[#1A1A1A]/10 h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ease-out bg-[#1A1A1A]`} style={{ width: `${ev.progress}%` }} />
                                                        </div>
                                                        {ev.type === 'hw' && (
                                                            <button className="w-full mt-3 bg-[#1A1A1A] hover:bg-[#333] text-white py-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors">
                                                                <PaperPlaneRight className="w-3.5 h-3.5" weight="fill" /> Nộp bài ngay
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="border-t-2 border-[#1A1A1A]/10 pt-4 mt-auto">
                                <h3 className="font-extrabold text-sm text-[#1A1A1A] mb-2 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-[#FF6B4A]" weight="fill" /> Ghi chú nhanh
                                </h3>
                                <textarea 
                                    className="w-full bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 rounded-2xl p-3 text-xs font-bold text-[#1A1A1A] placeholder:text-gray-400 resize-none focus:outline-none focus:border-[#FF6B4A] transition-colors"
                                    rows={3}
                                    placeholder="Nhập ghi chú nhanh cho tuần học..."
                                    defaultValue="Nhớ mang compa cho giờ Toán thứ Tư."
                                ></textarea>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} now={now} />
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
                            Tổng số lượng: {showClassmates?.studentsCount || 45} học sinh
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 py-2">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-[#F7F7F2] rounded-xl border border-[#1A1A1A]/5">
                                <div className="w-8 h-8 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center font-extrabold text-xs text-[#1A1A1A]">
                                    <Student className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-extrabold text-[#1A1A1A]">Học sinh tên {i + 1}</p>
                                    <p className="text-[10px] font-bold text-gray-400">ID: HS{2024000 + i}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pt-2">
                        <button onClick={() => setShowClassmates(null)} className="w-full bg-[#1A1A1A] text-white py-3 rounded-2xl font-extrabold text-sm active:scale-95 transition-transform">
                            Đóng danh sách
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
                <DialogContent className="rounded-3xl max-w-md border-2 border-[#1A1A1A]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> Chi tiết thông báo
                        </DialogTitle>
                        <DialogDescription className="font-bold">
                            {selectedNotification?.time}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className={`rounded-2xl border-2 p-4 ${selectedNotification?.read ? 'border-[#1A1A1A]/10 bg-[#F7F7F2]' : 'border-red-200 bg-red-50/40'}`}>
                            <p className={`text-lg font-extrabold ${selectedNotification?.read ? 'text-[#1A1A1A]' : 'text-red-600'}`}>
                                {selectedNotification?.title}
                            </p>
                            <p className="text-sm font-semibold text-[#1A1A1A]/70 mt-2">{selectedNotification?.desc}</p>
                        </div>
                        <button
                            onClick={() => setSelectedNotification(null)}
                            className="w-full bg-[#1A1A1A] hover:bg-[#333] text-white font-extrabold py-3 rounded-2xl transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
