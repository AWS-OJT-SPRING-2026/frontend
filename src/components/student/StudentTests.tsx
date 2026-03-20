import { useState } from 'react';
import { CheckCircle, ClipboardText, Clock, BookOpen, CaretRight, ArrowCounterClockwise, Star } from '@phosphor-icons/react';

type TestStatus = 'pending' | 'in_progress' | 'completed';

interface Test {
    id: number;
    title: string;
    subject: string;
    duration: number;
    questionCount: number;
    dueDate: string;
    status: TestStatus;
    score?: number;
    submittedAt?: string;
    correctCount?: number;
}

const SUBJECT_BG: Record<string, string> = {
    'Ngữ Văn': '#B8B5FF',
    'Toán học': '#FCE38A',
    'Lịch Sử': '#FFD9A0',
    'Vật Lý': '#95E1D3',
    'Tiếng Anh': '#C8F7C5',
    'Hóa Học': '#FFB5B5',
};

const allTests: Test[] = [
    { id: 1, title: 'Kiểm tra giữa kỳ: Ngữ Văn 12', subject: 'Ngữ Văn', duration: 45, questionCount: 10, dueDate: '10/03/2026', status: 'in_progress' },
    { id: 2, title: 'Bài tập trắc nghiệm: Toán Đại số', subject: 'Toán học', duration: 30, questionCount: 15, dueDate: '12/03/2026', status: 'pending' },
    { id: 3, title: 'Bài kiểm tra Lịch sử Chương 3', subject: 'Lịch Sử', duration: 20, questionCount: 8, dueDate: '08/03/2026', status: 'pending' },
    { id: 4, title: 'Kiểm tra cuối kỳ: Vật Lý 12', subject: 'Vật Lý', duration: 60, questionCount: 20, dueDate: '01/03/2026', status: 'completed', score: 8.5, submittedAt: '01/03/2026', correctCount: 17 },
    { id: 5, title: 'Bài tập Tiếng Anh: Reading', subject: 'Tiếng Anh', duration: 25, questionCount: 12, dueDate: '28/02/2026', status: 'completed', score: 9.0, submittedAt: '27/02/2026', correctCount: 11 },
    { id: 6, title: 'Kiểm tra Hóa học: Điện hóa', subject: 'Hóa Học', duration: 35, questionCount: 10, dueDate: '25/02/2026', status: 'completed', score: 6.5, submittedAt: '25/02/2026', correctCount: 7 },
];

