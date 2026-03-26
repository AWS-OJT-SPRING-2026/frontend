import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { CalendarBlank, Plus, VideoCamera, CaretRight, CaretLeft, FloppyDisk, Repeat, ListChecks, Trash, PencilSimple, Users } from '@phosphor-icons/react';
import { AttendanceModal } from '../shared/AttendanceModal';
import { authService } from '../../services/authService';
import { classroomService, type ClassroomItem, type SubjectItem } from '../../services/classroomService';
import {
    timetableService,
    type TeacherItem,
    type TimetableItem,
    type TimetableStats,
} from '../../services/timetableService';

// ─── Types ────────────────────────────────────────────────────────────
interface ScheduleEvent {
    id: number;
    classID: number;
    classroom: string;
    subject: string;
    teacherID: number | null;
    teacher: string;
    topic: string;
    status: 'upcoming' | 'ongoing' | 'completed';
    meetLink?: string;
    startTime: string;
    endTime: string;
    dateKey: string;
    dayIndex: number;
    startHour: number;
    duration: number;
}

type ViewMode = 'week' | 'month' | 'today';

type FormData = {
    classroomId: string;
    subject: string;
    teacherId: string;
    topic: string;
    date: string;
    startTime: string;
    endTime: string;
    meetLink: string;
    repeatWeekly: boolean;
    selectedDays: number[];
    repeatStartDate: string;
    repeatEndDate: string;
};

type EditSingleData = {
    classID: string;
    teacherID: string;
    topic: string;
    date: string;
    startTime: string;
    endTime: string;
    meetLink: string;
};

// ─── Colour palette by subject ────────────────────────────────────────
const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    'Toán học': { bg: '#FFF9E0', border: '#F5D623', text: '#8B7300', dot: '#F5D623' },
    'Ngữ văn': { bg: '#E8FAF4', border: '#3ECFA0', text: '#1B6B50', dot: '#3ECFA0' },
    'Vật lý': { bg: '#FFE8E8', border: '#FF7070', text: '#8B2020', dot: '#FF7070' },
    'Tiếng Anh': { bg: '#EDE8FF', border: '#8B7BFF', text: '#3B2F80', dot: '#8B7BFF' },
    'Hóa học': { bg: '#E0F4FF', border: '#4AB8F0', text: '#1A5A7A', dot: '#4AB8F0' },
    'Sinh học': { bg: '#F0FFE0', border: '#7ACC3C', text: '#3A6B10', dot: '#7ACC3C' },
    'Lịch sử': { bg: '#FFF0E0', border: '#F0A040', text: '#7A5010', dot: '#F0A040' },
    'Địa lý': { bg: '#E8F0FF', border: '#5090E0', text: '#1A3A6B', dot: '#5090E0' },
};
const DEFAULT_COLOR = { bg: '#F5F5F5', border: '#AAAAAA', text: '#555555', dot: '#AAAAAA' };

const SUBJECT_KEYWORDS: Record<string, string[]> = {
    'Toán học': ['toan'],
    'Ngữ văn': ['ngu van', 'van hoc', 'ngu van'],
    'Vật lý': ['vat ly', 'ly'],
    'Tiếng Anh': ['tieng anh', 'anh van', 'english'],
    'Hóa học': ['hoa hoc', 'hoa'],
    'Sinh học': ['sinh hoc', 'sinh'],
    'Lịch sử': ['lich su', 'su'],
    'Địa lý': ['dia ly', 'dia'],
};

