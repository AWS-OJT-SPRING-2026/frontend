import { useState } from 'react';
import { Brain, CaretDown, Check, ArrowRight, ArrowLeft, Trophy } from '@phosphor-icons/react';

const TOPICS = [
    { label: 'Đạo hàm & Tích phân', icon: '∫', completion: 35, level: 'Yếu', levelBg: '#FFB5B5', selected: true },
    { label: 'Hình học không gian', icon: '△', completion: 88, level: 'Tốt', levelBg: '#95E1D3', selected: false },
    { label: 'Số phức', icon: 'i', completion: 62, level: 'Khá', levelBg: '#B8B5FF', selected: true },
    { label: 'Xác suất thống kê', icon: 'P', completion: 0, level: 'Chưa học', levelBg: '#FCE38A', selected: false },
];

function getBarBg(completion: number) {
    if (completion < 50) return '#FFB5B5';
    if (completion < 75) return '#FCE38A';
    return '#95E1D3';
}

const mockQuestions = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    type: i % 3 === 0 ? 'AI Generated' : 'Bank Question',
    subject: i < 10 ? 'Đạo hàm' : 'Tích phân',
    question: i % 2 === 0 
        ? `Câu hỏi số ${i + 1}: Tính đạo hàm của hàm số f(x) = x^${i + 2} + ${i}x tại x = 1.`
        : `Câu hỏi số ${i + 1}: Tìm nguyên hàm của hàm số g(x) = ${i + 1}x^${i} + sin(x).`,
    options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
    correct: i % 4,
    explanation: `Giải thích chi tiết cho câu hỏi số ${i + 1}...`,
    level: i % 3 === 0 ? 'Khó' : i % 3 === 1 ? 'Trung bình' : 'Dễ',
}));

