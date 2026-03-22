import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    CheckCircle, ClipboardText, Clock, BookOpen, CaretRight, 
    ArrowCounterClockwise, Star, Hourglass, WarningCircle,
    FloppyDisk, Medal, Flag, MagnifyingGlass, Funnel, ListNumbers, XCircle
} from '@phosphor-icons/react';

type TestStatus = 'pending' | 'in_progress' | 'completed';
type TestCategory = 'homework' | 'exam';

interface Test {
    id: number;
    title: string;
    subject: string;
    duration: number;
    questionCount: number;
    dueDate: string;
    status: TestStatus;
    category: TestCategory;
    score?: number;
    submittedAt?: string;
    correctCount?: number;
    className?: string;
    lessonKey?: string;
    lessonLabel?: string;
    lessonDate?: string;
}

type ActiveTab = 'available' | 'completed';
type FilterCategory = 'all' | 'homework' | 'exam';
type ExerciseViewMode = 'detail' | 'taking' | 'detailedReview';

interface ReviewQuestion {
    id: number;
    question: string;
    options: string[];
    selected: number | null;
    correct: number;
    explanation: string;
    topic: string;
}

const SUBJECT_BG: Record<string, string> = {
    'Ngữ Văn': '#B8B5FF',
    'Toán học': '#FCE38A',
    'Lịch Sử': '#FFD9A0',
    'Vật Lý': '#95E1D3',
    'Tiếng Anh': '#C8F7C5',
    'Hóa Học': '#FFB5B5',
};

// parse date format DD/MM/YYYY to Date object
function parseDate(dateStr: string) {
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
}

