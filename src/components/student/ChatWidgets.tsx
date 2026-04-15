import { MapTrifold, BookOpenText, ArrowRight, Exam } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export const RoadmapWidget = ({ subjectName, totalWeeks }: { subjectName?: string, totalWeeks?: string }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const query = new URLSearchParams();
        if (subjectName) query.set('subject', subjectName);
        if (totalWeeks) query.set('weeks', totalWeeks);
        query.set('auto', 'true');
        navigate(`/student/roadmap?${query.toString()}`);
    };

    return (
        <div className="mt-3 mb-1 p-3.5 rounded-xl border-2 border-[#FF6B4A]/30 bg-[#FF6B4A]/5 flex flex-col gap-3 shadow-sm w-full mx-auto">
            <div className="flex items-center gap-1.5 text-[#FF6B4A]">
                <MapTrifold className="w-5 h-5" weight="fill" />
                <div className="font-extrabold text-[14px]">Tạo Lộ trình Học Tập</div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#1A1A1A]/10">
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-bold px-1">
                    <div className="flex gap-1.5 items-center shrink-0">
                        <span className="opacity-60">Môn:</span>
                        <span className="text-[#FF6B4A]">{subjectName || 'Chưa xác định'}</span>
                    </div>
                    {totalWeeks && (
                        <>
                            <div className="w-px h-3 bg-[#1A1A1A]/20 shrink-0 hidden sm:block"></div>
                            <div className="flex gap-1.5 items-center shrink-0">
                                <span className="opacity-60">Thời gian:</span>
                                <span className="text-[#FF6B4A]">{totalWeeks} tuần</span>
                            </div>
                        </>
                    )}
                </div>
                
                <button 
                    onClick={handleClick}
                    className="flex items-center justify-center gap-1.5 bg-[#FF6B4A] hover:bg-[#FF8A70] text-white px-5 py-2 rounded-lg text-sm font-extrabold transition-colors shrink-0"
                >
                    Tạo lộ trình ngay
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                </button>
            </div>
        </div>
    );
};

export const QuizWidget = ({ subjectName, numQuestions, topics }: { subjectName?: string, numQuestions?: string, topics?: string }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const query = new URLSearchParams();
        if (subjectName) query.set('subject', subjectName);
        if (numQuestions) query.set('questions', numQuestions);
        if (topics) query.set('topics', topics);
        navigate(`/student/study?${query.toString()}`);
    };

    return (
        <div className="mt-3 mb-1 p-3.5 rounded-xl border-2 border-[#B8B5FF]/40 bg-[#B8B5FF]/10 flex flex-col gap-3 shadow-sm w-full mx-auto">
            <div className="flex items-center gap-1.5 text-[#7C6FE0]">
                <Exam className="w-5 h-5" weight="fill" />
                <div className="font-extrabold text-[14px]">Luyện đề Trắc nghiệm</div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#1A1A1A]/10">
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-bold px-1">
                    <div className="flex gap-1.5 items-center shrink-0">
                        <span className="opacity-60">Môn:</span>
                        <span className="text-[#7C6FE0]">{subjectName || 'Chưa xác định'}</span>
                    </div>
                    {numQuestions && (
                        <>
                            <div className="w-px h-3 bg-[#1A1A1A]/20 shrink-0 hidden sm:block"></div>
                            <div className="flex gap-1.5 items-center shrink-0">
                                <span className="opacity-60">Số câu:</span>
                                <span className="text-[#7C6FE0]">{numQuestions} câu</span>
                            </div>
                        </>
                    )}
                    {topics && (
                        <>
                            <div className="w-px h-3 bg-[#1A1A1A]/20 shrink-0 hidden sm:block"></div>
                            <div className="flex gap-1.5 items-center shrink-0 max-w-[200px]">
                                <span className="opacity-60">Chủ đề:</span>
                                <span className="text-[#7C6FE0] truncate" title={topics}>{topics}</span>
                            </div>
                        </>
                    )}
                </div>
                
                <button 
                    onClick={handleClick}
                    className="flex items-center justify-center gap-1.5 bg-[#7C6FE0] hover:bg-[#8F84E8] text-white px-5 py-2 rounded-lg text-sm font-extrabold transition-colors shrink-0"
                >
                    Bắt đầu quiz
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                </button>
            </div>
        </div>
    );
};

export const DocumentWidget = ({ bookId, sectionId }: { bookId?: string, sectionId?: string }) => {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const query = new URLSearchParams();
        if (bookId) query.set('book', bookId);
        if (sectionId) query.set('lesson', sectionId);
        navigate(`/student/study?${query.toString()}`);
    };

    return (
        <div className="mt-3 mb-1 p-3.5 rounded-xl border-2 border-[#95E1D3]/50 bg-[#95E1D3]/10 flex flex-col gap-3 shadow-sm w-full mx-auto">
            <div className="flex items-center gap-1.5 text-[#2A9D8F]">
                <BookOpenText className="w-5 h-5" weight="fill" />
                <div className="font-extrabold text-[14px]">Tài liệu Tham khảo</div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[#1A1A1A]/10">
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-bold px-1">
                    <div className="flex gap-1.5 items-center shrink-0">
                        <span className="opacity-60 text-[11px] uppercase tracking-wider">Nguồn:</span>
                        <span className="text-[#2A9D8F]">Sách {bookId} • Bài {sectionId}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleClick}
                    className="flex items-center justify-center gap-1.5 bg-[#2A9D8F] hover:bg-[#34b6a7] text-white px-5 py-2 rounded-lg text-sm font-extrabold transition-colors shrink-0"
                >
                    Đọc tài liệu
                    <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                </button>
            </div>
        </div>
    );
};
