import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Download,
  CaretRight,
  Warning,
  CheckCircle,
  MagnifyingGlass,
  Eye,
  X,
  Users,
  GraduationCap,
  ArrowLeft,
  Envelope,
  Phone,
  House,
  Student,
  UserCircle,
  SortAscending,
} from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import { authService } from '../../services/authService';
import {
  classroomService,
  type ClassDashboard,
  type ClassNotification,
  type ClassroomItem,
  type ClassStudent,
  type ClassStudentProfile,
  type WeeklyGradeStatistics,
} from '../../services/classroomService';
import { ExportReportModal } from './ExportReportModal';
import { NotificationTimeline } from './NotificationTimeline';
import { parseVnDate } from '../../lib/timeUtils';

const CLASS_COLORS = ['#FCE38A', '#B8B5FF', '#FFB5B5', '#95E1D3'];
const STUDENT_COLORS = ['#FCE38A', '#B8B5FF', '#FFB5B5', '#95E1D3'];


type TabFilter = 'all' | 'online' | 'offline' | 'attention';
type ViewMode = 'overview' | 'roster';

type StudentDetail = ClassStudent & {
  email?: string;
  phone?: string;
  gender?: string;
  address?: string;
  dob?: string;
  avatarUrl?: string;
};

type ClassSummary = ClassroomItem & {
  onlineCount: number;
  needAttention: number;
  averageGpa: number;
};

const STATUS_MAP: Record<TabFilter, string> = {
  all: 'ALL',
  online: 'ONLINE',
  offline: 'OFFLINE',
  attention: 'ATTENTION',
};

const ATTENTION_MISSING_THRESHOLD = 2;

function formatStudentId(id: number | string): string {
  const digits = String(id).replace(/\D/g, '');
  const numeric = Number(digits || '0');
  return `HS-${numeric.toString().padStart(4, '0')}`;
}

function formatTimeAgo(isoTime: string | null): string {
  if (!isoTime) return 'Offline';
  const diff = Date.now() - parseVnDate(isoTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins <= 1) return 'Online';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function getCompletionColor(value: number): string {
  if (value < 50) return '#FFB5B5';
  if (value < 80) return '#B8B5FF';
  return '#95E1D3';
}

function getGpaColor(score: number): string {
  if (score < 5.0) return '#FFB5B5';
  if (score < 6.5) return '#FCE38A';
  if (score < 8.0) return '#B8B5FF';
  return '#95E1D3';
}

function mapNotificationPreview(notifications: ClassNotification[]) {
  return notifications.slice(0, 3).map((n) => {
    if (n.category === 'ATTENDANCE') {
      return { icon: 'warning' as const, title: n.title, sub: n.body, bg: '#FCE38A' };
    }
    if (n.category === 'GRADE') {
      return { icon: 'clipboard' as const, title: n.title, sub: n.body, bg: '#FFB5B5' };
    }
    return { icon: 'check' as const, title: n.title, sub: n.body, bg: '#B8B5FF' };
  });
}

function formatGenderVi(gender?: string): string {
  const normalized = (gender || '').trim().toUpperCase();
  if (normalized === 'MALE' || normalized === 'NAM') return 'Nam';
  if (normalized === 'FEMALE' || normalized === 'NU' || normalized === 'NỮ') return 'Nữ';
  return gender || '-';
}

function formatDateVi(date?: string): string {
  if (!date) return '-';
  const d = parseVnDate(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('vi-VN');
}

function WeeklyGradeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: { tongBaiCham: number } }>;
  label?: string;
}) {
  const { t } = useSettings();
  if (!active || !payload || payload.length === 0) return null;

  const khaGioi = Number(payload.find((p) => p.name === t.teacherClassList.goodGrade)?.value ?? 0);
  const yeuKem = Number(payload.find((p) => p.name === t.teacherClassList.poorGrade)?.value ?? 0);
  const tong = Number(payload[0]?.payload?.tongBaiCham ?? khaGioi + yeuKem);

  return (
    <div className="rounded-xl border-2 border-[#1A1A1A]/15 bg-white px-3 py-2 text-xs font-bold shadow-md">
      <p className="mb-1 font-extrabold text-[#1A1A1A]">{label}</p>
      <p className="text-[#FF7F50]">{t.teacherClassList.tooltipGoodGrade} {khaGioi}</p>
      <p className="text-[#D1A300]">{t.teacherClassList.tooltipPoorGrade} {yeuKem}</p>
      <p className="mt-1 text-[#1A1A1A]/70">{t.teacherClassList.tooltipTotal} {tong}</p>
    </div>
  );
}

