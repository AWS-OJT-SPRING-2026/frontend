import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Users,
    Brain,
    ChartBar,
    Clock,
    Lightning,
    Star,
    ArrowRight,
    CaretRight,
    CheckCircle,
} from '@phosphor-icons/react';

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F7F7F2]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* ── NAVBAR ── */}
            <header className="sticky top-0 z-50 bg-white border-b-2 border-[#1A1A1A]/10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 select-none">
                        <img
                            src="/logo.svg"
                            alt="AntiEdu"
                            className="h-14 w-14 shrink-0 rounded-2xl shadow-lg block"
                        />
                        <span className="text-xl font-extrabold text-[#1A1A1A] tracking-tight leading-none">
                            Anti<span className="text-[#FF6B4A]">Edu</span>
                        </span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-extrabold text-[#1A1A1A]/60">
                        <a href="#contact" className="hover:text-[#FF6B4A] transition-colors">Liên hệ</a>

                        <a href="#highlights" className="hover:text-[#FF6B4A] transition-colors">Nổi bật</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-extrabold text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition-colors"
                        >
                            Đăng nhập
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2 rounded-2xl transition-colors flex items-center gap-1.5"
                        >
                            Bắt đầu ngay <CaretRight className="w-4 h-4" weight="bold" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO ── */}
            <section className="relative overflow-hidden bg-[#1A1A1A] text-white">
                {/* Decorative geometric shapes */}
                <div className="absolute top-12 right-12 w-32 h-32 rounded-3xl border-4 border-[#FCE38A]/20 rotate-12 pointer-events-none" />
                <div className="absolute bottom-8 left-8 w-20 h-20 rounded-full border-4 border-[#B8B5FF]/20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-2xl border-2 border-[#95E1D3]/15 -rotate-6 pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row items-center gap-12">
                    {/* Text */}
                    <div className="flex-1 space-y-6">
                        <span className="inline-flex items-center gap-2 text-xs font-extrabold bg-[#FCE38A] text-[#1A1A1A] px-4 py-1.5 rounded-full uppercase tracking-widest">
                            <Star className="w-3 h-3" weight="fill" />
                            AI trong giáo dục
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                            Hệ thống Quản lý<br />
                            <span className="text-[#FF6B4A]">Giáo dục Thông minh</span><br />
                            với AI
                        </h1>
                        <p className="text-white/60 text-lg leading-relaxed max-w-lg font-semibold">
                            Nâng tầm trải nghiệm học tập và quản lý với công nghệ AI tiên tiến. Tối đa hóa tiềm năng giáo viên, học sinh và nhà trường.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-8 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
                            >
                                Khám phá ngay <ArrowRight className="w-4 h-4" weight="bold" />
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="border-2 border-white/20 hover:border-white/40 text-white font-extrabold px-8 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
                            >
                                Xem Demo
                            </button>
                        </div>
                        <div className="flex items-center gap-6 pt-2 text-sm text-white/50 font-bold">
                            {['10,000+ giáo viên', '50,000+ học sinh', 'Sẵn sàng 24/7'].map((s) => (
                                <span key={s} className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-[#95E1D3]" weight="fill" /> {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Hero card */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-sm">
                            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-[#FCE38A] border-2 border-white/20 rounded-2xl flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-white text-sm">AI Assistant</p>
                                        <p className="text-white/50 text-xs font-bold">Đang trực tuyến</p>
                                    </div>
                                </div>
                                <p className="text-white/70 text-sm italic leading-relaxed font-semibold">
                                    "Chào buổi sáng! Hôm nay bạn có <strong className="text-white">3 tiết học</strong> và <strong className="text-white">2 bài tập</strong> sắp đến hạn."
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { icon: ChartBar, label: 'Điểm TB', value: '8.5', bg: '#95E1D3' },
                                        { icon: Clock, label: 'Giờ học', value: '120h', bg: '#FCE38A' },
                                        { icon: BookOpen, label: 'Môn học', value: '6', bg: '#B8B5FF' },
                                        { icon: Users, label: 'Bạn bè', value: '32', bg: '#FFB5B5' },
                                    ].map(({ icon: Icon, label, value, bg }) => (
                                        <div key={label} className="rounded-2xl p-3 border border-white/10 flex items-center gap-2" style={{ backgroundColor: bg + '30' }}>
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                                                <Icon className="w-3.5 h-3.5 text-[#1A1A1A]" weight="fill" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/50 font-bold">{label}</p>
                                                <p className="font-extrabold text-white text-sm">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* badge */}
                            <div className="absolute -top-3 -right-3 bg-[#FCE38A] text-[#1A1A1A] text-xs font-extrabold px-3 py-1.5 rounded-2xl border-2 border-[#1A1A1A] rotate-3">
                                ✦ AI Powered
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HIGHLIGHTS ── */}
            <section id="highlights" className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2">Công nghệ thế hệ mới</p>
                        <h2 className="text-3xl font-extrabold text-[#1A1A1A]">Tính năng đột phá cho thời đại số</h2>
                        <p className="text-[#1A1A1A]/50 mt-3 max-w-xl mx-auto font-semibold">
                            Giải pháp giáo dục thế hệ mới mang đến hiệu quả vượt trội và trải nghiệm học tập đáng nhớ.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Brain,
                                badge: 'AI & Machine Learning',
                                title: 'Phân tích dữ liệu AI',
                                desc: 'Hệ thống AI phân tích hiệu suất từng học sinh theo thời gian thực để tạo lộ trình học cá nhân hóa.',
                                topBg: '#B8B5FF',
                            },
                            {
                                icon: Users,
                                badge: 'Quản lý',
                                title: 'Quản lý lớp học',
                                desc: 'Theo dõi sĩ số, điểm danh, phân nhóm học tập và theo dõi tiến trình từng học sinh một cách trực quan.',
                                topBg: '#FCE38A',
                            },
                            {
                                icon: Lightning,
                                badge: 'Real-time',
                                title: 'Tương tác thời gian thực',
                                desc: 'Chat trực tiếp, thông báo ngay lập tức và hỗ trợ học tập tức thì giúp kết nối giáo viên và học sinh.',
                                topBg: '#FFB5B5',
                            },
                        ].map(({ icon: Icon, badge, title, desc, topBg }) => (
                            <div key={title} className="rounded-3xl overflow-hidden border-2 border-[#1A1A1A] group hover:shadow-lg transition-shadow">
                                <div className="h-2" style={{ backgroundColor: topBg }} />
                                <div className="p-8 bg-white">
                                    <span className="text-xs font-extrabold text-[#1A1A1A] px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20" style={{ backgroundColor: topBg }}>{badge}</span>
                                    <div className="w-12 h-12 rounded-2xl border-2 border-[#1A1A1A]/20 flex items-center justify-center mt-5 mb-4 group-hover:scale-105 transition-transform" style={{ backgroundColor: topBg }}>
                                        <Icon className="w-6 h-6 text-[#1A1A1A]" weight="fill" />
                                    </div>
                                    <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-3">{title}</h3>
                                    <p className="text-sm text-[#1A1A1A]/50 leading-relaxed font-semibold">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section className="py-16 bg-[#1A1A1A]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '10,000+', label: 'Giáo viên', bg: '#FCE38A' },
                            { value: '50,000+', label: 'Học sinh', bg: '#B8B5FF' },
                            { value: '200+', label: 'Trường học', bg: '#FFB5B5' },
                            { value: '98%', label: 'Hài lòng', bg: '#95E1D3' },
                        ].map((s) => (
                            <div key={s.label} className="text-center">
                                <div className="text-3xl font-extrabold mb-1" style={{ color: s.bg }}>{s.value}</div>
                                <div className="text-white/50 text-sm font-extrabold uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section id="contact" className="py-20 bg-[#F7F7F2]">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-[#1A1A1A] rounded-3xl p-12 border-2 border-[#1A1A1A] text-center space-y-6 relative overflow-hidden">
                        {/* Geometric deco */}
                        <div className="absolute top-6 right-6 w-20 h-20 rounded-2xl border-2 border-[#FCE38A]/20 rotate-12 pointer-events-none" />
                        <div className="absolute bottom-6 left-6 w-14 h-14 rounded-full border-2 border-[#B8B5FF]/20 pointer-events-none" />
                        <p className="text-xs font-extrabold text-white/40 uppercase tracking-widest">Bắt đầu ngay hôm nay</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight relative z-10">
                            Sẵn sàng để cách mạng hóa<br />giáo dục cùng <span className="text-[#FF6B4A]">EduCare</span>?
                        </h2>
                        <p className="text-white/50 text-lg max-w-xl mx-auto font-semibold relative z-10">
                            Bắt đầu sử dụng miễn phí ngay hôm nay. Không cần cài đặt. Đội ngũ chuyên gia hỗ trợ 24/7.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 relative z-10">
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-10 py-3.5 rounded-2xl transition-colors text-base"
                            >
                                Đăng ký ngay →
                            </button>
                            <button className="border-2 border-white/20 hover:border-white/40 text-white font-extrabold px-10 py-3.5 rounded-2xl transition-colors text-base">
                                Liên hệ tư vấn
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="bg-[#1A1A1A] text-white/40 py-12 border-t-2 border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <img src="/logo.svg" alt="EduCare" className="h-9 w-9 rounded-xl shadow-sm" />
                                <span className="font-extrabold text-white text-lg">EduCare</span>
                            </div>
                            <p className="text-sm leading-relaxed font-semibold">
                                Hệ thống quản lý giáo dục thông minh, hỗ trợ mọi đối tượng trong môi trường học tập.
                            </p>
                            <div className="flex gap-3">
                                {['#FCE38A', '#B8B5FF', '#FFB5B5'].map((c) => (
                                    <div key={c} className="w-8 h-8 rounded-xl border-2 border-white/10 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        {[
                            { title: 'Giải pháp', links: ['Dành cho Admin', 'Dành cho Giáo viên', 'Dành cho Học sinh', 'Phụ huynh'] },
                            { title: 'Công ty', links: ['Về chúng tôi', 'Tuyển dụng', 'Tin tức', 'Blog'] },
                            { title: 'Hỗ trợ', links: ['Trung tâm trợ giúp', 'Tài liệu API', 'Bảo mật', 'Chính sách'] },
                        ].map(({ title, links }) => (
                            <div key={title}>
                                <h4 className="text-white font-extrabold text-sm mb-4 uppercase tracking-widest">{title}</h4>
                                <ul className="space-y-2">
                                    {links.map((l) => (
                                        <li key={l}>
                                            <a href="#" className="text-sm hover:text-white transition-colors font-semibold">{l}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
                        <p>© 2024 EduCare Corporation. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