function TestCard({ test, onStart }: { test: Test; onStart: (t: Test) => void }) {
    const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
    const isCompleted = test.status === 'completed';

    return (
        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Subject icon */}
                <div className="w-14 h-14 rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                    {isCompleted
                        ? <CheckCircle className="w-7 h-7 text-[#1A1A1A]" weight="fill" />
                        : <ClipboardText className="w-7 h-7 text-[#1A1A1A]" weight="fill" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 text-[#1A1A1A]" style={{ backgroundColor: bg }}>
                            {test.subject}
                        </span>
                        {test.status === 'in_progress' && (
                            <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-full">
                                Đang làm
                            </span>
                        )}
                    </div>
                    <h3 className="font-extrabold text-[#1A1A1A] text-base truncate">{test.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400 font-bold">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" weight="fill" />{test.duration} phút</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" weight="fill" />{test.questionCount} câu</span>
                        <span>{isCompleted ? `Nộp: ${test.submittedAt}` : `Hạn: ${test.dueDate}`}</span>
                    </div>
                </div>

                {/* Score + action */}
                <div className="shrink-0 flex items-center gap-3">
                    {isCompleted && test.score !== undefined && (
                        <div className="text-right">
                            <div className="text-3xl font-extrabold text-[#1A1A1A]">{test.score.toFixed(1)}</div>
                            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Điểm số</div>
                        </div>
                    )}
                    <button
                        onClick={() => onStart(test)}
                        className={`h-10 px-5 rounded-2xl font-extrabold text-sm flex items-center gap-1.5 border-2 border-[#1A1A1A] transition-colors ${isCompleted
                            ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] hover:bg-[#1A1A1A]/10'
                            : 'bg-[#FF6B4A] text-white border-[#FF6B4A] hover:bg-[#ff5535]'}`}
                    >
                        {isCompleted
                            ? <><ArrowCounterClockwise className="w-4 h-4" /> Xem lại</>
                            : <>{test.status === 'in_progress' ? 'Tiếp tục' : 'Làm bài'} <CaretRight className="w-4 h-4" /></>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function TestTakingView({ test, onBack }: { test: Test; onBack: () => void }) {
    if (test.status === 'completed') {
        const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">
                    ← Quay lại danh sách
                </button>
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        <div className="w-36 h-36 rounded-full border-4 border-[#1A1A1A] flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-[#1A1A1A]">{test.score?.toFixed(1)}</div>
                                <div className="text-[10px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest mt-1">Điểm</div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <h2 className="text-2xl font-extrabold text-[#1A1A1A]">{(test.score ?? 0) >= 8 ? 'Xuất sắc!' : 'Đã hoàn thành!'}</h2>
                            <p className="text-[#1A1A1A]/60 font-semibold">{test.title}</p>
                            <div className="flex items-center gap-5 text-sm font-extrabold">
                                <div className="flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                                    <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" /> {test.correctCount}/{test.questionCount} câu đúng
                                </div>
                                <div className="flex items-center gap-2 text-[#FF6B4A]">
                                    <Star className="w-5 h-5" weight="fill" /> {test.score?.toFixed(1)} điểm
                                </div>
                            </div>
                        </div>
                        <button onClick={onBack} className="h-12 px-8 border-2 border-[#1A1A1A] text-[#1A1A1A] font-extrabold rounded-2xl hover:bg-[#1A1A1A]/5 transition-colors">Quay lại</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm">← Quay lại</button>

            {/* Header */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 flex flex-col md:flex-row justify-between gap-5">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-full uppercase">Đang diễn ra</span>
                        <h1 className="text-xl font-extrabold text-[#1A1A1A]">{test.title}</h1>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm font-extrabold text-[#1A1A1A] mb-1">
                            <span>Tiến độ làm bài</span>
                            <span className="text-[#FF6B4A]">7/{test.questionCount} câu</span>
                        </div>
                        <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/20 overflow-hidden">
                            <div className="h-full bg-[#FF6B4A] rounded-full" style={{ width: `${(7 / test.questionCount) * 100}%` }} />
                        </div>
                    </div>
                </div>
                {/* Timer */}
                <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-2xl p-4 shrink-0">
                    <div className="text-center"><div className="text-3xl font-extrabold text-white">14</div><div className="text-[9px] text-white/50 font-extrabold uppercase tracking-wider">Phút</div></div>
                    <div className="text-white/30 text-2xl font-bold">:</div>
                    <div className="text-center"><div className="text-3xl font-extrabold text-[#FF6B4A]">25</div><div className="text-[9px] text-white/50 font-extrabold uppercase tracking-wider">Giây</div></div>
                </div>
            </div>

            {/* Question */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                <div className="p-6 border-b-2 border-[#1A1A1A]/20">
                    <div className="text-xs font-extrabold text-[#FF6B4A] tracking-widest uppercase mb-3">Câu hỏi 7</div>
                    <h2 className="text-xl font-extrabold text-[#1A1A1A] leading-tight">
                        Phân tích ý nghĩa nhân đạo sâu sắc của "Vợ nhặt" qua chi tiết bữa cơm ngày đói?
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    {[
                        { label: 'A', text: 'Thể hiện khát vọng sống mãnh liệt, tình yêu thương giữa người nghèo trong hoàn cảnh éo le.', selected: true },
                        { label: 'B', text: 'Tố cáo tội ác của thực dân phát xít gây ra nạn đói thảm khốc.', selected: false },
                    ].map((opt) => (
                        <div key={opt.label} className={`relative p-5 rounded-2xl cursor-pointer border-2 transition-all ${opt.selected ? 'border-[#FF6B4A] bg-[#FF6B4A]/5' : 'border-[#1A1A1A]/20 bg-[#1A1A1A]/3 hover:border-[#1A1A1A]/40'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${opt.selected ? 'bg-[#FF6B4A] border-[#FF6B4A]' : 'border-[#1A1A1A]/30 bg-white'}`}>
                                    {opt.selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <div className={`font-extrabold text-sm uppercase tracking-wider mb-1 ${opt.selected ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]/50'}`}>Đáp án {opt.label}</div>
                                    <p className="font-semibold text-[#1A1A1A]">{opt.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div>
                        <label className="text-sm font-extrabold text-[#1A1A1A] mb-2 block">Câu trả lời bổ sung:</label>
                        <textarea className="w-full h-28 bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 rounded-2xl p-4 font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] resize-none" placeholder="Nhập suy nghĩ của bạn..." />
                    </div>
                </div>
                <div className="p-5 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between">
                    <button className="flex items-center gap-2 font-extrabold text-[#1A1A1A]/60 hover:text-[#1A1A1A]">← Câu trước</button>
                    <div className="flex gap-3">
                        <button className="px-5 h-11 font-extrabold text-sm border-2 border-[#1A1A1A]/20 rounded-2xl hover:bg-[#1A1A1A]/5 text-[#1A1A1A]">Lưu nháp</button>
                        <button className="px-8 h-11 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl text-sm transition-colors">Nộp bài</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StudentTests() {
    const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const availableTests = allTests.filter(t => t.status !== 'completed');
    const completedTests = allTests.filter(t => t.status === 'completed');
    const avgScore = completedTests.length > 0
        ? (completedTests.reduce((s, t) => s + (t.score ?? 0), 0) / completedTests.length).toFixed(1) : '—';

    if (selectedTest) {
        return (
            <div className="min-h-screen bg-[#F7F7F2] p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <TestTakingView test={selectedTest} onBack={() => setSelectedTest(null)} />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 max-w-4xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Chọn bài để làm hoặc xem lại</p>
                <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Bài tập & Kiểm tra</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { value: availableTests.length, label: 'Bài chưa làm', bg: '#FFB5B5' },
                    { value: completedTests.length, label: 'Đã hoàn thành', bg: '#95E1D3' },
                    { value: avgScore, label: 'Điểm trung bình', bg: '#FCE38A' },
                ].map((s, i) => (
                    <div key={i} className="rounded-3xl p-5 border-2 border-[#1A1A1A]" style={{ backgroundColor: s.bg }}>
                        <div className="text-3xl font-extrabold text-[#1A1A1A]">{s.value}</div>
                        <div className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/10 p-1.5 rounded-2xl w-fit gap-2">
                {[['available', `Đang có (${availableTests.length})`], ['completed', `Đã xong (${completedTests.length})`]].map(([tab, label]) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-5 py-2 rounded-xl text-sm font-extrabold transition-all ${activeTab === tab ? 'bg-[#FF6B4A] text-white shadow-sm' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Test List */}
            <div className="space-y-3">
                {activeTab === 'available' && (
                    availableTests.length > 0
                        ? availableTests.map(t => <TestCard key={t.id} test={t} onStart={setSelectedTest} />)
                        : <div className="text-center py-16 text-gray-400 font-extrabold">Không có bài tập nào đang chờ</div>
                )}
                {activeTab === 'completed' && (
                    completedTests.length > 0
                        ? completedTests.map(t => <TestCard key={t.id} test={t} onStart={setSelectedTest} />)
                        : <div className="text-center py-16 text-gray-400 font-extrabold">Bạn chưa hoàn thành bài tập nào</div>
                )}
            </div>
        </div>
    );
}
