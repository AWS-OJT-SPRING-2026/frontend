import { useState } from 'react';
import { CaretLeft, CaretDown, CaretRight, BookOpen, FileText, Stack } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lesson {
    id: number;
    title: string;
    content: string;
    readTime: number;
}

interface Chapter {
    id: number;
    title: string;
    lessons: Lesson[];
}

interface Subject {
    id: number;
    name: string;
    color: string;
    bg: string;
    iconKey: 'NguVan' | 'Toan' | 'VatLy' | 'HoaHoc' | 'TiengAnh' | 'LichSu';
    chapters: Chapter[];
}

// ─── Subject Icons (SVG geometric, monochromatic per subject) ─────────────────
const SubjectIcons: Record<string, (color: string, isDark?: boolean) => React.ReactNode> = {
    NguVan: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1E3E62';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                {/* Book body - solid stroke for clarity */}
                <rect x="6" y="4" width="22" height="30" rx="3" fill={c} fillOpacity="0.22" stroke={ink} strokeWidth="2.5" />
                {/* Lines of text */}
                <rect x="10" y="10" width="14" height="2.5" rx="1" fill={ink} />
                <rect x="10" y="15" width="14" height="2.5" rx="1" fill={ink} />
                <rect x="10" y="20" width="10" height="2.5" rx="1" fill={ink} />
                {/* Ink drop or accent */}
                <circle cx="28" cy="28" r="5" fill={c} />
                <circle cx="28" cy="28" r="2.5" fill="white" fillOpacity="0.5" />
            </svg>
        );
    },
    Toan: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1A1A1A';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                {/* Plus cross - made bold and dark center */}
                <rect x="17" y="6" width="6" height="28" rx="3" fill={ink} />
                <rect x="6" y="17" width="28" height="6" rx="3" fill={ink} />
                {/* Accent dots in subject color */}
                <circle cx="10" cy="10" r="3.5" fill={c} />
                <circle cx="30" cy="30" r="3.5" fill={c} />
                <circle cx="30" cy="10" r="3.5" fill={c} opacity="0.5" />
                <circle cx="10" cy="30" r="3.5" fill={c} opacity="0.5" />
            </svg>
        );
    },
    VatLy: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1A1A1A';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                {/* Orbits */}
                <ellipse cx="20" cy="20" rx="17" ry="6" stroke={ink} strokeWidth="2.5" fill="none" opacity="0.4" />
                <ellipse cx="20" cy="20" rx="17" ry="6" stroke={ink} strokeWidth="2.5" fill="none" transform="rotate(60 20 20)" opacity="0.7" />
                <ellipse cx="20" cy="20" rx="17" ry="6" stroke={ink} strokeWidth="2.5" fill="none" transform="rotate(120 20 20)" />
                {/* Nucleus */}
                <circle cx="20" cy="20" r="5" fill={c} />
                <circle cx="20" cy="20" r="2.5" fill="white" opacity="0.4" />
            </svg>
        );
    },
    HoaHoc: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1A1A1A';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                {/* Flask body */}
                <path d="M12 10 L28 10 L34 32 C35 36 32 37 20 37 C8 37 5 36 6 32 Z"
                    fill={c} opacity="0.22" stroke={ink} strokeWidth="2.5" />
                {/* Liquid line */}
                <path d="M8 26 C12 24 28 28 32 26 V32 C32 35 28 35 20 35 C12 35 8 35 8 32 Z" fill={c} />
                {/* Bubbles */}
                <circle cx="15" cy="18" r="2.5" fill={ink} opacity="0.7" />
                <circle cx="24" cy="15" r="2" fill={ink} opacity="0.5" />
                <circle cx="20" cy="22" r="1.5" fill={ink} opacity="0.3" />
            </svg>
        );
    },
    TiengAnh: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1A1A1A';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <circle cx="20" cy="20" r="16" stroke={ink} strokeWidth="2.5" fill={c} fillOpacity="0.14" />
                <ellipse cx="20" cy="20" rx="6" ry="16" stroke={ink} strokeWidth="2" fill="none" />
                <line x1="4" y1="20" x2="36" y2="20" stroke={ink} strokeWidth="2" strokeLinecap="round" />
                <path d="M7 12 Q20 8 33 12" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M7 28 Q20 32 33 28" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
        );
    },
    LichSu: (c, isDark = false) => {
        const ink = isDark ? '#E5E7EB' : '#1A1A1A';
        return (
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <path d="M20 5 L35 33 H5 Z" fill={c} opacity="0.16" stroke={ink} strokeWidth="2.5" />
                <rect x="16" y="24" width="8" height="9" rx="1" fill={ink} />
                <path d="M5 33 H35" stroke={ink} strokeWidth="3" strokeLinecap="round" />
                <circle cx="20" cy="15" r="3" fill={c} />
            </svg>
        );
    },
};


