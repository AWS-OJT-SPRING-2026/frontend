import { useState, useEffect, useCallback } from 'react';
import {
    CalendarBlank, Lightning, Eye, Trash, PaperPlaneTilt,
    Plus, SquaresFour, ChartBar, Clock,
    BookOpen, Warning, ArrowsClockwise, Users
} from '@phosphor-icons/react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSettings } from '../../context/SettingsContext';
import { assignmentService, AssignmentResponse, AssignmentDetailResponse, AssignmentReportResponse, QuestionPreviewResponse, QuestionBankResponse, SubmissionResponse } from '../../services/assignmentService';
import { authService } from '../../services/authService';
import { classroomService } from '../../services/classroomService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell } from 'recharts';

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

function formatDeadline(dt: string | null) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dt: string | null) {
    if (!dt) return 'Chưa nộp';
    const target = new Date(dt);
    if (Number.isNaN(target.getTime())) return formatDeadline(dt);

    const diffMs = Date.now() - target.getTime();
    const absMs = Math.abs(diffMs);
    if (absMs < 60_000) return 'Vừa xong';

    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    if (absMs < 3_600_000) return rtf.format(-Math.round(diffMs / 60_000), 'minute');
    if (absMs < 86_400_000) return rtf.format(-Math.round(diffMs / 3_600_000), 'hour');
    return rtf.format(-Math.round(diffMs / 86_400_000), 'day');
}

