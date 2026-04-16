import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    Clock3,
    GraduationCap,
    School,
    Users,
} from 'lucide-react';
import {
    Cell,
    Legend,
    Line,
    LineChart,
    CartesianGrid,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { parseVnDate } from '../../lib/timeUtils';

/* ── API types ──────────────────────────────────────────────────────────── */
interface ApiResponse<T> { code: number; message: string; result: T; }

interface StudentItem { studentID: number; fullName: string; }
interface TeacherItem { teacherID: number; fullName: string; }

interface ClassroomStats {
    totalClasses: number;
    activeClasses: number;
    unassignedClasses: number;
    averageClassSize: number;
}

interface ClassroomItem {
    classID: number;
    className: string;
    currentStudents: number;
    status: string;
}

interface PageResponse<T> { data: T[]; totalPages: number; }

interface TimetableItem {
    timetableID: number;
    className: string;
    subjectName: string;
    teacherName: string | null;
    startTime: string;
    endTime: string;
    status: string;
}

/* ── helpers ────────────────────────────────────────────────────────────── */
function toLocalDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isEndedSession(item: TimetableItem, now: Date): boolean {
    const endTime = parseVnDate(item.endTime).getTime();
    return item.status === 'COMPLETED' || endTime <= now.getTime();
}

/** Extract grade number from class name, e.g. "Lớp 10A1" → 10 */
function extractGrade(className: string): number | null {
    const m = className.match(/\b(10|11|12)\b/);
    return m ? Number(m[1]) : null;
}

/* ── state shapes ───────────────────────────────────────────────────────── */
interface GradeSlice { name: string; value: number; color: string; }

const GRADE_COLORS: Record<number, string> = {
    10: '#A78BFA',
    11: '#5EEAD4',
    12: '#FCD34D',
};

export function AdminStatistics() {
    const cardClass = 'rounded-3xl border-2 border-[#1A1A1A] bg-white shadow-sm p-5 md:p-6';

    /* ── data state ─────────────────────────────────────────────────────── */
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [teacherCount, setTeacherCount] = useState<number | null>(null);
    const [classStats, setClassStats] = useState<ClassroomStats | null>(null);
    const [gradeDistribution, setGradeDistribution] = useState<GradeSlice[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<TimetableItem[]>([]);
    const [loading, setLoading] = useState(true);

    /* ── static placeholder for charts not yet backed by an endpoint ────── */
    const growthData = [
        { month: 'Tháng 1', students: 0 },
        { month: 'Tháng 2', students: 0 },
        { month: 'Tháng 3', students: 0 },
        { month: 'Tháng 4', students: 0 },
        { month: 'Tháng 5', students: 0 },
        { month: 'Tháng 6', students: studentCount ?? 0 },
    ];

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        Promise.all([
            api.get<ApiResponse<StudentItem[]>>('/students', token),
            api.get<ApiResponse<TeacherItem[]>>('/teachers', token),
            api.get<ApiResponse<ClassroomStats>>('/classrooms/stats', token),
            api.get<ApiResponse<PageResponse<ClassroomItem>>>('/classrooms?page=1&size=200', token),
            api.get<ApiResponse<TimetableItem[]>>(
                `/timetables?start=${encodeURIComponent(toLocalDateTime(todayStart))}&end=${encodeURIComponent(toLocalDateTime(todayEnd))}`,
                token,
            ),
        ])
            .then(([students, teachers, stats, classrooms, timetables]) => {
                setStudentCount(students.result?.length ?? 0);
                setTeacherCount(teachers.result?.length ?? 0);
                setClassStats(stats.result);

                // Build grade distribution from classroom list
                const gradeMap: Record<number, number> = { 10: 0, 11: 0, 12: 0 };
                for (const cls of classrooms.result?.data ?? []) {
                    const grade = extractGrade(cls.className);
                    if (grade && grade in gradeMap) {
                        gradeMap[grade] += cls.currentStudents;
                    }
                }
                const slices: GradeSlice[] = Object.entries(gradeMap)
                    .filter(([, v]) => v > 0)
                    .map(([g, v]) => ({
                        name: `Khối ${g}`,
                        value: v,
                        color: GRADE_COLORS[Number(g)],
                    }));
                setGradeDistribution(slices);

                // Keep upcoming/ongoing sessions on top, push ended sessions to the bottom.
                const now = new Date();
                const sorted = [...(timetables.result ?? [])].sort((a, b) => {
                    const aEnded = isEndedSession(a, now);
                    const bEnded = isEndedSession(b, now);

                    if (aEnded !== bEnded) {
                        return aEnded ? 1 : -1;
                    }

                    if (!aEnded) {
                        return parseVnDate(a.startTime).getTime() - parseVnDate(b.startTime).getTime();
                    }

                    return parseVnDate(b.endTime).getTime() - parseVnDate(a.endTime).getTime();
                });
                setTodaySchedule(sorted);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    /* ── stat cards ─────────────────────────────────────────────────────── */
    const stat = (val: number | null) =>
        loading ? '…' : val !== null ? val.toLocaleString('vi-VN') : '–';

    const urgentCount = classStats?.unassignedClasses ?? 0;

    return (
        <div className="min-h-screen bg-[#F7F7F2] p-6 md:p-8 space-y-6 lg:space-y-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <header className="space-y-1">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Quản trị hệ thống</p>
                <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Tổng quan hệ thống</h1>
            </header>

            {/* KPI cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#EDE8FF] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Tổng số Học sinh</p>
                        <Users className="h-5 w-5 text-[#6D4AFF]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">{stat(studentCount)}</p>
                    <p className="mt-2 text-sm font-bold text-gray-500">học sinh đang học</p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#DDF7F1] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Giáo viên cộng tác</p>
                        <GraduationCap className="h-5 w-5 text-[#0F766E]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">{stat(teacherCount)}</p>
                    <p className="mt-2 text-sm font-bold text-gray-500">giáo viên trong hệ thống</p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FFF3C9] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Lớp đang hoạt động</p>
                        <BookOpen className="h-5 w-5 text-[#B45309]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">
                        {loading ? '…' : classStats ? classStats.activeClasses.toLocaleString('vi-VN') : '–'}
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-500">
                        {loading ? '' : classStats ? `/${classStats.totalClasses} lớp tổng cộng` : ''}
                    </p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FFE5E5] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Lớp chưa có giáo viên</p>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">
                        {loading ? '…' : urgentCount.toLocaleString('vi-VN')}
                    </p>
                    <p className="mt-2 text-sm font-bold text-red-500">
                        {urgentCount > 0 ? 'cần phân công giáo viên' : 'không có lớp nào cần xử lý'}
                    </p>
                </article>
            </section>

            {/* Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <article className={`lg:col-span-4 ${cardClass}`}>
                    <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-1">
                        Học sinh theo thời gian
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">Dữ liệu tổng hợp — biểu đồ xu hướng sẽ được cập nhật khi có API lịch sử</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip />
                                <Line type="monotone" dataKey="students" name="Học sinh" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={`lg:col-span-3 ${cardClass}`}>
                    <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-4">Tỷ lệ học sinh theo khối lớp</h2>
                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                    ) : gradeDistribution.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={gradeDistribution}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        innerRadius={55}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {gradeDistribution.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value} học sinh`, '']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </article>
            </section>

            {/* Today schedule + stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <School className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Lịch giảng dạy hôm nay</h2>
                        {!loading && (
                            <span className="ml-auto text-xs font-bold text-gray-400">
                                {todaySchedule.length} buổi học
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <p className="text-sm text-gray-400">Đang tải…</p>
                    ) : todaySchedule.length === 0 ? (
                        <p className="text-sm text-gray-400">Không có buổi học nào hôm nay.</p>
                    ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {todaySchedule.map((item) => (
                                <div key={item.timetableID} className="rounded-xl border border-gray-200 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {formatTime(item.startTime)} – {formatTime(item.endTime)}
                                        </p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            item.status === 'ONGOING'
                                                ? 'bg-green-100 text-green-700'
                                                : item.status === 'COMPLETED'
                                                ? 'bg-gray-100 text-gray-500'
                                                : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {item.status === 'ONGOING' ? 'Đang diễn ra' : item.status === 'COMPLETED' ? 'Đã kết thúc' : 'Sắp diễn ra'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{item.className} · {item.subjectName}</p>
                                    {item.teacherName && (
                                        <p className="text-xs text-gray-500 mt-0.5">{item.teacherName}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock3 className="h-5 w-5 text-violet-600" />
                        <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Thống kê nhanh</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                            <span className="text-sm text-gray-700">Sĩ số trung bình / lớp</span>
                            <span className="text-lg font-extrabold text-[#1A1A1A]">
                                {loading ? '…' : classStats ? classStats.averageClassSize : '–'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                            <span className="text-sm text-gray-700">Tổng số lớp học</span>
                            <span className="text-lg font-extrabold text-[#1A1A1A]">
                                {loading ? '…' : classStats ? classStats.totalClasses : '–'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                            <span className="text-sm text-gray-700">Buổi học hôm nay</span>
                            <span className="text-lg font-extrabold text-[#1A1A1A]">
                                {loading ? '…' : todaySchedule.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                            <span className="text-sm text-gray-700">Lớp chưa có giáo viên</span>
                            <span className={`text-lg font-extrabold ${urgentCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {loading ? '…' : urgentCount}
                            </span>
                        </div>
                    </div>
                </article>
            </section>
        </div>
    );
}
