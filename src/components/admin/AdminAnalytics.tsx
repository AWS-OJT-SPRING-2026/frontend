import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, GraduationCap, RefreshCw } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

/* ── types ──────────────────────────────────────────────────────────────── */
interface ApiRes<T> { code: number; message: string; result: T; }

interface TeacherItem {
    teacherID: number;
    fullName: string;
    specialization: string | null;
    isHomeroomTeacher: boolean;
    classes: string[] | null;
}

interface ClassroomItem {
    classID: number;
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

interface PageRes<T> { data: T[]; totalPages: number; }

interface TimetableStats {
    totalToday: number;
    ongoing: number;
    upcoming: number;
    completed: number;
}

/* ── constants ──────────────────────────────────────────────────────────── */
type TabKey = 'teachers' | 'classrooms' | 'timetable';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'teachers',   label: 'Giáo viên',        icon: <GraduationCap className="h-4 w-4" /> },
    { key: 'classrooms', label: 'Lớp học',           icon: <BookOpen className="h-4 w-4" /> },
    { key: 'timetable',  label: 'Lịch giảng hôm nay', icon: <Calendar className="h-4 w-4" /> },
];

const cardClass = 'rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-white p-5 md:p-6';

const STATUS_COLORS: Record<string, string> = {
    ACTIVE:    '#34D399',
    INACTIVE:  '#F87171',
    COMPLETED: '#93C5FD',
    FULL:      '#FBBF24',
};

