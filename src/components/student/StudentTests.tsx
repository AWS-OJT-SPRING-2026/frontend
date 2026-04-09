import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { MathRenderer } from '../ui/MathRenderer';
import {
    CheckCircle, ClipboardText, Clock, BookOpen, CaretRight,
    ArrowCounterClockwise, Star, Hourglass, WarningCircle,
    Medal, MagnifyingGlass, Funnel, ListNumbers, XCircle, Archive,
    ShieldWarning
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { assignmentService, AssignmentResponse, AssignmentDetailResponse, SubmissionResponse, AssignmentAttemptResponse, AssignmentResultResponse } from '../../services/assignmentService';
import { authService, UserData } from '../../services/authService';
import { useQuizDraft } from '../../hooks/useQuizDraft';
import { quizSessionGuard } from '../../lib/quizSessionGuard';

type TestStatus = 'pending' | 'in_progress' | 'completed' | 'missing';
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
    score?: number | null;
    submittedAt?: string;
    correctCount?: number;
    className?: string;
    lessonKey?: string;
    lessonLabel?: string;
    lessonDate?: string;
    startTimeIso?: string | null;
    endTimeIso?: string | null;
    deadlineIso?: string | null;
    _assignmentId?: number;
}

function parseVnDate(value: string | null | undefined): Date {
    if (!value) return new Date(NaN);
    if (value.length === 19) {
        return new Date(value + '+07:00');
    }
    return new Date(value);
}

