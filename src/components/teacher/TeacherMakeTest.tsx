import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    CalendarBlank, Lightning, Eye, Trash, PaperPlaneTilt,
    Plus, SquaresFour, ChartBar, Clock, TextB, TextItalic,
    BookOpen, Warning, ArrowsClockwise, Users, ShieldWarning, ChatsCircle, CheckCircle, XCircle, FilePdf
} from '@phosphor-icons/react';
import { Bot as Robot } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSettings } from '../../context/SettingsContext';
import { assignmentService, AssignmentResponse, AssignmentDetailResponse, AssignmentReportResponse, QuestionPreviewResponse, QuestionBankResponse, SubmissionResponse, DisplayAnswerMode } from '../../services/assignmentService';
import { authService } from '../../services/authService';
import { classroomService } from '../../services/classroomService';
import { feedbackService } from '../../services/feedbackService';
import { teacherDocumentService } from '../../services/teacherDocumentService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell } from 'recharts';
import { MathRenderer } from '../ui/MathRenderer';
import { parseVnDate } from '../../lib/timeUtils';

type View = 'dashboard' | 'create' | 'detail' | 'report';

const DIFF_LABEL: Record<number, string> = { 1: 'DỄ', 2: 'TRUNG BÌNH', 3: 'KHÓ' };
const DIFF_COLORS_LIGHT: Record<string, string> = { 'TRUNG BÌNH': '#FCE38A', 'DỄ': '#95E1D3', 'KHÓ': '#FFB5B5' };
const DIFF_COLORS_DARK: Record<string, string> = { 'TRUNG BÌNH': '#9a8b5a', 'DỄ': '#5c9c93', 'KHÓ': '#8f6a73' };

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        DRAFT: { label: 'Nháp', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
        ACTIVE: { label: 'Đang mở', cls: 'bg-green-100 text-green-700 border-green-300' },
        CLOSED: { label: 'Đã đóng', cls: 'bg-red-100 text-red-600 border-red-300' },
    };
    const info = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
    return (
        <span className={`text-xs font-extrabold px-2 py-1 rounded-full border ${info.cls}`}>{info.label}</span>
    );
}

// parseVnDate imported from ../../lib/timeUtils

function formatDeadline(dt: string | null) {
    if (!dt) return '';
    const d = parseVnDate(dt);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dt: string | null) {
    if (!dt) return 'Chưa nộp';
    const target = parseVnDate(dt);
    if (Number.isNaN(target.getTime())) return formatDeadline(dt);

    const diffMs = Date.now() - target.getTime();
    const absMs = Math.abs(diffMs);
    if (absMs < 60_000) return 'Vừa xong';

    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    if (absMs < 3_600_000) return rtf.format(-Math.round(diffMs / 60_000), 'minute');
    if (absMs < 86_400_000) return rtf.format(-Math.round(diffMs / 3_600_000), 'hour');
    return rtf.format(-Math.round(diffMs / 86_400_000), 'day');
}

type TeacherReportSubmissionStatus = 'ON_TIME' | 'LATE' | 'IN_PROGRESS' | 'NOT_STARTED' | 'MISSING';

