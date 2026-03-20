import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Bell, BookmarkSimple, ArrowRight, CheckCircle, Info } from '@phosphor-icons/react';

const courses = [
    {
        subject: 'Toán học',
        title: 'Giải tích nâng cao',
        bg: '#FCE38A',
        tag: 'Toán học',
        tagBg: '#1A1A1A',
        tagColor: '#fff',
        progress: 5,
        total: 22,
        bar: '#1A1A1A',
        avatars: ['VB', 'TL', 'NM'],
        count: '+80',
    },
    {
        subject: 'Tiếng Anh',
        title: 'IELTS Speaking & Writing',
        bg: '#B8B5FF',
        tag: 'Tiếng Anh',
        tagBg: '#1A1A1A',
        tagColor: '#fff',
        progress: 12,
        total: 30,
        bar: '#1A1A1A',
        avatars: ['EW', 'HN', 'LT'],
        count: '+120',
    },
    {
        subject: 'Ngữ Văn',
        title: 'Văn học hiện đại Việt Nam',
        bg: '#95E1D3',
        tag: 'Ngữ Văn',
        tagBg: '#1A1A1A',
        tagColor: '#fff',
        progress: 8,
        total: 18,
        bar: '#1A1A1A',
        avatars: ['TL', 'NA', 'VH'],
        count: '+24',
    },
];

