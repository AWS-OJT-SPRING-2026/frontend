import { useMemo, useRef, useState } from 'react';
import { CalendarBlank, Clock, BookOpen, ChalkboardTeacher, CaretLeft, CaretRight, Video } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DATES = [19, 20, 21, 22, 23, 24, 25];
const TODAY_IDX = 1;

type ViewMode = 'week' | 'month';

type ClassEntry = {
    time: string;
    subject: string;
    teacher: string;
    initials: string;
    bg: string;
    meet?: string;
    topic?: string;
    className?: string;
    date?: string;
};

const SCHEDULE: Record<number, ClassEntry[]> = {
    0: [
        { time: '08:00-09:30', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', meet: 'https://meet.google.com', topic: 'Toán học - 11C1 - Tuần 1 - Tiết 1: Đại số tổ hợp', className: '11C1', date: 'Thứ Hai, 19/05' },
        { time: '13:30-15:00', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', initials: 'EW', bg: '#B8B5FF', topic: 'Tiếng Anh - 11C1 - Tuần 1 - Tiết 1: Grammar and Vocabulary', className: '11C1', date: 'Thứ Hai, 19/05' },
    ],
    1: [
        { time: '08:00-09:30', subject: 'Ngữ văn', teacher: 'Cô Trần Thị Lan', initials: 'TL', bg: '#95E1D3', meet: 'https://meet.google.com', topic: 'Ngữ văn - 11C1 - Tuần 1 - Tiết 1: Phân tích tác phẩm', className: '11C1', date: 'Thứ Ba, 20/05' },
        { time: '10:00-11:30', subject: 'Vật lý', teacher: 'Thầy Lê Văn Hùng', initials: 'LH', bg: '#FFB5B5', topic: 'Vật lý - 11C1 - Tuần 1 - Tiết 1: Động lực học', className: '11C1', date: 'Thứ Ba, 20/05' },
    ],
    2: [
        { time: '07:30-09:00', subject: 'Hóa học', teacher: 'Cô Phạm Ngọc Bích', initials: 'PB', bg: '#FFD9A0', meet: 'https://meet.google.com', topic: 'Hóa học - 11C1 - Tuần 1 - Tiết 1: Phản ứng hóa học', className: '11C1', date: 'Thứ Tư, 21/05' },
        { time: '14:00-15:30', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', topic: 'Toán học - 11C1 - Tuần 1 - Tiết 2: Xác suất', className: '11C1', date: 'Thứ Tư, 21/05' },
    ],
    3: [
        { time: '08:00-09:30', subject: 'Lịch sử', teacher: 'Thầy Đặng Minh Tuấn', initials: 'DT', bg: '#C8F7C5', meet: 'https://meet.google.com', topic: 'Lịch sử - 11C1 - Tuần 1 - Tiết 1: Chiến tranh thế giới', className: '11C1', date: 'Thứ Năm, 22/05' },
    ],
    4: [
        { time: '07:30-09:00', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', initials: 'EW', bg: '#B8B5FF', meet: 'https://meet.google.com', topic: 'Tiếng Anh - 11C1 - Tuần 1 - Tiết 2: Reading Comprehension', className: '11C1', date: 'Thứ Sáu, 23/05' },
        { time: '10:00-11:30', subject: 'Sinh học', teacher: 'Cô Hoàng Thu Hà', initials: 'HH', bg: '#95E1D3', topic: 'Sinh học - 11C1 - Tuần 1 - Tiết 1: Di truyền học', className: '11C1', date: 'Thứ Sáu, 23/05' },
    ],
    5: [],
    6: [],
};

const MONTH_EVENTS: Record<number, ClassEntry[]> = {
    2: [{ time: '08:00', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', topic: 'Đại số tổ hợp', className: '11C1' }],
    4: [{ time: '10:00', subject: 'Vật lý', teacher: 'Thầy Lê Văn Hùng', initials: 'LH', bg: '#FFB5B5', topic: 'Động lực học', className: '11C1' }],
    7: [{ time: '07:30', subject: 'Hóa học', teacher: 'Cô Phạm Ngọc Bích', initials: 'PB', bg: '#FFD9A0', topic: 'Phản ứng hóa học', className: '11C1' }],
    10: [
        { time: '08:00', subject: 'Ngữ văn', teacher: 'Cô Trần Thị Lan', initials: 'TL', bg: '#95E1D3', topic: 'Phân tích tác phẩm', className: '11C1' },
        { time: '13:30', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', initials: 'EW', bg: '#B8B5FF', topic: 'Grammar and Vocabulary', className: '11C1' },
    ],
    14: [{ time: '09:00', subject: 'Sinh học', teacher: 'Cô Hoàng Thu Hà', initials: 'HH', bg: '#95E1D3', topic: 'Di truyền học', className: '11C1' }],
    18: [{ time: '08:00', subject: 'Lịch sử', teacher: 'Thầy Đặng Minh Tuấn', initials: 'DT', bg: '#C8F7C5', topic: 'Chiến tranh thế giới', className: '11C1' }],
    21: [
        { time: '08:00', subject: 'Ngữ văn', teacher: 'Cô Trần Thị Lan', initials: 'TL', bg: '#95E1D3', meet: 'https://meet.google.com', topic: 'Phân tích tác phẩm', className: '11C1' },
        { time: '10:00', subject: 'Vật lý', teacher: 'Thầy Lê Văn Hùng', initials: 'LH', bg: '#FFB5B5', topic: 'Động lực học', className: '11C1' },
    ],
    25: [{ time: '14:00', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', initials: 'NB', bg: '#FCE38A', topic: 'Xác suất', className: '11C1' }],
};

const UPCOMING = [
    { subject: 'Kiểm tra Toán giữa kỳ', date: 'Thứ Năm, 22/05', time: '08:00', type: 'test', bg: '#FF6B4A', color: '#fff' },
    { subject: 'Nộp bài Văn học', date: 'Thứ Sáu, 23/05', time: '17:00', type: 'hw', bg: '#FCE38A', color: '#1A1A1A' },
    { subject: 'Seminar Vật lý', date: 'Thứ Sáu, 23/05', time: '14:00', type: 'event', bg: '#95E1D3', color: '#1A1A1A' },
    { subject: 'Kiểm tra Hóa học', date: 'Thứ Hai, 26/05', time: '09:00', type: 'test', bg: '#FFB5B5', color: '#1A1A1A' },
    { subject: 'Nộp bài Tiếng Anh', date: 'Thứ Ba, 27/05', time: '23:59', type: 'hw', bg: '#B8B5FF', color: '#1A1A1A' },
];

const stats = [
    { label: 'Tiết học tuần này', value: '9', icon: BookOpen, bg: '#FCE38A' },
    { label: 'Giờ học', value: '13.5h', icon: Clock, bg: '#B8B5FF' },
    { label: 'Môn học', value: '7', icon: ChalkboardTeacher, bg: '#95E1D3' },
    { label: 'Bài kiểm tra', value: '1', icon: CalendarBlank, bg: '#FFB5B5' },
];

function getMonthMatrix(year: number, month: number): (Date | null)[][] {
    const firstDate = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startDay = (firstDate.getDay() + 6) % 7;

    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(startDay).fill(null);

    for (let day = 1; day <= lastDay; day += 1) {
        week.push(new Date(year, month, day));
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }

    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }

    return weeks;
}

function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

/* ── Detail Dialog (admin-like, centered popup) ── */
function EventDetailDialog({ event, onClose }: { event: ClassEntry | null; onClose: () => void }) {
    if (!event) return null;

    return (
        <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="rounded-3xl max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: event.bg }} />
                        {event.subject}
                    </DialogTitle>
                    <DialogDescription>
                        Lớp {event.className || '—'} · {event.teacher}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-3 space-y-2 text-sm font-semibold text-[#1A1A1A]/75">
                        <div className="flex items-center justify-between gap-2">
                            <span>Thời gian</span>
                            <span className="font-extrabold text-[#1A1A1A]">
                                {event.date || '—'} · {event.time}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span>Chủ đề</span>
                            <span className="font-bold text-[#1A1A1A] text-right">{event.topic || 'Chưa cập nhật'}</span>
                        </div>
                    </div>

                    {event.meet && (
                        <a
                            href={event.meet}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#2563EB]/20 bg-[#EEF4FF] px-3 py-3 text-[#2563EB] hover:bg-[#E2ECFF] text-sm font-extrabold transition-colors shadow-sm"
                        >
                            <Video className="w-5 h-5" weight="fill" />
                            Mở Google Meet
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-2 pt-3">
                    <button
                        onClick={onClose}
                        className="bg-[#1A1A1A] hover:bg-[#333] text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-1.5"
                    >
                        Đóng
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ── Class Card ── */
function ClassCard({ cls, isSelected, onClick }: { cls: ClassEntry; isSelected: boolean; onClick: () => void }) {
    return (
        <div
            className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-[#FF6B4A]/40 shadow-lg scale-[1.02]' : 'border-[#1A1A1A]/20'}`}
            style={{ backgroundColor: cls.bg, minHeight: '80px' }}
            onClick={onClick}
        >
            <div className="p-3">
                <p className="font-extrabold text-[#1A1A1A] text-xs leading-tight">{cls.time}</p>
                <p className="font-extrabold text-[#1A1A1A] text-sm leading-tight mt-1">{cls.subject}</p>
                <p className="font-semibold text-[#1A1A1A]/60 text-xs leading-tight mt-1 truncate">{cls.initials} · {cls.teacher.split(' ').slice(-1)[0]}</p>
            </div>
        </div>
    );
}

function WeekView({ selectedEvent, onEventClick }: { selectedEvent: ClassEntry | null; onEventClick: (cls: ClassEntry) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current) return;
        isDragging.current = true;
        startX.current = e.pageX - ref.current.offsetLeft;
        scrollLeft.current = ref.current.scrollLeft;
        ref.current.style.cursor = 'grabbing';
    };

    const onMouseUp = () => {
        isDragging.current = false;
        if (ref.current) ref.current.style.cursor = 'grab';
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX.current) * 1.2;
        ref.current.scrollLeft = scrollLeft.current - walk;
    };

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-[#1A1A1A] flex items-center justify-between">
                <h2 className="font-extrabold text-lg text-[#1A1A1A]">Lịch tuần</h2>
                <span className="text-sm text-gray-400 font-bold select-none">19-25 tháng 5 · Kéo để cuộn</span>
            </div>

            <div
                ref={ref}
                className="overflow-x-auto select-none"
                style={{ cursor: 'grab' }}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onMouseMove={onMouseMove}
            >
                <div style={{ minWidth: '900px' }}>
                    <div className="grid grid-cols-7 border-b-2 border-[#1A1A1A]">
                        {DAYS.map((d, i) => (
                            <div key={d} className={`py-4 flex flex-col items-center gap-1 ${i === TODAY_IDX ? 'bg-[#FF6B4A]' : ''}`}>
                                <span className={`text-xs font-extrabold uppercase tracking-widest ${i === TODAY_IDX ? 'text-white/80' : 'text-gray-400'}`}>{d}</span>
                                <span className={`text-xl font-extrabold ${i === TODAY_IDX ? 'text-white' : 'text-[#1A1A1A]'}`}>{DATES[i]}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 divide-x-2 divide-[#1A1A1A]/10" style={{ minHeight: '420px' }}>
                        {DAYS.map((_, dayIdx) => (
                            <div key={dayIdx} className={`p-3 space-y-3 ${dayIdx === TODAY_IDX ? 'bg-[#FF6B4A]/5' : ''}`}>
                                {SCHEDULE[dayIdx]?.map((cls, ci) => (
                                    <ClassCard
                                        key={ci}
                                        cls={cls}
                                        isSelected={selectedEvent === cls}
                                        onClick={() => onEventClick(cls)}
                                    />
                                ))}
                                {(!SCHEDULE[dayIdx] || SCHEDULE[dayIdx].length === 0) && (
                                    <div className="flex items-center justify-center h-full opacity-20 pt-8">
                                        <span className="text-sm text-gray-400 font-bold">Trống</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MonthView({ monthAnchor, onEventClick, selectedEvent }: { monthAnchor: Date; onEventClick: (cls: ClassEntry) => void; selectedEvent: ClassEntry | null }) {
    const now = new Date();
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const monthMatrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
    const monthLabel = formatMonthLabel(monthAnchor);

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-[#1A1A1A] flex items-center justify-between">
                <h2 className="font-extrabold text-lg text-[#1A1A1A]">Lịch tháng (Demo)</h2>
                <span className="text-sm text-gray-400 font-bold capitalize">{monthLabel}</span>
            </div>

            <div className="grid grid-cols-7 border-b-2 border-[#1A1A1A]/15 bg-[#1A1A1A]/5">
                {DAYS.map((d) => (
                    <div key={d} className="py-3 text-center text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A]/60">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[130px]">
                {monthMatrix.flat().map((date, index) => {
                    const day = date?.getDate();
                    const events = day ? (MONTH_EVENTS[day] ?? []) : [];
                    const isToday = !!date && date.toDateString() === now.toDateString();

                    return (
                        <div
                            key={`${date?.toISOString() ?? `empty-${index}`}`}
                            className={`border-r border-b border-[#1A1A1A]/10 p-2 ${isToday ? 'bg-[#FF6B4A]/8' : 'bg-white'}`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-xs font-extrabold ${isToday ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]/60'}`}>
                                    {day ?? ''}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {events.slice(0, 2).map((event, idx) => (
                                    <div
                                        key={`${event.subject}-${idx}`}
                                        className={`rounded-lg px-2 py-1 text-[10px] font-extrabold truncate cursor-pointer hover:shadow-sm transition-all ${selectedEvent === event ? 'ring-2 ring-[#FF6B4A]/40' : ''}`}
                                        style={{ backgroundColor: event.bg }}
                                        onClick={() => onEventClick(event)}
                                    >
                                        {event.time} · {event.subject}
                                    </div>
                                ))}
                                {events.length > 2 && (
                                    <div className="text-[10px] font-bold text-[#1A1A1A]/50">+{events.length - 2} buổi</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function UpcomingSidebar({ sidebarOpen, onToggle }: { sidebarOpen: boolean; onToggle: () => void }) {
    return (
        <div className={`shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-full lg:w-80' : 'w-10'}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-2xl py-2 mb-3 font-bold text-sm hover:bg-[#333] transition-colors"
            >
                {sidebarOpen ? (
                    <>
                        <CaretRight className="w-4 h-4" weight="bold" />
                        <span className="hidden lg:inline">Thu gọn</span>
                    </>
                ) : (
                    <CaretLeft className="w-4 h-4" weight="bold" />
                )}
            </button>

            {sidebarOpen && (
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-4 space-y-3">
                    <div className="pb-2 border-b border-[#1A1A1A]/10">
                        <h2 className="font-extrabold text-base text-[#1A1A1A]">Sắp tới</h2>
                        <p className="text-xs font-semibold text-gray-400">Các đầu việc và buổi học gần nhất</p>
                    </div>
                    {UPCOMING.map((ev, i) => (
                        <div key={i} className="rounded-2xl border-2 border-[#1A1A1A]/20 p-3" style={{ backgroundColor: ev.bg }}>
                            <p className="font-extrabold text-sm leading-tight" style={{ color: ev.color }}>{ev.subject}</p>
                            <p className="text-xs font-semibold mt-1.5 opacity-70" style={{ color: ev.color }}>{ev.date}</p>
                            <p className="text-xs font-bold opacity-70" style={{ color: ev.color }}>{ev.time}</p>
                            <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1A1A1A]/15" style={{ color: ev.color }}>
                                {ev.type === 'test' ? 'Kiểm tra' : ev.type === 'hw' ? 'Nộp bài' : 'Sự kiện'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function StudentSchedule() {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<ClassEntry | null>(null);

    function toggleViewMode() {
        setViewMode((prev) => (prev === 'week' ? 'month' : 'week'));
    }

    function handleEventClick(cls: ClassEntry) {
        setSelectedEvent((prev) => (prev === cls ? null : cls));
    }

    const currentMonthAnchor = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }, []);

    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Tuần 21 - Tháng 5, 2025</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Lịch học của tôi</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleViewMode}
                        className="w-10 h-10 bg-white border border-[#1A1A1A]/20 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                        title={viewMode === 'week' ? 'Chuyển sang tháng này' : 'Chuyển sang tuần này'}
                    >
                        <CaretLeft className="w-5 h-5 text-[#1A1A1A]" />
                    </button>
                    <button
                        onClick={toggleViewMode}
                        className="px-5 h-10 bg-white border border-[#1A1A1A]/20 rounded-2xl font-extrabold text-sm text-[#1A1A1A] flex items-center gap-2 hover:bg-gray-50 transition-colors"
                        title="Chuyển chế độ xem"
                    >
                        <CalendarBlank className="w-4 h-4" /> {viewMode === 'month' ? 'Tháng này' : 'Tuần này'}
                    </button>
                    <button
                        onClick={toggleViewMode}
                        className="w-10 h-10 bg-white border border-[#1A1A1A]/20 rounded-2xl flex items-center justify-center hover:bg-gray-50 transition-colors"
                        title={viewMode === 'week' ? 'Chuyển sang tháng này' : 'Chuyển sang tuần này'}
                    >
                        <CaretRight className="w-5 h-5 text-[#1A1A1A]" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="rounded-3xl p-5 border-2 border-[#1A1A1A] flex items-center gap-4" style={{ backgroundColor: s.bg }}>
                        <div className="w-11 h-11 bg-[#1A1A1A] rounded-2xl flex items-center justify-center shrink-0">
                            <s.icon className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-[#1A1A1A]">{s.value}</p>
                            <p className="text-xs font-bold text-[#1A1A1A]/60">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-5 items-start">
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="bg-white rounded-2xl border-2 border-[#1A1A1A]/20 p-1 inline-flex">
                        <span className="px-4 py-1.5 text-sm font-extrabold rounded-xl bg-[#1A1A1A] text-white shadow-md">
                            Lịch học
                        </span>
                    </div>

                    {viewMode === 'week'
                        ? <WeekView selectedEvent={selectedEvent} onEventClick={handleEventClick} />
                        : <MonthView monthAnchor={currentMonthAnchor} onEventClick={handleEventClick} selectedEvent={selectedEvent} />
                    }
                </div>

                <UpcomingSidebar sidebarOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />
            </div>

            <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </div>
    );
}
