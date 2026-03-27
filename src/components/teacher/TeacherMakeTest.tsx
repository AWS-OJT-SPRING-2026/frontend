import { useState } from 'react';
import { CalendarBlank, Lightning, Eye, ArrowCounterClockwise, Trash, CaretDown, PaperPlaneTilt } from '@phosphor-icons/react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSettings } from '../../context/SettingsContext';

const DIFF_COLORS: Record<string, string> = {
    'TRUNG BÌNH': '#FCE38A',
    'DỄ': '#95E1D3',
    'KHÓ': '#FFB5B5',
};

export function TeacherMakeTest() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const [testType, setTestType] = useState('trac-nghiem');

    const diffChipPalette = isDark
        ? { 'TRUNG BÌNH': '#9a8b5a', 'DỄ': '#5c9c93', 'KHÓ': '#8f6a73' }
        : DIFF_COLORS;

    return (
        <div className={`min-h-screen pb-32 ${isDark ? 'bg-[#11151d]' : 'bg-[#F7F7F2]'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <header className={`border-b-2 px-8 py-3 flex items-center justify-between sticky top-0 z-20 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]/10'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#20242b]' : 'bg-[#1A1A1A]'}`}>
                        <span className="text-white font-extrabold text-base">M</span>
                    </div>
                    <h2 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>SmartTest <span className={isDark ? 'text-gray-500 font-bold' : 'text-[#1A1A1A]/40 font-bold'}>Builder</span></h2>
                </div>
                <nav className="hidden md:flex items-center gap-2">
                    {['Tổng quan', 'Ngân hàng câu hỏi', 'Lớp học', 'Báo cáo'].map((item) => (
                        <button key={item} className={`px-4 py-2 text-sm font-extrabold rounded-2xl transition-colors ${isDark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/10' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                            {item}
                        </button>
                    ))}
                    <button className="ml-2 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-4 h-9 rounded-2xl text-sm transition-colors">Tạo mới</button>
                </nav>
            </header>

            <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Bảng điều khiển / Tạo bài kiểm tra</p>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thiết lập Đề kiểm tra</h1>
                    <p className={`font-semibold mt-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Tự động tạo đề từ ngân hàng câu hỏi chuẩn hóa.</p>
                </div>

                {/* Step 1: Basic info */}
                <div className={`rounded-3xl border-2 p-6 md:p-8 space-y-5 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 font-extrabold flex items-center justify-center text-sm ${isDark ? 'bg-[#9a8b5a] border-white/20 text-[#11151d]' : 'bg-[#FCE38A] border-[#1A1A1A] text-[#1A1A1A]'}`}>1</div>
                        <h2 className={`text-xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Thông tin cơ bản</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Chọn lớp</p>
                            <Select defaultValue="10a1">
                                <SelectTrigger className={`rounded-2xl border-2 h-11 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10a1">Lớp 10A1 - Toán</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Hạn nộp</p>
                            <div className="relative">
                                <Input type="datetime-local" className={`w-full border-2 h-11 rounded-2xl font-semibold pr-10 ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`} />
                                <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Hình thức</p>
                            <div className={`flex border-2 p-1 rounded-2xl h-11 gap-1 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/10'}`}>
                                {[['trac-nghiem', 'Trắc nghiệm'], ['tu-luan', 'Tự luận']].map(([v, l]) => (
                                    <button key={v} className={`flex-1 text-xs font-extrabold rounded-xl transition-all ${testType === v ? 'bg-[#FF6B4A] text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-gray-100' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`} onClick={() => setTestType(v)}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Question source */}
                <div className={`rounded-3xl border-2 p-6 md:p-8 space-y-5 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`} style={{ borderLeftWidth: '6px' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full border-2 font-extrabold flex items-center justify-center text-sm ${isDark ? 'bg-[#7873b8] border-white/20 text-[#11151d]' : 'bg-[#B8B5FF] border-[#1A1A1A] text-[#1A1A1A]'}`}>2</div>
                            <h2 className={`text-xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Phương thức lấy câu hỏi</h2>
                        </div>
                        <span className={`text-xs font-extrabold border-2 px-3 py-1.5 rounded-full ${isDark ? 'text-gray-100 bg-[#7873b8]/30 border-white/15' : 'text-[#1A1A1A] bg-[#B8B5FF] border-[#1A1A1A]/20'}`}>Từ ngân hàng</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { label: 'Chương/Chủ đề', options: [['c1', 'Chương 1: Mệnh đề']] },
                            { label: 'Độ khó', options: [['de', 'Dễ (Nhận biết)']] },
                        ].map(f => (
                            <div key={f.label}>
                                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">{f.label}</p>
                                <Select defaultValue={f.options[0][0]}>
                                    <SelectTrigger className={`rounded-2xl border-2 h-11 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {f.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                        <div>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Số lượng</p>
                            <Input type="number" defaultValue="10" className={`border-2 h-11 rounded-2xl font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`} />
                        </div>
                    </div>
                    <div className="flex justify-center pt-2">
                        <button className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold h-12 px-8 rounded-2xl shadow-md transition-colors text-base">
                            <Lightning className="w-5 h-5" weight="fill" /> Tạo đề tự động
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                        <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Xem trước danh sách câu hỏi <span className={isDark ? 'text-gray-500 font-bold' : 'text-[#1A1A1A]/40 font-bold'}>(Đã random)</span></h3>
                    </div>
                    <span className="text-sm font-extrabold text-gray-400">Tổng: 10 câu</span>
                </div>

                <div className="space-y-4">
                    {[
                        { label: 'TRUNG BÌNH', q: 'Cho tập hợp A = {x ∈ R | x² - 4 = 0}. Viết dưới dạng liệt kê phần tử là:', opts: ['{2}', '{-2; 2}', '{-2}', '{4; -4}'], correct: 1 },
                        { label: 'DỄ', q: 'Phát biểu nào sau đây là một mệnh đề toán học?', opts: ['3 là số nguyên tố', 'Trời hôm nay đẹp quá!', 'Bạn có đi học không?', 'x + 1 = 2'], correct: 0 },
                    ].map((qCard, qi) => {
                        const bg = diffChipPalette[qCard.label] ?? '#FCE38A';
                        return (
                            <div key={qi} className={`rounded-3xl border-2 p-6 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                                <div className="flex justify-between items-center mb-5">
                                    <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-2xl border-2 ${isDark ? 'border-white/15 text-[#11151d]' : 'border-[#1A1A1A]/20'}`} style={{ backgroundColor: bg }}>
                                        CÂU {qi + 1} - {qCard.label}
                                    </span>
                                    <div className="flex gap-3">
                                        <button className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-200' : 'text-[#1A1A1A]/30 hover:text-[#1A1A1A]'}`}><ArrowCounterClockwise className="w-4 h-4" /></button>
                                        <button className={`transition-colors ${isDark ? 'text-gray-500 hover:text-[#FF6B4A]' : 'text-[#1A1A1A]/30 hover:text-[#FF6B4A]'}`}><Trash className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <p className={`font-extrabold mb-5 leading-relaxed ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{qCard.q}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {qCard.opts.map((opt, oi) => (
                                        <label key={oi} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${oi === qCard.correct
                                            ? isDark ? 'border-[#FF6B4A] bg-[#FF6B4A]/15' : 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                            : isDark ? 'border-white/10 hover:border-white/20 bg-[#20242b]/30' : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/25'
                                            }`}>
                                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-extrabold shrink-0 ${oi === qCard.correct
                                                ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]'
                                                : isDark ? 'bg-white/10 text-gray-200 border-white/20' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/50 border-transparent'
                                                }`}>
                                                {['A', 'B', 'C', 'D'][oi]}
                                            </div>
                                            <span className={`font-bold ${oi === qCard.correct ? 'text-[#FF6B4A]' : isDark ? 'text-gray-200' : 'text-[#1A1A1A]/70'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex justify-center pt-2">
                        <button className="flex items-center gap-2 text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">
                            Xem thêm 8 câu hỏi <CaretDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating action bar */}
            <div className="fixed bottom-0 left-0 md:left-20 right-0 p-4 z-30">
                <div className={`max-w-4xl mx-auto border-2 rounded-3xl p-4 flex items-center justify-between shadow-xl ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <div>
                        <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-0.5">Trạng thái</div>
                        <div className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>✅ Đã sẵn sàng phát hành</div>
                    </div>
                    <div className="flex gap-3">
                        <button className={`h-11 px-6 font-extrabold text-sm border-2 rounded-2xl transition-colors ${isDark ? 'border-white/15 hover:bg-white/10 text-gray-100' : 'border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A]'}`}>Lưu nháp</button>
                        <button className="h-11 px-6 font-extrabold text-sm bg-[#FF6B4A] hover:bg-[#ff5535] text-white rounded-2xl flex items-center gap-2 transition-colors shadow-md">
                            <PaperPlaneTilt className="w-4 h-4" weight="fill" /> Phát hành ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
