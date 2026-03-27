import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Download, CaretRight, Warning, CheckCircle, MagnifyingGlass,
    Eye, X, Users, GraduationCap,
    ArrowLeft, Envelope, Phone, House, Student,
    UserCircle, SortAscending,
} from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { isUserOnline, formatTimeAgo } from '../../lib/timeUtils';
import { useSettings } from '../../context/SettingsContext';

/* ── Color palette ── */
const CLASS_COLORS = ['#FCE38A', '#B8B5FF', '#FFB5B5', '#95E1D3'];
const STUDENT_COLORS = ['#FCE38A', '#B8B5FF', '#FFB5B5', '#95E1D3'];

/* ── Mock data: Classes ── */
const MOCK_CLASSES = [
    { id: 1, name: '10A1', subject: 'Toán Đại số', semester: 'HK1', year: '2025-2026', students: 42, maxStudents: 45, avgScore: 7.8, onlineCount: 28, needAttention: 4 },
    { id: 2, name: '10A2', subject: 'Toán Hình học', semester: 'HK1', year: '2025-2026', students: 38, maxStudents: 45, avgScore: 6.9, onlineCount: 15, needAttention: 8 },
    { id: 3, name: '11B3', subject: 'Giải Tích', semester: 'HK1', year: '2025-2026', students: 40, maxStudents: 45, avgScore: 8.2, onlineCount: 32, needAttention: 2 },
    { id: 4, name: '12C1', subject: 'Đại số Tuyến tính', semester: 'HK1', year: '2025-2026', students: 35, maxStudents: 40, avgScore: 7.5, onlineCount: 20, needAttention: 5 },
    { id: 5, name: '11A4', subject: 'Xác suất Thống kê', semester: 'HK1', year: '2025-2026', students: 44, maxStudents: 45, avgScore: 7.1, onlineCount: 18, needAttention: 6 },
    { id: 6, name: '12B2', subject: 'Hình học Không gian', semester: 'HK1', year: '2025-2026', students: 36, maxStudents: 40, avgScore: 8.5, onlineCount: 30, needAttention: 1 },
];

const nowStr = new Date().toISOString();
const tenMinsAgoStr = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const threeHoursAgoStr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
const oneDayAgoStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const threeDaysAgoStr = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
const oneWeekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

/* ── Mock data: Students for a class ── */
const MOCK_STUDENTS = [
    { id: '20240101', name: 'Nguyễn Hoàng Nam', email: 'nam.nguyenhoang@school.edu.vn', phone: '0912345678', completion: 92, tb: 8.5, lastActiveAt: nowStr, gender: 'Nam', dob: '15/03/2008', address: 'Quận 1, TP.HCM' },
    { id: '20240105', name: 'Lê Thị Minh Anh', email: 'anh.lethiminh@school.edu.vn', phone: '0923456789', completion: 75, tb: 7.2, lastActiveAt: threeHoursAgoStr, gender: 'Nữ', dob: '22/07/2008', address: 'Quận 3, TP.HCM' },
    { id: '20240112', name: 'Trần Văn Tú', email: 'tu.tranvan@school.edu.vn', phone: '0934567890', completion: 45, tb: 4.8, lastActiveAt: nowStr, gender: 'Nam', dob: '08/11/2008', address: 'Quận 7, TP.HCM' },
    { id: '20240118', name: 'Phạm Thảo Vy', email: 'vy.phamthao@school.edu.vn', phone: '0945678901', completion: 100, tb: 9.5, lastActiveAt: null, gender: 'Nữ', dob: '01/05/2008', address: 'Quận Bình Thạnh, TP.HCM' },
    { id: '20240122', name: 'Đặng Quốc Bảo', email: 'bao.dangquoc@school.edu.vn', phone: '0956789012', completion: 88, tb: 8.0, lastActiveAt: tenMinsAgoStr, gender: 'Nam', dob: '19/09/2008', address: 'Quận 2, TP.HCM' },
    { id: '20240130', name: 'Vũ Hải Yến', email: 'yen.vuhai@school.edu.vn', phone: '0967890123', completion: 60, tb: 6.3, lastActiveAt: oneDayAgoStr, gender: 'Nữ', dob: '14/02/2008', address: 'Quận Tân Bình, TP.HCM' },
    { id: '20240135', name: 'Hoàng Minh Đức', email: 'duc.hoangminh@school.edu.vn', phone: '0978901234', completion: 33, tb: 3.9, lastActiveAt: threeDaysAgoStr, gender: 'Nam', dob: '27/12/2008', address: 'Quận 10, TP.HCM' },
    { id: '20240140', name: 'Ngô Thanh Hà', email: 'ha.ngothanh@school.edu.vn', phone: '0989012345', completion: 95, tb: 9.0, lastActiveAt: oneWeekAgoStr, gender: 'Nữ', dob: '06/08/2008', address: 'Quận Phú Nhuận, TP.HCM' },
];

