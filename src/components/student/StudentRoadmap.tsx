import { useState, useEffect } from 'react';
import { ArrowClockwise, Check, GraduationCap, Trophy, TrendUp, Question, ArrowRight, CaretRight, CaretDown, Clock, Sparkle } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';

import { FAST_API_BASE_URL as FAST_API_URL } from '../../services/env';

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
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [hasRoadmap, setHasRoadmap] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [studyTime, setStudyTime] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiSubjects, setApiSubjects] = useState<{ subject_id: number; subject_name: string }[]>([]);
    const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);

    const selectedSubjectName = apiSubjects.find(s => s.subject_id.toString() === selectedSubjectId)?.subject_name || '';

    const generateRoadmapFor = async (subId: number, wks: number) => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${FAST_API_URL}/roadmap/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userid: 1, // hardcoded for now
                    subject_id: subId,
                    total_weeks: wks
                })
            });
            if (!response.ok) throw new Error('Failed to generate roadmap');
            const data = await response.json();
            setRoadmapData(data);
            setHasRoadmap(true);
            
            // Xoá search params sau khi tạo thành công để không bị lặp lại
            searchParams.delete('auto');
            setSearchParams(searchParams);
        } catch (err) {
            console.error('Error generating roadmap:', err);
            alert('Có lỗi khi tạo lộ trình. Vui lòng thử lại.');
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const autoSubject = searchParams.get('subject');
        const autoWeeks = searchParams.get('weeks');
        const autoRun = searchParams.get('auto');

        fetch(`${FAST_API_URL}/subjects/`)
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => { 
                if (Array.isArray(data)) {
                    setApiSubjects(data); 

                    if (autoRun === 'true' && autoSubject && autoWeeks) {
                        // Match subject id logically
                        // Try exact substring match inside data
                        const subNameLower = autoSubject.toLowerCase().trim();
                        // Strip words like "thpt", "thi", etc for better matching
                        const keyword = subNameLower.replace("thpt", "").replace("thi", "").trim();

                        const matched = data.find(s => 
                            s.subject_name.toLowerCase().includes(keyword) || 
                            keyword.includes(s.subject_name.toLowerCase())
                        );

                        if (matched) {
                            setSelectedSubjectId(matched.subject_id.toString());
                            setStudyTime(autoWeeks);
                            generateRoadmapFor(matched.subject_id, parseInt(autoWeeks));
                        } else {
                            // If unable to detect subject, just populate the week and wait for user to select subject manually.
                            setStudyTime(autoWeeks);
                        }
                    }
                }
            })
            .catch(err => console.error('Error fetching subjects:', err));

        if (autoRun !== 'true') {
            fetch(`${FAST_API_URL}/roadmap/current/1`)
                .then(res => res.ok ? res.json() : Promise.reject(res.status))
                .then(data => {
                    if (data && data.roadmapid) { setRoadmapData(data); setHasRoadmap(true); }
                })
                .catch(err => console.error('Error fetching current roadmap:', err));
        }
    }, [searchParams]);

    const handleGenerateRoadmap = () => {
        if (!selectedSubjectId || !studyTime) return;
        generateRoadmapFor(parseInt(selectedSubjectId), parseInt(studyTime));
    };

    // ── Initial Form (before roadmap is generated) ──
    if (!hasRoadmap) {
        return (
            <div className="p-8 space-y-6 max-w-4xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                        <span>Trang chủ</span><CaretRight className="w-4 h-4" /><span className="text-[#FF6B4A]">AI Roadmap</span>
                    </div>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-[#1A1A1A]'}'}`}>Lộ trình Học tập AI</h1>
                    <p className={`${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'} font-semibold mt-1`}>Tạo lộ trình cá nhân hóa do AI thiết kế dựa trên năng lực thực tế.</p>
                </div>

                {/* Hero banner */}
                <div className="bg-[#1A1A1A] rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
                    <div className="absolute left-10 bottom-0 w-40 h-40 bg-[#FF6B4A]/10 rounded-full translate-y-1/2 blur-2xl pointer-events-none" />
                    <div className="relative z-10 text-center max-w-xl mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FCE38A] to-[#FF6B4A] border-2 border-[#1A1A1A]/20 flex items-center justify-center mx-auto mb-5 text-2xl shadow-lg">
                            🚀
                        </div>
                        <h2 className="text-2xl font-extrabold mb-3">Bắt đầu hành trình học tập</h2>
                        <p className="text-white/60 text-sm font-semibold leading-relaxed">
                            AI sẽ phân tích năng lực và tạo lộ trình học tập tối ưu cho bạn.
                            Hãy cho chúng tôi biết bạn muốn học gì và trong bao lâu.
                        </p>
                    </div>
                </div>

                {/* Input Form */}
                <div className={`${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_0_rgba(26,26,26,1)]'} rounded-3xl p-8 space-y-6`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#FF6B4A] flex items-center justify-center">
                            <Sparkle className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-extrabold ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Thiết lập Lộ trình AI</h2>
                            <p className={`text-sm font-semibold ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'}`}>Nhập thông tin để AI tạo lộ trình phù hợp</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Subject selection */}
                        <div className="space-y-2">
                            <label className={`text-xs font-extrabold uppercase tracking-wider block ${isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400'}`}>
                                Môn học muốn ôn tập
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className={`w-full h-12 rounded-2xl px-4 appearance-none font-bold focus:outline-none transition-colors ${isDark ? 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]' : 'bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 text-[#1A1A1A] focus:border-[#FF6B4A]'}`}
                                >
                                    <option value="">Chọn môn học...</option>
                                    {apiSubjects.map(s => (
                                        <option key={s.subject_id} value={s.subject_id.toString()}>{s.subject_name}</option>
                                    ))}
                                </select>
                                <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                            {selectedSubjectId && (
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mt-1">
                                    <Check className="w-3.5 h-3.5" weight="bold" />
                                    Đã chọn: {selectedSubjectName}
                                </div>
                            )}
                        </div>

                        {/* Study time selection */}
                        <div className="space-y-2">
                            <label className={`text-xs font-extrabold uppercase tracking-wider block ${isDark ? 'text-[#1A1A1A]/50' : 'text-gray-400'}`}>
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
                            {studyTime && (
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mt-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Thời gian: {TIME_OPTIONS.find(t => t.value === studyTime)?.label}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview what AI will do */}
                    {selectedSubjectId && studyTime && (
                        <div className={`${isDark ? 'bg-[#2b2941] border border-[#6f68a6]/50' : 'bg-[#B8B5FF]/20 border-2 border-[#B8B5FF]/40'} rounded-2xl p-5 animate-[slideUp_0.3s_ease-out]`}>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#B8B5FF] flex items-center justify-center shrink-0 text-sm"></div>
                                <div>
                                    <h4 className={`font-extrabold mb-1 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>AI sẽ tạo lộ trình cho bạn</h4>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-[#d0cde8]' : 'text-[#1A1A1A]/60'}`}>
                                        Môn <strong className={isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}>{selectedSubjectName}</strong> trong <strong className={isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}>{TIME_OPTIONS.find(t => t.value === studyTime)?.label}</strong> —
                                        bao gồm phân tích năng lực, lộ trình từng tuần, và mục tiêu điểm số.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate button */}
                    <button
                        onClick={handleGenerateRoadmap}
                        disabled={!selectedSubjectId || !studyTime || isGenerating}
                        className="w-full h-14 bg-[#ff7849] hover:bg-[#ff8b63] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-[#ff7849]/25"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                AI đang tạo lộ trình...
                            </>
                        ) : (
                            <>
                                <Sparkle className="w-5 h-5" weight="fill" />
                                Tạo Lộ trình AI
                                <ArrowRight className="w-5 h-5" weight="bold" />
                            </>
                        )}
                    </button>
                </div>

                {/* Keyframes */}
                <style>{`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // ── Roadmap View (after generation) ──
    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                        <span>Trang chủ</span><CaretRight className="w-4 h-4" /><span className="text-[#FF6B4A]">AI Roadmap</span>
                    </div>
                    <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-[#1A1A1A]'}'}`}>Lộ trình Học tập AI</h1>
                    <p className={`${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'} font-semibold mt-1`}>
                        {roadmapData ? `Môn ${roadmapData.subject_name} · ${roadmapData.total_time} tuần` : 'Lộ trình cá nhân hóa do AI thiết kế dựa trên năng lực thực tế.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setHasRoadmap(false)}
                        className={`flex items-center gap-2 font-extrabold h-11 px-6 rounded-2xl text-sm transition-colors ${isDark ? 'border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50' : 'border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                    >
                        <ArrowClockwise className="w-4 h-4" /> Tạo lại lộ trình
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
                            {roadmapData && roadmapData.chapters?.length > 0
                                ? <>Hãy bắt đầu với <span className="font-extrabold text-[#FCE38A]">{roadmapData.chapters[0].title}</span> — {roadmapData.chapters[0].lessons?.length ?? 0} bài học đang chờ bạn.</>
                                : 'Hãy bắt đầu từ chương đầu tiên và hoàn thành từng bài theo lộ trình AI đề xuất.'
                            }
                        </p>
                    </div>
                </div>
                <button className="bg-[#ff7849] hover:bg-[#ff8b63] text-white font-extrabold px-8 h-11 rounded-2xl shrink-0 transition-colors">
                    Học ngay →
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-6">
                {/* Roadmap timeline */}
                <div className={`${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'} flex-1 rounded-3xl p-8`}>
                    <div className="flex items-center justify-between mb-12">
                        <h2 className={`font-extrabold text-xl flex items-center gap-2 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                            <TrendUp className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> Con đường chinh phục 9.5
                        </h2>
                        <span className={`text-xs font-extrabold px-3 py-1.5 rounded-2xl ${isDark ? 'bg-[#fce38a]/85 text-[#2a2a2a] border border-[#fce38a]/40' : 'bg-[#FCE38A] border-2 border-[#1A1A1A]/20 text-[#1A1A1A]'}`}>
                            {roadmapData ? `${roadmapData.chapters?.length ?? 0} chương · ${roadmapData.total_time} tuần` : '-'}
                        </span>
                    </div>

                    <div className="relative max-w-2xl mx-auto flex flex-col items-center pb-8">
                        {/* Timeline line */}
                        <div className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-2 rounded-full ${isDark ? 'bg-white/10 border border-[#1A1A1A]/20' : 'bg-[#1A1A1A]/10 border border-[#1A1A1A]/20'}`} />

                        {/* Chapters from API */}
                        {(roadmapData?.chapters || []).map((chapter, i) => {
                            const isRight = i % 2 === 0;
                            const isFirst = i === 0;
                            return (
                                <div key={chapter.id} className={`relative w-full flex ${isRight ? 'justify-end pr-12' : 'justify-start pl-12'} items-center mb-16`}>
                                    <div className={`absolute left-1/2 -translate-x-1/2 ${isFirst ? 'w-12 h-12 border-[3px] border-[#FF6B4A]' : 'w-10 h-10 border-2'} rounded-full flex items-center justify-center z-10 shadow-md ${isFirst
                                        ? (isDark ? 'bg-[#17171d] ring-4 ring-[#17171d]' : 'bg-white ring-4 ring-white')
                                        : (isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-[#F7F7F2] border-[#1A1A1A]/20')}`}>
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
                                        : `border-2 ${isDark ? 'border-[#1A1A1A]/20 bg-[#20242b]' : 'border-[#1A1A1A]/15 bg-[#F7F7F2]'}`} ${isRight ? 'text-right' : 'text-left'}`}>
                                        {isFirst && (
                                            <span className="text-[9px] font-extrabold text-white bg-[#FF6B4A] px-2 py-0.5 rounded-full uppercase mb-2 inline-block">Bắt đầu</span>
                                        )}
                                        <h3 className={`font-extrabold mb-1 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{chapter.title}</h3>
                                        <p className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{chapter.lessons?.length ?? 0} bài học</p>
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
                                <span className={`text-xs font-extrabold uppercase tracking-widest mb-2 block ${isDark ? 'text-[#4a4321]/70' : 'text-[#1A1A1A]/50'}`}>MỤC TIÊU CUỐI</span>
                                <div className={`text-4xl font-extrabold ${isDark ? 'text-[#302a11]' : 'text-[#1A1A1A]'}`}>9.5+</div>
                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-[#554b1f]/75' : 'text-[#1A1A1A]/60'}`}>Vượt ngưỡng kỳ thi quốc gia</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full xl:w-72 flex flex-col gap-5 shrink-0">
                    {/* Progress */}
                    <div className={`${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'} rounded-3xl overflow-hidden`}>
                        <div className={`px-6 py-4 ${isDark ? 'border-b border-[#1A1A1A]/20' : 'border-b-2 border-[#1A1A1A]'}`}>
                            <h3 className={`font-extrabold text-lg ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Tiến độ vs mục tiêu</h3>
                        </div>
                        <div className="p-5">
                            <div className={`flex justify-between text-sm font-extrabold mb-2 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                <span>Tỉ lệ hoàn thành</span>
                                <span className="text-[#FF6B4A]">42%</span>
                            </div>
                            <div className="h-3 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 mb-5 overflow-hidden">
                                <div className="w-[42%] h-full bg-[#FF6B4A] rounded-full" />
                            </div>

                            {/* Mini bar chart */}
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
                    <div className={`${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300' : 'bg-white border-2 border-[#1A1A1A]'} rounded-3xl overflow-hidden`}>
                        <div className={`px-6 py-4 ${isDark ? 'border-b border-[#1A1A1A]/20' : 'border-b-2 border-[#1A1A1A]'}`}>
                            <h3 className={`font-extrabold text-lg ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Chi tiết kỹ năng (AI)</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {SKILLS.map((s, i) => (
                                <div key={i}>
                                    <div className={`flex justify-between text-sm font-extrabold mb-1.5 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                                        <span>{s.label}</span>
                                        <span className="text-[#FF6B4A]">{s.diff}</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-[#1A1A1A]/10 rounded-full border border-[#1A1A1A]/15 overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.bg }} />
                                    </div>
                                </div>
                            ))}
                            <button className={`w-full h-12 font-extrabold text-sm rounded-2xl flex items-center justify-between px-4 mt-2 transition-all ${isDark ? 'bg-[#ff7849]/15 border border-[#ff8b63]/45 text-[#ffe4dc] hover:bg-[#ff7849]/25 hover:border-[#ff9a73]' : 'bg-[#FFF3EF] border-2 border-[#FF6B4A]/35 text-[#C2412D] hover:bg-[#FFE6DE] hover:border-[#FF6B4A]/55'}`}>
                                <span className="inline-flex items-center gap-2">
                                    <Question className="w-4 h-4 text-[#FF6B4A]" weight="fill" /> Kiểm tra năng lực
                                </span>
                                <ArrowRight className={`w-4 h-4 ${isDark ? 'text-[#ffd5c7]' : 'text-[#FF6B4A]'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
