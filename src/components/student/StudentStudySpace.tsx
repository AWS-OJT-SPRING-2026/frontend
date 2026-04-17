import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CaretDown, CaretRight, BookOpen, Sparkle, PaperPlaneTilt, CircleNotch,
    Cards, Plus, Trash, Eye, EyeSlash, Exam, ListBullets,
    FileText, Lightning, ArrowRight, Star, MagnifyingGlass,
    CaretLeft,
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useSettings } from '../../context/SettingsContext';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { aiFetch } from '../../services/aiFetch';
import {
    studentMaterialService,
    type BookHierarchyResponse,
    type ChapterDto,
    type LessonDto,
    type ContentBlockDto,
    type StudentTheorySubjectOverview,
} from '../../services/studentMaterialService';
import {
    getChatSessions, streamChatMessage, upsertChatSession, deleteChatSession,
    type ChatSessionDto,
} from '../../services/chatService';
import { RoadmapWidget, DocumentWidget, QuizWidget } from './ChatWidgets';
import { MathRenderer } from '../ui/MathRenderer';
import { parseVnDate } from '../../lib/timeUtils';
import { FAST_API_BASE_URL as FAST_API_URL } from '../../services/env';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }
interface ChatSession { id: string; title: string; messages: Message[]; updatedAt: number; }
interface Flashcard { id: number; front: string; back: string; flipped: boolean; }
type StudioMode = 'tools' | 'quiz' | 'flashcard';
type Segment = { type: 'text'; content: string } | { type: 'widget'; widgetType: string; params: string[] };

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════
function generateSessionId() { return 'session_' + Math.random().toString(36).substring(2, 15); }
function formatSessionTitle(input: string) { const t = input.trim(); return !t ? 'Cuộc hội thoại mới' : t.length > 25 ? `${t.substring(0, 25)}...` : t; }
function fromDto(dto: ChatSessionDto): ChatSession {
    return { id: dto.sessionId, title: dto.title, messages: (dto.messages ?? []).map(m => ({ role: m.role, content: m.content, timestamp: parseVnDate(m.timestamp) })), updatedAt: dto.updatedAt ? parseVnDate(dto.updatedAt).getTime() : Date.now() };
}

const FLASHCARD_KEY = 'slozy_flashcards';
function loadFlashcards(): Flashcard[] { try { const r = localStorage.getItem(FLASHCARD_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }
function saveFlashcards(cards: Flashcard[]) { localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards)); }