const CHART_DATA = [
    { w: 'T2', v1: 60, v2: 30 }, { w: 'T3', v1: 70, v2: 20 },
    { w: 'T4', v1: 65, v2: 25 }, { w: 'T5', v1: 80, v2: 15 },
    { w: 'T6', v1: 75, v2: 30 }, { w: 'T7', v1: 85, v2: 10 },
];

const NOTIFICATIONS = [
    { icon: 'clipboard', title: '12 học sinh chưa nộp bài', sub: 'Bài tập Toán Hình - Hạn 23:59 hôm nay', bg: '#FFB5B5' },
    { icon: 'warning', title: 'Trần Văn Tú vắng 3 buổi', sub: 'Cần liên hệ với phụ huynh học sinh', bg: '#FCE38A' },
    { icon: 'check', title: 'Đã chấm xong bài kiểm tra', sub: 'Điểm trung bình lớp đạt 7.8 (Tăng 0.5)', bg: '#95E1D3' },
];

type ViewMode = 'overview' | 'roster';
type TabFilter = 'all' | 'online' | 'offline' | 'attention';

/* ── Skeleton Loader ── */
function SkeletonCard() {
    return (
        <div className="rounded-3xl border-2 border-[#1A1A1A]/10 p-6 animate-pulse">
            <div className="h-4 bg-[#1A1A1A]/10 rounded-xl w-2/3 mb-4" />
            <div className="h-8 bg-[#1A1A1A]/10 rounded-xl w-1/3 mb-3" />
            <div className="h-3 bg-[#1A1A1A]/10 rounded-xl w-full mb-2" />
            <div className="h-3 bg-[#1A1A1A]/10 rounded-xl w-3/4" />
        </div>
    );
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#1A1A1A]/10" /><div><div className="h-4 w-24 bg-[#1A1A1A]/10 rounded mb-1" /><div className="h-3 w-16 bg-[#1A1A1A]/10 rounded" /></div></div></td>
            <td className="px-6 py-4"><div className="h-3 w-24 bg-[#1A1A1A]/10 rounded" /></td>
            <td className="px-6 py-4"><div className="h-8 w-10 bg-[#1A1A1A]/10 rounded-2xl mx-auto" /></td>
            <td className="px-6 py-4"><div className="h-3 w-16 bg-[#1A1A1A]/10 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-20 bg-[#1A1A1A]/10 rounded" /></td>
        </tr>
    );
}