export function StudentReview() {
    const [selectedTopics, setSelectedTopics] = useState<boolean[]>(TOPICS.map(t => t.selected));
    const [numQuestions, setNumQuestions] = useState(20);
    const [aiQuestions, setAiQuestions] = useState(12);
    const [isReviewing, setIsReviewing] = useState(false);
    const [displayMode, setDisplayMode] = useState<'single' | 'list'>('single');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(mockQuestions.length).fill(null));
    const [showResult, setShowResult] = useState(false);

    const totalQuestions = numQuestions;

    const toggleTopic = (index: number) => {
        setSelectedTopics(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    const handleAnswer = (qIndex: number, optionIndex: number) => {
        const nextAnswers = [...answers];
        nextAnswers[qIndex] = optionIndex;
        setAnswers(nextAnswers);
    };

    const correctCount = answers.filter((ans, idx) => ans === mockQuestions[idx].correct).length;
    const score = Math.round((correctCount / mockQuestions.length) * 10);

    if (showResult) {
        return (
            <div className="p-8 space-y-8 max-w-4xl mx-auto text-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-12 space-y-6">
                    <div className="w-24 h-24 bg-[#FCE38A] rounded-3xl border-4 border-[#1A1A1A] flex items-center justify-center mx-auto shadow-xl">
                        <Trophy className="w-12 h-12 text-[#1A1A1A]" weight="fill" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#1A1A1A]">Hoàn thành ôn tập!</h1>
                        <p className="text-gray-500 font-bold mt-2">Tuyệt vời, bạn đã hoàn thành đề ôn tập được AI cá nhân hóa.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-6">
                        <div className="bg-[#F7F7F2] p-6 rounded-3xl border-2 border-[#1A1A1A]/10">
                            <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest mb-2">Điểm số</p>
                            <p className="text-4xl font-extrabold text-[#FF6B4A]">{score}</p>
                        </div>
                        <div className="bg-[#F7F7F2] p-6 rounded-3xl border-2 border-[#1A1A1A]/10">
                            <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest mb-2">Đúng/Tổng</p>
                            <p className="text-4xl font-extrabold text-[#1A1A1A]">{correctCount}/{mockQuestions.length}</p>
                        </div>
                    </div>

                    <div className="pt-6">
                        <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-4 text-left">Phân tích từ AI về kết quả:</h3>
                        <div className="bg-[#1A1A1A] text-white p-6 rounded-3xl text-left space-y-3">
                            <div className="flex items-center gap-2 text-[#FCE38A]">
                                <Brain weight="fill" className="w-5 h-5" />
                                <span className="font-extrabold">Gợi ý AI</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-300 leading-relaxed">
                                Bạn đã nắm vững lý thuyết về Tích phân căn bản, nhưng vẫn còn lúng túng ở phần **Đạo hàm hàm logarit**. AI khuyên bạn nên xem lại chương "Đạo hàm & Tích phân" thêm 15 phút vào sáng mai.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            onClick={() => {
                                setIsReviewing(false);
                                setShowResult(false);
                                setCurrentQuestion(0);
                                setAnswers(new Array(mockQuestions.length).fill(null));
                            }}
                            className="flex-1 h-16 bg-[#1A1A1A] text-white rounded-2xl font-extrabold text-lg transition-transform hover:scale-[1.02]"
                        >
                            Ôn tập lại
                        </button>
                        <button
                            onClick={() => window.location.href = '/student'}
                            className="flex-1 h-16 bg-[#FCE38A] border-2 border-[#1A1A1A] text-[#1A1A1A] rounded-2xl font-extrabold text-lg transition-transform hover:scale-[1.02]"
                        >
                            Quay về Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isReviewing) {
        const questionsPerPage = 10;
        const currentQuestions = displayMode === 'list' 
            ? mockQuestions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage)
            : [mockQuestions[currentQuestion]];

        return (
            <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsReviewing(false)}
                            className="w-10 h-10 rounded-xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-white transition-colors flex items-center justify-center"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Đang ôn tập: Toán học</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-extrabold text-gray-400">Tiến độ: {answers.filter(a => a !== null).length}/{mockQuestions.length}</span>
                                <div className="flex bg-[#1A1A1A]/5 rounded-xl p-1 border border-[#1A1A1A]/10">
                                    <button
                                        onClick={() => setDisplayMode('single')}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${displayMode === 'single' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/50'}`}
                                    >
                                        Từng câu
                                    </button>
                                    <button
                                        onClick={() => setDisplayMode('list')}
                                        className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${displayMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A]/50'}`}
                                    >
                                        Danh sách
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowResult(true)}
                        className="h-11 px-6 rounded-2xl bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-sm transition-all shadow-[0_4px_0_0_#A83F2A] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#A83F2A]"
                    >
                        Nộp bài
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
                    <div className="space-y-4">
                        <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-4 shadow-[4px_4px_0_0_rgba(26,26,26,1)]">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Danh sách câu hỏi</p>
                            <div className="grid grid-cols-5 gap-2">
                                {mockQuestions.map((_, idx) => {
                                    const answered = answers[idx] !== null;
                                    const active = displayMode === 'single' && currentQuestion === idx;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (displayMode === 'single') {
                                                    setCurrentQuestion(idx);
                                                } else {
                                                    setCurrentPage(Math.floor(idx / questionsPerPage));
                                                    document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }}
                                            className={`w-full aspect-square rounded-xl border-2 font-extrabold text-xs transition-all ${
                                                active
                                                    ? 'bg-[#FF6B4A] border-[#FF6B4A] text-white'
                                                    : answered
                                                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                                        : 'bg-white border-[#1A1A1A]/15 text-[#1A1A1A]/40 hover:border-[#1A1A1A]/30'
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-[#1A1A1A] rounded-3xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-[#FCE38A]">
                                <Brain weight="fill" className="w-4 h-4" />
                                <span className="text-[10px] font-extrabold uppercase tracking-widest">AI Support</span>
                            </div>
                            <p className="text-xs text-white/60 font-semibold leading-relaxed italic">
                                Khuyên bạn nên tập trung vào phần đạo hàm bậc 2.
                            </p>
                        </div>
                    </div>

                    <div>
                        {displayMode === 'single' ? (
                            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden shadow-[4px_4px_0_0_rgba(26,26,26,1)] min-h-[460px]">
                                <div className="p-6 border-b-2 border-[#1A1A1A]/10">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-[#B8B5FF] bg-[#B8B5FF]/20 text-[#1A1A1A]">{mockQuestions[currentQuestion].type}</span>
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-[#1A1A1A]/10 bg-[#F7F7F2] text-[#1A1A1A]/50">Câu {currentQuestion + 1}</span>
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-[#1A1A1A] leading-relaxed">{mockQuestions[currentQuestion].question}</h3>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {mockQuestions[currentQuestion].options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(currentQuestion, idx)}
                                            className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                                answers[currentQuestion] === idx
                                                    ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                                    : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 bg-white'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-extrabold ${
                                                answers[currentQuestion] === idx
                                                    ? 'bg-[#FF6B4A] border-[#FF6B4A] text-white'
                                                    : 'bg-[#F7F7F2] border-[#1A1A1A]/15 text-[#1A1A1A]/50'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className="text-sm font-bold text-[#1A1A1A]">{option}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="p-5 bg-gray-50 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between">
                                    <button
                                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                                        disabled={currentQuestion === 0}
                                        className="h-10 px-5 rounded-xl border-2 border-[#1A1A1A]/15 text-[#1A1A1A]/60 font-extrabold hover:text-[#1A1A1A] hover:bg-white disabled:opacity-30 transition-colors flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Câu trước
                                    </button>
                                    <button
                                        onClick={() => currentQuestion < mockQuestions.length - 1 ? setCurrentQuestion(currentQuestion + 1) : setShowResult(true)}
                                        className="h-10 px-6 rounded-xl bg-[#1A1A1A] text-white font-extrabold text-sm hover:bg-[#333] transition-colors flex items-center gap-2"
                                    >
                                        {currentQuestion === mockQuestions.length - 1 ? 'Nộp bài' : 'Câu tiếp'} <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {currentQuestions.map((q, qIndex) => {
                                    const actualIndex = currentPage * questionsPerPage + qIndex;

                                    return (
                                        <div key={actualIndex} id={`q-${actualIndex}`} className="bg-white rounded-2xl border-2 border-[#1A1A1A] p-5 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-[#1A1A1A] text-white text-xs font-extrabold flex items-center justify-center">{actualIndex + 1}</span>
                                                <span className="text-[10px] font-extrabold text-gray-400">{q.subject}</span>
                                            </div>
                                            <p className="font-extrabold text-[#1A1A1A]">{q.question}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                {q.options.map((option, optionIdx) => (
                                                    <button
                                                        key={optionIdx}
                                                        onClick={() => handleAnswer(actualIndex, optionIdx)}
                                                        className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                                                            answers[actualIndex] === optionIdx
                                                                ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                                                : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 bg-white'
                                                        }`}
                                                    >
                                                        {String.fromCharCode(65 + optionIdx)}. {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex items-center justify-center gap-3 py-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                        disabled={currentPage === 0}
                                        className="w-10 h-10 rounded-xl border border-[#1A1A1A]/20 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.ceil(mockQuestions.length / questionsPerPage) }).map((_, pageIdx) => (
                                        <button
                                            key={pageIdx}
                                            onClick={() => setCurrentPage(pageIdx)}
                                            className={`w-10 h-10 rounded-xl text-xs font-extrabold border ${currentPage === pageIdx ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#1A1A1A]/20 text-[#1A1A1A]/60'}`}
                                        >
                                            {pageIdx + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(Math.min(Math.ceil(mockQuestions.length / questionsPerPage) - 1, currentPage + 1))}
                                        disabled={currentPage === Math.ceil(mockQuestions.length / questionsPerPage) - 1}
                                        className="w-10 h-10 rounded-xl border border-[#1A1A1A]/20 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">AI tự động tạo đề ôn tập tối ưu</p>
                <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Ôn tập Cá nhân (AI)</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 space-y-5">
                    {/* Step 1 */}
                    <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FCE38A] border-2 border-[#1A1A1A] font-extrabold flex items-center justify-center text-sm text-[#1A1A1A]">1</div>
                            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Cấu hình chung</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Chọn môn học</p>
                                <div className="relative">
                                    <select className="w-full h-11 bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] rounded-2xl px-4 appearance-none font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors">
                                        <option>Toán học</option>
                                        <option>Ngữ văn</option>
                                        <option>Tiếng Anh</option>
                                    </select>
                                    <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Tổng số câu hỏi</p>
                                <input
                                    type="number"
                                    value={numQuestions}
                                    onChange={(e) => {
                                        const val = Math.max(1, Math.min(100, Number(e.target.value)));
                                        setNumQuestions(val);
                                        if (aiQuestions > val) setAiQuestions(val);
                                    }}
                                    min={1}
                                    max={100}
                                    className="w-full h-11 bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] rounded-2xl px-4 font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors"
                                />
                            </div>
                        </div>

                        {/* AI question count */}
                        <div className="bg-[#FCE38A]/30 rounded-2xl border-2 border-[#FCE38A] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-[#1A1A1A]" weight="fill" />
                                <span className="font-extrabold text-sm text-[#1A1A1A]">Số câu hỏi tạo bằng AI</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={aiQuestions}
                                    onChange={(e) => setAiQuestions(Math.max(0, Math.min(totalQuestions, Number(e.target.value))))}
                                    min={0}
                                    max={totalQuestions}
                                    className="w-24 h-11 bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A] rounded-2xl px-4 font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors text-center"
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs font-extrabold text-[#1A1A1A]/60 mb-1">
                                        <span>{aiQuestions} câu AI / {totalQuestions} tổng</span>
                                        <span>{totalQuestions > 0 ? Math.round((aiQuestions / totalQuestions) * 100) : 0}%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 overflow-hidden">
                                        <div
                                            className="h-full bg-[#FF6B4A] rounded-full transition-all duration-300"
                                            style={{ width: `${totalQuestions > 0 ? (aiQuestions / totalQuestions) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-[#1A1A1A]/50 font-semibold">
                                Còn lại {totalQuestions - aiQuestions} câu sẽ lấy từ ngân hàng câu hỏi có sẵn.
                            </p>
                        </div>

                        {/* AI toggle */}
                        <div className="bg-[#B8B5FF] rounded-2xl border-2 border-[#1A1A1A]/20 p-5 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-2xl bg-[#1A1A1A] text-[#FCE38A] flex items-center justify-center shrink-0">
                                    <Brain className="w-4 h-4" weight="fill" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-[#1A1A1A] mb-0.5">Ưu tiên phần kiến thức còn yếu (AI)</h4>
                                    <p className="text-sm text-[#1A1A1A]/60 font-semibold">Tập trung vào chủ đề bạn thường làm sai hoặc chưa nắm.</p>
                                </div>
                            </div>
                            <div className="shrink-0 cursor-pointer w-12 h-7 bg-[#FF6B4A] rounded-full p-1 border-2 border-[#FF6B4A]/50">
                                <div className="w-5 h-5 bg-white rounded-full shadow translate-x-5 transition-transform" />
                            </div>
                        </div>
                    </div>

                    {/* Step 2 - List format */}
                    <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#B8B5FF] border-2 border-[#1A1A1A] font-extrabold flex items-center justify-center text-sm text-[#1A1A1A]">2</div>
                            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Chọn Chương & Chủ đề</h2>
                        </div>
                        {/* List format */}
                        <div className="space-y-2">
                            {TOPICS.map((topic, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleTopic(i)}
                                    className={`rounded-2xl p-4 cursor-pointer border-2 transition-all duration-200 flex items-center gap-4 ${
                                        selectedTopics[i]
                                            ? 'border-[#FF6B4A] bg-[#FF6B4A]/[0.08] shadow-sm'
                                            : 'border-[#1A1A1A]/15 bg-[#F7F7F2] hover:border-[#1A1A1A]/30'
                                    }`}
                                >
                                    {/* Icon */}
                                    <div
                                        className="w-10 h-10 rounded-2xl border-2 border-[#1A1A1A]/20 flex items-center justify-center font-extrabold text-lg text-[#1A1A1A] shrink-0"
                                        style={{ backgroundColor: topic.levelBg }}
                                    >
                                        {topic.icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-[#1A1A1A] truncate">{topic.label}</h3>
                                            <span
                                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#1A1A1A]/15 text-[#1A1A1A] shrink-0"
                                                style={{ backgroundColor: topic.levelBg }}
                                            >
                                                {topic.level}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-[#1A1A1A]/50 font-bold shrink-0">
                                                Hoàn thành: {topic.completion}%
                                            </span>
                                            <div className="h-2 flex-1 bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${topic.completion}%`, backgroundColor: getBarBg(topic.completion) }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checkbox */}
                                    <div
                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                            selectedTopics[i]
                                                ? 'bg-[#FF6B4A] border-[#FF6B4A]'
                                                : 'border-[#1A1A1A]/30 bg-white'
                                        }`}
                                    >
                                        {selectedTopics[i] && <Check className="w-4 h-4 text-white" weight="bold" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-[#1A1A1A]/40 font-bold">
                            Đã chọn {selectedTopics.filter(Boolean).length}/{TOPICS.length} chương
                        </p>
                    </div>
                </div>

                {/* Summary panel */}
                <div className="w-full lg:w-80 space-y-5 shrink-0">
                    <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 space-y-5">
                        <h3 className="font-extrabold text-xl text-[#1A1A1A]">Tổng quan đề ôn</h3>
                        <div className="space-y-3">
                            {[
                                ['Môn học', 'Toán học'],
                                ['Số câu', `${numQuestions} câu`],
                                ['Câu AI', `${aiQuestions}/${numQuestions} câu`],
                                ['Chế độ', '🧠 AI Hỗ trợ'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between items-center pb-3 border-b-2 border-dashed border-[#1A1A1A]/10">
                                    <span className="text-sm font-bold text-[#1A1A1A]/50">{l}</span>
                                    <span className="font-extrabold text-[#1A1A1A]">{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-1">
                            <p className="text-xs font-extrabold text-[#1A1A1A]/40 uppercase tracking-widest mb-3">Cơ cấu (dự kiến)</p>
                            {[
                                ['Kiến thức yếu', `${aiQuestions} câu (${totalQuestions > 0 ? Math.round((aiQuestions / totalQuestions) * 100) : 0}%)`, '#FFB5B5'],
                                ['Kiến thức khá/tốt', `${totalQuestions - aiQuestions} câu (${totalQuestions > 0 ? Math.round(((totalQuestions - aiQuestions) / totalQuestions) * 100) : 0}%)`, '#95E1D3'],
                            ].map(([l, v, bg]) => (
                                <div key={l} className="flex justify-between text-sm font-bold mb-2">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-[#1A1A1A]/20" style={{ backgroundColor: bg }} />{l}</div>
                                    <span className="text-[#1A1A1A]/60">{v}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsReviewing(true)}
                            className="w-full h-14 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md"
                        >
                            Bắt đầu ôn tập <ArrowRight className="w-5 h-5" weight="bold" />
                        </button>
                        <p className="text-center text-xs text-gray-400 font-semibold">Cập nhật dựa trên kết quả luyện tập lần cuối hôm nay, 14:30.</p>
                    </div>

                    {/* AI tip */}
                    <div className="bg-[#1A1A1A] rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                        <div className="font-extrabold text-lg text-white mb-3 flex items-center gap-2">✨ Mẹo từ AI</div>
                        <p className="text-white/60 text-sm font-semibold leading-relaxed italic">
                            Bạn đang gặp khó khăn ở Công thức Newton-Leibniz. Bài ôn tập này sẽ thêm 5 câu vận dụng để củng cố căn bản.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
