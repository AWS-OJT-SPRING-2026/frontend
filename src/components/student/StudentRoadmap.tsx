import { useState, useEffect } from 'react';
import { ArrowClockwise, Check, GraduationCap, Trophy, TrendUp, Question, ArrowRight, CaretRight, CaretDown, Clock, Sparkle, Trash, ArrowLeft, MapTrifold, BookOpen } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { FAST_API_BASE_URL as FAST_API_URL } from '../../services/env';
import { authService } from '../../services/authService';
import { profileService } from '../../services/profileService';

const SKILLS = [
    { label: 'Tốc độ giải bài', val: 80, diff: '+12%', bg: '#95E1D3' },
    { label: 'Độ chính xác', val: 65, diff: '+5%', bg: '#B8B5FF' },
    { label: 'Tư duy logic', val: 50, diff: 'Ổn định', bg: '#FCE38A' },
];

const CHART_DATA = [
    { week: 'T1', val: 50, bg: '#1A1A1A' + '30' },
    { week: 'T2', val: 65, bg: '#1A1A1A' + '40' },
    { week: 'T3', val: 70, bg: '#B8B5FF' },
    { week: 'T4', val: 92, bg: '#FF6B4A', current: true },
    { week: 'T5', val: 15, dashed: true },
    { week: 'T6', val: 15, dashed: true },
];

const TIME_OPTIONS = [
    { value: '2', label: '2 tuần' },
    { value: '4', label: '1 tháng' },
    { value: '8', label: '2 tháng' },
    { value: '12', label: '3 tháng' },
    { value: '24', label: '6 tháng' },
];

const SUBJECT_COLORS = ['#FF6B4A', '#B8B5FF', '#95E1D3', '#FCE38A', '#FF9A9E', '#A8E6CF'];

interface RoadmapLesson {
    lessonid: number;
    title: string;
    time: number;
    explanation: string | null;
    wrong_question_count: number;
    priority_score: number;
}

interface RoadmapChapter {
    id: number;
    chapterid: number;
    title: string;
    order: number;
    lessons: RoadmapLesson[];
}

interface RoadmapData {
    roadmapid: number;
    studentid: number;
    subject_id: number;
    subject_name: string;
    total_time: number;
    created_at: string;
    chapters: RoadmapChapter[];
}

