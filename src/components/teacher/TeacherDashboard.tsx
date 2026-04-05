import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendUp, Users, Warning, NotePencil, Funnel } from '@phosphor-icons/react';
import { Bell, Bot, PencilLine, Save, Send, X } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, LabelList,
} from 'recharts';

type StudentGrade = {
    id: string;
    name: string;
    className: string;
    gk: number;
    ck: number;
    tb: number;
    status: string;
    initial: string;
    bg: string;
    teacherNote?: string;
};

const MOCK_GRADES: StudentGrade[] = [
    { id: 'HS01234', name: 'Nguyễn Văn Lộc', className: '12A1', gk: 9.5, ck: 9.0, tb: 9.25, status: 'Xuất sắc', initial: 'NL', bg: '#95E1D3' },
    { id: 'HS01235', name: 'Trần Thị Anh', className: '12A1', gk: 4.5, ck: 3.5, tb: 4.0, status: 'Cần hỗ trợ', initial: 'TA', bg: '#FFB5B5' },
    { id: 'HS01236', name: 'Phạm Minh Huy', className: '11B2', gk: 7.5, ck: 8.0, tb: 7.75, status: 'Khá', initial: 'PH', bg: '#B8B5FF' },
    { id: 'HS01237', name: 'Lê Hoàng Minh', className: '10C3', gk: 6.0, ck: 5.5, tb: 5.75, status: 'Trung bình', initial: 'LM', bg: '#FCE38A' },
    { id: 'HS01238', name: 'Đỗ Thị Lan', className: '11B2', gk: 8.0, ck: 8.5, tb: 8.25, status: 'Xuất sắc', initial: 'DL', bg: '#95E1D3' },
    { id: 'HS01239', name: 'Vũ Quang Hải', className: '10C3', gk: 5.5, ck: 6.0, tb: 5.75, status: 'Khá', initial: 'VH', bg: '#B8B5FF' },
];

const CHART_DATA = [
    { label: '0-3', value: 3, gradientId: 'barGrad0' },
    { label: '4-5', value: 7, gradientId: 'barGrad1' },
    { label: '6-7', value: 14, gradientId: 'barGrad2' },
    { label: '8-9', value: 18, gradientId: 'barGrad3' },
    { label: '10', value: 8, gradientId: 'barGrad4' },
];

const GRADIENT_COLORS = [
    { from: '#FFB5B5', to: '#ff8e8e' },
    { from: '#FCE38A', to: '#f5cc4a' },
    { from: '#B8B5FF', to: '#9490f5' },
    { from: '#FF8F75', to: '#FF6B4A' },
    { from: '#95E1D3', to: '#5ecfbc' },
];

const CHAPTERS = [
    { label: 'Chương 1: Đạo hàm & Ứng dụng', val: 88 },
    { label: 'Chương 2: Hàm số lũy thừa', val: 75 },
    { label: 'Chương 3: Nguyên hàm & Tích phân', val: 52 },
    { label: 'Chương 4: Số phức', val: 41 },
];

const STATUS_FILTERS = ['Tất cả', 'Xuất sắc', 'Khá', 'Cần hỗ trợ'];
const CLASS_FILTERS = ['Tất cả lớp', '12A1', '11B2', '10C3'];
const SCORE_FILTERS = ['Tất cả mức điểm', '>= 8', '6 - 8', '< 6'];

const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
        <text x={x + width / 2} y={y - 6} fill="#6b7280" textAnchor="middle" fontSize={12} fontWeight={700}>
            {value}
        </text>
    );
};

const getPerformanceColor = (val: number): string => {
    if (val < 35) {
        return '#FFB5B5';
    }
    if (val < 50) {
        return '#FF8F75';
    }
    if (val > 80) {
        return '#95E1D3';
    }
    return '#B8B5FF';
};