// ─── Mock Data ────────────────────────────────────────────────────────────────
const subjects: Subject[] = [
    {
        id: 1, name: 'Ngữ Văn', color: '#905de9ff', bg: '#bbaefaff',
        iconKey: 'NguVan',
        chapters: [
            {
                id: 11, title: 'Chương 1: Văn học dân gian Việt Nam',
                lessons: [
                    { id: 111, readTime: 5, title: 'Khái quát văn học dân gian', content: '**Văn học dân gian** là những tác phẩm nghệ thuật ngôn từ truyền miệng, được tập thể nhân dân lao động sáng tác và lưu truyền.\n\n**Đặc trưng cơ bản:**\n- Tính truyền miệng: được lưu truyền qua nhiều thế hệ bằng miệng\n- Tính tập thể: do nhiều người cùng sáng tác và sửa đổi\n- Tính dị bản: có nhiều dị bản khác nhau ở các vùng\n\n**Các thể loại chính:**\n1. Thần thoại\n2. Sử thi\n3. Truyền thuyết\n4. Cổ tích\n5. Ca dao, tục ngữ' },
                    { id: 112, readTime: 7, title: 'Thần thoại và sử thi', content: '**Thần thoại** là những câu chuyện hư cấu về thần linh và các nhân vật siêu nhiên.\n\n**Sử thi** là những tác phẩm tự sự dài, phản ánh cuộc sống và chiến đấu của một cộng đồng trong một giai đoạn lịch sử.\n\n**Sử thi Dăm San (Ê-đê):** Kể về người anh hùng Dăm San chinh phục thiên nhiên và kẻ thù.' },
                ]
            },
            {
                id: 12, title: 'Chương 2: Văn học trung đại',
                lessons: [
                    { id: 121, readTime: 6, title: 'Khái quát văn học trung đại Việt Nam', content: '**Văn học trung đại Việt Nam** tồn tại từ thế kỷ X đến hết thế kỷ XIX.\n\n**Hai bộ phận:**\n1. **Văn học chữ Hán:** Chiếu, hịch, cáo, thơ Đường luật...\n2. **Văn học chữ Nôm:** Truyện Kiều, Cung oán ngâm khúc...' },
                    { id: 122, readTime: 10, title: 'Truyện Kiều - Nguyễn Du', content: '**Truyện Kiều** (Đoạn trường tân thanh) là truyện thơ Nôm của đại thi hào **Nguyễn Du** (1765–1820).\n\n**Giá trị nội dung:**\n- *Giá trị hiện thực:* Phản ánh xã hội phong kiến thối nát\n- *Giá trị nhân đạo:* Đề cao phẩm giá con người' },
                ]
            },
        ]
    },
    {
        id: 2, name: 'Toán học', color: '#D4A017', bg: '#FCE38A',
        iconKey: 'Toan',
        chapters: [
            {
                id: 21, title: 'Chương 1: Giới hạn và Liên tục',
                lessons: [
                    { id: 211, readTime: 8, title: 'Giới hạn của dãy số', content: '**Định nghĩa:** Số thực L được gọi là giới hạn của dãy số (uₙ) nếu |uₙ – L| nhỏ tùy ý khi n đủ lớn.\n\n**Ký hiệu:** lim uₙ = L (n → ∞)\n\n**Ví dụ:**\n- lim (1/n) = 0\n- lim ((2n+1)/(n+3)) = 2' },
                    { id: 212, readTime: 7, title: 'Giới hạn của hàm số', content: '**Định nghĩa:** lim f(x) = L khi x → x₀ nghĩa là f(x) tiến về L khi x tiến về x₀.\n\n**Giới hạn một phía:**\n- Giới hạn trái: lim⁻ f(x)\n- Giới hạn phải: lim⁺ f(x)' },
                ]
            },
            {
                id: 22, title: 'Chương 2: Đạo hàm và Vi phân',
                lessons: [
                    { id: 221, readTime: 6, title: 'Định nghĩa và ý nghĩa đạo hàm', content: '**Đạo hàm** của hàm số f(x) tại điểm x₀:\n\nf\'(x₀) = lim [f(x₀+Δx) – f(x₀)] / Δx (Δx → 0)\n\n**Bảng đạo hàm cơ bản:**\n\n| Hàm số | Đạo hàm |\n|---|---|\n| xⁿ | n·xⁿ⁻¹ |\n| sin x | cos x |\n| eˣ | eˣ |' },
                ]
            },
        ]
    },
    {
        id: 3, name: 'Vật Lý', color: '#0E9E8E', bg: '#95E1D3',
        iconKey: 'VatLy',
        chapters: [
            {
                id: 31, title: 'Chương 1: Điện học',
                lessons: [
                    { id: 311, readTime: 6, title: 'Điện tích và Định luật Coulomb', content: '**Định luật Coulomb:**\nLực tương tác giữa hai điện tích điểm q₁, q₂ đặt cách nhau r:\n\n**F = k · |q₁·q₂| / r²**\n\nTrong đó k = 9×10⁹ N·m²/C²\n\n- Cùng dấu: đẩy nhau\n- Trái dấu: hút nhau' },
                    { id: 312, readTime: 7, title: 'Điện trường và Điện thế', content: '**Điện trường** là trường lực do điện tích sinh ra.\n\n**Cường độ điện trường:** E = F/q (đơn vị: V/m)\n\n**Hiệu điện thế:** U_MN = V_M – V_N = A_MN / q' },
                ]
            },
        ]
    },
    {
        id: 4, name: 'Hóa Học', color: '#E05050', bg: '#FFB5B5',
        iconKey: 'HoaHoc',
        chapters: [
            {
                id: 41, title: 'Chương 1: Nguyên tử và Bảng tuần hoàn',
                lessons: [
                    { id: 411, readTime: 6, title: 'Cấu tạo nguyên tử', content: '**Nguyên tử** gồm:\n- **Hạt nhân:** proton (p⁺) và neutron (n)\n- **Vỏ electron:** các electron (e⁻) chuyển động xung quanh\n\n**Số hiệu nguyên tử (Z)** = số proton = số electron\n\n**Số khối (A)** = Z + N (N = số neutron)' },
                ]
            },
        ]
    },
    {
        id: 5, name: 'Tiếng Anh', color: '#2E9E55', bg: '#C8F7C5',
        iconKey: 'TiengAnh',
        chapters: [
            {
                id: 51, title: 'Chương 1: Grammar – Tenses',
                lessons: [
                    { id: 511, readTime: 5, title: 'Present Simple & Present Continuous', content: '**Present Simple – Hiện tại đơn**\n\nCấu trúc: S + V(s/es) + ...\n\n**Cách dùng:**\n- Sự thật hiển nhiên: *The sun rises in the east.*\n- Thói quen: *I go to school every day.*\n\n---\n\n**Present Continuous – Hiện tại tiếp diễn**\n\nCấu trúc: S + am/is/are + V-ing + ...' },
                ]
            },
        ]
    },
    {
        id: 6, name: 'Lịch Sử', color: '#C07820', bg: '#FFD9A0',
        iconKey: 'LichSu',
        chapters: [
            {
                id: 61, title: 'Chương 1: Việt Nam 1945–1954',
                lessons: [
                    { id: 611, readTime: 7, title: 'Cách mạng tháng Tám 1945', content: '**Bối cảnh lịch sử:**\n- Nhật đảo chính Pháp (9/3/1945), Nhật đầu hàng Đồng Minh (8/1945)\n\n**Diễn biến:**\n- 19/8/1945: Hà Nội khởi nghĩa thắng lợi\n- 2/9/1945: Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập\n\n**Ý nghĩa:**\n- Chấm dứt ách thực dân Pháp hơn 80 năm\n- Nhân dân ta làm chủ vận mệnh đất nước' },
                ]
            },
        ]
    },
];