const SPECIAL_BLOCK_KEYWORDS = ['diem nhan', 'tom tat', 'ghi nho', 'key highlight', 'cot loi', 'quan trong'];
function normalizeVn(v: string) { return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function isSpecialBlock(b: ContentBlockDto) { if (b.blockType?.toLowerCase() === 'highlight') return true; const nt = normalizeVn(b.title ?? ''); const nc = normalizeVn(b.content ?? ''); return SPECIAL_BLOCK_KEYWORDS.some(k => nt.includes(k) || nc.includes(k)); }

function parseContentSegments(content: string): Segment[] {
    if (!content) return [];
    let cleaned = content.replace(/\n?___WIDGET_CORRECTION___\n?/g, '');
    const regex = /["`'`]*>{0,3}\[UI_WIDGET:([^\]]+)\]<{0,3}["`'`]*/g;
    const segments: Segment[] = []; let lastIndex = 0; let match;
    while ((match = regex.exec(cleaned)) !== null) {
        if (match.index > lastIndex) segments.push({ type: 'text', content: cleaned.slice(lastIndex, match.index) });
        const parts = match[1].split('|'); segments.push({ type: 'widget', widgetType: parts[0], params: parts.slice(1) }); lastIndex = regex.lastIndex;
    }
    if (lastIndex < cleaned.length) { const r = cleaned.slice(lastIndex).trim(); if (r) segments.push({ type: 'text', content: r }); }
    return segments.length > 0 ? segments : [{ type: 'text', content: cleaned }];
}

const levels = [
    { level: 'Yếu', levelBg: '#FFB5B5' }, { level: 'Trung bình', levelBg: '#FCE38A' },
    { level: 'Khá', levelBg: '#B8B5FF' }, { level: 'Tốt', levelBg: '#95E1D3' },
];

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════
export function StudentStudySpace() {
    const { theme, t } = useSettings();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    // ── Style tokens ──
    const panelBg = isDark ? 'bg-[#111827]' : 'bg-white';
    const borderClr = isDark ? 'border-white/10' : 'border-[#1A1A1A]/10';
    const text = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const textMuted = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/5';

    // ═══════════════════════════════════════════════════
    // RESIZE STATE
    // ═══════════════════════════════════════════════════
    const [leftWidth, setLeftWidth] = useState(320);
    const [rightWidth, setRightWidth] = useState(384);
    const isResizingLeft = useRef(false);
    const isResizingRight = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingLeft.current) {
                setLeftWidth(Math.min(Math.max(e.clientX, 200), 600));
            } else if (isResizingRight.current) {
                setRightWidth(Math.min(Math.max(window.innerWidth - e.clientX, 280), 800));
            }
        };

        const handleMouseUp = () => {
            if (isResizingLeft.current || isResizingRight.current) {
                isResizingLeft.current = false;
                isResizingRight.current = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // ═══════════════════════════════════════════════════
    // LEFT PANEL — Sources state
    // ═══════════════════════════════════════════════════
    const [subjects, setSubjects] = useState<StudentTheorySubjectOverview[]>([]);
    const [allRoadmaps, setAllRoadmaps] = useState<any[]>([]); // To hold RoadmapResponse[]
    const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null);
    const [activeBook, setActiveBook] = useState<BookHierarchyResponse | null>(null);
    const [bookLoading, setBookLoading] = useState(false);
    const [openChapters, setOpenChapters] = useState<number[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<LessonDto | null>(null);
    const [selectedChapterNum, setSelectedChapterNum] = useState('');
    const [sourcesLoading, setSourcesLoading] = useState(true);

    useEffect(() => {
        const run = async () => {
            try {
                const token = authService.getToken();
                if (!token) return;
                const fetchedSubjects = await studentMaterialService.getTheorySubjectsOverview(token);
                setSubjects(fetchedSubjects || []);
                
                // Fetch AI Roadmaps
                const res = await fetch(`${FAST_API_URL}/roadmap/all/1`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setAllRoadmaps(data);
                        // Auto select first roadmap if exists
                        if (data.length > 0) {
                            handleSelectRoadmap(data[0].roadmapid, data, fetchedSubjects || []);
                        }
                    }
                }
            } catch { /* ignore */ }
            finally { setSourcesLoading(false); }
        };
        run();
    }, []);

    const handleSelectRoadmap = async (rmId: number, roadmapsToUse = allRoadmaps, subjectsToUse = subjects) => {
        setSelectedRoadmapId(rmId);
        setBookLoading(true); setActiveBook(null); setOpenChapters([]); setSelectedLesson(null);
        try {
            const token = authService.getToken();
            if (!token) return;
            const roadmap = roadmapsToUse.find(r => r.roadmapid === rmId);
            if (roadmap) {
                // Find matching book via subject_id
                const subject = subjectsToUse.find(s => s.subjectId === roadmap.subject_id);
                if (subject) {
                    const hierarchy = await studentMaterialService.getBookFullHierarchy(subject.bookId, token);
                    setActiveBook(hierarchy);
                    if (roadmap.chapters.length > 0) setOpenChapters([roadmap.chapters[0].chapterid]);
                }
            }
        } catch { /* ignore */ }
        finally { setBookLoading(false); }
    };

    const toggleChapter = (id: number) => setOpenChapters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // ═══════════════════════════════════════════════════
    // CENTER PANEL — Chat state
    // ═══════════════════════════════════════════════════
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [isHydrating, setIsHydrating] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);

    const persistSession = useCallback(async (id: string, title: string, msgs: Message[]) => {
        await upsertChatSession({ sessionId: id, title, messages: msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })) });
    }, []);

    useEffect(() => {
        const hydrate = async () => {
            try {
                const remote = await getChatSessions();
                const mapped = remote.map(fromDto);
                setSessions(mapped);
                if (mapped.length > 0) { setSessionId(mapped[0].id); setMessages(mapped[0].messages); }
                else { setSessionId(generateSessionId()); }
            } catch { setSessionId(generateSessionId()); }
            finally { setIsHydrating(false); }
        };
        hydrate();
    }, []);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        const trimmed = chatInput.trim();
        if (!trimmed || isChatLoading || isHydrating) return;
        const activeId = sessionId || generateSessionId();
        if (!sessionId) setSessionId(activeId);

        const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs); setChatInput(''); setIsChatLoading(true);

        const title = formatSessionTitle(trimmed);
        setSessions(prev => { const ex = prev.find(s => s.id === activeId); return ex ? prev.map(s => s.id === activeId ? { ...s, messages: newMsgs, updatedAt: Date.now() } : s) : [{ id: activeId, title, messages: newMsgs, updatedAt: Date.now() }, ...prev]; });

        let assistantContent = ''; let first = true;
        const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date() };
        try {
            await streamChatMessage(trimmed, activeId, (token) => {
                if (first) { setIsChatLoading(false); first = false; }
                assistantContent += token;
                setMessages(prev => { const li = prev.length - 1; if (li >= 0 && prev[li].role === 'assistant') { const u = [...prev]; u[li] = { ...u[li], content: assistantContent }; return u; } return [...prev, { ...assistantMsg, content: assistantContent }]; });
            });
            const final = [...newMsgs, { ...assistantMsg, content: assistantContent }];
            setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: final, updatedAt: Date.now() } : s));
            await persistSession(activeId, title, final);
        } catch {
            const err: Message = { role: 'assistant', content: t.studentStudySpace.errorMsg, timestamp: new Date() };
            const final = [...newMsgs, err]; setMessages(final);
            setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: final, updatedAt: Date.now() } : s));
            await persistSession(activeId, title, final);
        } finally { setIsChatLoading(false); chatInputRef.current?.focus(); }
    };

    const createNewSession = async () => {
        const id = generateSessionId();
        setSessions(prev => [{ id, title: t.studentStudySpace.newSessionTitle, messages: [], updatedAt: Date.now() }, ...prev]);
        setSessionId(id); setMessages([]);
        try { await persistSession(id, t.studentStudySpace.newSessionTitle, []); } catch { }
        chatInputRef.current?.focus();
    };

    const switchSession = (id: string) => { const s = sessions.find(x => x.id === id); if (s) { setSessionId(id); setMessages(s.messages); } };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions(prev => prev.filter(s => s.id !== id));
        if (sessionId === id) createNewSession();
        try { await deleteChatSession(id); } catch { }
    };

    // ═══════════════════════════════════════════════════
    // RIGHT PANEL — Studio state
    // ═══════════════════════════════════════════════════
    const [studioMode, setStudioMode] = useState<StudioMode>('tools');
    const [showSessionList, setShowSessionList] = useState(false);

    // Flashcard
    const [flashcards, setFlashcards] = useState<Flashcard[]>(loadFlashcards);
    const [newFront, setNewFront] = useState(''); const [newBack, setNewBack] = useState('');
    const addFlashcard = () => { if (!newFront.trim() || !newBack.trim()) return; const c: Flashcard = { id: Date.now(), front: newFront.trim(), back: newBack.trim(), flipped: false }; const u = [c, ...flashcards].slice(0, 50); setFlashcards(u); saveFlashcards(u); setNewFront(''); setNewBack(''); };
    const deleteFlashcard = (id: number) => { const u = flashcards.filter(c => c.id !== id); setFlashcards(u); saveFlashcards(u); };
    const flipCard = (id: number) => { setFlashcards(prev => prev.map(c => c.id === id ? { ...c, flipped: !c.flipped } : c)); };

    // Quiz
    const [quizSubjects, setQuizSubjects] = useState<{ subject_id: number; subject_name: string }[]>([]);
    const [quizSelectedSubject, setQuizSelectedSubject] = useState<number | null>(null);
    const [quizLessons, setQuizLessons] = useState<{ id: number; label: string; level: string; levelBg: string; selected: boolean }[]>([]);
    const [quizNumQ, setQuizNumQ] = useState(10);
    const [quizAiQ, setQuizAiQ] = useState(5);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
    const [quizCurrent, setQuizCurrent] = useState(0);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizShowResult, setQuizShowResult] = useState(false);
    const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [quizSubmitting, setQuizSubmitting] = useState(false);

    useEffect(() => {
        fetch(`${FAST_API_URL}/subjects/`).then(r => r.json()).then(d => { setQuizSubjects(d); if (d.length > 0) setQuizSelectedSubject(d[0].subject_id); }).catch(() => {});
        const resolveUser = async () => { try { const token = authService.getToken(); if (!token) return; const p = await profileService.getMyProfile(token); const c = Number(p.userID ?? p.studentID ?? p.teacherID); if (Number.isFinite(c) && c > 0) setCurrentUserId(c); } catch { } };
        resolveUser();
    }, []);

    useEffect(() => {
        if (!quizSelectedSubject) return;
        fetch(`${FAST_API_URL}/subjects/${quizSelectedSubject}/lessons`).then(r => r.json()).then(data => {
            const f = data.map((ls: any, i: number) => ({ id: ls.id, label: ls.title, level: levels[i % levels.length].level, levelBg: levels[i % levels.length].levelBg, selected: i === 0 }));
            setQuizLessons(f);
        }).catch(() => {});
    }, [quizSelectedSubject]);

    const handleStartQuiz = async () => {
        if (!quizSelectedSubject || !currentUserId) return;
        const selectedIds = quizLessons.filter(l => l.selected).map(l => l.id);
        if (selectedIds.length === 0) return;
        setQuizLoading(true);
        try {
            const res = await fetch(`${FAST_API_URL}/subjects/fetch-questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_id: quizSelectedSubject, lesson_ids: selectedIds, num_questions: quizNumQ, ai_questions: quizAiQ, userid: currentUserId }) });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setQuizQuestions(data); setQuizAnswers(new Array(data.length).fill(null)); setQuizCurrent(0); setQuizStarted(true); setQuizStartTime(Date.now()); setQuizShowResult(false);
        } catch { alert(t.studentStudySpace.quizLoadError); }
        finally { setQuizLoading(false); }
    };

    const handleSubmitQuiz = async () => {
        if (quizSubmitting || !currentUserId) return;
        const correct = quizAnswers.filter((a, i) => quizQuestions[i] && a === quizQuestions[i].correct).length;
        const score = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 10) : 0;
        const timeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
        setQuizSubmitting(true);
        try {
            const token = authService.getToken();
            await aiFetch(`${FAST_API_URL}/subjects/submit-quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ userid: currentUserId, score, time_taken: timeTaken, answers: quizAnswers.map((a, i) => ({ question_id: quizQuestions[i].id, selected_answer: a !== null ? quizQuestions[i].options[a] : 'Unanswered', is_correct: a === quizQuestions[i].correct, answer_ref_id: a !== null ? quizQuestions[i].answer_ref_ids[a] : null })) }) });
        } catch { }
        finally { setQuizSubmitting(false); setQuizShowResult(true); }
    };

    const quizCorrect = quizAnswers.filter((a, i) => quizQuestions[i] && a === quizQuestions[i].correct).length;
    const quizScore = quizQuestions.length > 0 ? Math.round((quizCorrect / quizQuestions.length) * 10) : 0;

    // ═══════════════════════════════════════════════════
    // Render helpers
    // ═══════════════════════════════════════════════════
    const renderBlock = (block: ContentBlockDto, key: string) => {
        const special = isSpecialBlock(block);
        if (special) return (
            <article key={key} className={`rounded-2xl border-2 px-4 py-3 shadow-md ${isDark ? 'border-blue-400/80 bg-blue-950/40 text-blue-50' : 'border-blue-500 bg-blue-50 text-blue-950'}`}>
                <div className="flex items-center gap-2 mb-1"><Star className="w-4 h-4 text-amber-400" weight="fill" /><h5 className="text-sm font-black"><MathRenderer content={block.title?.trim() || 'Điểm nhấn'} /></h5></div>
                <p className="whitespace-pre-wrap text-xs font-bold leading-6"><MathRenderer content={block.content} /></p>
            </article>
        );
        return (
            <article key={key} className={`rounded-xl border px-3 py-2 whitespace-pre-wrap text-xs leading-6 ${isDark ? 'border-white/10 bg-[#1b2229] text-gray-200' : 'border-[#1A1A1A]/10 bg-white text-[#1A1A1A]/85'}`}>
                {block.title && <h5 className="font-bold text-sm mb-0.5"><MathRenderer content={block.title} /></h5>}
                <p><MathRenderer content={block.content} /></p>
            </article>
        );
    };

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className="absolute inset-0 flex rounded-3xl overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* KaTeX styles */}
            <style>{`
                .katex-display { background-color: ${isDark ? '#232323' : '#FCE38A'} !important; border: 2px solid ${isDark ? '#3a3a3a' : '#1A1A1A'} !important; border-radius: 12px !important; padding: 12px !important; margin: 12px 0 !important; overflow-x: auto !important; }
                .katex-display > .katex { display: block !important; text-align: center !important; }
                span.katex { font-weight: bold !important; color: ${isDark ? '#f3f4f6' : '#1A1A1A'} !important; }
            `}</style>

            {/* ═══════════════════════════════════════════
                LEFT PANEL — Sources
            ═══════════════════════════════════════════ */}
            <div className={`flex flex-col border-r ${panelBg} ${borderClr} shrink-0 relative`} style={{ width: leftWidth }}>
                <div 
                    className="absolute -right-[3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-[#FF6B4A]/50 transition-colors z-50"
                    onMouseDown={() => {
                        isResizingLeft.current = true;
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                />
                <div className={`h-14 flex items-center px-4 justify-between shrink-0 border-b ${borderClr}`}>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                        <span className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.sourcesPanel}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Roadmap selector — compact dropdown */}
                    <div className="p-3">
                        <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-2 ${textMuted}`}>{t.studentStudySpace.roadmapDropdown}</p>
                        {sourcesLoading ? (
                            <div className="flex items-center gap-2 py-2"><CircleNotch className="w-4 h-4 animate-spin text-[#FF6B4A]" /><span className={`text-xs font-bold ${textMuted}`}>Đang tải...</span></div>
                        ) : allRoadmaps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-4 bg-[#FF6B4A]/5 border border-[#FF6B4A]/20 rounded-2xl mt-1 text-center">
                                <span className="text-lg mb-1">🚀</span>
                                <p className={`text-[10px] font-bold ${textMuted} mb-2`}>{t.studentStudySpace.noRoadmap}</p>
                                <button onClick={() => navigate('/student/roadmap')} className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-colors">
                                    {t.studentStudySpace.createRoadmap}
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedRoadmapId?.toString() || ''}
                                    onChange={(e) => handleSelectRoadmap(Number(e.target.value))}
                                    className={`w-full h-9 rounded-xl px-3 pr-8 text-xs font-bold appearance-none cursor-pointer focus:outline-none transition-colors ${isDark ? 'bg-white/5 border border-white/15 text-gray-200 focus:border-[#FF6B4A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/15 text-[#1A1A1A] focus:border-[#FF6B4A]'}`}
                                >
                                    {allRoadmaps.map(r => (
                                        <option key={r.roadmapid} value={r.roadmapid.toString()}>
                                            {r.subject_name} · {r.total_time} tuần
                                        </option>
                                    ))}
                                </select>
                                <CaretDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${textMuted}`} />
                            </div>
                        )}
                    </div>

                    {/* Chapter tree */}
                    {bookLoading && <div className="flex justify-center py-4"><CircleNotch className="w-5 h-5 animate-spin text-[#FF6B4A]" /></div>}
                    {activeBook && selectedRoadmapId && (
                        <div className="px-3 pb-3 space-y-1">
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-2 ${textMuted}`}>{t.studentStudySpace.roadmapDropdown} {allRoadmaps.find(r => r.roadmapid === selectedRoadmapId)?.subject_name}</p>
                            {allRoadmaps.find(r => r.roadmapid === selectedRoadmapId)?.chapters.map((ch: any) => {
                                const isOpen = openChapters.includes(ch.chapterid);
                                return (
                                    <div key={ch.chapterid}>
                                        <button onClick={() => toggleChapter(ch.chapterid)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${hoverBg}`}>
                                            {isOpen ? <CaretDown className="w-3.5 h-3.5 shrink-0 text-[#FF6B4A]" /> : <CaretRight className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />}
                                            <span className={`text-xs font-extrabold truncate ${text}`}>{ch.title}</span>
                                        </button>
                                        {isOpen && (
                                            <div className="ml-5 space-y-0.5 mt-0.5 border-l-2 border-[#1A1A1A]/10 pl-2">
                                                {ch.lessons.map((roadmapLesson: any) => {
                                                    // Map RoadmapLesson to full Book Lesson info
                                                    const realLesson = activeBook.chapters.flatMap(c => c.lessons).find(l => l.id === roadmapLesson.lessonid);
                                                    if (!realLesson) return null;
                                                    
                                                    const activeChapter = activeBook.chapters.find(c => c.lessons.some(l => l.id === realLesson.id));
                                                    
                                                    return (
                                                        <button key={roadmapLesson.lessonid}
                                                            onClick={() => { setSelectedLesson(realLesson); setSelectedChapterNum(activeChapter?.chapterNumber.toString() || ''); }}
                                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex flex-col gap-0.5 ${selectedLesson?.id === roadmapLesson.lessonid ? 'bg-[#FF6B4A]/15 text-[#FF6B4A]' : `${text} ${hoverBg}`}`}>
                                                            <span>{roadmapLesson.title}</span>
                                                            <span className={`text-[9px] font-semibold flex items-center gap-1 ${selectedLesson?.id === roadmapLesson.lessonid ? 'text-[#FF6B4A]/70' : textMuted}`}>✨ {roadmapLesson.time} {t.studentStudySpace.lessonMinutes}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Lesson preview */}
                    {selectedLesson && (
                        <div className={`mx-3 mb-3 rounded-2xl border p-3 ${borderClr} ${isDark ? 'bg-[#0f1520]' : 'bg-[#F9FAFF]'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className={`text-xs font-extrabold ${text}`}>📖 {selectedLesson.title}</h4>
                                <button onClick={() => setSelectedLesson(null)} className={`text-[10px] font-bold ${textMuted} hover:text-[#FF6B4A]`}>✕</button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {selectedLesson.sections.length === 0 ? (
                                    <p className={`text-[10px] font-semibold ${textMuted}`}>{t.studentStudySpace.noContent}</p>
                                ) : selectedLesson.sections.map(sec => (
                                    <div key={sec.id}>
                                        <p className={`text-[10px] font-extrabold mb-1 ${text}`}>{selectedChapterNum}.{selectedLesson.lessonNumber}.{sec.sectionNumber}: {sec.sectionTitle || 'Tổng quan'}</p>
                                        {sec.subsections.map(sub => sub.contentBlocks.map((block, idx) => renderBlock(block, `${sub.id}-${idx}`)))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                CENTER PANEL — Chat
            ═══════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Chat header */}
                <div className={`shrink-0 border-b ${borderClr} ${panelBg}`}>
                    <div className="h-14 flex items-center justify-between px-5">
                        <div className="flex items-center gap-3 min-w-0">
                            <Sparkle className="w-5 h-5 text-[#FCE38A] shrink-0" weight="fill" />
                            <h2 className={`text-[15px] font-extrabold truncate ${text}`}>
                                {sessions.find(s => s.id === sessionId)?.title || 'Slozy AI'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setShowSessionList(!showSessionList)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${showSessionList ? 'bg-[#FF6B4A]/15 text-[#FF6B4A]' : `${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}`}>
                                <ListBullets className="w-3.5 h-3.5" weight="bold" />
                                {t.studentStudySpace.historyLabel} ({sessions.length})
                            </button>
                            <button onClick={createNewSession} className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors">{t.studentStudySpace.newSession}</button>
                        </div>
                    </div>

                    {/* Session list panel (collapsible) */}
                    {showSessionList && (
                        <div className={`border-t ${borderClr} px-4 py-3 max-h-52 overflow-y-auto`}>
                            <div className="space-y-1">
                                {sessions.length === 0 ? (
                                    <p className={`text-xs font-semibold text-center py-3 ${textMuted}`}>{t.studentStudySpace.noConversations}</p>
                                ) : [...sessions].sort((a, b) => b.updatedAt - a.updatedAt).map(s => (
                                    <div key={s.id}
                                        onClick={() => { switchSession(s.id); setShowSessionList(false); }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all ${sessionId === s.id
                                            ? (isDark ? 'bg-[#FF6B4A]/10 border border-[#FF6B4A]/30' : 'bg-[#FF6B4A]/10 border border-[#FF6B4A]/20')
                                            : `border border-transparent ${hoverBg}`}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sessionId === s.id ? 'bg-[#FF6B4A] text-white' : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                            <Sparkle className="w-3.5 h-3.5" weight="fill" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-extrabold truncate ${text}`}>{s.title}</p>
                                            <p className={`text-[10px] font-semibold ${textMuted}`}>{s.messages.length} {t.studentStudySpace.messagesUnit}</p>
                                        </div>
                                        <button onClick={(e) => handleDeleteSession(s.id, e)}
                                            className={`opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'}`}>
                                            <Trash className="w-3.5 h-3.5" weight="fill" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.length === 0 && (
                        <div className="max-w-md mx-auto text-center mt-12">
                            <div className="w-14 h-14 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-[#1A1A1A]">
                                <Sparkle className="w-7 h-7 text-[#FCE38A]" weight="fill" />
                            </div>
                            <h2 className={`text-xl font-extrabold mb-2 ${text}`}>{t.studentStudySpace.welcomeMsg}</h2>
                            <p className={`${textMuted} font-semibold text-sm mb-5`}>{t.studentStudySpace.welcomeSub}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {t.studentStudySpace.suggestions.map((s: string) => (
                                    <button key={s} onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${isDark ? 'border border-white/10 bg-white/5 text-gray-300 hover:border-[#FF6B4A]' : 'border border-gray-200 bg-white text-gray-600 hover:border-[#FF6B4A]'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                            <span className={`text-[10px] font-bold ${textMuted} ${msg.role === 'user' ? 'mr-12' : 'ml-12'}`}>
                                {msg.role === 'user' ? t.studentStudySpace.userLabel : t.studentStudySpace.chatHeader} • {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && <div className="w-8 h-8 bg-[#1A1A1A] rounded-xl border border-[#1A1A1A] flex items-center justify-center shrink-0 mt-1"><Sparkle className="w-4 h-4 text-[#FCE38A]" weight="fill" /></div>}
                                <div className={`rounded-2xl px-4 py-3 shadow-sm max-w-[85%] ${msg.role === 'user' ? (isDark ? 'bg-[#232327] text-gray-100 border border-white/10 rounded-tr-none' : 'bg-white text-[#1A1A1A] border border-gray-200 rounded-tr-none') : (isDark ? 'bg-[#1c1c20] text-gray-100 border border-white/10 rounded-tl-none' : 'bg-white text-[#1A1A1A] border border-gray-200 rounded-tl-none')}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className={`prose prose-sm max-w-none overflow-hidden prose-p:font-semibold prose-p:text-[14px] prose-p:leading-relaxed prose-p:my-1 prose-headings:font-extrabold prose-headings:my-2 prose-strong:font-black prose-ul:my-2 prose-li:my-0.5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:rounded-xl ${isDark ? 'prose-invert prose-headings:text-[#ff9a73] prose-strong:text-gray-100 prose-code:text-[#ff9a73] prose-code:bg-[#ff7849]/15' : 'prose-[#1A1A1A] prose-headings:text-[#FF6B4A] prose-strong:text-[#1A1A1A] prose-code:text-[#FF6B4A] prose-code:bg-[#FF6B4A]/10'}`}>
                                            {parseContentSegments(msg.content).map((seg, si) => {
                                                if (seg.type === 'widget') {
                                                    if (seg.widgetType === 'ROADMAP') return <RoadmapWidget key={si} subjectName={seg.params[0]} totalWeeks={seg.params[1]} />;
                                                    if (seg.widgetType === 'DOCUMENT') return <DocumentWidget key={si} bookId={seg.params[0]} sectionId={seg.params[1]} />;
                                                    if (seg.widgetType === 'QUIZ') return <QuizWidget key={si} subjectName={seg.params[0]} numQuestions={seg.params[1]} topics={seg.params[2]} />;
                                                    return null;
                                                }
                                                return <ReactMarkdown key={si} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{seg.content}</ReactMarkdown>;
                                            })}
                                        </div>
                                    ) : (
                                        <p className="font-semibold text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 rounded-xl bg-[#FF6B4A] border border-[#1A1A1A] flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 mt-1">HS</div>}
                            </div>
                        </div>
                    ))}

                    {isChatLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-[#1A1A1A] rounded-xl flex items-center justify-center shrink-0"><Sparkle className="w-4 h-4 text-[#FCE38A]" weight="fill" /></div>
                            <div className="bg-[#95E1D3]/20 rounded-2xl rounded-tl-none px-4 py-3 border border-[#95E1D3]">
                                <div className="flex items-center gap-2"><CircleNotch className="w-4 h-4 animate-spin text-[#1A1A1A]" /><span className="font-extrabold text-xs text-[#1A1A1A]">{t.studentStudySpace.analyzing}</span></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="p-4 shrink-0">
                    <div className="max-w-3xl mx-auto flex items-center gap-2">
                        <div className={`flex-1 h-12 rounded-full flex items-center px-4 shadow-sm focus-within:ring-2 focus-within:ring-[#FFB800] ${isDark ? 'bg-[#222] text-gray-100' : 'bg-[#1e1e1e] text-white'}`}>
                            <input ref={chatInputRef} value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                disabled={isChatLoading} placeholder={t.studentStudySpace.inputPlaceholder}
                                className={`w-full h-full bg-transparent border-none outline-none text-sm font-semibold ${isDark ? 'placeholder:text-gray-500' : 'placeholder:text-gray-400'}`} />
                        </div>
                        <button onClick={handleSend} disabled={isChatLoading || !chatInput.trim()}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${!chatInput.trim() || isChatLoading ? 'bg-gray-200 text-gray-400' : 'bg-[#FFB800] hover:bg-[#f5b100] text-[#1e1e1e]'}`}>
                            <PaperPlaneTilt className="w-5 h-5" weight="fill" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                RIGHT PANEL — Studio
            ═══════════════════════════════════════════ */}
            <div className={`flex flex-col border-l ${panelBg} ${borderClr} shrink-0 relative`} style={{ width: rightWidth }}>
                <div 
                    className="absolute -left-[3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-[#FFB800]/50 transition-colors z-50"
                    onMouseDown={() => {
                        isResizingRight.current = true;
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                    }}
                />
                <div className={`h-14 flex items-center px-4 shrink-0 border-b ${borderClr}`}>
                    <Lightning className="w-5 h-5 text-[#FFB800] mr-2" weight="fill" />
                    <span className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.studioHeader}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {/* ── Tools mode ── */}
                    {studioMode === 'tools' && (
                        <div className="space-y-2">
                            <button onClick={() => navigate('/student/review')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <div className="w-10 h-10 rounded-xl bg-[#FCE38A]/30 flex items-center justify-center"><BookOpen className="w-5 h-5 text-[#D4A017]" weight="fill" /></div>
                                <div className="text-left"><p className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.reviewBtn}</p><p className={`text-[10px] font-semibold ${textMuted}`}>{t.studentStudySpace.reviewDesc}</p></div>
                                <ArrowRight className={`w-4 h-4 ml-auto ${textMuted}`} />
                            </button>
                            <button onClick={() => setStudioMode('quiz')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <div className="w-10 h-10 rounded-xl bg-[#B8B5FF]/20 flex items-center justify-center"><Exam className="w-5 h-5 text-[#7C6FFF]" weight="fill" /></div>
                                <div className="text-left"><p className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.quizBtn}</p><p className={`text-[10px] font-semibold ${textMuted}`}>{t.studentStudySpace.quizDesc}</p></div>
                                <ArrowRight className={`w-4 h-4 ml-auto ${textMuted}`} />
                            </button>
                            <button onClick={() => setStudioMode('flashcard')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <div className="w-10 h-10 rounded-xl bg-[#FF6B4A]/15 flex items-center justify-center"><Cards className="w-5 h-5 text-[#FF6B4A]" weight="fill" /></div>
                                <div className="text-left"><p className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.flashcardBtn}</p><p className={`text-[10px] font-semibold ${textMuted}`}>{flashcards.length} {t.studentStudySpace.cardsUnit}</p></div>
                                <ArrowRight className={`w-4 h-4 ml-auto ${textMuted}`} />
                            </button>
                            <button onClick={() => { if (selectedLesson) { setChatInput(`Tóm tắt ngắn gọn bài "${selectedLesson.title}"`); chatInputRef.current?.focus(); } else { setChatInput('Tóm tắt bài học hiện tại cho tôi'); chatInputRef.current?.focus(); } }}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                <div className="w-10 h-10 rounded-xl bg-[#95E1D3]/30 flex items-center justify-center"><FileText className="w-5 h-5 text-[#10B981]" weight="fill" /></div>
                                <div className="text-left"><p className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.summarizeBtn}</p><p className={`text-[10px] font-semibold ${textMuted}`}>{t.studentStudySpace.summarizeDesc}</p></div>
                                <ArrowRight className={`w-4 h-4 ml-auto ${textMuted}`} />
                            </button>
                        </div>
                    )}

                    {/* ── Quiz mode ── */}
                    {studioMode === 'quiz' && !quizStarted && (
                        <div className="space-y-3">
                            <button onClick={() => { setStudioMode('tools'); setQuizStarted(false); setQuizShowResult(false); }} className={`flex items-center gap-1 text-xs font-bold ${textMuted} hover:text-[#FF6B4A]`}>
                                <CaretLeft className="w-3 h-3" /> {t.studentStudySpace.quizBack}
                            </button>
                            <h3 className={`text-sm font-extrabold ${text}`}>{t.studentStudySpace.quizConfigTitle}</h3>

                            <div>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${textMuted}`}>{t.studentStudySpace.quizSubjectLabel}</p>
                                <select value={quizSelectedSubject || ''} onChange={e => setQuizSelectedSubject(Number(e.target.value))}
                                    className={`w-full h-9 rounded-xl px-3 text-xs font-bold appearance-none ${isDark ? 'bg-white/5 border border-white/10 text-gray-200' : 'bg-gray-50 border border-gray-200 text-gray-700'}`}>
                                    {quizSubjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
                                </select>
                            </div>

                            <div>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${textMuted}`}>{t.studentStudySpace.quizQuestionsLabel} {quizNumQ}</p>
                                <input type="range" min={5} max={30} value={quizNumQ} onChange={e => setQuizNumQ(Number(e.target.value))} className="w-full accent-[#FF6B4A]" />
                            </div>

                            <div>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${textMuted}`}>{t.studentStudySpace.quizLessonLabel}</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {quizLessons.map((l, i) => (
                                        <button key={l.id} onClick={() => setQuizLessons(prev => { const n = [...prev]; n[i] = { ...n[i], selected: !n[i].selected }; return n; })}
                                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${l.selected ? 'bg-[#FF6B4A]/15 text-[#FF6B4A]' : `${text} ${hoverBg}`}`}>
                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${l.selected ? 'bg-[#FF6B4A] border-[#FF6B4A]' : `${isDark ? 'border-white/20' : 'border-gray-300'}`}`}>
                                                {l.selected && <span className="text-white text-[8px]">✓</span>}
                                            </div>
                                            <span className="truncate">{l.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleStartQuiz} disabled={quizLoading || quizLessons.filter(l => l.selected).length === 0}
                                className="w-full py-2.5 rounded-xl bg-[#7C6FFF] hover:bg-[#6B5CE7] disabled:opacity-40 text-white text-sm font-extrabold transition-all flex items-center justify-center gap-2">
                                {quizLoading ? <><CircleNotch className="w-4 h-4 animate-spin" /> {t.studentStudySpace.quizGenerating}</> : <><Exam className="w-4 h-4" weight="fill" /> {t.studentStudySpace.quizStart}</>}
                            </button>
                        </div>
                    )}

                    {/* ── Quiz active ── */}
                    {studioMode === 'quiz' && quizStarted && !quizShowResult && quizQuestions.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${textMuted}`}>{t.studentStudySpace.quizQuestionLabel} {quizCurrent + 1}/{quizQuestions.length}</span>
                                <button onClick={handleSubmitQuiz} disabled={quizSubmitting}
                                    className="text-[10px] font-extrabold bg-[#FF6B4A] text-white px-3 py-1 rounded-lg hover:bg-[#ff5535] disabled:opacity-50">
                                    {quizSubmitting ? t.studentStudySpace.quizSubmitting : t.studentStudySpace.quizSubmit}
                                </button>
                            </div>

                            <div className={`rounded-2xl p-3.5 border ${borderClr} ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <p className={`text-sm font-extrabold leading-relaxed mb-3 ${text}`}>{quizQuestions[quizCurrent].question}</p>
                                <div className="space-y-1.5">
                                    {quizQuestions[quizCurrent].options.map((opt: string, idx: number) => (
                                        <button key={idx} onClick={() => { const a = [...quizAnswers]; a[quizCurrent] = idx; setQuizAnswers(a); }}
                                            className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left text-xs font-bold transition-all border ${quizAnswers[quizCurrent] === idx ? 'border-[#FF6B4A] bg-[#FF6B4A]/10 text-[#FF6B4A]' : `${borderClr} ${hoverBg} ${text}`}`}>
                                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0 ${quizAnswers[quizCurrent] === idx ? 'bg-[#FF6B4A] text-white' : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500')}`}>{String.fromCharCode(65 + idx)}</span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setQuizCurrent(Math.max(0, quizCurrent - 1))} disabled={quizCurrent === 0}
                                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold border disabled:opacity-30 ${borderClr} ${text}`}>{t.studentStudySpace.quizPrevBtn}</button>
                                <button onClick={() => quizCurrent < quizQuestions.length - 1 ? setQuizCurrent(quizCurrent + 1) : handleSubmitQuiz()}
                                    className="flex-1 py-2 rounded-xl text-xs font-extrabold bg-[#1A1A1A] text-white">
                                    {quizCurrent === quizQuestions.length - 1 ? t.studentStudySpace.quizSubmit : t.studentStudySpace.quizNextBtn}
                                </button>
                            </div>

                            {/* Question nav dots */}
                            <div className="flex flex-wrap gap-1.5">
                                {quizQuestions.map((_, i) => (
                                    <button key={i} onClick={() => setQuizCurrent(i)}
                                        className={`w-6 h-6 rounded-md text-[9px] font-extrabold transition-all ${quizCurrent === i ? 'bg-[#FF6B4A] text-white' : quizAnswers[i] !== null ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : (isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Quiz result ── */}
                    {studioMode === 'quiz' && quizShowResult && (
                        <div className="space-y-3 text-center">
                            <div className="text-4xl mb-2">🏆</div>
                            <h3 className={`text-lg font-extrabold ${text}`}>{t.studentStudySpace.quizComplete}</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <p className="text-2xl font-extrabold text-[#FF6B4A]">{quizScore}/10</p>
                                    <p className={`text-[9px] font-bold uppercase ${textMuted}`}>{t.studentStudySpace.quizScore}</p>
                                </div>
                                <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <p className={`text-2xl font-extrabold ${text}`}>{quizCorrect}/{quizQuestions.length}</p>
                                    <p className={`text-[9px] font-bold uppercase ${textMuted}`}>{t.studentStudySpace.quizCorrect}</p>
                                </div>
                            </div>
                            <button onClick={() => { setQuizStarted(false); setQuizShowResult(false); setStudioMode('tools'); }}
                                className="w-full py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-extrabold">{t.studentStudySpace.quizReturn}</button>
                        </div>
                    )}

                    {/* ── Flashcard mode ── */}
                    {studioMode === 'flashcard' && (
                        <div className="space-y-3">
                            <button onClick={() => setStudioMode('tools')} className={`flex items-center gap-1 text-xs font-bold ${textMuted} hover:text-[#FF6B4A]`}>
                                <CaretLeft className="w-3 h-3" /> {t.studentStudySpace.quizBack}
                            </button>
                            <h3 className={`text-sm font-extrabold ${text}`}>🃏 Flashcard ({flashcards.length})</h3>

                            <div className="space-y-1.5">
                                <input value={newFront} onChange={e => setNewFront(e.target.value)} placeholder={t.studentStudySpace.flashFrontPlaceholder}
                                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40 ${isDark ? 'bg-white/5 text-gray-200 placeholder:text-gray-600 border border-white/10' : 'bg-gray-50 text-gray-700 placeholder:text-gray-400 border border-gray-200'}`} />
                                <input value={newBack} onChange={e => setNewBack(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFlashcard(); }} placeholder={t.studentStudySpace.flashBackPlaceholder}
                                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40 ${isDark ? 'bg-white/5 text-gray-200 placeholder:text-gray-600 border border-white/10' : 'bg-gray-50 text-gray-700 placeholder:text-gray-400 border border-gray-200'}`} />
                                <button onClick={addFlashcard} disabled={!newFront.trim() || !newBack.trim()}
                                    className="w-full py-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff5535] disabled:opacity-40 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1">
                                    <Plus className="w-3.5 h-3.5" weight="bold" /> {t.studentStudySpace.flashCreateBtn}
                                </button>
                            </div>

                            <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                {flashcards.length === 0 ? <p className={`text-[10px] font-semibold text-center py-4 ${textMuted}`}>{t.studentStudySpace.noFlashcards}</p> : flashcards.map(card => (
                                    <div key={card.id} onClick={() => flipCard(card.id)}
                                        className={`p-2.5 rounded-xl cursor-pointer group transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                        <div className="flex items-start gap-2">
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${card.flipped ? 'bg-[#10B981]/20' : 'bg-[#FF6B4A]/15'}`}>
                                                {card.flipped ? <Eye className="w-3 h-3 text-[#10B981]" weight="fill" /> : <EyeSlash className="w-3 h-3 text-[#FF6B4A]" weight="fill" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[11px] font-extrabold ${text}`}>{card.flipped ? card.back : card.front}</p>
                                                <p className={`text-[9px] font-bold ${textMuted}`}>{card.flipped ? t.studentStudySpace.flashAnswer : t.studentStudySpace.flashHint}</p>
                                            </div>
                                            <button onClick={e => { e.stopPropagation(); deleteFlashcard(card.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash className="w-3 h-3 text-red-400" weight="fill" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
