import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Bell, BookOpen, ClipboardText, CalendarBlank, BookOpenText, Folders,
    Warning, Clock, X, PaperPlaneTilt,
} from '@phosphor-icons/react';
import { Bot } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { teacherDocumentService, type TeacherDocumentItem } from '../../services/teacherDocumentService';
import { timetableService, type TimetableItem } from '../../services/timetableService';
import { notificationService, type NotificationItem } from '../../services/notificationService';
import { assignmentService, type AssignmentResponse } from '../../services/assignmentService';
import { authService } from '../../services/authService';
import { cn } from '../../lib/utils';
import { parseVnDate } from '../../lib/timeUtils';

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        DRAFT: { label: 'Nháp', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
        ACTIVE: { label: 'Đang mở', cls: 'bg-green-100 text-green-700 border-green-300' },
        CLOSED: { label: 'Đã đóng', cls: 'bg-red-100 text-red-600 border-red-300' },
    };
    const info = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
    return (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${info.cls}`}>{info.label}</span>
    );
}

function formatTime(isoString: string): string {
    try {
        const d = parseVnDate(isoString);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function formatDate(isoString: string): string {
    try {
        const d = parseVnDate(isoString);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

export function TeacherDashboard() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [documents, setDocuments] = useState<TeacherDocumentItem[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<TimetableItem[]>([]);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadingSched, setLoadingSched] = useState(true);
    const [loadingNotifs, setLoadingNotifs] = useState(true);
    const [loadingTests, setLoadingTests] = useState(true);

    // Notification modal state (kept from previous dashboard)
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [useAiSuggestion, setUseAiSuggestion] = useState(true);
    const [notifyForm, setNotifyForm] = useState({
        title: '',
        content: '',
        classTarget: 'Tất cả lớp',
    });

    // Load data
    useEffect(() => {
        const token = authService.getToken();

        // Documents
        if (token) {
            teacherDocumentService.getDocuments(token)
                .then(setDocuments)
                .catch(() => {})
                .finally(() => setLoadingDocs(false));
        } else {
            setLoadingDocs(false);
        }

        // Today's schedule
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        timetableService.getTimetables(startOfDay, endOfDay)
            .then(setTodaySchedule)
            .catch(() => {})
            .finally(() => setLoadingSched(false));

        // Admin notifications (SYSTEM type)
        notificationService.getMyNotifications('SYSTEM')
            .then(setNotifications)
            .catch(() => {})
            .finally(() => setLoadingNotifs(false));

        // Tests
        if (token) {
            assignmentService.getMyAssignments(token)
                .then(setAssignments)
                .catch(() => {})
                .finally(() => setLoadingTests(false));
        } else {
            setLoadingTests(false);
        }
    }, []);

    const handleSendNotification = useCallback(() => {
        if (!notifyForm.title.trim() || !notifyForm.content.trim() || isSending) return;
        setIsSending(true);
        window.setTimeout(() => {
            setIsNotifyModalOpen(false);
            setIsSending(false);
            setNotifyForm({ title: '', content: '', classTarget: 'Tất cả lớp' });
        }, 800);
    }, [notifyForm, isSending]);

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const card = isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]/15';
    const sectionTitle = cn('text-lg font-extrabold mb-4 flex items-center gap-2', txt);

    const theoryDocs = documents.filter(d => d.doc_type === 'theory' || d.doc_type === 'THEORY');
    const questionDocs = documents.filter(d => d.doc_type === 'question' || d.doc_type === 'QUESTION');

    const overlayRoot = typeof document !== 'undefined' ? document.body : null;

    return (
        <div
            className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto"
            style={{ fontFamily: "'Nunito', sans-serif" }}
        >
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className={cn('text-xs font-extrabold uppercase tracking-widest mb-1', sub)}>
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <h1 className={cn('text-3xl font-extrabold', txt)}>Tổng quan</h1>
                </div>
                <button
                    onClick={() => setIsNotifyModalOpen(true)}
                    className={cn(
                        'flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm transition-colors',
                        isDark
                            ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]'
                            : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50',
                    )}
                >
                    <Bell size={16} /> Gửi thông báo cho cả lớp
                </button>
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left col: Documents + Tests */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Documents */}
                    <div className={cn('rounded-3xl border-2 p-6', card)}>
                        <h2 className={sectionTitle}>
                            <BookOpen size={20} weight="fill" className="text-[#FF6B4A]" />
                            Tài liệu đã tải lên
                        </h2>

                        {loadingDocs ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Đang tải...</div>
                        ) : documents.length === 0 ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Chưa có tài liệu nào.</div>
                        ) : (
                            <div className="space-y-3">
                                {/* Theory docs */}
                                {theoryDocs.length > 0 && (
                                    <div>
                                        <p className={cn('text-xs font-extrabold uppercase tracking-wider mb-2', sub)}>Lý thuyết (Giáo trình)</p>
                                        <div className="space-y-2">
                                            {theoryDocs.slice(0, 5).map(doc => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => navigate(`/teacher/curriculum/${doc.id}`)}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                                                        isDark
                                                            ? 'border-white/10 hover:border-[#FF6B4A]/50 hover:bg-[#FF6B4A]/5'
                                                            : 'border-[#1A1A1A]/10 hover:border-[#FF6B4A] hover:bg-orange-50/50',
                                                    )}
                                                >
                                                    <BookOpenText size={18} weight="fill" className="text-[#FF6B4A] shrink-0" />
                                                    <span className={cn('font-bold text-sm truncate flex-1', txt)}>{doc.book_name}</span>
                                                    <span className={cn('text-xs font-semibold shrink-0', sub)}>{doc.subject_name}</span>
                                                </button>
                                            ))}
                                            {theoryDocs.length > 5 && (
                                                <button onClick={() => navigate('/teacher/curriculum')} className={cn('text-xs font-bold', sub, 'hover:text-[#FF6B4A] transition-colors')}>
                                                    + {theoryDocs.length - 5} giáo trình khác →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Question bank docs */}
                                {questionDocs.length > 0 && (
                                    <div className={theoryDocs.length > 0 ? 'pt-3 mt-3 border-t ' + (isDark ? 'border-white/10' : 'border-[#1A1A1A]/10') : ''}>
                                        <p className={cn('text-xs font-extrabold uppercase tracking-wider mb-2', sub)}>Ngân hàng câu hỏi</p>
                                        <div className="space-y-2">
                                            {questionDocs.slice(0, 5).map(doc => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => navigate(`/teacher/question-banks/${doc.id}`)}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                                                        isDark
                                                            ? 'border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                                                            : 'border-[#1A1A1A]/10 hover:border-emerald-500 hover:bg-emerald-50/50',
                                                    )}
                                                >
                                                    <Folders size={18} weight="fill" className="text-emerald-500 shrink-0" />
                                                    <span className={cn('font-bold text-sm truncate flex-1', txt)}>{doc.book_name}</span>
                                                    <span className={cn('text-xs font-semibold shrink-0', sub)}>{doc.subject_name}</span>
                                                </button>
                                            ))}
                                            {questionDocs.length > 5 && (
                                                <button onClick={() => navigate('/teacher/question-banks')} className={cn('text-xs font-bold', sub, 'hover:text-emerald-500 transition-colors')}>
                                                    + {questionDocs.length - 5} ngân hàng khác →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tests list */}
                    <div className={cn('rounded-3xl border-2 p-6', card)}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className={cn('text-lg font-extrabold flex items-center gap-2', txt)}>
                                <ClipboardText size={20} weight="fill" className="text-[#B8B5FF]" />
                                Bài kiểm tra đã tạo
                            </h2>
                            <button onClick={() => navigate('/teacher/tests')} className={cn('text-xs font-bold hover:text-[#FF6B4A] transition-colors', sub)}>
                                Xem tất cả →
                            </button>
                        </div>

                        {loadingTests ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Đang tải...</div>
                        ) : assignments.length === 0 ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Chưa có bài kiểm tra nào.</div>
                        ) : (
                            <div className="space-y-2">
                                {assignments.slice(0, 6).map(a => (
                                    <button
                                        key={a.assignmentID}
                                        onClick={() => navigate('/teacher/tests', { state: { openDetailId: a.assignmentID } })}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                                            isDark
                                                ? 'border-white/10 hover:border-[#B8B5FF]/50 hover:bg-[#B8B5FF]/5'
                                                : 'border-[#1A1A1A]/10 hover:border-[#B8B5FF] hover:bg-purple-50/50',
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <StatusBadge status={a.status} />
                                                <span className={cn('font-extrabold text-sm truncate', txt)}>{a.title}</span>
                                            </div>
                                            <div className={cn('flex items-center gap-3 text-xs font-semibold', sub)}>
                                                <span>{a.className}</span>
                                                <span>•</span>
                                                <span>{a.totalSubmissions} lượt nộp</span>
                                                <span>•</span>
                                                <span>{formatDate(a.createdAt)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right col: Schedule + Notifications */}
                <div className="xl:col-span-1 space-y-6">

                    {/* Today's schedule */}
                    <div className={cn('rounded-3xl border-2 p-6', card)}>
                        <h2 className={sectionTitle}>
                            <CalendarBlank size={20} weight="fill" className="text-[#FCE38A]" />
                            Lịch dạy hôm nay
                        </h2>

                        {loadingSched ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Đang tải...</div>
                        ) : todaySchedule.length === 0 ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Không có lịch dạy hôm nay.</div>
                        ) : (
                            <div className="space-y-3">
                                {todaySchedule.map(item => {
                                    const now = new Date();
                                    const start = parseVnDate(item.startTime);
                                    const end = parseVnDate(item.endTime);
                                    const isOngoing = now >= start && now <= end;
                                    const isPast = now > end;

                                    return (
                                        <div
                                            key={item.timetableID}
                                            className={cn(
                                                'flex items-start gap-3 px-4 py-3 rounded-2xl border-2',
                                                isOngoing
                                                    ? isDark ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'
                                                    : isPast
                                                        ? isDark ? 'border-white/10 opacity-60' : 'border-gray-100 opacity-60'
                                                        : isDark ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-200 bg-yellow-50',
                                            )}
                                        >
                                            <div className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', isOngoing ? 'bg-green-500' : isPast ? 'bg-gray-400' : 'bg-yellow-500')} />
                                            <div className="flex-1 min-w-0">
                                                <p className={cn('font-extrabold text-sm truncate', txt)}>{item.subjectName}</p>
                                                <p className={cn('text-xs font-semibold', sub)}>{item.className}</p>
                                                <div className={cn('flex items-center gap-1 mt-1 text-xs font-bold', sub)}>
                                                    <Clock size={12} />
                                                    <span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span>
                                                </div>
                                            </div>
                                            {isOngoing && (
                                                <span className="text-[10px] font-extrabold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                                                    Đang dạy
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Admin notifications */}
                    <div className={cn('rounded-3xl border-2 p-6', card)}>
                        <h2 className={sectionTitle}>
                            <Warning size={20} weight="fill" className="text-[#FFB5B5]" />
                            Thông báo từ Admin
                        </h2>

                        {loadingNotifs ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Đang tải...</div>
                        ) : notifications.length === 0 ? (
                            <div className={cn('text-sm font-bold text-center py-6', sub)}>Không có thông báo mới.</div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.slice(0, 5).map(n => (
                                    <div
                                        key={n.notificationId}
                                        className={cn(
                                            'px-4 py-3 rounded-2xl border-2',
                                            !n.isRead
                                                ? isDark ? 'border-[#FF6B4A]/30 bg-[#FF6B4A]/5' : 'border-[#FF6B4A]/20 bg-orange-50/50'
                                                : isDark ? 'border-white/10' : 'border-[#1A1A1A]/10',
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#FF6B4A] mt-1.5 shrink-0" />}
                                            <div className="min-w-0">
                                                <p className={cn('font-extrabold text-sm leading-snug', txt)}>{n.title}</p>
                                                <p className={cn('text-xs font-semibold mt-0.5 line-clamp-2', sub)}>{n.content}</p>
                                                <p className={cn('text-[10px] font-bold mt-1', sub)}>{formatDate(n.createdAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Notify Modal ── */}
            {isNotifyModalOpen && overlayRoot && createPortal(
                <>
                    <div
                        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9998] bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsNotifyModalOpen(false)}
                    />
                    <div
                        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4"
                        onClick={() => setIsNotifyModalOpen(false)}
                    >
                        <div
                            className="w-full max-w-xl rounded-2xl bg-white border border-[#1A1A1A]/15 shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
                            onClick={e => e.stopPropagation()}
                            style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                            <div className="px-6 py-4 border-b border-[#1A1A1A]/10 flex items-center justify-between">
                                <h3 className="text-lg font-extrabold text-[#1A1A1A]">Gửi thông báo cho cả lớp</h3>
                                <button onClick={() => setIsNotifyModalOpen(false)} className="w-10 h-10 rounded-xl border border-[#1A1A1A]/15 hover:bg-gray-50 flex items-center justify-center">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                <label className="space-y-1.5 block">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80">Lớp nhận thông báo</span>
                                    <input
                                        value={notifyForm.classTarget}
                                        onChange={e => setNotifyForm(p => ({ ...p, classTarget: e.target.value }))}
                                        className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                        placeholder="Ví dụ: Tất cả lớp, 12A1, ..."
                                    />
                                </label>
                                <label className="space-y-1.5 block">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80">Tiêu đề</span>
                                    <input
                                        value={notifyForm.title}
                                        onChange={e => setNotifyForm(p => ({ ...p, title: e.target.value }))}
                                        className="h-10 w-full rounded-xl border border-[#1A1A1A]/20 px-3 text-sm font-semibold text-[#1A1A1A] outline-none focus:border-[#FF6B4A]"
                                        placeholder="Nhập tiêu đề thông báo"
                                    />
                                </label>
                                <label className="space-y-1.5 block">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80">Nội dung</span>
                                    <textarea
                                        rows={4}
                                        value={notifyForm.content}
                                        onChange={e => setNotifyForm(p => ({ ...p, content: e.target.value }))}
                                        className="w-full rounded-xl border border-[#1A1A1A]/20 px-3 py-2 text-sm font-semibold text-[#1A1A1A] outline-none resize-none focus:border-[#FF6B4A]"
                                        placeholder="Nhập nội dung gửi cho học sinh"
                                    />
                                </label>
                                <label className="flex items-center justify-between rounded-xl border border-[#1A1A1A]/10 px-3 py-2">
                                    <span className="text-sm font-bold text-[#1A1A1A]/80 inline-flex items-center gap-2">
                                        <Bot size={16} className="text-[#FF6B4A]" /> Gợi ý nội dung bằng AI
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setUseAiSuggestion(p => !p)}
                                        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${useAiSuggestion ? 'bg-[#FF6B4A]' : 'bg-[#1A1A1A]/20'}`}
                                    >
                                        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${useAiSuggestion ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </label>
                            </div>

                            <div className="px-6 py-4 border-t border-[#1A1A1A]/10 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsNotifyModalOpen(false)}
                                    className="h-10 px-5 rounded-xl border border-[#1A1A1A]/20 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSendNotification}
                                    disabled={isSending || !notifyForm.title.trim() || !notifyForm.content.trim()}
                                    className="h-10 px-5 rounded-xl bg-[#FF6B4A] text-white text-sm font-extrabold hover:bg-[#ff5535] transition-colors disabled:opacity-60 flex items-center gap-2"
                                >
                                    <PaperPlaneTilt size={14} weight="fill" />
                                    {isSending ? 'Đang gửi...' : 'Gửi thông báo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                overlayRoot,
            )}
        </div>
    );
}
