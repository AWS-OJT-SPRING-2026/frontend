import { TrendUp, Users, Warning, NotePencil, Download, Funnel } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';


const MOCK_GRADES = [
    { id: 'HS01234', name: 'Nguyễn Văn Lộc', gk: 9.5, ck: 9.0, tb: 9.25, status: 'Xuất sắc', initial: 'NL', bg: '#95E1D3' },
    { id: 'HS01235', name: 'Trần Thị Anh', gk: 4.5, ck: 3.5, tb: 4.0, status: 'Cần hỗ trợ', initial: 'TA', bg: '#FFB5B5' },
    { id: 'HS01236', name: 'Phạm Minh Huy', gk: 7.5, ck: 8.0, tb: 7.75, status: 'Khá', initial: 'PH', bg: '#B8B5FF' },
    { id: 'HS01237', name: 'Lê Hoàng Minh', gk: 6.0, ck: 5.5, tb: 5.75, status: 'Trung bình', initial: 'LM', bg: '#FCE38A' },
];

const statCards = [
    { label: 'Điểm trung bình', value: '7.8', delta: '+0.4', icon: TrendUp, bg: '#FCE38A' },
    { label: 'Tỷ lệ đạt', value: '92%', delta: '↑ 2%', icon: Users, bg: '#95E1D3' },
    { label: 'HS cần hỗ trợ', value: '04', delta: '/45 em', icon: Warning, bg: '#FFB5B5' },
    { label: 'Bài đã chấm', value: '12', delta: 'bài kiểm tra', icon: NotePencil, bg: '#B8B5FF' },
];

const chartBars = [
    { label: '0-3', h: '20%', bg: '#FFB5B5' },
    { label: '4-5', h: '35%', bg: '#FCE38A' },
    { label: '6-7', h: '60%', bg: '#B8B5FF' },
    { label: '8-9', h: '100%', bg: '#FF6B4A' },
    { label: '10', h: '40%', bg: '#95E1D3' },
];

export function TeacherDashboard() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const statPalette = isDark
        ? ['#28271f', '#1c2c2b', '#2f2327', '#25283a']
        : statCards.map(s => s.bg);

    const chartPalette = isDark
        ? ['#8f6a73', '#9a8b5a', '#7873b8', '#c56b56', '#5c9c93']
        : chartBars.map(b => b.bg);

    const chapterPalette = isDark
        ? ['#78b9b2', '#8a86c8', '#b7a76a', '#b07a84']
        : ['#95E1D3', '#B8B5FF', '#FCE38A', '#FFB5B5'];

    const gradeBadgePalette = isDark
        ? ['#5ca89d', '#b97373', '#6e6ab8', '#9f8c3d']
        : MOCK_GRADES.map(hs => hs.bg);

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Cập nhật 10 phút trước</p>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thống kê Lớp học Học kỳ I</h1>
                </div>
                <div className="flex gap-3">
                    <button className={`flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm transition-colors ${isDark
                        ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]'
                        : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'
                        }`}>
                        <Funnel className="w-4 h-4" /> Lọc dữ liệu
                    </button>
                    <button className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] px-4 h-10 rounded-2xl font-extrabold text-sm text-white transition-colors">
                        <Download className="w-4 h-4" weight="fill" /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className={`rounded-3xl p-6 border-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`} style={{ backgroundColor: statPalette[i] }}>
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-300/80' : 'text-[#1A1A1A]/60'}`}>{s.label}</span>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-black/45' : 'bg-[#1A1A1A]'}`}>
                                <s.icon className="w-4 h-4 text-white" weight="fill" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{s.value}</span>
                            <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{s.delta}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart */}
                <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Phổ điểm lớp học</h3>
                    </div>
                    <div className="p-6 flex flex-col justify-end min-h-[250px]">
                        <div className="flex items-end justify-between h-40 gap-3">
                            {chartBars.map((b, idx) => (
                                <div key={b.label} className="flex-1 flex flex-col justify-end h-full items-center gap-2">
                                    <div className={`w-full rounded-t-xl border-2 ${isDark ? 'border-white/15' : 'border-[#1A1A1A]'}`} style={{ height: b.h, backgroundColor: chartPalette[idx] }} />
                                    <span className={`text-xs font-extrabold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{b.label}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-center mt-4 text-xs italic text-gray-400 font-semibold">Đa số học sinh nằm trong khoảng điểm khá (8-9)</p>
                    </div>
                </div>

                {/* Progress bars */}
                <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Tỷ lệ đúng theo Chương học</h3>
                    </div>
                    <div className="p-6 space-y-5">
                            {[
                                { label: 'Chương 1: Đạo hàm & Ứng dụng', val: 88 },
                                { label: 'Chương 2: Hàm số lũy thừa', val: 75 },
                                { label: 'Chương 3: Nguyên hàm & Tích phân', val: 52 },
                                { label: 'Chương 4: Số phức', val: 41 },
                            ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm font-extrabold">
                                    <span className={isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}>{item.label}</span>
                                    <span className={isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}>{item.val}%</span>
                                </div>
                                    <div className={`h-3 w-full rounded-full overflow-hidden border ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/10 border-[#1A1A1A]/20'}`}>
                                        <div className={`h-full rounded-full border-r-2 ${isDark ? 'border-black/20' : 'border-[#1A1A1A]/30'}`} style={{ width: `${item.val}%`, backgroundColor: chapterPalette[i] }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Students table */}
            <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                <div className={`px-6 py-4 border-b-2 flex justify-between items-center ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                    <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Bảng điểm lớp 12A1</h3>
                    <div className={`px-3 py-1.5 border rounded-xl font-extrabold text-sm cursor-pointer ${isDark ? 'bg-white/5 border-white/15 text-gray-200' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}>
                        Tất cả học sinh ▾
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className={`text-xs font-extrabold uppercase tracking-wider border-b-2 ${isDark ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/50 border-[#1A1A1A]/20'}`}>
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
                            {MOCK_GRADES.map((hs, idx) => (
                                <tr key={hs.id} className={isDark ? 'hover:bg-white/5 transition-colors' : 'hover:bg-[#1A1A1A]/3 transition-colors'}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-extrabold text-xs ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`} style={{ backgroundColor: gradeBadgePalette[idx] }}>
                                                {hs.initial}
                                            </div>
                                            <span className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{hs.id}</td>
                                    <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.gk.toFixed(1)}</td>
                                    <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.ck.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]"
                                            style={{ backgroundColor: gradeBadgePalette[idx], color: '#1A1A1A' }}>
                                            {hs.tb.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold border-2 border-[#1A1A1A]/20"
                                            style={{ backgroundColor: gradeBadgePalette[idx], color: '#1A1A1A' }}>
                                            {hs.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">Chỉnh sửa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={`p-4 border-t-2 flex items-center justify-between text-sm font-bold text-gray-400 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                    <div>Hiển thị 4 trên 45 học sinh</div>
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
        </div>
    );
}
