import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    CalendarCheck2,
    GraduationCap,
    RefreshCw,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { timetableService, type TimetableItem, type TimetableStats } from '../../services/timetableService';

/* ── types ──────────────────────────────────────────────────────────────── */
interface ApiRes<T> { code: number; message: string; result: T; }
interface PageRes<T> { data: T[]; totalPages: number; }

interface TeacherItem {
    teacherID: number;
    fullName: string;
    specialization: string | null;
    isHomeroomTeacher: boolean;
    classes: string[] | null;
}

interface ClassroomItem {
    classID: number;
    className: string;
    subjectName: string;
    status: string;
    currentStudents: number;
    maxStudents: number;
    teacherName: string | null;
}

interface ClassroomStats {
    totalClasses: number;
    activeClasses: number;
    unassignedClasses: number;
    averageClassSize: number;
}

interface AttendanceSummary {
    present: number;
    absent: number;
    late: number;
    notYet: number;
    markedTotal: number;
    rate: number | null;
}

interface AlertItem {
    severity: 'danger' | 'warning' | 'info';
    title: string;
    description: string;
    count?: number;
}

type DashboardTab = 'overview' | 'analysis' | 'workload';

/* ── constants ──────────────────────────────────────────────────────────── */
const cardClass = 'rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-white p-5 md:p-6';

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toDayKey(value: string): string {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function safeNumber(n: number | null | undefined): number {
    return Number.isFinite(n) ? Number(n) : 0;
}

function deltaText(current: number, previous: number, unit: string): string {
    const delta = current - previous;
    if (delta === 0) return `Không đổi so với kỳ trước`;
    const direction = delta > 0 ? 'tăng' : 'giảm';
    return `${Math.abs(delta)} ${unit} ${direction} so với kỳ trước`;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
    const delta = current - previous;
    if (delta === 0) {
        return <span className="text-[11px] font-bold text-gray-500">Không đổi</span>;
    }

    const positive = delta > 0;
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
        >
            {positive ? '+' : '-'}{Math.abs(delta)}
        </span>
    );
}

