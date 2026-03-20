import { useMemo, useState } from 'react';
import {
    Activity,
    BarChart3,
    BookCopy,
    Download,
    Gauge,
    GraduationCap,
    RefreshCw,
    ShieldAlert,
    UserPlus,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
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

type TabKey = 'academic' | 'growth' | 'engagement' | 'content' | 'feedback' | 'system';

const tabOptions: Array<{ key: TabKey; label: string }> = [
    { key: 'academic', label: 'Học tập' },
    { key: 'growth', label: 'Tuyển sinh' },
    { key: 'engagement', label: 'Tương tác' },
    { key: 'content', label: 'Học liệu' },
    { key: 'feedback', label: 'Phản hồi' },
    { key: 'system', label: 'Hệ thống' },
];

const cardClass = 'rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-white p-5 md:p-6';
const filterLabelClass = 'text-[11px] font-extrabold uppercase tracking-wider text-[#1A1A1A]/55';
const filterControlClass = 'rounded-xl border-2 border-[#1A1A1A]/20 bg-white px-3 py-2 text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A]';

export function AdminAnalytics() {
    const [activeTab, setActiveTab] = useState<TabKey>('academic');
    const [quickRange, setQuickRange] = useState('month-this');
    const [fromDate, setFromDate] = useState('2026-03-01');
    const [toDate, setToDate] = useState('2026-03-14');
    const [grade, setGrade] = useState('all');
    const [subject, setSubject] = useState('all');
    const [classStatus, setClassStatus] = useState('all');
    const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());

    const summary = useMemo(() => {
        const map: Record<TabKey, { title: string; goal: string; icon: React.ReactNode }> = {
            academic: {
                title: 'Thống kê Học tập & Giảng dạy',
                goal: 'Theo dõi chất lượng đào tạo, chuyên cần, phổ điểm và hiệu suất giảng dạy.',
                icon: <GraduationCap className="h-5 w-5 text-indigo-600" />,
            },
            growth: {
                title: 'Thống kê Tuyển sinh & Tăng trưởng',
                goal: 'Đánh giá tăng trưởng người dùng, giữ chân học sinh và hiệu quả tuyển sinh.',
                icon: <UserPlus className="h-5 w-5 text-emerald-600" />,
            },
            engagement: {
                title: 'Thống kê Tương tác Hệ thống',
                goal: 'Đo lường mức sử dụng nền tảng, lưu lượng trao đổi và giờ cao điểm truy cập.',
                icon: <Activity className="h-5 w-5 text-sky-600" />,
            },
            content: {
                title: 'Thống kê Kho học liệu & Ngân hàng câu hỏi',
                goal: 'Tối ưu độ khó câu hỏi, cấu trúc học liệu và tần suất sử dụng tài nguyên.',
                icon: <BookCopy className="h-5 w-5 text-violet-600" />,
            },
            feedback: {
                title: 'Thống kê Phản hồi & Đánh giá',
                goal: 'Theo dõi mức độ hài lòng, tỷ lệ phản hồi và trải nghiệm học tập tổng thể.',
                icon: <BarChart3 className="h-5 w-5 text-amber-600" />,
            },
            system: {
                title: 'Thống kê Kỹ thuật & Bảo mật',
                goal: 'Giám sát lỗi hệ thống, cảnh báo đăng nhập bất thường và thiết bị truy cập.',
                icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
            },
        };

        return map[activeTab];
    }, [activeTab]);

    const attendanceData = [
        { month: 'T1', full: 91, excused: 6, unexcused: 3 },
        { month: 'T2', full: 89, excused: 7, unexcused: 4 },
        { month: 'T3', full: 92, excused: 5, unexcused: 3 },
        { month: 'T4', full: 90, excused: 6, unexcused: 4 },
        { month: 'T5', full: 93, excused: 5, unexcused: 2 },
        { month: 'T6', full: 94, excused: 4, unexcused: 2 },
    ];

    const scoreDistribution = [
        { band: '0-4', students: 42 },
        { band: '5-6', students: 205 },
        { band: '7-8', students: 524 },
        { band: '9-10', students: 316 },
    ];

    const teacherRanking = [
        { teacher: 'Trần Thị B', hours: 112, excellentRate: 68, classes: 4 },
        { teacher: 'Nguyễn Văn A', hours: 105, excellentRate: 65, classes: 3 },
        { teacher: 'Phạm Thu D', hours: 96, excellentRate: 61, classes: 3 },
        { teacher: 'Lê Minh C', hours: 89, excellentRate: 59, classes: 2 },
    ];

    const completionData = [
        { name: 'Toán 10 - Chuyên đề Hàm số', rate: 87 },
        { name: 'Anh 11 - Academic Writing', rate: 79 },
        { name: 'Văn 12 - Nghị luận xã hội', rate: 83 },
    ];

    const retentionData = [
        { term: 'HK I', retention: 76 },
        { term: 'HK II', retention: 79 },
        { term: 'Hè', retention: 72 },
        { term: 'HK I+1', retention: 82 },
    ];

    const growthData = [
        { month: 'T1', students: 120, teachers: 8 },
        { month: 'T2', students: 145, teachers: 6 },
        { month: 'T3', students: 162, teachers: 7 },
        { month: 'T4', students: 180, teachers: 9 },
        { month: 'T5', students: 210, teachers: 10 },
        { month: 'T6', students: 238, teachers: 11 },
    ];

    const engagementDaily = [
        { day: 'T2', studentMin: 84, teacherMin: 57 },
        { day: 'T3', studentMin: 88, teacherMin: 60 },
        { day: 'T4', studentMin: 92, teacherMin: 63 },
        { day: 'T5', studentMin: 86, teacherMin: 58 },
        { day: 'T6', studentMin: 95, teacherMin: 66 },
        { day: 'T7', studentMin: 72, teacherMin: 41 },
        { day: 'CN', studentMin: 61, teacherMin: 29 },
    ];

    const exchangeData = [
        { month: 'T1', upload: 320, download: 760 },
        { month: 'T2', upload: 355, download: 812 },
        { month: 'T3', upload: 402, download: 895 },
        { month: 'T4', upload: 384, download: 850 },
        { month: 'T5', upload: 428, download: 930 },
        { month: 'T6', upload: 451, download: 978 },
    ];

    const trafficByHour = [
        { hour: '07h', sessions: 210 },
        { hour: '09h', sessions: 340 },
        { hour: '11h', sessions: 290 },
        { hour: '13h', sessions: 260 },
        { hour: '15h', sessions: 310 },
        { hour: '17h', sessions: 410 },
        { hour: '19h', sessions: 620 },
        { hour: '21h', sessions: 570 },
        { hour: '23h', sessions: 220 },
    ];

    const itemDifficulty = [
        { code: 'Q-MATH-12-45', wrongRate: 82 },
        { code: 'Q-ENG-11-18', wrongRate: 76 },
        { code: 'Q-LIT-10-22', wrongRate: 71 },
        { code: 'Q-MATH-10-08', wrongRate: 8 },
    ];

    const materialDiversity = [
        { name: 'Dễ', value: 320, color: '#86EFAC' },
        { name: 'Trung bình', value: 510, color: '#93C5FD' },
        { name: 'Khó', value: 260, color: '#FCA5A5' },
    ];

    const popularResources = [
        { name: 'Slide Toán 12 - Tích phân', subject: 'Toán', uses: 145 },
        { name: 'Đề thi thử THPT #03', subject: 'Tổng hợp', uses: 131 },
        { name: 'Video Grammar Unit 9', subject: 'Anh', uses: 117 },
        { name: 'Bộ câu hỏi Văn nghị luận', subject: 'Văn', uses: 104 },
    ];

    const ratingDistribution = [
        { stars: '1 sao', value: 22 },
        { stars: '2 sao', value: 34 },
        { stars: '3 sao', value: 118 },
        { stars: '4 sao', value: 286 },
        { stars: '5 sao', value: 512 },
    ];

    const feedbackRateByClass = [
        { className: '10A1', responded: 36, total: 41 },
        { className: '11B2', responded: 29, total: 35 },
        { className: '12C1', responded: 32, total: 34 },
        { className: '12C2', responded: 27, total: 33 },
    ];

    const errorRateData = [
        { day: 'T2', e500: 12, e404: 34, submitFail: 5 },
        { day: 'T3', e500: 9, e404: 29, submitFail: 4 },
        { day: 'T4', e500: 14, e404: 38, submitFail: 6 },
        { day: 'T5', e500: 11, e404: 31, submitFail: 3 },
        { day: 'T6', e500: 8, e404: 26, submitFail: 3 },
        { day: 'T7', e500: 6, e404: 18, submitFail: 2 },
    ];

    const securityAlerts = [
        { time: '09:12', event: 'Sai mật khẩu 7 lần liên tiếp', actor: 'user_1024', level: 'Cao' },
        { time: '10:45', event: 'Đăng nhập từ IP lạ', actor: 'teacher_88', level: 'Trung bình' },
        { time: '13:21', event: 'Phiên đăng nhập thiết bị mới', actor: 'admin_01', level: 'Thấp' },
    ];

    const deviceShare = [
        { name: 'Desktop', value: 58, color: '#60A5FA' },
        { name: 'Mobile', value: 36, color: '#34D399' },
        { name: 'Tablet', value: 6, color: '#F59E0B' },
    ];

    const browserShare = [
        { browser: 'Chrome', value: 62 },
        { browser: 'Edge', value: 18 },
        { browser: 'Safari', value: 12 },
        { browser: 'Firefox', value: 8 },
    ];

    const handleRefresh = () => {
        setLastSyncedAt(new Date());
    };

    const renderAcademicTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ chuyên cần theo tháng</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="full" stackId="a" fill="#34D399" name="Đi học đầy đủ" />
                                <Bar dataKey="excused" stackId="a" fill="#FBBF24" name="Nghỉ phép" />
                                <Bar dataKey="unexcused" stackId="a" fill="#F87171" name="Nghỉ không phép" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Phổ điểm & chất lượng đầu ra</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="band" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="students" fill="#6366F1" radius={[8, 8, 0, 0]} name="Số học sinh" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <article className={`xl:col-span-2 ${cardClass}`}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Hiệu suất giáo viên</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="py-2 pr-3">Giáo viên</th>
                                    <th className="py-2 pr-3">Giờ giảng</th>
                                    <th className="py-2 pr-3">Tỷ lệ điểm giỏi</th>
                                    <th className="py-2">Số lớp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teacherRanking.map((row) => (
                                    <tr key={row.teacher} className="border-b border-gray-100 text-gray-700">
                                        <td className="py-3 pr-3 font-medium">{row.teacher}</td>
                                        <td className="py-3 pr-3">{row.hours} giờ</td>
                                        <td className="py-3 pr-3">
                                            <span className="rounded-full bg-emerald-50 text-emerald-600 px-2.5 py-1 text-xs font-medium">
                                                {row.excellentRate}%
                                            </span>
                                        </td>
                                        <td className="py-3">{row.classes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ hoàn thành học liệu</h3>
                    <div className="space-y-4">
                        {completionData.map((item) => (
                            <div key={item.name}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.name}</span>
                                    <span className="font-semibold text-gray-900">{item.rate}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.rate}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </div>
        </div>
    );

    const renderGrowthTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ giữ chân theo kỳ học</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={retentionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="term" />
                                <YAxis domain={[60, 100]} />
                                <Tooltip />
                                <Area type="monotone" dataKey="retention" stroke="#10B981" fill="#A7F3D0" name="Retention (%)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tốc độ tăng trưởng người dùng</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="students" stroke="#2563EB" strokeWidth={3} name="Học sinh mới" />
                                <Line type="monotone" dataKey="teachers" stroke="#F97316" strokeWidth={3} name="Giáo viên mới" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">Leads tuyển sinh</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">1,820</p>
                    <p className="mt-2 text-sm text-emerald-600">+12% so với kỳ trước</p>
                </article>
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">Đăng ký thành công</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">1,140</p>
                    <p className="mt-2 text-sm text-gray-600">Tỷ lệ chuyển đổi: 62.6%</p>
                </article>
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">Học sinh tái đăng ký</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">780</p>
                    <p className="mt-2 text-sm text-gray-600">Retention trọng điểm: 79%</p>
                </article>
            </div>
        </div>
    );

    const renderEngagementTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Thời gian truy cập trung bình/ngày</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={engagementDaily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="studentMin" stroke="#0EA5E9" strokeWidth={3} name="Học sinh (phút)" />
                                <Line type="monotone" dataKey="teacherMin" stroke="#14B8A6" strokeWidth={3} name="Giáo viên (phút)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Lưu lượng tải lên/tải xuống học liệu</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={exchangeData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="upload" fill="#22C55E" name="Upload" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="download" fill="#6366F1" name="Download" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <article className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Lưu lượng truy cập theo khung giờ</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trafficByHour}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="sessions" stroke="#8B5CF6" fill="#DDD6FE" name="Số phiên truy cập" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </article>
        </div>
    );

    const renderContentTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ sai cao theo câu hỏi (Item Difficulty)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={itemDifficulty} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis type="category" dataKey="code" width={130} />
                                <Tooltip />
                                <Bar dataKey="wrongRate" fill="#F97316" name="Tỷ lệ sai (%)" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Phân bổ học liệu theo độ khó</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={materialDiversity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>
                                    {materialDiversity.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>

            <article className={cardClass}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Tần suất sử dụng học liệu</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="py-2 pr-3">Học liệu</th>
                                <th className="py-2 pr-3">Môn</th>
                                <th className="py-2">Số lần sử dụng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {popularResources.map((row) => (
                                <tr key={row.name} className="border-b border-gray-100 text-gray-700">
                                    <td className="py-3 pr-3 font-medium">{row.name}</td>
                                    <td className="py-3 pr-3">{row.subject}</td>
                                    <td className="py-3">{row.uses}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    );

    const renderFeedbackTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">Điểm CSAT trung bình</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">4.6/5</p>
                    <p className="mt-2 text-sm text-emerald-600">+0.2 so với tháng trước</p>
                </article>
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">NPS toàn hệ thống</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">+48</p>
                    <p className="mt-2 text-sm text-gray-600">Nhóm promoter chiếm 61%</p>
                </article>
                <article className={cardClass}>
                    <p className="text-sm text-gray-500">Tỷ lệ phản hồi</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">83%</p>
                    <p className="mt-2 text-sm text-gray-600">Trên tổng học sinh đang học</p>
                </article>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Phân bổ đánh giá sao</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ratingDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="stars" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ phản hồi theo lớp</h3>
                    <div className="space-y-4">
                        {feedbackRateByClass.map((row) => {
                            const percent = Math.round((row.responded / row.total) * 100);
                            return (
                                <div key={row.className}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Lớp {row.className}</span>
                                        <span className="font-semibold text-gray-900">{row.responded}/{row.total} ({percent}%)</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </div>
        </div>
    );

    const renderSystemTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Thống kê lỗi theo ngày</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={errorRateData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="e500" fill="#EF4444" name="HTTP 500" radius={[5, 5, 0, 0]} />
                                <Bar dataKey="e404" fill="#F59E0B" name="HTTP 404" radius={[5, 5, 0, 0]} />
                                <Bar dataKey="submitFail" fill="#6366F1" name="Nộp bài lỗi" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Bảo mật & đăng nhập bất thường</h3>
                    <div className="space-y-3">
                        {securityAlerts.map((alert) => (
                            <div key={`${alert.time}-${alert.actor}`} className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-gray-800">{alert.event}</p>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            alert.level === 'Cao'
                                                ? 'bg-red-100 text-red-600'
                                                : alert.level === 'Trung bình'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {alert.level}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">{alert.time} - {alert.actor}</p>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ thiết bị truy cập</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={deviceShare} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>
                                    {deviceShare.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className={cardClass}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Tỷ lệ trình duyệt</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={browserShare}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="browser" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#14B8A6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </div>
        </div>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'academic':
                return renderAcademicTab();
            case 'growth':
                return renderGrowthTab();
            case 'engagement':
                return renderEngagementTab();
            case 'content':
                return renderContentTab();
            case 'feedback':
                return renderFeedbackTab();
            case 'system':
                return renderSystemTab();
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F7F2] p-6 md:p-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <div className="sticky top-0 z-10 mb-6 rounded-3xl border-2 border-[#1A1A1A] shadow-sm bg-[#FAF9F6]/95 backdrop-blur px-4 py-4 md:px-5 md:py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A]">Thống kê chuyên sâu</h1>
                        <p className="text-sm font-semibold text-[#1A1A1A]/60">
                            Dữ liệu cập nhật lần cuối: {lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1A1A1A]/20 bg-white px-3 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Làm mới
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-3 py-2 text-sm font-extrabold text-white hover:bg-[#ff5535] transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Xuất báo cáo (.xlsx/.csv)
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className={filterLabelClass}>Tab thống kê</span>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as TabKey)}
                            className={filterControlClass}
                        >
                            {tabOptions.map((tab) => (
                                <option key={tab.key} value={tab.key}>{tab.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className={filterLabelClass}>Mốc thời gian</span>
                        <select
                            value={quickRange}
                            onChange={(e) => setQuickRange(e.target.value)}
                            className={filterControlClass}
                        >
                            <option value="week-this">Tuần này</option>
                            <option value="month-this">Tháng này</option>
                            <option value="month-last">Tháng trước</option>
                            <option value="quarter-q1">Quý 1</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className={filterLabelClass}>Từ ngày</span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className={filterControlClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className={filterLabelClass}>Đến ngày</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className={filterControlClass}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className={filterLabelClass}>Khối lớp</span>
                        <select
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className={filterControlClass}
                        >
                            <option value="all">Tất cả</option>
                            <option value="10">Khối 10</option>
                            <option value="11">Khối 11</option>
                            <option value="12">Khối 12</option>
                        </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                            <span className={filterLabelClass}>Môn học</span>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className={filterControlClass}
                            >
                                <option value="all">Tất cả</option>
                                <option value="math">Toán</option>
                                <option value="lit">Văn</option>
                                <option value="eng">Anh</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className={filterLabelClass}>Trạng thái lớp</span>
                            <select
                                value={classStatus}
                                onChange={(e) => setClassStatus(e.target.value)}
                                className={filterControlClass}
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Đang học</option>
                                <option value="paused">Tạm dừng</option>
                                <option value="finished">Đã kết thúc</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>

            <article className={`${cardClass} mb-6`}>
                <div className="flex items-start gap-3">
                    <div className="mt-0.5">{summary.icon}</div>
                    <div>
                        <h2 className="text-lg font-extrabold text-[#1A1A1A]">{summary.title}</h2>
                        <p className="text-sm font-semibold text-[#1A1A1A]/70 mt-1">{summary.goal}</p>
                    </div>
                    <Gauge className="ml-auto h-5 w-5 text-gray-400" />
                </div>
            </article>

            {renderActiveTab()}
        </div>
    );
}

