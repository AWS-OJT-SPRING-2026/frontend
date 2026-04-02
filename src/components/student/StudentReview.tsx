import { useState, useEffect, useRef } from 'react';
import { Brain, CaretDown, Check, ArrowRight, ArrowLeft, Trophy } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';

import { FAST_API_BASE_URL as FAST_API_URL } from '../../services/env';

const levels = [
    { level: 'Yếu', levelBg: '#FFB5B5' },
    { level: 'Trung bình', levelBg: '#FCE38A' },
    { level: 'Khá', levelBg: '#B8B5FF' },
    { level: 'Tốt', levelBg: '#95E1D3' },
];


interface Question {
    id: number;
    type: string;
    subject: string;
    question: string;
    options: string[];
    answer_ref_ids: number[];
    correct: number;
    explanation: string;
    level: string;
}

export function StudentReview() {
    const { theme, language } = useSettings();
    const isDark = theme === 'dark';
    const isEn = language === 'en';
    const text = {
        titleTag: isEn ? 'AI AUTO-GENERATED OPTIMIZED REVIEW' : 'AI tự động tạo đề ôn tập tối ưu',
        title: isEn ? 'Personal Review (AI)' : 'Ôn tập Cá nhân (AI)',
        stepGeneral: isEn ? 'General Configuration' : 'Cấu hình chung',
        stepLessons: isEn ? 'Select Lessons' : 'Chọn Bài học',
        subject: isEn ? 'Select Subject' : 'Chọn môn học',
        totalQuestions: isEn ? 'Total Questions' : 'Tổng số câu hỏi',
        aiQuestions: isEn ? 'AI-generated Questions' : 'Số câu hỏi tạo bằng AI',
        prioritizeWeak: isEn ? 'Prioritize Weak Knowledge Areas (AI)' : 'Ưu tiên phần kiến thức còn yếu (AI)',
        prioritizeWeakDesc: isEn ? 'Focus on topics you often answer incorrectly or have not mastered.' : 'Tập trung vào chủ đề bạn thường làm sai hoặc chưa nắm.',
        selectedLessons: isEn ? 'Selected' : 'Đã chọn',
        lessonsUnit: isEn ? 'lessons' : 'bài học',
        startReview: isEn ? 'Start Review' : 'Bắt đầu ôn tập',
        summaryTitle: isEn ? 'Review Summary' : 'Tổng quan đề ôn',
        aiMode: isEn ? 'AI Assisted' : 'AI Hỗ trợ',
        aiTip: isEn ? 'Tip from AI' : 'Mẹo từ AI',
    };
    const [subjects, setSubjects] = useState<{ subject_id: number; subject_name: string }[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [lessons, setLessons] = useState<{ id: number; label: string; level: string; levelBg: string; selected: boolean }[]>([]);
    const [selectedLessons, setSelectedLessons] = useState<boolean[]>([]);
    const [numQuestions, setNumQuestions] = useState(20);
    const [aiQuestions, setAiQuestions] = useState(12);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [displayMode, setDisplayMode] = useState<'single' | 'list'>('single');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [history, setHistory] = useState<SubmissionHistory[]>([]);
    const [historyDetail, setHistoryDetail] = useState<SubmissionDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    interface SubmissionHistory {
        submissionid: number;
        score: number;
        time_taken: number;
        submit_time: string;
        quiz_name: string;
    }

    interface SubmissionDetailQuestion {
        id: number;
        question: string;
        options: string[];
        selected: number | null;
        correct: number;
        explanation: string;
        subject: string;
        level: string;
        is_correct: boolean;
    }

    interface SubmissionDetail {
        submissionid: number;
        score: number;
        time_taken: number;
        submit_time: string;
        quiz_name: string;
        questions: SubmissionDetailQuestion[];
    }

    const [searchParams, setSearchParams] = useSearchParams();
    const urlSubject = searchParams.get('subject');
    const urlQuestions = searchParams.get('questions');
    const urlApplied = useRef(false);

    const resolveCurrentUserId = (): number => {
        try {
            const rawUser = localStorage.getItem('user');
            if (!rawUser) return 1;
            const parsed = JSON.parse(rawUser);
            const candidate = Number(parsed?.id);
            return Number.isFinite(candidate) && candidate > 0 ? candidate : 1;
        } catch {
            return 1;
        }
    };

    const currentUserId = resolveCurrentUserId();

    useEffect(() => {
        fetch(`${FAST_API_URL}/subjects/`)
            .then(res => res.json())
            .then(data => {
                setSubjects(data);
                // If URL has ?subject=... from chatbot widget, auto-select it
                if (urlSubject && !urlApplied.current) {
                    const normalizedUrl = urlSubject.toLowerCase().trim();
                    const matched = data.find((s: any) =>
                        s.subject_name.toLowerCase().trim().includes(normalizedUrl) ||
                        normalizedUrl.includes(s.subject_name.toLowerCase().trim())
                    );
                    if (matched) {
                        setSelectedSubjectId(matched.subject_id);
                        if (urlQuestions) {
                            const q = parseInt(urlQuestions);
                            if (!isNaN(q) && q > 0) setNumQuestions(q);
                        }
                        urlApplied.current = true;
                        // Clean up URL params
                        setSearchParams({}, { replace: true });
                    } else if (data.length > 0 && !selectedSubjectId) {
                        setSelectedSubjectId(data[0].subject_id);
                    }
                } else if (data.length > 0 && !selectedSubjectId) {
                    setSelectedSubjectId(data[0].subject_id);
                }
            })
            .catch(err => console.error('Error fetching subjects:', err));

        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${FAST_API_URL}/subjects/submissions/${currentUserId}`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const handleViewDetail = async (submissionid: number) => {
        setLoadingDetail(true);
        try {
            const res = await fetch(`${FAST_API_URL}/subjects/submissions/${submissionid}/details`);
            if (res.ok) {
                const data = await res.json();
                setHistoryDetail(data);
            }
        } catch (err) {
            console.error('Error fetching submission detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        if (selectedSubjectId) {
            fetch(`${FAST_API_URL}/subjects/${selectedSubjectId}/lessons`)
                .then(res => res.json())
                .then(data => {
                    const formattedLessons = data.map((ls: any, i: number) => ({
                        id: ls.id,
                        label: ls.title,
                        level: levels[i % levels.length].level,
                        levelBg: levels[i % levels.length].levelBg,
                        selected: i === 0
                    }));
                    setLessons(formattedLessons);
                    setSelectedLessons(formattedLessons.map((l: any) => l.selected));
                })
                .catch(err => console.error('Error fetching lessons:', err));
        }
    }, [selectedSubjectId]);

    const totalQuestions = numQuestions;

    const toggleLesson = (index: number) => {
        setLessons(prev => {
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
        setSelectedLessons(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    const handleStartReview = async () => {
        if (!selectedSubjectId) return;

        const selectedLessonIds = lessons
            .filter((_, i) => selectedLessons[i])
            .map(l => l.id);

        if (selectedLessonIds.length === 0) {
            alert(isEn ? 'Please select at least one lesson.' : 'Vui lòng chọn ít nhất một bài học!');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${FAST_API_URL}/subjects/fetch-questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: selectedSubjectId,
                    lesson_ids: selectedLessonIds,
                    num_questions: numQuestions,
                    ai_questions: aiQuestions,
                    userid: currentUserId
                })
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody?.detail || "Failed to fetch questions");
            }

            const data = await response.json();
            setQuestions(data);
            setAnswers(new Array(data.length).fill(null));
            setCurrentQuestion(0);
            setCurrentPage(0);
            setIsReviewing(true);
            setStartTime(Date.now());
        } catch (err) {
            console.error("Error starting review:", err);
            alert(isEn ? 'An error occurred while loading questions. Please try again.' : 'Có lỗi xảy ra khi tải câu hỏi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = (qIndex: number, optionIndex: number) => {
        const nextAnswers = [...answers];
        nextAnswers[qIndex] = optionIndex;
        setAnswers(nextAnswers);
    };

    const handleSubmitQuiz = async () => {
        if (isSubmitting) return;

        const correctCount = answers.filter((ans, idx) => questions[idx] && ans === questions[idx].correct).length;
        const scoreVal = questions.length > 0 ? Math.round((correctCount / questions.length) * 10) : 0;
        const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

        const submissionData = {
            userid: currentUserId,
            score: scoreVal,
            time_taken: timeTaken,
            answers: answers.map((ans, idx) => ({
                question_id: questions[idx].id,
                selected_answer: ans !== null ? questions[idx].options[ans] : "Unanswered",
                is_correct: ans === questions[idx].correct,
                answer_ref_id: ans !== null ? questions[idx].answer_ref_ids[ans] : null
            }))
        };

        setIsSubmitting(true);
        try {
            const response = await fetch(`${FAST_API_URL}/subjects/submit-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });
            if (!response.ok) throw new Error("Submission failed");
            await fetchHistory();
            setShowResult(true);
        } catch (error) {
            console.error("Error submitting quiz:", error);
            alert(isEn ? 'An error occurred while saving results. Ending review.' : 'Có lỗi khi lưu kết quả. Kết thúc bài ôn tập.');
            setShowResult(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const correctCount = answers.filter((ans, idx) => questions[idx] && ans === questions[idx].correct).length;
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 10) : 0;

    if (showResult) {
        return (
            <div className="p-8 space-y-8 max-w-4xl mx-auto text-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className={`rounded-3xl p-12 space-y-6 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                    <div className="w-24 h-24 bg-[#FCE38A] rounded-3xl border-4 border-[#1A1A1A] flex items-center justify-center mx-auto shadow-xl">
                        <Trophy className="w-12 h-12 text-[#1A1A1A]" weight="fill" />
                    </div>
                    <div>
                        <h1 className={`text-4xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Hoàn thành ôn tập!</h1>
                        <p className={`font-bold mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Tuyệt vời, bạn đã hoàn thành đề ôn tập được AI cá nhân hóa.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-6">
                        <div className={`p-6 rounded-3xl ${isDark ? 'bg-white/[0.03] border border-[#1A1A1A]/20' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/10'}`}>
                            <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest mb-2">Điểm số</p>
                            <p className="text-4xl font-extrabold text-[#FF6B4A]">{score}</p>
                        </div>
                        <div className={`p-6 rounded-3xl ${isDark ? 'bg-white/[0.03] border border-[#1A1A1A]/20' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/10'}`}>
                            <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest mb-2">Đúng/Tổng</p>
                            <p className="text-4xl font-extrabold text-[#1A1A1A]">{correctCount}/{questions.length}</p>
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
                                setAnswers(new Array(questions.length).fill(null));
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
        if (questions.length === 0) {
            return (
                <div className="p-8 text-center" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <div className={`rounded-3xl p-12 space-y-4 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                        <Brain className="w-16 h-16 text-[#FF6B4A] mx-auto animate-bounce" weight="fill" />
                        <h2 className="text-2xl font-extrabold text-[#1A1A1A]">Không tìm thấy câu hỏi</h2>
                        <p className={`font-bold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Không có câu hỏi nào phù hợp với lựa chọn của bạn. Vui lòng thử chọn bài học khác.</p>
                        <button
                            onClick={() => setIsReviewing(false)}
                            className="h-12 px-8 bg-[#1A1A1A] text-white rounded-2xl font-extrabold transition-transform hover:scale-[1.02]"
                        >
                            Quay lại cấu hình
                        </button>
                    </div>
                </div>
            );
        }

        const questionsPerPage = 10;
        const currentQuestions = displayMode === 'list'
            ? questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage)
            : [questions[currentQuestion]];

        return (
            <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className={`rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsReviewing(false)}
                            className="w-10 h-10 rounded-xl border-2 border-[#1A1A1A]/10 bg-[#F7F7F2] text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-white transition-colors flex items-center justify-center"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h2 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Đang ôn tập: {subjects.find(s => s.subject_id === selectedSubjectId)?.subject_name || "Môn học"}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`text-[10px] font-extrabold ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>Tiến độ: {answers.filter(a => a !== null).length}/{questions.length}</span>
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
                        onClick={handleSubmitQuiz}
                        disabled={isSubmitting}
                        className="h-11 px-6 rounded-2xl bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-sm transition-all shadow-[0_4px_0_0_#A83F2A] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#A83F2A] disabled:opacity-50"
                    >
                        {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
                    <div className="space-y-4">
                        <div className={`rounded-3xl p-4 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-3 ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>Danh sách câu hỏi</p>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((_, idx) => {
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
                                            className={`w-full aspect-square rounded-xl border-2 font-extrabold text-xs transition-all ${active
                                                ? 'bg-[#FF6B4A] border-[#FF6B4A] text-white'
                                                : answered
                                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                                    : (isDark ? 'bg-[#17171d] border-[#1A1A1A]/20 text-gray-500 hover:border-white/35' : 'bg-white border-[#1A1A1A]/15 text-[#1A1A1A]/40 hover:border-[#1A1A1A]/30')
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
                            <div className={`rounded-3xl overflow-hidden min-h-[460px] ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                                <div className={`p-6 ${isDark ? 'border-b border-[#1A1A1A]/20' : 'border-b-2 border-[#1A1A1A]/10'}`}>
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-[#B8B5FF] bg-[#B8B5FF]/20 text-[#1A1A1A]">{questions[currentQuestion].type}</span>
                                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-[#1A1A1A]/10 bg-[#F7F7F2] text-[#1A1A1A]/50">Câu {currentQuestion + 1}</span>
                                    </div>
                                    <h3 className={`text-2xl font-extrabold leading-relaxed ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{questions[currentQuestion].question}</h3>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {questions[currentQuestion].options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(currentQuestion, idx)}
                                            className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${answers[currentQuestion] === idx
                                                ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                                : (isDark ? 'border-[#1A1A1A]/20 hover:border-white/35 bg-white/[0.02]' : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 bg-white')
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-extrabold ${answers[currentQuestion] === idx
                                                ? 'bg-[#FF6B4A] border-[#FF6B4A] text-white'
                                                : (isDark ? 'bg-[#17171d] border-white/25 text-gray-500' : 'bg-[#F7F7F2] border-[#1A1A1A]/15 text-[#1A1A1A]/50')
                                                }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm font-bold ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`}>{option}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className={`p-5 flex items-center justify-between ${isDark ? 'bg-[#1a1a1f] border-t border-[#1A1A1A]/20' : 'bg-gray-50 border-t-2 border-[#1A1A1A]/10'}`}>
                                    <button
                                        onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                                        disabled={currentQuestion === 0}
                                        className="h-10 px-5 rounded-xl border-2 border-[#1A1A1A]/15 text-[#1A1A1A]/60 font-extrabold hover:text-[#1A1A1A] hover:bg-white disabled:opacity-30 transition-colors flex items-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Câu trước
                                    </button>
                                    <button
                                        onClick={() => currentQuestion < questions.length - 1 ? setCurrentQuestion(currentQuestion + 1) : handleSubmitQuiz()}
                                        disabled={isSubmitting}
                                        className="h-10 px-6 rounded-xl bg-[#1A1A1A] text-white font-extrabold text-sm hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Đang nộp...' : (currentQuestion === questions.length - 1 ? 'Nộp bài' : 'Câu tiếp')} <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {currentQuestions.map((q, qIndex) => {
                                    const actualIndex = currentPage * questionsPerPage + qIndex;

                                    return (
                                        <div key={actualIndex} id={`q-${actualIndex}`} className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
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
                                                        className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition-colors ${answers[actualIndex] === optionIdx
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
                                    {Array.from({ length: Math.ceil(questions.length / questionsPerPage) }).map((_, pageIdx) => (
                                        <button
                                            key={pageIdx}
                                            onClick={() => setCurrentPage(pageIdx)}
                                            className={`w-10 h-10 rounded-xl text-xs font-extrabold border ${currentPage === pageIdx ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#1A1A1A]/20 text-[#1A1A1A]/60'}`}
                                        >
                                            {pageIdx + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(Math.min(Math.ceil(questions.length / questionsPerPage) - 1, currentPage + 1))}
                                        disabled={currentPage === Math.ceil(questions.length / questionsPerPage) - 1}
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

    if (historyDetail) {
        const correctCount = historyDetail.questions.filter(q => q.is_correct).length;
        return (
            <div className="p-8 space-y-6 max-w-4xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {/* Header */}
                <div className={`rounded-3xl p-5 flex items-center gap-4 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                    <button
                        onClick={() => setHistoryDetail(null)}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${isDark ? 'border-[#1A1A1A]/20 text-gray-300 hover:bg-white/10' : 'border-[#1A1A1A]/15 text-[#1A1A1A]/60 hover:bg-[#F7F7F2]'}`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className={`text-xl font-extrabold truncate ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                            Chi tiết: {historyDetail.quiz_name}
                        </h1>
                        <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>
                            {historyDetail.submit_time} · {Math.floor(historyDetail.time_taken / 60)}p {historyDetail.time_taken % 60}s
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className={`px-4 py-2 rounded-2xl text-center ${isDark ? 'bg-[#fce38a]/15 border border-[#fce38a]/30' : 'bg-[#FCE38A] border-2 border-[#1A1A1A]/15'}`}>
                            <p className={`text-xs font-extrabold uppercase tracking-widest ${isDark ? 'text-[#fce38a]/70' : 'text-[#1A1A1A]/50'}`}>Điểm</p>
                            <p className={`text-2xl font-extrabold ${isDark ? 'text-[#fce38a]' : 'text-[#1A1A1A]'}`}>{historyDetail.score}/10</p>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-center ${isDark ? 'bg-[#95e1d3]/15 border border-[#95e1d3]/30' : 'bg-[#95E1D3] border-2 border-[#1A1A1A]/15'}`}>
                            <p className={`text-xs font-extrabold uppercase tracking-widest ${isDark ? 'text-[#95e1d3]/70' : 'text-[#1A1A1A]/50'}`}>Đúng</p>
                            <p className={`text-2xl font-extrabold ${isDark ? 'text-[#95e1d3]' : 'text-[#1A1A1A]'}`}>{correctCount}/{historyDetail.questions.length}</p>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    {historyDetail.questions.map((q, i) => (
                        <div key={q.id} className={`rounded-3xl overflow-hidden border-2 ${q.is_correct
                            ? (isDark ? 'border-emerald-500/30' : 'border-emerald-400/40')
                            : (isDark ? 'border-red-500/30' : 'border-red-400/40')}`}>
                            {/* Question header */}
                            <div className={`px-6 py-4 flex items-center gap-3 ${q.is_correct
                                ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
                                : (isDark ? 'bg-red-500/10' : 'bg-red-50')}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold ${q.is_correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-extrabold leading-snug ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{q.question}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/50'}`}>{q.subject}</span>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/50'}`}>{q.level}</span>
                                    </div>
                                </div>
                                <span className={`text-xs font-extrabold px-3 py-1 rounded-full shrink-0 ${q.is_correct ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                                    {q.is_correct ? '✓ Đúng' : '✗ Sai'}
                                </span>
                            </div>

                            {/* Options */}
                            <div className={`px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-2 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white'}`}>
                                {q.options.map((opt, optIdx) => {
                                    const isSelected = q.selected === optIdx;
                                    const isCorrectOpt = q.correct === optIdx;
                                    let cls = '';
                                    if (isCorrectOpt) cls = isDark ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-emerald-500 bg-emerald-50 text-emerald-700';
                                    else if (isSelected && !isCorrectOpt) cls = isDark ? 'border-red-500 bg-red-500/15 text-red-300' : 'border-red-400 bg-red-50 text-red-700';
                                    else cls = isDark ? 'border-[#1A1A1A]/20 text-gray-400' : 'border-[#1A1A1A]/10 text-[#1A1A1A]/50';
                                    return (
                                        <div key={optIdx} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${cls}`}>
                                            <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-extrabold shrink-0 ${isCorrectOpt ? 'border-emerald-500 bg-emerald-500 text-white' : isSelected ? 'border-red-400 bg-red-400 text-white' : (isDark ? 'border-[#1A1A1A]/20 text-gray-400' : 'border-[#1A1A1A]/15 text-[#1A1A1A]/40')}`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className="text-sm font-bold">{opt}</span>
                                            {isSelected && !isCorrectOpt && <span className="ml-auto text-xs font-extrabold text-red-500">Bạn chọn</span>}
                                            {isCorrectOpt && <span className="ml-auto text-xs font-extrabold text-emerald-600">Đáp án đúng</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                                <div className={`px-6 py-3 border-t ${isDark ? 'border-[#1A1A1A]/20 bg-[#1a1a1f]' : 'border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                                    <p className={`text-xs font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#1A1A1A]/50'}`}>
                                        <span className="font-extrabold text-[#FF6B4A]">Giải thích: </span>{q.explanation}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (loadingDetail) {
        return (
            <div className="flex items-center justify-center p-20" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#FF6B4A]/30 border-t-[#FF6B4A] rounded-full animate-spin mx-auto" />
                    <p className="font-extrabold text-gray-400">Đang tải chi tiết...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div>
                <p className={`text-xs font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>{text.titleTag}</p>
                <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-[#1A1A1A]'}'}`}>{text.title}</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-1 space-y-5">
                    {/* Step 1 */}
                    <div className={`rounded-3xl p-6 space-y-5 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-sm shadow-sm ${isDark ? 'bg-[#fde68a] border border-[#fde68a] text-[#1A1A1A] shadow-[#fde68a]/25' : 'bg-[#FCE38A] border-2 border-[#1A1A1A] text-[#1A1A1A]'}`}>1</div>
                            <h2 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{text.stepGeneral}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className={`text-xs font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>{text.subject}</p>
                                <div className="relative">
                                    <select
                                        value={selectedSubjectId || ''}
                                        onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                                        className={`w-full h-11 rounded-2xl px-4 appearance-none font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}
                                    >
                                        {subjects.map(s => (
                                            <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                                        ))}
                                    </select>
                                    <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <p className={`text-xs font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>{text.totalQuestions}</p>
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
                                    className={`review-number-input w-full h-11 rounded-2xl px-4 font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}
                                />
                            </div>
                        </div>

                        {/* AI question count */}
                        <div className={`rounded-2xl p-4 space-y-3 ${isDark ? 'bg-[#463f1f] border border-[#fde68a]/45' : 'bg-[#FCE38A]/30 border-2 border-[#FCE38A]'}`}>
                            <div className="flex items-center gap-2">
                                <Brain className={`w-4 h-4 ${isDark ? 'text-[#fde68a]' : 'text-[#1A1A1A]'}`} weight="fill" />
                                <span className={`font-extrabold text-sm ${isDark ? 'text-[#fef3c7]' : 'text-[#1A1A1A]'}`}>{text.aiQuestions}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={aiQuestions}
                                    onChange={(e) => setAiQuestions(Math.max(0, Math.min(totalQuestions, Number(e.target.value))))}
                                    min={0}
                                    max={totalQuestions}
                                    className={`review-number-input w-24 h-11 rounded-2xl px-4 font-bold focus:outline-none focus:border-[#FF6B4A] transition-colors text-center ${isDark ? 'bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A]' : 'bg-white border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}
                                />
                                <div className="flex-1">
                                    <div className={`flex justify-between text-xs font-extrabold mb-1 ${isDark ? 'text-[#fef3c7]' : 'text-[#1A1A1A]/60'}`}>
                                        <span>{isEn ? `${aiQuestions} AI / ${totalQuestions} total` : `${aiQuestions} câu AI / ${totalQuestions} tổng`}</span>
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
                            <p className={`text-xs font-semibold ${isDark ? 'text-[#e7e5b6]' : 'text-[#1A1A1A]/50'}`}>
                                {isEn
                                    ? `${totalQuestions - aiQuestions} remaining questions will be taken from the existing question bank.`
                                    : `Còn lại ${totalQuestions - aiQuestions} câu sẽ lấy từ ngân hàng câu hỏi có sẵn.`}
                            </p>
                        </div>

                        {/* AI toggle */}
                        <div className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${isDark ? 'bg-[#3a3558] border border-[#b8b5ff]/45' : 'bg-[#B8B5FF] border-2 border-[#1A1A1A]/20'}`}>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-2xl bg-[#1A1A1A] text-[#FCE38A] flex items-center justify-center shrink-0">
                                    <Brain className="w-4 h-4" weight="fill" />
                                </div>
                                <div>
                                    <h4 className={`font-extrabold mb-0.5 ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`}>{text.prioritizeWeak}</h4>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>{text.prioritizeWeakDesc}</p>
                                </div>
                            </div>
                            <div className="shrink-0 cursor-pointer w-12 h-7 bg-[#FF6B4A] rounded-full p-1 border-2 border-[#FF6B4A]/50">
                                <div className="w-5 h-5 bg-white rounded-full shadow translate-x-5 transition-transform" />
                            </div>
                        </div>
                    </div>

                    {/* Step 2 - List format */}
                    <div className={`rounded-3xl p-6 space-y-5 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full font-extrabold flex items-center justify-center text-sm shadow-sm ${isDark ? 'bg-[#c4b5fd] border border-[#c4b5fd] text-[#1A1A1A] shadow-[#c4b5fd]/25' : 'bg-[#B8B5FF] border-2 border-[#1A1A1A] text-[#1A1A1A]'}`}>2</div>
                            <h2 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{text.stepLessons}</h2>
                        </div>
                        {/* List format */}
                        <div className="space-y-2">
                            {lessons.map((lesson, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleLesson(i)}
                                    className={`rounded-2xl p-4 cursor-pointer border-2 transition-all duration-200 flex items-center justify-between gap-4 ${selectedLessons[i]
                                        ? 'border-[#FF6B4A] bg-[#FF6B4A]/[0.08] shadow-sm'
                                        : (isDark ? 'border-[#1A1A1A]/20 bg-white/[0.02] hover:border-white/30' : 'border-[#1A1A1A]/15 bg-white hover:border-[#1A1A1A]/30')
                                        }`}
                                >
                                    {/* Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <h3 className={`font-extrabold truncate ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`}>{lesson.label}</h3>
                                        <span
                                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${isDark ? 'border border-[#1A1A1A]/15 text-[#1A1A1A]' : 'border border-[#1A1A1A]/15 text-[#1A1A1A]'}`}
                                            style={{ backgroundColor: lesson.levelBg }}
                                        >
                                            {lesson.level}
                                        </span>
                                    </div>

                                    {/* Checkbox */}
                                    <div
                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedLessons[i]
                                            ? 'bg-[#FF6B4A] border-[#FF6B4A]'
                                            : 'border-[#1A1A1A]/30 bg-white'
                                            }`}
                                    >
                                        {selectedLessons[i] && <Check className="w-4 h-4 text-white" weight="bold" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className={`text-xs font-bold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/55'}`}>
                            {text.selectedLessons} {selectedLessons.filter(Boolean).length}/{lessons.length} {text.lessonsUnit}
                        </p>
                    </div>

                    {/* History Section */}
                    {history.length > 0 && (
                        <div className={`rounded-3xl p-6 space-y-5 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#95E1D3] border-2 border-[#1A1A1A] font-extrabold flex items-center justify-center text-sm text-[#1A1A1A]">
                                        <Trophy weight="bold" className="w-4 h-4" />
                                    </div>
                                    <h2 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Lịch sử ôn tập</h2>
                                </div>
                                <span className={`text-xs font-bold ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>Hiển thị {history.length} bài làm gần nhất</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-center">
                                            <th className="px-4 py-2">Ngày làm</th>
                                            <th className="px-4 py-2">Nội dung</th>
                                            <th className="px-4 py-2">Thời gian</th>
                                            <th className="px-4 py-2">Điểm số</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((item) => (
                                            <tr
                                                key={item.submissionid}
                                                onClick={() => handleViewDetail(item.submissionid)}
                                                className="group hover:bg-[#F7F7F2] transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3 bg-[#F7F7F2] group-hover:bg-white rounded-l-2xl border-y-2 border-l-2 border-[#1A1A1A]/5 font-bold text-xs text-[#1A1A1A] text-center">
                                                    {item.submit_time}
                                                </td>
                                                <td className="px-4 py-3 bg-[#F7F7F2] group-hover:bg-white border-y-2 border-[#1A1A1A]/5 font-extrabold text-sm text-[#1A1A1A] text-center">
                                                    {item.quiz_name}
                                                </td>
                                                <td className="px-4 py-3 bg-[#F7F7F2] group-hover:bg-white border-y-2 border-[#1A1A1A]/5 font-bold text-xs text-gray-500 text-center">
                                                    {Math.floor(item.time_taken / 60)}p {item.time_taken % 60}s
                                                </td>
                                                <td className="px-4 py-3 bg-[#F7F7F2] group-hover:bg-white border-y-2 border-[#1A1A1A]/5 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full font-extrabold text-sm ${item.score >= 8 ? 'bg-[#95E1D3]/20 text-[#2D5A27] border border-[#95E1D3]/30' :
                                                        item.score >= 5 ? 'bg-[#FCE38A]/20 text-[#856404] border border-[#FCE38A]/30' :
                                                            'bg-[#FFB5B5]/20 text-[#721C24] border border-[#FFB5B5]/30'
                                                        }`}>
                                                        {item.score}/10
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 bg-[#F7F7F2] group-hover:bg-white rounded-r-2xl border-y-2 border-r-2 border-[#1A1A1A]/5 text-center">
                                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#FF6B4A] transition-colors mx-auto" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary panel */}
                <div className="w-full lg:w-80 space-y-5 shrink-0">
                    <div className={`rounded-3xl p-6 space-y-5 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold text-xl ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{text.summaryTitle}</h3>
                        <div className="space-y-3">
                            {[
                                ['Môn học', subjects.find(s => s.subject_id === selectedSubjectId)?.subject_name || '...'],
                                ['Số câu', `${numQuestions} câu`],
                                ['Câu AI', `${aiQuestions}/${numQuestions} câu`],
                                [isEn ? 'Mode' : 'Chế độ', `🧠 ${text.aiMode}`],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between items-center pb-3 border-b-2 border-dashed border-[#1A1A1A]/10">
                                    <span className={`text-sm font-bold ${isDark ? 'text-[#94a3b8]' : 'text-[#1A1A1A]/50'}`}>{l}</span>
                                    <span className={`font-extrabold ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-1">
                            <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${isDark ? 'text-[#94a3b8]' : 'text-[#1A1A1A]/40'}`}>{isEn ? 'Distribution (estimated)' : 'Cơ cấu (dự kiến)'}</p>
                            {[
                                [isEn ? 'Weak knowledge' : 'Kiến thức yếu', `${aiQuestions} ${isEn ? 'questions' : 'câu'} (${totalQuestions > 0 ? Math.round((aiQuestions / totalQuestions) * 100) : 0}%)`, '#FFB5B5'],
                                [isEn ? 'Good/strong knowledge' : 'Kiến thức khá/tốt', `${totalQuestions - aiQuestions} ${isEn ? 'questions' : 'câu'} (${totalQuestions > 0 ? Math.round(((totalQuestions - aiQuestions) / totalQuestions) * 100) : 0}%)`, '#95E1D3'],
                            ].map(([l, v, bg]) => (
                                <div key={l} className="flex justify-between text-sm font-bold mb-2">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-[#1A1A1A]/20" style={{ backgroundColor: bg }} />{l}</div>
                                    <span className={isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleStartReview}
                            disabled={isLoading}
                            className={`w-full h-14 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {isEn ? 'Preparing review...' : 'Đang chuẩn bị đề...'}
                                </>
                            ) : (
                                <>
                                    {text.startReview} <ArrowRight className="w-5 h-5" weight="bold" />
                                </>
                            )}
                        </button>
                        <p className={`text-center text-xs font-semibold ${isDark ? 'text-[#94a3b8]' : 'text-gray-400'}`}>{isEn ? 'Updated from your latest practice results today, 14:30.' : 'Cập nhật dựa trên kết quả luyện tập lần cuối hôm nay, 14:30.'}</p>
                    </div>

                    {/* AI tip */}
                    <div className={`rounded-3xl p-6 relative overflow-hidden ${isDark ? 'bg-[#17171d] border-none' : 'bg-[#1A1A1A]'}`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                        <div className="font-extrabold text-lg text-white mb-3 flex items-center gap-2">✨ {text.aiTip}</div>
                        <p className={`text-sm font-semibold leading-relaxed italic ${isDark ? 'text-gray-500' : 'text-white/60'}`}>
                            Bạn đang gặp khó khăn ở Công thức Newton-Leibniz. Bài ôn tập này sẽ thêm 5 câu vận dụng để củng cố căn bản.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