/* ── Student Profile Modal ── */
function StudentProfileModal({ student, onClose }: { student: typeof MOCK_STUDENTS[0]; onClose: () => void }) {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const colorIdx = MOCK_STUDENTS.findIndex(s => s.id === student.id);
    const bg = STUDENT_COLORS[colorIdx % 4];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
            <div
                className={`relative w-full max-w-md rounded-3xl border-2 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: isDark ? '#202734' : bg }}>
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-extrabold text-2xl ${isDark ? 'border-white/20 text-gray-100 bg-white/10' : 'border-[#1A1A1A] text-[#1A1A1A] bg-white/50'}`}>
                        {student.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-extrabold text-xl ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.name}</h3>
                        <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>MSSV: {student.id}</p>
                    </div>
                    <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-100' : 'bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20'}`}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Info grid */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: UserCircle, label: 'Giới tính', value: student.gender },
                            { icon: GraduationCap, label: 'Ngày sinh', value: student.dob },
                            { icon: Envelope, label: 'Email', value: student.email },
                            { icon: Phone, label: 'Điện thoại', value: student.phone },
                        ].map(item => (
                            <div key={item.label} className="space-y-1">
                                <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/50'}`}>
                                    <item.icon className="w-3 h-3" /> {item.label}
                                </div>
                                <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/50'}`}>
                            <House className="w-3 h-3" /> Địa chỉ
                        </div>
                        <p className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.address}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/10'}`} style={{ backgroundColor: isDark ? undefined : student.completion >= 80 ? '#95E1D3' : student.completion >= 50 ? '#FCE38A' : '#FFB5B5' }}>
                            <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Hoàn thành</div>
                            <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.completion}%</div>
                        </div>
                        <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/10'}`} style={{ backgroundColor: isDark ? undefined : student.tb >= 8 ? '#95E1D3' : student.tb >= 5 ? '#B8B5FF' : '#FFB5B5' }}>
                            <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Điểm TB</div>
                            <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.tb.toFixed(1)}</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button className={`flex-1 py-3 font-extrabold rounded-2xl border-2 transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-100 border-white/10' : 'bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/10'}`}>
                        <Envelope className="w-4 h-4" /> Liên hệ
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──── MAIN COMPONENT ──── */
export function TeacherClassList() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [view, setView] = useState<ViewMode>('overview');
    const [selectedClass, setSelectedClass] = useState<typeof MOCK_CLASSES[0] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [sortBy, setSortBy] = useState('az');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStudent, setSelectedStudent] = useState<typeof MOCK_STUDENTS[0] | null>(null);
    const [hoveredClass, setHoveredClass] = useState<number | null>(null);
    const itemsPerPage = 5;

    // Simulate loading
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, [view]);

    const handleClassSelect = useCallback((cls: typeof MOCK_CLASSES[0]) => {
        setSelectedClass(cls);
        setView('roster');
        setActiveTab('all');
        setSearchQuery('');
        setCurrentPage(1);
    }, []);

    const handleBackToOverview = useCallback(() => {
        setView('overview');
        setSelectedClass(null);
    }, []);

    // Filter & sort students
    const filteredStudents = useMemo(() => {
        let result = [...MOCK_STUDENTS];

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q));
        }

        // Tab filter
        if (activeTab === 'online') result = result.filter(s => isUserOnline(s.lastActiveAt));
        if (activeTab === 'offline') result = result.filter(s => !isUserOnline(s.lastActiveAt));
        if (activeTab === 'attention') result = result.filter(s => s.completion < 50 || s.tb < 5);

        // Sort
        if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        if (sortBy === 'za') result.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
        if (sortBy === 'score_desc') result.sort((a, b) => b.tb - a.tb);
        if (sortBy === 'score_asc') result.sort((a, b) => a.tb - b.tb);
        if (sortBy === 'completion_desc') result.sort((a, b) => b.completion - a.completion);

        return result;
    }, [searchQuery, activeTab, sortBy]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const tabCounts = useMemo(() => ({
        all: MOCK_STUDENTS.length,
        online: MOCK_STUDENTS.filter(s => isUserOnline(s.lastActiveAt)).length,
        offline: MOCK_STUDENTS.filter(s => !isUserOnline(s.lastActiveAt)).length,
        attention: MOCK_STUDENTS.filter(s => s.completion < 50 || s.tb < 5).length,
    }), []);

    const classCardPalette = isDark
        ? ['#2f2a1a', '#252744', '#3a2025', '#173434']
        : CLASS_COLORS;

    const studentBadgePalette = isDark
        ? ['#9f8c3d', '#6e6ab8', '#b97373', '#5ca89d']
        : STUDENT_COLORS;

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* ═══ Breadcrumb ═══ */}
            <nav className="flex items-center gap-2 text-sm font-bold">
                <button
                    onClick={handleBackToOverview}
                    className={`flex items-center gap-1.5 transition-colors ${view === 'overview' ? 'text-[#FF6B4A]' : 'text-gray-400 hover:text-[#1A1A1A]'}`}
                >
                    <Student className="w-4 h-4" weight="fill" />
                    <span className="font-extrabold">Học sinh của tôi</span>
                </button>

                {view === 'roster' && selectedClass && (
                    <>
                        <CaretRight className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-[#FF6B4A] font-extrabold flex items-center gap-1.5">
                            <Student className="w-4 h-4" weight="fill" />
                            Lớp {selectedClass.name}
                        </span>
                    </>
                )}
            </nav>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* VIEW 1: CLASS OVERVIEW                                 */}
            {/* ═══════════════════════════════════════════════════════ */}
            {view === 'overview' && (
                <>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                                Quản lý {MOCK_CLASSES.length} lớp • Học kỳ I, 2025-2026
                            </p>
                            <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Học sinh của tôi</h1>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm lớp..."
                                    className={`pl-9 pr-4 h-10 border-2 rounded-2xl text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:border-[#FF6B4A] transition-colors w-48 ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A]'}`}
                                />
                            </div>
                        </div>
                    </div>



                    {/* Class Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {isLoading
                            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                            : MOCK_CLASSES.map((cls, idx) => (
                                <button
                                    key={cls.id}
                                    onClick={() => handleClassSelect(cls)}
                                    onMouseEnter={() => setHoveredClass(cls.id)}
                                    onMouseLeave={() => setHoveredClass(null)}
                                    className={`text-left rounded-3xl border-2 p-6 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-200 group relative overflow-hidden ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}
                                    style={{ backgroundColor: classCardPalette[idx % 4] }}
                                >
                                    {/* Decorative circle */}
                                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#1A1A1A]/5 group-hover:scale-125 transition-transform duration-300" />

                                    <div className="relative">
                                        {/* Class name */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className={`text-xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Lớp {cls.name}</h3>
                                                <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{cls.subject}</p>
                                            </div>
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform ${isDark ? 'bg-black/40' : 'bg-[#1A1A1A]'}`}>
                                                <GraduationCap className="w-5 h-5 text-white" weight="fill" />
                                            </div>
                                        </div>

                                        {/* Progress bar - enrollment */}
                                        <div className="mb-4">
                                            <div className={`flex justify-between text-xs font-extrabold mb-1.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>
                                                <span>Sĩ số: {cls.students}/{cls.maxStudents}</span>
                                                <span>{Math.round((cls.students / cls.maxStudents) * 100)}%</span>
                                            </div>
                                            <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isDark ? 'bg-white/35' : 'bg-[#1A1A1A]/40'}`}
                                                    style={{ width: `${(cls.students / cls.maxStudents) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                                                <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Điểm TB</div>
                                                <div className={`text-lg font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{cls.avgScore}</div>
                                            </div>
                                            <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                                                <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Online</div>
                                                <div className="text-lg font-extrabold text-emerald-600">{cls.onlineCount}</div>
                                            </div>
                                            <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                                                <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Chú ý</div>
                                                <div className="text-lg font-extrabold text-[#FF6B4A]">{cls.needAttention}</div>
                                            </div>
                                        </div>

                                        {/* Hover arrow */}
                                        <div className={`flex items-center gap-1.5 mt-4 text-sm font-extrabold transition-all duration-200 ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'} ${hoveredClass === cls.id ? 'translate-x-1 opacity-100' : 'opacity-60'}`}>
                                            Xem danh sách <CaretRight className="w-4 h-4" weight="bold" />
                                        </div>
                                    </div>
                                </button>
                            ))
                        }
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* VIEW 2: STUDENT ROSTER                                 */}
            {/* ═══════════════════════════════════════════════════════ */}
            {view === 'roster' && selectedClass && (
                <>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBackToOverview}
                                className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center active:scale-95 transition-all ${isDark ? 'border-white/15 bg-[#20242b] hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white hover:bg-[#1A1A1A]/5'}`}
                            >
                                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} />
                            </button>
                            <div>
                                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                                    Sĩ số: {selectedClass.students} • GVCN: Phan Văn A • {selectedClass.subject}
                                </p>
                                <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Danh sách lớp {selectedClass.name}</h1>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className={`flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm active:scale-95 transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}>
                                <Download className="w-4 h-4" weight="fill" /> Xuất báo cáo
                            </button>
                        </div>
                    </div>

                    {/* Student table */}
                    <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                        {/* Tabs + Search + Sort */}
                        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/20'}`}>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {([
                                    { key: 'all' as TabFilter, label: 'Tất cả', count: tabCounts.all },
                                    { key: 'online' as TabFilter, label: 'Đang Online', count: tabCounts.online },
                                    { key: 'offline' as TabFilter, label: 'Offline', count: tabCounts.offline },
                                    { key: 'attention' as TabFilter, label: 'Cần chú ý', count: tabCounts.attention },
                                ]).map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                                        className={`px-4 py-2 text-sm font-extrabold rounded-2xl whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                                            activeTab === tab.key
                                                ? 'bg-[#FF6B4A] text-white shadow-md shadow-[#FF6B4A]/20'
                                                : isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm tên hoặc MSSV..."
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        className={`pl-9 pr-4 h-9 border-2 rounded-2xl text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:border-[#FF6B4A] transition-colors w-52 ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100' : 'border-[#1A1A1A]/20 bg-[#F7F7F2] text-[#1A1A1A]'}`}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <SortAscending className="w-4 h-4 text-gray-400" />
                                    <Select value={sortBy} onValueChange={v => setSortBy(v)}>
                                        <SelectTrigger className={`w-40 rounded-2xl border-2 h-9 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20 text-[#1A1A1A]'}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="az">Tên (A-Z)</SelectItem>
                                            <SelectItem value="za">Tên (Z-A)</SelectItem>
                                            <SelectItem value="score_desc">Điểm giảm dần</SelectItem>
                                            <SelectItem value="score_asc">Điểm tăng dần</SelectItem>
                                            <SelectItem value="completion_desc">Hoàn thành giảm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`border-b-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/20'}`}>
                                    <tr>
                                        {['Họ tên', 'Tỷ lệ hoàn thành', 'Điểm TB', 'Trạng thái', 'Chi tiết'].map(h => (
                                            <th key={h} className={`px-6 py-4 text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={isDark ? 'divide-y divide-white/10' : 'divide-y divide-[#1A1A1A]/10'}>
                                    {isLoading
                                        ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                                        : paginatedStudents.length === 0
                                            ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-16 text-center">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Users className="w-12 h-12 text-gray-300" />
                                                            <p className="font-extrabold text-gray-400">Không tìm thấy học sinh phù hợp</p>
                                                            <button onClick={() => { setSearchQuery(''); setActiveTab('all'); }} className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">
                                                                Xóa bộ lọc
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                            : paginatedStudents.map((hs) => {
                                                const globalIdx = MOCK_STUDENTS.findIndex(s => s.id === hs.id);
                                                return (
                                                    <tr key={hs.id} className={isDark ? 'hover:bg-white/5 transition-colors group/row' : 'hover:bg-[#1A1A1A]/[0.03] transition-colors group/row'}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-extrabold text-sm group-hover/row:scale-110 transition-transform ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}
                                                                    style={{ backgroundColor: studentBadgePalette[globalIdx % 4] }}
                                                                >
                                                                    {hs.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.name}</div>
                                                                    <div className="text-xs text-gray-400 font-mono">{hs.id}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="w-36">
                                                                <div className={`flex justify-between text-xs font-extrabold mb-1 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                                                                    <span>{hs.completion}%</span>
                                                                    {hs.completion < 50 && <Warning className="w-3.5 h-3.5 text-[#FF6B4A]" weight="fill" />}
                                                                    {hs.completion === 100 && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" weight="fill" />}
                                                                </div>
                                                                <div className={`h-2.5 w-full rounded-full border overflow-hidden ${isDark ? 'bg-white/10 border-white/15' : 'bg-[#1A1A1A]/10 border-[#1A1A1A]/20'}`}>
                                                                    <div
                                                                        className="h-full rounded-full transition-all duration-500"
                                                                        style={{
                                                                            width: `${hs.completion}%`,
                                                                            backgroundColor: hs.completion < 50 ? '#FFB5B5' : hs.completion < 80 ? '#B8B5FF' : '#95E1D3',
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-extrabold text-sm border-2 ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}
                                                                style={{ backgroundColor: studentBadgePalette[globalIdx % 4] }}
                                                            >
                                                                {hs.tb.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${isUserOnline(hs.lastActiveAt) ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                                                <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}>
                                                                    {isUserOnline(hs.lastActiveAt) ? 'Online' : formatTimeAgo(hs.lastActiveAt)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 justify-center">
                                                                <button
                                                                    onClick={() => setSelectedStudent(hs)}
                                                                    className="w-8 h-8 rounded-xl bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 flex items-center justify-center transition-colors group/btn"
                                                                    title="Xem chi tiết"
                                                                >
                                                                    <Eye className="w-4 h-4 text-[#FF6B4A] group-hover/btn:scale-110 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    }
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className={`p-4 border-t-2 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                            <span className="text-sm font-bold text-gray-400">
                                Hiển thị {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredStudents.length)} / {filteredStudents.length} học sinh
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                                >
                                    &lt;
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 transition-all ${
                                            p === currentPage
                                                ? 'bg-[#FF6B4A] text-white border-[#FF6B4A] shadow-md shadow-[#FF6B4A]/20'
                                                : isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom section: Chart + Notifications */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className={`lg:col-span-2 rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                            <div className={`px-6 py-4 border-b-2 flex justify-between items-center ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                                <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thống kê điểm theo tuần</h3>
                                <button className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535] transition-colors">Xem đầy đủ →</button>
                            </div>
                            <div className="p-6 h-56 flex items-end justify-around pb-6 pt-6 gap-3">
                                {CHART_DATA.map((col, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 h-full flex-1 group/bar">
                                        <div className="w-full h-full flex flex-col justify-end gap-0.5">
                                            <div className={`w-full rounded-t-xl border-2 group-hover/bar:brightness-110 transition-all ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/30'}`} style={{ height: `${col.v1}%`, backgroundColor: '#FF6B4A' }} />
                                            <div className="w-full rounded-b-sm group-hover/bar:brightness-110 transition-all" style={{ height: `${col.v2}%`, backgroundColor: '#FCE38A' }} />
                                        </div>
                                        <span className={`text-xs font-extrabold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{col.w}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                            <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                                <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thông báo mới nhất</h3>
                            </div>
                            <div className="p-5 space-y-3 flex-1">
                                {NOTIFICATIONS.map((n, i) => (
                                    <div key={i} className={`flex gap-3 p-3 rounded-2xl border-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/15'}`} style={{ backgroundColor: isDark ? undefined : n.bg }}>
                                        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                                            {n.icon === 'warning' && <Warning className="w-4 h-4 text-yellow-600" weight="fill" />}
                                            {n.icon === 'check' && <CheckCircle className="w-4 h-4 text-emerald-600" weight="fill" />}
                                            {n.icon === 'clipboard' && <span className="text-sm font-extrabold text-red-500">!</span>}
                                        </div>
                                        <div>
                                            <h4 className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{n.title}</h4>
                                            <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{n.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={`p-4 border-t-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                                <button className={`w-full py-2.5 font-extrabold text-sm border-2 rounded-2xl active:scale-[0.98] transition-all ${isDark ? 'text-gray-100 border-white/15 hover:bg-white/5' : 'text-[#1A1A1A] border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5'}`}>
                                    Xem tất cả thông báo
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Student Profile Modal ═══ */}
            {selectedStudent && (
                <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
            )}

            {/* ═══ Keyframes ═══ */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
