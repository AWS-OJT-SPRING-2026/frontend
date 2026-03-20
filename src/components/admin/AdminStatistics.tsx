import {
    AlertTriangle,
    BookOpen,
    Clock3,
    GraduationCap,
    School,
    Users,
} from 'lucide-react';
import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export function AdminStatistics() {
    const cardClass = 'rounded-3xl border-2 border-[#1A1A1A] bg-white shadow-sm p-5 md:p-6';

    const growthData = [
        { month: 'Tháng 1', students: 120 },
        { month: 'Tháng 2', students: 145 },
        { month: 'Tháng 3', students: 162 },
        { month: 'Tháng 4', students: 180 },
        { month: 'Tháng 5', students: 210 },
        { month: 'Tháng 6', students: 238 },
    ];

    const gradeDistribution = [
        { name: 'Khối 10', value: 460, color: '#A78BFA' },
        { name: 'Khối 11', value: 420, color: '#5EEAD4' },
        { name: 'Khối 12', value: 370, color: '#FCD34D' },
    ];

    const todaySchedule = [
        { time: '08:00 - 09:30', className: 'Lớp 10A1', room: 'Phòng A201', teacher: 'Thầy Nguyễn Văn A' },
        { time: '09:45 - 11:15', className: 'Lớp 11B2', room: 'Phòng B105', teacher: 'Cô Trần Thị B' },
        { time: '13:30 - 15:00', className: 'Lớp 12C1', room: 'Phòng C303', teacher: 'Thầy Lê Minh C' },
        { time: '15:15 - 16:45', className: 'Lớp 10A2', room: 'Phòng A103', teacher: 'Cô Phạm Thu D' },
    ];

    const urgentItems = [
        'Lớp 10A1 chưa có giáo viên chủ nhiệm',
        'Lớp 11B1 sĩ số thấp hơn mức tối thiểu',
        '03 học sinh lớp 12C2 quá hạn học phí',
    ];

    const recentActivities = [
        { time: '10 phút trước', content: 'Học sinh Nguyễn Văn A vừa nộp học phí học kỳ 2' },
        { time: '1 giờ trước', content: 'Giáo viên Trần Thị B vừa cập nhật điểm kiểm tra 15 phút' },
        { time: '2 giờ trước', content: 'Lớp 11B2 được thêm mới vào thời khóa biểu chiều thứ 6' },
        { time: 'Hôm qua', content: 'Admin đã phê duyệt hồ sơ cộng tác của giáo viên mới' },
    ];

    return (
        <div className="min-h-screen bg-[#F7F7F2] p-6 md:p-8 space-y-6 lg:space-y-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <header className="space-y-1">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Quản trị hệ thống</p>
                <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Tổng quan hệ thống</h1>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#EDE8FF] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Tổng số Học sinh</p>
                        <Users className="h-5 w-5 text-[#6D4AFF]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">1,250</p>
                    <p className="mt-2 text-sm font-bold text-green-600">+5% so với tháng trước</p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#DDF7F1] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Giáo viên cộng tác</p>
                        <GraduationCap className="h-5 w-5 text-[#0F766E]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">45</p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FFF3C9] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Lớp đang hoạt động</p>
                        <BookOpen className="h-5 w-5 text-[#B45309]" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">12</p>
                </article>

                <article className="rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FFE5E5] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#1A1A1A]/70">Cần chú ý</p>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[#1A1A1A]">3</p>
                </article>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <article className={`lg:col-span-4 ${cardClass}`}>
                    <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-4">
                        Xu hướng tăng trưởng học sinh mới (6 tháng gần nhất)
                    </h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip />
                                <Line type="monotone" dataKey="students" name="Học sinh mới" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={`lg:col-span-3 ${cardClass}`}>
                    <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A] mb-4">Tỷ lệ học sinh theo khối lớp</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gradeDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={55}
                                    label
                                >
                                    {gradeDistribution.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <article className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <School className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Lịch giảng dạy hôm nay</h2>
                    </div>
                    <div className="space-y-3">
                        {todaySchedule.map((item) => (
                            <div key={`${item.time}-${item.className}`} className="rounded-xl border border-gray-200 p-3">
                                <p className="text-sm font-semibold text-gray-900">{item.time}</p>
                                <p className="text-sm text-gray-700">{item.className} - {item.room}</p>
                                <p className="text-sm text-gray-500">{item.teacher}</p>
                            </div>
                        ))}
                    </div>
                </article>

                <article className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Cần xử lý ngay</h2>
                    </div>
                    <div className="space-y-3">
                        {urgentItems.map((item) => (
                            <div key={item} className="rounded-xl border border-gray-200 p-3 flex items-start justify-between gap-3">
                                <p className="text-sm text-gray-700 leading-6">{item}</p>
                                <button
                                    type="button"
                                    className="shrink-0 rounded-lg bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
                                >
                                    Xử lý
                                </button>
                            </div>
                        ))}
                    </div>
                </article>

                <article className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock3 className="h-5 w-5 text-violet-600" />
                        <h2 className="text-base md:text-lg font-extrabold text-[#1A1A1A]">Hoạt động gần đây</h2>
                    </div>
                    <div className="space-y-4">
                        {recentActivities.map((item, index) => (
                            <div key={`${item.time}-${index}`} className="flex gap-3">
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                                    {index < recentActivities.length - 1 && <span className="mt-1 h-10 w-px bg-gray-200" />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500">{item.time}</p>
                                    <p className="text-sm text-gray-700">{item.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </div>
    );
}