function getSubmissionTimingTag(status?: TeacherReportSubmissionStatus | null, type?: string) {
    if (status === 'ON_TIME') return { label: 'Nộp đúng hạn', cls: 'bg-green-50 text-green-700 border-green-200' };
    if (status === 'LATE') return { label: 'Nộp muộn', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    if (status === 'IN_PROGRESS') return { label: 'Đang làm', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    
    const notDoneLabel = type === 'ASSIGNMENT' ? 'Chưa nộp bài' : 'Chưa làm bài';
    if (status === 'NOT_STARTED') return { label: notDoneLabel, cls: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (status === 'MISSING') return { label: notDoneLabel, cls: 'bg-red-50 text-red-700 border-red-200' };
    return { label: notDoneLabel, cls: 'bg-red-50 text-red-700 border-red-200' };
}

function getAccuracyColorClass(rate: number) {
    if (rate >= 70) return 'bg-green-500';
    if (rate >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
}

function getDifficultyTagClass(level: number | null | undefined) {
    if (level === 1) return 'bg-green-100 text-green-700 border-green-200';
    if (level === 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
}

function getFormatLabel(format: string) {
    return format === 'ESSAY' ? 'Tự luận' : 'Trắc nghiệm';
}

function getAssignmentTypeLabel(assignmentType: string) {
    return assignmentType === 'ASSIGNMENT' ? 'Bài tập' : 'Bài kiểm tra';
}

const DISPLAY_MODE_OPTIONS: { value: DisplayAnswerMode; label: string; helper: string }[] = [
    {
        value: 'IMMEDIATE',
        label: 'Hiển thị ngay điểm và đáp án',
        helper: 'Học sinh thấy điểm và đáp án chi tiết ngay sau khi nộp.',
    },
    {
        value: 'AFTER_DEADLINE',
        label: 'Chỉ hiển thị sau hạn nộp',
        helper: 'Trước hạn nộp học sinh chưa xem được điểm hoặc đáp án.',
    },
    {
        value: 'RESULTONLYIMMEDIATE',
        label: 'Hiển thị điểm ngay, đáp án sau hạn',
        helper: 'Học sinh xem được điểm trước, đáp án chi tiết mở sau hạn nộp.',
    },
];

function getDisplayModeLabel(mode?: string | null) {
    return DISPLAY_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? 'Hiển thị ngay điểm và đáp án';
}

function toLocalDateTime(input: string) {
    if (!input) return null;
    return `${input}:00`;
}

function toDateTimeLocalInput(value: string | null) {
    if (!value) return '';
    return value.slice(0, 16);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ isDark, onCreateClick, onDetailClick, onReportClick }: {
    isDark: boolean;
    onCreateClick: () => void;
    onDetailClick: (a: AssignmentResponse) => void;
    onReportClick: (id: number) => void;
}) {
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);
    const [publishing, setPublishing] = useState<number | null>(null);

    const load = useCallback(async () => {
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const data = await assignmentService.getMyAssignments(token);
            setAssignments(data);
        } catch (e: any) {
            setError(e.message ?? 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handlePublish = async (id: number) => {
        const token = authService.getToken();
        if (!token) return;
        setPublishing(id);
        try {
            await assignmentService.publish(id, token);
            await load();
        } catch (e: any) {
            alert(e.message ?? 'Lỗi phát hành');
        } finally {
            setPublishing(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Xóa đề kiểm tra này?')) return;
        const token = authService.getToken();
        if (!token) return;
        setDeleting(id);
        try {
            await assignmentService.delete(id, token);
            setAssignments(prev => prev.filter(a => a.assignmentID !== id));
        } catch (e: any) {
            alert(e.message ?? 'Lỗi xóa');
        } finally {
            setDeleting(null);
        }
    };

    const card = `rounded-3xl border-2 p-5 transition-all ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]/15'}`;
    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';

    if (loading) return <div className={`text-center py-20 font-bold ${sub}`}>Đang tải...</div>;
    if (error) return <div className="text-center py-20 text-red-500 font-bold">{error}</div>;

    return (
        <div className="space-y-4">
            {assignments.length === 0 && (
                <div className={`${card} flex flex-col items-center py-16 gap-4`}>
                    <BookOpen className="w-12 h-12 text-gray-300" />
                    <p className={`font-extrabold text-lg ${sub}`}>Chưa có đề kiểm tra nào</p>
                    <button onClick={onCreateClick}
                        className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-6 py-2 rounded-2xl text-sm transition-colors">
                        Tạo đề đầu tiên
                    </button>
                </div>
            )}
            {assignments.map(a => (
                <div key={a.assignmentID} className={card}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <StatusBadge status={a.status} />
                                <span className={`text-xs font-bold ${sub}`}>{getAssignmentTypeLabel(a.assignmentType)} • {getFormatLabel(a.format)}</span>
                            </div>
                            <h3 className={`font-extrabold text-base leading-snug truncate ${txt}`}>{a.title}</h3>
                            <p className={`text-xs font-semibold mt-0.5 ${sub}`}>
                                {a.className} {a.subjectName ? `— ${a.subjectName}` : ''}
                            </p>
                            <div className={`flex items-center gap-4 mt-2 text-xs font-semibold ${sub}`}>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDeadline(a.deadline)}</span>
                                <span>{a.totalQuestions} câu • {a.totalSubmissions} lượt nộp</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => onDetailClick(a)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-colors ${isDark ? 'border-white/15 text-gray-200 hover:bg-white/10' : 'border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                                Xem
                            </button>
                            {a.status === 'DRAFT' && (
                                <>
                                    <button onClick={() => handlePublish(a.assignmentID)}
                                        disabled={publishing === a.assignmentID}
                                        className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-60">
                                        {publishing === a.assignmentID ? '...' : 'Phát hành'}
                                    </button>
                                    <button onClick={() => handleDelete(a.assignmentID)}
                                        disabled={deleting === a.assignmentID}
                                        className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-red-500 border-2 border-red-200 hover:bg-red-50 transition-colors disabled:opacity-60">
                                        {deleting === a.assignmentID ? '...' : 'Xóa'}
                                    </button>
                                </>
                            )}
                            {a.status === 'CLOSED' && (
                                <button onClick={() => onReportClick(a.assignmentID)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#B8B5FF] hover:bg-[#a09dff] text-[#1A1A1A] transition-colors">
                                    Báo cáo
                                </button>
                            )}
                            {a.status === 'ACTIVE' && (
                                <button onClick={() => onReportClick(a.assignmentID)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#B8B5FF] hover:bg-[#a09dff] text-[#1A1A1A] transition-colors">
                                    Báo cáo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({ q, index, isDark, onRefresh, onRemove, refreshing }: {
    q: QuestionPreviewResponse | null;
    index: number;
    isDark: boolean;
    onRefresh?: (idx: number) => void;
    onRemove?: (idx: number) => void;
    refreshing: boolean;
}) {
    const diffLabel = q ? (DIFF_LABEL[q.difficultyLevel] ?? 'TRUNG BÌNH') : 'TRỐNG';
    const bg = isDark ? DIFF_COLORS_DARK[diffLabel] : DIFF_COLORS_LIGHT[diffLabel];
    const canEditQuestion = Boolean(onRefresh && onRemove);

    return (
        <div className={`rounded-3xl border-2 p-6 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
            <div className="flex justify-between items-center mb-5">
                <span className="text-[11px] font-extrabold px-3 py-1.5 rounded-2xl border-2"
                    style={{ backgroundColor: bg, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(26,26,26,0.2)' }}>
                    CÂU {index + 1} - {diffLabel}
                </span>
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => onRefresh?.(index)}
                        disabled={refreshing || !canEditQuestion}
                        className="flex flex-col items-center gap-0.5 min-w-[52px] disabled:opacity-40"
                        title="Đổi câu"
                    >
                        <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center">
                            <ArrowsClockwise className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </span>
                        <span className={`text-[10px] font-extrabold ${isDark ? 'text-sky-300' : 'text-sky-600'}`}>Đổi</span>
                    </button>
                    <button
                        onClick={() => onRemove?.(index)}
                        disabled={!canEditQuestion}
                        className="flex flex-col items-center gap-0.5 min-w-[52px] disabled:opacity-40"
                        title="Xóa câu"
                    >
                        <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 border border-red-200 flex items-center justify-center">
                            <Trash className="w-4 h-4" />
                        </span>
                        <span className={`text-[10px] font-extrabold ${isDark ? 'text-red-300' : 'text-red-600'}`}>Xóa</span>
                    </button>
                </div>
            </div>

            {!q ? (
                <div className={`rounded-2xl border-2 border-dashed p-4 ${isDark ? 'border-white/20 text-gray-400' : 'border-[#1A1A1A]/20 text-[#1A1A1A]/45'}`}>
                    <p className="font-extrabold">Câu hỏi đã được xóa khỏi ô này.</p>
                    <p className="text-sm font-semibold mt-1">Nhấn "Đổi" để lấy một câu hỏi mới từ ngân hàng.</p>
                </div>
            ) : (
                <>
                    <p className={`font-extrabold mb-5 leading-relaxed ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                        <MathRenderer content={q.questionText} />
                    </p>
                    {q.answers.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.answers.map((ans, ai) => (
                                <div key={ans.id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${ans.isCorrect
                                    ? isDark ? 'border-[#FF6B4A] bg-[#FF6B4A]/15' : 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                    : isDark ? 'border-white/10 bg-[#20242b]/30' : 'border-[#1A1A1A]/10'}`}>
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-extrabold shrink-0 ${ans.isCorrect
                                        ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]'
                                        : isDark ? 'bg-white/10 text-gray-200 border-white/20' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/50'}`}>
                                        {ans.label || ['A', 'B', 'C', 'D'][ai]}
                                    </div>
                                    <span className={`text-sm font-bold ${ans.isCorrect ? 'text-[#FF6B4A]' : isDark ? 'text-gray-200' : 'text-[#1A1A1A]/70'}`}>
                                        <MathRenderer content={ans.content} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Create Test ─────────────────────────────────────────────────────────────
function CreateTest({ isDark, onSaved }: { isDark: boolean; onSaved: () => void }) {
    const [classroomId, setClassroomId] = useState('');
    const [title, setTitle] = useState('');
    const [assignmentType, setAssignmentType] = useState<'TEST' | 'ASSIGNMENT'>('TEST');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [deadline, setDeadline] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('30');
    const [displayAnswerMode, setDisplayAnswerMode] = useState<DisplayAnswerMode>('IMMEDIATE');
    // Multi-bank selection
    const [selectAllBanks, setSelectAllBanks] = useState(true);
    const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState('');
    const [limit, setLimit] = useState('10');
    const [questions, setQuestions] = useState<(QuestionPreviewResponse | null)[]>([]);
    const [loadingQ, setLoadingQ] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [refreshingIdx, setRefreshingIdx] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [classrooms, setClassrooms] = useState<{ classID: number; className: string; subjectName: string }[]>([]);
    const [banks, setBanks] = useState<QuestionBankResponse[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        classroomService.getMyClassroomOptions(token).then(data => setClassrooms(data as any)).catch(() => {});
        assignmentService.getMyBanks(token).then(data => setBanks(data)).catch(() => {});
    }, []);

    const toggleBank = (id: number) => {
        setSelectedBankIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        setSelectAllBanks(false);
    };

    const fetchRandomQuestions = async () => {
        const token = authService.getToken();
        if (!token) return;
        setLoadingQ(true);
        setError('');
        try {
            const requestedLimit = Number(limit) || 10;
            const diff = difficultyLevel && difficultyLevel !== 'all' ? Number(difficultyLevel) : undefined;
            let allQuestions: QuestionPreviewResponse[] = [];

            if (selectAllBanks || selectedBankIds.length === 0) {
                // All banks (filtered by teacher ownership and classroom subject)
                allQuestions = await assignmentService.getRandomQuestions({
                    difficultyLevel: diff,
                    limit: requestedLimit, // Respected limit on server
                    classroomId: classroomId ? Number(classroomId) : undefined,
                }, token);
            } else {
                // Fetch from each selected bank then combine
                for (const id of selectedBankIds) {
                    const data = await assignmentService.getRandomQuestions({
                        bankId: id,
                        difficultyLevel: diff,
                        limit: requestedLimit,
                        classroomId: classroomId ? Number(classroomId) : undefined,
                    }, token);
                    allQuestions = [...allQuestions, ...data];
                }
                // Deduplicate by question id
                const seen = new Set<number>();
                allQuestions = allQuestions.filter(q => {
                    if (seen.has(q.id)) return false;
                    seen.add(q.id);
                    return true;
                });
                // Shuffle
                for (let i = allQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
                }
                // Trim to requested limit
                allQuestions = allQuestions.slice(0, requestedLimit);
            }

            setQuestions(allQuestions);

            // If still not enough, generate AI questions for selected banks
            const need = requestedLimit - allQuestions.filter(q => q !== null).length;
            if (need > 0 && !selectAllBanks && selectedBankIds.length > 0) {
                setGeneratingAI(true);
                try {
                    await teacherDocumentService.generateAIQuestionsForBanks(selectedBankIds, need, token);
                    // Re-fetch to include newly generated AI questions
                    const refreshed: QuestionPreviewResponse[] = [];
                    const existingIds = new Set(allQuestions.map(q => q.id));
                    for (const id of selectedBankIds) {
                        const data = await assignmentService.getRandomQuestions({
                            bankId: id,
                            difficultyLevel: diff,
                            limit: need * 2,
                        }, token);
                        for (const q of data) {
                            if (!existingIds.has(q.id)) {
                                existingIds.add(q.id);
                                refreshed.push(q);
                            }
                        }
                    }
                    setQuestions(prev => [...prev, ...refreshed.slice(0, need)]);
                } catch (aiErr: any) {
                    setError(`Đã lấy ${allQuestions.length} câu (không đủ ${requestedLimit}). Lỗi sinh AI: ${aiErr.message ?? 'không xác định'}`);
                } finally {
                    setGeneratingAI(false);
                }
            }
        } catch (e: any) {
            setError(e.message ?? 'Lỗi lấy câu hỏi');
        } finally {
            setLoadingQ(false);
        }
    };

    const refreshOne = async (idx: number) => {
        const token = authService.getToken();
        if (!token) return;
        setRefreshingIdx(idx);
        try {
            const data = await assignmentService.getRandomQuestions({
                bankId: !selectAllBanks && selectedBankIds.length === 1 ? selectedBankIds[0] : undefined,
                difficultyLevel: difficultyLevel && difficultyLevel !== 'all' ? Number(difficultyLevel) : undefined,
                limit: 5,
                classroomId: classroomId ? Number(classroomId) : undefined,
            }, token);
            // Pick a question not already in the list
            const currentIds = new Set(questions.filter((q): q is QuestionPreviewResponse => q !== null).map(q => q.id));
            const candidate = data.find(q => !currentIds.has(q.id)) ?? data[0];
            if (candidate) {
                setQuestions(prev => prev.map((q, i) => i === idx ? candidate : q));
            }
        } catch {
            // silent
        } finally {
            setRefreshingIdx(null);
        }
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.map((q, i) => (i === idx ? null : q)));
    };

    const handleSave = async (publishAfter: boolean) => {
        const activeQuestions = questions.filter((q): q is QuestionPreviewResponse => q !== null);

        if (!classroomId || !title || activeQuestions.length === 0) {
            setError('Vui lòng điền đầy đủ thông tin cơ bản và có ít nhất 1 câu hỏi');
            return;
        }
        if (assignmentType === 'TEST' && (!startTime || !endTime)) {
            setError('Bài kiểm tra yêu cầu thời gian bắt đầu và kết thúc');
            return;
        }
        if (assignmentType === 'ASSIGNMENT' && !deadline) {
            setError('Bài tập yêu cầu hạn nộp');
            return;
        }
        if (!durationMinutes || Number(durationMinutes) <= 0) {
            setError('Thời gian làm bài phải lớn hơn 0 phút');
            return;
        }
        const token = authService.getToken();
        if (!token) return;
        setSaving(true);
        setError('');
        try {
            const created = await assignmentService.create({
                classroomId: Number(classroomId),
                title,
                assignmentType,
                format: 'MULTIPLE_CHOICE',
                startTime: assignmentType === 'TEST' ? toLocalDateTime(startTime) : null,
                endTime: assignmentType === 'TEST' ? toLocalDateTime(endTime) : null,
                deadline: assignmentType === 'ASSIGNMENT' ? toLocalDateTime(deadline) : null,
                durationMinutes: Number(durationMinutes),
                displayAnswerMode,
                questionIds: activeQuestions.map(q => q.id),
            }, token);
            if (publishAfter) {
                try {
                    await assignmentService.publish(created.assignmentID, token);
                } catch (e: any) {
                    alert(`Đã lưu nhưng phát hành thất bại: ${e.message}`);
                }
            }
            onSaved();
        } catch (e: any) {
            setError(e.message ?? 'Lỗi tạo đề');
        } finally {
            setSaving(false);
        }
    };

    const inp = `border-2 h-11 rounded-2xl font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`;
    const card = `rounded-3xl border-2 p-6 md:p-8 space-y-5 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`;
    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const label = 'text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <div className="space-y-6 pb-32">
            {/* Step 1 */}
            <div className={card}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 font-extrabold flex items-center justify-center text-sm ${isDark ? 'bg-[#9a8b5a] border-white/20 text-[#11151d]' : 'bg-[#FCE38A] border-[#1A1A1A] text-[#1A1A1A]'}`}>1</div>
                    <h2 className={`text-xl font-extrabold ${txt}`}>Thông tin cơ bản</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <p className={label}>Chọn lớp</p>
                        <Select value={classroomId} onValueChange={setClassroomId}>
                            <SelectTrigger className={inp}><SelectValue placeholder="Chọn lớp..." /></SelectTrigger>
                            <SelectContent>
                                {classrooms.map((c: any) => (
                                    <SelectItem key={c.classID} value={String(c.classID)}>
                                        {c.className} {c.subjectName ? `— ${c.subjectName}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <p className={label}>Loại bài</p>
                        <div className={`flex border-2 p-1 rounded-2xl h-11 gap-1 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/10'}`}>
                            {[['TEST', 'Bài kiểm tra'], ['ASSIGNMENT', 'Bài tập']].map(([v, l]) => (
                                <button key={v} onClick={() => setAssignmentType(v as 'TEST' | 'ASSIGNMENT')}
                                    className={`flex-1 text-xs font-extrabold rounded-xl transition-all ${assignmentType === v ? 'bg-[#FF6B4A] text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-gray-100' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {assignmentType === 'TEST' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <p className={label}>Thời gian bắt đầu</p>
                            <div className="relative">
                                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                                    className={`w-full ${inp} pr-10`} />
                                <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <p className={label}>Thời gian kết thúc</p>
                            <div className="relative">
                                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                                    className={`w-full ${inp} pr-10`} />
                                <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className={label}>Hạn nộp</p>
                        <div className="relative">
                            <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
                                className={`w-full ${inp} pr-10`} />
                            <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                )}
                <div>
                    <p className={label}>Thời gian làm bài (phút)</p>
                    <Input
                        type="number"
                        min="1"
                        value={durationMinutes}
                        onChange={e => setDurationMinutes(e.target.value)}
                        className={`w-full ${inp}`}
                    />
                </div>
                <div>
                    <p className={label}>Chế độ hiển thị đáp án</p>
                    <Select value={displayAnswerMode} onValueChange={(value) => setDisplayAnswerMode(value as DisplayAnswerMode)}>
                        <SelectTrigger className={inp}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {DISPLAY_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className={`mt-1.5 text-[11px] font-semibold ${sub}`}>
                        {DISPLAY_MODE_OPTIONS.find((option) => option.value === displayAnswerMode)?.helper}
                    </p>
                </div>
                <div>
                    <p className={label}>Tiêu đề đề kiểm tra</p>
                    <Input value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Nhập tiêu đề..." className={`w-full ${inp}`} />
                </div>
            </div>

            {/* Step 2 */}
            <div className={`${card} border-l-[6px]`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 font-extrabold flex items-center justify-center text-sm ${isDark ? 'bg-[#7873b8] border-white/20 text-[#11151d]' : 'bg-[#B8B5FF] border-[#1A1A1A] text-[#1A1A1A]'}`}>2</div>
                    <h2 className={`text-xl font-extrabold ${txt}`}>Phương thức lấy câu hỏi</h2>
                </div>
                {/* Multi-bank selector */}
                <div>
                    <p className={label}>Ngân hàng câu hỏi <span className="normal-case text-[10px] font-semibold ml-1">(tick chọn file, bỏ trống = tất cả)</span></p>
                    <div className={`rounded-2xl border-2 p-3 max-h-44 overflow-y-auto space-y-1 ${isDark ? 'bg-[#20242b] border-white/15' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                        {/* "All banks" option */}
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selectAllBanks ? (isDark ? 'bg-[#FF6B4A]/20' : 'bg-[#FF6B4A]/10') : (isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/5')}`}>
                            <input
                                type="checkbox"
                                checked={selectAllBanks}
                                onChange={e => {
                                    setSelectAllBanks(e.target.checked);
                                    if (e.target.checked) setSelectedBankIds([]);
                                }}
                                className="accent-[#FF6B4A] w-4 h-4 rounded"
                            />
                            <span className={`text-sm font-extrabold ${selectAllBanks ? 'text-[#FF6B4A]' : (isDark ? 'text-gray-200' : 'text-[#1A1A1A]')}`}>
                                Tất cả ngân hàng
                            </span>
                        </label>
                        {banks.length === 0 && (
                            <p className={`text-xs font-semibold px-3 py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Chưa có ngân hàng câu hỏi nào</p>
                        )}
                        {banks.map(b => (
                            <label
                                key={b.id}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${selectedBankIds.includes(b.id) ? (isDark ? 'bg-[#FF6B4A]/20' : 'bg-[#FF6B4A]/10') : (isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/5')}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedBankIds.includes(b.id)}
                                    onChange={() => toggleBank(b.id)}
                                    className="accent-[#FF6B4A] w-4 h-4 rounded"
                                />
                                <span className={`text-sm font-bold truncate ${selectedBankIds.includes(b.id) ? 'text-[#FF6B4A]' : (isDark ? 'text-gray-200' : 'text-[#1A1A1A]')}`}>
                                    {b.bankName}
                                </span>
                                {b.subjectName && <span className={`text-xs font-semibold ml-auto shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{b.subjectName}</span>}
                            </label>
                        ))}
                    </div>
                    {!selectAllBanks && selectedBankIds.length > 0 && (
                        <p className={`mt-1.5 text-[11px] font-semibold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>
                            Đã chọn {selectedBankIds.length} file. Nếu không đủ câu, AI sẽ tự sinh thêm và lưu vào ngân hàng.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <p className={label}>Độ khó</p>
                        <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                            <SelectTrigger className={inp}><SelectValue placeholder="Tất cả độ khó" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="1">Dễ</SelectItem>
                                <SelectItem value="2">Trung bình</SelectItem>
                                <SelectItem value="3">Khó</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <p className={label}>Số lượng</p>
                        <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} min="1" max="50"
                            className={inp} />
                    </div>
                </div>

                {generatingAI && (
                    <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-[#FF6B4A]' : 'text-[#FF6B4A]'}`}>
                        <Robot className="w-4 h-4 animate-pulse" />
                        Đang sinh câu hỏi AI bổ sung...
                    </div>
                )}

                <div className="flex justify-center pt-2">
                    <button onClick={fetchRandomQuestions} disabled={loadingQ || generatingAI}
                        className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold h-12 px-8 rounded-2xl shadow-md transition-colors text-base disabled:opacity-60">
                        <Lightning className="w-5 h-5" weight="fill" />
                        {generatingAI ? 'AI đang sinh câu hỏi...' : loadingQ ? 'Đang tạo...' : 'Tạo đề tự động'}
                    </button>
                </div>
            </div>

            {/* Preview */}
            {questions.length > 0 && (
                <>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                            <h3 className={`font-extrabold text-lg ${txt}`}>
                                Xem trước <span className={`font-bold ${sub}`}>(Đã random)</span>
                            </h3>
                        </div>
                        <span className={`text-sm font-extrabold ${sub}`}>Tổng: {questions.filter((q): q is QuestionPreviewResponse => q !== null).length} câu</span>
                    </div>
                    <div className="space-y-4">
                        {questions.map((q, idx) => (
                            <QuestionCard key={`${q?.id ?? 'empty'}-${idx}`} q={q} index={idx} isDark={isDark}
                                onRefresh={refreshOne} onRemove={removeQuestion}
                                refreshing={refreshingIdx === idx} />
                        ))}
                    </div>
                </>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                    <Warning className="w-4 h-4" /> {error}
                </div>
            )}

            {/* Footer */}
            <div className="fixed bottom-0 left-0 md:left-20 right-0 p-4 z-30">
                <div className={`max-w-4xl mx-auto border-2 rounded-3xl p-4 flex items-center justify-between shadow-xl ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <div>
                        <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-0.5">Trạng thái</div>
                        <div className={`font-extrabold text-sm ${txt}`}>
                            {questions.filter((q): q is QuestionPreviewResponse => q !== null).length > 0
                                ? `✅ ${questions.filter((q): q is QuestionPreviewResponse => q !== null).length} câu hỏi đã chọn`
                                : '⚠️ Chưa có câu hỏi nào'}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className={`h-11 px-6 font-extrabold text-sm border-2 rounded-2xl transition-colors disabled:opacity-60 ${isDark ? 'border-white/15 hover:bg-white/10 text-gray-100' : 'border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 text-[#1A1A1A]'}`}>
                            {saving ? '...' : 'Lưu nháp'}
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="h-11 px-6 font-extrabold text-sm bg-[#FF6B4A] hover:bg-[#ff5535] text-white rounded-2xl flex items-center gap-2 transition-colors shadow-md disabled:opacity-60">
                            <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                            {saving ? '...' : 'Phát hành ngay'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function DetailView({ id, isDark, onReport, onDeleted }: { id: number; isDark: boolean; onReport: () => void; onDeleted: () => void }) {
    const [detail, setDetail] = useState<AssignmentDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [closing, setClosing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editAssignmentType, setEditAssignmentType] = useState<'TEST' | 'ASSIGNMENT'>('TEST');
    const [editTitle, setEditTitle] = useState('');
    const [editDuration, setEditDuration] = useState('30');
    const [editDisplayAnswerMode, setEditDisplayAnswerMode] = useState<DisplayAnswerMode>('IMMEDIATE');
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editDeadline, setEditDeadline] = useState('');
    const [editQuestions, setEditQuestions] = useState<(QuestionPreviewResponse | null)[]>([]);
    const [refreshingQuestionIdx, setRefreshingQuestionIdx] = useState<number | null>(null);
    const [addingQuestion, setAddingQuestion] = useState(false);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        assignmentService.getDetail(id, token)
            .then(d => setDetail(d))
            .catch(e => setError(e.message ?? 'Lỗi'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleClose = async () => {
        if (!detail) return;
        const confirmMsg = detail.status === 'CLOSED'
            ? 'Mở lại đề kiểm tra này?'
            : 'Đóng đề kiểm tra này?';
        if (!confirm(confirmMsg)) return;
        const token = authService.getToken();
        if (!token) return;
        setClosing(true);
        try {
            const updated = await assignmentService.close(id, token);
            setDetail(prev => prev ? { ...prev, status: updated.status } : prev);
        } catch (e: any) {
            alert(e.message ?? 'Lỗi cập nhật trạng thái đề');
        } finally {
            setClosing(false);
        }
    };

    const beginEdit = () => {
        if (!detail) return;
        setEditAssignmentType(detail.assignmentType);
        setEditTitle(detail.title);
        setEditDuration(String(detail.durationMinutes ?? 30));
        setEditDisplayAnswerMode((detail.displayAnswerMode as DisplayAnswerMode) ?? 'IMMEDIATE');
        setEditStartTime(toDateTimeLocalInput(detail.startTime));
        setEditEndTime(toDateTimeLocalInput(detail.endTime));
        setEditDeadline(toDateTimeLocalInput(detail.deadline));
        setEditQuestions(detail.questions);
        setIsEditing(true);
    };

    const refreshQuestion = async (idx: number) => {
        const token = authService.getToken();
        if (!token) return;
        setRefreshingQuestionIdx(idx);
        try {
            const random = await assignmentService.getRandomQuestions({ limit: 8 }, token);
            const existingIds = new Set(editQuestions.filter((q): q is QuestionPreviewResponse => q !== null).map(q => q.id));
            const candidate = random.find(q => !existingIds.has(q.id)) ?? random[0];
            if (candidate) {
                setEditQuestions(prev => prev.map((q, i) => (i === idx ? candidate : q)));
            }
        } catch {
            // keep silent to match current UX
        } finally {
            setRefreshingQuestionIdx(null);
        }
    };

    const clearQuestionSlot = (idx: number) => {
        setEditQuestions(prev => prev.map((q, i) => (i === idx ? null : q)));
    };

    const appendRandomQuestion = async () => {
        const token = authService.getToken();
        if (!token) return;
        setAddingQuestion(true);
        try {
            const random = await assignmentService.getRandomQuestions({ limit: 12 }, token);
            const existingIds = new Set(editQuestions.filter((q): q is QuestionPreviewResponse => q !== null).map(q => q.id));
            const candidate = random.find(q => !existingIds.has(q.id));
            if (candidate) {
                setEditQuestions(prev => [...prev, candidate]);
            }
        } catch {
            // keep silent to match current UX
        } finally {
            setAddingQuestion(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!detail) return;
        if (!editTitle.trim()) {
            alert('Tiêu đề không được để trống');
            return;
        }
        if (!editDuration || Number(editDuration) <= 0) {
            alert('Thời gian làm bài phải lớn hơn 0 phút');
            return;
        }
        if (editAssignmentType === 'TEST' && (!editStartTime || !editEndTime)) {
            alert('Bài kiểm tra yêu cầu thời gian bắt đầu và kết thúc');
            return;
        }
        if (editAssignmentType === 'ASSIGNMENT' && !editDeadline) {
            alert('Bài tập yêu cầu hạn nộp');
            return;
        }

        const activeQuestionIds = editQuestions
            .filter((q): q is QuestionPreviewResponse => q !== null)
            .map(q => q.id);
        if (activeQuestionIds.length === 0) {
            alert('Đề kiểm tra cần ít nhất 1 câu hỏi');
            return;
        }

        const token = authService.getToken();
        if (!token) return;
        setSaving(true);
        try {
            const updated = await assignmentService.update(id, {
                title: editTitle.trim(),
                assignmentType: editAssignmentType,
                durationMinutes: Number(editDuration),
                startTime: editAssignmentType === 'TEST' ? toLocalDateTime(editStartTime) : null,
                endTime: editAssignmentType === 'TEST' ? toLocalDateTime(editEndTime) : null,
                deadline: editAssignmentType === 'ASSIGNMENT' ? toLocalDateTime(editDeadline) : null,
                displayAnswerMode: editDisplayAnswerMode,
                questionIds: activeQuestionIds,
            }, token);
            setDetail(updated);
            setEditQuestions(updated.questions);
            setIsEditing(false);
        } catch (e: any) {
            alert(e.message ?? 'Lỗi cập nhật đề');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Xóa đề này?')) return;
        const token = authService.getToken();
        if (!token) return;
        setDeleting(true);
        try {
            await assignmentService.delete(id, token);
            onDeleted();
        } catch (e: any) {
            alert(e.message ?? 'Lỗi xóa đề');
        } finally {
            setDeleting(false);
        }
    };

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    if (loading) return <div className={`text-center py-20 font-bold ${sub}`}>Đang tải...</div>;
    if (error || !detail) return <div className="text-center py-20 text-red-500 font-bold">{error || 'Không tìm thấy'}</div>;
    const displayAssignmentType = isEditing ? editAssignmentType : detail.assignmentType;

    return (
        <div className="space-y-4 pb-8">
            <div className={`rounded-3xl border-2 p-6 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={detail.status} />
                            {isEditing ? (
                                <div className={`flex border p-1 rounded-xl gap-1 ${isDark ? 'border-white/20 bg-white/5' : 'border-[#1A1A1A]/15 bg-[#1A1A1A]/5'}`}>
                                    {[['TEST', 'Bài kiểm tra'], ['ASSIGNMENT', 'Bài tập']].map(([v, l]) => (
                                        <button
                                            key={v}
                                            onClick={() => setEditAssignmentType(v as 'TEST' | 'ASSIGNMENT')}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold ${editAssignmentType === v
                                                ? 'bg-[#FF6B4A] text-white'
                                                : isDark ? 'text-gray-300 hover:text-white' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <span className={`text-xs font-bold ${sub}`}>{getAssignmentTypeLabel(detail.assignmentType)} • {getFormatLabel(detail.format)}</span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Tên đề thi</p>
                                {isEditing ? (
                                    <Input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}
                                    />
                                ) : (
                                    <Input
                                        value={detail.title}
                                        readOnly
                                        className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'}
                                    />
                                )}
                            </div>

                            <div>
                                <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Môn học</p>
                                <Input
                                    value={detail.subjectName ?? 'Chưa cập nhật'}
                                    readOnly
                                    className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'}
                                />
                            </div>
                            <div>
                                <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Lớp</p>
                                <Input
                                    value={detail.className}
                                    readOnly
                                    className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'}
                                />
                            </div>

                            {displayAssignmentType === 'TEST' ? (
                                <>
                                    <div>
                                        <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Thời gian bắt đầu</p>
                                        {isEditing ? (
                                            <div className="relative">
                                                <Input type="datetime-local" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()} className={`pr-10 ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`} />
                                                <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <Input readOnly value={formatDeadline(detail.startTime || '')} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Thời gian kết thúc</p>
                                        {isEditing ? (
                                            <div className="relative">
                                                <Input type="datetime-local" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()} className={`pr-10 ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`} />
                                                <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <Input readOnly value={formatDeadline(detail.endTime || '')} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="md:col-span-2">
                                    <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Hạn nộp</p>
                                    {isEditing ? (
                                        <div className="relative">
                                            <Input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} onClick={(e) => 'showPicker' in e.target && (e.target as any).showPicker()} className={`pr-10 ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`} />
                                            <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <Input readOnly value={formatDeadline(detail.deadline || '')} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                    )}
                                </div>
                            )}

                            <div className={displayAssignmentType === 'ASSIGNMENT' ? 'md:col-span-2' : ''}>
                                <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Thời lượng (phút)</p>
                                {isEditing ? (
                                    <Input type="number" min="1" value={editDuration} onChange={e => setEditDuration(e.target.value)} className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'} />
                                ) : (
                                    <Input readOnly value={`${detail.durationMinutes} phút`} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Chế độ hiển thị đáp án</p>
                                {isEditing ? (
                                    <Select value={editDisplayAnswerMode} onValueChange={(value) => setEditDisplayAnswerMode(value as DisplayAnswerMode)}>
                                        <SelectTrigger className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DISPLAY_MODE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        readOnly
                                        value={getDisplayModeLabel(detail.displayAnswerMode)}
                                        className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-4 flex flex-col gap-4 xl:items-end">
                        <div className="grid grid-cols-2 gap-3 xl:justify-end">
                            <div className={`rounded-2xl border-2 px-5 py-4 min-w-[98px] min-h-[110px] flex flex-col justify-center text-center ${isDark ? 'border-white/10 bg-[#20242b]' : 'border-[#1A1A1A]/10 bg-[#F8F8F4]'}`}>
                                <p className={`text-3xl font-extrabold leading-tight ${txt}`}>{isEditing ? editQuestions.filter((q): q is QuestionPreviewResponse => q !== null).length : detail.totalQuestions}</p>
                                <p className={`text-[11px] font-semibold ${sub}`}>Câu hỏi</p>
                            </div>
                            <div className={`rounded-2xl border-2 px-5 py-4 min-w-[98px] min-h-[110px] flex flex-col justify-center text-center ${isDark ? 'border-white/10 bg-[#20242b]' : 'border-[#1A1A1A]/10 bg-[#F8F8F4]'}`}>
                                <p className={`text-3xl font-extrabold leading-tight ${txt}`}>{detail.totalSubmissions}</p>
                                <p className={`text-[11px] font-semibold ${sub}`}>Lượt nộp</p>
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="flex gap-2 justify-start xl:justify-end w-full mt-auto">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-2xl text-xs font-extrabold border border-gray-300 text-gray-600 hover:bg-gray-100">
                                    Hủy
                                </button>
                                <button onClick={handleSaveEdit} disabled={saving}
                                    className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-green-500 text-white hover:bg-green-600 disabled:opacity-60">
                                    {saving ? '...' : 'Lưu sửa'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2 justify-start xl:justify-end w-full">
                                    <button onClick={onReport}
                                        className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-[#B8B5FF] text-[#1A1A1A] hover:bg-[#a09dff]">
                                        Xem báo cáo
                                    </button>
                                    {(detail.status === 'ACTIVE' || detail.status === 'CLOSED') && (
                                        <button onClick={handleClose} disabled={closing || saving || deleting}
                                            className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-red-100 text-red-600 hover:bg-red-200 border border-red-300 disabled:opacity-60">
                                            {closing ? '...' : detail.status === 'CLOSED' ? 'Mở lại' : 'Đóng đề'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-start xl:justify-end w-full">
                                    <button onClick={beginEdit}
                                        className="px-4 py-2 rounded-2xl text-xs font-extrabold border border-blue-300 text-blue-600 hover:bg-blue-50">
                                        Sửa
                                    </button>
                                    <button onClick={handleDelete} disabled={deleting}
                                        className="px-4 py-2 rounded-2xl text-xs font-extrabold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                                        {deleting ? '...' : 'Xóa'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                    <h3 className={`font-extrabold text-base ${txt}`}>Danh sách câu hỏi</h3>
                </div>
                {isEditing && (
                    <button
                        onClick={appendRandomQuestion}
                        disabled={addingQuestion}
                        className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-[#FF6B4A] text-white hover:bg-[#ff5535] disabled:opacity-60"
                    >
                        {addingQuestion ? '...' : 'Thêm câu hỏi'}
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {(isEditing ? editQuestions : detail.questions).map((q, idx) => (
                    <QuestionCard
                        key={`${q?.id ?? 'empty'}-${idx}`}
                        q={q}
                        index={idx}
                        isDark={isDark}
                        onRefresh={isEditing ? refreshQuestion : undefined}
                        onRemove={isEditing ? clearQuestionSlot : undefined}
                        refreshing={refreshingQuestionIdx === idx}
                    />
                ))}
            </div>
        </div>
    );
}


// ─── Teacher Feedback Form ───
function TeacherFeedbackForm({ submission, isDark, onDownloadPdf }: { submission: SubmissionResponse; isDark: boolean; onDownloadPdf?: () => void }) {
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';

    const handleSubmit = async () => {
        if (!comment.trim()) return;
        setSubmitting(true);
        setSuccess(false);
        try {
            await feedbackService.createFeedback({
                studentId: submission.userId,
                assignmentId: submission.assignmentId || 0,
                comment: comment.trim(),
            });
            setSuccess(true);
            setComment('');
            if (editorRef.current) editorRef.current.innerHTML = '';
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            alert(e.message || 'Lỗi gửi nhận xét');
        } finally {
            setSubmitting(false);
        }
    };

    const formatText = (command: string) => {
        document.execCommand(command, false, undefined);
        if (editorRef.current) {
            setComment(editorRef.current.innerHTML);
            editorRef.current.focus();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-[250px] flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <ChatsCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                    <h4 className={`font-extrabold text-sm ${txt}`}>Nhận xét của giáo viên (Tùy chọn)</h4>
                </div>
                
                {/* Simulated Rich Text Editor */}
                <div className={`flex-1 flex flex-col rounded-xl border focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all ${isDark ? 'border-white/10 bg-[#20242b]' : 'border-[#1A1A1A]/20 bg-[#F7F7F2]'}`}>
                    {/* Toolbar */}
                    <div className={`flex items-center gap-1.5 p-2 border-b ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                        <button 
                            type="button" 
                            onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }}
                            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
                        >
                            <TextB weight="bold" className="w-4 h-4" />
                        </button>
                        <button 
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }}
                            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-500"
                        >
                            <TextItalic className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Textarea replacement: contentEditable */}
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => setComment(e.currentTarget.innerHTML)}
                        data-placeholder="Gõ nhận xét chi tiết, lời động viên hoặc giải thích lỗi sai tại đây..."
                        className="flex-1 w-full p-4 text-sm bg-transparent outline-none overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:opacity-50 min-h-[120px]"
                    />
                </div>
                
                {success && (
                    <span className="text-xs font-bold text-emerald-500 mt-2 block text-right animate-pulse">
                        ✓ Đã gửi nhận xét thành công
                    </span>
                )}
            </div>

            {/* Action Footer Button Group */}
            <div className={`mt-5 pt-5 border-t flex items-center justify-between gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {onDownloadPdf && (
                    <button
                        onClick={onDownloadPdf}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-white/20 text-xs font-extrabold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <FilePdf weight="fill" className="w-4 h-4 text-[#d64b2e]" />
                        <span className={sub}>Tải bản PDF</span>
                    </button>
                )}
                
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !comment.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    {submitting ? 'Đang gửi...' : 'Gửi nhận xét'}
                    <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Report View ──────────────────────────────────────────────────────────────
function ReportView({ id, isDark }: { id: number; isDark: boolean }) {
    const [report, setReport] = useState<AssignmentReportResponse | null>(null);
    const [assignmentDetail, setAssignmentDetail] = useState<AssignmentDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedDistractors, setExpandedDistractors] = useState<Record<number, boolean>>({});
    const [submissionLoadingId, setSubmissionLoadingId] = useState<number | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionResponse | null>(null);
    const [detailFilter, setDetailFilter] = useState<'all' | 'wrong'>('all');
    const [tableFilter, setTableFilter] = useState<'all' | 'submitted' | 'missing'>('all');

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        setExpandedDistractors({});
        setSelectedSubmission(null);
        setDetailFilter('all');
        setTableFilter('all');
        Promise.all([
            assignmentService.getReport(id, token),
            assignmentService.getDetail(id, token).catch(() => null),
        ])
            .then(([reportData, detailData]) => {
                setReport(reportData);
                setAssignmentDetail(detailData);
            })
            .catch(e => setError(e.message ?? 'Lỗi'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleViewSubmission = async (submissionId: number) => {
        const token = authService.getToken();
        if (!token) return;
        setSubmissionLoadingId(submissionId);
        try {
            const detail = await assignmentService.getSubmissionDetailForTeacher(submissionId, token);
            setSelectedSubmission(detail);
            setDetailFilter('all');
        } catch (e: any) {
            alert(e.message ?? 'Không thể tải chi tiết bài nộp');
        } finally {
            setSubmissionLoadingId(null);
        }
    };

    const handleDownloadDetailPdf = () => { window.print(); };

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const card = `rounded-2xl border p-5 shadow-sm ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-gray-200'}`;

    if (loading) return <div className={`text-center py-20 font-bold ${sub}`}>Đang tải...</div>;
    if (error || !report) return <div className="text-center py-20 text-red-500 font-bold">{error || 'Không tìm thấy'}</div>;

    const DIFF_MAP: Record<number, string> = { 1: 'Dễ', 2: 'Trung bình', 3: 'Khó' };
    const totalCount = report.totalStudents ?? report.totalSubmissions;
    const submittedCount = report.totalSubmissions;
    const completionRate = Math.max(0, Math.min(100, report.completionRate ?? 0));
    const passRate = Math.max(0, Math.min(100, report.passRate ?? 0));
    const scoreDistribution = report.scoreDistribution ?? [0, 0, 0];

    const dueAtIso = assignmentDetail?.assignmentType === 'TEST'
        ? (assignmentDetail?.endTime ?? assignmentDetail?.deadline)
        : (assignmentDetail?.deadline ?? assignmentDetail?.endTime);
    const dueAtMs = dueAtIso ? parseVnDate(dueAtIso).getTime() : NaN;
    const isPastDue = !Number.isNaN(dueAtMs) && Date.now() > dueAtMs;

    const resolveStudentStatus = (student: AssignmentReportResponse['studentResults'][number]): TeacherReportSubmissionStatus => {
        if (student.submissionStatus === 'MISSING' || student.submissionTimingStatus === 'MISSING') {
            return 'MISSING';
        }

        const hasSubmitTime = Boolean(student.submitTime);
        const isMarkedSubmitted = student.submissionStatus === 'SUBMITTED';
        const neverStarted = (!student.timeTaken || student.timeTaken === 0) && (!student.score || student.score === 0);

        if (neverStarted && isPastDue) {
            return 'MISSING';
        }

        // Guard against backend rows that still carry ON_TIME/LATE while submitTime is missing.
        if (hasSubmitTime && student.submissionTimingStatus === 'ON_TIME') return 'ON_TIME';
        if (hasSubmitTime && student.submissionTimingStatus === 'LATE') return 'LATE';

        if (hasSubmitTime || isMarkedSubmitted) {
            return student.submissionTimingStatus === 'LATE' ? 'LATE' : 'ON_TIME';
        }

        if (student.submissionStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
        if (!isPastDue) return 'NOT_STARTED';
        return 'MISSING';
    };

    const studentRows = report.studentResults.map(student => ({
        student,
        displayStatus: resolveStudentStatus(student),
    }));

    const onTimeCount = studentRows.filter(row => row.displayStatus === 'ON_TIME').length;
    const lateCount = studentRows.filter(row => row.displayStatus === 'LATE').length;
    const missingCount = studentRows.filter(row => row.displayStatus !== 'ON_TIME' && row.displayStatus !== 'LATE').length;

    const distributionData = [
        { label: '< 5', sublabel: 'Yếu', count: scoreDistribution[0] ?? 0, color: '#ef4444', pct: submittedCount > 0 ? Math.round((scoreDistribution[0] ?? 0) / submittedCount * 100) : 0 },
        { label: '5 – 8', sublabel: 'Trung bình', count: scoreDistribution[1] ?? 0, color: '#f59e0b', pct: submittedCount > 0 ? Math.round((scoreDistribution[1] ?? 0) / submittedCount * 100) : 0 },
        { label: '> 8', sublabel: 'Giỏi', count: scoreDistribution[2] ?? 0, color: '#22c55e', pct: submittedCount > 0 ? Math.round((scoreDistribution[2] ?? 0) / submittedCount * 100) : 0 },
    ];

    const failRate = submittedCount > 0 ? (scoreDistribution[0] ?? 0) / submittedCount * 100 : 0;
    const insightText = failRate >= 50
        ? `${failRate.toFixed(0)}% học sinh chưa đạt điểm 5`
        : passRate >= 80
            ? `${passRate.toFixed(0)}% học sinh đạt từ 5.0 trở lên`
            : `Lớp đang ở mức trung bình (${passRate.toFixed(0)}% đạt)`;
    const insightCls = failRate >= 50
        ? 'text-red-600 bg-red-50 border-red-200'
        : passRate >= 80
            ? 'text-green-700 bg-green-50 border-green-200'
            : 'text-yellow-700 bg-yellow-50 border-yellow-200';

    const questionAnalysis = report.questionAnalysis?.length
        ? report.questionAnalysis
        : report.questionStats.map(q => ({ ...q, options: [] }));

    const filteredStudents = studentRows.filter(({ displayStatus }) => {
        if (tableFilter === 'submitted') return displayStatus === 'ON_TIME' || displayStatus === 'LATE';
        if (tableFilter === 'missing') return displayStatus === 'IN_PROGRESS' || displayStatus === 'NOT_STARTED' || displayStatus === 'MISSING';
        return true;
    });

    // Stat card color helpers
    const avgScore = report.averageScore ?? 0;
    const submRatio = totalCount > 0 ? submittedCount / totalCount : 0;

    function metricColor(val: number, good: number, warn: number) {
        return val >= good ? 'text-green-600' : val >= warn ? 'text-yellow-600' : 'text-red-500';
    }
    function metricBg(val: number, good: number, warn: number) {
        return val >= good ? 'bg-green-50' : val >= warn ? 'bg-yellow-50' : 'bg-red-50';
    }
    function metricBorder(val: number, good: number, warn: number) {
        return val >= good ? 'border-l-green-500' : val >= warn ? 'border-l-yellow-500' : 'border-l-red-500';
    }

    return (
        <div className="space-y-5 pb-8">

            {/* ── 1. Overview Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Submitted / Total */}
                <div className={`${card} border-l-4 ${metricBorder(submRatio * 100, 80, 50)}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Đã nộp / Sĩ số</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metricBg(submRatio * 100, 80, 50)}`}>
                            <Users className={`w-4 h-4 ${metricColor(submRatio * 100, 80, 50)}`} weight="bold" />
                        </div>
                    </div>
                    <p className={`text-2xl font-extrabold ${metricColor(submRatio * 100, 80, 50)}`}>
                        {submittedCount}<span className={`text-base font-semibold ${sub}`}> / {totalCount}</span>
                    </p>
                    <p className={`text-xs mt-1 ${sub}`}>{Math.round(submRatio * 100)}% học sinh đã nộp</p>
                </div>

                {/* Average score */}
                <div className={`${card} border-l-4 ${metricBorder(avgScore, 7, 5)}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Điểm trung bình</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metricBg(avgScore, 7, 5)}`}>
                            <ChartBar className={`w-4 h-4 ${metricColor(avgScore, 7, 5)}`} weight="bold" />
                        </div>
                    </div>
                    <p className={`text-2xl font-extrabold ${metricColor(avgScore, 7, 5)}`}>
                        {avgScore.toFixed(2)}<span className={`text-sm font-semibold ${sub}`}> / 10</span>
                    </p>
                    <p className={`text-xs mt-1 ${sub}`}>{avgScore >= 7 ? 'Kết quả tốt' : avgScore >= 5 ? 'Trung bình' : 'Cần cải thiện'}</p>
                </div>

                {/* Pass rate */}
                <div className={`${card} border-l-4 ${metricBorder(passRate, 70, 50)}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Tỉ lệ đạt (≥ 5.0)</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metricBg(passRate, 70, 50)}`}>
                            <Lightning className={`w-4 h-4 ${metricColor(passRate, 70, 50)}`} weight="bold" />
                        </div>
                    </div>
                    <p className={`text-2xl font-extrabold ${metricColor(passRate, 70, 50)}`}>
                        {passRate.toFixed(1)}<span className={`text-sm font-semibold ${sub}`}>%</span>
                    </p>
                    <p className={`text-xs mt-1 ${sub}`}>{passRate >= 70 ? 'Xuất sắc' : passRate >= 50 ? 'Cần chú ý' : 'Nhiều học sinh yếu'}</p>
                </div>

                {/* Completion rate */}
                <div className={`${card} border-l-4 ${metricBorder(completionRate, 80, 50)}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Tỉ lệ hoàn thành</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metricBg(completionRate, 80, 50)}`}>
                            <Clock className={`w-4 h-4 ${metricColor(completionRate, 80, 50)}`} weight="bold" />
                        </div>
                    </div>
                    <p className={`text-2xl font-extrabold ${metricColor(completionRate, 80, 50)}`}>
                        {completionRate.toFixed(1)}<span className={`text-sm font-semibold ${sub}`}>%</span>
                    </p>
                    <p className={`text-xs mt-1 ${sub}`}>{completionRate >= 80 ? 'Hoàn thành tốt' : completionRate >= 50 ? 'Đang tiến hành' : 'Thấp bất thường'}</p>
                </div>
            </div>

            {/* ── 2. Analytics: Chart (70%) + Submission Status (30%) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
                {/* Score distribution */}
                <div className={`${card} lg:col-span-7`}>
                    <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                        <div>
                            <h3 className={`font-extrabold text-base ${txt}`}>Phân bố điểm</h3>
                            <p className={`text-xs mt-0.5 ${sub}`}>Dựa trên {submittedCount} bài đã nộp</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${insightCls}`}>
                            {failRate >= 50 ? '⚠ ' : '✓ '}{insightText}
                        </span>
                    </div>

                    <div className="h-52 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData} margin={{ top: 16, right: 12, left: -10, bottom: 4 }} barCategoryGap="40%">
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 13, fontWeight: 700 }}
                                    axisLine={false} tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: isDark ? '#9ca3af' : '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: isDark ? '#334155' : '#e5e7eb' }}
                                    tickLine={false}
                                    width={28}
                                />
                                <Tooltip
                                    cursor={{ fill: isDark ? '#ffffff08' : '#1A1A1A05' }}
                                    formatter={(value: number, _name: string, props: any) => [
                                        `${value} học sinh (${props.payload?.pct ?? 0}%)`,
                                        props.payload?.sublabel ?? 'Số lượng',
                                    ]}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
                                        background: isDark ? '#1e2530' : '#fff',
                                        color: isDark ? '#e5e7eb' : '#111',
                                        fontSize: 12,
                                    }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {distributionData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                    <LabelList
                                        dataKey="count"
                                        position="top"
                                        fill={isDark ? '#e5e7eb' : '#374151'}
                                        fontSize={13}
                                        fontWeight={700}
                                        formatter={(value: number) => value > 0 ? value : ''}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex items-center gap-5 mt-2 justify-center flex-wrap">
                        {distributionData.map(d => (
                            <div key={d.label} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                                <span className={`text-xs font-semibold ${sub}`}>{d.label} · {d.sublabel} · {d.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submission status */}
                <div className={`${card} lg:col-span-3`}>
                    <h3 className={`font-extrabold text-base mb-5 ${txt}`}>Trạng thái nộp bài</h3>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-sm font-semibold ${txt}`}>Nộp đúng hạn</span>
                                <span className="text-sm font-extrabold text-green-600">{onTimeCount}</span>
                            </div>
                            <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                <div className="h-2.5 rounded-full bg-green-500 transition-all" style={{ width: `${totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0}%` }} />
                            </div>
                            <p className={`text-xs mt-1 ${sub}`}>{totalCount > 0 ? Math.round(onTimeCount / totalCount * 100) : 0}% sĩ số</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-sm font-semibold ${txt}`}>Nộp muộn</span>
                                <span className="text-sm font-extrabold text-yellow-600">{lateCount}</span>
                            </div>
                            <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                <div className="h-2.5 rounded-full bg-yellow-500 transition-all" style={{ width: `${totalCount > 0 ? (lateCount / totalCount) * 100 : 0}%` }} />
                            </div>
                            <p className={`text-xs mt-1 ${sub}`}>{totalCount > 0 ? Math.round(lateCount / totalCount * 100) : 0}% sĩ số</p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className={`text-sm font-semibold ${txt}`}>{assignmentDetail?.assignmentType === 'ASSIGNMENT' ? 'Chưa nộp' : 'Chưa làm'}</span>
                                <span className="text-sm font-extrabold text-red-500">{missingCount}</span>
                            </div>
                            <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                <div className="h-2.5 rounded-full bg-red-500 transition-all" style={{ width: `${totalCount > 0 ? (missingCount / totalCount) * 100 : 0}%` }} />
                            </div>
                            <p className={`text-xs mt-1 ${sub}`}>{totalCount > 0 ? Math.round(missingCount / totalCount * 100) : 0}% sĩ số</p>
                        </div>
                    </div>

                    <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'} space-y-1.5`}>
                        <div className="flex justify-between text-xs">
                            <span className={sub}>Tổng sĩ số</span>
                            <span className={`font-extrabold ${txt}`}>{totalCount} học sinh</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className={sub}>Đã nộp</span>
                            <span className="font-extrabold text-green-600">{submittedCount} ({Math.round(submRatio * 100)}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 3. Student Results Table ── */}
            <div className={card}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className={`font-extrabold text-base ${txt}`}>Bảng điểm học sinh</h3>
                    <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        {([
                            { key: 'all', label: 'Tất cả', count: report.studentResults.length },
                            { key: 'submitted', label: 'Đã nộp', count: onTimeCount + lateCount },
                            { key: 'missing', label: assignmentDetail?.assignmentType === 'ASSIGNMENT' ? 'Chưa nộp' : 'Chưa làm', count: missingCount },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setTableFilter(tab.key)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${tableFilter === tab.key
                                    ? 'bg-[#FF6B4A] text-white shadow-sm'
                                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={`text-xs font-extrabold uppercase tracking-wider ${sub} border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                                <th className="text-left pb-3 pr-4">STT</th>
                                <th className="text-left pb-3 pr-4">Họ tên</th>
                                <th className="text-center pb-3 pr-4">Điểm</th>
                                <th className="text-center pb-3 pr-4">Thời gian</th>
                                <th className="text-center pb-3 pr-4">Trạng thái</th>
                                <th className="text-center pb-3 px-4">Nộp lúc</th>
                                <th className="text-center pb-3 pr-4">Vi phạm</th>
                                <th className="text-center pb-3">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                            {filteredStudents.map(({ student: s, displayStatus }, i) => {
                                const isSubmitted = displayStatus === 'ON_TIME' || displayStatus === 'LATE';
                                const isMissing = displayStatus === 'MISSING';
                                const isLate = displayStatus === 'LATE';
                                const isInProgress = displayStatus === 'IN_PROGRESS';
                                const rowBg = isMissing
                                    ? (isDark ? 'bg-red-900/10' : 'bg-red-50/40')
                                    : isInProgress
                                        ? (isDark ? 'bg-blue-900/10' : 'bg-blue-50/35')
                                    : isLate
                                        ? (isDark ? 'bg-yellow-900/10' : 'bg-yellow-50/30')
                                        : '';
                                const scoreVal = Number(s.score ?? 0);
                                const scoreColor = !isSubmitted ? (isMissing ? 'text-red-500' : 'text-slate-500') : scoreVal >= 8 ? 'text-green-600' : scoreVal >= 5 ? 'text-yellow-600' : 'text-red-500';
                                return (
                                    <tr key={`${s.userId}-${s.submissionId ?? 'missing'}`} className={`${rowBg} transition-colors`}>
                                        <td className={`py-2.5 pr-4 font-bold ${sub}`}>{i + 1}</td>
                                        <td className={`py-2.5 pr-4 font-bold ${isMissing ? 'text-red-500' : txt}`}>{s.studentName}</td>
                                        <td className={`py-2.5 pr-4 text-center font-extrabold ${scoreColor}`}>
                                            {!isSubmitted ? '—' : (s.score?.toFixed(2) ?? '0.00')}
                                        </td>
                                        <td className={`py-2.5 pr-4 text-center font-semibold ${sub}`}>
                                            {!isSubmitted ? 'N/A' : (s.timeTaken ? `${Math.floor(s.timeTaken / 60)}:${String(s.timeTaken % 60).padStart(2, '0')}` : '—')}
                                        </td>
                                        <td className="py-2.5 pr-4 text-center">
                                            <span className={`inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${getSubmissionTimingTag(displayStatus, assignmentDetail?.assignmentType).cls}`}>
                                                {getSubmissionTimingTag(displayStatus, assignmentDetail?.assignmentType).label}
                                            </span>
                                        </td>
                                        <td className={`py-2.5 px-4 text-center font-semibold ${sub}`}>
                                            {!isSubmitted ? 'N/A' : s.submitTime ? (
                                                <span title={formatDeadline(s.submitTime)}>{formatRelativeTime(s.submitTime)}</span>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="py-2.5 pr-4 text-center">
                                            {isSubmitted && (s.violationCount ?? 0) > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-xl bg-red-100 text-red-700 border border-red-300">
                                                    <ShieldWarning className="w-3.5 h-3.5" weight="fill" />
                                                    {s.violationCount}
                                                </span>
                                            ) : (
                                                <span className={`text-[11px] font-semibold ${sub}`}>{isSubmitted ? '0' : 'N/A'}</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 text-center">
                                            {isSubmitted && (
                                                <button
                                                    onClick={() => s.submissionId && handleViewSubmission(s.submissionId)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-[#FF6B4A]/30 text-[#d64b2e] hover:bg-[#FF6B4A]/10 transition-colors"
                                                    title="Xem chi tiết bài làm"
                                                >
                                                    {submissionLoadingId === s.submissionId ? (
                                                        <span className="text-[10px] font-bold">...</span>
                                                    ) : (
                                                        <Eye className="w-4 h-4" weight="bold" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr><td colSpan={8} className={`py-10 text-center font-bold ${sub}`}>
                                    {tableFilter === 'missing' ? 'Tất cả học sinh đã nộp bài!' : 'Chưa có dữ liệu'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 4. Question Analysis ── */}
            <div className={card}>
                <h3 className={`font-extrabold text-base mb-4 ${txt}`}>
                    Phân tích câu hỏi{' '}
                    <span className={`text-xs font-semibold ${sub}`}>(Dễ nhất → Khó nhất)</span>
                </h3>
                <div className="space-y-3">
                    {questionAnalysis.map((qs, i) => {
                        const isFirst = i === 0;
                        const isLast = i === questionAnalysis.length - 1;
                        const optionBreakdown = (qs.options ?? []).slice().sort((a, b) => (a.optionLabel ?? '').localeCompare(b.optionLabel ?? ''));
                        const maxOptionCount = Math.max(1, ...optionBreakdown.map(opt => opt.selectedCount ?? 0));
                        const isExpanded = Boolean(expandedDistractors[qs.questionId]);
                        return (
                            <div key={qs.questionId} className={`rounded-xl p-4 border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                                    <div className={`text-sm font-bold flex-1 min-w-0 ${txt}`}>
                                        <span className={`mr-2 text-xs font-semibold ${sub}`}>Câu {i + 1}</span>
                                        <span className="break-words line-clamp-2">
                                            <MathRenderer content={qs.questionText} />
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                        {isFirst && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Dễ nhất</span>}
                                        {isLast && !isFirst && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Khó nhất</span>}
                                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-xl border ${getDifficultyTagClass(qs.difficultyLevel)}`}>
                                            {DIFF_MAP[qs.difficultyLevel] ?? '—'}
                                        </span>
                                        <span className={`text-sm font-extrabold ${qs.accuracyRate >= 70 ? 'text-green-600' : qs.accuracyRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                            {qs.accuracyRate?.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-full rounded-full h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                    <div className={`h-2 rounded-full transition-all ${getAccuracyColorClass(qs.accuracyRate)}`} style={{ width: `${qs.accuracyRate}%` }} />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                    <p className={`text-xs font-semibold ${sub}`}>{qs.correctCount}/{qs.totalAnswered} đúng</p>
                                    {optionBreakdown.length > 0 && (
                                        <button
                                            onClick={() => setExpandedDistractors(prev => ({ ...prev, [qs.questionId]: !prev[qs.questionId] }))}
                                            className="text-xs font-bold px-2.5 py-1 rounded-xl border border-[#FF6B4A]/30 text-[#d64b2e] hover:bg-[#FF6B4A]/10 transition-colors"
                                        >
                                            {isExpanded ? 'Ẩn phân tích' : 'Phân tích lựa chọn'}
                                        </button>
                                    )}
                                </div>
                                {isExpanded && optionBreakdown.length > 0 && (
                                    <div className={`mt-3 rounded-xl border p-3 space-y-2 ${isDark ? 'border-white/10' : 'border-gray-200 bg-white'}`}>
                                        {optionBreakdown.map(opt => (
                                            <div key={opt.optionId}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className={`text-xs font-semibold ${txt}`}>
                                                        {opt.optionLabel}. <MathRenderer content={opt.optionContent} />
                                                        {opt.isCorrect && <span className="ml-1 text-green-600 font-bold"> (Đúng)</span>}
                                                    </div>
                                                    <span className={`text-xs font-bold shrink-0 ${sub}`}>{opt.selectedCount} lượt</span>
                                                </div>
                                                <div className={`mt-1 w-full rounded-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                    <div
                                                        className={`h-1.5 rounded-full ${opt.isCorrect ? 'bg-green-500' : 'bg-[#FF6B4A]'}`}
                                                        style={{ width: `${((opt.selectedCount ?? 0) / maxOptionCount) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {questionAnalysis.length === 0 && (
                        <p className={`text-center py-6 font-bold ${sub}`}>Chưa có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* ── Submission Detail Modal ── */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-6xl h-[85vh] rounded-2xl border shadow-2xl flex flex-col md:flex-row overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-gray-200'}`}>
                        {(() => {
                            const correctAnswerByQuestionId = new Map(
                                questionAnalysis.map(q => {
                                    const correctOpt = q.options?.find(opt => opt.isCorrect);
                                    const correctAnswer = correctOpt
                                        ? `${correctOpt.optionLabel}. ${correctOpt.optionContent}`
                                        : 'Chưa có đáp án đúng';
                                    return [q.questionId, correctAnswer] as const;
                                })
                            );
                            const detailItems = (selectedSubmission.answers ?? []).map((ans, idx) => ({
                                ...ans,
                                order: idx + 1,
                                correctAnswer: correctAnswerByQuestionId.get(ans.questionId) ?? 'Chưa có đáp án đúng',
                            }));
                            const wrongCount = detailItems.filter(item => !item.isCorrect).length;
                            const filteredItems = detailFilter === 'wrong'
                                ? detailItems.filter(item => !item.isCorrect)
                                : detailItems;

                            return (
                                <>
                                    {/* Left Column (2/3 width) */}
                                    <div className="flex-1 flex flex-col md:w-2/3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/10 h-full overflow-hidden">
                                        <div className="p-6 pb-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className={`text-xl font-extrabold ${txt}`}>Chi tiết bài làm - {selectedSubmission.studentName}</h4>
                                                    <p className={`text-sm mt-1 font-semibold ${sub}`}>
                                                        Điểm {selectedSubmission.score?.toFixed(2) ?? '0.00'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedSubmission(null)}
                                                    className="md:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                                >
                                                    <XCircle className="w-7 h-7 text-gray-400" />
                                                </button>
                                            </div>

                                            <div className={`mt-5 flex items-center gap-1 p-1 rounded-xl w-fit ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                <button
                                                    onClick={() => setDetailFilter('all')}
                                                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${detailFilter === 'all'
                                                        ? 'bg-[#FF6B4A] text-white shadow-sm'
                                                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                                                >
                                                    Tất cả ({detailItems.length})
                                                </button>
                                                <button
                                                    onClick={() => setDetailFilter('wrong')}
                                                    className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${detailFilter === 'wrong'
                                                        ? 'bg-[#FF6B4A] text-white shadow-sm'
                                                        : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                                                >
                                                    Câu sai ({wrongCount})
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                            {filteredItems.length ? filteredItems.map((ans) => (
                                                <div key={`${ans.questionId}-${ans.order}`} className={`rounded-xl border p-5 bg-white dark:bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200 shadow-sm'}`}>
                                                    <div className={`text-sm font-bold mb-4 leading-relaxed ${txt}`}>
                                                        Câu {ans.order}: <MathRenderer content={ans.questionText} />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className={`text-sm font-semibold flex items-start gap-2 ${ans.isCorrect ? 'text-green-600' : 'text-[#FF6B4A]'}`}>
                                                            {ans.isCorrect ? <CheckCircle weight="fill" className="w-5 h-5 mt-0.5 shrink-0" /> : <XCircle weight="fill" className="w-5 h-5 mt-0.5 shrink-0" />}
                                                            <div>
                                                                <span className="opacity-80 font-medium mr-1">{ans.isCorrect ? 'Đúng' : 'Sai'} · Đã chọn:</span>
                                                                <MathRenderer content={ans.selectedAnswer ?? 'Chưa trả lời'} />
                                                            </div>
                                                        </div>
                                                        {!ans.isCorrect && (
                                                            <div className="text-sm font-semibold flex items-start gap-2 text-green-700 bg-green-50/60 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 p-3 rounded-xl mt-2">
                                                                <CheckCircle weight="fill" className="w-5 h-5 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <span className="opacity-80 font-medium mr-1">Đáp án đúng:</span>
                                                                    <MathRenderer content={ans.correctAnswer} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className={`text-sm py-10 text-center font-semibold ${sub}`}>
                                                    {detailFilter === 'wrong'
                                                        ? 'Học sinh không có câu trả lời sai.'
                                                        : 'Bài nộp này chưa có dữ liệu câu trả lời.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column (1/3 width) */}
                                    <div className="md:w-1/3 flex flex-col h-full bg-[#fafafa] dark:bg-black/20">
                                        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-start justify-between">
                                            <div>
                                                <h4 className={`text-lg font-extrabold ${txt}`}>{selectedSubmission.studentName}</h4>
                                                <p className={`text-sm mt-1 font-semibold ${sub}`}>
                                                    Nộp lúc: {selectedSubmission.submitTime ? new Date(selectedSubmission.submitTime).toLocaleString('vi-VN', { timeStyle: 'short', dateStyle: 'short' }) : 'N/A'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedSubmission(null)}
                                                className="hidden md:block p-2 -mr-2 -mt-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <XCircle className="w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" />
                                            </button>
                                        </div>
                                        
                                        <div className="p-6 pb-0">
                                            <div className={`rounded-2xl p-6 text-center border ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-gray-200'} shadow-sm`}>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${sub}`}>Điểm bài thi</p>
                                                <p className={`text-5xl font-black ${(selectedSubmission.score || 0) >= 5 ? 'text-green-500' : 'text-[#FF6B4A]'}`}>
                                                    {selectedSubmission.score?.toFixed(2) ?? '0.00'} <span className="text-xl font-bold opacity-30">/ 10</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-hidden p-6">
                                            <TeacherFeedbackForm 
                                                submission={selectedSubmission} 
                                                isDark={isDark} 
                                                onDownloadPdf={handleDownloadDetailPdf} 
                                            />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TeacherMakeTest() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const location = useLocation();
    const [view, setView] = useState<View>('dashboard');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Auto-open detail view when navigated from dashboard with a specific assignment ID
    useEffect(() => {
        const openDetailId = (location.state as { openDetailId?: number } | null)?.openDetailId;
        if (openDetailId) {
            setSelectedId(openDetailId);
            setView('detail');
            // Clear state so going back doesn't re-trigger
            window.history.replaceState({}, '', location.pathname);
        }
    }, []);

    const goDetail = (a: AssignmentResponse) => { setSelectedId(a.assignmentID); setView('detail'); };
    const goReport = (id: number) => { setSelectedId(id); setView('report'); };
    const goBack = () => { setSelectedId(null); setView('dashboard'); };
    const goCreate = () => setView('create');

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';

    const BREADCRUMB: Record<View, string> = {
        dashboard: 'Tổng quan',
        create: 'Tạo đề mới',
        detail: 'Chi tiết đề',
        report: 'Báo cáo',
    };

    const breadcrumbItems: Array<{ key: View | 'root'; label: string; active: boolean; onClick?: () => void }> = [
        {
            key: 'root',
            label: 'Đề kiểm tra',
            active: view === 'dashboard',
            onClick: view === 'dashboard' ? undefined : goBack,
        },
    ];

    if (view !== 'dashboard') {
        breadcrumbItems.push({
            key: view,
            label: BREADCRUMB[view],
            active: true,
        });
    }

    return (
        <div className={`min-h-screen pb-8 ${isDark ? 'bg-[#11151d]' : 'bg-[#F7F7F2]'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <header className={`border-b-2 px-8 py-3 flex items-center justify-between sticky top-0 z-20 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]/10'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#20242b]' : 'bg-[#1A1A1A]'}`}>
                        <span className="text-white font-extrabold text-base">M</span>
                    </div>
                    <h2 className={`font-extrabold text-lg ${txt}`}>SmartTest <span className={`font-bold ${sub}`}>Builder</span></h2>
                </div>
                <nav className="hidden md:flex items-center gap-2">
                    {[
                        { label: 'Tổng quan', icon: <SquaresFour className="w-4 h-4" />, v: 'dashboard' as View },
                        { label: 'Báo cáo', icon: <ChartBar className="w-4 h-4" />, v: 'report' as View },
                    ].map(item => (
                        <button key={item.v} onClick={() => { if (item.v === 'report' && selectedId) goReport(selectedId); else setView(item.v as View); }}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold rounded-2xl transition-colors ${view === item.v
                                ? isDark ? 'bg-white/10 text-gray-100' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]'
                                : isDark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/10' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                            {item.icon}{item.label}
                        </button>
                    ))}
                    <button onClick={goCreate}
                        className="ml-2 flex items-center gap-1.5 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-4 h-9 rounded-2xl text-sm transition-colors">
                        <Plus className="w-4 h-4" />Tạo mới
                    </button>
                </nav>
            </header>

            <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
                {/* Breadcrumb + back */}
                <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {breadcrumbItems.map((item, idx) => (
                            <div key={item.key} className="flex items-center gap-1.5">
                                {item.onClick ? (
                                    <button
                                        onClick={item.onClick}
                                        className={`text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-xl border transition-colors ${isDark
                                            ? 'border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                                            : 'border-[#1A1A1A]/15 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}
                                    >
                                        {item.label}
                                    </button>
                                ) : (
                                    <span
                                        aria-current={item.active ? 'page' : undefined}
                                        className={`text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-xl border ${item.active
                                            ? isDark ? 'border-[#FF6B4A]/60 bg-[#FF6B4A]/20 text-[#FFB8A8]' : 'border-[#FF6B4A]/40 bg-[#FF6B4A]/10 text-[#d64b2e]'
                                            : isDark ? 'border-white/10 text-gray-300' : 'border-[#1A1A1A]/15 text-[#1A1A1A]/60'}`}
                                    >
                                        {item.label}
                                    </span>
                                )}
                                {idx < breadcrumbItems.length - 1 && <span className={`text-xs font-extrabold ${sub}`}>/</span>}
                            </div>
                        ))}
                    </div>
                    <h1 className={`text-3xl font-extrabold mt-1 ${txt}`}>{BREADCRUMB[view]}</h1>
                </div>

                {view === 'dashboard' && (
                    <Dashboard isDark={isDark} onCreateClick={goCreate} onDetailClick={goDetail} onReportClick={goReport} />
                )}
                {view === 'create' && (
                    <CreateTest isDark={isDark} onSaved={goBack} />
                )}
                {view === 'detail' && selectedId && (
                    <DetailView id={selectedId} isDark={isDark} onReport={() => goReport(selectedId)} onDeleted={goBack} />
                )}
                {view === 'report' && selectedId && (
                    <ReportView id={selectedId} isDark={isDark} />
                )}
            </div>
        </div>
    );
}