const normalizeVietnamese = (value: string) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getSubjectColor = (subject: string) => {
    if (!subject) return DEFAULT_COLOR;

    if (SUBJECT_COLORS[subject]) {
        return SUBJECT_COLORS[subject];
    }

    const normalized = normalizeVietnamese(subject);
    for (const [canonical, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        if (keywords.some((kw) => normalized.includes(kw))) {
            return SUBJECT_COLORS[canonical] ?? DEFAULT_COLOR;
        }
    }

    return DEFAULT_COLOR;
};

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_FULL_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const DAY_ENUMS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const HOURS_START = 7;
const HOURS_END = 21;
const HOUR_SLOTS = Array.from({ length: HOURS_END - HOURS_START }, (_, i) => HOURS_START + i);
const ROW_H = 72;
const DRAG_MINUTE_STEP = 15;
const MIN_DURATION_HOURS = DRAG_MINUTE_STEP / 60;

const STATUS_LABELS: Record<ScheduleEvent['status'], { label: string; color: string; bgColor: string }> = {
    ongoing: { label: 'Đang diễn ra', color: '#16A34A', bgColor: '#DCFCE7' },
    upcoming: { label: 'Sắp tới', color: '#4F46E5', bgColor: '#EEF2FF' },
    completed: { label: 'Đã kết thúc', color: '#6B7280', bgColor: '#F3F4F6' },
};

const STATUS_CARD_STYLES: Record<ScheduleEvent['status'], { bg: string; border: string; text: string; glow: string }> = {
    ongoing: {
        bg: '#DCFCE7',
        border: '#22C55E',
        text: '#047857',
        glow: '0 0 0 2px rgba(34, 197, 94, 0.15)',
    },
    upcoming: {
        bg: '#EEF2FF',
        border: '#C7D2FE',
        text: '#4F46E5',
        glow: '0 0 0 2px rgba(99, 102, 241, 0.12)',
    },
    completed: {
        bg: '#F3F4F6',
        border: '#D1D5DB',
        text: '#6B7280',
        glow: '0 0 0 1px rgba(156, 163, 175, 0.15)',
    },
};

const hasMeetLink = (meetLink?: string) => Boolean(meetLink?.trim());

const fmtTime = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function getWeekDates(offset: number): Date[] {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function getMonthDays(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= lastDay; d++) {
        week.push(new Date(year, month, d));
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

const fmtDateVN = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const normalizeDateInput = (value?: string | null): string => {
    if (!value) return '';

    const yyyyMmDd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (yyyyMmDd) return `${yyyyMmDd[1]}-${yyyyMmDd[2]}-${yyyyMmDd[3]}`;

    const ddMmYyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddMmYyyy) return `${ddMmYyyy[3]}-${ddMmYyyy[2]}-${ddMmYyyy[1]}`;

    return '';
};

const localDateTimeFromDateAndHour = (date: string, hour: number): string => {
    const hh = Math.floor(hour);
    const mm = Math.round((hour - hh) * 60);
    return `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
};

const mapStatus = (status: string): ScheduleEvent['status'] => {
    const s = status?.toUpperCase();
    if (s === 'ONGOING') return 'ongoing';
    if (s === 'COMPLETED' || s === 'CANCELLED') return 'completed';
    return 'upcoming';
};

const mapTimetableItem = (item: TimetableItem): ScheduleEvent => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    return {
        id: item.timetableID,
        classID: item.classID,
        classroom: item.className,
        subject: item.subjectName,
        teacherID: item.teacherID,
        teacher: item.teacherName ?? 'Chưa phân công',
        topic: item.topic,
        status: mapStatus(item.status),
        meetLink: item.googleMeetLink ?? undefined,
        startTime: item.startTime,
        endTime: item.endTime,
        dateKey: toDateKey(start),
        dayIndex: (start.getDay() + 6) % 7,
        startHour,
        duration: Math.max(MIN_DURATION_HOURS, endHour - startHour),
    };
};

// ─── Component ────────────────────────────────────────────────────────
export function AdminSchedule() {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthDate, setMonthDate] = useState(() => {
        const n = new Date();
        return { year: n.getFullYear(), month: n.getMonth() };
    });

    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [stats, setStats] = useState<TimetableStats>({ totalToday: 0, ongoing: 0, upcoming: 0, completed: 0 });

    const [filterClass, setFilterClass] = useState('all');
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [singleEditOpen, setSingleEditOpen] = useState(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [singleEditData, setSingleEditData] = useState<EditSingleData>({
        classID: '',
        teacherID: '',
        topic: '',
        date: '',
        startTime: '08:00',
        endTime: '09:30',
        meetLink: '',
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        classroomId: '',
        subject: '',
        teacherId: '',
        topic: '',
        date: '',
        startTime: '08:00',
        endTime: '09:30',
        meetLink: '',
        repeatWeekly: false,
        selectedDays: [],
        repeatStartDate: '',
        repeatEndDate: '',
    });

    const [bulkEditOpen, setBulkEditOpen] = useState(false);
    const [bulkEditClassId, setBulkEditClassId] = useState<string>('');
    const [bulkEditData, setBulkEditData] = useState({
        subjectID: '',
        teacherId: '',
        topic: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        meetLink: '',
    });
    const [moreDialog, setMoreDialog] = useState<{ open: boolean; title: string; items: ScheduleEvent[] }>({
        open: false,
        title: '',
        items: [],
    });

    const [tooltip, setTooltip] = useState<
        | { type: 'event'; event: ScheduleEvent; x: number; y: number }
        | { type: 'more'; title: string; items: ScheduleEvent[]; x: number; y: number }
        | null
    >(null);
    const [hoverCardQuery, setHoverCardQuery] = useState('');
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
    const gridRef = useRef<HTMLDivElement>(null);
    const [dragState, setDragState] = useState<{
        eventId: number;
        type: 'move' | 'resize';
        origEvent: ScheduleEvent;
        startX: number;
        startY: number;
        changed: boolean;
    } | null>(null);

    const today = useMemo(() => new Date(), []);
    const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
    const todayDayIndex = useMemo(() => weekDates.findIndex((d) => isSameDay(d, today)), [today, weekDates]);

    const allClassrooms = useMemo(() => classrooms.map((c) => c.className), [classrooms]);
    const allTeachers = useMemo(() => {
        const fromApi = teachers.map((t) => t.fullName);
        const fromEvents = events.map((e) => e.teacher);
        return Array.from(new Set([...fromApi, ...fromEvents]));
    }, [teachers, events]);
    const allSubjects = useMemo(() => {
        const fromClassrooms = classrooms.map((c) => c.subjectName);
        const fromEvents = events.map((e) => e.subject);
        return Array.from(new Set([...Object.keys(SUBJECT_COLORS), ...fromClassrooms, ...fromEvents]));
    }, [classrooms, events]);

    const filteredEvents = useMemo(() => events.filter((e) => {
        if (filterClass !== 'all' && e.classroom !== filterClass) return false;
        if (filterTeacher !== 'all' && e.teacher !== filterTeacher) return false;
        if (filterSubject !== 'all' && e.subject !== filterSubject) return false;
        return true;
    }), [events, filterClass, filterTeacher, filterSubject]);

    const refreshStats = useCallback(async () => {
        const token = authService.getToken();
        if (!token) return;
        const next = await timetableService.getStats(token);
        setStats(next);
    }, []);

    const loadCalendarData = useCallback(async () => {
        const token = authService.getToken();
        if (!token) {
            setError('Bạn chưa đăng nhập.');
            return;
        }

        let start: Date;
        let end: Date;
        if (viewMode === 'week') {
            start = new Date(weekDates[0]);
            start.setHours(0, 0, 0, 0);
            end = new Date(weekDates[6]);
            end.setHours(23, 59, 59, 999);
        } else if (viewMode === 'today') {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
        } else {
            start = new Date(monthDate.year, monthDate.month, 1);
            end = new Date(monthDate.year, monthDate.month + 1, 0, 23, 59, 59, 999);
        }

        setLoading(true);
        setError(null);
        try {
            const list = await timetableService.getTimetables(start, end, token);
            setEvents(list.map(mapTimetableItem));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tải lịch học.');
        } finally {
            setLoading(false);
        }
    }, [viewMode, weekDates, monthDate]);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) {
            setError('Bạn chưa đăng nhập.');
            return;
        }

        (async () => {
            try {
                const [allClasses, allTeachersData, allSubjects] = await Promise.all([
                    classroomService.getAllClassrooms(token),
                    timetableService.getTeachers(token),
                    classroomService.getAllSubjects(token),
                ]);
                setClassrooms(allClasses);
                setTeachers(allTeachersData);
                setSubjects(allSubjects);
                await refreshStats();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu ban đầu.');
            }
        })();
    }, [refreshStats]);

    useEffect(() => {
        loadCalendarData();
    }, [loadCalendarData]);

    useEffect(() => {
        if (!createOpen && !singleEditOpen && !bulkEditOpen && !detailOpen) {
            setError(null);
        }
    }, [createOpen, singleEditOpen, bulkEditOpen, detailOpen]);

    const getHoverCardPosition = useCallback((rect: DOMRect, cardWidth: number) => {
        const x = Math.max(12, Math.min(window.innerWidth - cardWidth - 12, rect.right + 12));
        const y = Math.max(12, rect.top - 4);
        return { x, y };
    }, []);

    const showTooltip = useCallback((ev: ScheduleEvent, e: React.MouseEvent<HTMLElement>) => {
        clearTimeout(tooltipTimeout.current);
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = getHoverCardPosition(rect, 300);
        setTooltip({ type: 'event', event: ev, x: pos.x, y: pos.y });
    }, [getHoverCardPosition]);

    const showMoreTooltip = useCallback((title: string, items: ScheduleEvent[], e: React.MouseEvent<HTMLElement>) => {
        clearTimeout(tooltipTimeout.current);
        setHoverCardQuery('');
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = getHoverCardPosition(rect, 320);
        setTooltip({ type: 'more', title, items, x: pos.x, y: pos.y });
    }, [getHoverCardPosition]);

    const keepTooltipOpen = useCallback(() => {
        clearTimeout(tooltipTimeout.current);
    }, []);

    const hideTooltip = useCallback(() => {
        tooltipTimeout.current = setTimeout(() => setTooltip(null), 220);
    }, []);

    const openMoreDialog = useCallback((title: string, items: ScheduleEvent[]) => {
        setMoreDialog({ open: true, title, items });
    }, []);

    const handleCellClick = useCallback((dayIndex: number, hour: number) => {
        const d = weekDates[dayIndex];
        setFormData({
            classroomId: '',
            subject: '',
            teacherId: '',
            topic: '',
            date: d ? toDateKey(d) : '',
            startTime: fmtTime(hour),
            endTime: fmtTime(hour + 1.5),
            meetLink: '',
            repeatWeekly: false,
            selectedDays: [],
            repeatStartDate: '',
            repeatEndDate: '',
        });
        setCreateOpen(true);
    }, [weekDates]);

    const handleClassroomSelect = useCallback(async (classroomId: string) => {
        setFormData((p) => ({ ...p, classroomId }));
        const token = authService.getToken();
        if (!token || !classroomId) return;

        const classId = Number(classroomId);
        const quickInfo = classrooms.find((c) => c.classID === classId);
        const quickStart = normalizeDateInput(quickInfo?.startDate ?? null);
        const quickEnd = normalizeDateInput(quickInfo?.endDate ?? null);

        setFormData((p) => ({
            ...p,
            classroomId,
            subject: quickInfo?.subjectName ?? p.subject,
            repeatStartDate: quickStart || p.repeatStartDate,
            repeatEndDate: quickEnd || p.repeatEndDate,
        }));

        try {
            const detail = await classroomService.getClassroomById(classId, token);
            const startDate = normalizeDateInput(detail.startDate);
            const endDate = normalizeDateInput(detail.endDate);
            setFormData((p) => ({
                ...p,
                classroomId,
                subject: detail.subjectName ?? p.subject,
                teacherId: detail.teacherID ? String(detail.teacherID) : '',
                repeatStartDate: startDate || p.repeatStartDate,
                repeatEndDate: endDate || p.repeatEndDate,
            }));
        } catch {
            // Keep partial autofill from classroom list if detail call fails.
        }
    }, [classrooms]);

    const handleDragStart = useCallback((eventId: number, type: 'move' | 'resize', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const ev = events.find((x) => x.id === eventId);
        if (!ev) return;
        setDragState({ eventId, type, origEvent: { ...ev }, startX: e.clientX, startY: e.clientY, changed: false });
    }, [events]);

    useEffect(() => {
        if (!dragState) return;

        const handleMove = (e: MouseEvent) => {
            const dy = e.clientY - dragState.startY;
            const dx = e.clientX - dragState.startX;
            const colW = gridRef.current ? (gridRef.current.clientWidth - 60) / 7 : 150;
            const minuteDelta = Math.round(((dy / ROW_H) * 60) / DRAG_MINUTE_STEP) * DRAG_MINUTE_STEP;
            const dayDelta = Math.round(dx / colW);

            setEvents((prev) => prev.map((ev) => {
                if (ev.id !== dragState.eventId) return ev;

                if (dragState.type === 'move') {
                    const durationMinutes = Math.round(ev.duration * 60);
                    const originalStartMinutes = Math.round(dragState.origEvent.startHour * 60);
                    const minStartMinutes = HOURS_START * 60;
                    const maxStartMinutes = HOURS_END * 60 - durationMinutes;
                    const newStartMinutes = Math.max(minStartMinutes, Math.min(maxStartMinutes, originalStartMinutes + minuteDelta));
                    const newStart = newStartMinutes / 60;
                    const newDay = Math.max(0, Math.min(6, dragState.origEvent.dayIndex + dayDelta));
                    const dateKey = toDateKey(weekDates[newDay]);
                    const startTime = localDateTimeFromDateAndHour(dateKey, newStart);
                    const endTime = localDateTimeFromDateAndHour(dateKey, newStart + ev.duration);
                    return { ...ev, startHour: newStart, dayIndex: newDay, dateKey, startTime, endTime };
                }

                const originalDurationMinutes = Math.round(dragState.origEvent.duration * 60);
                const newDurationMinutes = Math.max(DRAG_MINUTE_STEP, originalDurationMinutes + minuteDelta);
                const maxDurationMinutes = HOURS_END * 60 - Math.round(ev.startHour * 60);
                const duration = Math.min(newDurationMinutes, maxDurationMinutes) / 60;
                const endTime = localDateTimeFromDateAndHour(ev.dateKey, ev.startHour + duration);
                return { ...ev, duration, endTime };
            }));

            setDragState((prev) => (prev ? { ...prev, changed: true } : prev));
        };

        const handleUp = async () => {
            const current = dragState;
            setDragState(null);
            if (!current.changed) return;

            const token = authService.getToken();
            const updated = events.find((ev) => ev.id === current.eventId);
            if (!token || !updated) return;

            try {
                await timetableService.updateSingleTimetable(updated.id, {
                    classID: updated.classID,
                    teacherID: updated.teacherID,
                    topic: updated.topic,
                    googleMeetLink: updated.meetLink,
                    startTime: updated.startTime,
                    endTime: updated.endTime,
                }, token);
                await refreshStats();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể cập nhật nhanh buổi học.');
                setEvents((prev) => prev.map((ev) => (ev.id === current.origEvent.id ? current.origEvent : ev)));
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragState, events, refreshStats, weekDates]);

    const openSingleEdit = useCallback((event: ScheduleEvent) => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const toHm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        setSingleEditData({
            classID: String(event.classID),
            teacherID: event.teacherID ? String(event.teacherID) : '',
            topic: event.topic,
            date: toDateKey(start),
            startTime: toHm(start),
            endTime: toHm(end),
            meetLink: event.meetLink ?? '',
        });
        setSingleEditOpen(true);
    }, []);

    const saveSingleEdit = useCallback(async () => {
        if (!selectedEvent) return;
        const token = authService.getToken();
        if (!token) return;

        setError(null);
        const fmtTimeApi = (t: string) => t.length === 5 ? `${t}:00` : t;

        try {
            await timetableService.updateSingleTimetable(selectedEvent.id, {
                classID: Number(singleEditData.classID),
                teacherID: singleEditData.teacherID ? Number(singleEditData.teacherID) : null,
                topic: singleEditData.topic,
                googleMeetLink: singleEditData.meetLink || undefined,
                startTime: `${singleEditData.date}T${fmtTimeApi(singleEditData.startTime)}`,
                endTime: `${singleEditData.date}T${fmtTimeApi(singleEditData.endTime)}`,
            }, token);
            setSingleEditOpen(false);
            setDetailOpen(false);
            await Promise.all([loadCalendarData(), refreshStats()]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể cập nhật buổi học.');
        }
    }, [selectedEvent, singleEditData, loadCalendarData, refreshStats]);

    const handleCreate = useCallback(async () => {
        const token = authService.getToken();
        if (!token) {
            setError('Bạn chưa đăng nhập.');
            return;
        }

        if (!formData.classroomId) {
            setError('Vui lòng chọn lớp học trước khi lưu buổi học.');
            return;
        }

        if (!formData.topic.trim()) {
            setError('Vui lòng nhập chủ đề buổi học.');
            return;
        }

        if (!formData.startTime || !formData.endTime) {
            setError('Vui lòng chọn đầy đủ giờ bắt đầu và giờ kết thúc.');
            return;
        }

        if (formData.endTime <= formData.startTime) {
            setError('Giờ kết thúc phải sau giờ bắt đầu.');
            return;
        }

        const classId = Number(formData.classroomId);
        const teacherId = formData.teacherId ? Number(formData.teacherId) : undefined;
        setError(null);
        
        const fmtTimeApi = (t: string) => t.length === 5 ? `${t}:00` : t;

        try {
            if (formData.repeatWeekly) {
                if (!formData.repeatStartDate || !formData.repeatEndDate) {
                    setError('Vui lòng chọn ngày bắt đầu và ngày kết thúc cho lịch lặp.');
                    return;
                }

                if (formData.repeatEndDate < formData.repeatStartDate) {
                    setError('Ngày kết thúc lịch lặp phải sau hoặc bằng ngày bắt đầu.');
                    return;
                }

                if (formData.selectedDays.length === 0) {
                    setError('Vui lòng chọn ít nhất một ngày trong tuần để tạo lịch lặp.');
                    return;
                }

                await timetableService.createRecurring({
                    classID: classId,
                    teacherID: teacherId,
                    topic: formData.topic,
                    googleMeetLink: formData.meetLink || undefined,
                    startDate: formData.repeatStartDate,
                    endDate: formData.repeatEndDate,
                    startTime: fmtTimeApi(formData.startTime),
                    endTime: fmtTimeApi(formData.endTime),
                    daysOfWeek: formData.selectedDays.map((d) => DAY_ENUMS[d]),
                }, token);
            } else {
                if (!formData.date) {
                    setError('Vui lòng chọn ngày học trước khi lưu buổi học.');
                    return;
                }

                await timetableService.createSingle({
                    classID: classId,
                    teacherID: teacherId,
                    topic: formData.topic,
                    googleMeetLink: formData.meetLink || undefined,
                    startTime: `${formData.date}T${fmtTimeApi(formData.startTime)}`,
                    endTime: `${formData.date}T${fmtTimeApi(formData.endTime)}`,
                }, token);
            }

            setCreateOpen(false);
            await Promise.all([loadCalendarData(), refreshStats()]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tạo buổi học.');
        }
    }, [formData, loadCalendarData, refreshStats]);

    const openBulkEdit = useCallback((classId: string) => {
        setBulkEditClassId(classId);
        const classInfo = classrooms.find((c) => String(c.classID) === classId);
        const target = events.filter((e) => String(e.classID) === classId);
        if (target.length > 0) {
            const first = target[0];
            setBulkEditData({
                subjectID: String(subjects.find((s) => s.subjectName === (classInfo?.subjectName ?? first.subject))?.subjectID ?? ''),
                teacherId: first.teacherID ? String(first.teacherID) : '',
                topic: '',
                startDate: normalizeDateInput(classInfo?.startDate),
                endDate: normalizeDateInput(classInfo?.endDate),
                startTime: fmtTime(first.startHour),
                endTime: fmtTime(first.startHour + first.duration),
                meetLink: first.meetLink ?? '',
            });
        } else {
            setBulkEditData({
                subjectID: '',
                teacherId: '',
                topic: '',
                startDate: normalizeDateInput(classInfo?.startDate),
                endDate: normalizeDateInput(classInfo?.endDate),
                startTime: '',
                endTime: '',
                meetLink: '',
            });
        }
        setBulkEditOpen(true);
    }, [classrooms, events, subjects]);

    const saveBulkEdit = useCallback(async () => {
        const token = authService.getToken();
        if (!token || !bulkEditClassId) return;

        setError(null);
        const fmtTimeApi = (t: string) => t && t.length === 5 ? `${t}:00` : t;

        try {
            await timetableService.bulkUpdateTimetable(Number(bulkEditClassId), {
                subjectID: bulkEditData.subjectID ? Number(bulkEditData.subjectID) : undefined,
                teacherID: bulkEditData.teacherId ? Number(bulkEditData.teacherId) : undefined,
                topic: bulkEditData.topic || undefined,
                startDate: bulkEditData.startDate || undefined,
                endDate: bulkEditData.endDate || undefined,
                startTime: bulkEditData.startTime ? fmtTimeApi(bulkEditData.startTime) : undefined,
                endTime: bulkEditData.endTime ? fmtTimeApi(bulkEditData.endTime) : undefined,
                googleMeetLink: bulkEditData.meetLink || undefined,
            }, token);

            setBulkEditOpen(false);
            await Promise.all([loadCalendarData(), refreshStats()]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể cập nhật hàng loạt.');
        }
    }, [bulkEditClassId, bulkEditData, loadCalendarData, refreshStats]);

    const handleDeleteSingle = useCallback(async () => {
        const token = authService.getToken();
        if (!token || !selectedEvent) return;

        try {
            await timetableService.deleteTimetable(selectedEvent.id, token);
            setDetailOpen(false);
            await Promise.all([loadCalendarData(), refreshStats()]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể xóa buổi học.');
        }
    }, [selectedEvent, loadCalendarData, refreshStats]);

    const handleDeleteByClass = useCallback(async () => {
        const token = authService.getToken();
        if (!token || !bulkEditClassId) return;

        try {
            await timetableService.deleteAllByClass(Number(bulkEditClassId), token);
            setBulkEditOpen(false);
            await Promise.all([loadCalendarData(), refreshStats()]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể xóa toàn bộ lịch của lớp.');
        }
    }, [bulkEditClassId, loadCalendarData, refreshStats]);

    const todayEvents = useMemo(() => {
        const key = toDateKey(new Date());
        return filteredEvents.filter((e) => e.dateKey === key).sort((a, b) => a.startHour - b.startHour);
    }, [filteredEvents]);

    const selectedBulkSubjectName = useMemo(() => {
        if (!bulkEditData.subjectID) return '';
        return subjects.find((s) => String(s.subjectID) === bulkEditData.subjectID)?.subjectName ?? '';
    }, [bulkEditData.subjectID, subjects]);

    const bulkSubjectTheme = useMemo(() => getSubjectColor(selectedBulkSubjectName), [selectedBulkSubjectName]);

    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* ── Header ──────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                        Thời khóa biểu
                        <CalendarBlank className="w-8 h-8 text-[#FF6B4A]" weight="fill" />
                    </h1>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setViewMode('today')}
                        className={`h-10 rounded-2xl border-2 px-4 text-sm font-extrabold transition-all ${
                            viewMode === 'today'
                                ? 'border-[#2563EB]/35 bg-[#EEF4FF] text-[#2563EB] shadow-sm'
                                : 'border-[#1A1A1A]/15 bg-white text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:border-[#1A1A1A]/25'
                        }`}
                    >
                        Lịch hôm nay
                    </button>

                    {/* Bulk edit button */}
                    <Select onValueChange={(v) => openBulkEdit(v)}>
                        <SelectTrigger className="w-[220px] bg-[#FFE8E0] rounded-2xl border-2 border-[#FF6B4A]/30 font-bold text-sm h-10 text-[#FF6B4A]">
                            <div className="flex items-center gap-2">
                                <ListChecks className="w-4 h-4" weight="bold" />
                                <span>Chỉnh sửa tất cả</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {classrooms.map((c) => (
                                <SelectItem key={c.classID} value={String(c.classID)}>
                                    Lớp {c.className}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View toggle */}
                    <div className="bg-white rounded-2xl border-2 border-[#1A1A1A]/20 p-1 flex gap-0.5">
                        {(['week', 'month'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={`px-4 py-1.5 text-sm font-extrabold rounded-xl transition-all ${viewMode === v ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70'}`}
                            >
                                {v === 'week' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                </div>
            )}

            {/* ── Mini Statistics ─────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng buổi hôm nay', value: stats.totalToday, bg: '#FCE38A' },
                    { label: 'Đang diễn ra', value: stats.ongoing, bg: '#95E1D3' },
                    { label: 'Sắp bắt đầu', value: stats.upcoming, bg: '#B8B5FF' },
                    { label: 'Đã kết thúc', value: stats.completed, bg: '#FFB5B5' },
                ].map((s) => (
                    <div key={s.label} className="rounded-3xl p-5 border-2 border-[#1A1A1A]" style={{ backgroundColor: s.bg }}>
                        <p className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider mb-3">{s.label}</p>
                        <h3 className="text-3xl font-extrabold text-[#1A1A1A]">{s.value}</h3>
                    </div>
                ))}
            </div>

            {/* ── Filters ─────────────────────────── */}
            <div className="flex flex-wrap gap-3 items-center">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Lọc:</span>
                {[
                    { label: 'Lớp học', value: filterClass, setter: setFilterClass, options: allClassrooms },
                    { label: 'Giáo viên', value: filterTeacher, setter: setFilterTeacher, options: allTeachers },
                    { label: 'Môn học', value: filterSubject, setter: setFilterSubject, options: allSubjects },
                ].map((f) => (
                    <Select key={f.label} value={f.value} onValueChange={f.setter}>
                        <SelectTrigger className="w-[170px] bg-white rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                            <SelectValue placeholder={`Tất cả ${f.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả {f.label.toLowerCase()}</SelectItem>
                            {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                ))}
                {(filterClass !== 'all' || filterTeacher !== 'all' || filterSubject !== 'all') && (
                    <button
                        onClick={() => {
                            setFilterClass('all');
                            setFilterTeacher('all');
                            setFilterSubject('all');
                        }}
                        className="text-xs font-bold text-[#FF6B4A] hover:underline"
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            {/* ── Main area ───────────────────────── */}
            {viewMode === 'today' ? (
                <TodayTimelineView
                    events={todayEvents}
                    loading={loading}
                    onEventClick={(ev) => { setSelectedEvent(ev); setDetailOpen(true); }}
                    onShowTooltip={showTooltip}
                    onHideTooltip={hideTooltip}
                />
            ) : (
                <div className="flex flex-col lg:flex-row gap-5 items-start">
                    {/* Calendar */}
                    <div className="flex-1 min-w-0">
                        {viewMode === 'week' ? (
                            <WeekView
                                weekDates={weekDates}
                                events={filteredEvents}
                                todayDayIndex={todayDayIndex}
                                weekOffset={weekOffset}
                                setWeekOffset={setWeekOffset}
                                onEventClick={(ev) => { setSelectedEvent(ev); setDetailOpen(true); }}
                                onCellClick={handleCellClick}
                                onShowTooltip={showTooltip}
                                onShowMoreTooltip={showMoreTooltip}
                                onHideTooltip={hideTooltip}
                                loading={loading}
                                onDragStart={handleDragStart}
                                gridRef={gridRef}
                                draggingEventId={dragState?.eventId ?? null}
                                onOpenMore={openMoreDialog}
                            />
                        ) : (
                            <MonthView
                                year={monthDate.year}
                                month={monthDate.month}
                                events={filteredEvents}
                                onPrev={() => setMonthDate((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })}
                                onNext={() => setMonthDate((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })}
                                onEventClick={(ev) => { setSelectedEvent(ev); setDetailOpen(true); }}
                                loading={loading}
                                onOpenMore={openMoreDialog}
                            />
                        )}
                    </div>

                    {/* ── Right panel (Collapsible Sidebar) ─────────────────── */}
                    <div className={`shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-full lg:w-80' : 'w-10'}`}>
                        {/* Toggle button */}
                        <button
                            onClick={() => setSidebarOpen((p) => !p)}
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
                            <div className="flex flex-col gap-4">
                                {/* Create form card */}
                                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-5 shadow-sm">
                                    <h3 className="font-extrabold text-base text-[#1A1A1A] mb-4 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-[#FF6B4A] flex items-center justify-center">
                                            <Plus className="w-4 h-4 text-white" weight="fill" />
                                        </div>
                                        Tạo buổi học mới
                                    </h3>
                                    <CreateForm
                                        formData={formData}
                                        setFormData={setFormData}
                                        onCreate={handleCreate}
                                        classrooms={classrooms}
                                        teachers={teachers}
                                        onClassroomSelect={handleClassroomSelect}
                                    />
                                </div>

                                {/* Status legend */}
                                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-5 shadow-sm">
                                    <h4 className="font-extrabold text-sm text-[#1A1A1A] mb-3">Chú thích trạng thái</h4>
                                    <div className="space-y-2">
                                        {([
                                            { status: 'completed' as const, label: 'Đã kết thúc' },
                                            { status: 'ongoing' as const, label: 'Đang diễn ra' },
                                            { status: 'upcoming' as const, label: 'Sắp tới' },
                                        ]).map((item) => {
                                            const stCard = STATUS_CARD_STYLES[item.status];
                                            return (
                                                <div key={item.status} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
                                                    <div className="w-4 h-4 rounded-md border" style={{ backgroundColor: stCard.bg, borderColor: stCard.border }} />
                                                    <span className="text-xs font-bold" style={{ color: stCard.text }}>{item.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[#1A1A1A]/10 space-y-2">
                                        <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
                                            <div className="inline-flex items-center justify-center w-4 h-4 rounded border border-[#86EFAC] bg-[#DCFCE7]">
                                                <VideoCamera className="w-2.5 h-2.5 text-[#15803D]" weight="fill" />
                                            </div>
                                            <span className="text-xs font-bold text-[#166534]">Có link Meet</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
                                            <div className="inline-flex items-center justify-center h-4 rounded border border-[#FDBA74] bg-[#FFF7ED] px-1 text-[8px] font-extrabold text-[#C2410C]">!</div>
                                            <span className="text-xs font-bold text-[#C2410C]">Chưa có link Meet</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tooltip ─────────────────────────── */}
            {tooltip && (
                <div
                    className="fixed z-[120] pointer-events-auto"
                    style={{ left: tooltip.x, top: tooltip.y }}
                    onMouseEnter={keepTooltipOpen}
                    onMouseLeave={hideTooltip}
                >
                    {tooltip.type === 'event' ? (
                        (() => {
                            const ev = tooltip.event;
                            const st = STATUS_LABELS[ev.status];
                            const stCard = STATUS_CARD_STYLES[ev.status];
                            return (
                                <div className="w-[300px] rounded-2xl border-2 p-3 shadow-2xl" style={{ borderColor: stCard.border, backgroundColor: stCard.bg }}>
                                    <div className="text-sm font-extrabold" style={{ color: stCard.text }}>{ev.subject}</div>
                                    <div className="text-xs font-semibold text-gray-500 mt-0.5">Lớp {ev.classroom}</div>
                                    <div className="text-xs font-semibold text-gray-500">GV: {ev.teacher}</div>
                                    <div className="text-xs font-semibold text-gray-500 truncate">Chủ đề: {ev.topic}</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: hasMeetLink(ev.meetLink) ? '#15803D' : '#C2410C' }}>
                                        <VideoCamera className="w-3 h-3" weight={hasMeetLink(ev.meetLink) ? 'fill' : 'regular'} />
                                        {hasMeetLink(ev.meetLink) ? 'Có link Meet' : 'Chưa có link Meet'}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-gray-400">{fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}</span>
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{ backgroundColor: st.bgColor, color: st.color }}>{st.label}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedEvent(ev);
                                            setDetailOpen(true);
                                            setTooltip(null);
                                        }}
                                        className="mt-2 rounded-lg bg-[#1A1A1A] text-white px-2.5 py-1 text-[11px] font-extrabold hover:bg-[#2A2A2A]"
                                    >
                                        Xem chi tiết
                                    </button>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="w-[320px] rounded-2xl border-2 border-[#FF6B4A]/30 bg-white p-3 shadow-2xl">
                            <div className="text-xs font-extrabold text-[#1A1A1A] mb-2">{tooltip.title}</div>
                            <input
                                value={hoverCardQuery}
                                onChange={(e) => setHoverCardQuery(e.target.value)}
                                placeholder="Lọc nhanh sự kiện"
                                className="w-full mb-2 rounded-lg border border-[#1A1A1A]/20 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#FF6B4A]"
                            />
                            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                                {tooltip.items
                                    .filter((ev) => {
                                        if (!hoverCardQuery.trim()) return true;
                                        const q = normalizeVietnamese(hoverCardQuery);
                                        const haystack = normalizeVietnamese(`${ev.classroom} ${ev.teacher} ${ev.subject} ${ev.topic}`);
                                        return haystack.includes(q);
                                    })
                                    .map((ev) => {
                                    const stCard = STATUS_CARD_STYLES[ev.status];
                                    return (
                                        <button
                                            type="button"
                                            key={ev.id}
                                            onClick={() => {
                                                setSelectedEvent(ev);
                                                setDetailOpen(true);
                                                setTooltip(null);
                                            }}
                                            className="w-full text-left rounded-lg border px-2 py-1.5 text-xs hover:brightness-95 transition-colors"
                                            style={{ borderColor: stCard.border, backgroundColor: stCard.bg }}
                                        >
                                            <div className="font-extrabold truncate" style={{ color: stCard.text }}>{fmtTime(ev.startHour)} {ev.subject}</div>
                                            <div className="font-semibold text-gray-500 truncate">Lớp {ev.classroom} · GV: {ev.teacher}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        openMoreDialog(tooltip.title, tooltip.items);
                                        setTooltip(null);
                                    }}
                                    className="rounded-lg bg-[#FF6B4A] text-white px-3 py-1.5 text-xs font-extrabold hover:bg-[#ff5535]"
                                >
                                    Mở danh sách đầy đủ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTooltip(null)}
                                    className="rounded-lg border border-[#1A1A1A]/20 px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-gray-50"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Detail / Edit Dialog ─────────────── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="rounded-3xl max-w-lg">
                    {selectedEvent && (
                        <>
                            {(() => {
                                const statusMeta = STATUS_LABELS[selectedEvent.status];
                                return (
                                    <div className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
                                        style={{ backgroundColor: statusMeta.bgColor, color: statusMeta.color }}>
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                                        Trạng thái: {statusMeta.label}
                                    </div>
                                );
                            })()}
                            <DialogHeader>
                                <DialogTitle className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getSubjectColor(selectedEvent.subject).dot }} />
                                    {selectedEvent.subject}
                                </DialogTitle>
                                <DialogDescription>
                                    Lớp {selectedEvent.classroom} · {selectedEvent.teacher}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-3 space-y-2 text-sm font-semibold text-[#1A1A1A]/75">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Thời gian</span>
                                        <span className="font-extrabold text-[#1A1A1A]">
                                            {fmtDateVN(selectedEvent.startTime)} · {fmtTime(selectedEvent.startHour)} - {fmtTime(selectedEvent.startHour + selectedEvent.duration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Chủ đề</span>
                                        <span className="font-bold text-[#1A1A1A] text-right">{selectedEvent.topic}</span>
                                    </div>
                                </div>

                                {selectedEvent.meetLink && (
                                    <a
                                        href={selectedEvent.meetLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl border-2 border-[#2563EB]/20 bg-[#EEF4FF] px-3 py-2 text-[#2563EB] hover:bg-[#E2ECFF] text-sm font-extrabold transition-colors"
                                    >
                                        <VideoCamera className="w-4 h-4" weight="fill" />
                                        Mở Google Meet
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3">
                                <button
                                    onClick={() => openSingleEdit(selectedEvent)}
                                    className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-1.5"
                                >
                                    <PencilSimple className="w-4 h-4" weight="bold" />
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={handleDeleteSingle}
                                    className="bg-red-500 hover:bg-red-600 text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-1.5"
                                >
                                    <Trash className="w-4 h-4" weight="bold" />
                                    Xóa buổi học
                                </button>
                                <button
                                    onClick={() => {
                                        setDetailOpen(false);
                                        openBulkEdit(String(selectedEvent.classID));
                                    }}
                                    className="bg-[#FFE8E0] hover:bg-[#FFD5C8] text-[#FF6B4A] font-extrabold py-2.5 rounded-xl transition-all text-sm border-2 border-[#FF6B4A]/20"
                                >
                                    Chỉnh sửa tất cả
                                </button>
                                <button
                                    onClick={() => {
                                        setDetailOpen(false);
                                        setIsAttendanceOpen(true);
                                    }}
                                    className="md:col-span-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] font-extrabold py-3 rounded-xl transition-all text-sm border-2 border-[#1A1A1A]/10 flex items-center justify-center gap-1.5"
                                >
                                    <Users className="w-4 h-4" weight="bold" />
                                    Điểm danh học sinh
                                </button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <AttendanceModal
                isOpen={isAttendanceOpen}
                onClose={() => setIsAttendanceOpen(false)}
                event={selectedEvent ? {
                    id: selectedEvent.id,
                    title: selectedEvent.subject,
                    className: selectedEvent.classroom,
                    startTime: selectedEvent.startTime,
                    endTime: selectedEvent.endTime
                } : null}
                isAdmin={true}
            />

            <Dialog open={singleEditOpen} onOpenChange={setSingleEditOpen}>
                <DialogContent className="rounded-3xl max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-[#1A1A1A] flex items-center gap-2">
                            <PencilSimple className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                            Chỉnh sửa buổi học
                        </DialogTitle>
                        <DialogDescription>Chỉnh sửa nhanh thông tin cho một buổi học</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Lớp học</Label>
                            <Select value={singleEditData.classID} onValueChange={(v) => setSingleEditData((p) => ({ ...p, classID: v }))}>
                                <SelectTrigger className="bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {classrooms.map((o) => <SelectItem key={o.classID} value={String(o.classID)}>{o.className}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giáo viên</Label>
                            <Select value={singleEditData.teacherID || undefined} onValueChange={(v) => setSingleEditData((p) => ({ ...p, teacherID: v }))}>
                                <SelectTrigger className="bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                                    <SelectValue placeholder="Bỏ phân công" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((o) => <SelectItem key={o.teacherID} value={String(o.teacherID)}>{o.fullName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2">
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Chủ đề</Label>
                            <Input value={singleEditData.topic} onChange={(e) => setSingleEditData((p) => ({ ...p, topic: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                        </div>

                        <div>
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày</Label>
                            <Input type="date" value={singleEditData.date} onChange={(e) => setSingleEditData((p) => ({ ...p, date: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Bắt đầu</Label>
                                <Input type="time" value={singleEditData.startTime} onChange={(e) => setSingleEditData((p) => ({ ...p, startTime: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Kết thúc</Label>
                                <Input type="time" value={singleEditData.endTime} onChange={(e) => setSingleEditData((p) => ({ ...p, endTime: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Google Meet</Label>
                            <Input value={singleEditData.meetLink} onChange={(e) => setSingleEditData((p) => ({ ...p, meetLink: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => setSingleEditOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-extrabold py-2.5 rounded-xl transition-all text-sm">Hủy</button>
                        <button onClick={saveSingleEdit} className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold py-2.5 rounded-xl transition-all text-sm">Lưu thay đổi</button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={moreDialog.open} onOpenChange={(open) => setMoreDialog((p) => ({ ...p, open }))}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-[#1A1A1A]">{moreDialog.title}</DialogTitle>
                        <DialogDescription>Danh sách lớp trong khung giờ này</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                        {moreDialog.items.map((ev) => (
                            <button
                                key={ev.id}
                                onClick={() => {
                                    setMoreDialog((p) => ({ ...p, open: false }));
                                    setSelectedEvent(ev);
                                    setDetailOpen(true);
                                }}
                                className="w-full text-left rounded-xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] px-3 py-2 hover:border-[#FF6B4A]/35 transition-colors"
                            >
                                <div className="text-sm font-extrabold text-[#1A1A1A]">Lớp {ev.classroom}</div>
                                <div className="text-[11px] text-gray-500 font-semibold">{ev.subject} · {fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}</div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Create Dialog ───────────────────── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#FF6B4A] flex items-center justify-center">
                                <Plus className="w-4 h-4 text-white" weight="fill" />
                            </div>
                            Tạo buổi học mới
                        </DialogTitle>
                        <DialogDescription className="sr-only">Tạo buổi học mới</DialogDescription>
                    </DialogHeader>
                    <CreateForm
                        formData={formData}
                        setFormData={setFormData}
                        onCreate={handleCreate}
                        classrooms={classrooms}
                        teachers={teachers}
                        onClassroomSelect={handleClassroomSelect}
                        error={error}
                    />
                </DialogContent>
            </Dialog>

            {/* ── Bulk Edit Dialog ────────────────── */}
            <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
                <DialogContent className="rounded-3xl max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] flex items-center justify-center">
                                <ListChecks className="w-5 h-5 text-white" weight="bold" />
                            </div>
                            Chỉnh sửa hàng loạt — Lớp {classrooms.find((c) => String(c.classID) === bulkEditClassId)?.className ?? ''}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div
                            className="md:col-span-2 rounded-xl border-2 p-3"
                            style={{ backgroundColor: bulkSubjectTheme.bg, borderColor: `${bulkSubjectTheme.border}66` }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: bulkSubjectTheme.text }}>
                                    Thông tin chung
                                </Label>
                                {selectedBulkSubjectName && (
                                    <span
                                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: bulkSubjectTheme.dot, color: '#fff' }}
                                    >
                                        {selectedBulkSubjectName}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 block">Môn học</Label>
                                    <Select value={bulkEditData.subjectID || undefined} onValueChange={(v) => setBulkEditData((p) => ({ ...p, subjectID: v }))}>
                                        <SelectTrigger className="bg-white rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                                            <SelectValue placeholder="Giữ nguyên" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.map((o) => <SelectItem key={o.subjectID} value={String(o.subjectID)}>{o.subjectName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 block">Giáo viên</Label>
                                    <Select value={bulkEditData.teacherId || undefined} onValueChange={(v) => setBulkEditData((p) => ({ ...p, teacherId: v }))}>
                                        <SelectTrigger className="bg-white rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                                            <SelectValue placeholder="Giữ nguyên" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map((o) => <SelectItem key={o.teacherID} value={String(o.teacherID)}>{o.fullName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-2">
                                    <Label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1 block">Chủ đề</Label>
                                    <Input
                                        value={bulkEditData.topic}
                                        onChange={(e) => setBulkEditData((p) => ({ ...p, topic: e.target.value }))}
                                        placeholder="Để trống nếu giữ nguyên"
                                        className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 rounded-xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-3">
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 block">Thời gian</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày bắt đầu</Label>
                                    <Input type="date" value={bulkEditData.startDate} onChange={(e) => setBulkEditData((p) => ({ ...p, startDate: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9" />
                                </div>

                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày kết thúc</Label>
                                    <Input type="date" value={bulkEditData.endDate} onChange={(e) => setBulkEditData((p) => ({ ...p, endDate: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9" />
                                </div>

                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giờ bắt đầu</Label>
                                    <Input type="time" value={bulkEditData.startTime} onChange={(e) => setBulkEditData((p) => ({ ...p, startTime: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9" />
                                </div>

                                <div>
                                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giờ kết thúc</Label>
                                    <Input type="time" value={bulkEditData.endTime} onChange={(e) => setBulkEditData((p) => ({ ...p, endTime: e.target.value }))} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9" />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 rounded-xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-3">
                            <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 block">Phòng học trực tuyến</Label>
                            <Input
                                value={bulkEditData.meetLink}
                                onChange={(e) => setBulkEditData((p) => ({ ...p, meetLink: e.target.value }))}
                                placeholder="https://meet.google.com/..."
                                className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                        <button onClick={() => setBulkEditOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-[#1A1A1A] font-extrabold py-2.5 rounded-xl transition-all text-sm">
                            Hủy bỏ
                        </button>
                        <button onClick={saveBulkEdit} className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                            <FloppyDisk className="w-4 h-4" weight="bold" />
                            Áp dụng
                        </button>
                        <button onClick={handleDeleteByClass} className="bg-red-500 hover:bg-red-600 text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                            <Trash className="w-4 h-4" weight="bold" />
                            Xóa toàn bộ lịch lớp
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Create Form Sub-component ────────────────────────────────────────
function CreateForm({
    formData,
    setFormData,
    onCreate,
    classrooms,
    teachers,
    onClassroomSelect,
    error,
}: {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    onCreate: () => void;
    classrooms: ClassroomItem[];
    teachers: TeacherItem[];
    onClassroomSelect: (classroomId: string) => void;
    error?: string | null;
}) {
    const upd = <K extends keyof FormData>(k: K, v: FormData[K]) => setFormData((p) => ({ ...p, [k]: v }));

    const selectedClassInfo = useMemo(() => {
        if (!formData.classroomId) return null;
        return classrooms.find((c) => c.classID === Number(formData.classroomId)) ?? null;
    }, [formData.classroomId, classrooms]);

    const toggleDay = (dayIdx: number) => {
        setFormData((p) => {
            const days = p.selectedDays.includes(dayIdx)
                ? p.selectedDays.filter((d) => d !== dayIdx)
                : [...p.selectedDays, dayIdx].sort();
            return { ...p, selectedDays: days };
        });
    };

    return (
        <div className="space-y-3">
            {/* Classroom selector */}
            <div>
                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Lớp học</Label>
                <Select
                    value={formData.classroomId || undefined}
                    onValueChange={(v) => onClassroomSelect(v)}
                >
                    <SelectTrigger className="bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                        <SelectValue placeholder="Chọn lớp học" />
                    </SelectTrigger>
                    <SelectContent>
                        {classrooms.map((o) => <SelectItem key={o.classID} value={String(o.classID)}>{o.className}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Môn học</Label>
                <Input value={formData.subject} readOnly className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
            </div>

            <div>
                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giáo viên</Label>
                <Select value={formData.teacherId || undefined} onValueChange={(v) => upd('teacherId', v)}>
                    <SelectTrigger className="bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/20 font-bold text-sm h-9">
                        <SelectValue placeholder="Chọn giáo viên" />
                    </SelectTrigger>
                    <SelectContent>
                        {teachers.map((o) => <SelectItem key={o.teacherID} value={String(o.teacherID)}>{o.fullName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {selectedClassInfo && (
                <div className="bg-[#E0F4FF] rounded-xl border-2 border-[#4AB8F0]/30 px-3 py-2.5 flex items-start gap-2">
                    <CalendarBlank className="w-4 h-4 text-[#4AB8F0] mt-0.5 shrink-0" weight="fill" />
                    <div>
                        <div className="text-[11px] font-bold text-[#1A5A7A]">
                            Lớp {selectedClassInfo.className} · {selectedClassInfo.subjectName}
                        </div>
                        <div className="text-[10px] text-[#1A5A7A]/60 font-semibold mt-0.5">
                            {selectedClassInfo.startDate && selectedClassInfo.endDate
                                ? `Thời gian lớp: ${fmtDateVN(selectedClassInfo.startDate)} - ${fmtDateVN(selectedClassInfo.endDate)}`
                                : 'Chưa có mốc thời gian lớp học'}
                        </div>
                    </div>
                </div>
            )}

            <div>
                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Chủ đề / Topic</Label>
                <Input value={formData.topic} onChange={(e) => upd('topic', e.target.value)} placeholder="Ví dụ: Học chương 3" className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
            </div>

            {/* ─── Repeat Weekly Toggle ─── */}
            <div className="bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/10 p-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <button
                        type="button"
                        onClick={() => upd('repeatWeekly', !formData.repeatWeekly)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${formData.repeatWeekly ? 'bg-[#FF6B4A]' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${formData.repeatWeekly ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <div className="flex items-center gap-1.5">
                        <Repeat className={`w-4 h-4 ${formData.repeatWeekly ? 'text-[#FF6B4A]' : 'text-gray-400'}`} weight="bold" />
                        <span className={`text-sm font-bold ${formData.repeatWeekly ? 'text-[#1A1A1A]' : 'text-gray-500'}`}>
                            Lặp lại hàng tuần
                        </span>
                    </div>
                </label>

                {formData.repeatWeekly && (
                    <div className="mt-3 space-y-3">
                        {/* Day-of-week selector */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Chọn các ngày trong tuần</div>
                            <div className="flex gap-1.5">
                                {DAY_LABELS.map((label, idx) => {
                                    const selected = formData.selectedDays.includes(idx);
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleDay(idx)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all border-2
                                                ${selected
                                                    ? 'bg-[#FF6B4A] text-white border-[#FF6B4A] shadow-md shadow-[#FF6B4A]/20'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#FF6B4A]/40 hover:text-[#FF6B4A]'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            {formData.selectedDays.length > 0 && (
                                <div className="text-[10px] font-semibold text-[#FF6B4A]">
                                    Đã chọn: {formData.selectedDays.map(d => DAY_FULL_LABELS[d]).join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Date range for repeat */}
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#1A1A1A]/10">
                            <div>
                                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày bắt đầu</Label>
                                <Input
                                    type="date"
                                    value={formData.repeatStartDate}
                                    onChange={e => upd('repeatStartDate', e.target.value)}
                                    className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày kết thúc</Label>
                                <Input
                                    type="date"
                                    value={formData.repeatEndDate}
                                    onChange={e => upd('repeatEndDate', e.target.value)}
                                    className="rounded-xl border-2 border-[#1A1A1A]/20 bg-white font-semibold text-sm h-9"
                                />
                            </div>
                        </div>

                        {/* Summary hint */}
                        {formData.repeatStartDate && formData.repeatEndDate && formData.selectedDays.length > 0 && (
                            <div className="bg-[#FFF9E0] rounded-xl border-2 border-[#F5D623]/30 px-3 py-2 text-[11px] font-bold text-[#8B7300]">
                                🔁 Tạo buổi vào <span className="font-extrabold">{formData.selectedDays.map(d => DAY_FULL_LABELS[d]).join(', ')}</span> từ <span className="font-extrabold">{fmtDateVN(formData.repeatStartDate)}</span> → <span className="font-extrabold">{fmtDateVN(formData.repeatEndDate)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Date (only show if NOT repeat) */}
            {!formData.repeatWeekly && (
                <div>
                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ngày</Label>
                    <Input type="date" value={formData.date} onChange={e => upd('date', e.target.value)} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                </div>
            )}

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giờ bắt đầu</Label>
                    <Input type="time" value={formData.startTime} onChange={e => upd('startTime', e.target.value)} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                </div>
                <div>
                    <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Giờ kết thúc</Label>
                    <Input type="time" value={formData.endTime} onChange={e => upd('endTime', e.target.value)} className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
                </div>
            </div>

            {/* Meet link */}
            <div>
                <Label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Link Google Meet</Label>
                <Input value={formData.meetLink} onChange={e => upd('meetLink', e.target.value)} placeholder="https://meet.google.com/..." className="rounded-xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] font-semibold text-sm h-9" />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* Submit button */}
            <button onClick={onCreate} className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                {formData.repeatWeekly ? (
                    <>
                        <Repeat className="w-4 h-4" weight="bold" />
                        Tạo lịch lặp ({formData.selectedDays.length} ngày/tuần)
                    </>
                ) : (
                    'Lưu buổi học'
                )}
            </button>
        </div>
    );
}

// ─── Week View ────────────────────────────────────────────────────────
function WeekView({
    weekDates,
    events,
    todayDayIndex,
    weekOffset,
    setWeekOffset,
    onEventClick,
    onCellClick,
    onShowTooltip,
    onShowMoreTooltip,
    onHideTooltip,
    loading,
    onDragStart,
    gridRef,
    draggingEventId,
    onOpenMore,
}: {
    weekDates: Date[];
    events: ScheduleEvent[];
    todayDayIndex: number;
    weekOffset: number;
    setWeekOffset: (v: number | ((p: number) => number)) => void;
    onEventClick: (ev: ScheduleEvent) => void;
    onCellClick: (dayIndex: number, hour: number) => void;
    onShowTooltip: (ev: ScheduleEvent, e: React.MouseEvent<HTMLElement>) => void;
    onShowMoreTooltip: (title: string, items: ScheduleEvent[], e: React.MouseEvent<HTMLElement>) => void;
    onHideTooltip: () => void;
    loading: boolean;
    onDragStart: (eventId: number, type: 'move' | 'resize', e: React.MouseEvent) => void;
    gridRef: React.RefObject<HTMLDivElement>;
    draggingEventId: number | null;
    onOpenMore: (title: string, items: ScheduleEvent[]) => void;
}) {
    const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

    const slotGroups = useMemo(() => {
        const grouped = new Map<string, ScheduleEvent[]>();
        for (const ev of events) {
            const key = `${ev.dayIndex}-${ev.startHour}-${ev.duration}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)?.push(ev);
        }

        return Array.from(grouped.entries())
            .map(([key, items]) => ({
                key,
                items: items.sort((a, b) => a.classroom.localeCompare(b.classroom, 'vi')),
            }))
            .sort((a, b) => {
                const [da, sa] = a.key.split('-').map(Number);
                const [db, sb] = b.key.split('-').map(Number);
                if (da !== db) return da - db;
                return sa - sb;
            });
    }, [events]);

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden shadow-sm">
            {/* Week nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#1A1A1A]">
                <button onClick={() => setWeekOffset((p) => p - 1)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 transition-colors">‹</button>
                <span className="text-sm font-extrabold text-[#1A1A1A]">
                    {weekDates[0]?.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — {weekDates[6]?.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                <div className="flex gap-1.5">
                    {weekOffset !== 0 && (
                        <button onClick={() => setWeekOffset(0)} className="px-3 h-8 rounded-xl bg-[#FF6B4A]/10 text-[#FF6B4A] font-bold text-xs hover:bg-[#FF6B4A]/20 transition-colors">
                            Hôm nay
                        </button>
                    )}
                    <button onClick={() => setWeekOffset((p) => p + 1)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 transition-colors">›</button>
                </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b-2 border-[#1A1A1A]">
                <div className="p-2" />
                {weekDates.map((d, i) => {
                    const isToday = i === todayDayIndex;
                    return (
                        <div key={i} className={`p-2 text-center border-l border-[#1A1A1A]/10 ${isToday ? 'bg-[#FF6B4A]' : ''}`}>
                            <div className={`text-[10px] font-extrabold ${isToday ? 'text-white/70' : 'text-gray-400'}`}>{DAY_LABELS[i]}</div>
                            <div className={`text-lg font-extrabold ${isToday ? 'text-white' : 'text-[#1A1A1A]'}`}>{d.getDate()}</div>
                        </div>
                    );
                })}
            </div>

            {/* Grid body */}
            <div className="relative" ref={gridRef}>
                {loading && <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px]" />}
                {HOUR_SLOTS.map((hour) => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#1A1A1A]/10">
                        <div className="py-2 flex justify-center items-start text-[11px] font-extrabold text-gray-400 border-r border-[#1A1A1A]/10" style={{ height: ROW_H }}>
                            {fmtTime(hour)}
                        </div>
                        {Array.from({ length: 7 }, (_, dx) => (
                            <div key={dx} onClick={() => onCellClick(dx, hour)} className={`border-l border-[#1A1A1A]/10 relative cursor-pointer hover:bg-[#FF6B4A]/[0.03] ${dx === todayDayIndex ? 'bg-[#FF6B4A]/[0.04]' : ''}`} style={{ height: ROW_H }} />
                        ))}
                    </div>
                ))}

                {slotGroups.map((group) => {
                    const first = group.items[0];
                    const top = (first.startHour - HOURS_START) * ROW_H;
                    const height = first.duration * ROW_H;
                    const colW = `calc((100% - 60px) / 7)`;
                    const leftBase = `calc(60px + ${first.dayIndex} * ${colW})`;
                    const totalItems = group.items.length;
                    const useOverlap = totalItems >= 3;

                    if (!useOverlap) {
                        // ── Normal layout: 1-2 cards side by side ──
                        const columns = totalItems;
                        return (
                            <div key={group.key} className="absolute" style={{ top, left: leftBase, width: colW, height, zIndex: 20 }}>
                                {group.items.map((ev, idx) => {
                                    const st = STATUS_LABELS[ev.status];
                                    const stCard = STATUS_CARD_STYLES[ev.status];
                                    const isHovered = hoveredCardId === ev.id;
                                    const alwaysShowDetails = totalItems === 1;
                                    const showDetails = alwaysShowDetails || isHovered;
                                    const baseZ = idx + 1;
                                    return (
                                        <div
                                            key={ev.id}
                                            className="absolute px-0.5"
                                            style={{
                                                width: `calc(100% / ${columns})`,
                                                left: `calc(${idx} * (100% / ${columns}))`,
                                                top: 1,
                                                height: 'calc(100% - 2px)',
                                                zIndex: isHovered ? 50 : baseZ,
                                                transform: isHovered ? 'scale(1.12) translateY(-6px)' : 'scale(1)',
                                                transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), z-index 0s',
                                            }}
                                            onMouseEnter={() => setHoveredCardId(ev.id)}
                                            onMouseLeave={() => setHoveredCardId(null)}
                                        >
                                            <div
                                                onMouseEnter={(e) => onShowTooltip(ev, e)}
                                                onMouseLeave={onHideTooltip}
                                                onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                                onMouseDown={(e) => onDragStart(ev.id, 'move', e)}
                                                className={`relative h-full rounded-xl border-2 p-2 flex flex-col cursor-pointer overflow-hidden ${draggingEventId === ev.id ? 'ring-2 ring-[#FF6B4A]/30' : ''}`}
                                                style={{
                                                    backgroundColor: stCard.bg,
                                                    borderColor: stCard.border,
                                                    boxShadow: isHovered
                                                        ? `0 8px 25px rgba(0,0,0,0.18), 0 0 0 2px ${stCard.border}40`
                                                        : stCard.glow,
                                                    transition: 'box-shadow 0.22s cubic-bezier(.4,0,.2,1), border-color 0.15s ease',
                                                }}
                                            >
                                                {hasMeetLink(ev.meetLink) ? (
                                                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-md border border-[#86EFAC] bg-[#DCFCE7] p-1" title="Có link Meet">
                                                        <VideoCamera className="w-2.5 h-2.5 text-[#15803D]" weight="fill" />
                                                    </span>
                                                ) : (
                                                    <span className="absolute top-1.5 right-1.5 rounded-md bg-[#FFF7ED] px-1.5 py-0.5 text-[8px] font-extrabold text-[#C2410C] border border-[#FDBA74]" title="Chưa có link Meet">
                                                        !
                                                    </span>
                                                )}
                                                <div className="text-[13px] font-extrabold leading-tight truncate" style={{ color: stCard.text }}>{ev.subject}</div>
                                                <div className="text-[12px] font-bold text-gray-500 truncate">{ev.classroom}</div>

                                                <div
                                                    className="overflow-hidden"
                                                    style={{
                                                        maxHeight: showDetails ? 68 : 0,
                                                        opacity: showDetails ? 1 : 0,
                                                        transition: 'max-height 0.25s ease, opacity 0.2s ease',
                                                        marginTop: showDetails ? 3 : 0,
                                                    }}
                                                >
                                                    <div className="text-[11px] font-semibold text-gray-400 truncate">GV: {ev.teacher}</div>
                                                    <div className="text-[11px] font-bold text-gray-400 truncate mt-0.5">{fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}</div>
                                                    <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-0.5" style={{ backgroundColor: st.bgColor, color: st.color }}>{st.label}</span>
                                                </div>

                                                <div className="mt-auto" />
                                                <div
                                                    onMouseDown={(e) => onDragStart(ev.id, 'resize', e)}
                                                    className="mt-1 h-2 rounded-full bg-[#1A1A1A]/15 hover:bg-[#FF6B4A]/40"
                                                    title="Kéo để đổi thời lượng"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    // ── Overlap layout: 3+ cards with horizontal cascading ──
                    const MAX_VISIBLE = 3;
                    const shown = group.items.slice(0, MAX_VISIBLE);
                    const hiddenCount = totalItems - MAX_VISIBLE;
                    const hasMoreBtn = hiddenCount > 0;

                    // Exactly 3 cards: widen and spread to fit the day cell better.
                    // 4+ cards (+more): keep compact stack so it does not overflow.
                    const isExactlyThree = totalItems === 3;
                    const CARD_W = isExactlyThree ? 40 : 32;
                    const STEP = isExactlyThree ? 29 : 22;

                    return (
                        <div key={group.key} className="absolute" style={{ top, left: leftBase, width: colW, height, zIndex: 20 }}>
                            {shown.map((ev, idx) => {
                                const st = STATUS_LABELS[ev.status];
                                const stCard = STATUS_CARD_STYLES[ev.status];
                                const isHovered = hoveredCardId === ev.id;
                                const baseZ = idx + 1;

                                return (
                                    <div
                                        key={ev.id}
                                        className="absolute"
                                        style={{
                                            width: `${CARD_W}%`,
                                            left: `${idx * STEP}%`,
                                            top: 1,
                                            height: 'calc(100% - 2px)',
                                            zIndex: isHovered ? 50 : baseZ,
                                            padding: '0 1px',
                                            transform: isHovered ? 'scale(1.12) translateY(-6px)' : 'scale(1)',
                                            transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), z-index 0s',
                                        }}
                                        onMouseEnter={() => setHoveredCardId(ev.id)}
                                        onMouseLeave={() => setHoveredCardId(null)}
                                    >
                                        <div
                                            onMouseEnter={(e) => onShowTooltip(ev, e)}
                                            onMouseLeave={onHideTooltip}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                                            onMouseDown={(e) => onDragStart(ev.id, 'move', e)}
                                            className={`relative h-full rounded-xl border-2 p-1.5 flex flex-col cursor-pointer overflow-hidden
                                                ${draggingEventId === ev.id ? 'ring-2 ring-[#FF6B4A]/30' : ''}`}
                                            style={{
                                                backgroundColor: stCard.bg,
                                                borderColor: stCard.border,
                                                boxShadow: isHovered
                                                    ? `0 8px 25px rgba(0,0,0,0.18), 0 0 0 2px ${stCard.border}40`
                                                    : `${stCard.glow}, 2px 0 6px rgba(0,0,0,0.06)`,
                                                transition: 'box-shadow 0.22s cubic-bezier(.4,0,.2,1), border-color 0.15s ease',
                                            }}
                                        >
                                            {hasMeetLink(ev.meetLink) ? (
                                                <span className="absolute top-1 right-1 inline-flex items-center justify-center rounded border border-[#86EFAC] bg-[#DCFCE7] p-1" title="Có link Meet">
                                                    <VideoCamera className="w-2 h-2 text-[#15803D]" weight="fill" />
                                                </span>
                                            ) : (
                                                <span className="absolute top-1 right-1 rounded bg-[#FFF7ED] px-1 py-0.5 text-[7px] font-extrabold text-[#C2410C] border border-[#FDBA74] leading-none" title="Chưa có link Meet">
                                                    !
                                                </span>
                                            )}
                                            {/* Compact: subject + classroom horizontal */}
                                            <div className="text-[11px] font-extrabold leading-tight truncate" style={{ color: stCard.text }}>
                                                {ev.subject}
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 truncate">
                                                {ev.classroom}
                                            </div>

                                            {/* Expanded info on hover */}
                                            <div
                                                className="overflow-hidden"
                                                style={{
                                                    maxHeight: isHovered ? 60 : 0,
                                                    opacity: isHovered ? 1 : 0,
                                                    transition: 'max-height 0.25s ease, opacity 0.2s ease',
                                                    marginTop: isHovered ? 2 : 0,
                                                }}
                                            >
                                                <div className="text-[9px] font-semibold text-gray-400 truncate">GV: {ev.teacher}</div>
                                                <div className="text-[9px] font-bold text-gray-400 truncate mt-0.5">
                                                    {fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}
                                                </div>
                                                <span
                                                    className="inline-block text-[8px] font-extrabold px-1 py-0.5 rounded mt-0.5"
                                                    style={{ backgroundColor: st.bgColor, color: st.color }}
                                                >
                                                    {st.label}
                                                </span>
                                            </div>

                                            <div className="mt-auto">
                                                <div
                                                    onMouseDown={(e) => onDragStart(ev.id, 'resize', e)}
                                                    className="h-1.5 rounded-full bg-[#1A1A1A]/10 hover:bg-[#FF6B4A]/40"
                                                    title="Kéo để đổi thời lượng"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* +more button */}
                            {hasMoreBtn && (() => {
                                const moreBtnId = -(first.id * 1000 + shown.length);
                                const moreBtnHovered = hoveredCardId === moreBtnId;
                                const moreBtnZ = shown.length + 1;
                                const remainingEvents = group.items.slice(MAX_VISIBLE);
                                const day = weekDates[first.dayIndex];
                                const title = `${DAY_FULL_LABELS[first.dayIndex]} ${day.getDate()}/${day.getMonth() + 1} · ${fmtTime(first.startHour)} - ${fmtTime(first.startHour + first.duration)}`;
                                return (
                                    <div
                                        className="absolute"
                                        style={{
                                            width: `${CARD_W}%`,
                                            left: `${shown.length * STEP}%`,
                                            top: 1,
                                            height: 'calc(100% - 2px)',
                                            zIndex: moreBtnHovered ? 50 : moreBtnZ,
                                            padding: '0 1px',
                                            transform: moreBtnHovered ? 'scale(1.12) translateY(-6px)' : 'scale(1)',
                                            transition: 'transform 0.22s cubic-bezier(.4,0,.2,1)',
                                        }}
                                        onMouseEnter={() => setHoveredCardId(moreBtnId)}
                                        onMouseLeave={() => {
                                            setHoveredCardId(null);
                                            onHideTooltip();
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onMouseEnter={(e) => onShowMoreTooltip(title, remainingEvents, e)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenMore(title, remainingEvents);
                                            }}
                                            className="h-full w-full rounded-xl border-2 border-dashed border-[#FF6B4A]/45 bg-[#FFF4EE] text-[#FF6B4A] font-extrabold text-sm flex flex-col items-center justify-center gap-0.5"
                                            style={{
                                                boxShadow: moreBtnHovered
                                                    ? '0 8px 25px rgba(0,0,0,0.18), 0 0 0 2px rgba(255,107,74,0.25)'
                                                    : '2px 0 6px rgba(0,0,0,0.06)',
                                                transition: 'box-shadow 0.22s cubic-bezier(.4,0,.2,1)',
                                            }}
                                        >
                                            <span className="text-lg leading-none">+{hiddenCount}</span>
                                            <span className="text-[10px] font-bold opacity-70">hơn</span>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Today Timeline View ─────────────────────────────────────────────
function TodayTimelineView({
    events,
    loading,
    onEventClick,
    onShowTooltip,
    onHideTooltip,
}: {
    events: ScheduleEvent[];
    loading: boolean;
    onEventClick: (ev: ScheduleEvent) => void;
    onShowTooltip: (ev: ScheduleEvent, e: React.MouseEvent<HTMLElement>) => void;
    onHideTooltip: () => void;
}) {
    const today = useMemo(() => new Date(), []);
    const title = useMemo(
        () => `${DAY_FULL_LABELS[(today.getDay() + 6) % 7]}, ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`,
        [today],
    );

    const slotGroups = useMemo(() => {
        const grouped = new Map<string, ScheduleEvent[]>();
        for (const ev of events) {
            const key = `${ev.startHour}-${ev.duration}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)?.push(ev);
        }

        return Array.from(grouped.values())
            .map((items) => items.sort((a, b) => a.classroom.localeCompare(b.classroom, 'vi')))
            .sort((a, b) => a[0].startHour - b[0].startHour);
    }, [events]);

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b-2 border-[#1A1A1A] bg-gradient-to-r from-[#F8FAFF] to-white flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Lịch trong ngày</p>
                    <h3 className="text-xl font-extrabold text-[#1A1A1A]">{title}</h3>
                </div>
                <div className="rounded-2xl border border-[#1A1A1A]/10 bg-white px-3 py-2 text-right">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Số buổi</div>
                    <div className="text-lg font-extrabold text-[#1A1A1A]">{events.length}</div>
                </div>
            </div>

            <div className="relative">
                {loading && <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px]" />}

                <div className="grid grid-cols-[72px_1fr]">
                    {HOUR_SLOTS.map((hour) => (
                        <div key={hour} className="contents">
                            <div
                                className="h-[72px] border-r border-b border-[#1A1A1A]/10 flex items-start justify-end pr-3 pt-2 text-[11px] font-extrabold text-gray-400"
                            >
                                {fmtTime(hour)}
                            </div>
                            <div className="h-[72px] border-b border-[#1A1A1A]/10 bg-[#FAFAFA]" />
                        </div>
                    ))}
                    <div className="border-r border-[#1A1A1A]/10 pb-2 pr-3 text-right text-[10px] font-extrabold text-gray-400">{fmtTime(HOURS_END)}</div>
                    <div className="pb-2" />
                </div>

                {!loading && slotGroups.map((group) => {
                    const first = group[0];
                    const top = (first.startHour - HOURS_START) * ROW_H;
                    const height = Math.max(ROW_H * 0.35, first.duration * ROW_H);
                    const columns = group.length;

                    return group.map((ev, idx) => {
                        const st = STATUS_LABELS[ev.status];
                        const stCard = STATUS_CARD_STYLES[ev.status];
                        return (
                            <div
                                key={ev.id}
                                className="absolute px-1.5"
                                style={{
                                    top: `${top + 2}px`,
                                    left: `calc(72px + ${idx} * ((100% - 72px) / ${columns}))`,
                                    width: `calc((100% - 72px) / ${columns})`,
                                    height: `${Math.max(44, height - 4)}px`,
                                    zIndex: 15 + idx,
                                }}
                            >
                                <div
                                    className="relative h-full rounded-2xl border-2 p-3 cursor-pointer overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                    style={{ borderColor: stCard.border, backgroundColor: stCard.bg }}
                                    onMouseEnter={(e) => onShowTooltip(ev, e)}
                                    onMouseLeave={onHideTooltip}
                                    onClick={() => onEventClick(ev)}
                                >
                                    {hasMeetLink(ev.meetLink) ? (
                                        <span className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md border border-[#86EFAC] bg-[#DCFCE7] p-1" title="Có link Meet">
                                            <VideoCamera className="w-3 h-3 text-[#15803D]" weight="fill" />
                                        </span>
                                    ) : (
                                        <span className="absolute top-2 right-2 rounded-md border border-[#FDBA74] bg-[#FFF7ED] px-1.5 py-0.5 text-[9px] font-extrabold text-[#C2410C]" title="Chưa có link Meet">
                                            !
                                        </span>
                                    )}
                                    <div className="text-[15px] font-extrabold truncate leading-tight" style={{ color: stCard.text }}>{ev.subject}</div>
                                    <div className="text-[13px] font-bold text-gray-500 truncate">Lớp {ev.classroom}</div>
                                    <div className="text-[12px] font-semibold text-gray-400 truncate">GV: {ev.teacher}</div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <span className="text-[12px] font-bold text-gray-400">{fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}</span>
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{ backgroundColor: st.bgColor, color: st.color }}>
                                            {st.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    });
                })}

                {!loading && events.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="rounded-2xl border border-dashed border-[#1A1A1A]/20 bg-white/80 px-5 py-3 text-sm font-semibold text-gray-400">
                            Hôm nay chưa có buổi học nào
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Month View ───────────────────────────────────────────────────────
function MonthView({
    year,
    month,
    events,
    onPrev,
    onNext,
    onEventClick,
    loading,
    onOpenMore,
}: {
    year: number;
    month: number;
    events: ScheduleEvent[];
    onPrev: () => void;
    onNext: () => void;
    onEventClick: (ev: ScheduleEvent) => void;
    loading: boolean;
    onOpenMore: (title: string, items: ScheduleEvent[]) => void;
}) {
    const weeks = useMemo(() => getMonthDays(year, month), [year, month]);
    const today = useMemo(() => new Date(), []);
    const monthLabel = new Date(year, month).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
    const [monthHoverCard, setMonthHoverCard] = useState<
        | { type: 'event'; event: ScheduleEvent; x: number; y: number }
        | { type: 'more'; title: string; items: ScheduleEvent[]; x: number; y: number }
        | null
    >(null);
    const [monthHoverQuery, setMonthHoverQuery] = useState('');
    const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();

    const showMonthEventHover = useCallback((ev: ScheduleEvent, e: React.MouseEvent<HTMLElement>) => {
        clearTimeout(hoverTimeout.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setMonthHoverCard({
            type: 'event',
            event: ev,
            x: Math.min(window.innerWidth - 330, rect.right + 12),
            y: Math.max(12, rect.top - 4),
        });
    }, []);

    const showMonthMoreHover = useCallback((title: string, items: ScheduleEvent[], e: React.MouseEvent<HTMLElement>) => {
        clearTimeout(hoverTimeout.current);
        setMonthHoverQuery('');
        const rect = e.currentTarget.getBoundingClientRect();
        setMonthHoverCard({
            type: 'more',
            title,
            items,
            x: Math.min(window.innerWidth - 350, rect.right + 12),
            y: Math.max(12, rect.top - 4),
        });
    }, []);

    const hideMonthHover = useCallback(() => {
        hoverTimeout.current = setTimeout(() => setMonthHoverCard(null), 220);
    }, []);

    const keepMonthHover = useCallback(() => {
        clearTimeout(hoverTimeout.current);
    }, []);

    const monthEvents = useMemo(() => {
        const result: Record<string, ScheduleEvent[]> = {};
        for (const ev of events) {
            if (!result[ev.dateKey]) result[ev.dateKey] = [];
            result[ev.dateKey].push(ev);
        }
        return result;
    }, [events]);

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden shadow-sm relative">
            {loading && <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px]" />}
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#1A1A1A]">
                <button onClick={onPrev} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 transition-colors">‹</button>
                <span className="text-sm font-extrabold text-[#1A1A1A] capitalize">{monthLabel}</span>
                <button onClick={onNext} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 transition-colors">›</button>
            </div>

            <div className="grid grid-cols-7 border-b border-[#1A1A1A]/10">
                {DAY_LABELS.map((d) => (
                    <div key={d} className="py-2.5 text-center text-xs font-extrabold text-gray-400 border-r border-[#1A1A1A]/10 last:border-r-0">{d}</div>
                ))}
            </div>

            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-[#1A1A1A]/10 last:border-b-0">
                    {week.map((date, di) => {
                        const isToday = date && isSameDay(date, today);
                        const key = date ? toDateKey(date) : '';
                        const dayEvents = date
                            ? [...(monthEvents[key] ?? [])].sort((a, b) => (a.startHour - b.startHour) || a.classroom.localeCompare(b.classroom, 'vi'))
                            : [];
                        return (
                            <div key={di} className={`min-h-[120px] p-2 border-r border-[#1A1A1A]/10 last:border-r-0 ${!date ? 'bg-gray-50/50' : ''} ${isToday ? 'bg-[#FF6B4A]/[0.06]' : ''}`}>
                                {date && (
                                    <>
                                        <div className={`text-sm font-extrabold mb-1.5 ${isToday ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]/60'}`}>{date.getDate()}</div>
                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 3).map((ev) => {
                                                const stCard = STATUS_CARD_STYLES[ev.status];
                                                const isHovered = hoveredEventId === ev.id;
                                                return (
                                                    <div
                                                        key={ev.id}
                                                        onMouseEnter={(e) => {
                                                            setHoveredEventId(ev.id);
                                                            showMonthEventHover(ev, e);
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredEventId(null);
                                                            hideMonthHover();
                                                        }}
                                                        onClick={() => onEventClick(ev)}
                                                        className="relative text-xs font-bold px-1.5 py-1 rounded-lg cursor-pointer border-2 overflow-hidden"
                                                        style={{
                                                            backgroundColor: stCard.bg,
                                                            color: stCard.text,
                                                            borderColor: stCard.border,
                                                            boxShadow: isHovered
                                                                ? `0 8px 25px rgba(0,0,0,0.18), 0 0 0 2px ${stCard.border}40`
                                                                : stCard.glow,
                                                            transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                                                            transition: 'box-shadow 0.22s cubic-bezier(.4,0,.2,1), border-color 0.15s ease, transform 0.22s cubic-bezier(.4,0,.2,1)',
                                                        }}
                                                    >
                                                        {hasMeetLink(ev.meetLink) ? (
                                                            <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#86EFAC] bg-[#DCFCE7] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" title="Có link Meet">
                                                                <VideoCamera className="w-2.5 h-2.5 text-[#15803D]" weight="fill" />
                                                            </span>
                                                        ) : (
                                                            <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#FDBA74] bg-[#FFF7ED] text-[10px] font-black text-[#C2410C] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.08)]" title="Chưa có link Meet">
                                                                !
                                                            </span>
                                                        )}
                                                        <div className="pr-5 leading-tight">
                                                            <div className="flex items-center gap-1">
                                                                <span className="shrink-0 text-[10px] font-extrabold">{fmtTime(ev.startHour)}</span>
                                                                <span className="min-w-0 truncate text-[10px] sm:text-[11px]">{ev.subject}</span>
                                                            </div>
                                                        </div>
                                                        <div
                                                            className="overflow-hidden"
                                                            style={{
                                                                maxHeight: isHovered ? 36 : 0,
                                                                opacity: isHovered ? 1 : 0,
                                                                transition: 'max-height 0.22s ease, opacity 0.18s ease',
                                                            }}
                                                        >
                                                            <div className="text-[10px] font-semibold text-gray-500 truncate mt-0.5">Lớp {ev.classroom} · GV: {ev.teacher}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {dayEvents.length > 3 && (
                                                (() => {
                                                    const remainingEvents = dayEvents.slice(3);
                                                    const moreTitle = `Ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                                    return (
                                                        <button
                                                            type="button"
                                                            onMouseEnter={(e) => showMonthMoreHover(moreTitle, remainingEvents, e)}
                                                            onMouseLeave={hideMonthHover}
                                                            onClick={() => onOpenMore(moreTitle, remainingEvents)}
                                                            className="text-[10px] font-extrabold text-[#FF6B4A] px-1 hover:underline"
                                                        >
                                                            +{remainingEvents.length} hơn
                                                        </button>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}

            {monthHoverCard && (
                <div
                    className="fixed z-[120] pointer-events-auto"
                    style={{ left: monthHoverCard.x, top: monthHoverCard.y }}
                    onMouseEnter={keepMonthHover}
                    onMouseLeave={hideMonthHover}
                >
                    {monthHoverCard.type === 'event' ? (
                        (() => {
                            const ev = monthHoverCard.event;
                            const st = STATUS_LABELS[ev.status];
                            const stCard = STATUS_CARD_STYLES[ev.status];
                            return (
                                <div className="w-[300px] rounded-2xl border-2 p-3 shadow-2xl" style={{ borderColor: stCard.border, backgroundColor: stCard.bg }}>
                                    <div className="text-sm font-extrabold" style={{ color: stCard.text }}>{ev.subject}</div>
                                    <div className="text-xs font-semibold text-gray-500 mt-0.5">Lớp {ev.classroom}</div>
                                    <div className="text-xs font-semibold text-gray-500">GV: {ev.teacher}</div>
                                    <div className="text-xs font-semibold text-gray-500 truncate">Chủ đề: {ev.topic}</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: hasMeetLink(ev.meetLink) ? '#15803D' : '#C2410C' }}>
                                        <VideoCamera className="w-3 h-3" weight={hasMeetLink(ev.meetLink) ? 'fill' : 'regular'} />
                                        {hasMeetLink(ev.meetLink) ? 'Có link Meet' : 'Chưa có link Meet'}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-gray-400">{fmtTime(ev.startHour)} - {fmtTime(ev.startHour + ev.duration)}</span>
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{ backgroundColor: st.bgColor, color: st.color }}>{st.label}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onEventClick(ev);
                                            setMonthHoverCard(null);
                                        }}
                                        className="mt-2 rounded-lg bg-[#1A1A1A] text-white px-2.5 py-1 text-[11px] font-extrabold hover:bg-[#2A2A2A]"
                                    >
                                        Xem chi tiết
                                    </button>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="w-[320px] rounded-2xl border-2 border-[#FF6B4A]/30 bg-white p-3 shadow-2xl">
                            <div className="text-xs font-extrabold text-[#1A1A1A] mb-2">{monthHoverCard.title}</div>
                            <input
                                value={monthHoverQuery}
                                onChange={(e) => setMonthHoverQuery(e.target.value)}
                                placeholder="Lọc nhanh sự kiện"
                                className="w-full mb-2 rounded-lg border border-[#1A1A1A]/20 px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#FF6B4A]"
                            />
                            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                                {monthHoverCard.items
                                    .filter((ev) => {
                                        if (!monthHoverQuery.trim()) return true;
                                        const q = normalizeVietnamese(monthHoverQuery);
                                        const haystack = normalizeVietnamese(`${ev.classroom} ${ev.teacher} ${ev.subject} ${ev.topic}`);
                                        return haystack.includes(q);
                                    })
                                    .map((ev) => {
                                    const stCard = STATUS_CARD_STYLES[ev.status];
                                    return (
                                        <button
                                            type="button"
                                            key={ev.id}
                                            onClick={() => {
                                                onEventClick(ev);
                                                setMonthHoverCard(null);
                                            }}
                                            className="w-full text-left rounded-lg border px-2 py-1.5 text-xs hover:brightness-95 transition-colors"
                                            style={{ borderColor: stCard.border, backgroundColor: stCard.bg }}
                                        >
                                            <div className="font-extrabold truncate" style={{ color: stCard.text }}>{fmtTime(ev.startHour)} {ev.subject}</div>
                                            <div className="font-semibold text-gray-500 truncate">Lớp {ev.classroom} · GV: {ev.teacher}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenMore(monthHoverCard.title, monthHoverCard.items);
                                        setMonthHoverCard(null);
                                    }}
                                    className="rounded-lg bg-[#FF6B4A] text-white px-3 py-1.5 text-xs font-extrabold hover:bg-[#ff5535]"
                                >
                                    Mở danh sách đầy đủ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMonthHoverCard(null)}
                                    className="rounded-lg border border-[#1A1A1A]/20 px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-gray-50"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}




