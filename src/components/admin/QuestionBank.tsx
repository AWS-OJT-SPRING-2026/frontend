import { UploadSimple, Plus, Funnel, MagnifyingGlass, PencilSimple, Trash } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const PASTEL: Record<string, string> = {
    'Trắc nghiệm': '#B8B5FF',
    'Tự luận': '#95E1D3',
};
const DIFF_COLOR: Record<string, string> = {
    'Dễ': '#95E1D3',
    'Trung bình': '#FCE38A',
    'Khó': '#FFB5B5',
};
const SUBJECT_COLOR: Record<string, string> = {
    'Toán học (Lớp 12)': '#FCE38A',
    'Lịch sử': '#95E1D3',
    'Vật lý': '#B8B5FF',
};

const MOCK_QUESTIONS = [
    { id: 1, content: 'Cho hàm số f(x) = x³ - 3x² + 2. Tìm giá trị cực đại trên đoạn [0, 2]...', tags: ['#daoham', '#toan12'], type: 'Trắc nghiệm', difficulty: 'Dễ', subject: 'Toán học (Lớp 12)' },
    { id: 2, content: 'Phân tích nguyên nhân sụp đổ hệ thống thuộc địa ở Đông Nam Á sau Thế chiến II...', tags: ['#lichsu', '#dongnama'], type: 'Tự luận', difficulty: 'Trung bình', subject: 'Lịch sử' },
    { id: 3, content: 'Vật dao động điều hòa x = 5cos(4πt + π/3). Tính vận tốc cực đại...', tags: ['#vatly', '#daodong'], type: 'Trắc nghiệm', difficulty: 'Khó', subject: 'Vật lý' },
];

export function QuestionBank() {
    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Ngân hàng Câu hỏi</h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 border-2 border-[#1A1A1A]/20 bg-white px-4 h-10 rounded-2xl font-extrabold text-sm text-[#1A1A1A] hover:bg-gray-50 transition-colors">
                        <UploadSimple className="w-4 h-4" /> Import
                    </button>
                    <button className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] px-4 h-10 rounded-2xl font-extrabold text-sm text-white transition-colors">
                        <Plus className="w-4 h-4" weight="bold" /> Thêm câu hỏi
                    </button>
                </div>
            </div>

            {/* Filter panel */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-5">
                <div className="flex items-center gap-2 font-extrabold text-[#1A1A1A] text-sm mb-4">
                    <Funnel className="w-4 h-4" weight="fill" /> BỘ LỌC NÂNG CAO
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Môn học', opts: [['all', 'Tất cả môn học'], ['toan', 'Toán học'], ['ly', 'Vật lý']] },
                        { label: 'Chương / Chủ đề', opts: [['all', 'Tất cả chương']] },
                        { label: 'Mức độ', opts: [['all', 'Tất cả'], ['de', 'Dễ'], ['tb', 'Trung bình'], ['kho', 'Khó']] },
                    ].map(f => (
                        <div key={f.label}>
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">{f.label}</p>
                            <Select defaultValue="all">
                                <SelectTrigger className="bg-[#F7F7F2] rounded-2xl border-2 border-[#1A1A1A]/20 h-9 font-bold text-[#1A1A1A]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Tags</p>
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input placeholder="Tìm theo thẻ..." className="w-full pl-9 pr-3 h-9 border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF6B4A]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions table */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/20">
                        <tr>
                            {['Nội dung câu hỏi', 'Loại', 'Mức độ', 'Môn học', 'Thao tác'].map(h => (
                                <th key={h} className="px-6 py-4 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                        {MOCK_QUESTIONS.map((q) => (
                            <tr key={q.id} className="hover:bg-[#1A1A1A]/3 transition-colors">
                                <td className="px-6 py-5 max-w-md">
                                    <p className="font-bold text-[#1A1A1A] mb-2 leading-relaxed">{q.content}</p>
                                    <div className="flex gap-2">
                                        {q.tags.map(tag => (
                                            <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#1A1A1A]/10 text-[#1A1A1A]/60 border border-[#1A1A1A]/10">{tag}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold border-2 border-[#1A1A1A]/20 text-[#1A1A1A]" style={{ backgroundColor: PASTEL[q.type] }}>
                                        {q.type}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold border-2 border-[#1A1A1A]/20 text-[#1A1A1A]" style={{ backgroundColor: DIFF_COLOR[q.difficulty] }}>
                                        {q.difficulty}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold border-2 border-[#1A1A1A]/20 text-[#1A1A1A]" style={{ backgroundColor: SUBJECT_COLOR[q.subject] || '#FCE38A' }}>
                                        {q.subject}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex gap-2">
                                        <button className="w-8 h-8 rounded-xl bg-[#FF6B4A]/10 text-[#FF6B4A] hover:bg-[#FF6B4A] hover:text-white flex items-center justify-center transition-colors">
                                            <PencilSimple className="w-4 h-4" />
                                        </button>
                                        <button className="w-8 h-8 rounded-xl bg-[#FFB5B5]/30 text-[#FF6B4A] hover:bg-[#FFB5B5] flex items-center justify-center transition-colors">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between text-sm font-bold text-gray-400">
                    <span>Hiển thị 1-3 / 1,250 câu hỏi</span>
                    <div className="flex gap-2">
                        {['<', '1', '2', '3', '...', '42', '>'].map((p, i) => (
                            <button key={i} className={`min-w-[2rem] h-8 px-2 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 ${i === 1 ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' : 'bg-white text-[#1A1A1A] hover:bg-gray-50'}`}>{p}</button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