function StudentDetailModal({
  student,
  onClose,
  onPreviewAvatar,
}: {
  student: StudentDetail;
  onClose: () => void;
  onPreviewAvatar: (url: string) => void;
}) {
  const { theme, t } = useSettings();
  const isDark = theme === 'dark';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-[8px] transition-opacity" />
      <div
        className={`relative w-full max-w-md rounded-3xl border-2 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: isDark ? '#202734' : '#B8B5FF' }}>
          <button
            type="button"
            onClick={() => student.avatarUrl && onPreviewAvatar(student.avatarUrl)}
            className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-extrabold text-2xl overflow-hidden ${isDark ? 'border-white/20 text-gray-100 bg-white/10' : 'border-[#1A1A1A] text-[#1A1A1A] bg-white/50'}`}
          >
            {student.avatarUrl ? (
              <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
            ) : (
              student.fullName.charAt(0)
            )}
          </button>
          <div className="flex-1">
            <h3 className={`font-extrabold text-xl ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.fullName}</h3>
            <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{t.teacherClassList.studentIdLabel} {formatStudentId(student.studentId)}</p>
          </div>
          <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-100' : 'bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: UserCircle, label: t.teacherClassList.genderLabel, value: formatGenderVi(student.gender) },
              { icon: GraduationCap, label: t.teacherClassList.dobLabel, value: formatDateVi(student.dob) },
              { icon: Envelope, label: t.teacherClassList.emailLabel, value: student.email || '-' },
              { icon: Phone, label: t.teacherClassList.phoneLabel, value: student.phone || '-' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/50'}`}>
                  <item.icon className="w-3 h-3" /> {item.label}
                </div>
                <p className={`text-sm font-bold truncate ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/50'}`}>
              <House className="w-3 h-3" /> {t.teacherClassList.addressLabel}
            </div>
            <p className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.address || '-'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/10'}`} style={{ backgroundColor: isDark ? undefined : getCompletionColor(student.completionRate) }}>
              <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{t.teacherClassList.completionLabel}</div>
              <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.completionRate.toFixed(1)}%</div>
            </div>
            <div className={`rounded-2xl p-4 border-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/10'}`} style={{ backgroundColor: isDark ? undefined : getGpaColor(student.gpa) }}>
              <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{t.teacherClassList.gpaLabel}</div>
              <div className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{student.gpa.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button className={`flex-1 py-3 font-extrabold rounded-2xl border-2 transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-100 border-white/10' : 'bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/10'}`}>
            <Envelope className="w-4 h-4" /> {t.teacherClassList.contactBtn}
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl transition-colors">
            {t.teacherClassList.closeBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AvatarPreviewOverlay({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-[8px]" />
      <img
        src={src}
        alt="avatar"
        className="relative max-h-[85vh] max-w-[85vw] rounded-3xl border-2 border-white/20 object-contain"
      />
    </div>,
    document.body,
  );
}

export function TeacherClassList() {
  const { theme, t } = useSettings();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { classId } = useParams();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSummary | null>(null);
  const [dashboard, setDashboard] = useState<ClassDashboard | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [studentProfileMap, setStudentProfileMap] = useState<Record<number, ClassStudentProfile>>({});
  const [latestNotifications, setLatestNotifications] = useState<ClassNotification[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyGradeStatistics | null>(null);

  const [view, setView] = useState<ViewMode>(classId ? 'roster' : 'overview');
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [sortBy, setSortBy] = useState('az');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const token = authService.getToken();
  const classIdNum = classId ? Number(classId) : null;

  useEffect(() => {
    setView(classId ? 'roster' : 'overview');
  }, [classId]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;
    const loadClasses = async () => {
      try {
        setIsLoadingClasses(true);
        const list = await classroomService.getAllClassrooms(token);
        if (isCancelled) return;

        const summary: ClassSummary[] = await Promise.all(
          list.map(async (cls) => {
            try {
              const dash = await classroomService.getClassDashboard(cls.classID, token);
              return {
                ...cls,
                onlineCount: dash.onlineStudents,
                needAttention: dash.attentionStudents,
                averageGpa: dash.averageGpa ?? 0,
              };
            } catch {
              return {
                ...cls,
                onlineCount: 0,
                needAttention: 0,
                averageGpa: 0,
              };
            }
          }),
        );

        setClasses(summary);
      } finally {
        if (!isCancelled) setIsLoadingClasses(false);
      }
    };

    void loadClasses();
    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !classIdNum || Number.isNaN(classIdNum)) {
      setSelectedClass(null);
      setStudents([]);
      setDashboard(null);
      setLatestNotifications([]);
      setWeeklyStats(null);
      return;
    }

    let isCancelled = false;
    const loadRoster = async () => {
      try {
        setIsLoadingStudents(true);

        const [classDetail, dash, studentPage, notifications, profiles, weekly] = await Promise.all([
          classroomService.getClassroomById(classIdNum, token),
          classroomService.getClassDashboard(classIdNum, token),
          classroomService.getStudentsByClassPaged(classIdNum, token, {
            page: currentPage,
            size: 5,
            keyword: searchQuery || undefined,
            status: STATUS_MAP[activeTab],
          }),
          classroomService.getClassNotifications(classIdNum, token, { page: 1, size: 3, category: 'ALL' }),
          classroomService.getStudentsByClass(classIdNum, token),
          classroomService.getWeeklyGradeStatistics(classIdNum, token),
        ]);

        if (isCancelled) return;

        setSelectedClass({
          classID: classDetail.classID,
          className: classDetail.className,
          subjectName: classDetail.subjectName,
          semester: classDetail.semester,
          academicYear: classDetail.academicYear,
          startDate: classDetail.startDate,
          endDate: classDetail.endDate,
          status: classDetail.status,
          maxStudents: classDetail.maxStudents,
          currentStudents: classDetail.currentStudents,
          teacherName: classDetail.teacherName,
          onlineCount: dash.onlineStudents,
          needAttention: dash.attentionStudents,
          averageGpa: dash.averageGpa ?? 0,
        });

        setDashboard(dash);
        setStudents(studentPage.data ?? []);
        setTotalPages(studentPage.totalPages || 1);
        setTotalStudents(studentPage.totalElements || 0);
        setLatestNotifications(notifications.data ?? []);
        setWeeklyStats(weekly);
        setStudentProfileMap(
          (profiles ?? []).reduce<Record<number, ClassStudentProfile>>((acc, item) => {
            acc[item.studentID] = item;
            return acc;
          }, {}),
        );
      } finally {
        if (!isCancelled) setIsLoadingStudents(false);
      }
    };

    void loadRoster();
    return () => {
      isCancelled = true;
    };
  }, [token, classIdNum, currentPage, activeTab, searchQuery]);

  const filteredStudents = useMemo(() => {
    const result = activeTab === 'attention'
      ? students.filter((s) => s.status === 'ATTENTION' || s.missingCount >= ATTENTION_MISSING_THRESHOLD)
      : [...students];
    if (sortBy === 'az') result.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    if (sortBy === 'za') result.sort((a, b) => b.fullName.localeCompare(a.fullName, 'vi'));
    if (sortBy === 'score_desc') result.sort((a, b) => b.gpa - a.gpa);
    if (sortBy === 'score_asc') result.sort((a, b) => a.gpa - b.gpa);
    if (sortBy === 'completion_desc') result.sort((a, b) => b.completionRate - a.completionRate);
    return result;
  }, [students, sortBy, activeTab]);

  const tabCounts = useMemo(() => ({
    all: dashboard?.totalStudents ?? 0,
    online: dashboard?.onlineStudents ?? 0,
    offline: dashboard?.offlineStudents ?? 0,
    attention: dashboard?.attentionStudents ?? 0,
  }), [dashboard]);

  const weeklyChartData = useMemo(() => {
    const fallback = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label) => ({
      dayLabel: label,
      khaGioi: 0,
      yeuKem: 0,
      tongBaiCham: 0,
    }));

    if (!weeklyStats?.days?.length) {
      return fallback;
    }

    const byLabel = new Map(
      weeklyStats.days.map((d) => [d.dayLabel, {
        dayLabel: d.dayLabel,
        khaGioi: d.hocSinhGioiKha ?? 0,
        yeuKem: d.hocSinhYeuKem ?? 0,
        tongBaiCham: d.tongBaiCham ?? 0,
      }]),
    );

    return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label) =>
      byLabel.get(label) ?? { dayLabel: label, khaGioi: 0, yeuKem: 0, tongBaiCham: 0 },
    );
  }, [weeklyStats]);

  const chartYAxisMax = useMemo(() => {
    const classCap = weeklyStats?.classCapacity ?? selectedClass?.maxStudents ?? 0;
    const stackedMax = weeklyChartData.reduce(
      (max, item) => Math.max(max, (item.khaGioi ?? 0) + (item.yeuKem ?? 0)),
      0,
    );
    const baseMax = Math.max(classCap, stackedMax, 30, 1);
    return Math.ceil(baseMax / 10) * 10;
  }, [weeklyStats, selectedClass, weeklyChartData]);

  const chartYAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let value = 0; value <= chartYAxisMax; value += 10) {
      ticks.push(value);
    }
    if (!ticks.includes(30) && 30 <= chartYAxisMax) {
      ticks.push(30);
    }
    return ticks.sort((a, b) => a - b);
  }, [chartYAxisMax]);

  const classCardPalette = isDark
    ? ['#2f2a1a', '#252744', '#3a2025', '#173434']
    : CLASS_COLORS;

  const studentBadgePalette = isDark
    ? ['#9f8c3d', '#6e6ab8', '#b97373', '#5ca89d']
    : STUDENT_COLORS;

  const previewNotifications = useMemo(
    () => mapNotificationPreview(latestNotifications),
    [latestNotifications],
  );

  const handleClassSelect = (cls: ClassSummary) => {
    setSelectedClass(cls);
    setSearchQuery('');
    setCurrentPage(1);
    setActiveTab('all');
    navigate(`/teacher/classes/${cls.classID}`);
  };

  const handleBackToOverview = () => {
    setSelectedClass(null);
    setView('overview');
    navigate('/teacher/classes');
  };

  const openStudentModal = (student: ClassStudent) => {
    const profile = studentProfileMap[student.studentId];
    setSelectedStudent({
      ...student,
      email: profile?.email,
      phone: profile?.phone,
      gender: profile?.gender,
      address: profile?.address,
      dob: profile?.dateOfBirth,
      avatarUrl: student.avatarUrl || profile?.avatarUrl,
    });
    setIsStudentModalOpen(true);
  };

  if (!token) {
    return <div className="p-8 font-bold">{t.teacherClassList.notAuthMsg}</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <nav className="flex items-center gap-2 text-sm font-bold">
        <button
          onClick={handleBackToOverview}
          className={`flex items-center gap-1.5 transition-colors ${view === 'overview' ? 'text-[#FF6B4A]' : 'text-gray-400 hover:text-[#1A1A1A]'}`}
        >
          <Student className="w-4 h-4" weight="fill" />
          <span className="font-extrabold">{t.teacherClassList.pageTitle}</span>
        </button>

        {view === 'roster' && selectedClass && (
          <>
            <CaretRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-[#FF6B4A] font-extrabold flex items-center gap-1.5">
              <Student className="w-4 h-4" weight="fill" />
              {t.teacherClassList.classPrefix} {selectedClass.className}
            </span>
          </>
        )}
      </nav>

      {view === 'overview' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                {t.teacherClassList.manageClasses.replace('{n}', String(classes.length))}
              </p>
              <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{t.teacherClassList.pageTitle}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {isLoadingClasses
              ? <div className="col-span-full text-sm font-bold text-gray-400">{t.teacherClassList.loadingClasses}</div>
              : classes.map((cls, idx) => (
                <button
                  key={cls.classID}
                  onClick={() => handleClassSelect(cls)}
                  className={`text-left rounded-3xl border-2 p-6 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-200 group relative overflow-hidden ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}
                  style={{ backgroundColor: classCardPalette[idx % 4] }}
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#1A1A1A]/5 group-hover:scale-125 transition-transform duration-300" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className={`text-xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{t.teacherClassList.classPrefix} {cls.className}</h3>
                        <p className={`text-xs font-bold mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{cls.subjectName}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform ${isDark ? 'bg-black/40' : 'bg-[#1A1A1A]'}`}>
                        <GraduationCap className="w-5 h-5 text-white" weight="fill" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className={`flex justify-between text-xs font-extrabold mb-1.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>
                        <span>{t.teacherClassList.studentCountLabel} {cls.currentStudents}/{cls.maxStudents}</span>
                        <span>{Math.round((cls.currentStudents / Math.max(cls.maxStudents, 1)) * 100)}%</span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isDark ? 'bg-white/35' : 'bg-[#1A1A1A]/40'}`}
                          style={{ width: `${(cls.currentStudents / Math.max(cls.maxStudents, 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                        <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{t.teacherClassList.avgGpa}</div>
                        <div className="text-lg font-extrabold text-emerald-600">{(cls.averageGpa ?? 0).toFixed(1)}</div>
                      </div>
                      <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                        <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{t.teacherClassList.onlineCount}</div>
                        <div className="text-lg font-extrabold text-emerald-600">{cls.onlineCount}</div>
                      </div>
                      <div className={`rounded-xl p-2.5 text-center border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white/50 border-[#1A1A1A]/10'}`}>
                        <div className={`text-[9px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{t.teacherClassList.attentionCount}</div>
                        <div className="text-lg font-extrabold text-[#FF6B4A]">{cls.needAttention}</div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 mt-4 text-sm font-extrabold transition-all duration-200 ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'} opacity-70`}>
                      {t.teacherClassList.viewClassBtn} <CaretRight className="w-4 h-4" weight="bold" />
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </>
      )}

      {view === 'roster' && selectedClass && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToOverview}
                className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center active:scale-95 transition-all ${isDark ? 'border-white/15 bg-[#20242b] hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white hover:bg-[#1A1A1A]/5'}`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} />
              </button>
              <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                  {t.teacherClassList.studentCountLabel} {selectedClass.currentStudents} • {t.teacherClassList.teacherLabel} {selectedClass.teacherName || t.teacherClassList.notAssigned} • {selectedClass.subjectName}
                </p>
                <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{t.teacherClassList.classPrefix} {selectedClass.className}</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(true)}
                className={`flex items-center gap-2 border-2 px-4 h-10 rounded-2xl font-extrabold text-sm active:scale-95 transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
              >
                <Download className="w-4 h-4" weight="fill" /> {t.teacherClassList.exportBtn}
              </button>
            </div>
          </div>

          <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
            <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/20'}`}>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {([
                  { key: 'all' as TabFilter, label: t.teacherClassList.allStudentsTab, count: tabCounts.all },
                  { key: 'online' as TabFilter, label: t.teacherClassList.onlineTab, count: tabCounts.online },
                  { key: 'offline' as TabFilter, label: t.teacherClassList.offlineTab, count: tabCounts.offline },
                  { key: 'attention' as TabFilter, label: t.teacherClassList.attentionTab, count: tabCounts.attention },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                    className={`px-4 py-2 text-sm font-extrabold rounded-2xl whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-[#FF6B4A] text-white shadow-md shadow-[#FF6B4A]/20'
                        : isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.teacherClassList.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className={`pl-9 pr-4 h-9 border-2 rounded-2xl text-sm font-bold placeholder:text-gray-400 focus:outline-none focus:border-[#FF6B4A] transition-colors w-52 ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100' : 'border-[#1A1A1A]/20 bg-[#F7F7F2] text-[#1A1A1A]'}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SortAscending className="w-4 h-4 text-gray-400" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                    <SelectTrigger className={`w-40 rounded-2xl border-2 h-9 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20 text-[#1A1A1A]'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="az">{t.teacherClassList.sortAz}</SelectItem>
                      <SelectItem value="za">{t.teacherClassList.sortZa}</SelectItem>
                      <SelectItem value="score_desc">{t.teacherClassList.sortScoreDesc}</SelectItem>
                      <SelectItem value="score_asc">{t.teacherClassList.sortScoreAsc}</SelectItem>
                      <SelectItem value="completion_desc">{t.teacherClassList.sortCompletionDesc}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/20'}`}>
                  <tr>
                    {[t.teacherClassList.colName, t.teacherClassList.colCompletion, t.teacherClassList.colGpa, t.teacherClassList.colStatus, t.teacherClassList.colDetails].map(h => (
                      <th key={h} className={`px-6 py-4 text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={isDark ? 'divide-y divide-white/10' : 'divide-y divide-[#1A1A1A]/10'}>
                  {isLoadingStudents
                    ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <p className="font-extrabold text-gray-400">{t.teacherClassList.loadingStudents}</p>
                        </td>
                      </tr>
                    )
                    : filteredStudents.length === 0
                      ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Users className="w-12 h-12 text-gray-300" />
                              <p className="font-extrabold text-gray-400">{t.teacherClassList.noStudents}</p>
                              <button onClick={() => { setSearchQuery(''); setActiveTab('all'); }} className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">
                                {t.teacherClassList.clearFilters}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                      : filteredStudents.map((hs) => {
                        const globalIdx = hs.studentId % STUDENT_COLORS.length;
                        return (
                          <tr key={hs.studentId} className={isDark ? 'hover:bg-white/5 transition-colors group/row' : 'hover:bg-[#1A1A1A]/[0.03] transition-colors group/row'}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const avatarUrl = hs.avatarUrl || studentProfileMap[hs.studentId]?.avatarUrl;
                                    if (avatarUrl) setPreviewAvatarUrl(avatarUrl);
                                  }}
                                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-extrabold text-sm group-hover/row:scale-110 transition-transform overflow-hidden ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}
                                  style={{ backgroundColor: studentBadgePalette[globalIdx % 4] }}
                                >
                                  {(hs.avatarUrl || studentProfileMap[hs.studentId]?.avatarUrl) ? (
                                    <img
                                      src={hs.avatarUrl || studentProfileMap[hs.studentId]?.avatarUrl}
                                      alt={hs.fullName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    hs.fullName.charAt(0)
                                  )}
                                </button>
                                <div>
                                  <div className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{hs.fullName}</div>
                                  <div className="text-xs text-gray-400 font-mono">{formatStudentId(hs.studentId)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-36">
                                <div className={`flex justify-between text-xs font-extrabold mb-1 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                                  <span>{hs.completionRate.toFixed(1)}%</span>
                                  {hs.completionRate < 50 && <Warning className="w-3.5 h-3.5 text-[#FF6B4A]" weight="fill" />}
                                  {hs.completionRate >= 100 && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" weight="fill" />}
                                </div>
                                <div className={`h-2.5 w-full rounded-full border overflow-hidden ${isDark ? 'bg-white/10 border-white/15' : 'bg-[#1A1A1A]/10 border-[#1A1A1A]/20'}`}>
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(0, Math.min(hs.completionRate, 100))}%`,
                                      backgroundColor: getCompletionColor(hs.completionRate),
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-extrabold text-sm border-2 ${isDark ? 'border-white/15 text-gray-100' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}
                                style={{ backgroundColor: isDark ? undefined : getGpaColor(hs.gpa) }}
                              >
                                {hs.gpa.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${hs.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : hs.status === 'ATTENTION' || hs.missingCount >= ATTENTION_MISSING_THRESHOLD ? 'bg-[#FF6B4A]' : 'bg-gray-300'}`} />
                                <span className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}>
                                  {hs.status === 'ONLINE'
                                    ? t.teacherClassList.statusOnline
                                    : hs.status === 'ATTENTION' || hs.missingCount >= ATTENTION_MISSING_THRESHOLD
                                      ? `${t.teacherClassList.statusAttention}${hs.missingCount > 0 ? ` (${hs.missingCount} ${t.teacherClassList.missedSuffix})` : ''}`
                                      : formatTimeAgo(hs.lastActiveTime)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 justify-center">
                                <button
                                  onClick={() => openStudentModal(hs)}
                                  className="w-8 h-8 rounded-xl bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/20 flex items-center justify-center transition-colors group/btn"
                                  title={t.teacherClassList.viewStudentTitle}
                                >
                                  <Eye className="w-4 h-4 text-[#FF6B4A] group-hover/btn:scale-110 transition-transform" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            <div className={`p-4 border-t-2 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
              <span className="text-sm font-bold text-gray-400">
                {t.teacherClassList.showStudents
                  .replace('{from}', String(filteredStudents.length === 0 ? 0 : (currentPage - 1) * 5 + 1))
                  .replace('{to}', String(Math.min(currentPage * 5, totalStudents)))
                  .replace('{total}', String(totalStudents))}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                >
                  &lt;
                </button>
                {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 transition-all ${
                      p === currentPage
                        ? 'bg-[#FF6B4A] text-white border-[#FF6B4A] shadow-md shadow-[#FF6B4A]/20'
                        : isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isDark ? 'border-white/15 bg-[#20242b] text-gray-100 hover:bg-[#272c35]' : 'border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-2 rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
              <div className={`px-6 py-4 border-b-2 flex justify-between items-center ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{t.teacherClassList.weeklyStatsTitle}</h3>
                <div className="flex items-center gap-4 text-xs font-extrabold">
                  <span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FF7F50' }} /> {t.teacherClassList.goodGrade}</span>
                  <span className="inline-flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FFD700' }} /> {t.teacherClassList.poorGrade}</span>
                </div>
              </div>
              <div className="px-6 pt-5 pb-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff22' : '#1A1A1A1F'} />
                    <XAxis
                      dataKey="dayLabel"
                      tick={{ fontSize: 12, fontWeight: 800, fill: isDark ? '#9CA3AF' : '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      domain={[0, chartYAxisMax]}
                      ticks={chartYAxisTicks}
                      interval={0}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fontWeight: 700, fill: isDark ? '#9CA3AF' : '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip content={<WeeklyGradeTooltip />} cursor={{ fill: isDark ? '#ffffff10' : '#00000008' }} />
                    <Bar
                      name={t.teacherClassList.goodGrade}
                      dataKey="khaGioi"
                      stackId="score"
                      fill="#FF7F50"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      name={t.teacherClassList.poorGrade}
                      dataKey="yeuKem"
                      stackId="score"
                      fill="#FFD700"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
              <div className={`px-6 py-4 border-b-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{t.teacherClassList.notifTitle}</h3>
              </div>
              <div className="p-5 space-y-3 flex-1">
                {previewNotifications.length === 0 ? (
                  <div className="p-3 text-sm font-bold text-gray-400">{t.teacherClassList.noNotif}</div>
                ) : previewNotifications.map((n, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-2xl border-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${isDark ? 'border-white/10 bg-white/5' : 'border-[#1A1A1A]/15'}`} style={{ backgroundColor: isDark ? undefined : n.bg }}>
                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                      {n.icon === 'warning' && <Warning className="w-4 h-4 text-yellow-600" weight="fill" />}
                      {n.icon === 'check' && <CheckCircle className="w-4 h-4 text-emerald-600" weight="fill" />}
                      {n.icon === 'clipboard' && <span className="text-sm font-extrabold text-red-500">!</span>}
                    </div>
                    <div>
                      <h4 className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{n.title}</h4>
                      <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{n.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-4 border-t-2 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                <button
                  onClick={() => setShowNotifications(true)}
                  className={`w-full py-2.5 font-extrabold text-sm border-2 rounded-2xl active:scale-[0.98] transition-all ${isDark ? 'text-gray-100 border-white/15 hover:bg-white/5' : 'text-[#1A1A1A] border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5'}`}
                >
                  {t.teacherClassList.viewAllNotif}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isStudentModalOpen && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onPreviewAvatar={(url) => setPreviewAvatarUrl(url)}
          onClose={() => {
            setIsStudentModalOpen(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {previewAvatarUrl && <AvatarPreviewOverlay src={previewAvatarUrl} onClose={() => setPreviewAvatarUrl(null)} />}

      {showExportModal && selectedClass && (
        <ExportReportModal
          classId={selectedClass.classID}
          className={selectedClass.className}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showNotifications && selectedClass && (
        <NotificationTimeline
          classId={selectedClass.classID}
          onClose={() => setShowNotifications(false)}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