/* ── component ──────────────────────────────────────────────────────────── */
export function AdminAnalytics() {
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
    const [classStats, setClassStats] = useState<ClassroomStats | null>(null);
    const [todayStats, setTodayStats] = useState<TimetableStats | null>(null);
    const [todaySessions, setTodaySessions] = useState<TimetableItem[]>([]);
    const [yesterdaySessions, setYesterdaySessions] = useState<TimetableItem[]>([]);
    const [weekSessions, setWeekSessions] = useState<TimetableItem[]>([]);
    const [prevWeekSessions, setPrevWeekSessions] = useState<TimetableItem[]>([]);
    const [last14DaysSessions, setLast14DaysSessions] = useState<TimetableItem[]>([]);
    const [attendanceToday, setAttendanceToday] = useState<AttendanceSummary>({
        present: 0,
        absent: 0,
        late: 0,
        notYet: 0,
        markedTotal: 0,
        rate: null,
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

    const fetchAll = useCallback(async () => {
        const token = authService.getToken();
        if (!token) {
            setLoadError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setLoadError(null);

        try {
            const now = new Date();
            const todayStart = startOfDay(now);
            const todayEnd = endOfDay(now);
            const yesterdayStart = startOfDay(addDays(now, -1));
            const yesterdayEnd = endOfDay(addDays(now, -1));
            const weekStart = startOfDay(addDays(now, -6));
            const prevWeekStart = startOfDay(addDays(now, -13));
            const prevWeekEnd = endOfDay(addDays(now, -7));

            const results = await Promise.allSettled([
                api.get<ApiRes<TeacherItem[]>>('/teachers', token),
                api.get<ApiRes<PageRes<ClassroomItem>>>('/classrooms?page=1&size=300', token),
                api.get<ApiRes<ClassroomStats>>('/classrooms/stats', token),
                timetableService.getStats(),
                timetableService.getTimetables(todayStart, todayEnd, true),
                timetableService.getTimetables(yesterdayStart, yesterdayEnd, true),
                timetableService.getTimetables(weekStart, todayEnd, true),
                timetableService.getTimetables(prevWeekStart, prevWeekEnd, true),
                timetableService.getTimetables(prevWeekStart, todayEnd, true),
            ]);

            const [
                teachersRes,
                classroomsRes,
                classStatsRes,
                statsRes,
                todaySessionsRes,
                yesterdaySessionsRes,
                weekSessionsRes,
                prevWeekSessionsRes,
                last14Res,
            ] = results;

            const nextTeachers = teachersRes.status === 'fulfilled' ? (teachersRes.value.result ?? []) : [];
            const nextClassrooms = classroomsRes.status === 'fulfilled' ? (classroomsRes.value.result?.data ?? []) : [];
            const nextClassStats = classStatsRes.status === 'fulfilled' ? classStatsRes.value.result : null;
            const nextTodayStats = statsRes.status === 'fulfilled' ? statsRes.value : null;
            const nextTodaySessions = todaySessionsRes.status === 'fulfilled' ? todaySessionsRes.value : [];
            const nextYesterdaySessions = yesterdaySessionsRes.status === 'fulfilled' ? yesterdaySessionsRes.value : [];
            const nextWeekSessions = weekSessionsRes.status === 'fulfilled' ? weekSessionsRes.value : [];
            const nextPrevWeekSessions = prevWeekSessionsRes.status === 'fulfilled' ? prevWeekSessionsRes.value : [];
            const nextLast14Sessions = last14Res.status === 'fulfilled' ? last14Res.value : [];

            const hasAllCoreFailed = [teachersRes, classroomsRes, classStatsRes, statsRes].every((r) => r.status === 'rejected');

            if (hasAllCoreFailed) {
                setLoadError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
            }

            setTeachers(nextTeachers);
            setClassrooms(nextClassrooms);
            setClassStats(nextClassStats);
            setTodayStats(nextTodayStats);
            setTodaySessions(nextTodaySessions);
            setYesterdaySessions(nextYesterdaySessions);
            setWeekSessions(nextWeekSessions);
            setPrevWeekSessions(nextPrevWeekSessions);
            setLast14DaysSessions(nextLast14Sessions);

            // Attendance insights for today.
            if (nextTodaySessions.length === 0) {
                setAttendanceToday({ present: 0, absent: 0, late: 0, notYet: 0, markedTotal: 0, rate: null });
            } else {
                const attendanceResults = await Promise.allSettled(
                    nextTodaySessions.map((s) => timetableService.getAttendanceByTimetable(s.timetableID)),
                );

                let present = 0;
                let absent = 0;
                let late = 0;
                let notYet = 0;

                for (const result of attendanceResults) {
                    if (result.status !== 'fulfilled') continue;
                    for (const item of result.value) {
                        const status = String(item.status ?? '').toUpperCase();
                        if (status === 'PRESENT') present += 1;
                        else if (status === 'ABSENT') absent += 1;
                        else if (status === 'LATE') late += 1;
                        else notYet += 1;
                    }
                }

                const markedTotal = present + absent + late;
                const rate = markedTotal > 0 ? ((present + late) / markedTotal) * 100 : null;

                setAttendanceToday({ present, absent, late, notYet, markedTotal, rate });
            }

            setLastSyncedAt(new Date());
        } catch {
            setLoadError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    const topCards = useMemo(() => {
        const totalTeachers = teachers.length;
        const totalClasses = classStats?.totalClasses ?? classrooms.length;
        const sessionsToday = todayStats?.totalToday ?? todaySessions.length;
        const avgClassSize = safeNumber(classStats?.averageClassSize);

        const sessionsYesterday = yesterdaySessions.length;
        const weekCount = weekSessions.length;
        const prevWeekCount = prevWeekSessions.length;

        return [
            {
                label: 'Tổng giáo viên',
                value: totalTeachers,
                helper: `${teachers.filter((t) => (t.classes?.length ?? 0) > 0).length} đang phụ trách lớp`,
                deltaNode: <DeltaBadge current={weekCount} previous={prevWeekCount} />,
                bg: 'bg-[#EDE8FF]',
            },
            {
                label: 'Tổng lớp học',
                value: totalClasses,
                helper: `${classStats?.activeClasses ?? classrooms.filter((c) => c.status === 'ACTIVE').length} lớp hoạt động`,
                deltaNode: <DeltaBadge current={classStats?.unassignedClasses ?? 0} previous={0} />,
                bg: 'bg-[#FFF3C9]',
            },
            {
                label: 'Buổi học hôm nay',
                value: sessionsToday,
                helper: deltaText(sessionsToday, sessionsYesterday, 'buổi'),
                deltaNode: <DeltaBadge current={sessionsToday} previous={sessionsYesterday} />,
                bg: 'bg-[#DDF7F1]',
            },
            {
                label: 'Sĩ số trung bình',
                value: avgClassSize.toFixed(1),
                helper: avgClassSize < 8 ? 'Dưới ngưỡng khuyến nghị' : 'Trong ngưỡng ổn định',
                deltaNode: null,
                bg: avgClassSize < 8 ? 'bg-[#FFE5E5]' : 'bg-[#E6F9EF]',
            },
        ];
    }, [teachers, classStats, classrooms, todayStats, todaySessions, yesterdaySessions, weekSessions, prevWeekSessions]);

    const systemHealth = useMemo(() => {
        const totalStudents = classrooms.reduce((sum, c) => sum + safeNumber(c.currentStudents), 0);
        const totalCapacity = classrooms.reduce((sum, c) => sum + safeNumber(c.maxStudents), 0);
        const fillRate = totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0;

        const lowStudentClasses = classrooms.filter((c) => safeNumber(c.currentStudents) < 5);
        const unassignedClasses = classrooms.filter((c) => !c.teacherName || !c.teacherName.trim());
        const lockedClasses = classrooms.filter((c) => ['INACTIVE', 'LOCKED'].includes(String(c.status).toUpperCase()));

        const avgClassSize = safeNumber(classStats?.averageClassSize);
        const avgLow = avgClassSize > 0 && avgClassSize < 8;

        return {
            fillRate,
            lowStudentClasses,
            unassignedClasses,
            lockedClasses,
            avgClassSize,
            avgLow,
        };
    }, [classrooms, classStats]);

    const teacherInsights = useMemo(() => {
        const teacherLoads = teachers.map((t) => ({
            teacherID: t.teacherID,
            fullName: t.fullName,
            classesCount: t.classes?.length ?? 0,
            specialization: t.specialization,
        }));

        const sortedDesc = [...teacherLoads].sort((a, b) => b.classesCount - a.classesCount);
        const top = sortedDesc.slice(0, 5);
        const underloaded = sortedDesc.filter((t) => t.classesCount <= 1).slice(0, 8);
        const overloaded = sortedDesc.filter((t) => t.classesCount >= 5);

        const distribution = [
            { bucket: '0 lớp', value: teacherLoads.filter((t) => t.classesCount === 0).length },
            { bucket: '1-2 lớp', value: teacherLoads.filter((t) => t.classesCount >= 1 && t.classesCount <= 2).length },
            { bucket: '3-4 lớp', value: teacherLoads.filter((t) => t.classesCount >= 3 && t.classesCount <= 4).length },
            { bucket: '>=5 lớp', value: teacherLoads.filter((t) => t.classesCount >= 5).length },
        ];

        return { top, underloaded, overloaded, distribution };
    }, [teachers]);

    const activityInsights = useMemo(() => {
        const totalToday = todayStats?.totalToday ?? todaySessions.length;
        const ongoing = todayStats?.ongoing ?? todaySessions.filter((s) => s.status === 'ONGOING').length;
        const upcoming = todayStats?.upcoming ?? todaySessions.filter((s) => s.status === 'UPCOMING').length;
        const completed = todayStats?.completed ?? todaySessions.filter((s) => ['COMPLETED', 'CANCELLED'].includes(String(s.status).toUpperCase())).length;

        const trendMap = new Map<string, { sessions: number; completed: number }>();
        for (const session of last14DaysSessions) {
            const key = toDayKey(session.startTime);
            if (!trendMap.has(key)) trendMap.set(key, { sessions: 0, completed: 0 });
            const item = trendMap.get(key)!;
            item.sessions += 1;
            if (String(session.status).toUpperCase() === 'COMPLETED') item.completed += 1;
        }

        const trend = Array.from(trendMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-10)
            .map(([date, value]) => ({
                date: date.slice(5),
                sessions: value.sessions,
                completed: value.completed,
            }));

        return {
            totalToday,
            ongoing,
            upcoming,
            completed,
            trend,
        };
    }, [todayStats, todaySessions, last14DaysSessions]);

    const subjectDistribution = useMemo(() => {
        const grouped = classrooms.reduce<Record<string, number>>((acc, cls) => {
            const key = cls.subjectName || 'Khác';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([subject, count]) => ({ subject, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [classrooms]);

    const alerts = useMemo<AlertItem[]>(() => {
        const list: AlertItem[] = [];

        if (systemHealth.lowStudentClasses.length > 0) {
            list.push({
                severity: 'warning',
                title: 'Lớp dưới ngưỡng học sinh',
                description: 'Có lớp dưới 5 học sinh, nên xem xét gộp lớp hoặc tăng tuyển sinh.',
                count: systemHealth.lowStudentClasses.length,
            });
        }

        if (systemHealth.unassignedClasses.length > 0) {
            list.push({
                severity: 'danger',
                title: 'Lớp chưa có giáo viên phụ trách',
                description: 'Cần phân công giáo viên ngay để tránh gián đoạn kế hoạch học tập.',
                count: systemHealth.unassignedClasses.length,
            });
        }

        if (systemHealth.lockedClasses.length > 0) {
            list.push({
                severity: 'warning',
                title: 'Lớp đã khóa vẫn còn trong hệ thống',
                description: 'Nên rà soát lý do khóa lớp và kế hoạch xử lý cho học sinh liên quan.',
                count: systemHealth.lockedClasses.length,
            });
        }

        if (systemHealth.avgLow) {
            list.push({
                severity: 'warning',
                title: 'Sĩ số trung bình thấp',
                description: 'Sĩ số trung bình dưới ngưỡng khuyến nghị, chi phí vận hành có thể tăng.',
            });
        }

        if (attendanceToday.rate !== null && attendanceToday.rate < 75) {
            list.push({
                severity: 'danger',
                title: 'Tỷ lệ tham gia học tập thấp hôm nay',
                description: 'Tỷ lệ điểm danh dưới 75%, cần kiểm tra nguyên nhân vắng mặt.',
            });
        }

        if (teacherInsights.overloaded.length > 0) {
            list.push({
                severity: 'info',
                title: 'Dấu hiệu quá tải giáo viên',
                description: 'Một số giáo viên đang phụ trách từ 5 lớp trở lên, nên cân bằng tải.',
                count: teacherInsights.overloaded.length,
            });
        }

        if (list.length === 0) {
            list.push({
                severity: 'info',
                title: 'Không có cảnh báo nghiêm trọng',
                description: 'Hệ thống đang ở trạng thái ổn định theo các chỉ số hiện tại.',
            });
        }

        return list;
    }, [systemHealth, attendanceToday.rate, teacherInsights.overloaded.length]);

    const alertsSorted = useMemo(() => {
        const severityOrder: Record<AlertItem['severity'], number> = {
            danger: 0,
            warning: 1,
            info: 2,
        };

        return [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }, [alerts]);

    const handleKpiDrillDown = useCallback((label: string) => {
        if (label === 'Tổng giáo viên') {
            setActiveTab('workload');
            return;
        }

        if (label === 'Tổng lớp học' || label === 'Sĩ số trung bình') {
            setActiveTab('analysis');
            return;
        }

        if (label === 'Buổi học hôm nay') {
            setActiveTab('workload');
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#F7F7F2] p-6 md:p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="sticky top-0 z-10 rounded-3xl border-2 border-[#1A1A1A] bg-[#FAF9F6]/95 backdrop-blur px-5 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A]">Thống kê chuyên sâu</h1>
                        <p className="text-sm font-semibold text-[#1A1A1A]/60">
                            Cập nhật lần cuối: {lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchAll()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1A1A1A]/20 bg-white px-4 py-2 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {loadError}
                </div>
            )}

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#FF6B4A]" />
                    <h2 className="text-lg font-extrabold text-[#1A1A1A]">Cảnh báo hệ thống</h2>
                    <span className="ml-auto text-xs font-bold text-gray-500">{alertsSorted.length} vấn đề</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {alertsSorted.map((alert, index) => (
                        <div
                            key={`${alert.title}-${index}`}
                            className={`rounded-2xl border p-3 ${
                                alert.severity === 'danger'
                                    ? 'border-red-200 bg-red-50'
                                    : alert.severity === 'warning'
                                    ? 'border-amber-200 bg-amber-50'
                                    : 'border-blue-200 bg-blue-50'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-extrabold text-[#1A1A1A]">{alert.title}</p>
                                {alert.count !== undefined && (
                                    <span className="text-[11px] font-extrabold text-[#1A1A1A]/70">{alert.count}</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-[#1A1A1A]/70">{alert.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="flex flex-wrap gap-2">
                {[
                    { key: 'overview' as DashboardTab, label: 'Tổng quan thống kê' },
                    { key: 'analysis' as DashboardTab, label: 'Phân tích hệ thống' },
                    { key: 'workload' as DashboardTab, label: 'Giáo viên & hoạt động' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                            activeTab === tab.key
                                ? 'border-[#FF6B4A] bg-[#FF6B4A] text-white'
                                : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </section>

            {activeTab === 'overview' && (
                <section className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-[#FF6B4A]" />
                            <h2 className="text-lg font-extrabold text-[#1A1A1A]">Tổng quan điều hành</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {topCards.map((card) => (
                                <button
                                    key={card.label}
                                    type="button"
                                    onClick={() => handleKpiDrillDown(card.label)}
                                    className={`rounded-3xl border-2 border-[#1A1A1A] p-5 shadow-sm text-left ${card.bg} hover:-translate-y-0.5 hover:shadow-md transition-all`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider">{card.label}</p>
                                        {card.deltaNode}
                                    </div>
                                    <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{loading ? '…' : card.value}</p>
                                    <p className="mt-1 text-xs font-semibold text-[#1A1A1A]/60">{card.helper}</p>
                                    <p className="mt-2 text-[11px] font-bold text-[#1A1A1A]/50">Nhấn để xem chi tiết</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <article className={cardClass}>
                        <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-3">Snapshot nhanh</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">Tổng lớp hoạt động</p>
                                <p className="mt-1 text-2xl font-extrabold text-[#1A1A1A]">{classStats?.activeClasses ?? 0}</p>
                            </div>
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-700">Lớp cần xử lý ngay</p>
                                <p className="mt-1 text-2xl font-extrabold text-[#1A1A1A]">{systemHealth.unassignedClasses.length + systemHealth.lowStudentClasses.length}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Điểm danh hôm nay</p>
                                <p className="mt-1 text-2xl font-extrabold text-[#1A1A1A]">{attendanceToday.rate === null ? '—' : `${attendanceToday.rate.toFixed(1)}%`}</p>
                            </div>
                        </div>
                    </article>
                </section>
            )}

            {activeTab === 'analysis' && (
                <section className="space-y-6">
                    <article className={cardClass}>
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="h-5 w-5 text-[#1A7A6E]" />
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Phân tích hệ thống</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="rounded-2xl border border-[#1A1A1A]/10 bg-[#F7F7F2] p-4 md:col-span-2">
                                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Tỷ lệ lấp đầy lớp</p>
                                <p className={`mt-2 text-3xl font-extrabold ${systemHealth.fillRate < 40 ? 'text-amber-600' : 'text-[#1A1A1A]'}`}>
                                    {systemHealth.fillRate.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 font-semibold mt-1">Tổng học sinh / tổng sức chứa</p>
                            </div>

                            {[
                                { label: 'Lớp ít học sinh (<5)', value: systemHealth.lowStudentClasses.length, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
                                { label: 'Lớp đã khóa', value: systemHealth.lockedClasses.length, tone: 'text-gray-700 bg-gray-50 border-gray-200' },
                            ].map((item) => (
                                <div key={item.label} className={`rounded-2xl border p-3 ${item.tone}`}>
                                    <p className="text-[11px] font-extrabold uppercase tracking-wider">{item.label}</p>
                                    <p className="mt-1 text-2xl font-extrabold">{loading ? '…' : item.value}</p>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className={cardClass}>
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="h-5 w-5 text-violet-600" />
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Số lớp theo môn học</h3>
                        </div>
                        {loading ? (
                            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                        ) : subjectDistribution.length === 0 ? (
                            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                        ) : (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectDistribution} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" allowDecimals={false} />
                                        <YAxis type="category" dataKey="subject" width={130} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v: number) => [`${v} lớp`, 'Số lớp']} />
                                        <Bar dataKey="count" fill="#8B7BFF" radius={[0, 8, 8, 0]} name="Số lớp" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </article>
                </section>
            )}

            {activeTab === 'workload' && (
                <section className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <article className={cardClass}>
                            <div className="flex items-center gap-2 mb-4">
                                <GraduationCap className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Hiệu suất giáo viên</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">Dạy nhiều lớp nhất</p>
                                    <p className="mt-1 text-sm font-extrabold text-[#1A1A1A]">
                                        {teacherInsights.top[0] ? `${teacherInsights.top[0].fullName} (${teacherInsights.top[0].classesCount} lớp)` : 'Chưa có dữ liệu'}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Ít lớp/chưa phân công</p>
                                    <p className="mt-1 text-sm font-extrabold text-[#1A1A1A]">{teacherInsights.underloaded.length} giáo viên</p>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {teacherInsights.top.map((t) => (
                                    <div key={t.teacherID} className="flex items-center justify-between rounded-xl border border-[#1A1A1A]/10 bg-[#F7F7F2] px-3 py-2">
                                        <div>
                                            <p className="text-sm font-extrabold text-[#1A1A1A]">{t.fullName}</p>
                                            <p className="text-xs font-semibold text-gray-500">{t.specialization || 'Chưa có chuyên môn'}</p>
                                        </div>
                                        <span className="rounded-full bg-[#1A1A1A] px-2.5 py-1 text-xs font-extrabold text-white">{t.classesCount} lớp</span>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className={cardClass}>
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-4">Phân bố tải giáo viên</h3>
                            {loading ? (
                                <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                            ) : (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teacherInsights.distribution}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="bucket" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip formatter={(v: number) => [`${v} giáo viên`, '']} />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {teacherInsights.distribution.map((entry, index) => (
                                                    <Cell key={entry.bucket} fill={index === 3 ? '#F97316' : '#6366F1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </article>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <article className={cardClass}>
                            <div className="flex items-center gap-2 mb-4">
                                <CalendarCheck2 className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Hoạt động học tập</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[
                                    { label: 'Đang diễn ra', value: activityInsights.ongoing, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                    { label: 'Sắp diễn ra', value: activityInsights.upcoming, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                                    { label: 'Đã kết thúc', value: activityInsights.completed, color: 'bg-gray-50 text-gray-700 border-gray-200' },
                                    { label: 'Tổng buổi hôm nay', value: activityInsights.totalToday, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                                ].map((item) => (
                                    <div key={item.label} className={`rounded-2xl border p-3 ${item.color}`}>
                                        <p className="text-[11px] font-extrabold uppercase tracking-wider">{item.label}</p>
                                        <p className="mt-1 text-2xl font-extrabold">{loading ? '…' : item.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-[#1A1A1A]/10 bg-[#F7F7F2] p-4">
                                <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">Tỷ lệ điểm danh hôm nay</p>
                                {attendanceToday.rate === null ? (
                                    <p className="text-sm font-semibold text-gray-500">Chưa có dữ liệu điểm danh đủ để tính tỷ lệ.</p>
                                ) : (
                                    <>
                                        <p className={`text-3xl font-extrabold ${attendanceToday.rate < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {attendanceToday.rate.toFixed(1)}%
                                        </p>
                                        <p className="text-xs font-semibold text-gray-500 mt-1">
                                            Có mặt + đi muộn: {attendanceToday.present + attendanceToday.late} / {attendanceToday.markedTotal} lượt điểm danh
                                        </p>
                                    </>
                                )}
                            </div>
                        </article>

                        <article className={cardClass}>
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-4">Xu hướng hoạt động 10 ngày gần nhất</h3>
                            {loading ? (
                                <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                            ) : activityInsights.trend.length === 0 ? (
                                <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                            ) : (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={activityInsights.trend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="date" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip formatter={(value: number, name: string) => [`${value}`, name === 'sessions' ? 'Tổng buổi' : 'Đã kết thúc']} />
                                            <Legend formatter={(value) => (value === 'sessions' ? 'Tổng buổi' : 'Đã kết thúc')} />
                                            <Line type="monotone" dataKey="sessions" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </article>
                    </div>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <article className={cardClass}>
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-3">Lớp cần xử lý ưu tiên</h3>
                            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                {systemHealth.unassignedClasses.slice(0, 8).map((c) => (
                                    <div key={c.classID} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                                        <p className="text-sm font-extrabold text-[#1A1A1A]">{c.className || `Lớp #${c.classID}`}</p>
                                        <p className="text-xs font-semibold text-red-700">Chưa có giáo viên phụ trách</p>
                                    </div>
                                ))}
                                {systemHealth.unassignedClasses.length === 0 && (
                                    <p className="text-sm text-gray-500 font-semibold">Không có lớp nào thiếu giáo viên.</p>
                                )}
                            </div>
                        </article>

                        <article className={cardClass}>
                            <h3 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-3">Giáo viên chưa được phân công hoặc tải thấp</h3>
                            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                {teacherInsights.underloaded.slice(0, 8).map((t) => (
                                    <div key={t.teacherID} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-extrabold text-[#1A1A1A]">{t.fullName}</p>
                                            <p className="text-xs font-semibold text-amber-700">{t.specialization || 'Chưa cập nhật chuyên môn'}</p>
                                        </div>
                                        <span className="text-xs font-extrabold text-amber-700">{t.classesCount} lớp</span>
                                    </div>
                                ))}
                                {teacherInsights.underloaded.length === 0 && (
                                    <p className="text-sm text-gray-500 font-semibold">Tải giáo viên đang cân bằng tốt.</p>
                                )}
                            </div>
                        </article>
                    </section>
                </section>
            )}
        </div>
    );
}