const lessons = [
    { order: '01', title: 'Nguyên hàm từng phần', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', duration: '45 phút' },
    { order: '02', title: 'Diễn đạt quan điểm cá nhân', subject: 'Tiếng Anh', teacher: 'Ms. Emily Wilson', duration: '40 phút' },
    { order: '03', title: 'Phân tích nhân vật Chí Phèo', subject: 'Ngữ Văn', teacher: 'Cô Trần Thị Lan', duration: '50 phút' },
    { order: '04', title: 'Phương trình lượng giác', subject: 'Toán học', teacher: 'Thầy Nguyễn Văn Bình', duration: '45 phút' },
];

const mockNotificationsData = [
    {
        id: 1,
        title: 'Lịch học mới',
        desc: 'Thầy Bình vừa cập nhật tài liệu cho tiết Toán học sáng nay.',
        time: '5 phút trước',
        icon: Info,
        iconColor: '#2563EB',
        unread: true,
    },
    {
        id: 2,
        title: 'Bài tập sắp đến hạn',
        desc: 'Bạn còn 2 bài tập Tiếng Anh cần nộp trước 23:59 hôm nay.',
        time: '2 giờ trước',
        icon: Bell,
        iconColor: '#FF6B4A',
        unread: true,
    },
    {
        id: 3,
        title: 'Kết quả bài kiểm tra',
        desc: 'Chúc mừng! Bạn đã đạt 9.5 điểm trong bài kiểm tra Hóa học.',
        time: 'Hôm qua',
        icon: CheckCircle,
        iconColor: '#10B981',
        unread: false,
    },
    {
        id: 4,
        title: 'Lời mời nhóm học',
        desc: 'Lê Văn Cường đã mời bạn vào nhóm ôn tập "Toán 12A1".',
        time: '2 ngày trước',
        icon: Info,
        iconColor: '#2563EB',
        unread: false,
    },
];

export function StudentHomepage() {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [notifications, setNotifications] = useState(mockNotificationsData);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => n.unread).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Chào mừng đến với
                        <span className="text-[#FF6B4A] ml-1">AntiEdu</span>
                    </p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Chào buổi sáng, Văn A!</h1>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="pl-11 pr-5 py-3 bg-white rounded-2xl border-none shadow-sm text-sm font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 w-64"
                        />
                    </div>
                    {/* Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-shadow relative"
                        >
                            <Bell className="w-5 h-5 text-[#1A1A1A]" weight={showNotifications ? 'fill' : 'regular'} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF6B4A] rounded-full"></span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div ref={notificationsRef} className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border-2 border-[#1A1A1A]/5 z-[100] overflow-hidden animate-[slideInDown_0.2s_ease-out]">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="font-extrabold text-[#1A1A1A] text-sm">Thông báo</h3>
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[10px] font-extrabold text-[#FF6B4A] hover:underline uppercase tracking-widest disabled:opacity-50"
                                        disabled={unreadCount === 0}
                                    >
                                        Đánh dấu đã đọc
                                    </button>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.slice(0, 5).map((notif) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => markAsRead(notif.id)}
                                                className={`px-6 py-4 flex gap-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${notif.unread ? 'bg-blue-50/10' : ''}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: notif.iconColor + '15' }}>
                                                    <notif.icon className="w-5 h-5" style={{ color: notif.iconColor }} weight="fill" />
                                                </div>
                                                <div className="space-y-1 pr-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-extrabold text-[#1A1A1A]">{notif.title}</p>
                                                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{notif.time}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                                                        {notif.desc}
                                                    </p>
                                                </div>
                                                {notif.unread && (
                                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 w-1.5 h-1.5 bg-[#FF6B4A] rounded-full" />
                                                )}
                                            </div>
                                        )
                                    )) : (
                                        <div className="py-12 text-center text-gray-400 font-bold text-sm">
                                            Không có thông báo nào
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-gray-100 italic text-center">
                                    <button
                                        onClick={() => {
                                            setShowAllNotifications(true);
                                            setShowNotifications(false);
                                        }}
                                        className="text-[11px] font-extrabold text-gray-400 hover:text-[#1A1A1A] transition-colors"
                                    >
                                        Xem tất cả thông báo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-[#FF6B4A] rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                        V
                    </div>
                </div>
            </div>

            {/* Main Content Toggle */}
            {showAllNotifications ? (
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden flex flex-col min-h-[600px] animate-[slideInUp_0.3s_ease-out]">
                    <div className="px-8 py-6 border-b-2 border-[#1A1A1A]/10 flex items-center justify-between bg-gray-50/30">
                        <div>
                            <h2 className="text-2xl font-extrabold text-[#1A1A1A]">Tất cả thông báo</h2>
                            <p className="text-sm font-semibold text-gray-400">Bạn có {unreadCount} thông báo chưa đọc</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={markAllAsRead}
                                className="px-5 py-2.5 rounded-2xl bg-white border-2 border-[#1A1A1A]/20 text-sm font-extrabold text-[#1A1A1A] hover:bg-gray-50 transition-colors flex items-center gap-2"
                                disabled={unreadCount === 0}
                            >
                                <CheckCircle className="w-5 h-5 text-[#10B981]" weight="fill" />
                                Đánh dấu tất cả đã đọc
                            </button>
                            <button
                                onClick={() => setShowAllNotifications(false)}
                                className="px-5 py-2.5 rounded-2xl bg-[#1A1A1A] text-white text-sm font-extrabold hover:bg-[#333] transition-colors"
                            >
                                Quay lại
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => markAsRead(notif.id)}
                                className={`p-6 rounded-3xl flex gap-6 hover:shadow-md transition-all cursor-pointer relative group border-2 ${notif.unread ? 'bg-[#FF6B4A]/5 border-[#FF6B4A]/20' : 'bg-white border-transparent hover:border-[#1A1A1A]/5'}`}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: notif.iconColor + '20' }}>
                                    <notif.icon className="w-7 h-7" style={{ color: notif.iconColor }} weight="fill" />
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-base font-extrabold text-[#1A1A1A]">{notif.title}</h4>
                                        <span className="text-xs font-bold text-gray-400">{notif.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-semibold leading-relaxed max-w-3xl">
                                        {notif.desc}
                                    </p>
                                </div>
                                {notif.unread && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-8 w-2 h-2 bg-[#FF6B4A] rounded-full shadow-[0_0_10px_#FF6B4A]" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* My Courses */}
                    <section className="mb-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Khóa học của tôi</h2>
                            <div className="flex gap-2">
                                {['Tất cả', 'Toán học', 'Tiếng Anh', 'Ngữ Văn'].map((tab, i) => (
                                    <button
                                        key={tab}
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${i === 0
                                                ? 'bg-[#1A1A1A] text-white'
                                                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {courses.map((course) => (
                                <div
                                    key={course.title}
                                    className="rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                                    style={{ backgroundColor: course.bg }}
                                >
                                    {/* Tag + bookmark */}
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-xs font-extrabold px-3 py-1 rounded-full"
                                            style={{ backgroundColor: course.tagBg, color: course.tagColor }}
                                        >
                                            {course.tag}
                                        </span>
                                        <button className="w-8 h-8 bg-white/40 hover:bg-white/70 rounded-xl flex items-center justify-center transition-colors">
                                            <BookmarkSimple className="w-4 h-4 text-[#1A1A1A]" />
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-extrabold text-[#1A1A1A] leading-snug">{course.title}</h3>

                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-[#1A1A1A]/60 mb-1.5">
                                            <span>Tiến độ</span>
                                            <span>{course.progress}/{course.total} bài học</span>
                                        </div>
                                        <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    backgroundColor: course.bar,
                                                    width: `${(course.progress / course.total) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Avatars + CTA */}
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center">
                                            {course.avatars.map((a, i) => (
                                                <div
                                                    key={i}
                                                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-extrabold text-[#1A1A1A] ring-2 ring-[#1A1A1A]/10"
                                                    style={{ marginLeft: i > 0 ? '-8px' : '0' }}
                                                >
                                                    {a}
                                                </div>
                                            ))}
                                            <span className="ml-2 text-xs font-extrabold text-[#1A1A1A]/60">{course.count}</span>
                                        </div>
                                        <button
                                            className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white text-sm font-extrabold px-5 py-2 rounded-full transition-all shadow-sm hover:shadow-md"
                                            onClick={() => navigate('/student/exercises')}
                                        >
                                            Tiếp tục
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bottom section: lessons + AI suggestion */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Next lessons table */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-extrabold text-[#1A1A1A]">Bài học tiếp theo</h2>
                                <button className="text-sm font-bold text-[#FF6B4A] hover:text-[#ff5535] flex items-center gap-1">
                                    Xem tất cả <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest grid grid-cols-[2rem_1fr_1fr_5rem] gap-x-4 pb-3 border-b border-gray-100 mb-1">
                                <span>#</span>
                                <span>Bài học</span>
                                <span>Giáo viên</span>
                                <span className="text-right">Thời gian</span>
                            </div>

                            <div className="flex flex-col divide-y divide-gray-50">
                                {lessons.map((l) => (
                                    <div
                                        key={l.order}
                                        className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-x-4 py-4 items-center hover:bg-gray-50 rounded-xl px-1 -mx-1 cursor-pointer transition-colors"
                                    >
                                        <span className="text-sm font-extrabold text-gray-300">{l.order}</span>
                                        <div>
                                            <p className="text-sm font-extrabold text-[#1A1A1A]">{l.title}</p>
                                            <p className="text-xs text-gray-400 font-semibold">{l.subject}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-[#FCE38A] flex items-center justify-center text-[10px] font-extrabold text-[#1A1A1A]">
                                                {l.teacher.split(' ').pop()?.[0]}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 truncate">{l.teacher}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 text-right">{l.duration}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI suggestion card */}
                        <div className="bg-[#1A1A1A] rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
                            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Gợi ý mới</p>
                            <span className="inline-block text-xs font-extrabold bg-[#FCE38A] text-[#1A1A1A] px-3 py-1 rounded-full w-fit">Toán học</span>
                            <h3 className="text-xl font-extrabold text-white leading-snug">
                                Ôn tập: Nguyên hàm & Tích phân
                            </h3>
                            <p className="text-sm text-gray-400 font-semibold leading-relaxed">
                                Dựa trên kết quả bài kiểm tra tuần trước, AI gợi ý bài ôn tập này phù hợp với bạn.
                            </p>
                            <div className="flex items-center gap-2 mt-auto">
                                <div className="flex -space-x-2">
                                    {['NA', 'VB', 'TL'].map((a, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-extrabold text-white ring-2 ring-[#1A1A1A]">
                                            {a}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs text-gray-500 font-semibold">42 học sinh đang học</span>
                            </div>
                            <button
                                className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold py-3 rounded-2xl transition-all mt-2 text-sm"
                                onClick={() => navigate('/student/review')}
                            >
                                Bắt đầu ôn tập
                            </button>
                        </div>
                    </div>
                </>
            )}

            <footer className="mt-10 text-center text-xs font-semibold text-gray-400">
                © 2024 AntiEdu – Nền tảng học tập thông minh.
            </footer>
        </div>
    );
}