export function TeacherDashboard() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');
    const [globalClassFilter, setGlobalClassFilter] = useState('Tất cả lớp');
    const [globalStatusFilter, setGlobalStatusFilter] = useState('Tất cả');
    const [globalScoreFilter, setGlobalScoreFilter] = useState('Tất cả mức điểm');
    const [gradesData, setGradesData] = useState<StudentGrade[]>(MOCK_GRADES);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        assignmentScore: '',
        testScore: '',
        status: 'Khá',
        teacherNote: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [useAiSuggestion, setUseAiSuggestion] = useState(true);
    const [notifyForm, setNotifyForm] = useState({
        title: 'Nhắc lịch kiểm tra tuần này',
        content: 'Các em ôn tập Chương 3 và nộp bài tập trước thứ Sáu.',
        classTarget: 'Tất cả lớp',
    });

    const quickTags = ['Nỗ lực', 'Chăm chỉ', 'Cần cố gắng'];

    const dashboardFilteredGrades = useMemo(() => {
        return gradesData.filter((student) => {
            const matchesClass = globalClassFilter === 'Tất cả lớp' || student.className === globalClassFilter;
            const matchesStatus = globalStatusFilter === 'Tất cả' || student.status === globalStatusFilter;
            const matchesScore =
                globalScoreFilter === 'Tất cả mức điểm'
                || (globalScoreFilter === '>= 8' && student.tb >= 8)
                || (globalScoreFilter === '6 - 8' && student.tb >= 6 && student.tb < 8)
                || (globalScoreFilter === '< 6' && student.tb < 6);

            return matchesClass && matchesStatus && matchesScore;
        });
    }, [gradesData, globalClassFilter, globalStatusFilter, globalScoreFilter]);

    const filteredGrades = useMemo(() => {
        return dashboardFilteredGrades.filter(hs => hs.name.toLowerCase().includes(searchQuery.toLowerCase()) || hs.id.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [dashboardFilteredGrades, searchQuery]);

    const averageScore = useMemo(() => {
        if (dashboardFilteredGrades.length === 0) {
            return 0;
        }

        return dashboardFilteredGrades.reduce((sum, student) => sum + student.tb, 0) / dashboardFilteredGrades.length;
    }, [dashboardFilteredGrades]);

    const dynamicStatCards = useMemo(() => {
        const total = dashboardFilteredGrades.length;
        const passCount = dashboardFilteredGrades.filter((student) => student.tb >= 5).length;
        const supportCount = dashboardFilteredGrades.filter((student) => student.status === 'Cần hỗ trợ' || student.tb < 5).length;

        return [
            { label: 'Điểm trung bình', value: averageScore.toFixed(1), delta: total > 0 ? `/ ${total} HS` : 'Không có dữ liệu', icon: TrendUp, bg: '#FCE38A' },
            { label: 'Tỷ lệ đạt', value: total > 0 ? `${Math.round((passCount / total) * 100)}%` : '0%', delta: `${passCount}/${total} em`, icon: Users, bg: '#95E1D3' },
            { label: 'HS cần hỗ trợ', value: String(supportCount).padStart(2, '0'), delta: `/${total} em`, icon: Warning, bg: '#FFB5B5' },
            { label: 'Bài đã chấm', value: String(total).padStart(2, '0'), delta: 'bài kiểm tra', icon: NotePencil, bg: '#B8B5FF' },
        ];
    }, [dashboardFilteredGrades, averageScore]);

    const statPalette = isDark
        ? ['#28271f', '#1c2c2b', '#2f2327', '#25283a']
        : dynamicStatCards.map(s => s.bg);

    const chapterPalette = isDark
        ? ['#78b9b2', '#8a86c8', '#b7a76a', '#b07a84']
        : ['#95E1D3', '#B8B5FF', '#FCE38A', '#FFB5B5'];

    const gradeBadgePalette = isDark
        ? ['#5ca89d', '#b97373', '#6e6ab8', '#9f8c3d', '#5ca89d', '#6e6ab8']
        : gradesData.map(hs => hs.bg);

    const dynamicChartData = useMemo(() => {
        const buckets = [0, 0, 0, 0, 0];

        dashboardFilteredGrades.forEach((student) => {
            if (student.tb < 4) buckets[0] += 1;
            else if (student.tb < 6) buckets[1] += 1;
            else if (student.tb < 8) buckets[2] += 1;
            else if (student.tb < 10) buckets[3] += 1;
            else buckets[4] += 1;
        });

        return CHART_DATA.map((item, index) => ({ ...item, value: buckets[index] }));
    }, [dashboardFilteredGrades]);

    const dynamicChapters = useMemo(() => {
        const ratio = Math.max(0.6, Math.min(1.2, averageScore / 7.5 || 1));

        return CHAPTERS.map((chapter) => ({
            ...chapter,
            val: Math.max(30, Math.min(98, Math.round(chapter.val * ratio))),
        }));
    }, [averageScore]);

    const editingStudent = useMemo(
        () => gradesData.find((student) => student.id === editingStudentId) || null,
        [gradesData, editingStudentId],
    );

    const openEditModal = (student: StudentGrade) => {
        setEditingStudentId(student.id);
        setEditForm({
            assignmentScore: student.gk.toString(),
            testScore: student.ck.toString(),
            status: student.status,
            teacherNote: student.teacherNote || '',
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingStudentId(null);
        setIsSaving(false);
    };

    const isScoreOutOfRange = (value: string) => {
        const parsed = Number(value);
        return !Number.isFinite(parsed) || parsed < 0 || parsed > 10;
    };

    const isAssignmentInvalid = isScoreOutOfRange(editForm.assignmentScore);
    const isTestInvalid = isScoreOutOfRange(editForm.testScore);

    const handleSaveEdit = () => {
        if (!editingStudentId || isSaving || isAssignmentInvalid || isTestInvalid) {
            return;
        }

        setIsSaving(true);
        const nextAssignmentScore = Number(editForm.assignmentScore);
        const nextTestScore = Number(editForm.testScore);

        window.setTimeout(() => {
            setGradesData((prev) =>
                prev.map((student) => {
                    if (student.id !== editingStudentId) {
                        return student;
                    }

                    const gk = Number.isFinite(nextAssignmentScore) ? nextAssignmentScore : student.gk;
                    const ck = Number.isFinite(nextTestScore) ? nextTestScore : student.ck;
                    const tb = Number(((gk + ck) / 2).toFixed(2));

                    return {
                        ...student,
                        gk,
                        ck,
                        tb,
                        status: editForm.status,
                        teacherNote: editForm.teacherNote,
                    };
                }),
            );

            closeEditModal();
        }, 700);
    };

    const getChapterBarColor = (val: number, index: number): string => {
        if (val < 50 || val > 80) {
            return getPerformanceColor(val);
        }
        return chapterPalette[index];
    };

    const closeNotifyModal = () => {
        setIsNotifyModalOpen(false);
        setIsSendingNotification(false);
    };

    const handleSendNotification = () => {
        if (!notifyForm.title.trim() || !notifyForm.content.trim() || isSendingNotification) {
            return;
        }

        setIsSendingNotification(true);
        window.setTimeout(() => {
            closeNotifyModal();
        }, 800);
    };

    const overlayRoot = typeof document !== 'undefined' ? document.body : null;

    return (
        <div
            className="p-8 space-y-8 max-w-7xl mx-auto"
            style={{
                fontFamily: "'Nunito', sans-serif",
                backgroundImage: isDark
                    ? 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Cập nhật 10 phút trước</p>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thống kê Lớp học Học kỳ I</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm transition-colors ${isDark
                        ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]'
                        : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'
                        }`}>
                        <Funnel className="w-4 h-4" /> Lọc dữ liệu
                    </button>
                    <button
                        onClick={() => setIsNotifyModalOpen(true)}
                        className={`flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm transition-colors ${isDark
                            ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]'
                            : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'
                            }`}>
                        <Bell className="w-4 h-4" /> Gửi thông báo cho cả lớp
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dynamicStatCards.map((s, i) => (
                    <div
                        key={i}
                        className={`rounded-2xl p-6 border-2 shadow-sm ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}
                        style={{ backgroundColor: statPalette[i], boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-300/80' : 'text-[#1A1A1A]/60'}`}>{s.label}</span>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                                <s.icon className={`w-4 h-4 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} weight="fill" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-4xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{s.value}</span>
                            <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{s.delta}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recharts Bar Chart */}
                <div
                    className={`rounded-2xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}
                    style={{ boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)' }}
                >
                    <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Phổ điểm lớp học</h3>
                    </div>
                    <div className="p-6">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={dynamicChartData} margin={{ top: 24, right: 8, left: -20, bottom: 4 }} barCategoryGap="28%">
                                <defs>
                                    {GRADIENT_COLORS.map((g, i) => (
                                        <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                                            <stop offset="100%" stopColor={g.to} stopOpacity={0.85} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 12, fontWeight: 700, fill: isDark ? '#9ca3af' : '#6b7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#6b7280' : '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(0,0,0,0.12)',
                                        background: isDark ? '#1e2228' : '#fff',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        color: isDark ? '#f3f4f6' : '#1A1A1A',
                                    }}
                                    formatter={(value: number) => [value + ' học sinh', 'Điểm']}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="value" content={<CustomBarLabel />} />
                                    {dynamicChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} strokeWidth={1.5} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-center mt-2 text-xs italic text-gray-400 font-semibold">Đa số học sinh nằm trong khoảng điểm khá (8-9)</p>
                    </div>
                </div>

                {/* Chapter Progress Bars */}
                <div
                    className={`rounded-2xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}
                    style={{ boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)' }}
                >
                    <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Tỷ lệ đúng theo Chương học</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {dynamicChapters.map((item, i) => {
                            const isWarning = item.val < 50;
                            const barColor = getChapterBarColor(item.val, i);
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm font-extrabold">
                                        <span className={isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}>{item.label}</span>
                                        <span className={isWarning ? (item.val < 35 ? 'text-[#FF8F75]' : 'text-[#FF6B4A]') : item.val > 80 ? 'text-[#5ecfbc]' : (isDark ? 'text-gray-100' : 'text-[#1A1A1A]')}>
                                            {item.val}%
                                        </span>
                                    </div>
                                    <div className={`h-3 w-full rounded-full overflow-hidden border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/10 border-[#1A1A1A]/20'}`}>
                                        <div
                                            className="h-full rounded-full border-r-2 transition-all duration-500"
                                            style={{
                                                width: `${item.val}%`,
                                                backgroundColor: barColor,
                                                borderRightColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(26,26,26,0.3)',
                                            }}
                                        />
                                    </div>
                                    {isWarning && (
                                        <p className="text-xs font-bold" style={{ color: item.val < 35 ? '#FF8F75' : '#FF6B4A' }}>
                                            ⚠ Học sinh cần được hỗ trợ thêm ở chương này
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Students table */}
            <div
                className={`rounded-2xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}
                style={{ boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.07)' }}
            >
                <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                            {globalClassFilter === 'Tất cả lớp' ? 'Bảng điểm toàn khối' : `Bảng điểm lớp ${globalClassFilter}`}
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Tìm học sinh..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={`h-10 px-3 border-2 rounded-xl font-semibold text-sm outline-none transition-colors w-full sm:w-44 ${isDark
                                    ? 'bg-white/5 border-white/15 text-gray-200 placeholder-gray-500 focus:border-white/30'
                                    : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/20 text-[#1A1A1A] placeholder-gray-400 focus:border-[#1A1A1A]/40'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className={`text-xs font-extrabold uppercase tracking-wider border-b-2 sticky top-0 z-10 ${isDark ? 'bg-[#171b20] text-gray-400 border-white/10' : 'bg-white text-[#1A1A1A]/50 border-[#1A1A1A]/20'}`}>
                            <tr>
                                <th className="px-6 py-4">Học sinh</th>
                                <th className="px-6 py-4">Mã HS</th>
                                <th className="px-6 py-4 text-center">GK I</th>
                                <th className="px-6 py-4 text-center">CK I</th>
                                <th className="px-6 py-4 text-center">Trung bình</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className={isDark ? 'divide-y divide-white/10' : 'divide-y divide-[#1A1A1A]/10'}>
                            {filteredGrades.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`px-6 py-8 text-center text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Không tìm thấy học sinh phù hợp
                                    </td>
                                </tr>
                            ) : filteredGrades.map((hs) => {
                                const originalIdx = gradesData.findIndex(g => g.id === hs.id);
                                return (
                                    <tr key={hs.id} className={isDark ? 'hover:bg-white/5 transition-colors' : 'hover:bg-gray-50 transition-colors'}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-extrabold text-xs ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}
                                                    style={{ backgroundColor: gradeBadgePalette[originalIdx] }}
                                                >
                                                    {hs.initial}
                                                </div>
                                                <span className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{hs.id}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.gk.toFixed(1)}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.ck.toFixed(1)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className="inline-flex items-center justify-center w-12 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]"
                                                style={{ backgroundColor: gradeBadgePalette[originalIdx], color: '#1A1A1A' }}
                                            >
                                                {hs.tb.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold border-2 border-[#1A1A1A]/20"
                                                style={{ backgroundColor: gradeBadgePalette[originalIdx], color: '#1A1A1A' }}
                                            >
                                                {hs.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openEditModal(hs)}
                                                className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FF6B4A] hover:text-[#ff5535] transition-colors"
                                            >
                                                <PencilLine className="w-3.5 h-3.5" /> Chỉnh sửa
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className={`p-4 border-t-2 flex items-center justify-between text-sm font-bold text-gray-400 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                    <div>Hiển thị {filteredGrades.length} trên {dashboardFilteredGrades.length} học sinh</div>
                    <div className="flex gap-2">
                        {['<', '1', '2', '3', '>'].map((p, i) => (
                            <button key={i} className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 ${i === 1
                                ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]'
                                : isDark
                                    ? 'bg-[#20242b] border-white/15 text-gray-100 hover:bg-[#272c35]'
                                    : 'bg-white border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-gray-50'
                                }`}>{p}</button>
                        ))}
                    </div>
                </div>
            </div>

            {isFilterModalOpen && overlayRoot && createPortal(
                <>
                    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9998] bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)} />
                    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4" onClick={() => setIsFilterModalOpen(false)}>
                    <div className="w-full max-w-lg rounded-2xl bg-white border border-[#1A1A1A]/15 shadow-[0_10px_40px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-[#1A1A1A]/10 flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-[#1A1A1A]">Lọc tổng thể thống kê lớp học</h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="w-10 h-10 rounded-xl border border-[#1A1A1A]/15 hover:bg-gray-50 flex items-center justify-center">
                                <X className="w-5 h-5 text-[#1A1A1A]" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Lớp học</span>
                                <select
                                    value={globalClassFilter}
                                    onChange={(e) => setGlobalClassFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                >
                                    {CLASS_FILTERS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Trạng thái</span>
                                <select
                                    value={globalStatusFilter}
                                    onChange={(e) => setGlobalStatusFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                >
                                    {STATUS_FILTERS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Mức điểm</span>
                                <select
                                    value={globalScoreFilter}
                                    onChange={(e) => setGlobalScoreFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                >
                                    {SCORE_FILTERS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-[#1A1A1A]/10 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setGlobalClassFilter('Tất cả lớp');
                                    setGlobalStatusFilter('Tất cả');
                                    setGlobalScoreFilter('Tất cả mức điểm');
                                }}
                                className="h-10 px-5 rounded-xl border border-[#1A1A1A]/20 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                            >
                                Đặt lại
                            </button>
                            <button onClick={() => setIsFilterModalOpen(false)} className="h-10 px-5 rounded-xl bg-[#FF6B4A] text-white text-sm font-extrabold hover:bg-[#ff5535] transition-colors">
                                Áp dụng
                            </button>
                        </div>
                    </div>
                    </div>
                </>,
                overlayRoot,
            )}

            {isNotifyModalOpen && overlayRoot && createPortal(
                <>
                    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9998] bg-black/60 backdrop-blur-sm" onClick={closeNotifyModal} />
                    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4" onClick={closeNotifyModal}>
                    <div className="w-full max-w-xl rounded-2xl bg-white border border-[#1A1A1A]/15 shadow-[0_10px_40px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-[#1A1A1A]/10 flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-[#1A1A1A]">Gửi thông báo cho cả lớp</h3>
                            <button onClick={closeNotifyModal} className="w-10 h-10 rounded-xl border border-[#1A1A1A]/15 hover:bg-gray-50 flex items-center justify-center">
                                <X className="w-5 h-5 text-[#1A1A1A]" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Lớp nhận thông báo</span>
                                <select
                                    value={notifyForm.classTarget}
                                    onChange={(e) => setNotifyForm((prev) => ({ ...prev, classTarget: e.target.value }))}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                >
                                    {CLASS_FILTERS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Tiêu đề</span>
                                <input
                                    value={notifyForm.title}
                                    onChange={(e) => setNotifyForm((prev) => ({ ...prev, title: e.target.value }))}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                    placeholder="Nhập tiêu đề thông báo"
                                />
                            </label>

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Nội dung</span>
                                <textarea
                                    rows={4}
                                    value={notifyForm.content}
                                    onChange={(e) => setNotifyForm((prev) => ({ ...prev, content: e.target.value }))}
                                    className="w-full rounded-xl border border-[#1A1A1A]/20 px-3 py-2 text-sm font-semibold text-[#1A1A1A] outline-none resize-none focus:border-[#FF6B4A]"
                                    placeholder="Nhập nội dung gửi cho học sinh"
                                />
                            </label>

                            <label className="flex items-center justify-between rounded-xl border border-[#1A1A1A]/10 px-3 py-2">
                                <span className="text-sm font-bold text-[#1A1A1A]/80 inline-flex items-center gap-2">
                                    <Bot className="w-4 h-4 text-[#FF6B4A]" /> Gợi ý nội dung bằng AI
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setUseAiSuggestion((prev) => !prev)}
                                    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${useAiSuggestion ? 'bg-[#FF6B4A]' : 'bg-[#1A1A1A]/20'}`}
                                >
                                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${useAiSuggestion ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-[#1A1A1A]/10 flex items-center justify-end gap-3">
                            <button
                                onClick={closeNotifyModal}
                                className="h-10 px-5 rounded-xl border border-[#1A1A1A]/20 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSendNotification}
                                disabled={!notifyForm.title.trim() || !notifyForm.content.trim() || isSendingNotification}
                                className="h-10 px-5 rounded-xl bg-[#FF6B4A] text-white text-sm font-extrabold hover:bg-[#ff5535] disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" /> {isSendingNotification ? 'Đang gửi...' : 'Gửi thông báo'}
                            </button>
                        </div>
                    </div>
                    </div>
                </>,
                overlayRoot,
            )}

            {isEditModalOpen && editingStudent && overlayRoot && createPortal(
                <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white border border-[#1A1A1A]/15 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
                        <div className="px-6 py-4 border-b border-[#1A1A1A]/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PencilLine className="w-5 h-5 text-[#FF6B4A]" />
                                <h3 className="text-lg font-extrabold text-[#1A1A1A]">Chỉnh sửa: {editingStudent.name}</h3>
                            </div>
                            <button
                                onClick={closeEditModal}
                                className="w-10 h-10 rounded-xl border border-[#1A1A1A]/15 text-[#1A1A1A] hover:bg-gray-50 transition-colors flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="space-y-1.5">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80">Điểm bài tập</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={10}
                                        value={editForm.assignmentScore}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, assignmentScore: e.target.value }))}
                                        className={`h-10 w-full rounded-xl border px-3 text-sm font-semibold text-[#1A1A1A] outline-none ${isAssignmentInvalid ? 'border-red-300 focus:border-red-400' : 'border-[#1A1A1A]/20 focus:border-[#FF6B4A]'}`}
                                    />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80">Điểm kiểm tra</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={10}
                                        value={editForm.testScore}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, testScore: e.target.value }))}
                                        className={`h-10 w-full rounded-xl border px-3 text-sm font-semibold text-[#1A1A1A] outline-none ${isTestInvalid ? 'border-red-300 focus:border-red-400' : 'border-[#1A1A1A]/20 focus:border-[#FF6B4A]'}`}
                                    />
                                </label>
                            </div>

                            {(isAssignmentInvalid || isTestInvalid) && (
                                <p className="text-xs text-red-400 font-semibold">Điểm hợp lệ trong khoảng 0 - 10.</p>
                            )}

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Trạng thái học tập</span>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                                    className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                >
                                    {['Xuất sắc', 'Khá', 'Cần hỗ trợ'].map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5 block">
                                <span className="text-sm font-bold text-[#1A1A1A]/80">Nhận xét giáo viên</span>
                                <textarea
                                    rows={4}
                                    value={editForm.teacherNote}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, teacherNote: e.target.value }))}
                                    className="w-full rounded-xl border border-[#1A1A1A]/20 px-3 py-2 text-sm font-semibold text-[#1A1A1A] outline-none resize-none focus:border-[#FF6B4A]"
                                    placeholder="Thêm nhận xét cho học sinh..."
                                />
                            </label>

                            <div className="flex flex-wrap gap-2">
                                {quickTags.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                teacherNote: prev.teacherNote.trim().length === 0 ? tag : `${prev.teacherNote}, ${tag}`,
                                            }))
                                        }
                                        className="h-8 px-3 rounded-full border border-[#1A1A1A]/15 text-xs font-bold text-[#1A1A1A]/80 hover:bg-gray-50 transition-colors"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-[#1A1A1A]/10 flex items-center justify-end gap-3">
                            <button
                                onClick={closeEditModal}
                                className="h-10 px-5 rounded-xl border border-[#1A1A1A]/20 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving || isAssignmentInvalid || isTestInvalid}
                                className="h-10 px-5 rounded-xl bg-[#FF6B4A] text-white text-sm font-extrabold hover:bg-[#ff5535] disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>,
                overlayRoot,
            )}
        </div>
    );
}