// ─── Simple renderer ───────────────────────────────────────────────────────────
function parseInline(text: string, isDark: boolean): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className={isDark ? 'font-extrabold text-[#1A1A1A]' : 'font-extrabold text-[#1A1A1A]'}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className={isDark ? 'italic text-gray-500' : 'italic text-[#1A1A1A]/60'}>{part.slice(1, -1)}</em>;
        return part;
    });
}

function renderContent(text: string, isDark: boolean) {
    return text.split('\n').map((line, i) => {
        if (line.startsWith('- ')) return <li key={i} className={isDark ? 'ml-4 text-[#e5e7eb] font-semibold list-disc' : 'ml-4 text-[#1A1A1A]/70 font-semibold list-disc'}>{parseInline(line.slice(2), isDark)}</li>;
        if (/^\d+\.\s/.test(line)) return <li key={i} className={isDark ? 'ml-4 text-[#e5e7eb] font-semibold list-decimal' : 'ml-4 text-[#1A1A1A]/70 font-semibold list-decimal'}>{parseInline(line.replace(/^\d+\.\s/, ''), isDark)}</li>;
        if (line.startsWith('---')) return <hr key={i} className={isDark ? 'border-[#1A1A1A]/20 my-3' : 'border-[#1A1A1A]/10 my-3'} />;
        if (line.startsWith('| ')) return null;
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <p key={i} className={isDark ? 'text-[#e5e7eb] font-semibold leading-relaxed' : 'text-[#1A1A1A]/70 font-semibold leading-relaxed'}>{parseInline(line, isDark)}</p>;
    });
}