export function StudentRoadmap() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [allRoadmaps, setAllRoadmaps] = useState<RoadmapData[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [studyTime, setStudyTime] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiSubjects, setApiSubjects] = useState<{ subject_id: number; subject_name: string; grade_level?: number }[]>([]);
    const [viewingRoadmap, setViewingRoadmap] = useState<RoadmapData | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [studentGrade, setStudentGrade] = useState<number | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Initial effect to fetch current user ID
    useEffect(() => {
        let mounted = true;
        const resolveUser = async () => {
            try {
                const token = authService.getToken();
                if (!token) return;
                const p = await profileService.getMyProfile(token);
                const c = Number(p.userID ?? p.studentID ?? p.teacherID);
                if (Number.isFinite(c) && c > 0 && mounted) {
                    setCurrentUserId(c);
                }
            } catch { }
        };
        resolveUser();
        return () => { mounted = false; };
    }, []);

    const selectedSubjectName = apiSubjects.find(s => s.subject_id.toString() === selectedSubjectId)?.subject_name || '';

    // Lọc môn theo lớp hiện tại của học sinh (lấy từ API)
    const gradeSubjects = studentGrade
        ? apiSubjects.filter(s => s.grade_level === studentGrade)
        : apiSubjects;
    // Chỉ hiển thị các môn chưa có roadmap trong dropdown tạo mới
    const availableSubjects = gradeSubjects.filter(s => !allRoadmaps.some(r => r.subject_id === s.subject_id));

    const generateRoadmapFor = async (subId: number, wks: number, userId: number) => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${FAST_API_URL}/roadmap/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userid: userId,
                    subject_id: subId,
                    total_weeks: wks
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to generate roadmap');
            }
            
            await fetchAllRoadmaps(userId);
            setSelectedSubjectId('');
            setStudyTime('');
            
            searchParams.delete('auto');
            setSearchParams(searchParams);
        } catch (err: any) {
            console.error('Error generating roadmap:', err);
            alert(`Có lỗi khi tạo lộ trình: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchAllRoadmaps = async (userId: number) => {
        try {
            const res = await fetch(`${FAST_API_URL}/roadmap/all/${userId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setAllRoadmaps(data);
            }
        } catch (err) {
            console.error('Error fetching all roadmaps:', err);
        }
    };

    const handleDeleteRoadmap = async (roadmap: RoadmapData, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm(`Bạn có chắc chắn muốn xóa lộ trình môn ${roadmap.subject_name}?`)) return;
        
        setIsDeleting(roadmap.roadmapid);
        try {
            const res = await fetch(`${FAST_API_URL}/roadmap/${roadmap.roadmapid}`, { method: 'DELETE' });
            if (res.ok) {
                if (currentUserId) await fetchAllRoadmaps(currentUserId);
                if (viewingRoadmap?.roadmapid === roadmap.roadmapid) {
                    setViewingRoadmap(null);
                }
            } else {
                alert('Xoá lộ trình thất bại.');
            }
        } catch (err) {
            console.error('Error deleting roadmap:', err);
            alert('Có lỗi khi xoá lộ trình.');
        } finally {
            setIsDeleting(null);
        }
    };

    useEffect(() => {
        if (!currentUserId) return;

        const autoSubject = searchParams.get('subject');
        const autoWeeks = searchParams.get('weeks');
        const autoRun = searchParams.get('auto');

        // Fetch student grade
        fetch(`${FAST_API_URL}/subjects/student-grade/${currentUserId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.grade_level) setStudentGrade(data.grade_level); })
            .catch(() => {});

        fetch(`${FAST_API_URL}/subjects/`)
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => { 
                if (Array.isArray(data)) {
                    setApiSubjects(data); 

                    if (autoRun === 'true' && autoSubject && autoWeeks) {
                        const subNameLower = autoSubject.toLowerCase().trim();
                        const keyword = subNameLower.replace("thpt", "").replace("thi", "").trim();

                        const matched = data.find(s => 
                            s.subject_name.toLowerCase().includes(keyword) || 
                            keyword.includes(s.subject_name.toLowerCase())
                        );

                        if (matched) {
                            setSelectedSubjectId(matched.subject_id.toString());
                            setStudyTime(autoWeeks);
                            generateRoadmapFor(matched.subject_id, parseInt(autoWeeks), currentUserId);
                        } else {
                            setStudyTime(autoWeeks);
                        }
                    }
                }
            })
            .catch(err => console.error('Error fetching subjects:', err));

        fetchAllRoadmaps(currentUserId);
    }, [searchParams, currentUserId]);

    const handleGenerateRoadmap = () => {
        if (!selectedSubjectId || !studyTime || !currentUserId) return;
        generateRoadmapFor(parseInt(selectedSubjectId), parseInt(studyTime), currentUserId);
    };

    // ── Styling helpers ──
    const cardStyle = isDark
        ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300'
        : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)] hover:shadow-[6px_6px_0_0_rgba(26,26,26,1)] transition-all duration-200';
    const text = isDark ? 'text-white' : 'text-[#1A1A1A]';
    const textMuted = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';

    // ════════════════════════════════════════════════════
    // DETAIL VIEW — Xem chi tiết một roadmap
    // ════════════════════════════════════════════════════
    if (viewingRoadmap) {
        const roadmapData = viewingRoadmap;
        return (
            <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                            <button onClick={() => setViewingRoadmap(null)} className="hover:text-[#FF6B4A] transition-colors">AI Roadmap</button>
                            <CaretRight className="w-4 h-4" />
                            <span className="text-[#FF6B4A]">{roadmapData.subject_name}</span>
                        </div>
                        <h1 className={`text-3xl font-extrabold ${text}`}>
                            Lộ trình: {roadmapData.subject_name}
                        </h1>
                        <p className={`${textMuted} font-semibold mt-1`}>
                            {roadmapData.total_time} tuần · {roadmapData.chapters?.length ?? 0} chương · Tạo lúc {new Date(roadmapData.created_at).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setViewingRoadmap(null)}
                            className={`flex items-center gap-2 font-extrabold h-11 px-5 rounded-2xl text-sm transition-colors ${isDark ? 'border-2 border-white/20 bg-white/5 text-white hover:bg-white/10' : 'border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                        >
                            <ArrowLeft className="w-4 h-4" /> Quay lại
                        </button>
                        <button
                            onClick={() => handleDeleteRoadmap(roadmapData)}
                            className={`flex items-center gap-2 font-extrabold h-11 px-5 rounded-2xl text-sm transition-colors ${isDark ? 'border-2 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                            <Trash className="w-4 h-4" /> Xoá lộ trình
                        </button>
                    </div>
                </div>

                {/* AI suggestion banner */}
                <div className="bg-[#1A1A1A] rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
                    <div className="flex gap-4 items-start relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-[#FCE38A] border-2 border-[#1A1A1A]/20 flex items-center justify-center shrink-0 text-xl">💡</div>
                        <div>
                            <h2 className="text-xl font-extrabold mb-2">AI Gợi ý đặc biệt</h2>
                            <p className="text-white/60 text-sm font-semibold leading-relaxed max-w-lg">
                                {roadmapData.chapters?.length > 0
                                    ? <>Hãy bắt đầu với <span className="font-extrabold text-[#FCE38A]">{roadmapData.chapters[0].title}</span> — {roadmapData.chapters[0].lessons?.length ?? 0} bài học đang chờ bạn.</>
                                    : 'Hãy bắt đầu từ chương đầu tiên và hoàn thành từng bài theo lộ trình AI đề xuất.'
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/student/study')} className="bg-[#ff7849] hover:bg-[#ff8b63] text-white font-extrabold px-8 h-11 rounded-2xl shrink-0 transition-colors">
                        Học ngay →
                    </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Roadmap timeline */}
                    <div className={`${cardStyle} flex-1 rounded-3xl p-8`}>
                        <div className="flex items-center justify-between mb-12">
                            <h2 className={`font-extrabold text-xl flex items-center gap-2 ${text}`}>
                                <TrendUp className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> Con đường chinh phục 9.5
                            </h2>
                            <span className={`text-xs font-extrabold px-3 py-1.5 rounded-2xl ${isDark ? 'bg-[#fce38a]/85 text-[#2a2a2a] border border-[#fce38a]/40' : 'bg-[#FCE38A] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}>
                                {roadmapData.chapters?.length ?? 0} chương · {roadmapData.total_time} tuần
                            </span>
                        </div>

                        <div className="relative max-w-2xl mx-auto flex flex-col items-center pb-8">
                            <div className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-2 rounded-full ${isDark ? 'bg-white/10 border border-[#1A1A1A]/20' : 'bg-[#1A1A1A]/10 border border-[#1A1A1A]/20'}`} />
                            {(roadmapData.chapters || []).map((chapter, i) => {
                                const isRight = i % 2 === 0;
                                const isFirst = i === 0;
                                return (
                                    <div key={chapter.id} className={`relative w-full flex ${isRight ? 'justify-end pr-12' : 'justify-start pl-12'} items-center mb-16`}>
                                        <div className={`absolute left-1/2 -translate-x-1/2 ${isFirst ? 'w-12 h-12 border-[3px] border-[#FF6B4A]' : 'w-10 h-10 border-2'} rounded-full flex items-center justify-center z-10 shadow-md ${isFirst
                                            ? (isDark ? 'bg-[#17171d] ring-4 ring-[#17171d]' : 'bg-white ring-4 ring-white')
                                            : (isDark ? 'bg-[#1e222a] border-white/20' : 'bg-[#F7F7F2] border-[#1A1A1A]/20')}`}>
                                            {isFirst ? (
                                                <div className="w-8 h-8 rounded-full bg-[#FF6B4A]/10 flex items-center justify-center">
                                                    <GraduationCap className="w-4 h-4 text-[#FF6B4A]" weight="fill" />
                                                </div>
                                            ) : (
                                                <span className={`text-xs font-extrabold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/50'}`}>{i + 1}</span>
                                            )}
                                        </div>
                                        <div className={`w-[45%] p-5 rounded-3xl ${isFirst
                                            ? `border-2 border-[#FF6B4A] shadow-md ${isDark ? 'bg-[#FF6B4A]/12' : 'bg-[#FF6B4A]/10'}`
                                            : `border-2 ${isDark ? 'border-white/10 bg-[#20242b]' : 'border-[#1A1A1A]/15 bg-[#F7F7F2]'}`} ${isRight ? 'text-right' : 'text-left'}`}>
                                            {isFirst && (
                                                <span className="text-[9px] font-extrabold text-white bg-[#FF6B4A] px-2 py-0.5 rounded-full uppercase mb-2 inline-block">Bắt đầu</span>
                                            )}
                                            <h3 className={`font-extrabold mb-1 ${text}`}>{chapter.title}</h3>
                                            <p className={`text-xs font-bold ${textMuted}`}>{chapter.lessons?.length ?? 0} bài học</p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Goal */}
                            <div className="relative w-full flex justify-start items-center pl-12">
                                <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#FCE38A] border-2 border-[#1A1A1A] flex items-center justify-center z-10 shadow-md">
                                    <Trophy className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                </div>
                                <div className="w-[45%] p-6 rounded-3xl border border-[#1A1A1A]/20" style={{ backgroundColor: isDark ? '#f2d977' : '#FCE38A' }}>
                                    <span className="text-xs font-extrabold uppercase tracking-widest mb-2 block text-[#1A1A1A]/50">MỤC TIÊU CUỐI</span>
                                    <div className="text-4xl font-extrabold text-[#1A1A1A]">9.5+</div>
                                    <p className="text-sm font-bold mt-1 text-[#1A1A1A]/60">Vượt ngưỡng kỳ thi quốc gia</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="w-full xl:w-72 flex flex-col gap-5 shrink-0">
                        {/* Progress */}
                        <div className={`${cardStyle} rounded-3xl overflow-hidden`}>
                            <div className={`px-6 py-4 ${isDark ? 'border-b border-white/10' : 'border-b-2 border-[#1A1A1A]'}`}>
                                <h3 className={`font-extrabold text-lg ${text}`}>Tiến độ vs mục tiêu</h3>
                            </div>
                            <div className="p-5">
                                <div className={`flex justify-between text-sm font-extrabold mb-2 ${text}`}>
                                    <span>Tỉ lệ hoàn thành</span>
                                    <span className="text-[#FF6B4A]">42%</span>
                                </div>
                                <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 mb-5 overflow-hidden">
                                    <div className="w-[42%] h-full bg-[#FF6B4A] rounded-full" />
                                </div>
                                <div className="flex items-end justify-between h-28 gap-1.5 mb-2">
                                    {CHART_DATA.map((col, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1 h-full flex-1">
                                            <div className="w-full flex items-end justify-stretch h-full">
                                                <div className="w-full rounded-t-xl relative border-2 border-dashed border-transparent"
                                                    style={{ height: `${col.val}%`, backgroundColor: col.dashed ? 'transparent' : (col.bg || '#1A1A1A'), borderColor: col.dashed ? '#1A1A1A30' : 'transparent' }}>
                                                    {col.current && (
                                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#FF6B4A] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap">9.2</div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-extrabold ${col.current ? 'text-[#FF6B4A]' : (isDark ? 'text-[#94a3b8]' : 'text-[#1A1A1A]/40')}`}>{col.week}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={`${isDark ? 'bg-[#f6e08e]/85 border border-[#f6e08e]/35 text-[#5a4f25]' : 'bg-[#FCE38A] border-2 border-[#1A1A1A]/15 text-[#1A1A1A]/70'} rounded-2xl p-3 flex gap-2 text-sm font-semibold mt-3`}>
                                    <span>✨</span>
                                    <p>Bạn đang nhanh hơn lộ trình <strong className="font-extrabold text-[#1A1A1A]">3 ngày</strong>!</p>
                                </div>
                            </div>
                        </div>

                        {/* Skills */}
                        <div className={`${cardStyle} rounded-3xl overflow-hidden`}>
                            <div className={`px-6 py-4 ${isDark ? 'border-b border-white/10' : 'border-b-2 border-[#1A1A1A]'}`}>
                                <h3 className={`font-extrabold text-lg ${text}`}>Chi tiết kỹ năng (AI)</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {SKILLS.map((s, i) => (
                                    <div key={i}>
                                        <div className={`flex justify-between text-sm font-extrabold mb-1.5 ${text}`}>
                                            <span>{s.label}</span>
                                            <span className="text-[#FF6B4A]">{s.diff}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.bg }} />
                                        </div>
                                    </div>
                                ))}
                                <button className={`w-full h-12 font-extrabold text-sm rounded-2xl flex items-center justify-between px-4 mt-2 transition-all ${isDark ? 'bg-[#ff7849]/15 border border-[#ff8b63]/45 text-[#ffe4dc] hover:bg-[#ff7849]/25' : 'bg-[#FFF3EF] border-2 border-[#FF6B4A]/35 text-[#C2412D] hover:bg-[#FFE6DE]'}`}>
                                    <span className="inline-flex items-center gap-2">
                                        <Question className="w-4 h-4 text-[#FF6B4A]" weight="fill" /> Kiểm tra năng lực
                                    </span>
                                    <ArrowRight className={`w-4 h-4 ${isDark ? 'text-[#ffd5c7]' : 'text-[#FF6B4A]'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // ════════════════════════════════════════════════════
    // LIST VIEW — Trang chủ: Danh sách + Form tạo mới
    // ════════════════════════════════════════════════════
    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                    <span>Trang chủ</span><CaretRight className="w-4 h-4" /><span className="text-[#FF6B4A]">AI Roadmap</span>
                </div>
                <h1 className={`text-3xl font-extrabold ${text}`}>Lộ trình Học tập AI</h1>
                <p className={`${textMuted} font-semibold mt-1`}>Quản lý và tạo lộ trình cá nhân hóa do AI thiết kế dựa trên năng lực thực tế.</p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* ── LEFT: Danh sách Roadmaps ── */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-extrabold flex items-center gap-2 ${text}`}>
                            <MapTrifold className="w-5 h-5 text-[#FF6B4A]" weight="fill" />
                            Các lộ trình của bạn
                            {allRoadmaps.length > 0 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-[#FF6B4A]/20 text-[#FF6B4A]' : 'bg-[#FF6B4A]/10 text-[#FF6B4A]'}`}>
                                    {allRoadmaps.length}
                                </span>
                            )}
                        </h2>
                    </div>

                    {allRoadmaps.length === 0 ? (
                        <div className={`${cardStyle} rounded-3xl p-10 text-center`}>
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FCE38A] to-[#FF6B4A] flex items-center justify-center mx-auto mb-5 text-3xl shadow-lg border-2 border-[#1A1A1A]/10">
                                🚀
                            </div>
                            <h3 className={`text-xl font-extrabold mb-2 ${text}`}>Chưa có lộ trình nào</h3>
                            <p className={`${textMuted} font-semibold text-sm max-w-md mx-auto`}>
                                Hãy tạo lộ trình đầu tiên bằng form bên phải. AI sẽ phân tích năng lực và thiết kế lộ trình tối ưu cho bạn.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allRoadmaps.map((roadmap, index) => {
                                const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                                const totalLessons = roadmap.chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0);
                                return (
                                    <div
                                        key={roadmap.roadmapid}
                                        onClick={() => setViewingRoadmap(roadmap)}
                                        className={`${cardStyle} rounded-3xl p-6 cursor-pointer group relative overflow-hidden`}
                                    >
                                        {/* Color accent */}
                                        <div className="absolute top-0 left-0 w-full h-1.5 rounded-t-3xl" style={{ backgroundColor: color }} />
                                        
                                        <div className="flex items-start justify-between mb-4 mt-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shadow-md" style={{ backgroundColor: color }}>
                                                    <BookOpen className="w-6 h-6" weight="fill" />
                                                </div>
                                                <div>
                                                    <h3 className={`font-extrabold text-lg ${text}`}>{roadmap.subject_name}</h3>
                                                    <p className={`text-xs font-semibold ${textMuted}`}>
                                                        Tạo {new Date(roadmap.created_at).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteRoadmap(roadmap, e)}
                                                disabled={isDeleting === roadmap.roadmapid}
                                                className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}
                                                title="Xoá lộ trình"
                                            >
                                                {isDeleting === roadmap.roadmapid ? (
                                                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                                ) : (
                                                    <Trash className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex gap-3 mb-4">
                                            <div className={`flex-1 rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-[#F7F7F2]'}`}>
                                                <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Chương</p>
                                                <p className={`text-lg font-extrabold ${text}`}>{roadmap.chapters?.length ?? 0}</p>
                                            </div>
                                            <div className={`flex-1 rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-[#F7F7F2]'}`}>
                                                <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Bài học</p>
                                                <p className={`text-lg font-extrabold ${text}`}>{totalLessons}</p>
                                            </div>
                                            <div className={`flex-1 rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-[#F7F7F2]'}`}>
                                                <p className={`text-[10px] font-bold uppercase ${textMuted}`}>Thời gian</p>
                                                <p className={`text-lg font-extrabold ${text}`}>{roadmap.total_time}<span className={`text-xs font-bold ${textMuted}`}> tuần</span></p>
                                            </div>
                                        </div>

                                        {/* Action hint */}
                                        <div className={`flex items-center justify-between text-xs font-extrabold px-1 ${isDark ? 'text-[#FF6B4A]' : 'text-[#FF6B4A]'}`}>
                                            <span className="flex items-center gap-1">
                                                <TrendUp className="w-3.5 h-3.5" weight="fill" /> Mục tiêu 9.5+
                                            </span>
                                            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Xem chi tiết <ArrowRight className="w-3 h-3" weight="bold" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Form tạo mới ── */}
                <div className="w-full xl:w-[360px] shrink-0">
                    <div className={`${cardStyle} rounded-3xl p-6 space-y-5 sticky top-8`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#FF6B4A] flex items-center justify-center">
                                <Sparkle className="w-5 h-5 text-white" weight="fill" />
                            </div>
                            <div>
                                <h2 className={`text-lg font-extrabold ${text}`}>Tạo Lộ trình mới</h2>
                                <p className={`text-xs font-semibold ${textMuted}`}>AI sẽ thiết kế lộ trình phù hợp</p>
                            </div>
                        </div>

                        {availableSubjects.length === 0 && allRoadmaps.length > 0 ? (
                            <div className={`${isDark ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border-2 border-emerald-200'} rounded-2xl p-4 text-center`}>
                                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" weight="bold" />
                                <p className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Tất cả các môn đã có lộ trình!</p>
                                <p className={`text-xs font-semibold mt-1 ${textMuted}`}>Xoá lộ trình cũ nếu muốn tạo lại.</p>
                            </div>
                        ) : (
                            <>
                                {/* Subject selection */}
                                <div className="space-y-2">
                                    <label className={`text-xs font-extrabold uppercase tracking-wider block ${textMuted}`}>
                                        Môn học muốn ôn tập
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedSubjectId}
                                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                                            className={`w-full h-12 rounded-2xl px-4 appearance-none font-bold focus:outline-none transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]'}`}
                                        >
                                            <option value="">Chọn môn học...</option>
                                            {availableSubjects.map(s => (
                                                <option key={s.subject_id} value={s.subject_id.toString()}>{s.subject_name}</option>
                                            ))}
                                        </select>
                                        <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Study time selection */}
                                <div className="space-y-2">
                                    <label className={`text-xs font-extrabold uppercase tracking-wider block ${textMuted}`}>
                                        Thời gian để học
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={studyTime}
                                            onChange={(e) => setStudyTime(e.target.value)}
                                            className={`w-full h-12 rounded-2xl px-4 appearance-none font-bold focus:outline-none transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]'}`}
                                        >
                                            <option value="">Chọn thời gian...</option>
                                            {TIME_OPTIONS.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                        <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Preview */}
                                {selectedSubjectId && studyTime && (
                                    <div className={`${isDark ? 'bg-[#B8B5FF]/10 border border-[#B8B5FF]/30' : 'bg-[#B8B5FF]/15 border-2 border-[#B8B5FF]/30'} rounded-2xl p-4 animate-[slideUp_0.3s_ease-out]`}>
                                        <p className={`text-xs font-bold ${isDark ? 'text-[#B8B5FF]' : 'text-[#6c68b0]'}`}>
                                            ✨ AI sẽ tạo lộ trình môn <strong>{selectedSubjectName}</strong> trong <strong>{TIME_OPTIONS.find(t => t.value === studyTime)?.label}</strong>
                                        </p>
                                    </div>
                                )}

                                {/* Generate button */}
                                <button
                                    onClick={handleGenerateRoadmap}
                                    disabled={!selectedSubjectId || !studyTime || isGenerating}
                                    className="w-full h-12 bg-[#ff7849] hover:bg-[#ff8b63] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-[#ff7849]/25"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            AI đang tạo...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkle className="w-4 h-4" weight="fill" />
                                            Tạo Lộ trình AI
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
