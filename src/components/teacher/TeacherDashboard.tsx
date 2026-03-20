import { TrendUp, Users, Warning, NotePencil, Download, Funnel } from '@phosphor-icons/react';


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
    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Cập nhật 10 phút trước</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Thống kê Lớp học Học kỳ I</h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 border-2 border-[#1A1A1A]/20 bg-white px-4 h-10 rounded-2xl font-extrabold text-sm text-[#1A1A1A] hover:bg-gray-50 transition-colors">
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
                    <div key={i} className="rounded-3xl p-6 border-2 border-[#1A1A1A]" style={{ backgroundColor: s.bg }}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider">{s.label}</span>
                            <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
                                <s.icon className="w-4 h-4 text-white" weight="fill" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-[#1A1A1A]">{s.value}</span>
                            <span className="text-sm font-bold text-[#1A1A1A]/50">{s.delta}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart */}
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                    <div className="px-6 py-4 border-b-2 border-[#1A1A1A]">
                        <h3 className="font-extrabold text-lg text-[#1A1A1A]">Phổ điểm lớp học</h3>
                    </div>
                    <div className="p-6 flex flex-col justify-end min-h-[250px]">
                        <div className="flex items-end justify-between h-40 gap-3">
                            {chartBars.map((b) => (
                                <div key={b.label} className="flex-1 flex flex-col justify-end h-full items-center gap-2">
                                    <div className="w-full rounded-t-xl border-2 border-[#1A1A1A]" style={{ height: b.h, backgroundColor: b.bg }} />
                                    <span className="text-xs font-extrabold text-[#1A1A1A]/60">{b.label}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-center mt-4 text-xs italic text-gray-400 font-semibold">Đa số học sinh nằm trong khoảng điểm khá (8-9)</p>
                    </div>
                </div>

                {/* Progress bars */}
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                    <div className="px-6 py-4 border-b-2 border-[#1A1A1A]">
                        <h3 className="font-extrabold text-lg text-[#1A1A1A]">Tỷ lệ đúng theo Chương học</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        {[
                            { label: 'Chương 1: Đạo hàm & Ứng dụng', val: 88, bg: '#95E1D3' },
                            { label: 'Chương 2: Hàm số lũy thừa', val: 75, bg: '#B8B5FF' },
                            { label: 'Chương 3: Nguyên hàm & Tích phân', val: 52, bg: '#FCE38A' },
                            { label: 'Chương 4: Số phức', val: 41, bg: '#FFB5B5' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-sm font-extrabold">
                                    <span className="text-[#1A1A1A]">{item.label}</span>
                                    <span className="text-[#1A1A1A]">{item.val}%</span>
                                </div>
                                <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full overflow-hidden border border-[#1A1A1A]/20">
                                    <div className="h-full rounded-full border-r-2 border-[#1A1A1A]/30" style={{ width: `${item.val}%`, backgroundColor: item.bg }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Students table */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                <div className="px-6 py-4 border-b-2 border-[#1A1A1A] flex justify-between items-center">
                    <h3 className="font-extrabold text-lg text-[#1A1A1A]">Bảng điểm lớp 12A1</h3>
                    <div className="px-3 py-1.5 bg-[#1A1A1A]/5 border border-[#1A1A1A]/20 rounded-xl font-extrabold text-sm text-[#1A1A1A] cursor-pointer">
                        Tất cả học sinh ▾
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#1A1A1A]/5 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider border-b-2 border-[#1A1A1A]/20">
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
                        <tbody className="divide-y divide-[#1A1A1A]/10">
                            {MOCK_GRADES.map(hs => (
                                <tr key={hs.id} className="hover:bg-[#1A1A1A]/3 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center font-extrabold text-xs text-[#1A1A1A]" style={{ backgroundColor: hs.bg }}>
                                                {hs.initial}
                                            </div>
                                            <span className="font-extrabold text-[#1A1A1A]">{hs.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{hs.id}</td>
                                    <td className="px-6 py-4 text-center font-bold text-[#1A1A1A]">{hs.gk.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-center font-bold text-[#1A1A1A]">{hs.ck.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]"
                                            style={{ backgroundColor: hs.bg, color: '#1A1A1A' }}>
                                            {hs.tb.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold border-2 border-[#1A1A1A]/20"
                                            style={{ backgroundColor: hs.bg, color: '#1A1A1A' }}>
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
                <div className="p-4 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between text-sm font-bold text-gray-400">
                    <div>Hiển thị 4 trên 45 học sinh</div>
                    <div className="flex gap-2">
                        {['<', '1', '2', '3', '>'].map((p, i) => (
                            <button key={i} className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 hover:bg-gray-50 ${i === 1 ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' : 'bg-white text-[#1A1A1A]'}`}>{p}</button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