// ─── Lesson Reader ────────────────────────────────────────────────────────────
function LessonReader({ lesson, subject, onBack, isDark }: { lesson: Lesson; subject: Subject; onBack: () => void; isDark: boolean }) {
    const iconNode = SubjectIcons[subject.iconKey](subject.color, isDark);
    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <button onClick={onBack} className={`flex items-center gap-2 font-extrabold text-sm transition-colors ${isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}>
                <CaretLeft className="w-4 h-4" /> Quay lại
            </button>

            <div className={`rounded-3xl overflow-hidden ${isDark ? 'border border-[#1A1A1A]/20 bg-[#1b1b20]' : 'border-2 border-[#1A1A1A] bg-white'}`}>
                {/* Header */}
                <div className={`p-6 ${isDark ? 'border-b border-[#1A1A1A]/20' : 'border-b-2 border-[#1A1A1A]'}`} style={{ backgroundColor: isDark ? `${subject.bg}40` : subject.bg }}>
                    <span className={`inline-flex items-center gap-2 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest ${isDark ? 'border-2 border-[#1A1A1A]/20 text-[#1A1A1A] bg-white/70' : 'border-2 border-[#1A1A1A]/20 text-[#1A1A1A] bg-white/70'}`}>
                        <span className="w-4 h-4 shrink-0 flex items-center justify-center">{iconNode}</span>
                        {subject.name}
                    </span>
                    <h1 className={`text-xl font-extrabold mt-3 ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{lesson.title}</h1>
                    <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/60'}`}>
                        <BookOpen className="w-3.5 h-3.5" weight="fill" /> Thời gian đọc ≈ {lesson.readTime} phút
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-1.5">
                    {lesson.content.includes('| ') ? (() => {
                        const blocks: string[][] = [[]]
                        lesson.content.split('\n').forEach(line => {
                            if (line.startsWith('| ')) { blocks[blocks.length - 1].push(line); }
                            else { if (blocks[blocks.length - 1].length > 0) blocks.push([]); blocks[blocks.length - 1].push(line); }
                        });
                        return blocks.map((block, bi) => {
                            if (block[0]?.startsWith('| ')) {
                                const rows = block.filter(r => !r.startsWith('|---'));
                                const head = rows[0]; const body = rows.slice(1);
                                const parseRow = (r: string) => r.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
                                return (
                                    <div key={bi} className="overflow-x-auto my-3">
                                        <table className={`w-full text-sm rounded-2xl overflow-hidden ${isDark ? 'border border-[#1A1A1A]/20' : 'border-2 border-[#1A1A1A]'}`}>
                                            <thead>
                                                <tr className={isDark ? 'bg-white/5 border-b border-[#1A1A1A]/20' : 'bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]'}>
                                                    {parseRow(head).map((h, i) => <th key={i} className={isDark ? 'text-left px-4 py-2.5 font-extrabold text-[#1A1A1A]' : 'text-left px-4 py-2.5 font-extrabold text-[#1A1A1A]'}>{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {body.map((row, ri) => (
                                                    <tr key={ri} className={isDark ? 'border-b border-[#1A1A1A]/20 hover:bg-white/5' : 'border-b border-[#1A1A1A]/10 hover:bg-[#1A1A1A]/3'}>
                                                        {parseRow(row).map((c, ci) => <td key={ci} className={isDark ? 'px-4 py-2.5 text-gray-500 font-semibold' : 'px-4 py-2.5 text-[#1A1A1A]/60 font-semibold'}>{c}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }
                            return <div key={bi}>{renderContent(block.join('\n'), isDark)}</div>;
                        });
                    })() : renderContent(lesson.content, isDark)}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function StudentDocuments() {
    const renderSubjectIcon = (subject: Subject) => SubjectIcons[subject.iconKey](subject.color, isDark);

    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [openChapters, setOpenChapters] = useState<number[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

    const toggleChapter = (id: number) => {
        setOpenChapters(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    // ── Lesson reader ─────────────────────────────────────────────────────────
    if (selectedLesson && selectedSubject) {
        return (
            <div className="p-8 min-h-screen" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <LessonReader lesson={selectedLesson} subject={selectedSubject} onBack={() => setSelectedLesson(null)} isDark={isDark} />
            </div>
        );
    }

    // ── Chapter list for a subject ────────────────────────────────────────────
    if (selectedSubject) {
        const totalLessons = selectedSubject.chapters.reduce((s, c) => s + c.lessons.length, 0);
        return (
            <div className="p-8 min-h-screen" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div className="max-w-3xl mx-auto space-y-5">
                    <button onClick={() => setSelectedSubject(null)} className={`flex items-center gap-2 font-extrabold text-sm transition-colors ${isDark ? 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]' : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]'}`}>
                        <CaretLeft className="w-4 h-4" /> Tất cả môn học
                    </button>

                    {/* Subject header */}
                    <div className={`rounded-3xl overflow-hidden ${isDark ? 'border border-[#1A1A1A]/20 bg-[rgba(30,30,30,0.9)]' : 'border-2 border-[#1A1A1A]'}`} style={{ backgroundColor: isDark ? undefined : selectedSubject.bg }}>
                        <div className="p-6 flex items-center gap-5">
                            <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center p-3 ${isDark ? 'border border-[#1A1A1A]/20 bg-[#17171a]' : 'border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_0_#1A1A1A]'}`}>{renderSubjectIcon(selectedSubject)}</div>
                            <div>
                                <h1 className={`text-2xl font-black ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{selectedSubject.name}</h1>
                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/60'}`}>{selectedSubject.chapters.length} chương · {totalLessons} bài học</p>
                            </div>
                        </div>
                    </div>

                    {/* Chapters accordion */}
                    <div className="space-y-3">
                        {selectedSubject.chapters.map((chapter) => {
                            const isOpen = openChapters.includes(chapter.id);
                            return (
                                <div key={chapter.id} className={`rounded-3xl overflow-hidden ${isDark ? 'border border-[#1A1A1A]/20 bg-[rgba(30,30,30,0.9)]' : 'border-2 border-[#1A1A1A] bg-white'}`}>
                                    <button
                                        onClick={() => toggleChapter(chapter.id)}
                                        className={`w-full p-5 flex items-center gap-4 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/3'}`}
                                    >
                                        <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'border border-[#1A1A1A]/20 bg-[#17171a]' : 'border-2 border-[#1A1A1A]/20'}`} style={{ backgroundColor: isDark ? undefined : selectedSubject.bg }}>
                                            <Stack className={`w-5 h-5 ${isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]'}`} weight="fill" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-extrabold text-sm ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{chapter.title}</h3>
                                            <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'}`}>{chapter.lessons.length} bài học</p>
                                        </div>
                                        {isOpen
                                            ? <CaretDown className="w-5 h-5 text-[#1A1A1A]/40 shrink-0" />
                                            : <CaretRight className="w-5 h-5 text-[#1A1A1A]/40 shrink-0" />}
                                    </button>

                                    {isOpen && (
                                        <div className={`${isDark ? 'border-t border-[#1A1A1A]/20 divide-y divide-white/10' : 'border-t-2 border-[#1A1A1A]/10 divide-y divide-[#1A1A1A]/10'}`}>
                                            {chapter.lessons.map((lesson) => (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => setSelectedLesson(lesson)}
                                                    className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/3'}`}
                                                >
                                                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#17171a] border-none shadow-[0_0_12px_rgba(255,255,255,0.06)]' : 'bg-[#1A1A1A]/5 border border-[#1A1A1A]/15'}`}>
                                                        <FileText className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/50'}`} weight="fill" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-extrabold text-sm truncate ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{lesson.title}</p>
                                                        <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/40'}`}>≈ {lesson.readTime} phút đọc</p>
                                                    </div>
                                                    <CaretRight className="w-4 h-4 text-[#1A1A1A]/30 shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ── Subject grid (home) ───────────────────────────────────────────────────
    return (
        <div className="p-8 min-h-screen" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Chọn môn học để xem lý thuyết</p>
                    <h1 className={`text-3xl font-black ${isDark ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>Tài liệu học tập</h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => {
                        const totalLessons = subject.chapters.reduce((s, c) => s + c.lessons.length, 0);
                        return (
                            <button
                                key={subject.id}
                                onClick={() => {
                                    setSelectedSubject(subject);
                                    setOpenChapters([subject.chapters[0]?.id]);
                                    setSelectedLesson(null);
                                }}
                                className="text-left group"
                            >
                                <div className={`rounded-3xl overflow-hidden transition-all duration-200 bg-white ${isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE] shadow-[4px_4px_0_0_#EEEEEE] hover:shadow-[0_0_15px_#FF6B4A] transition-all duration-300 group-hover:-translate-y-1' : 'border-2 border-[#1A1A1A] hover:shadow-[4px_4px_0_0_#1A1A1A] group-hover:-translate-y-0.5'}`}>
                                    <div className={`h-2 w-full`} style={{ backgroundColor: subject.bg }} />
                                    <div className="p-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 p-3 group-hover:scale-105 transition-transform ${isDark ? 'border border-[#1A1A1A]/20 bg-[#17171a]' : 'border-2 border-[#1A1A1A] bg-white shadow-[3px_3px_0_0_#1A1A1A]'}`}>
                                            {renderSubjectIcon(subject)}
                                        </div>
                                        <h3 className={`text-lg ${isDark ? 'text-white font-black' : 'text-[#1A1A1A] font-extrabold'}`}>{subject.name}</h3>
                                        <p className={`text-xs font-bold mt-1 ${isDark ? 'text-[#1A1A1A]/50' : 'text-[#1A1A1A]/50'}`}>{subject.chapters.length} chương · {totalLessons} bài học</p>
                                        <div className={`mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold ${isDark ? 'text-[#ff7849] group-hover:text-[#ff9a73]' : 'text-[#FF6B4A]'}`}>
                                            Xem tài liệu <CaretRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