function formatDateTime(value?: string | null) {
    if (!value) return '---';
    return parseVnDate(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatOpenTime(value?: string | null) {
    if (!value) return '---';
    const d = parseVnDate(value);
    if (Number.isNaN(d.getTime())) return '---';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
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

function getDueTimestamp(test: Test): number | null {
    const dueIso = test.deadlineIso;
    if (dueIso) {
        const ms = parseVnDate(dueIso).getTime();
        if (!Number.isNaN(ms)) return ms;
    }
    if (test.dueDate) {
        const ms = parseDate(test.dueDate).getTime();
        if (!Number.isNaN(ms)) return ms;
    }
    return null;
}

function isUrgent(test: Test, nowMs: number) {
    const dueMs = getDueTimestamp(test);
    if (!dueMs) return false;
    const diff = dueMs - nowMs;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

type TimeAlert = 'opening' | 'ending' | 'deadline' | null;

function getTimeAlert(test: Test, nowMs: number): TimeAlert {
    if (test.status === 'completed' || test.status === 'missing') return null;

    if (test.category === 'exam') {
        const startMs = test.startTimeIso ? parseVnDate(test.startTimeIso).getTime() : NaN;
        const endMs = test.endTimeIso ? parseVnDate(test.endTimeIso).getTime() : NaN;

        if (!Number.isNaN(startMs) && nowMs < startMs) {
            const diffToStart = startMs - nowMs;
            if (diffToStart <= 24 * 60 * 60 * 1000) return 'opening';
            return null;
        }

        if (!Number.isNaN(endMs) && nowMs < endMs) {
            const diffToEnd = endMs - nowMs;
            if (diffToEnd <= 24 * 60 * 60 * 1000) return 'ending';
        }

        return null;
    }

    return isUrgent(test, nowMs) ? 'deadline' : null;
}

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

function ExerciseCard({ test, onStart, isDark, nowMs }: { test: Test; onStart: (t: Test) => Promise<void>; isDark: boolean; nowMs: number }) {
    const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
    const isMissing = test.status === 'missing';
    const isCompleted = test.status === 'completed' || isMissing;
    const timeAlert = getTimeAlert(test, nowMs);
    const urgent = !isCompleted && timeAlert !== null;
    const alertLabel = timeAlert === 'opening' ? 'SẮP MỞ' : timeAlert === 'deadline' ? 'SẮP HẾT' : null;
    const startMs = test.startTimeIso ? parseVnDate(test.startTimeIso).getTime() : NaN;
    const isLockedUntilOpen = test.category === 'exam' && !isCompleted && !Number.isNaN(startMs) && nowMs < startMs;
    const openTooltip = isLockedUntilOpen ? `Mở sau: ${formatOpenTime(test.startTimeIso)}` : undefined;
    const shouldSlowBlink = isDark && timeAlert === 'opening';
    const timeLabel = test.category === 'exam'
        ? (timeAlert === 'opening' ? 'Mở lúc' : 'Kết thúc')
        : 'Hạn';
    const timeValue = test.category === 'exam'
        ? (timeAlert === 'opening'
            ? formatOpenTime(test.startTimeIso)
            : (test.endTimeIso ? formatOpenTime(test.endTimeIso) : test.dueDate))
        : test.dueDate;

    return (
        <div className={`rounded-3xl overflow-hidden transition-all ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300 hover:-translate-y-0.5' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_#1A1A1A] hover:shadow-[6px_6px_0_0_#1A1A1A] hover:-translate-y-0.5'} ${urgent ? (isDark ? 'border border-[#ffc39d] shadow-[0_0_0_2px_rgba(255,120,73,0.12)]' : 'border-[#FFB48F] shadow-[0_0_0_2px_rgba(255,107,74,0.14)]') : ''} ${shouldSlowBlink ? 'animate-soft-blink' : ''}`}>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Subject icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative ${isDark ? 'border border-[#1A1A1A]/20' : 'border-2 border-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]'}`} style={{ backgroundColor: isDark ? `${bg}66` : bg }}>
                    {isCompleted
                        ? isMissing
                            ? <Archive className={`w-7 h-7 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} weight="fill" />
                            : <CheckCircle className={`w-7 h-7 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} weight="fill" />
                        : <ClipboardText className={`w-7 h-7 ${isDark ? 'text-amber-200' : 'text-[#1A1A1A]'}`} weight="fill" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 ${isDark ? 'border border-[#1A1A1A]/20 text-[#e5e7eb] bg-[#222226]' : 'border-2 border-[#1A1A1A] text-[#1A1A1A] bg-white shadow-[2px_2px_0_0_#1A1A1A]'}`}>
                            {test.category === 'homework' ? 'Bài tập' : 'Kiểm tra'}
                        </span>
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${isDark ? 'border border-[#1A1A1A]/20 text-[#f8fafc] bg-[#2a2a31]' : 'border-2 border-[#1A1A1A] text-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]'}`} style={{ backgroundColor: isDark ? undefined : bg }}>
                            {test.subject}
                        </span>
                        {timeAlert === 'opening' && (
                            <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full uppercase ${isDark ? 'bg-[#ff7849]/85 text-white border border-[#ff7849]/45' : 'bg-[#FF6B4A] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]'}`}>
                                Sắp mở
                            </span>
                        )}
                        {test.status === 'in_progress' && (
                            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full animate-pulse ${isDark ? 'bg-[#ff7849]/85 text-white border border-[#ff7849]/45' : 'bg-[#FF6B4A] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]'}`}>
                                Đang làm
                            </span>
                        )}
                        {isMissing && (
                            <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase ${isDark ? 'bg-[#3a3f46] text-[#ff8b63] border border-[#ff8b63]/40' : 'bg-[#3b3b3b] text-[#ffb1a0] border-2 border-[#1A1A1A]'}`}>
                                Bỏ lỡ
                            </span>
                        )}
                    </div>
                    <h3 className={`font-extrabold text-base truncate ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{test.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1.5 text-xs font-bold">
                        <span className={`flex items-center gap-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/70'}`}><Clock className="w-4 h-4" weight="fill" />{test.duration} phút</span>
                        <span className={`flex items-center gap-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/70'}`}><BookOpen className="w-4 h-4" weight="fill" />{test.questionCount} câu</span>

                        {isCompleted ? (
                            <span className={`flex items-center gap-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/70'}`}>
                                {isMissing ? <Archive className="w-4 h-4 text-rose-500" weight="fill" /> : <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />}
                                {isMissing ? 'Không nộp bài' : (typeof test.correctCount === 'number' ? `${test.correctCount}/${test.questionCount} câu đúng` : 'Đã nộp bài')}
                            </span>
                        ) : (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${urgent ? (isDark ? 'text-[#ff8b63] font-black' : 'text-[#FF6B4A] font-black') : (isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/70')}`}>
                                {urgent ? <Hourglass className="w-4 h-4 animate-spin-slow" weight="fill" /> : null}
                                {timeLabel}: {timeValue}
                                {alertLabel && timeAlert !== 'opening' && <span className={`ml-1 text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${isDark ? 'bg-[#d46b5f] text-white border border-[#f2a298]/40' : 'shadow-[2px_2px_0_0_#1A1A1A] bg-[#FF6B4A] text-white border-2 border-[#1A1A1A]'}`}>{alertLabel}</span>}
                            </span>
                        )}
                    </div>
                </div>

                {/* Score + action */}
                <div className="shrink-0 flex items-center gap-3">
                    {isCompleted && test.score != null && (
                        <div className="text-right">
                            <div className={`text-3xl font-extrabold ${isMissing ? 'text-rose-500' : (isDark ? 'text-white' : 'text-[#1A1A1A]')}'`}>{test.score.toFixed(1)}</div>
                            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{isMissing ? 'BỎ LỠ' : 'Điểm số'}</div>
                        </div>
                    )}
                    <button
                        onClick={() => onStart(test)}
                        disabled={isLockedUntilOpen}
                        title={openTooltip}
                        className={`h-10 px-5 rounded-2xl font-extrabold text-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${isCompleted
                            ? (isDark ? 'bg-white/5 text-gray-100 border border-[#1A1A1A]/20 hover:bg-white/10' : 'border-2 border-[#1A1A1A] bg-[#1A1A1A]/5 text-[#1A1A1A] hover:bg-[#1A1A1A]/10 shadow-[2px_2px_0_0_#1A1A1A]')
                            : (isDark ? 'bg-[#ff7849] text-white border border-[#ff7849]/40 hover:bg-[#ff8b63] shadow-[0_8px_18px_rgba(255,120,73,0.25)]' : 'border-2 border-[#1A1A1A] bg-[#FF6B4A] text-white hover:bg-[#ff5535] shadow-[3px_3px_0_0_#1A1A1A] hover:shadow-[1px_1px_0_0_#1A1A1A]')}`}
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
    result,
    scheduleDate,
    onBack,
    onPrimary,
    onDetailedReview,
    isDark,
}: {
    test: Test;
    result: AssignmentResultResponse | null;
    scheduleDate?: string;
    onBack: () => void;
    onPrimary: () => void;
    onDetailedReview: () => void;
    isDark: boolean;
}) {
    const isMissing = test.status === 'missing';
    const isCompleted = test.status === 'completed' || isMissing;
    const isInProgress = test.status === 'in_progress';
    const statusLabel = isMissing ? 'Bỏ lỡ' : isCompleted ? 'Đã hoàn thành' : isInProgress ? 'Đang làm dở' : 'Chưa làm';
    const lessonDate = test.lessonDate ?? scheduleDate;
    const isExam = test.category === 'exam';
    const canViewResult = result?.canViewResult ?? (test.score != null);
    const canViewDetailedAnswers = result?.canViewDetailedAnswers ?? true;
    const dueTime = test.category === 'exam' ? test.endTimeIso : test.deadlineIso;
    const testNotStarted = Boolean(
        isExam &&
        test.startTimeIso &&
        !isCompleted &&
        !isInProgress &&
        Date.now() < parseVnDate(test.startTimeIso).getTime()
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <button onClick={onBack} className={`flex items-center gap-2 font-extrabold text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-[#1A1A1A]' : 'text-gray-400 hover:text-[#1A1A1A]'}`}>
                {'<-'} Quay lại danh sách
            </button>

            <div className={`rounded-3xl p-6 md:p-8 space-y-6 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[8px_8px_0_0_rgba(26,26,26,1)]'}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]">
                        {test.category === 'homework' ? 'Bài tập' : 'Kiểm tra'}
                    </span>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${isDark ? 'border border-[#1A1A1A]/20 bg-[#2a2a31] text-[#f8fafc]' : 'border-2 border-[#1A1A1A] text-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A]'}`} style={{ backgroundColor: isDark ? undefined : SUBJECT_BG[test.subject] }}>
                        {test.subject}
                    </span>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0_0_#1A1A1A] ${isMissing ? 'bg-rose-100 text-rose-700' : isCompleted ? 'bg-emerald-100 text-emerald-700' : isInProgress ? 'bg-[#FF6B4A] text-white animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel}
                    </span>
                </div>

                <div>
                    <h1 className={`text-2xl md:text-3xl font-black leading-tight ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{test.title}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Thời gian làm bài</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.duration} phút</p>
                    </div>
                    <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Số câu hỏi</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.questionCount} câu</p>
                    </div>
                    {isExam ? (
                        <>
                            <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Thời gian bắt đầu</p>
                                <p className="text-lg font-extrabold text-[#1A1A1A]">{formatDateTime(test.startTimeIso)}</p>
                            </div>
                            <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Thời gian kết thúc</p>
                                <p className="text-lg font-extrabold text-[#1A1A1A]">{formatDateTime(test.endTimeIso)}</p>
                            </div>
                        </>
                    ) : (
                        <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Hạn nộp</p>
                            <p className="text-lg font-extrabold text-[#1A1A1A]">{test.dueDate}</p>
                        </div>
                    )}
                    <div className={`rounded-2xl p-4 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Lớp/Tiết học</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{test.className ?? '---'} {test.lessonLabel ? `- ${test.lessonLabel}` : ''}</p>
                    </div>
                    <div className={`rounded-2xl p-4 md:col-span-2 ${isDark ? 'border border-[#1A1A1A]/20 bg-white/[0.02]' : 'border-2 border-[#1A1A1A]/10 bg-[#F7F7F2]'}`}>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#1A1A1A]/50 mb-1">Bài của ngày</p>
                        <p className="text-lg font-extrabold text-[#1A1A1A]">{lessonDate ?? 'Chưa xác định ngày cụ thể'}</p>
                    </div>
                </div>

                {isCompleted && (
                    <div className={`rounded-2xl border-2 p-4 flex items-center justify-between gap-3 ${isMissing ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                        <div>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isMissing ? 'text-amber-700/80' : 'text-emerald-700/70'}`}>Kết quả</p>
                            {!isMissing && !canViewResult ? (
                                <>
                                    <p className="text-lg font-extrabold text-amber-800">
                                        Kết quả và đáp án chưa đến thời điểm công bố
                                    </p>
                                    <p className="text-sm font-bold mt-1 text-amber-700/90">
                                        {result?.visibilityMessage ?? `Kết quả và đáp án sẽ được hiển thị sau ${formatDateTime(result?.revealAt ?? dueTime)}.`}
                                    </p>
                                </>
                            ) : !isMissing && canViewResult && !canViewDetailedAnswers ? (
                                <>
                                    <p className="text-lg font-extrabold text-emerald-700">
                                        Điểm hiện tại: {test.score?.toFixed(1) ?? (result?.score?.toFixed(1) ?? '0.0')} điểm
                                    </p>
                                    <p className="text-sm font-bold mt-1 text-emerald-700/80">
                                        {result?.visibilityMessage ?? `Đáp án chi tiết sẽ được hiển thị sau ${formatDateTime(result?.revealAt ?? dueTime)}.`}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className={`text-lg font-extrabold ${isMissing ? 'text-amber-800' : 'text-emerald-700'}`}>
                                        {isMissing ? '0 điểm - KHÔNG NỘP BÀI' : `${test.correctCount ?? result?.correctCount ?? 0}/${test.questionCount} câu đúng - ${test.score?.toFixed(1) ?? (result?.score?.toFixed(1) ?? '0.0')} điểm`}
                                    </p>
                                    <p className={`text-sm font-bold mt-1 ${isMissing ? 'text-amber-700/90' : 'text-emerald-700/80'}`}>
                                        {isMissing ? 'Bạn đã quá hạn nộp bài. Hãy xem đáp án chi tiết để ôn tập.' : 'Bạn đã làm bài này rồi, không thể bắt đầu làm lại.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
                    <button onClick={onBack} className={`h-11 px-6 rounded-2xl font-extrabold transition-colors ${isDark ? 'border-2 border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5' : 'border-2 border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                        Quay lại
                    </button>
                    {isCompleted ? (
                        <>
                            <button
                                onClick={onDetailedReview}
                                disabled={!canViewDetailedAnswers}
                                title={!canViewDetailedAnswers ? (result?.visibilityMessage ?? `Đáp án chi tiết sẽ được hiển thị sau ${formatDateTime(result?.revealAt ?? dueTime)}.`) : undefined}
                                className={`h-11 px-6 rounded-2xl font-extrabold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A]/5' : 'border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}
                            >
                                Xem đáp án chi tiết
                            </button>
                            <button onClick={onPrimary} className="h-11 px-6 rounded-2xl bg-[#FF6B4A] text-white font-extrabold hover:bg-[#ff5535] transition-colors">
                                Xem kết quả
                            </button>
                        </>
                    ) : (
                        <button onClick={onPrimary} disabled={testNotStarted}
                            className="h-11 px-6 rounded-2xl bg-[#FF6B4A] text-white font-extrabold hover:bg-[#ff5535] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                            {isInProgress ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
                        </button>
                    )}
                </div>
                {testNotStarted && (
                    <p className="text-sm font-bold text-amber-600">
                        Bài kiểm tra chưa đến thời gian bắt đầu, vui lòng quay lại sau.
                    </p>
                )}
            </div>
        </div>
    );
}

function DetailedReviewView({ test, result, detail, onBack, isDark }: {
    test: Test;
    result: AssignmentResultResponse | null;
    detail: AssignmentDetailResponse | null;
    onBack: () => void;
    isDark: boolean;
}) {
    const isMissedResult = result?.submissionStatus === 'MISSED' || test.status === 'missing';
    const canViewResult = result?.canViewResult ?? true;
    const canViewDetailedAnswers = result?.canViewDetailedAnswers ?? true;
    const detailQuestionMap = useMemo(() => {
        const map = new Map<number, AssignmentDetailResponse['questions'][number]>();
        (detail?.questions ?? []).forEach(question => map.set(question.id, question));
        return map;
    }, [detail]);

    const questions = result && canViewDetailedAnswers
        ? result.questions.map((q, idx) => {
            const detailQuestion = detailQuestionMap.get(q.questionId);
            const fullChoices = (detailQuestion?.answers ?? []).map((ans, answerIdx) => ({
                label: ans.label?.trim() || String.fromCharCode(65 + (answerIdx % 26)),
                text: ans.content,
                isSelected: q.selectedAnswerRefId === ans.id,
                isCorrect: q.correctAnswerRefId === ans.id || ans.isCorrect,
            }));

            const fallbackChoices = [q.selectedAnswer, q.correctAnswer]
                .filter((text, i, arr): text is string => Boolean(text) && arr.findIndex(v => v === text) === i)
                .map((text, choiceIdx) => ({
                    label: String.fromCharCode(65 + (choiceIdx % 26)),
                    text,
                    isSelected: choiceIdx === 0 && q.selectedAnswer != null,
                    isCorrect: text === q.correctAnswer,
                }));

            const status: 'correct' | 'wrong' | 'skipped' = q.selectedAnswerRefId == null
                ? 'skipped'
                : (q.isCorrect ? 'correct' : 'wrong');

            return {
                id: idx + 1,
                question: q.questionText,
                choices: fullChoices.length > 0 ? fullChoices : fallbackChoices,
                explanation: status === 'skipped'
                    ? 'Bạn chưa chọn đáp án.'
                    : (status === 'correct' ? 'Bạn đã chọn đáp án đúng.' : 'Bạn đã chọn đáp án chưa chính xác.'),
                status,
            };
        })
        : (reviewQuestionsByTest[test.id] ?? []).map((q) => ({
            id: q.id,
            question: q.question,
            choices: q.options.map((opt, idx) => ({
                label: String.fromCharCode(65 + (idx % 26)),
                text: opt,
                isSelected: q.selected === idx,
                isCorrect: q.correct === idx,
            })),
            explanation: q.explanation,
            status: q.selected == null ? 'skipped' : (q.selected === q.correct ? 'correct' : 'wrong') as 'correct' | 'wrong' | 'skipped',
        }));

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <button onClick={onBack} className={`flex items-center gap-2 font-extrabold text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-[#1A1A1A]' : 'text-gray-400 hover:text-[#1A1A1A]'}`}>
                {'<-'} Quay lại kết quả
            </button>

            <div className={`rounded-3xl p-6 md:p-8 space-y-6 ${isMissedResult ? (isDark ? 'bg-[#22252b] border-2 border-[#8d929b]/40 shadow-[4px_4px_0_0_#8d929b]/50' : 'bg-[#f1f3f5] border-2 border-[#9CA3AF] shadow-[4px_4px_0_0_#9CA3AF]') : (isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]')}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[#1A1A1A]/10 pb-5">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">{isMissedResult ? 'Kết quả bài bỏ lỡ' : 'Xem lại đáp án chi tiết'}</p>
                        <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">{isMissedResult ? 'Kết quả: 0 điểm (Không nộp bài)' : test.title}</h1>
                    </div>
                    <div className="text-sm font-extrabold text-[#1A1A1A]/70 bg-[#F7F7F2] rounded-xl border-2 border-[#1A1A1A]/10 px-4 py-2">
                        {!canViewResult
                            ? `Chưa công bố (${result?.totalQuestions ?? test.questionCount} câu)`
                            : (isMissedResult
                                ? `0/${result?.totalQuestions ?? test.questionCount} câu đúng`
                                : `${result?.correctCount ?? test.correctCount ?? 0}/${result?.totalQuestions ?? test.questionCount} câu đúng`)}
                    </div>
                </div>

                {isMissedResult && (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                        Bạn đã quá hạn nộp bài. Dưới đây là đáp án tham khảo để ôn tập.
                    </div>
                )}

                {!canViewResult ? (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm font-bold text-amber-800">
                        {result?.visibilityMessage ?? `Kết quả và đáp án sẽ được hiển thị sau ${formatDateTime(result?.revealAt)}.`}
                    </div>
                ) : !canViewDetailedAnswers ? (
                    <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 px-4 py-4 text-sm font-bold text-blue-800">
                        {result?.visibilityMessage ?? `Đáp án chi tiết sẽ được hiển thị sau ${formatDateTime(result?.revealAt)}.`}
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-14 border-2 border-dashed border-[#1A1A1A]/20 rounded-2xl bg-[#F7F7F2]">
                        <p className="font-extrabold text-[#1A1A1A]/60">Chưa có dữ liệu xem lại chi tiết cho bài này.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q) => {
                            const isCorrect = q.status === 'correct';
                            const isSkipped = q.status === 'skipped';
                            const questionBadgeClass = isSkipped
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : (isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-rose-100 text-rose-700 border-rose-300');

                            return (
                                <div key={q.id} className={`rounded-2xl border-2 p-4 md:p-5 ${isSkipped ? 'border-amber-300 bg-amber-50/70' : 'border-[#1A1A1A]/10 bg-[#FDFDFD]'}`}>
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${questionBadgeClass}`}>Câu {q.id}</span>
                                        {isSkipped ? (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">Bỏ trống</span>
                                        ) : isCorrect ? (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">Đúng</span>
                                        ) : (
                                            <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300">Sai</span>
                                        )}
                                    </div>

                                    <p className="font-extrabold text-[#1A1A1A] mb-4">
                                        <MathRenderer content={q.question} />
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {q.choices.map((choice) => {
                                            const selected = choice.isSelected;
                                            const correct = choice.isCorrect;
                                            const className = correct
                                                ? 'border-emerald-400 bg-emerald-50'
                                                : selected
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-[#1A1A1A]/10 bg-white';

                                            return (
                                                <div key={`${q.id}-${choice.label}`} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold text-[#1A1A1A] ${className}`}>
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-black">{choice.label}.</span>
                                                        <span><MathRenderer content={choice.text} /></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {isMissedResult && (
                                        <div className="mt-3 rounded-xl border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm font-bold text-gray-700">
                                            Bạn chưa chọn đáp án
                                        </div>
                                    )}

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

function TestTakingView({ test, result, onBack, onOpenDetailedReview, isDark }: { test: Test; result: AssignmentResultResponse | null; onBack: () => void; onOpenDetailedReview: () => void; isDark: boolean }) {
    if (test.status === 'completed' || test.status === 'missing') {
        const bg = SUBJECT_BG[test.subject] ?? '#FCE38A';
        const isMissing = test.status === 'missing';
        const canViewDetailedAnswers = result?.canViewDetailedAnswers ?? true;
        const detailBlockedMessage = result?.visibilityMessage ?? `Đáp án chi tiết sẽ được hiển thị sau ${formatDateTime(result?.revealAt)}.`;
        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] font-extrabold text-sm transition-colors">
                    ← Quay lại danh sách
                </button>
                <div className={`rounded-3xl p-8 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[8px_8px_0_0_rgba(26,26,26,1)]'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-8 border-b-2 border-[#1A1A1A]/10 pb-8 mb-8">
                        <div className="w-36 h-36 rounded-full border-4 border-[#1A1A1A] flex items-center justify-center shrink-0 relative" style={{ backgroundColor: bg }}>
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-[#1A1A1A]">{(test.score ?? 0).toFixed(1)}</div>
                                <div className="text-[10px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest mt-1">Điểm</div>
                            </div>
                            {!isMissing && (test.score ?? 0) >= 8 && (
                                <div className="absolute -bottom-2 -right-2 bg-[#FF6B4A] text-white p-2 rounded-full border-2 border-[#1A1A1A]">
                                    <Medal className="w-6 h-6" weight="fill" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-3xl font-black text-[#1A1A1A]">{isMissing ? 'Đã bỏ lỡ' : (test.score ?? 0) >= 8 ? 'Xuất sắc!' : 'Đã hoàn thành!'}</h2>
                                <p className="text-[#1A1A1A]/60 font-bold mt-1 text-lg">{test.title}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm font-extrabold">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 ${isMissing ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    {isMissing ? <Archive className="w-5 h-5" weight="fill" /> : <CheckCircle className="w-5 h-5" weight="fill" />} {isMissing ? 'KHÔNG NỘP' : `${test.correctCount}/${test.questionCount} câu đúng`}
                                </div>
                                <div className="flex items-center gap-2 bg-[#FF6B4A]/10 text-[#FF6B4A] px-4 py-2 rounded-2xl border-2 border-[#FF6B4A]/20">
                                    <Star className="w-5 h-5" weight="fill" /> {(test.score ?? 0).toFixed(1)} điểm
                                </div>
                                {!isMissing && (test.score ?? 0) >= 8 && (
                                    <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl border-2 border-amber-200 animate-bounce">
                                        <Medal className="w-5 h-5" weight="fill" /> +50 XP SlothubEdu
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
                        <button
                            onClick={onOpenDetailedReview}
                            disabled={!canViewDetailedAnswers}
                            title={!canViewDetailedAnswers ? detailBlockedMessage : undefined}
                            className="h-12 px-8 bg-[#1A1A1A] text-white font-extrabold rounded-2xl hover:bg-[#1A1A1A]/80 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <MagnifyingGlass className="w-5 h-5" /> Xem lại đáp án chi tiết
                        </button>
                    </div>
                </div>
            </div>
        );
    }

}

// ─── Real API Test Taking View ────────────────────────────────────────────────
function RealTestTakingView({ detail, attempt, answerSelections, onSelectAnswer, onBack, onSubmit, isSubmitting, isDark, initialCurrentQ, onCurrentQChange, onViolationsChange }: {
    detail: AssignmentDetailResponse;
    attempt: AssignmentAttemptResponse | null;
    answerSelections: Record<number, number>;
    onSelectAnswer: (questionId: number, answerId: number) => void;
    onBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    isDark: boolean;
    /** Restored from draft — which question the student was on. */
    initialCurrentQ?: number;
    /** Notifies parent whenever the active question index changes (used for draft saving). */
    onCurrentQChange?: (q: number) => void;
    /** Notifies parent of current violation count so it can be sent on submit. */
    onViolationsChange?: (count: number) => void;
}) {
    const [currentQ, setCurrentQ] = useState(initialCurrentQ ?? 0);
    const [timeLeft, setTimeLeft] = useState(detail.durationMinutes * 60);
    const autoSubmittedRef = useRef(false);
    const isCriticalTime = timeLeft <= 5 * 60;

    // ─── Anti-cheat mode (only for TEST-type assignments) ──────────────────
    const isExam = detail.assignmentType === 'TEST';
    const MAX_VIOLATIONS = 3;
    const [violations, setViolations] = useState(0);
    const [showAntiCheatWarning, setShowAntiCheatWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const violationLockRef = useRef(false);
    const initTimeRef = useRef(Date.now());

    const recordViolation = useCallback((message: string) => {
        // Bỏ qua các cảnh báo do trình duyệt tự động trigger (như popup hướng dẫn nhấn ESC) trong 3 giây đầu
        if (Date.now() - initTimeRef.current < 3000) return;
        if (violationLockRef.current || autoSubmittedRef.current) return;
        violationLockRef.current = true;
        setViolations(v => {
            const newV = v + 1;
            console.warn(`[Anti-cheat] Vi phạm #${newV}: ${message}`);
            onViolationsChange?.(newV);
            return newV;
        });
        setWarningMessage(message);
        setShowAntiCheatWarning(true);
        // Debounce lock: prevent duplicate events (blur + visibilitychange fire together)
        setTimeout(() => { violationLockRef.current = false; }, 1500);
    }, [onViolationsChange]);

    // Keep a stable ref to recordViolation to use in event listeners without re-running effects
    const recordViolationRef = useRef(recordViolation);
    useEffect(() => {
        recordViolationRef.current = recordViolation;
    }, [recordViolation]);

    // ── Fullscreen management (exams only) ─────────────────────────────────
    useEffect(() => {
        if (!isExam) return;
        const enterFullscreen = async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } catch { /* user may deny – we still record the teaching environment */ }
        };
        // Small delay to ensure component is mounted before requesting fullscreen
        const timer = setTimeout(enterFullscreen, 300);

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                recordViolationRef.current('Bạn đang rời khỏi chế độ làm bài kiểm tra. Hệ thống đã ghi nhận thao tác này.');
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isExam]); // Removes recordViolation from dependency to prevent re-attaching listeners

    // Exit fullscreen strictly on unmount
    useEffect(() => {
        return () => {
            if (isExam && document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        };
    }, [isExam]);

    // ── Tab switch / window blur detection (exams only) ───────────────────
    useEffect(() => {
        if (!isExam) return;
        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordViolation('Bạn đã chuyển tab. Hệ thống đã ghi nhận vi phạm này.');
            }
        };
        const handleBlur = () => {
            setTimeout(() => {
                // Ensure focus is actually lost, preventing brief false positives from browser context menus or notifications
                if (!document.hasFocus()) {
                    recordViolation('Bạn đã rời khỏi cửa sổ làm bài. Hệ thống đã ghi nhận vi phạm này.');
                }
            }, 200);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [isExam, recordViolation]);

    // ── Auto-submit when violations exceed threshold ──────────────────────
    useEffect(() => {
        if (isExam && violations >= MAX_VIOLATIONS && !isSubmitting && !autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            // Small delay to let the warning display first
            setTimeout(() => {
                onSubmit();
            }, 2000);
        }
    }, [violations, isExam, isSubmitting, onSubmit]);

    useEffect(() => {
        const recalcLeftSeconds = () => {
            if (attempt?.expiredAt) {
                const diff = Math.floor((parseVnDate(attempt.expiredAt).getTime() - Date.now()) / 1000);
                return Math.max(0, diff);
            }
            return detail.durationMinutes * 60;
        };

        setTimeLeft(recalcLeftSeconds());
        const t = setInterval(() => setTimeLeft(recalcLeftSeconds()), 1000);
        return () => clearInterval(t);
    }, [attempt?.expiredAt, detail.durationMinutes]);

    useEffect(() => {
        setCurrentQ(initialCurrentQ ?? 0);
        autoSubmittedRef.current = false;
    }, [detail.assignmentID, initialCurrentQ]);

    // Notify parent of question navigation so the draft can include currentQuestion
    useEffect(() => {
        onCurrentQChange?.(currentQ);
    }, [currentQ, onCurrentQChange]);

    useEffect(() => {
        if (timeLeft === 0 && !isSubmitting && !autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            onSubmit();
        }
    }, [timeLeft, isSubmitting, onSubmit]);

    const questions = detail.questions;
    const total = questions.length;
    const answered = questions.filter(q => answerSelections[q.id] != null).length;
    const question = questions[currentQ];
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    const handleConfirmSubmit = () => {
        if (timeLeft <= 0 || isSubmitting) {
            return;
        }
        const unanswered = total - answered;
        if (unanswered > 0 && !confirm(`Bạn còn ${unanswered} câu chưa trả lời. Xác nhận nộp bài?`)) return;
        onSubmit();
    };

    if (!question) return null;

    return (
        <div className="max-w-6xl mx-auto pb-20 flex flex-col lg:flex-row gap-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="flex-1 space-y-5">
                {/* Hide exit button for exams (anti-cheat), show for assignments */}
                {!isExam && (
                    <button onClick={onBack} className={`flex items-center gap-2 font-extrabold text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-[#1A1A1A]' : 'text-gray-400 hover:text-[#1A1A1A]'}`}>
                        ← Thoát làm bài
                    </button>
                )}
                {isExam && (
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                        <ShieldWarning className="w-4 h-4" weight="fill" />
                        <span>Chế độ kiểm tra — Không thể thoát • Vi phạm: {violations}/{MAX_VIOLATIONS}</span>
                    </div>
                )}

                {/* Header */}
                <div className={`rounded-3xl p-6 flex flex-col md:flex-row justify-between gap-5 transition-colors ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'} ${isCriticalTime ? (isDark ? 'border-red-400/60 bg-red-500/10' : 'border-red-500 bg-red-50') : ''}`}>
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-full uppercase">ĐANG DIỄN RA</span>
                            <h1 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{detail.title}</h1>
                        </div>
                        <div>
                            <div className={`flex justify-between text-sm font-extrabold mb-1 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                <span>Tiến độ làm bài</span>
                                <span className={isCriticalTime ? 'text-red-500' : 'text-[#FF6B4A]'}>
                                    {answered}/{total} câu
                                </span>
                            </div>
                            <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/20 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isCriticalTime ? 'bg-red-500' : 'bg-[#FF6B4A]'}`}
                                    style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Timer */}
                    <div className={`flex items-center gap-3 rounded-2xl p-4 shrink-0 transition-all ${isCriticalTime ? 'bg-red-500 shadow-[0_4px_0_0_#991b1b] animate-pulse' : 'bg-[#1A1A1A] shadow-[0_4px_0_0_#000]'}`}>
                        <div className="text-center"><div className="text-3xl font-extrabold text-white">{mins.toString().padStart(2, '0')}</div><div className="text-[9px] text-white/70 font-extrabold uppercase tracking-wider">PHÚT</div></div>
                        <div className="text-white/50 text-2xl font-bold pb-2">:</div>
                        <div className="text-center">
                            <div className={`text-3xl font-extrabold ${isCriticalTime ? 'text-white' : 'text-[#FF6B4A]'}`}>{secs.toString().padStart(2, '0')}</div>
                            <div className="text-[9px] text-white/70 font-extrabold uppercase tracking-wider">GIÂY</div>
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className={`rounded-3xl overflow-hidden ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                    <div className={`p-6 relative ${isDark ? 'border-b border-[#1A1A1A]/20' : 'border-b-2 border-[#1A1A1A]/10'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs font-extrabold text-[#FF6B4A] tracking-widest uppercase mb-3">
                                    Câu hỏi {currentQ + 1}
                                </div>
                                <h2 className={`text-xl font-extrabold leading-relaxed ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                    <MathRenderer content={question.questionText} />
                                </h2>
                            </div>
                            {question.difficultyLabel && (
                                <span className={`text-xs font-semibold ${isDark ? 'text-[#1A1A1A]/60' : 'text-[#1A1A1A]/45'}`}>{question.difficultyLabel}</span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {question.answers.length > 0 ? question.answers.map((ans) => {
                            const isSelected = answerSelections[question.id] === ans.id;
                            const answerLabel = ans.label?.trim() || String.fromCharCode(65 + (question.answers.findIndex(a => a.id === ans.id) % 26));
                            return (
                                <button
                                    key={ans.id}
                                    onClick={() => onSelectAnswer(question.id, ans.id)}
                                    className={`w-full relative p-4 rounded-2xl text-left border-2 transition-all hover:translate-x-1 ${isSelected ? (isDark ? 'border-[#ff8b63] bg-[#ff7849]/10' : 'border-[#FF6B4A] bg-[#FF6B4A]/5') : (isDark ? 'border-[#1A1A1A]/20 bg-white/[0.02] hover:border-white/35' : 'border-[#1A1A1A]/20 bg-white hover:border-[#1A1A1A]/40')}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-[#FF6B4A] border-[#FF6B4A]' : (isDark ? 'border-white/45 bg-[#1a1a1f]' : 'border-[#1A1A1A]/30 bg-white')}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                        </div>
                                        <div>
                                            <div className={`font-extrabold text-sm mb-1 transition-colors ${isSelected ? 'text-[#FF6B4A]' : (isDark ? 'text-gray-500' : 'text-[#1A1A1A]/55')}`}>Đáp án {answerLabel}</div>
                                            <p className={`font-semibold text-[15px] ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`}>
                                                <MathRenderer content={ans.content} />
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        }) : (
                            <div className={`pt-2 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                <label className="text-sm font-extrabold">Câu trả lời bổ sung (Tự luận ngắn):</label>
                                <textarea
                                    className={`mt-2 w-full h-32 rounded-2xl p-4 font-semibold focus:outline-none focus:border-[#FF6B4A] resize-none transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}
                                    placeholder="Nhập suy nghĩ của bạn..."
                                />
                            </div>
                        )}
                    </div>

                    <div className={`p-5 flex items-center justify-between ${isDark ? 'bg-[#1a1a1f] border-t border-[#1A1A1A]/20' : 'bg-gray-50 border-t-2 border-[#1A1A1A]/10'}`}>
                        <button
                            onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                            disabled={currentQ === 0}
                            className={`flex items-center gap-2 font-extrabold transition-colors px-4 py-2 rounded-xl disabled:opacity-40 ${isDark ? 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] bg-white border-2 border-[#1A1A1A]/10' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] bg-white border-2 border-[#1A1A1A]/10'}`}
                        >
                            ← Câu trước
                        </button>
                        <div className="flex gap-3">
                            {currentQ < total - 1 ? (
                                <button
                                    onClick={() => setCurrentQ(p => Math.min(total - 1, p + 1))}
                                    className="px-8 h-11 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl text-sm transition-all shadow-[0_4px_0_0_#A83F2A] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#A83F2A] flex items-center gap-2"
                                >
                                    Câu tiếp <CaretRight weight="bold" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmSubmit}
                                    disabled={isSubmitting}
                                    className="px-8 h-11 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-2xl text-sm transition-all shadow-[0_4px_0_0_#166534] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#166534] disabled:opacity-60 flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" weight="fill" />
                                    {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={handleConfirmSubmit}
                        disabled={isSubmitting}
                        className="text-sm font-extrabold text-green-600 hover:text-green-700 disabled:opacity-60"
                    >
                        Nộp bài sớm
                    </button>
                </div>
            </div>

            {/* Navigation Panel */}
            <div className="w-full lg:w-80 shrink-0">
                <div className={`rounded-3xl p-6 sticky top-6 ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                    <h3 className={`font-extrabold text-lg mb-4 flex items-center gap-2 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                        <ListNumbers className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                        Danh sách câu hỏi
                    </h3>

                    <div className="grid grid-cols-5 gap-2.5">
                        {questions.map((q, i) => {
                            const isAnswered = answerSelections[q.id] != null;
                            let btnClass = isDark
                                ? 'border-[#1A1A1A]/20 bg-[#17171d] text-gray-500 hover:border-white/40'
                                : 'border-[#1A1A1A]/20 bg-gray-50 text-gray-500 hover:border-[#1A1A1A]/50';

                            if (isAnswered) {
                                btnClass = 'bg-emerald-100 border-emerald-300 text-emerald-700 font-black';
                            }
                            if (i === currentQ) {
                                btnClass += ' ring-4 ring-[#FF6B4A]/30 border-[#FF6B4A] !bg-[#FF6B4A] !text-white';
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQ(i)}
                                    className={`w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center font-extrabold text-sm transition-all hover:scale-105 ${btnClass}`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className={`mt-6 pt-5 space-y-3 ${isDark ? 'border-t border-[#1A1A1A]/20' : 'border-t-2 border-[#1A1A1A]/10'}`}>
                        <div className={`flex items-center gap-3 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>
                            <span className={`w-4 h-4 rounded-md border-2 flex-shrink-0 ${isDark ? 'border-emerald-300/60 bg-emerald-400/20' : 'border-emerald-300 bg-emerald-100'}`} />
                            Câu đã làm
                        </div>
                        <div className={`flex items-center gap-3 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>
                            <span className={`w-4 h-4 rounded-md border-2 flex-shrink-0 ${isDark ? 'border-white/25 bg-[#17171d]' : 'border-[#1A1A1A]/20 bg-gray-50'}`} />
                            Câu chưa làm
                        </div>
                        <div className={`flex items-center gap-3 text-sm font-bold ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>
                            <span className={`w-4 h-4 rounded-md border-2 flex-shrink-0 ${isDark ? 'border-amber-300/60 bg-amber-300/25' : 'border-amber-400 bg-amber-200'}`} />
                            Đang phân vân
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Anti-cheat warning overlay ──────────────────────────────── */}
            {isExam && showAntiCheatWarning && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <div className="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl border-2 border-red-200 animate-warning-pulse">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <ShieldWarning className="w-10 h-10 text-red-500" weight="fill" />
                            </div>
                            <h3 className="text-xl font-black text-[#1A1A1A] text-center">⚠️ Cảnh báo vi phạm</h3>
                            <p className="text-sm font-semibold text-[#1A1A1A]/70 text-center leading-relaxed">{warningMessage}</p>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 border border-red-200">
                                <span className="text-sm font-extrabold text-red-600">
                                    Vi phạm: {violations}/{MAX_VIOLATIONS}
                                </span>
                            </div>
                            {violations < MAX_VIOLATIONS && (
                                <p className="text-xs font-semibold text-[#1A1A1A]/50 text-center">
                                    Còn {MAX_VIOLATIONS - violations} lần vi phạm trước khi bài thi bị nộp tự động.
                                </p>
                            )}
                            {violations >= MAX_VIOLATIONS ? (
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-bold text-red-600">
                                        Bạn đã vi phạm quá số lần cho phép.
                                    </p>
                                    <p className="text-sm font-extrabold text-red-700 animate-pulse">
                                        Bài làm đang được nộp tự động...
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        setShowAntiCheatWarning(false);
                                        try {
                                            if (!document.fullscreenElement) {
                                                await document.documentElement.requestFullscreen();
                                            }
                                        } catch { /* user may deny */ }
                                    }}
                                    className="w-full px-6 py-3 bg-[#FF6B4A] text-white font-extrabold rounded-2xl hover:bg-[#ff5535] transition-colors shadow-md"
                                >
                                    Quay lại làm bài
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Map API assignment to Test interface
function apiAssignmentToTest(a: AssignmentResponse, isSubmitted: boolean, submission?: SubmissionResponse): Test {
    const dueDateSource = a.assignmentType === 'TEST' ? a.endTime : a.deadline;
    const dueDate = dueDateSource ? new Date(dueDateSource) : null;
    const dueDateStr = dueDate
        ? `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`
        : '';
    const status: TestStatus = isSubmitted
        ? (submission?.submissionStatus === 'MISSING' ? 'missing' : 'completed')
        : 'pending';
    const correctCount = submission ? submission.answers.filter(ans => ans.isCorrect).length : undefined;
    return {
        id: a.assignmentID,
        title: a.title,
        subject: a.subjectName ?? a.className ?? 'Đề kiểm tra',
        duration: a.durationMinutes,
        questionCount: a.totalQuestions,
        dueDate: dueDateStr,
        status,
        category: a.assignmentType === 'ASSIGNMENT' ? 'homework' : 'exam',
        score: submission?.score ?? a.score ?? undefined,
        submittedAt: submission?.submitTime
            ? (() => { const d = new Date(submission.submitTime); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()
            : undefined,
        correctCount,
        className: a.className,
        startTimeIso: a.startTime,
        endTimeIso: a.endTime,
        deadlineIso: a.deadline,
        _assignmentId: a.assignmentID,
    } as Test & { _assignmentId: number };
}

function hasValidAssignmentId(assignmentId: number | null | undefined): assignmentId is number {
    return Number.isInteger(assignmentId) && Number(assignmentId) > 0;
}

function isCompletedSubmission(submission: SubmissionResponse): boolean {
    const hasSubmitTime = Boolean(submission.submittedAt || submission.submitTime);
    const isFinishedStatus = submission.submissionStatus !== 'IN_PROGRESS' && submission.submissionStatus !== 'MISSING';
    return hasValidAssignmentId(submission.assignmentId) && hasSubmitTime && isFinishedStatus;
}

export function StudentTests() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const location = useLocation();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<ActiveTab>('available');
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);
    const [exerciseViewMode, setExerciseViewMode] = useState<ExerciseViewMode>('detail');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

    // API data state
    const [apiActiveAssignments, setApiActiveAssignments] = useState<Test[]>([]);
    const [apiCompletedTests, setApiCompletedTests] = useState<Test[]>([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

    // Real test-taking state
    const [takingDetail, setTakingDetail] = useState<AssignmentDetailResponse | null>(null);
    const [attemptInfo, setAttemptInfo] = useState<AssignmentAttemptResponse | null>(null);
    const [answerSelections, setAnswerSelections] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [resultDetail, setResultDetail] = useState<AssignmentResultResponse | null>(null);
    const [nowMs, setNowMs] = useState<number>(Date.now());
    // Tracks violation count reported by RealTestTakingView for the current exam session
    const examViolationsRef = useRef(0);

    useEffect(() => {
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // ── Draft persistence ─────────────────────────────────────────────────────
    // Scoped to the active assignment so drafts from different tests never mix.
    const activeAssignmentId = (selectedTest as unknown as { _assignmentId?: number })?._assignmentId;
    const { saveDraft, loadDraft, clearDraft, syncToServer, deleteDraftFromServer } = useQuizDraft(activeAssignmentId);

    // Tracks which question the student is currently on inside RealTestTakingView.
    // Updated via the onCurrentQChange callback so draft includes the right index.
    const currentQRef = useRef(0);

    // Tracks the initial question index restored from draft (passed to RealTestTakingView).
    const [draftRestoredCurrentQ, setDraftRestoredCurrentQ] = useState(0);

    // Keeps a stable ref to answerSelections so the server-sync interval can
    // read the latest value without triggering interval recreation on every answer.
    const answerSelectionsRef = useRef(answerSelections);
    useEffect(() => { answerSelectionsRef.current = answerSelections; }, [answerSelections]);

    // ── Quiz session guard + exam-mode sidebar lock ──────────────────────────
    useEffect(() => {
        const isTaking = exerciseViewMode === 'taking' && attemptInfo !== null;
        const isExamActive = isTaking && takingDetail?.assignmentType === 'TEST';
        if (isTaking) {
            quizSessionGuard.enter();
        } else {
            quizSessionGuard.leave();
        }
        // Notify StudentLayout to hide sidebar during exams
        window.dispatchEvent(new CustomEvent('educare:exam-mode', { detail: { active: isExamActive } }));
        return () => {
            quizSessionGuard.leave();
            window.dispatchEvent(new CustomEvent('educare:exam-mode', { detail: { active: false } }));
        };
    }, [exerciseViewMode, attemptInfo, takingDetail]);

    // ── Auto-save draft to localStorage on every answer change ────────────────
    useEffect(() => {
        if (exerciseViewMode !== 'taking' || !attemptInfo) return;
        saveDraft(answerSelections, currentQRef.current);
    }, [answerSelections, exerciseViewMode, attemptInfo, saveDraft]);

    // ── Periodic server sync (every 30 s) — DB-level backup ──────────────────
    useEffect(() => {
        if (exerciseViewMode !== 'taking' || !attemptInfo) return;

        const interval = setInterval(() => {
            const token = authService.getToken();
            if (token) {
                void syncToServer(answerSelectionsRef.current, currentQRef.current, token);
            }
        }, 30_000);

        return () => clearInterval(interval);
    }, [exerciseViewMode, attemptInfo, syncToServer]);

    const loadApiData = useCallback(async () => {
        const token = authService.getToken();
        setIsLoadingAssignments(true);
        if (!token) {
            setApiActiveAssignments([]);
            setApiCompletedTests([]);
            setIsLoadingAssignments(false);
            return;
        }
        const startedAt = Date.now();
        try {
            const [active, submitted] = await Promise.all([
                assignmentService.getStudentActiveAssignments(token).catch(() => [] as AssignmentResponse[]),
                assignmentService.getStudentSubmissions(token).catch(() => [] as SubmissionResponse[]),
            ]);
            // Completed tab only includes truly submitted rows that have a valid assignment id.
            const completedSubmissions = submitted.filter(isCompletedSubmission);

            const submittedMap = new Map<number, SubmissionResponse>();
            completedSubmissions.forEach(s => {
                if (hasValidAssignmentId(s.assignmentId)) {
                    submittedMap.set(s.assignmentId, s);
                }
            });

            const activeTests = active
                .filter(a => !submittedMap.has(a.assignmentID))
                .map(a => apiAssignmentToTest(a, false));
            const completedTests = completedSubmissions
                .map(s => {
                    const assignmentId = s.assignmentId;
                    const a = active.find(x => x.assignmentID === assignmentId) ?? {
                        assignmentID: assignmentId, title: s.assignmentTitle ?? 'Bài đã nộp',
                        assignmentType: 'TEST', format: 'MULTIPLE_CHOICE', status: 'CLOSED',
                        startTime: null, endTime: null, deadline: null,
                        durationMinutes: 45,
                        createdAt: '', updatedAt: '', classroomId: 0,
                        className: '', subjectName: null,
                        totalQuestions: s.answers.length, totalSubmissions: 0,
                    } as AssignmentResponse;
                    return apiAssignmentToTest(a, true, s);
                })
                .filter(t => hasValidAssignmentId(t._assignmentId));

            setApiActiveAssignments(activeTests);
            setApiCompletedTests(completedTests);
        } catch {
            setApiActiveAssignments([]);
            setApiCompletedTests([]);
        } finally {
            const elapsed = Date.now() - startedAt;
            const minDelay = 550;
            if (elapsed < minDelay) {
                await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
            }
            setIsLoadingAssignments(false);
        }
    }, []);

    useEffect(() => { loadApiData(); }, [loadApiData]);

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

    const availableTests = apiActiveAssignments;
    const completedTests = apiCompletedTests;


    // Apply filters
    const filteredTests = useMemo(() => {
        const sourceList = activeTab === 'available' ? availableTests : completedTests;
        return sourceList.filter(t => {
            const query = searchQuery.toLowerCase();
            const title = (t.title ?? '').toLowerCase();
            const subject = (t.subject ?? '').toLowerCase();
            const matchSearch = title.includes(query) || subject.includes(query);
            const matchCategory = filterCategory === 'all' ? true : t.category === filterCategory;
            const matchSchedule = !scheduleFilter
                ? true
                : (!scheduleFilter.subject || t.subject === scheduleFilter.subject)
                && (!scheduleFilter.className || t.className === scheduleFilter.className)
                && (!scheduleFilter.lessonKey || t.lessonKey === scheduleFilter.lessonKey);

            return matchSearch && matchCategory && matchSchedule;
        }).sort((a, b) => {
            if (activeTab === 'available') {
                const rank = (t: Test) => {
                    const alert = getTimeAlert(t, nowMs);
                    if (alert === 'ending') return 0;
                    if (alert === 'opening') return 1;
                    if (alert === 'deadline') return 2;
                    return 3;
                };

                const diff = rank(a) - rank(b);
                if (diff !== 0) return diff;
            }
            return 0;
        });
    }, [activeTab, availableTests, completedTests, searchQuery, filterCategory, scheduleFilter, nowMs]);

    const handleOpenTest = async (test: Test) => {
        setSelectedTest(test);
        setExerciseViewMode('detail');
        setTakingDetail(null);
        setAttemptInfo(null);
        setAnswerSelections({});
        setResultDetail(null);
        // Pre-fetch questions/results for real assignments
        const realId = (test as any)._assignmentId as number | undefined;
        if (realId) {
            const token = authService.getToken();
            if (token) {
                try {
                    if (test.status !== 'completed' && test.status !== 'missing') {
                        const detail = await assignmentService.getDetail(realId, token);
                        setTakingDetail(detail);
                    }
                    if (test.status === 'completed' || test.status === 'missing') {
                        const result = await assignmentService.getResult(realId, token).catch(() => null);
                        setResultDetail(result);
                    }
                } catch { /* silent */ }
            }
        }
    };

    const handleRealSubmit = async () => {
        if (!takingDetail || isSubmitting || submitLockRef.current) return;
        submitLockRef.current = true;
        const token = authService.getToken();
        if (!token) {
            submitLockRef.current = false;
            return;
        }
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        const answers = takingDetail.questions.map(q => ({
            questionId: q.id,
            answerRefId: answerSelections[q.id] ?? null,
            selectedAnswer: null as string | null,
        }));
        setIsSubmitting(true);
        try {
            const result = await assignmentService.submit(takingDetail.assignmentID, {
                timeTaken,
                answers,
                violationCount: examViolationsRef.current > 0 ? examViolationsRef.current : undefined,
            }, token);
            // Clear local draft — submission accepted, progress is no longer needed
            clearDraft();
            void deleteDraftFromServer(token);
            const latestResult = await assignmentService.getResult(takingDetail.assignmentID, token).catch(() => null);
            setResultDetail(latestResult);
            setExerciseViewMode('detailedReview');
            setAttemptInfo(null);
            // Refresh API data
            await loadApiData();
            // Update selectedTest to completed
            if (selectedTest) {
                setSelectedTest({ ...selectedTest, status: 'completed', score: result.score });
            }
        } catch (e: any) {
            alert(e.message ?? 'Lỗi nộp bài');
        } finally {
            setIsSubmitting(false);
            submitLockRef.current = false;
        }
    };

    const handleStartTaking = async () => {
        if (!selectedTest) return;

        if (selectedTest.status === 'missing') {
            const realId = (selectedTest as any)._assignmentId as number | undefined;
            const token = authService.getToken();
            if (realId && token) {
                try {
                    const detail = await assignmentService.getDetail(realId, token).catch(() => null);
                    setTakingDetail(detail);
                    const result = await assignmentService.getResult(realId, token);
                    setResultDetail(result);
                } catch {
                    setTakingDetail(null);
                    setResultDetail(null);
                }
            }
            // Keep missed assignments on the result summary screen first.
            setExerciseViewMode('taking');
            return;
        }

        if (selectedTest.status === 'completed') {
            setTakingDetail(null);
            const realId = (selectedTest as any)._assignmentId as number | undefined;
            const token = authService.getToken();
            if (realId && token) {
                try {
                    const result = await assignmentService.getResult(realId, token);
                    setResultDetail(result);
                } catch {
                    setResultDetail(null);
                }
            }
            setExerciseViewMode('taking');
            return;
        }

        const realId = (selectedTest as any)._assignmentId as number | undefined;
        if (!realId) {
            setExerciseViewMode('taking');
            return;
        }

        const token = authService.getToken();
        if (!token) return;

        try {
            const attempt = await assignmentService.start(realId, token);
            setAttemptInfo(attempt);
            setStartTime(parseVnDate(attempt.startedAt).getTime());

            // ── Draft restoration ─────────────────────────────────────────────
            // Check whether the student has a saved draft for this assignment.
            // This covers two cases:
            //   1. A previous browser session was interrupted mid-quiz.
            //   2. The access token silently refreshed and the component remounted.
            const draft = loadDraft();
            if (draft && Object.keys(draft.answers).length > 0) {
                const savedCount = Object.keys(draft.answers).length;
                const shouldResume = window.confirm(
                    `Bạn có bản nháp chưa hoàn thành (${savedCount} câu đã chọn).\nBạn có muốn tiếp tục từ lần làm trước không?`
                );
                if (shouldResume) {
                    setAnswerSelections(draft.answers);
                    currentQRef.current = draft.currentQuestion;
                    setDraftRestoredCurrentQ(draft.currentQuestion);
                } else {
                    // Student declined — clear stale draft so it won't appear again
                    clearDraft();
                    setDraftRestoredCurrentQ(0);
                }
            } else {
                setDraftRestoredCurrentQ(0);
            }

            setExerciseViewMode('taking');
        } catch (e: any) {
            alert(e.message ?? 'Không thể bắt đầu làm bài');
        }
    };

    const clearScheduleFilter = () => {
        navigate('/student/exercises');
    };

    const handleOpenDetailedReview = async () => {
        if (!selectedTest) return;
        if (selectedTest.status === 'completed' || selectedTest.status === 'missing') {
            const realId = (selectedTest as any)._assignmentId as number | undefined;
            const token = authService.getToken();
            if (realId && token) {
                try {
                    const detail = await assignmentService.getDetail(realId, token).catch(() => null);
                    setTakingDetail(detail);
                    const result = await assignmentService.getResult(realId, token);
                    setResultDetail(result);
                } catch {
                    setTakingDetail(null);
                    setResultDetail(null);
                }
            }
        }
        setExerciseViewMode('detailedReview');
    };

    if (selectedTest) {
        if ((selectedTest.status === 'completed' || selectedTest.status === 'missing') && exerciseViewMode === 'detailedReview') {
            return (
                <div className="min-h-screen p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <DetailedReviewView test={selectedTest} result={resultDetail} detail={takingDetail} onBack={() => setExerciseViewMode('detail')} isDark={isDark} />
                </div>
            );
        }

        if (exerciseViewMode === 'detail') {
            return (
                <div className="min-h-screen p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <TestDetailView
                        test={selectedTest}
                        result={resultDetail}
                        scheduleDate={scheduleFilter?.date}
                        onBack={() => setSelectedTest(null)}
                        onPrimary={handleStartTaking}
                        onDetailedReview={handleOpenDetailedReview}
                        isDark={isDark}
                    />
                </div>
            );
        }

        // Real API test taking
        if (takingDetail && selectedTest.status !== 'completed' && selectedTest.status !== 'missing') {
            return (
                <div className="min-h-screen p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    <RealTestTakingView
                        detail={takingDetail}
                        attempt={attemptInfo}
                        answerSelections={answerSelections}
                        onSelectAnswer={(qId, answerId) => setAnswerSelections(prev => ({ ...prev, [qId]: answerId }))}
                        onBack={() => setExerciseViewMode('detail')}
                        onSubmit={handleRealSubmit}
                        isSubmitting={isSubmitting}
                        isDark={isDark}
                        initialCurrentQ={draftRestoredCurrentQ}
                        onCurrentQChange={(q) => { currentQRef.current = q; }}
                        onViolationsChange={(count) => { examViolationsRef.current = count; }}
                    />
                </div>
            );
        }

        return (
            <div className="min-h-screen p-6 lg:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <TestTakingView
                    test={selectedTest}
                    result={resultDetail}
                    onBack={() => setExerciseViewMode('detail')}
                    onOpenDetailedReview={handleOpenDetailedReview}
                    isDark={isDark}
                />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="mb-2">
                <p className="text-xs font-extrabold text-[#FF6B4A] uppercase tracking-widest mb-1">Học tập hiệu quả</p>
                <h1 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#1A1A1A]'}'}`}>Bài tập &amp; Kiểm tra</h1>
            </div>

            <div className={`rounded-3xl p-2 flex flex-col sm:flex-row gap-4 relative z-10 w-full ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'}`}>
                {/* Search */}
                <div className="flex-1 relative">
                    <MagnifyingGlass className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${isDark ? 'text-[#9ca3af]' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Tìm bài tập, môn học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none font-bold text-sm transition-colors ${isDark ? 'bg-[#18181b] border border-[rgba(255,255,255,0.08)] focus:border-[#ff7849] text-white placeholder:text-[#9ca3af]' : 'bg-gray-50 border-2 border-transparent focus:border-[#FF6B4A]'}`}
                    />
                </div>
                {/* Filter Dropdown */}
                <div className={`flex items-center pl-4 py-1 pr-2 ${isDark ? 'border-l border-[#1A1A1A]/20' : 'border-l-2 border-gray-100'}`}>
                    <Funnel className={`w-5 h-5 mr-3 ${isDark ? 'text-[#9ca3af]' : 'text-gray-400'}`} />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
                        className={`bg-transparent font-extrabold text-sm outline-none cursor-pointer ${isDark ? 'text-[#e5e7eb]' : 'text-[#1A1A1A]'}`}
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
            <div className={`flex p-1.5 rounded-2xl w-fit gap-2 ${isDark ? 'bg-[#18181b] border-none' : 'bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/10'}`}>
                {[['available', `Đang có (${availableTests.length})`], ['completed', `Đã xong (${completedTests.length})`]].map(([tab, label]) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as ActiveTab)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all ${activeTab === tab ? 'bg-[#ff7849] text-white shadow-sm' : (isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]')}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Test List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {isLoadingAssignments
                    ? <div className={`col-span-1 md:col-span-2 text-center py-20 rounded-3xl border-dashed ${isDark ? 'bg-[#1a1a1f] border-none' : 'bg-white/50 border-2 border-[#1A1A1A]/20'}`}>
                        <Hourglass className={`w-12 h-12 mx-auto mb-3 animate-spin ${isDark ? 'text-[#9ca3af]' : 'text-[#1A1A1A]/40'}`} weight="fill" />
                        <div className={`font-extrabold text-lg ${isDark ? 'text-[#9ca3af]' : 'text-[#1A1A1A]/60'}`}>Đang tải bài tập...</div>
                    </div>
                    : filteredTests.length > 0
                        ? filteredTests.map((t) => <ExerciseCard key={t.id} test={t} onStart={handleOpenTest} isDark={isDark} nowMs={nowMs} />)
                        : <div className={`col-span-1 md:col-span-2 text-center py-20 rounded-3xl border-dashed ${isDark ? 'bg-[#1a1a1f] border-none' : 'bg-white/50 border-2 border-[#1A1A1A]/20'}`}>
                            <Funnel className="w-12 h-12 text-[#1A1A1A]/20 mx-auto mb-3" />
                            <div className={`font-extrabold text-lg ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/60'}`}>Không tìm thấy bài tập phù hợp</div>
                        </div>
                }
            </div>
        </div>
    );
}