/* ── component ──────────────────────────────────────────────────────────── */
export function AdminAnalytics() {
    const [activeTab, setActiveTab]         = useState<TabKey>('teachers');
    const [teachers, setTeachers]           = useState<TeacherItem[]>([]);
    const [classrooms, setClassrooms]       = useState<ClassroomItem[]>([]);
    const [classStats, setClassStats]       = useState<ClassroomStats | null>(null);
    const [timetableStats, setTimetableStats] = useState<TimetableStats | null>(null);
    const [loading, setLoading]             = useState(true);
    const [lastSyncedAt, setLastSyncedAt]   = useState(() => new Date());

    const fetchAll = useCallback(async () => {
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        try {
            const [teachersRes, classesRes, statsRes, ttRes] = await Promise.all([
                api.get<ApiRes<TeacherItem[]>>('/teachers', token),
                api.get<ApiRes<PageRes<ClassroomItem>>>('/classrooms?page=1&size=200', token),
                api.get<ApiRes<ClassroomStats>>('/classrooms/stats', token),
                api.get<ApiRes<TimetableStats>>('/timetables/stats'),
            ]);
            setTeachers(teachersRes.result ?? []);
            setClassrooms(classesRes.result?.data ?? []);
            setClassStats(statsRes.result);
            setTimetableStats(ttRes.result);
            setLastSyncedAt(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── derived data ─────────────────────────────────────────────────── */
    // Subject distribution: group classrooms by subject, count each
    const subjectDist = Object.entries(
        classrooms.reduce<Record<string, number>>((acc, cls) => {
            acc[cls.subjectName] = (acc[cls.subjectName] ?? 0) + 1;
            return acc;
        }, {})
    )
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Classroom status distribution for pie chart
    const statusDist = Object.entries(
        classrooms.reduce<Record<string, number>>((acc, cls) => {
            acc[cls.status] = (acc[cls.status] ?? 0) + 1;
            return acc;
        }, {})
    ).map(([status, value]) => ({
        name: status === 'ACTIVE' ? 'Đang học'
            : status === 'INACTIVE' ? 'Đã khoá'
            : status === 'COMPLETED' ? 'Đã kết thúc'
            : status === 'FULL' ? 'Đủ sĩ số'
            : status,
        value,
        color: STATUS_COLORS[status] ?? '#9CA3AF',
    }));

    const homeroomCount = teachers.filter(t => t.isHomeroomTeacher).length;
    const teachersWithClasses = teachers.filter(t => (t.classes?.length ?? 0) > 0).length;

    /* ── tabs ─────────────────────────────────────────────────────────── */
    const renderTeachersTab = () => (
        <div className="space-y-6">
            {/* summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    { label: 'Tổng giáo viên',      value: teachers.length },
                    { label: 'Đang phụ trách lớp',  value: teachersWithClasses },
                    { label: 'Giáo viên chủ nhiệm', value: homeroomCount },
                ].map(({ label, value }) => (
                    <article key={label} className={cardClass}>
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{loading ? '…' : value}</p>
                    </article>
                ))}
            </div>

            {/* teacher table */}
            <article className={cardClass}>
                <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">Danh sách giáo viên</h3>
                {loading ? (
                    <p className="text-sm text-gray-400 py-6 text-center">Đang tải…</p>
                ) : teachers.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">Chưa có giáo viên nào.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="py-2 pr-3 font-extrabold">Họ tên</th>
                                    <th className="py-2 pr-3 font-extrabold">Chuyên môn</th>
                                    <th className="py-2 pr-3 font-extrabold text-center">Số lớp</th>
                                    <th className="py-2 font-extrabold">Các lớp phụ trách</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teachers.map((t) => (
                                    <tr key={t.teacherID} className="border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 pr-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                                                    {t.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-[#1A1A1A]">{t.fullName}</p>
                                                    {t.isHomeroomTeacher && (
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Chủ nhiệm</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 pr-3 text-gray-600">{t.specialization || '—'}</td>
                                        <td className="py-3 pr-3 text-center">
                                            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-extrabold">
                                                {t.classes?.length ?? 0}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {t.classes && t.classes.length > 0
                                                    ? t.classes.map(c => (
                                                        <span key={c} className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">{c}</span>
                                                    ))
                                                    : <span className="text-xs text-gray-400 italic">Chưa phụ trách lớp nào</span>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </article>
        </div>
    );

    const renderClassroomsTab = () => (
        <div className="space-y-6">
            {/* stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng số lớp',         value: classStats?.totalClasses ?? '—', bg: 'bg-[#FFF3C9]' },
                    { label: 'Đang hoạt động',       value: classStats?.activeClasses ?? '—', bg: 'bg-[#DDF7F1]' },
                    { label: 'Chưa có giáo viên',    value: classStats?.unassignedClasses ?? '—', bg: 'bg-[#FFE5E5]' },
                    { label: 'Sĩ số trung bình',     value: classStats?.averageClassSize ?? '—', bg: 'bg-[#EDE8FF]' },
                ].map(({ label, value, bg }) => (
                    <article key={label} className={`rounded-3xl border-2 border-[#1A1A1A] shadow-sm p-5 ${bg}`}>
                        <p className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider">{label}</p>
                        <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{loading ? '…' : value}</p>
                    </article>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* subject distribution */}
                <article className={cardClass}>
                    <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">Số lớp theo môn học</h3>
                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                    ) : subjectDist.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subjectDist} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="subject" width={110} tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(v: number) => [`${v} lớp`, 'Số lớp']} />
                                    <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} name="Số lớp" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </article>

                {/* status pie */}
                <article className={cardClass}>
                    <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">Trạng thái lớp học</h3>
                    {loading ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Đang tải…</div>
                    ) : statusDist.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusDist}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        innerRadius={50}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {statusDist.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => [`${v} lớp`, '']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </article>
            </div>
        </div>
    );

    const renderTimetableTab = () => {
        const stats = timetableStats;
        const items = [
            { label: 'Tổng buổi hôm nay', value: stats?.totalToday ?? 0, color: 'bg-[#EDE8FF]' },
            { label: 'Đang diễn ra',       value: stats?.ongoing   ?? 0, color: 'bg-[#DDF7F1]' },
            { label: 'Sắp diễn ra',        value: stats?.upcoming  ?? 0, color: 'bg-[#FFF3C9]' },
            { label: 'Đã kết thúc',        value: stats?.completed ?? 0, color: 'bg-[#F3F4F6]' },
        ];
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {items.map(({ label, value, color }) => (
                        <article key={label} className={`rounded-3xl border-2 border-[#1A1A1A] shadow-sm p-5 ${color}`}>
                            <p className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider">{label}</p>
                            <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{loading ? '…' : value}</p>
                        </article>
                    ))}
                </div>

                {!loading && stats && (
                    <article className={cardClass}>
                        <h3 className="text-base font-extrabold text-[#1A1A1A] mb-4">Tỷ lệ buổi học hôm nay</h3>
                        {stats.totalToday === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">Không có buổi học nào hôm nay.</p>
                        ) : (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Đang diễn ra', value: stats.ongoing,   color: '#34D399' },
                                                { name: 'Sắp diễn ra',  value: stats.upcoming,  color: '#FBBF24' },
                                                { name: 'Đã kết thúc',  value: stats.completed, color: '#93C5FD' },
                                            ].filter(d => d.value > 0)}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            innerRadius={50}
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {[
                                                { name: 'Đang diễn ra', color: '#34D399' },
                                                { name: 'Sắp diễn ra',  color: '#FBBF24' },
                                                { name: 'Đã kết thúc',  color: '#93C5FD' },
                                            ].filter((_, i) => [stats.ongoing, stats.upcoming, stats.completed][i] > 0)
                                             .map(entry => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => [`${v} buổi`, '']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </article>
                )}
            </div>
        );
    };

    /* ── render ───────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#F7F7F2] p-6 md:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* header */}
            <div className="sticky top-0 z-10 mb-6 rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FAF9F6]/95 backdrop-blur px-5 py-4">
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
                        onClick={fetchAll}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1A1A1A]/20 bg-white px-4 py-2 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                </div>

                {/* tab bar */}
                <div className="mt-4 flex gap-2 flex-wrap">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold border-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]'
                                    : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/20 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* tab content */}
            {activeTab === 'teachers'   && renderTeachersTab()}
            {activeTab === 'classrooms' && renderClassroomsTab()}
            {activeTab === 'timetable'  && renderTimetableTab()}
        </div>
    );
}