// Check if due date is within 24 hours from current mock date
function isUrgent(dateStr: string) {
    const due = parseDate(dateStr);
    // Hardcoded mock current date based on mock data (e.g. 11/03/2026) for demo consistency
    const now = new Date(2026, 2, 11); 
    const diff = due.getTime() - now.getTime();
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

const allTests: Test[] = [
    { id: 1, title: 'Kiểm tra giữa kỳ: Ngữ Văn 12', subject: 'Ngữ Văn', duration: 45, questionCount: 10, dueDate: '10/03/2026', status: 'in_progress', category: 'exam', className: '11C1' },
    { id: 2, title: 'Bài tập trắc nghiệm: Toán Đại số tổ hợp', subject: 'Toán học', duration: 30, questionCount: 15, dueDate: '12/03/2026', status: 'pending', category: 'homework', className: '11C1', lessonKey: 'Toán học|11C1|08:00', lessonLabel: 'Tiết 08:00 - 09:30', lessonDate: '16/03/2026' },
    { id: 3, title: 'Bài kiểm tra Lịch sử Chương 3', subject: 'Lịch Sử', duration: 20, questionCount: 8, dueDate: '11/03/2026', status: 'pending', category: 'exam', className: '11C1' },
    { id: 4, title: 'Kiểm tra cuối kỳ: Vật Lý 12', subject: 'Vật Lý', duration: 60, questionCount: 20, dueDate: '01/03/2026', status: 'completed', category: 'exam', score: 8.5, submittedAt: '01/03/2026', correctCount: 17, className: '11C1' },
    { id: 5, title: 'Bài tập Tiếng Anh: Reading', subject: 'Tiếng Anh', duration: 25, questionCount: 12, dueDate: '28/02/2026', status: 'completed', category: 'homework', score: 9.0, submittedAt: '27/02/2026', correctCount: 11, className: '11C1', lessonKey: 'Tiếng Anh|11C1|13:30', lessonLabel: 'Tiết 13:30 - 15:00', lessonDate: '17/03/2026' },
    { id: 6, title: 'Kiểm tra Hóa học: Điện hóa', subject: 'Hóa Học', duration: 35, questionCount: 10, dueDate: '25/02/2026', status: 'completed', category: 'exam', score: 6.5, submittedAt: '25/02/2026', correctCount: 7, className: '11C1' },
    { id: 7, title: 'Bài tập Toán: Xác suất cơ bản', subject: 'Toán học', duration: 20, questionCount: 10, dueDate: '13/03/2026', status: 'pending', category: 'homework', className: '11C1', lessonKey: 'Toán học|11C1|08:00', lessonLabel: 'Tiết 08:00 - 09:30', lessonDate: '16/03/2026' },
    { id: 8, title: 'Bài tập Lịch sử: Chiến tranh thế giới', subject: 'Lịch Sử', duration: 25, questionCount: 12, dueDate: '14/03/2026', status: 'pending', category: 'homework', className: '11C1', lessonKey: 'Lịch sử|11C1|08:00', lessonLabel: 'Tiết 08:00 - 09:30', lessonDate: '19/03/2026' },
];

const reviewQuestionsByTest: Record<number, ReviewQuestion[]> = {
    4: [
        {
            id: 1,
            question: 'Câu 1: Hiện tượng giao thoa ánh sáng rõ nhất khi nào?',
            options: ['Nguồn sáng đơn sắc và kết hợp', 'Nguồn sáng trắng', 'Nguồn laser và đèn pin', 'Hai nguồn bất kỳ'],
            selected: 0,
            correct: 0,
            explanation: 'Điều kiện quan trọng là hai nguồn phải kết hợp và có cùng tần số để tạo vân giao thoa ổn định.',
            topic: 'Sóng ánh sáng',
        },
        {
            id: 2,
            question: 'Câu 2: Đơn vị của điện trường là gì?',
            options: ['V/m', 'N/C', 'A/m', 'C/N'],
            selected: 1,
            correct: 0,
            explanation: 'Đơn vị chuẩn trong hệ SI là V/m. N/C tương đương về mặt đại số nhưng đề yêu cầu đơn vị chuẩn biểu diễn.',
            topic: 'Điện trường',
        },
        {
            id: 3,
            question: 'Câu 3: Suất điện động cảm ứng phụ thuộc trực tiếp vào đại lượng nào?',
            options: ['Từ thông', 'Điện trở', 'Cường độ dòng điện', 'Hiệu điện thế nguồn'],
            selected: null,
            correct: 0,
            explanation: 'Theo định luật Faraday, suất điện động cảm ứng tỉ lệ với tốc độ biến thiên từ thông qua mạch kín.',
            topic: 'Cảm ứng điện từ',
        },
    ],
    5: [
        {
            id: 1,
            question: 'Choose the correct synonym for "rapid".',
            options: ['Slow', 'Fast', 'Careful', 'Silent'],
            selected: 1,
            correct: 1,
            explanation: '"Rapid" means "fast".',
            topic: 'Vocabulary',
        },
    ],
};

function TestCard({ test, onStart }: { test: Test; onStart: (t: Test) => void }) {
    const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
    const isCompleted = test.status === 'completed';
    const urgent = !isCompleted && isUrgent(test.dueDate);

    return (
        <div className={`bg-white rounded-3xl border-2 overflow-hidden hover:shadow-lg transition-all ${urgent ? 'border-[#FF6B4A]/50 shadow-[#FF6B4A]/10' : 'border-[#1A1A1A]'}`}>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Subject icon */}
                <div className="w-14 h-14 rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 relative" style={{ backgroundColor: bg }}>
                    {isCompleted 
                        ? <CheckCircle className="w-7 h-7 text-[#1A1A1A]" weight="fill" />
                        : <ClipboardText className="w-7 h-7 text-[#1A1A1A]" weight="fill" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 text-[#1A1A1A] flex items-center gap-1 bg-[#f7f7f2]">
                            {test.category === 'homework' ? 'Bài tập' : 'Kiểm tra'}
                        </span>
                        <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 text-[#1A1A1A]" style={{ backgroundColor: bg }}>
                            {test.subject}
                        </span>
                        {test.status === 'in_progress' && (
                            <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-full animate-pulse">
                                Đang làm
                            </span>
                        )}
                    </div>
                    <h3 className="font-extrabold text-[#1A1A1A] text-base truncate">{test.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5 text-xs text-gray-500 font-bold">
                        <span className="flex items-center gap-1 text-[#1A1A1A]/70"><Clock className="w-4 h-4" weight="fill" />{test.duration} phút</span>
                        <span className="flex items-center gap-1 text-[#1A1A1A]/70"><BookOpen className="w-4 h-4" weight="fill" />{test.questionCount} câu</span>
                        
                        {isCompleted ? (
                            <span className="flex items-center gap-1 text-[#1A1A1A]/70">
                                <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                {test.correctCount}/{test.questionCount} câu đúng
                            </span>
                        ) : (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${urgent ? 'text-[#FF6B4A] bg-[#FF6B4A]/10' : 'text-[#1A1A1A]/70'}`}>
                                {urgent ? <Hourglass className="w-4 h-4 animate-spin-slow" weight="fill"/> : null}
                                Hạn: {test.dueDate}
                                {urgent && <span className="ml-1 text-[10px] uppercase font-extrabold shadow-sm bg-[#FF6B4A] text-white px-1.5 py-0.5 rounded">Sắp hết</span>}
                            </span>
                        )}
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
                        className={`h-10 px-5 rounded-2xl font-extrabold text-sm flex items-center gap-1.5 border-2 border-[#1A1A1A] transition-all hover:-translate-y-0.5 ${isCompleted 
                            ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] hover:bg-[#1A1A1A]/10' 
                            : 'bg-[#FF6B4A] text-white border-[#FF6B4A] hover:bg-[#ff5535] shadow-[0_4px_0_0_#A83F2A] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#A83F2A]'}`}
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

function TestDetailView({
    test,
    scheduleDate,
    onBack,
    onPrimary,
    onDetailedReview,
}: {
    test: Test;
    scheduleDate?: string;
    onBack: () => void;
    onPrimary: () => void;
    onDetailedReview: () => void;
}) {
    const isCompleted = test.status === 'completed';
    const isInProgress = test.status === 'in_progress';
    const statusLabel = isCompleted ? 'Đã hoàn thành' : isInProgress ? 'Đang làm dở' : 'Chưa làm';
    const lessonDate = test.lessonDate ?? scheduleDate;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">
                {'<-'} Quay lại danh sách
            </button>

            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 md:p-8 space-y-6 shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] text-[#1A1A1A]">
                        {test.category === 'homework' ? 'Bài tập' : 'Kiểm tra'}
                    </span>
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 bg-[#FFF5E6] text-[#1A1A1A]">
                        {test.subject}
                    </span>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${isCompleted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isInProgress ? 'bg-[#FF6B4A]/10 text-[#FF6B4A] border-[#FF6B4A]/20' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {statusLabel}
                    </span>
                </div>

                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A] leading-tight">{test.title}</h1>
                    <p className="text-sm font-bold text-[#1A1A1A]/60 mt-2">
                        Giao diện demo thông tin chi tiết bài làm trước khi vào làm bài/xem kết quả.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Thời gian làm bài</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.duration} phút</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Số câu hỏi</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.questionCount} câu</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Hạn nộp</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.dueDate}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Lớp/Tiết học</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.className ?? '---'} {test.lessonLabel ? `- ${test.lessonLabel}` : ''}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] p-4 md:col-span-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Bài của ngày</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{lessonDate ?? 'Chưa xác định ngày cụ thể'}</p>
                    </div>
                </div>

                {isCompleted && (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700/70 mb-1">Kết quả</p>
                            <p className="text-lg font-extrabold text-emerald-700">{test.correctCount ?? 0}/{test.questionCount} câu đúng - {test.score?.toFixed(1) ?? '0.0'} điểm</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
                    <button onClick={onBack} className="h-11 px-6 rounded-2xl border-2 border-[#1A1A1A]/20 text-[#1A1A1A] font-extrabold hover:bg-[#1A1A1A]/5 transition-colors">
                        Quay lại
                    </button>
                    {isCompleted ? (
                        <>
                            <button onClick={onDetailedReview} className="h-11 px-6 rounded-2xl border-2 border-[#1A1A1A] text-[#1A1A1A] font-extrabold hover:bg-[#1A1A1A]/5 transition-colors">
                                Xem đáp án chi tiết
                            </button>
                            <button onClick={onPrimary} className="h-11 px-6 rounded-2xl bg-[#FF6B4A] text-white font-extrabold hover:bg-[#ff5535] transition-colors">
                                Xem kết quả
                            </button>
                        </>
                    ) : (
                        <button onClick={onPrimary} className="h-11 px-6 rounded-2xl bg-[#FF6B4A] text-white font-extrabold hover:bg-[#ff5535] transition-colors">
                            {isInProgress ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailedReviewView({ test, onBack }: { test: Test; onBack: () => void }) {
    const questions = reviewQuestionsByTest[test.id] ?? [];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">
                {'<-'} Quay lại kết quả
            </button>

            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 md:p-8 space-y-6 shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#1A1A1A]/10 pb-5">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Xem lại đáp án chi tiết</p>
                        <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">{test.title}</h1>
                    </div>
                    <div className="text-sm font-extrabold text-[#1A1A1A]/70 bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/10 px-4 py-2">
                        {test.correctCount ?? 0}/{test.questionCount} câu đúng
                    </div>
                </div>

                {questions.length === 0 ? (
                    <div className="text-center py-14 border-2 border-dashed border-[#1A1A1A]/20 rounded-2xl bg-[#F7F7F2]">
                        <p className="font-extrabold text-[#1A1A1A]/60">Chưa có dữ liệu xem lại chi tiết cho bài này.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q) => {
                            const isCorrect = q.selected === q.correct;
                            const isSkipped = q.selected === null;

                            return (
                                <div key={q.id} className="rounded-2xl border-2 border-[#1A1A1A]/10 p-4 md:p-5 bg-[#FDFDFD]">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-[#1A1A1A] text-white">Câu {q.id}</span>
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-[#1A1A1A]/20 text-[#1A1A1A]/70">{q.topic}</span>
                                        {isSkipped ? (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Bỏ trống</span>
                                        ) : isCorrect ? (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Đúng</span>
                                        ) : (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Sai</span>
                                        )}
                                    </div>

                                    <p className="font-extrabold text-[#1A1A1A] mb-4">{q.question}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {q.options.map((option, idx) => {
                                            const selected = q.selected === idx;
                                            const correct = q.correct === idx;
                                            const className = correct
                                                ? 'border-emerald-400 bg-emerald-50'
                                                : selected
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-[#1A1A1A]/10 bg-white';

                                            return (
                                                <div key={idx} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold text-[#1A1A1A] ${className}`}>
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-black">{String.fromCharCode(65 + idx)}.</span>
                                                        <span>{option}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 rounded-xl border border-[#1A1A1A]/10 bg-[#F7F7F2] px-3 py-2.5 text-sm font-semibold text-[#1A1A1A]/75">
                                        <span className="font-extrabold text-[#1A1A1A]">Giải thích:</span> {q.explanation}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function TestTakingView({ test, onBack, onOpenDetailedReview }: { test: Test; onBack: () => void; onOpenDetailedReview: () => void }) {
    const [timeLeft, setTimeLeft] = useState(14 * 60 + 25); // 14 mins 25 secs mock
    const [currentQ, setCurrentQ] = useState(7);
    const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [textInput, setTextInput] = useState('');
    
    // Mock answers state: 0=unanswered, 1=answered, 2=flagged
    const [answersMap, setAnswersMap] = useState<Record<number, number>>({
        1: 1, 2: 1, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1
    });

    const isCriticalTime = timeLeft <= 5 * 60; // Less than 5 mins

    // Mock timer countdown
    useEffect(() => {
        const t = setInterval(() => {
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);
        return () => clearInterval(t);
    }, []);

    // Mock auto-save
    useEffect(() => {
        if (!textInput) return;
        setAutoSaveState('saving');
        const t = setTimeout(() => {
            setAutoSaveState('saved');
            setTimeout(() => setAutoSaveState('idle'), 2000);
        }, 1000);
        return () => clearTimeout(t);
    }, [textInput]);

    const handleFlag = () => {
        setAnswersMap(prev => ({ ...prev, [currentQ]: prev[currentQ] === 2 ? 1 : 2 }));
    };

    if (test.status === 'completed') {
        const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">
                    ← Quay lại danh sách
                </button>
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-8 shadow-[8px_8px_0_0_rgba(26,26,26,1)]">
                    <div className="flex flex-col md:flex-row items-center gap-8 border-b-2 border-[#1A1A1A]/10 pb-8 mb-8">
                        <div className="w-36 h-36 rounded-full border-4 border-[#1A1A1A] flex items-center justify-center shrink-0 relative" style={{ backgroundColor: bg }}>
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-[#1A1A1A]">{test.score?.toFixed(1)}</div>
                                <div className="text-[10px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest mt-1">Điểm</div>
                            </div>
                            {(test.score ?? 0) >= 8 && (
                                <div className="absolute -bottom-2 -right-2 bg-[#FF6B4A] text-white p-2 rounded-full border-2 border-[#1A1A1A]">
                                    <Medal className="w-6 h-6" weight="fill" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-3xl font-black text-[#1A1A1A]">{(test.score ?? 0) >= 8 ? 'Xuất sắc!' : 'Đã hoàn thành!'}</h2>
                                <p className="text-[#1A1A1A]/60 font-bold mt-1 text-lg">{test.title}</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm font-extrabold">
                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border-2 border-emerald-200">
                                    <CheckCircle className="w-5 h-5" weight="fill" /> {test.correctCount}/{test.questionCount} câu đúng
                                </div>
                                <div className="flex items-center gap-2 bg-[#FF6B4A]/10 text-[#FF6B4A] px-4 py-2 rounded-2xl border-2 border-[#FF6B4A]/20">
                                    <Star className="w-5 h-5" weight="fill" /> {test.score?.toFixed(1)} điểm
                                </div>
                                {(test.score ?? 0) >= 8 && (
                                    <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl border-2 border-amber-200 animate-bounce">
                                        <Medal className="w-5 h-5" weight="fill" /> +50 XP EduCare
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="font-extrabold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
                                Phân tích kỹ năng
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span>Kiến thức lý thuyết</span>
                                        <span className="text-[#FF6B4A]">90%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#FF6B4A] w-[90%] rounded-full" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span>Vận dụng cao</span>
                                        <span className="text-[#FCE38A] text-amber-600">60%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#FCE38A] border-r-2 border-amber-500 w-[60%] rounded-full" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span>Tư duy logic</span>
                                        <span className="text-[#95E1D3] text-teal-600">80%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#95E1D3] border-r-2 border-teal-500 w-[80%] rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#f7f7f2] rounded-2xl p-6 border-2 border-[#1A1A1A]/10 flex flex-col justify-center">
                            <WarningCircle className="w-8 h-8 text-amber-500 mb-2" weight="fill" />
                            <h4 className="font-extrabold text-[#1A1A1A] mb-1">Nhận xét từ AI:</h4>
                            <p className="text-sm font-semibold text-[#1A1A1A]/70 line-clamp-3">
                                Bạn nắm rất vững các kiến thức cơ bản. Tuy nhiên, phần vận dụng cao vẫn còn thiếu sót, đặc biệt là các câu phân tích chuyên sâu. Hãy ôn tập lại chương 2 và làm thêm bài tập tư duy nhé!
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={onBack} className="h-12 px-8 border-2 border-[#1A1A1A] text-[#1A1A1A] font-extrabold rounded-2xl hover:bg-[#1A1A1A]/5 transition-colors">Quay về danh sách</button>
                        <button onClick={onOpenDetailedReview} className="h-12 px-8 bg-[#1A1A1A] text-white font-extrabold rounded-2xl hover:bg-[#1A1A1A]/80 flex items-center gap-2 transition-colors">
                            <MagnifyingGlass className="w-5 h-5" /> Xem lại đáp án chi tiết
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="max-w-6xl mx-auto pb-20 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-5">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">← Thoát làm bài</button>
                
                {/* Header */}
                <div className={`bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 flex flex-col md:flex-row justify-between gap-5 transition-colors ${isCriticalTime ? 'border-red-500 bg-red-50' : ''}`}>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-full uppercase">Đang diễn ra</span>
                            <h1 className="text-xl font-extrabold text-[#1A1A1A]">{test.title}</h1>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-extrabold text-[#1A1A1A] mb-1">
                                <span>Tiến độ làm bài</span>
                                <span className={isCriticalTime ? 'text-red-500' : 'text-[#FF6B4A]'}>
                                    {Object.values(answersMap).filter(v => v !== 0).length}/{test.questionCount} câu
                                </span>
                            </div>
                            <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/20 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isCriticalTime ? 'bg-red-500' : 'bg-[#FF6B4A]'}`} style={{ width: `${(Object.values(answersMap).filter(v => v !== 0).length / test.questionCount) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                    {/* Timer */}
                    <div className={`flex items-center gap-3 rounded-2xl p-4 shrink-0 transition-all ${isCriticalTime ? 'bg-red-500 shadow-[0_4px_0_0_#991b1b] animate-pulse' : 'bg-[#1A1A1A] shadow-[0_4px_0_0_#000]'}`}>
                        <div className="text-center"><div className="text-3xl font-extrabold text-white">{mins.toString().padStart(2, '0')}</div><div className="text-[9px] text-white/70 font-extrabold uppercase tracking-wider">Phút</div></div>
                        <div className="text-white/50 text-2xl font-bold pb-2">:</div>
                        <div className="text-center">
                            <div className={`text-3xl font-extrabold ${isCriticalTime ? 'text-white' : 'text-[#FF6B4A]'}`}>{secs.toString().padStart(2, '0')}</div>
                            <div className="text-[9px] text-white/70 font-extrabold uppercase tracking-wider">Giây</div>
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                    <div className="p-6 border-b-2 border-[#1A1A1A]/10 relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-extrabold text-[#FF6B4A] tracking-widest uppercase mb-3 flex items-center gap-2">
                                    Câu hỏi {currentQ}
                                    {answersMap[currentQ] === 2 && <span className="bg-amber-100 text-amber-600 px-2 flex items-center gap-1 rounded uppercase tracking-wider text-[10px] py-1 border border-amber-200"><Flag weight="fill"/> Cần xem lại</span>}
                                </div>
                                <h2 className="text-xl font-extrabold text-[#1A1A1A] leading-relaxed">
                                    Phân tích ý nghĩa nhân đạo sâu sắc của "Vợ nhặt" qua chi tiết bữa cơm ngày đói?
                                </h2>
                            </div>
                            <button 
                                onClick={handleFlag}
                                className={`shrink-0 p-2 rounded-xl transition-colors border-2 ${answersMap[currentQ] === 2 ? 'bg-amber-100 border-amber-300 text-amber-600' : 'hover:bg-gray-100 border-transparent text-gray-400'}`}
                                title="Đánh dấu câu hỏi này cân xem lại"
                            >
                                <Flag className="w-6 h-6 " weight={answersMap[currentQ] === 2 ? 'fill' : 'regular'} />
                            </button>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'A', text: 'Thể hiện khát vọng sống mãnh liệt, tình yêu thương giữa người nghèo trong hoàn cảnh éo le.', selected: true },
                            { label: 'B', text: 'Tố cáo tội ác của thực dân phát xít gây ra nạn đói thảm khốc.', selected: false },
                            { label: 'C', text: 'Ca ngợi vẻ đẹp tiềm ẩn của người nông dân trước cách mạng.', selected: false },
                            { label: 'D', text: 'Làm nổi bật tiếng khóc xót xa của Kim Lân trước số phận con người.', selected: false },
                        ].map((opt) => (
                            <div key={opt.label} className={`relative p-4 rounded-2xl cursor-pointer border-2 transition-all hover:translate-x-1 ${opt.selected ? 'border-[#FF6B4A] bg-[#FF6B4A]/5' : 'border-[#1A1A1A]/20 bg-white hover:border-[#1A1A1A]/40'}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${opt.selected ? 'bg-[#FF6B4A] border-[#FF6B4A]' : 'border-[#1A1A1A]/30 bg-white'}`}>
                                        {opt.selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                    </div>
                                    <div>
                                        <div className={`font-extrabold text-sm mb-1 transition-colors ${opt.selected ? 'text-[#FF6B4A]' : 'text-[#1A1A1A]/40'}`}>Đáp án {opt.label}</div>
                                        <p className="font-semibold text-[#1A1A1A] text-[15px]">{opt.text}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="pt-4 mt-4 border-t-2 border-dashed border-[#1A1A1A]/10">
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-extrabold text-[#1A1A1A]">Câu trả lời bổ sung (Tự luận ngắn):</label>
                                <div className="text-[11px] font-extrabold text-gray-400 flex items-center gap-1 min-w-[100px] justify-end">
                                    {autoSaveState === 'saving' && <><Hourglass className="animate-spin-slow"/> Đang lưu...</>}
                                    {autoSaveState === 'saved' && <><CheckCircle className="text-emerald-500" weight="fill" /> Đã tự động lưu</>}
                                </div>
                            </div>
                            <textarea 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="w-full h-32 bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 rounded-2xl p-4 font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] resize-none transition-colors" 
                                placeholder="Nhập suy nghĩ của bạn..." 
                            />
                        </div>
                    </div>
                    <div className="p-5 bg-gray-50 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between">
                        <button className="flex items-center gap-2 font-extrabold text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors bg-white px-4 py-2 rounded-xl border-2 border-[#1A1A1A]/10">
                            ← Câu trước
                        </button>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-5 h-11 font-extrabold text-sm border-2 border-[#1A1A1A]/20 rounded-2xl hover:bg-white text-[#1A1A1A] transition-all hover:border-[#1A1A1A] bg-transparent">
                                <FloppyDisk className="w-4 h-4" /> Lưu nháp
                            </button>
                            <button className="px-8 h-11 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl text-sm transition-all shadow-[0_4px_0_0_#A83F2A] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#A83F2A] flex items-center gap-2">
                                Nộp bài <CaretRight weight="bold" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Panel */}
            <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 sticky top-6 shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                    <h3 className="font-extrabold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
                        <ListNumbers className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> 
                        Danh sách câu hỏi
                    </h3>
                    
                    <div className="grid grid-cols-5 gap-2.5">
                        {Array.from({length: test.questionCount}).map((_, i) => {
                            const qNum = i + 1;
                            const status = answersMap[qNum] || 0;
                            // 0 = gray, 1 = blue/green (answered), 2 = yellow (flagged)
                            let btnClass = "border-[#1A1A1A]/20 bg-gray-50 text-gray-500 hover:border-[#1A1A1A]/50"; // default
                            
                            if (status === 1) {
                                btnClass = "bg-emerald-100 border-emerald-300 text-emerald-700 font-black"; // answered
                            } else if (status === 2) {
                                btnClass = "bg-amber-200 border-amber-400 text-amber-800 font-black"; // flagged
                            }

                            if (qNum === currentQ) {
                                btnClass += " ring-4 ring-[#FF6B4A]/30 border-[#FF6B4A] !bg-[#FF6B4A] !text-white";
                            }

                            return (
                                <button 
                                    key={qNum}
                                    onClick={() => setCurrentQ(qNum)}
                                    className={`w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center font-extrabold text-sm transition-all hover:scale-105 ${btnClass}`}
                                >
                                    {qNum}
                                    {status === 2 && qNum !== currentQ && <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-0.5" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 pt-5 border-t-2 border-[#1A1A1A]/10 space-y-3">
                        <div className="flex items-center gap-3 text-sm font-bold text-[#1A1A1A]/60">
                            <span className="w-4 h-4 rounded-md border-2 border-emerald-300 bg-emerald-100 flex-shrink-0" />
                            Câu đã làm
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-[#1A1A1A]/60">
                            <span className="w-4 h-4 rounded-md border-2 border-[#1A1A1A]/20 bg-gray-50 flex-shrink-0" />
                            Câu chưa làm
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-[#1A1A1A]/60">
                            <span className="w-4 h-4 rounded-md border-2 border-amber-400 bg-amber-200 flex-shrink-0" />
                            Đang phân vân
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StudentTests() {
    const location = useLocation();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<ActiveTab>('available');
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [exerciseViewMode, setExerciseViewMode] = useState<ExerciseViewMode>('detail');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

    const scheduleFilter = useMemo(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('source') !== 'schedule') {
            return null;
        }

        return {
            subject: params.get('subject') ?? '',
            className: params.get('className') ?? '',
            lessonKey: params.get('lessonKey') ?? '',
            date: params.get('date') ?? '',
            time: params.get('time') ?? '',
        };
    }, [location.search]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab');
        const categoryParam = params.get('category');

        if (tabParam === 'available' || tabParam === 'completed') {
            setActiveTab(tabParam);
        }
        if (categoryParam === 'all' || categoryParam === 'homework' || categoryParam === 'exam') {
            setFilterCategory(categoryParam);
        }

        const queryParam = params.get('q');
        if (queryParam !== null) {
            setSearchQuery(queryParam);
        }

        if (params.get('source') === 'schedule') {
            const subject = params.get('subject') ?? '';
            setActiveTab('available');
            setFilterCategory('homework');
            setSearchQuery(subject);
        }
    }, [location.search]);

    const availableTests = allTests.filter(t => t.status !== 'completed');
    const completedTests = allTests.filter(t => t.status === 'completed');
    const avgScore = completedTests.length > 0
        ? (completedTests.reduce((s, t) => s + (t.score ?? 0), 0) / completedTests.length).toFixed(1) : '—';

    // Apply filters
    const filteredTests = useMemo(() => {
        const sourceList = activeTab === 'available' ? availableTests : completedTests;
        return sourceList.filter(t => {
            const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = filterCategory === 'all' ? true : t.category === filterCategory;
            const matchSchedule = !scheduleFilter
                ? true
                : (!scheduleFilter.subject || t.subject === scheduleFilter.subject)
                    && (!scheduleFilter.className || t.className === scheduleFilter.className)
                    && (!scheduleFilter.lessonKey || t.lessonKey === scheduleFilter.lessonKey);

            return matchSearch && matchCategory && matchSchedule;
        }).sort((a, b) => {
            if (activeTab === 'available') {
                // sort by urgency
                const aUrgent = isUrgent(a.dueDate);
                const bUrgent = isUrgent(b.dueDate);
                if (aUrgent && !bUrgent) return -1;
                if (!aUrgent && bUrgent) return 1;
            }
            return 0;
        });
    }, [activeTab, availableTests, completedTests, searchQuery, filterCategory, scheduleFilter]);

    const handleOpenTest = (test: Test) => {
        setSelectedTest(test);
        setExerciseViewMode('detail');
    };

    const clearScheduleFilter = () => {
        navigate('/student/exercises');
    };

    if (selectedTest) {
        if (selectedTest.status === 'completed' && exerciseViewMode === 'detailedReview') {
            return (
                <div className="min-h-screen bg-[#F7F7F2] p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <DetailedReviewView test={selectedTest} onBack={() => setExerciseViewMode('detail')} />
                </div>
            );
        }

        if (exerciseViewMode === 'detail') {
            return (
                <div className="min-h-screen bg-[#F7F7F2] p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <TestDetailView
                        test={selectedTest}
                        scheduleDate={scheduleFilter?.date}
                        onBack={() => setSelectedTest(null)}
                        onPrimary={() => setExerciseViewMode('taking')}
                        onDetailedReview={() => setExerciseViewMode('detailedReview')}
                    />
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#F7F7F2] p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <TestTakingView
                    test={selectedTest}
                    onBack={() => setExerciseViewMode('detail')}
                    onOpenDetailedReview={() => setExerciseViewMode('detailedReview')}
                />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-xs font-extrabold text-[#FF6B4A] uppercase tracking-widest mb-1">Học tập hiệu quả</p>
                    <h1 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Bài tập & Kiểm tra</h1>
                </div>
                
                {/* Stats */}
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:pb-0 md:mx-0 md:px-0">
                    <div className="shrink-0 rounded-3xl p-4 md:p-5 border-2 border-[#1A1A1A] bg-[#FFB5B5] shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                        <div className="text-3xl font-black text-[#1A1A1A]">{availableTests.length}</div>
                        <div className="text-[10px] md:text-xs font-extrabold text-[#1A1A1A] uppercase mt-1">Chưa làm</div>
                    </div>
                    <div className="shrink-0 rounded-3xl p-4 md:p-5 border-2 border-[#1A1A1A] bg-[#95E1D3] shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                        <div className="text-3xl font-black text-[#1A1A1A]">{completedTests.length}</div>
                        <div className="text-[10px] md:text-xs font-extrabold text-[#1A1A1A] uppercase mt-1">Đã xong</div>
                    </div>
                    <div className="shrink-0 rounded-3xl p-4 md:p-5 border-2 border-[#1A1A1A] bg-[#FCE38A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                        <div className="text-3xl font-black text-[#1A1A1A]">{avgScore}</div>
                        <div className="text-[10px] md:text-xs font-extrabold text-[#1A1A1A] uppercase mt-1">Điểm trung bình</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-2 flex flex-col sm:flex-row gap-4 shadow-[4px_4px_0_0_rgba(26,26,26,1)] relative z-10 w-full">
                {/* Search */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="Tìm bài tập, môn học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#FF6B4A] rounded-2xl outline-none font-bold text-sm transition-colors"
                    />
                </div>
                {/* Filter Dropdown */}
                <div className="flex items-center border-l-2 border-gray-100 pl-4 py-1 pr-2">
                    <Funnel className="text-gray-400 w-5 h-5 mr-3" />
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
                        className="bg-transparent font-extrabold text-sm text-[#1A1A1A] outline-none cursor-pointer"
                    >
                        <option value="all">Tất cả loại bài</option>
                        <option value="homework">Chỉ Bài tập về nhà</option>
                        <option value="exam">Chỉ Bài kiểm tra</option>
                    </select>
                </div>
            </div>

            {scheduleFilter && (
                <div className="rounded-2xl border-2 border-[#2563EB]/20 bg-[#EEF4FF] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-[#2563EB]">Đang lọc từ lịch học</p>
                        <p className="text-sm font-extrabold text-[#1A1A1A]">
                            Lớp {scheduleFilter.className || '---'} - {scheduleFilter.subject || '---'} ({scheduleFilter.time || 'Không rõ tiết'})
                        </p>
                        <p className="text-xs font-bold text-[#1A1A1A]/60">Ngày: {scheduleFilter.date || 'Không rõ ngày'}</p>
                    </div>
                    <button
                        onClick={clearScheduleFilter}
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] text-sm font-extrabold hover:bg-[#1A1A1A]/5 transition-colors"
                    >
                        <XCircle className="w-4 h-4" weight="bold" /> Bỏ lọc buổi học
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/10 p-1.5 rounded-2xl w-fit gap-2">
                {[['available', `Đang có (${availableTests.length})`], ['completed', `Đã xong (${completedTests.length})`]].map(([tab, label]) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as ActiveTab)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all ${activeTab === tab ? 'bg-[#FF6B4A] text-white shadow-sm' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Test List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTests.length > 0
                    ? filteredTests.map((t) => <TestCard key={t.id} test={t} onStart={handleOpenTest} />)
                    : <div className="col-span-1 md:col-span-2 text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-[#1A1A1A]/20">
                        <Funnel className="w-12 h-12 text-[#1A1A1A]/20 mx-auto mb-3" />
                        <div className="text-[#1A1A1A]/60 font-extrabold text-lg">Không tìm thấy bài tập phù hợp</div>
                    </div>
                }
            </div>
        </div>
    );
}