function getSubmissionTimingTag(status?: 'ON_TIME' | 'LATE' | 'MISSING' | null) {
    if (status === 'ON_TIME') return { label: 'Nộp đúng hạn', cls: 'bg-green-50 text-green-700 border-green-200' };
    if (status === 'LATE') return { label: 'Nộp muộn', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { label: 'Không nộp', cls: 'bg-red-50 text-red-700 border-red-200' };
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
                    <p className={`font-extrabold mb-5 leading-relaxed ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{q.questionText}</p>
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
                                        {ans.content}
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
    const [format, setFormat] = useState<'MULTIPLE_CHOICE' | 'ESSAY'>('MULTIPLE_CHOICE');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [deadline, setDeadline] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('30');
    const [bankId, setBankId] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('');
    const [limit, setLimit] = useState('10');
    const [questions, setQuestions] = useState<(QuestionPreviewResponse | null)[]>([]);
    const [loadingQ, setLoadingQ] = useState(false);
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

    const fetchRandomQuestions = async () => {
        const token = authService.getToken();
        if (!token) return;
        setLoadingQ(true);
        setError('');
        try {
            const data = await assignmentService.getRandomQuestions({
                bankId: bankId && bankId !== 'all' ? Number(bankId) : undefined,
                difficultyLevel: difficultyLevel && difficultyLevel !== 'all' ? Number(difficultyLevel) : undefined,
                limit: Number(limit) || 10,
            }, token);
            setQuestions(data);
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
                bankId: bankId && bankId !== 'all' ? Number(bankId) : undefined,
                difficultyLevel: difficultyLevel && difficultyLevel !== 'all' ? Number(difficultyLevel) : undefined,
                limit: 5,
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
                format,
                startTime: assignmentType === 'TEST' ? toLocalDateTime(startTime) : null,
                endTime: assignmentType === 'TEST' ? toLocalDateTime(endTime) : null,
                deadline: assignmentType === 'ASSIGNMENT' ? toLocalDateTime(deadline) : null,
                durationMinutes: Number(durationMinutes),
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                    <div>
                        <p className={label}>Hình thức</p>
                        <div className={`flex border-2 p-1 rounded-2xl h-11 gap-1 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/10'}`}>
                            {[['MULTIPLE_CHOICE', 'Trắc nghiệm'], ['ESSAY', 'Tự luận']].map(([v, l]) => (
                                <button key={v} onClick={() => setFormat(v as 'MULTIPLE_CHOICE' | 'ESSAY')}
                                    className={`flex-1 text-xs font-extrabold rounded-xl transition-all ${format === v ? 'bg-[#FF6B4A] text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-gray-100' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <p className={label}>Ngân hàng câu hỏi</p>
                        <Select value={bankId} onValueChange={setBankId}>
                            <SelectTrigger className={inp}><SelectValue placeholder="Tất cả ngân hàng" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả ngân hàng</SelectItem>
                                {banks.map(b => (
                                    <SelectItem key={b.id} value={String(b.id)}>{b.bankName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                <div className="flex justify-center pt-2">
                    <button onClick={fetchRandomQuestions} disabled={loadingQ}
                        className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold h-12 px-8 rounded-2xl shadow-md transition-colors text-base disabled:opacity-60">
                        <Lightning className="w-5 h-5" weight="fill" />
                        {loadingQ ? 'Đang tạo...' : 'Tạo đề tự động'}
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
                                            <Input type="datetime-local" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'} />
                                        ) : (
                                            <Input readOnly value={formatDeadline(detail.startTime || '')} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                        )}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Thời gian kết thúc</p>
                                        {isEditing ? (
                                            <Input type="datetime-local" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'} />
                                        ) : (
                                            <Input readOnly value={formatDeadline(detail.endTime || '')} className={isDark ? 'bg-[#20242b] border-white/10 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/15'} />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="md:col-span-2">
                                    <p className={`text-xs font-extrabold mb-1.5 ${sub}`}>Hạn nộp</p>
                                    {isEditing ? (
                                        <Input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className={isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'} />
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

// ─── Report View ──────────────────────────────────────────────────────────────
function ReportView({ id, isDark }: { id: number; isDark: boolean }) {
    const [report, setReport] = useState<AssignmentReportResponse | null>(null);
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
        assignmentService.getReport(id, token)
            .then(r => setReport(r))
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

    const isMissingStudent = (student: AssignmentReportResponse['studentResults'][number]) => {
        if (student.submissionTimingStatus === 'MISSING') return true;
        if (student.submissionStatus === 'MISSING') return true;
        if (!student.submissionId && !student.submitTime) return true;
        return false;
    };

    const onTimeCount = report.studentResults.filter(s => s.submissionTimingStatus === 'ON_TIME').length;
    const lateCount = report.studentResults.filter(s => s.submissionTimingStatus === 'LATE').length;
    const missingCount = report.studentResults.filter(isMissingStudent).length;

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

    const filteredStudents = report.studentResults.filter(s => {
        if (tableFilter === 'submitted') return s.submissionTimingStatus === 'ON_TIME' || s.submissionTimingStatus === 'LATE';
        if (tableFilter === 'missing') return isMissingStudent(s);
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
                                <span className={`text-sm font-semibold ${txt}`}>Chưa nộp</span>
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
                            { key: 'missing', label: 'Chưa nộp', count: missingCount },
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
                                <th className="text-center pb-3">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                            {filteredStudents.map((s, i) => {
                                const isMissing = isMissingStudent(s);
                                const isLate = s.submissionTimingStatus === 'LATE';
                                const rowBg = isMissing
                                    ? (isDark ? 'bg-red-900/10' : 'bg-red-50/40')
                                    : isLate
                                        ? (isDark ? 'bg-yellow-900/10' : 'bg-yellow-50/30')
                                        : '';
                                const scoreVal = Number(s.score ?? 0);
                                const scoreColor = isMissing ? 'text-red-500' : scoreVal >= 8 ? 'text-green-600' : scoreVal >= 5 ? 'text-yellow-600' : 'text-red-500';
                                return (
                                    <tr key={`${s.userId}-${s.submissionId ?? 'missing'}`} className={`${rowBg} transition-colors`}>
                                        <td className={`py-2.5 pr-4 font-bold ${sub}`}>{i + 1}</td>
                                        <td className={`py-2.5 pr-4 font-bold ${isMissing ? 'text-red-500' : txt}`}>{s.studentName}</td>
                                        <td className={`py-2.5 pr-4 text-center font-extrabold ${scoreColor}`}>
                                            {isMissing ? '—' : (s.score?.toFixed(2) ?? '0.00')}
                                        </td>
                                        <td className={`py-2.5 pr-4 text-center font-semibold ${sub}`}>
                                            {isMissing ? 'N/A' : (s.timeTaken ? `${Math.floor(s.timeTaken / 60)}:${String(s.timeTaken % 60).padStart(2, '0')}` : '—')}
                                        </td>
                                        <td className="py-2.5 pr-4 text-center">
                                            <span className={`inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-xl border ${getSubmissionTimingTag(s.submissionTimingStatus).cls}`}>
                                                {getSubmissionTimingTag(s.submissionTimingStatus).label}
                                            </span>
                                        </td>
                                        <td className={`py-2.5 px-4 text-center font-semibold ${sub}`}>
                                            {isMissing ? 'N/A' : s.submitTime ? (
                                                <span title={formatDeadline(s.submitTime)}>{formatRelativeTime(s.submitTime)}</span>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="py-2.5 text-center">
                                            {!isMissing && (
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
                                <tr><td colSpan={7} className={`py-10 text-center font-bold ${sub}`}>
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
                                    <p className={`text-sm font-bold flex-1 min-w-0 ${txt}`}>
                                        <span className={`mr-2 text-xs font-semibold ${sub}`}>Câu {i + 1}</span>
                                        {qs.questionText.length > 100 ? qs.questionText.slice(0, 100) + '…' : qs.questionText}
                                    </p>
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
                                                    <p className={`text-xs font-semibold ${txt}`}>
                                                        {opt.optionLabel}. {opt.optionContent}
                                                        {opt.isCorrect && <span className="ml-1 text-green-600 font-bold"> (Đúng)</span>}
                                                    </p>
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
                    <div className={`w-full max-w-2xl rounded-2xl border p-5 shadow-2xl ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-gray-200'}`}>
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
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className={`text-base font-extrabold ${txt}`}>Chi tiết bài làm</h4>
                                            <p className={`text-xs mt-1 ${sub}`}>
                                                {selectedSubmission.studentName} · Điểm {selectedSubmission.score?.toFixed(2) ?? '0.00'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSubmission(null)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${isDark ? 'border-white/20 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            Đóng
                                        </button>
                                    </div>

                                    <div className={`mt-4 flex items-center gap-1 p-1 rounded-xl w-fit ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                        <button
                                            onClick={() => setDetailFilter('all')}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${detailFilter === 'all'
                                                ? 'bg-[#FF6B4A] text-white'
                                                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                                        >
                                            Tất cả ({detailItems.length})
                                        </button>
                                        <button
                                            onClick={() => setDetailFilter('wrong')}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${detailFilter === 'wrong'
                                                ? 'bg-[#FF6B4A] text-white'
                                                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}
                                        >
                                            Câu sai ({wrongCount})
                                        </button>
                                    </div>

                                    <div className="mt-4 max-h-[55vh] overflow-auto space-y-2">
                                        {filteredItems.length ? filteredItems.map((ans) => (
                                            <div key={`${ans.questionId}-${ans.order}`} className={`rounded-xl border p-3 ${ans.isCorrect
                                                ? (isDark ? 'border-green-900/50 bg-green-900/10' : 'border-green-200 bg-green-50/40')
                                                : (isDark ? 'border-red-900/50 bg-red-900/10' : 'border-red-200 bg-red-50/40')}`}>
                                                <p className={`text-xs font-bold mb-1 ${txt}`}>Câu {ans.order}: {ans.questionText}</p>
                                                <p className={`text-xs ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                    {ans.isCorrect ? '✓ Đúng' : '✗ Sai'} · Đã chọn: {ans.selectedAnswer ?? 'Chưa trả lời'}
                                                </p>
                                                {!ans.isCorrect && (
                                                    <div className="mt-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                                                        Đáp án đúng: {ans.correctAnswer}
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <p className={`text-sm py-6 text-center ${sub}`}>
                                                {detailFilter === 'wrong'
                                                    ? 'Học sinh không có câu trả lời sai.'
                                                    : 'Bài nộp này chưa có dữ liệu câu trả lời.'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={handleDownloadDetailPdf}
                                            className="text-xs font-extrabold px-4 py-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff5535] text-white transition-colors"
                                        >
                                            Tải kết quả (PDF)
                                        </button>
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
    const [view, setView] = useState<View>('dashboard');
    const [selectedId, setSelectedId] = useState<number | null>(null);

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
