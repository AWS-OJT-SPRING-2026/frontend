import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
    BookOpen, Plus, MagnifyingGlass, Funnel, Clock, Trash,
    ArrowLeft, BookOpenText, GraduationCap, ListBullets, Warning, CaretRight,
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { teacherDocumentService, type TeacherDocumentItem, type BookChapter, type LessonContentItem } from '../../../services/teacherDocumentService';
import { authService } from '../../../services/authService';
import { useSettings } from '../../../context/SettingsContext';
import { cn } from '../../../lib/utils';

// ── Curriculum List ───────────────────────────────────────────────────────────

function CurriculumList() {
    const navigate = useNavigate();
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [documents, setDocuments] = useState<TeacherDocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);

    const fetchDocuments = async () => {
        try {
            const token = authService.getToken();
            if (!token) throw new Error('Vui lòng đăng nhập.');
            const docs = await teacherDocumentService.getDocuments(token);
            setDocuments(docs.filter(d => d.doc_type === 'theory' || d.doc_type === 'THEORY'));
        } catch (err: any) {
            setError(err.message || 'Không thể tải danh sách giáo trình.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDocuments(); }, []);

    const handleDelete = async (doc: TeacherDocumentItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Xóa giáo trình "${doc.book_name}"? Thao tác không thể hoàn tác.`)) return;
        const token = authService.getToken();
        if (!token) return;
        setDeleting(doc.id);
        try {
            await teacherDocumentService.deleteDocument('theory', doc.id, token);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (err: any) {
            alert(err.message || 'Lỗi xóa tài liệu');
        } finally {
            setDeleting(null);
        }
    };

    const filtered = documents.filter(d =>
        d.book_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const cardBase = isDark
        ? 'bg-[#171b20] border-white/10 hover:border-[#FF6B4A]/60'
        : 'bg-white border-[#1A1A1A]/15 hover:border-[#FF6B4A]';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                <div className="w-8 h-8 border-4 border-[#FF6B4A]/30 border-t-[#FF6B4A] rounded-full animate-spin" />
                <p className="font-bold">Đang tải danh sách giáo trình...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`border-2 rounded-[24px] p-6 flex flex-col items-center text-center ${isDark ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-100 text-red-500'}`}>
                <Warning size={28} className="mb-2" />
                <p className="font-extrabold text-lg mb-1">Đã xảy ra lỗi</p>
                <p className="text-sm font-bold opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={cn('text-2xl font-extrabold flex items-center gap-3', txt)}>
                        <BookOpen weight="fill" className="text-[#FF6B4A]" />
                        Quản lý Giáo trình
                    </h1>
                    <p className={cn('font-bold mt-1 text-sm', sub)}>
                        Các tài liệu lý thuyết bạn đã tải lên. Nhấp vào tài liệu để xem chương và bài học.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/teacher/documents')}
                    className="flex items-center gap-2 px-5 py-3 bg-[#FF6B4A] text-white rounded-2xl font-extrabold hover:bg-[#ff5535] transition-all hover:scale-[1.02] active:scale-95 text-sm"
                >
                    <Plus size={18} weight="bold" />
                    Tải lên giáo trình mới
                </button>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm giáo trình, môn học..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={cn(
                            'w-full border-2 rounded-2xl pl-11 pr-4 py-3 font-bold text-sm transition-all outline-none',
                            isDark
                                ? 'bg-[#20242b] border-white/15 text-gray-100 placeholder-gray-500 focus:border-[#FF6B4A]/60'
                                : 'bg-white border-gray-200 text-[#1A1A1A] focus:border-[#FF6B4A]'
                        )}
                    />
                </div>
                <button className={cn(
                    'flex items-center justify-center w-12 h-12 border-2 rounded-2xl transition-all',
                    isDark
                        ? 'bg-[#20242b] border-white/15 text-gray-400 hover:text-gray-100'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                )}>
                    <Funnel size={20} weight="bold" />
                </button>
            </div>

            {/* Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => navigate(`/teacher/curriculum/${doc.id}`)}
                            className={cn(
                                'group cursor-pointer border-2 rounded-[28px] overflow-hidden hover:shadow-xl hover:shadow-[#FF6B4A]/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col',
                                cardBase,
                            )}
                        >
                            <div className="p-6 pb-4 flex-1 flex flex-col gap-4">
                                <div className={cn(
                                    'w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300',
                                    isDark
                                        ? 'bg-[#FF6B4A]/20 text-[#FF6B4A] group-hover:bg-[#FF6B4A] group-hover:text-white'
                                        : 'bg-orange-50 text-[#FF6B4A] group-hover:bg-[#FF6B4A] group-hover:text-white'
                                )}>
                                    <BookOpenText size={32} weight="fill" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={cn('font-extrabold text-lg leading-tight line-clamp-2 mb-1 group-hover:text-[#FF6B4A] transition-colors', txt)}>
                                        {doc.book_name}
                                    </h3>
                                    <span className={cn('text-xs font-extrabold px-2.5 py-1 rounded-lg inline-block', isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600')}>
                                        {doc.subject_name}
                                    </span>
                                </div>
                            </div>
                            <div className={cn(
                                'px-6 py-4 mt-auto border-t flex items-center justify-between text-xs font-bold',
                                isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                            )}>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    <span>{new Date(doc.uploadDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                                <button
                                    onClick={e => handleDelete(doc, e)}
                                    disabled={deleting === doc.id}
                                    className="flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                    title="Xóa giáo trình"
                                >
                                    <Trash size={14} weight="fill" />
                                    <span>{deleting === doc.id ? '...' : 'Xóa'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={cn(
                    'border-2 border-dashed rounded-[40px] p-16 flex flex-col items-center justify-center text-center',
                    isDark ? 'border-white/10' : 'border-gray-200'
                )}>
                    <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mb-6', isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-50 text-gray-400')}>
                        <BookOpen size={40} weight="fill" />
                    </div>
                    <h3 className={cn('text-xl font-extrabold mb-3', txt)}>Chưa có giáo trình nào</h3>
                    <p className={cn('font-bold max-w-md text-sm', sub)}>
                        Bạn chưa tải lên tài liệu lý thuyết nào. Tải lên một tài liệu với định dạng "Lý thuyết" để bắt đầu.
                    </p>
                    <button
                        onClick={() => navigate('/teacher/documents')}
                        className="mt-6 px-6 py-3 bg-[#FF6B4A] text-white rounded-2xl font-extrabold hover:bg-[#ff5535] transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Đến trang Quản lý tài liệu
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Curriculum Detail ─────────────────────────────────────────────────────────

function CurriculumDetail() {
    const { docId } = useParams<{ docId: string }>();
    const navigate = useNavigate();
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [docInfo, setDocInfo] = useState<TeacherDocumentItem | null>(null);
    const [chapters, setChapters] = useState<BookChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
    const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
    const [lessonContent, setLessonContent] = useState<Record<number, LessonContentItem[]>>({});
    const [lessonError, setLessonError] = useState<Record<number, string>>({});
    const [loadingLesson, setLoadingLesson] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!docId) return;
        const id = parseInt(docId);
        const token = authService.getToken();
        if (!token) return;

        setLoading(true);
        Promise.all([
            teacherDocumentService.getDocuments(token).then(docs =>
                docs.find(d => d.id === id && (d.doc_type === 'theory' || d.doc_type === 'THEORY')) || null
            ),
            teacherDocumentService.getBookChapters(id, token),
        ])
            .then(([info, chaps]) => {
                setDocInfo(info);
                setChapters(chaps);
                // Auto-expand first chapter
                if (chaps.length > 0) setExpandedChapters(new Set([chaps[0].id]));
            })
            .catch(err => setError(err.message || 'Không thể tải nội dung giáo trình'))
            .finally(() => setLoading(false));
    }, [docId]);

    const toggleChapter = (id: number) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleLesson = async (lessonId: number) => {
        const isOpen = expandedLessons.has(lessonId);
        setExpandedLessons(prev => {
            const next = new Set(prev);
            isOpen ? next.delete(lessonId) : next.add(lessonId);
            return next;
        });
        if (!isOpen && !lessonContent[lessonId]) {
            const token = authService.getToken();
            if (!token) return;
            setLoadingLesson(prev => new Set(prev).add(lessonId));
            try {
                const content = await teacherDocumentService.getLessonContent(lessonId, token);
                setLessonContent(prev => ({ ...prev, [lessonId]: content }));
            } catch (e: any) {
                setLessonError(prev => ({ ...prev, [lessonId]: e?.message || 'Không thể tải nội dung bài học' }));
            } finally {
                setLoadingLesson(prev => { const next = new Set(prev); next.delete(lessonId); return next; });
            }
        }
    };

    const txt = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const sub = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const card = isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]/15';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-[#FF6B4A]/30 border-t-[#FF6B4A] rounded-full animate-spin" />
                <p className={cn('font-bold', sub)}>Đang tải nội dung giáo trình...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn('border-2 rounded-[24px] p-6 text-center', isDark ? 'border-red-500/30 text-red-300' : 'border-red-100 text-red-500')}>
                <Warning size={28} className="mx-auto mb-2" />
                <p className="font-extrabold">{error}</p>
            </div>
        );
    }

    const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);

    return (
        <div className="space-y-6 pb-8">
            {/* Back button + title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/teacher/curriculum')}
                    className={cn('w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-colors', isDark ? 'border-white/15 text-gray-300 hover:bg-white/10' : 'border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5')}
                >
                    <ArrowLeft size={18} weight="bold" />
                </button>
                <div>
                    <h1 className={cn('text-2xl font-extrabold leading-tight', txt)}>
                        {docInfo?.book_name || 'Chi tiết Giáo trình'}
                    </h1>
                    {docInfo && (
                        <p className={cn('text-sm font-bold mt-0.5', sub)}>{docInfo.subject_name}</p>
                    )}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Chương', value: chapters.length, icon: ListBullets },
                    { label: 'Bài học', value: totalLessons, icon: BookOpenText },
                    { label: 'Lớp học', value: docInfo?.assigned_class_count ?? 0, icon: GraduationCap },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className={cn('rounded-2xl border-2 p-5 text-center', card)}>
                        <Icon size={24} weight="fill" className="mx-auto mb-1 text-[#FF6B4A]" />
                        <p className={cn('text-2xl font-extrabold', txt)}>{value}</p>
                        <p className={cn('text-xs font-bold', sub)}>{label}</p>
                    </div>
                ))}
            </div>

            {/* Chapter list */}
            {chapters.length === 0 ? (
                <div className={cn('border-2 border-dashed rounded-[28px] p-12 text-center', isDark ? 'border-white/10' : 'border-gray-200')}>
                    <BookOpen size={40} className={cn('mx-auto mb-3', sub)} weight="fill" />
                    <p className={cn('font-extrabold', txt)}>Chưa có chương nào</p>
                    <p className={cn('text-sm font-bold mt-1', sub)}>Tài liệu này chưa được xử lý hoặc không có chương học.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {chapters.map(chapter => (
                        <div key={chapter.id} className={cn('rounded-2xl border-2 overflow-hidden transition-all', card)}>
                            <button
                                className="w-full flex items-center justify-between px-6 py-4 text-left gap-3"
                                onClick={() => toggleChapter(chapter.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-8 h-8 rounded-xl bg-[#FF6B4A] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                                        {chapter.number}
                                    </span>
                                    <span className={cn('font-extrabold text-base leading-snug truncate', txt)}>
                                        {chapter.title || `Chương ${chapter.number}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={cn('text-xs font-bold', sub)}>{chapter.lessons.length} bài</span>
                                    <span className={cn('text-lg transition-transform duration-200', expandedChapters.has(chapter.id) ? 'rotate-180' : '')}>▾</span>
                                </div>
                            </button>

                            {expandedChapters.has(chapter.id) && chapter.lessons.length > 0 && (
                                <div className={cn('border-t', isDark ? 'border-white/10' : 'border-[#1A1A1A]/10')}>
                                    {chapter.lessons.map((lesson, idx) => (
                                        <div key={lesson.id}>
                                            <button
                                                onClick={() => toggleLesson(lesson.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 px-6 py-3 text-sm text-left transition-colors',
                                                    idx < chapter.lessons.length - 1 && !expandedLessons.has(lesson.id)
                                                        ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-50')
                                                        : '',
                                                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
                                                )}
                                            >
                                                <span className={cn('w-5 h-5 rounded-md text-[11px] font-extrabold flex items-center justify-center shrink-0', isDark ? 'bg-white/10 text-gray-300' : 'bg-[#1A1A1A]/8 text-[#1A1A1A]/60')}>
                                                    {lesson.number}
                                                </span>
                                                <span className={cn('font-semibold flex-1', txt)}>{lesson.title || `Bài ${lesson.number}`}</span>
                                                <CaretRight
                                                    size={14}
                                                    weight="bold"
                                                    className={cn(
                                                        'shrink-0 transition-transform duration-200',
                                                        expandedLessons.has(lesson.id) ? 'rotate-90' : '',
                                                        isDark ? 'text-gray-500' : 'text-gray-400',
                                                    )}
                                                />
                                            </button>
                                            {expandedLessons.has(lesson.id) && (
                                                <div className={cn('px-6 pb-4 pt-2', isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60',
                                                    idx < chapter.lessons.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-100') : '')}>
                                                    {loadingLesson.has(lesson.id) ? (
                                                        <div className="flex items-center gap-2 py-2">
                                                            <div className="w-4 h-4 border-2 border-[#FF6B4A]/30 border-t-[#FF6B4A] rounded-full animate-spin" />
                                                            <span className={cn('text-xs font-bold', sub)}>Đang tải nội dung...</span>
                                                        </div>
                                                    ) : lessonError[lesson.id] ? (
                                                        <p className="text-xs font-bold py-2 text-red-500">{lessonError[lesson.id]}</p>
                                                    ) : !lessonContent[lesson.id] || lessonContent[lesson.id].length === 0 ? (
                                                        <p className={cn('text-xs font-bold py-2', sub)}>Bài học này chưa có nội dung.</p>
                                                    ) : (() => {
                                                        // Group items by section_number
                                                        const sections: { sectionNumber: number; sectionTitle: string; items: LessonContentItem[] }[] = [];
                                                        for (const item of lessonContent[lesson.id]) {
                                                            const last = sections[sections.length - 1];
                                                            if (!last || last.sectionNumber !== item.section_number) {
                                                                sections.push({ sectionNumber: item.section_number, sectionTitle: item.section_title, items: [item] });
                                                            } else {
                                                                last.items.push(item);
                                                            }
                                                        }
                                                        return (
                                                            <div className="space-y-5">
                                                                {sections.map(sec => (
                                                                    <div key={sec.sectionNumber}>
                                                                        {sec.sectionTitle && (
                                                                            <p className={cn('text-xs font-extrabold uppercase tracking-wide mb-2', isDark ? 'text-[#FF6B4A]/80' : 'text-[#FF6B4A]')}>
                                                                                {sec.sectionNumber}. {sec.sectionTitle}
                                                                            </p>
                                                                        )}
                                                                        <div className="space-y-3">
                                                                            {sec.items.map((item, bi) => (
                                                                                <div key={bi}>
                                                                                    {item.subsection_title && (
                                                                                        <p className={cn('text-xs font-bold mb-1', isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60')}>
                                                                                            {item.subsection_title}
                                                                                        </p>
                                                                                    )}
                                                                                    {item.content ? (
                                                                                        <div className={cn('text-sm leading-relaxed prose prose-sm max-w-none', isDark ? 'text-gray-300 prose-invert' : 'text-[#1A1A1A]/80')}>
                                                                                            <ReactMarkdown
                                                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                                                rehypePlugins={[rehypeKatex]}
                                                                                            >
                                                                                                {item.content.replace(/\\n/g, '\n')}
                                                                                            </ReactMarkdown>
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function TeacherCurriculumLayout() {
    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <Routes>
                <Route path="/" element={<CurriculumList />} />
                <Route path="/:docId" element={<CurriculumDetail />} />
            </Routes>
        </div>
    );
}
