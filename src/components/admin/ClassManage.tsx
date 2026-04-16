import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Plus, UserPlus, GraduationCap, Users, X, UserSwitch, CalendarBlank, BookOpen, Info, Student, PencilSimple, Lock, LockOpen } from '@phosphor-icons/react';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

// ─── API Types ────────────────────────────────────────────────────────────────
interface ClassroomResponse {
    classID: number;
    className: string;
    subjectName: string;
    semester: string;
    academicYear: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    maxStudents: number;
    currentStudents: number;
    teacherName: string | null;
}

interface ClassroomStatsResponse {
    totalClasses: number;
    activeClasses: number;
    unassignedClasses: number;
    averageClassSize: number;
}

interface PageResponse<T> {
    currentPage: number;
    totalPages: number;
    totalElements: number;
    pageSize: number;
    data: T[];
}

interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

interface SubjectItem {
    subjectID: number;
    subjectName: string;
}

interface TeacherItem {
    teacherID: number;
    fullName: string;
}

interface StudentItem {
    studentID: number;
    fullName: string;
    email: string;
}

interface StudentInClass {
    studentID: number;
    fullName: string;
    gender: string;
    email: string;
    phone: string;
    avatarUrl?: string | null;
    memberStatus?: string; // ACTIVE | INACTIVE trong lớp này (từ ClassMember.status)
}

interface StudentDetail {
    studentID: number;
    username: string;
    email: string;
    phone: string;
    status: string;
    createdAt: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string;
    address: string | null;
    parentName: string | null;
    parentPhone: string | null;
    parentEmail: string | null;
    parentRelationship: string | null;
    avatarUrl?: string | null;
    role?: { name: string };
}

interface ClassroomDetail extends ClassroomResponse {
    subjectID?: number;
    teacherID?: number;
    students?: StudentInClass[];
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalType = 'createClass' | 'assignTeacher' | 'addStudent' | 'classDetail' | 'editClass' | 'toggleStatus' | null;

const SUBJECT_ACCENT: Record<string, string> = {
    'Toán': '#D97706',
    'Ngữ văn': '#059669',
    'Tiếng Anh': '#DC2626',
    'Vật lý': '#7C3AED',
    'Hóa học': '#2563EB',
    'Sinh học': '#16A34A',
    'Lịch sử': '#B45309',
    'Địa lý': '#0891B2',
};

function getAccent(subjectName: string): string {
    const match = Object.keys(SUBJECT_ACCENT).find(k => subjectName?.includes(k));
    return match ? SUBJECT_ACCENT[match] : '#FF6B4A';
}

const SEMESTERS = ['Học kỳ 1', 'Học kỳ 2', 'Học kỳ hè'];
const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

function formatGenderVi(gender?: string | null): string {
    if (!gender) return 'Chưa cập nhật';
    const normalized = gender.toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'Nữ';
    if (normalized === 'other' || normalized === 'khac' || normalized === 'khác') return 'Khác';
    return gender;
}

function normalizeAvatarUrl(...candidates: unknown[]): string | null {
    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const value = candidate.trim();
        if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') continue;
        return value;
    }
    return null;
}

function getParentRelationshipLabel(relationship?: string | null): string {
    const value = (relationship ?? '').trim().toLowerCase();
    if (!value) return '';
    if (value === 'father') return 'Ba';
    if (value === 'mother') return 'Mẹ';
    if (value === 'grandfather') return 'Ông';
    if (value === 'grandmother') return 'Bà';
    if (value === 'sibling') return 'Anh / Chị';
    if (value === 'guardian') return 'Người giám hộ';
    return relationship ?? '';
}

// ─── Reusable Modal Wrapper ───────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[4px] dark:bg-black/70">
            <div className="bg-white dark:bg-[#111827] rounded-3xl border-2 border-[#1A1A1A] dark:border-white/15 shadow-2xl w-full max-w-lg animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-5 border-b-2 border-[#1A1A1A]/10 dark:border-white/10">
                    <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-slate-100">{title}</h2>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-[#1A1A1A] dark:text-slate-200" weight="bold" />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(modalContent, document.body);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-[#1A1A1A]/60 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-4 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 text-sm font-semibold focus:outline-none focus:border-[#FF6B4A] transition-colors bg-gray-50 dark:bg-[#0f172a] dark:border-white/15 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-[#ff8a66] dark:[color-scheme:dark] dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-85";

// ─── Create Class Modal ───────────────────────────────────────────────────────
function CreateClassModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({
        name: '',
        subjectID: '',
        maxStudents: '40',
        teacherId: '',
        semester: SEMESTERS[0],
        academicYear: ACADEMIC_YEARS[0],
        startDate: '',
        endDate: '',
    });
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        // Fetch subjects
        api.get<ApiResponse<SubjectItem[]>>('/subjects', token)
            .then(r => setSubjects(r.result ?? []))
            .catch(() => {});
        // Fetch teachers list from /teachers endpoint which returns correct teacherID
        api.get<ApiResponse<TeacherItem[]>>('/teachers', token)
            .then(r => setTeachers(r.result ?? []))
            .catch(() => {});
    }, []);

    // Set first subject as default once loaded
    useEffect(() => {
        if (subjects.length > 0 && !form.subjectID) {
            setForm(p => ({ ...p, subjectID: String(subjects[0].subjectID) }));
        }
    }, [subjects]);

    const handle = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const submit = async () => {
        setError(null);
        if (!form.name.trim()) { setError('Vui lòng nhập tên lớp học.'); return; }
        if (!form.subjectID) { setError('Vui lòng chọn môn học.'); return; }
        const token = authService.getToken();
        if (!token) { setError('Bạn chưa đăng nhập.'); return; }
        setLoading(true);
        try {
            const payload: any = {
                className: form.name,
                subjectID: parseInt(form.subjectID),
                semester: form.semester,
                academicYear: form.academicYear,
                maxStudents: parseInt(form.maxStudents) || 40,
            };
            if (form.startDate) payload.startDate = form.startDate;
            if (form.endDate) payload.endDate = form.endDate;
            if (form.teacherId) payload.teacherId = parseInt(form.teacherId);
            await api.authPost<ApiResponse<ClassroomResponse>>('/classrooms', payload, token);
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Tạo lớp học mới" onClose={onClose}>
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">{error}</div>}
                <Field label="Tên lớp học *">
                    <input className={inputCls} placeholder="VD: Toán Đại số 10A" value={form.name} onChange={e => handle('name', e.target.value)} />
                </Field>
                <Field label="Môn học *">
                    <select className={inputCls} value={form.subjectID} onChange={e => handle('subjectID', e.target.value)}>
                        {subjects.length === 0 && <option value="">Đang tải...</option>}
                        {subjects.map(s => <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>)}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Học kỳ *">
                        <select className={inputCls} value={form.semester} onChange={e => handle('semester', e.target.value)}>
                            {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Năm học *">
                        <select className={inputCls} value={form.academicYear} onChange={e => handle('academicYear', e.target.value)}>
                            {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Ngày bắt đầu *">
                        <input type="date" className={inputCls} value={form.startDate} onChange={e => handle('startDate', e.target.value)} />
                    </Field>
                    <Field label="Ngày kết thúc *">
                        <input type="date" className={inputCls} value={form.endDate} onChange={e => handle('endDate', e.target.value)} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Sĩ số tối đa">
                        <input type="number" className={inputCls} min={1} max={100} value={form.maxStudents} onChange={e => handle('maxStudents', e.target.value)} />
                    </Field>
                    <Field label="Giáo viên (tuỳ chọn)">
                        <select className={inputCls} value={form.teacherId} onChange={e => handle('teacherId', e.target.value)}>
                            <option value="">— Chưa phân công —</option>
                            {teachers.map(t => <option key={t.teacherID} value={t.teacherID}>{t.fullName}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A] hover:bg-gray-50 transition-colors">Huỷ</button>
                    <button onClick={submit} disabled={loading} className="flex-1 py-3 rounded-2xl bg-[#FF6B4A] text-white font-extrabold text-sm hover:bg-[#ff5535] transition-colors disabled:opacity-50">
                        <Plus className="inline w-4 h-4 mr-1" weight="bold" />{loading ? 'Đang tạo...' : 'Tạo lớp'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Assign Teacher Modal ─────────────────────────────────────────────────────
function AssignTeacherModal({ cls, onClose, onSuccess }: { cls: ClassroomResponse; onClose: () => void; onSuccess: () => void }) {
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [initialSelected, setInitialSelected] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        api.get<ApiResponse<TeacherItem[]>>('/teachers', token)
            .then(r => {
                const list = r.result ?? [];
                setTeachers(list);
                if (cls.teacherName) {
                    const current = list.find(t => t.fullName === cls.teacherName);
                    if (current) {
                        setSelected(current.teacherID);
                        setInitialSelected(current.teacherID);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const filtered = teachers.filter(t => t.fullName.toLowerCase().includes(search.toLowerCase()));

    // Click vào giáo viên đang chọn → bỏ chọn (deselect)
    const handleToggle = (teacherID: number) => {
        setSelected(prev => prev === teacherID ? null : teacherID);
    };

    const hasChanged = selected !== initialSelected;

    const submit = async () => {
        if (!hasChanged) { onClose(); return; }
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            // Nếu selected = null → gửi không có teacherId → backend set null (xóa giáo viên)
            const url = selected != null
                ? `/classrooms/${cls.classID}/teacher?teacherId=${selected}`
                : `/classrooms/${cls.classID}/teacher`;
            await api.authPut<ApiResponse<void>>(url, {}, token);
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const getButtonLabel = () => {
        if (loading) return 'Đang lưu...';
        if (!hasChanged) return 'Đóng';
        if (selected === null) return 'Gỡ giáo viên';
        if (initialSelected === null) return 'Gán giáo viên';
        return 'Đổi giáo viên';
    };

    return (
        <Modal title={cls.teacherName ? 'Đổi giáo viên' : 'Gán giáo viên'} onClose={onClose}>
            <div className="space-y-4">
                {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">{error}</div>}
                <div className="bg-gray-50 rounded-2xl p-4 border border-[#1A1A1A]/10">
                    <p className="text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider mb-1">Lớp học</p>
                    <p className="font-extrabold text-[#1A1A1A]">{cls.className}</p>
                    <p className="text-sm font-bold text-[#1A1A1A]/50">Môn: {cls.subjectName}</p>
                </div>

                {/* Trạng thái giáo viên hiện tại / sau khi thay đổi */}
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border transition-colors ${
                    selected === null
                        ? 'text-gray-500 bg-gray-50 border-gray-200'
                        : 'text-amber-600 bg-amber-50 border-amber-200'
                }`}>
                    <GraduationCap className="w-4 h-4 flex-shrink-0" weight="fill" />
                    {selected === null
                        ? <span>Chưa có giáo viên phụ trách</span>
                        : <span>Đã chọn: <span className="font-extrabold">{teachers.find(t => t.teacherID === selected)?.fullName}</span></span>
                    }
                    {selected !== null && (
                        <button
                            onClick={() => setSelected(null)}
                            className="ml-auto text-xs font-extrabold text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
                        >
                            Bỏ chọn
                        </button>
                    )}
                </div>

                <Field label="Tìm giáo viên">
                    <input className={inputCls} placeholder="Tìm theo tên..." value={search} onChange={e => setSearch(e.target.value)} />
                </Field>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {filtered.map(t => (
                        <div
                            key={t.teacherID}
                            onClick={() => handleToggle(t.teacherID)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors select-none ${
                                selected === t.teacherID
                                    ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                    : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:bg-gray-50'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                selected === t.teacherID ? 'border-[#FF6B4A] bg-[#FF6B4A]' : 'border-gray-300'
                            }`}>
                                {selected === t.teacherID && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                                {t.fullName.charAt(0)}
                            </div>
                            <span className="font-bold text-sm text-[#1A1A1A] flex-1">{t.fullName}</span>
                            {initialSelected === t.teacherID && (
                                <span className="text-[10px] font-extrabold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Hiện tại</span>
                            )}
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-sm text-center text-gray-400 py-4">Không tìm thấy giáo viên</p>}
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm hover:bg-gray-50 transition-colors">Huỷ</button>
                    <button
                        disabled={loading}
                        onClick={submit}
                        className={`flex-1 py-3 rounded-2xl text-white font-extrabold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            selected === null && hasChanged
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-[#FF6B4A] hover:bg-[#ff5535]'
                        }`}
                    >
                        {getButtonLabel()}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Add Student Modal ────────────────────────────────────────────────────────
function AddStudentModal({ cls, onClose, onSuccess }: { cls: ClassroomResponse; onClose: () => void; onSuccess: () => void }) {
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [initialSelected, setInitialSelected] = useState<number[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [fetchLoading, setFetchLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        setFetchLoading(true);
        Promise.all([
            api.get<ApiResponse<StudentItem[]>>('/students', token),
            api.get<ApiResponse<any>>(`/classrooms/${cls.classID}`, token),
        ]).then(([allRes, classRes]) => {
            const allStudents = allRes.result ?? [];
            setStudents(allStudents);
            const currentIds: number[] = (classRes.result?.students ?? []).map((s: any) => s.studentID as number);
            setInitialSelected(currentIds);
            setSelected(currentIds);
        }).catch(() => {}).finally(() => setFetchLoading(false));
    }, []);

    const filtered = students.filter(s =>
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        String(s.studentID).includes(search)
    );

    const toAdd = selected.filter(id => !initialSelected.includes(id));
    const toRemove = initialSelected.filter(id => !selected.includes(id));
    const hasChanged = toAdd.length > 0 || toRemove.length > 0;
    const finalCount = initialSelected.length - toRemove.length + toAdd.length;

    const isOverLimit = finalCount > cls.maxStudents;

    const toggle = (id: number) => {
        setError(null);
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const submit = async () => {
        if (!hasChanged) { onClose(); return; }
        if (isOverLimit) return;
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            await api.authPost<ApiResponse<void>>(`/classrooms/${cls.classID}/students`, selected, token);
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const getButtonLabel = () => {
        if (loading) return 'Đang lưu...';
        if (isOverLimit) return `Vượt quá số lượng cho phép`;
        if (!hasChanged) return 'Đóng';
        const parts: string[] = [];
        if (toAdd.length > 0) parts.push(`+${toAdd.length} thêm`);
        if (toRemove.length > 0) parts.push(`-${toRemove.length} xóa`);
        return `Lưu thay đổi (${parts.join(', ')})`;
    };

    return (
        <Modal title="Quản lý học sinh trong lớp" onClose={onClose}>
            <div className="space-y-4">
                {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">{error}</div>}
                {isOverLimit && (
                    <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">
                        ⚠️ Đã vượt quá sĩ số tối đa ({cls.maxStudents} học sinh). Vui lòng bỏ chọn bớt học sinh.
                    </div>
                )}
                <div className="bg-gray-50 rounded-2xl p-4 border border-[#1A1A1A]/10">
                    <p className="text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider mb-1">Lớp học</p>
                    <p className="font-extrabold text-[#1A1A1A]">{cls.className}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Users className="w-3.5 h-3.5 text-[#1A1A1A]/40" weight="fill" />
                        <span className="text-sm font-bold text-[#1A1A1A]/60">
                            {finalCount}/{cls.maxStudents} học sinh
                            {toAdd.length > 0 && <span className="text-emerald-600 ml-1">(+{toAdd.length} thêm)</span>}
                            {toRemove.length > 0 && <span className="text-red-500 ml-1">(-{toRemove.length} xóa)</span>}
                        </span>
                    </div>
                </div>

                <Field label={`Tìm học sinh — đã chọn ${selected.length}/${students.length}`}>
                    <input className={inputCls} placeholder="Tìm theo tên hoặc mã HS..." value={search} onChange={e => setSearch(e.target.value)} />
                </Field>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {fetchLoading ? (
                        <div className="space-y-2 py-1">
                            <p className="text-xs font-bold text-gray-400 px-1">Đang tải danh sách học sinh...</p>
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-[#1A1A1A]/10 bg-gray-50 animate-pulse">
                                    <div className="w-4 h-4 rounded bg-gray-200" />
                                    <div className="w-8 h-8 rounded-xl bg-gray-200" />
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="h-3.5 w-36 bg-gray-200 rounded" />
                                        <div className="h-3 w-52 bg-gray-100 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.map(s => {
                        const isSelected = selected.includes(s.studentID);
                        const wasInClass = initialSelected.includes(s.studentID);
                        const isNew = isSelected && !wasInClass;
                        const isRemoved = !isSelected && wasInClass;
                        return (
                            <label
                                key={s.studentID}
                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors select-none ${
                                    isRemoved
                                        ? 'border-red-200 bg-red-50'
                                        : isNew
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : isSelected
                                                ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                                : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="accent-[#FF6B4A] w-4 h-4 flex-shrink-0"
                                    checked={isSelected}
                                    onChange={() => toggle(s.studentID)}
                                />
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 ${
                                    isRemoved ? 'bg-red-400' : isNew ? 'bg-emerald-500' : isSelected ? 'bg-[#FF6B4A]' : 'bg-[#1A1A1A]'
                                }`}>
                                    {s.fullName?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm truncate ${isRemoved ? 'text-red-500 line-through' : 'text-[#1A1A1A]'}`}>{s.fullName}</p>
                                    <p className="text-xs text-[#1A1A1A]/50 font-semibold truncate">ID: {s.studentID} • {s.email}</p>
                                </div>
                                {wasInClass && !isRemoved && (
                                    <span className="text-[10px] font-extrabold text-[#FF6B4A] bg-[#FF6B4A]/10 border border-[#FF6B4A]/30 px-2 py-0.5 rounded-full flex-shrink-0">Đang trong lớp</span>
                                )}
                                {isNew && (
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex-shrink-0">Thêm mới</span>
                                )}
                                {isRemoved && (
                                    <span className="text-[10px] font-extrabold text-red-500 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full flex-shrink-0">Bỏ khỏi lớp</span>
                                )}
                            </label>
                        );
                    })}
                    {!fetchLoading && filtered.length === 0 && (
                        <p className="text-sm text-center text-gray-400 py-4">
                            {students.length === 0 ? 'Chưa tải được dữ liệu học sinh, vui lòng thử lại sau.' : 'Không tìm thấy học sinh'}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm hover:bg-gray-50 transition-colors">Huỷ</button>
                    <button
                        disabled={loading || fetchLoading || isOverLimit}
                        onClick={submit}
                        className={`flex-1 py-3 rounded-2xl text-white font-extrabold text-sm transition-colors disabled:cursor-not-allowed ${
                            isOverLimit
                                ? 'bg-red-400 opacity-80'
                                : toRemove.length > 0 && toAdd.length === 0
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-[#FF6B4A] hover:bg-[#ff5535] disabled:opacity-40'
                        }`}
                    >
                        {getButtonLabel()}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Student Detail Modal ─────────────────────────────────────────────────────
function StudentDetailModal({
    student,
    classID,
    onClose,
    onRefresh,
}: {
    student: StudentInClass;
    classID: number;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const [detail, setDetail] = useState<StudentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [isAvatarZoomOpen, setIsAvatarZoomOpen] = useState(false);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        setLoading(true);
        api.get<ApiResponse<StudentDetail>>(`/students/${student.studentID}`, token)
            .then(r => {
                const raw = r.result as StudentDetail & {
                    avatar?: string | null;
                    imageUrl?: string | null;
                    profileImageUrl?: string | null;
                    profilePicture?: string | null;
                    profilePictureUrl?: string | null;
                };

                setDetail({
                    ...r.result,
                    avatarUrl: normalizeAvatarUrl(
                        raw.avatarUrl,
                        raw.avatar,
                        raw.imageUrl,
                        raw.profileImageUrl,
                        raw.profilePicture,
                        raw.profilePictureUrl,
                    ),
                });
            })
            .catch(() => setDetail(null))
            .finally(() => setLoading(false));
    }, [student.studentID]);

    const handleToggleStatus = async () => {
        const token = authService.getToken();
        if (!token) return;
        setActionLoading(true);
        setError(null);
        try {
            await api.authPut<ApiResponse<void>>(`/classrooms/${classID}/students/${student.studentID}/status`, {}, token);
            onRefresh();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemove = async () => {
        const token = authService.getToken();
        if (!token) return;
        setActionLoading(true);
        setError(null);
        try {
            await api.authDelete<ApiResponse<void>>(`/classrooms/${classID}/students/${student.studentID}`, token);
            onRefresh();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra.');
        } finally {
            setActionLoading(false);
            setConfirmRemove(false);
        }
    };

    // Dùng memberStatus từ ClassMember (trạng thái trong lớp) — KHÔNG phải status tài khoản
    const isMemberActive = (student.memberStatus ?? 'ACTIVE') === 'ACTIVE';
    const accent = isMemberActive ? '#FF6B4A' : '#F97316';
    const [avatarBroken, setAvatarBroken] = useState(false);
    const avatarSrc = normalizeAvatarUrl(student.avatarUrl, detail?.avatarUrl);
    const shouldShowAvatar = !!avatarSrc && !avatarBroken;

    useEffect(() => {
        setAvatarBroken(false);
    }, [avatarSrc]);

    useEffect(() => {
        if (!shouldShowAvatar) {
            setIsAvatarZoomOpen(false);
        }
    }, [shouldShowAvatar]);

    useEffect(() => {
        if (!isAvatarZoomOpen) return;

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsAvatarZoomOpen(false);
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isAvatarZoomOpen]);

    const formatDate = (d: string | null | undefined) => {
        if (!d) return '—';
        return String(d).substring(0, 10);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[6px] dark:bg-black/80">
            <div className={`bg-white dark:bg-[#111827] rounded-3xl border-2 shadow-2xl w-full max-w-md animate-fadeIn ${isMemberActive ? 'border-[#1A1A1A]/10 dark:border-white/15' : 'border-orange-200 dark:border-orange-400/50'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-[#1A1A1A] dark:text-slate-100">Thông tin học sinh</h2>
                        {!isMemberActive && (
                            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full dark:text-orange-200 dark:bg-orange-500/20 dark:border-orange-300/50">
                                Đang tạm ngưng
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" weight="bold" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-8 h-8 border-4 border-[#FF6B4A] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : detail ? (
                        <div className="space-y-4">
                            {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">{error}</div>}

                            {/* Avatar + name */}
                            <div className={`flex items-center gap-4 rounded-2xl p-4 border ${isMemberActive ? 'bg-gray-50 border-gray-100 dark:bg-slate-800/70 dark:border-white/10' : 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-300/40'}`}>
                                {shouldShowAvatar ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsAvatarZoomOpen(true)}
                                        className="w-14 h-14 rounded-2xl overflow-hidden border border-black/10 dark:border-white/20 flex-shrink-0 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/50"
                                        title="Nhấn để phóng to ảnh đại diện"
                                        aria-label="Phóng to ảnh đại diện"
                                    >
                                        <img
                                            src={avatarSrc ?? undefined}
                                            alt={detail.fullName}
                                            onError={() => setAvatarBroken(true)}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ) : (
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl flex-shrink-0"
                                        style={{ backgroundColor: accent }}>
                                        {detail.fullName?.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-lg text-[#1A1A1A] dark:text-slate-100 leading-tight">{detail.fullName}</p>
                                    <p className="text-xs font-bold text-gray-400 dark:text-slate-400 mt-0.5">{detail.email}</p>
                                    <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                        isMemberActive
                                            ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-300/40'
                                            : 'text-orange-600 bg-orange-100 border-orange-300 dark:text-orange-200 dark:bg-orange-500/20 dark:border-orange-300/40'
                                    }`}>
                                        {isMemberActive ? '● Đang học' : '⏸ Đang tạm ngưng trong lớp'}
                                    </span>
                                </div>
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Tên đăng nhập', value: detail.username },
                                    { label: 'Số điện thoại', value: detail.phone || '—' },
                                    { label: 'Giới tính', value: formatGenderVi(detail.gender) },
                                    { label: 'Ngày sinh', value: formatDate(detail.dateOfBirth) },
                                    { label: 'Địa chỉ', value: detail.address || '—' },
                                    { label: 'Ngày tạo', value: formatDate(detail.createdAt) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 dark:bg-slate-800/70 dark:border-white/10">
                                        <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                        <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Parent info */}
                            {(detail.parentName || detail.parentPhone) && (
                                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-300/35">
                                    <p className="text-xs font-extrabold text-blue-500 dark:text-blue-200 uppercase tracking-wider mb-2">Thông tin phụ huynh</p>
                                    <div className="space-y-1">
                                        {detail.parentName && <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">{detail.parentName} {getParentRelationshipLabel(detail.parentRelationship) ? `(${getParentRelationshipLabel(detail.parentRelationship)})` : ''}</p>}
                                        {detail.parentPhone && <p className="text-xs font-bold text-gray-600 dark:text-slate-300">Số điện thoại: {detail.parentPhone}</p>}
                                        {detail.parentEmail && <p className="text-xs font-bold text-gray-600 dark:text-slate-300">Email: {detail.parentEmail}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 dark:text-slate-400 font-bold py-8">Không thể tải thông tin học sinh.</p>
                    )}
                </div>

                {/* Footer actions */}
                {!loading && detail && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-900/70 rounded-b-3xl space-y-2">
                        {confirmRemove ? (
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-red-600 text-center">Xác nhận xóa <span className="font-extrabold">{detail.fullName}</span> khỏi lớp?</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setConfirmRemove(false)} className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-white/15 text-[#1A1A1A] dark:text-slate-100 font-extrabold text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Không</button>
                                    <button onClick={handleRemove} disabled={actionLoading}
                                        className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-sm transition-colors disabled:opacity-50">
                                        {actionLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {/* Nút toggle dựa trên memberStatus trong lớp */}
                                <button
                                    onClick={handleToggleStatus}
                                    disabled={actionLoading}
                                    className={`flex-1 py-2.5 rounded-2xl border-2 font-extrabold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                                        isMemberActive
                                            ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                                            : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                >
                                    {isMemberActive
                                        ? <><Lock className="w-3.5 h-3.5" weight="bold" />{actionLoading ? '...' : 'Tạm ngưng'}</>
                                        : <><LockOpen className="w-3.5 h-3.5" weight="bold" />{actionLoading ? '...' : 'Kích hoạt lại'}</>
                                    }
                                </button>
                                <button
                                    onClick={() => setConfirmRemove(true)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-2xl border-2 border-red-200 dark:border-red-300/40 text-red-500 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 font-extrabold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <X className="w-3.5 h-3.5" weight="bold" /> Xóa khỏi lớp
                                </button>
                                <button onClick={onClose} className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-slate-700 text-white font-extrabold text-sm hover:bg-[#333] dark:hover:bg-slate-600 transition-colors">
                                    Đóng
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {!loading && !detail && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-900/70 rounded-b-3xl">
                        <button onClick={onClose} className="w-full py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-slate-700 text-white font-extrabold text-sm hover:bg-[#333] dark:hover:bg-slate-600 transition-colors">Đóng</button>
                    </div>
                )}
            </div>

            {isAvatarZoomOpen && avatarSrc && (
                <div
                    className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4"
                    onClick={() => setIsAvatarZoomOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ảnh đại diện phóng to"
                >
                    <button
                        type="button"
                        onClick={() => setIsAvatarZoomOpen(false)}
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                        aria-label="Đóng ảnh phóng to"
                    >
                        <X className="w-5 h-5" weight="bold" />
                    </button>
                    <img
                        src={avatarSrc}
                        alt={detail?.fullName ?? 'Ảnh đại diện học sinh'}
                        className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain border border-white/20 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(modalContent, document.body);
}

// ─── Class Detail Modal ───────────────────────────────────────────────────────
function ClassDetailModal({ cls, onClose, onEdit, onToggleStatus }: {
    cls: ClassroomResponse;
    onClose: () => void;
    onEdit: (detail: ClassroomDetail) => void;
    onToggleStatus: (detail: ClassroomDetail) => void;
}) {
    const [tab, setTab] = useState<'info' | 'students'>('info');
    const [detail, setDetail] = useState<ClassroomDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<StudentInClass | null>(null);
    const accent = getAccent(cls.subjectName);

    const fetchDetail = () => {
        const token = authService.getToken();
        if (!token) return;
        setLoadingDetail(true);
        api.get<ApiResponse<any>>(`/classrooms/${cls.classID}`, token)
            .then(r => {
                const d = r.result;
                const mappedStudents: StudentInClass[] = (d.students ?? []).map((s: any) => ({
                    ...s,
                    avatarUrl: normalizeAvatarUrl(
                        s?.avatarUrl,
                        s?.avatar,
                        s?.imageUrl,
                        s?.profileImageUrl,
                        s?.profilePicture,
                        s?.profilePictureUrl,
                    ),
                }));

                setDetail({
                    classID: d.classID,
                    className: d.className,
                    subjectName: d.subjectName,
                    subjectID: d.subjectID,
                    semester: d.semester,
                    academicYear: d.academicYear,
                    startDate: d.startDate ? String(d.startDate) : null,
                    endDate: d.endDate ? String(d.endDate) : null,
                    status: d.status,
                    maxStudents: d.maxStudents,
                    currentStudents: d.currentStudents,
                    teacherName: d.teacherName ?? null,
                    teacherID: d.teacherID,
                    students: mappedStudents,
                });
            })
            .catch(() => setDetail(null))
            .finally(() => setLoadingDetail(false));
    };

    useEffect(() => { fetchDetail(); }, [cls.classID]);

    const data = detail ?? cls as ClassroomDetail;
    const isFull = data.currentStudents >= data.maxStudents;
    const pct = Math.min((data.currentStudents / data.maxStudents) * 100, 100);
    const locked = data.status === 'INACTIVE' || data.status === 'LOCKED';

    const statusColor = locked
        ? 'text-gray-500 bg-gray-100 border-gray-300'
        : data.status === 'FULL'
            ? 'text-red-500 bg-red-50 border-red-200'
            : 'text-emerald-600 bg-emerald-50 border-emerald-200';

    const statusLabel = data.status === 'ACTIVE' ? 'Đang diễn ra'
        : locked ? '🔒 Đã khóa'
        : data.status === 'FULL' ? 'Đủ sĩ số'
        : data.status;

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return String(d).substring(0, 10);
    };

    const classDetailModalContent = (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[6px] dark:bg-black/75">
            <div className="bg-white dark:bg-[#111827] rounded-3xl border-2 border-[#1A1A1A]/10 dark:border-white/15 shadow-2xl w-full max-w-3xl flex flex-col"
                style={{ maxHeight: '90vh' }}>

                {/* ── Header ── */}
                <div className="flex items-start gap-4 px-7 py-6 border-b border-gray-100 dark:border-white/10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl flex-shrink-0"
                        style={{ backgroundColor: accent }}>
                        {data.subjectName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h2 className="text-2xl font-extrabold text-[#1A1A1A] dark:text-slate-100 leading-tight">{data.className}</h2>
                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                                {statusLabel}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-400 dark:text-slate-400">#{data.classID} · Môn: {data.subjectName}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-[#1A1A1A] dark:text-slate-200" weight="bold" />
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 px-7 pt-4 pb-0 border-b border-gray-100 dark:border-white/10">
                    {(['info', 'students'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-5 py-2 rounded-t-2xl text-sm font-extrabold border-2 border-b-0 transition-colors ${tab === t ? 'bg-white dark:bg-[#111827] border-[#1A1A1A]/15 dark:border-white/20 text-[#FF6B4A]' : 'bg-gray-50 dark:bg-slate-800/60 border-transparent text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}>
                            {t === 'info' ? (
                                <span className="flex items-center gap-1.5"><Info className="w-4 h-4" weight="bold" />Thông tin lớp</span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <Student className="w-4 h-4" weight="bold" />Học sinh
                                    <span className="ml-1 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-200 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">{data.currentStudents}</span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab content ── */}
                <div className="flex-1 overflow-y-auto px-7 py-5">
                    {loadingDetail ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-8 h-8 border-4 border-[#FF6B4A] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {tab === 'info' && (
                                <div className="space-y-5">
                                    <div className="bg-gray-50 dark:bg-slate-800/70 rounded-2xl p-5 border border-gray-100 dark:border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-extrabold text-[#1A1A1A]">Sĩ số</span>
                                            <span className="text-sm font-extrabold" style={{ color: isFull ? '#F87171' : '#22C55E' }}>
                                                {data.currentStudents} / {data.maxStudents}
                                                {isFull && <span className="ml-2 text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Đầy</span>}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: isFull ? '#F87171' : '#4ADE80' }} />
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold mt-1.5">Còn {data.maxStudents - data.currentStudents} chỗ trống</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries({
                                            'Môn học': data.subjectName,
                                            'Giáo viên': data.teacherName || '—',
                                            'Học kỳ': data.semester,
                                            'Năm học': data.academicYear,
                                        }).map(([label, value], i) => (
                                            <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: `${accent}18`, color: accent }}>
                                                    {label === 'Giáo viên' ? <GraduationCap className="w-4 h-4" weight="fill" /> : <BookOpen className="w-4 h-4" weight="fill" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                                                    <p className={`text-sm font-extrabold ${label === 'Giáo viên' && !data.teacherName ? 'text-[#FF6B4A] italic' : 'text-[#1A1A1A] dark:text-slate-100'}`}>{value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-stretch gap-4">
                                        <div className="flex-1 flex items-start gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>
                                                <CalendarBlank className="w-4 h-4" weight="fill" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Ngày bắt đầu</p>
                                                <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">{formatDate(data.startDate)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-gray-300 dark:text-slate-600 font-extrabold text-lg select-none">→</div>
                                        <div className="flex-1 flex items-start gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>
                                                <CalendarBlank className="w-4 h-4" weight="fill" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Ngày kết thúc</p>
                                                <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">{formatDate(data.endDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {data.teacherName ? (
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0" style={{ backgroundColor: accent }}>
                                                {data.teacherName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Giáo viên phụ trách</p>
                                                <p className="text-base font-extrabold text-[#1A1A1A] dark:text-slate-100">{data.teacherName}</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold">Môn {data.subjectName}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-500/10 rounded-2xl p-4 border border-orange-200 dark:border-orange-300/40">
                                            <GraduationCap className="w-5 h-5 text-[#FF6B4A] dark:text-orange-300" weight="fill" />
                                            <p className="text-sm font-bold text-[#FF6B4A] dark:text-orange-200">Lớp chưa có giáo viên phụ trách</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {tab === 'students' && (
                                <div>
                                    {detail?.students && detail.students.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-400 dark:text-slate-400 mb-1">Nhấn vào học sinh để xem chi tiết</p>
                                            {detail.students.map(s => {
                                                const isSuspended = s.memberStatus === 'INACTIVE';
                                                const studentAvatar = normalizeAvatarUrl(s.avatarUrl);
                                                return (
                                                    <div
                                                        key={s.studentID}
                                                        onClick={() => setSelectedStudent(s)}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors group ${
                                                            isSuspended
                                                                ? 'border-orange-200 bg-orange-50 hover:border-orange-300 dark:border-orange-300/40 dark:bg-orange-500/10 dark:hover:border-orange-200'
                                                                : 'border-gray-100 bg-gray-50 hover:bg-[#FF6B4A]/5 hover:border-[#FF6B4A]/30 dark:border-white/10 dark:bg-slate-800/70 dark:hover:bg-[#FF6B4A]/12 dark:hover:border-[#FF6B4A]/50'
                                                        }`}
                                                    >
                                                        {studentAvatar ? (
                                                            <img
                                                                src={studentAvatar}
                                                                alt={s.fullName}
                                                                className="w-9 h-9 rounded-xl object-cover border border-black/10 dark:border-white/20 flex-shrink-0"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 ${isSuspended ? 'bg-orange-400' : 'bg-[#1A1A1A] dark:bg-slate-600'}`}>
                                                                {s.fullName?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className={`font-extrabold text-sm truncate transition-colors ${isSuspended ? 'text-orange-700 dark:text-orange-200' : 'text-[#1A1A1A] dark:text-slate-100 group-hover:text-[#FF6B4A]'}`}>
                                                                    {s.fullName}
                                                                </p>
                                                                {!isSuspended && (
                                                                    <span className="flex-shrink-0 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-full dark:text-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-300/40">
                                                                        Trong lớp
                                                                    </span>
                                                                )}
                                                                {isSuspended && (
                                                                    <span className="flex-shrink-0 text-[10px] font-extrabold text-orange-600 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded-full dark:text-orange-200 dark:bg-orange-500/20 dark:border-orange-300/40">
                                                                        Tạm ngưng
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ''}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${isSuspended ? 'text-orange-500 bg-orange-100 dark:text-orange-200 dark:bg-orange-500/20' : 'text-slate-600 bg-gray-200 dark:text-slate-200 dark:bg-slate-700'}`}>
                                                                {formatGenderVi(s.gender)}
                                                            </span>
                                                            <span className={`font-bold text-sm transition-colors ${isSuspended ? 'text-orange-400' : 'text-gray-300 group-hover:text-[#FF6B4A]'}`}></span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-slate-400">
                                            <Users className="w-10 h-10 mb-2 opacity-40" weight="fill" />
                                            <p className="font-bold text-sm">Chưa có học sinh nào</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-7 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-900/70 rounded-b-3xl">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onToggleStatus(detail ?? (cls as ClassroomDetail))}
                            disabled={loadingDetail}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 font-extrabold text-sm transition-colors disabled:opacity-40 ${
                                locked
                                    ? 'border-emerald-400 text-emerald-600 hover:bg-emerald-50'
                                    : 'border-red-200 text-red-500 hover:bg-red-50'
                            }`}
                        >
                            {locked
                                ? <><LockOpen className="w-4 h-4" weight="bold" /> Mở khóa</>
                                : <><Lock className="w-4 h-4" weight="bold" /> Khóa</>
                            }
                        </button>
                        <button
                            onClick={() => onEdit(detail ?? (cls as ClassroomDetail))}
                            disabled={loadingDetail}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-[#FF6B4A] text-[#FF6B4A] font-extrabold text-sm hover:bg-[#FF6B4A]/5 transition-colors disabled:opacity-40"
                        >
                            <PencilSimple className="w-4 h-4" weight="bold" /> Chỉnh sửa
                        </button>
                    </div>
                    <button onClick={onClose} className="px-6 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-slate-700 text-white font-extrabold text-sm hover:bg-[#333] dark:hover:bg-slate-600 transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>

        {/* Student Detail Modal — z-index above ClassDetailModal */}
        {selectedStudent && (
            <StudentDetailModal
                student={selectedStudent}
                classID={cls.classID}
                onClose={() => setSelectedStudent(null)}
                onRefresh={() => {
                    setSelectedStudent(null);
                    fetchDetail();
                }}
            />
        )}
        </>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(classDetailModalContent, document.body);
}

// ─── Edit Class Modal ─────────────────────────────────────────────────────────
function EditClassModal({ cls, onClose, onSuccess }: { cls: ClassroomDetail; onClose: () => void; onSuccess: () => void }) {
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [teachers, setTeachers] = useState<TeacherItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Teacher selection — supports deselect (null = no teacher)
    const [selectedTeacher, setSelectedTeacher] = useState<number | null>(cls.teacherID ?? null);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [form, setForm] = useState({
        name: cls.className,
        subjectID: cls.subjectID ? String(cls.subjectID) : '',
        maxStudents: String(cls.maxStudents),
        semester: cls.semester,
        academicYear: cls.academicYear,
        startDate: cls.startDate ? String(cls.startDate).substring(0, 10) : '',
        endDate: cls.endDate ? String(cls.endDate).substring(0, 10) : '',
        status: cls.status,
    });

    useEffect(() => {
        const token = authService.getToken();
        if (!token) return;
        api.get<ApiResponse<SubjectItem[]>>('/subjects', token)
            .then(r => setSubjects(r.result ?? []))
            .catch(() => {});
        api.get<ApiResponse<TeacherItem[]>>('/teachers', token)
            .then(r => setTeachers(r.result ?? []))
            .catch(() => {});
    }, []);

    const handle = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    // Click vào giáo viên đang chọn → bỏ chọn
    const handleToggleTeacher = (id: number) => {
        setSelectedTeacher(prev => prev === id ? null : id);
    };

    const filteredTeachers = teachers.filter(t =>
        t.fullName.toLowerCase().includes(teacherSearch.toLowerCase())
    );

    const submit = async () => {
        setError(null);
        if (!form.name.trim()) { setError('Vui lòng nhập tên lớp học.'); return; }
        if (!form.subjectID) { setError('Vui lòng chọn môn học.'); return; }
        const token = authService.getToken();
        if (!token) { setError('Bạn chưa đăng nhập.'); return; }
        setLoading(true);
        try {
            const payload: any = {
                className: form.name,
                subjectID: parseInt(form.subjectID),
                semester: form.semester,
                academicYear: form.academicYear,
                maxStudents: parseInt(form.maxStudents) || 40,
                status: form.status,
                // ⚠️ Phải đúng tên field BE: teacherID (không phải teacherId)
                teacherID: selectedTeacher ?? null,
            };
            if (form.startDate) payload.startDate = form.startDate;
            if (form.endDate) payload.endDate = form.endDate;
            await api.authPut<ApiResponse<ClassroomResponse>>(`/classrooms/${cls.classID}`, payload, token);
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'COMPLETED'];
    const selectedTeacherName = teachers.find(t => t.teacherID === selectedTeacher)?.fullName;

    const modalContent = (
        // Modal rộng hơn để chứa 2 cột
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] shadow-2xl w-full max-w-4xl animate-fadeIn" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b-2 border-[#1A1A1A]/10">
                    <h2 className="text-xl font-extrabold text-[#1A1A1A]">Chỉnh sửa lớp học</h2>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-[#1A1A1A]" weight="bold" />
                    </button>
                </div>

                {/* Body — 2 columns */}
                <div className="flex gap-0 overflow-hidden" style={{ maxHeight: 'calc(90vh - 140px)' }}>

                    {/* ── LEFT: form fields ── */}
                    <div className="flex-1 px-6 py-5 overflow-y-auto space-y-4 border-r border-gray-100">
                        {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200">{error}</div>}
                        <Field label="Tên lớp học *">
                            <input className={inputCls} value={form.name} onChange={e => handle('name', e.target.value)} />
                        </Field>
                        <Field label="Môn học *">
                            <select className={inputCls} value={form.subjectID} onChange={e => handle('subjectID', e.target.value)}>
                                <option value="">— Chọn môn học —</option>
                                {subjects.map(s => <option key={s.subjectID} value={s.subjectID}>{s.subjectName}</option>)}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Học kỳ *">
                                <select className={inputCls} value={form.semester} onChange={e => handle('semester', e.target.value)}>
                                    {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </Field>
                            <Field label="Năm học *">
                                <select className={inputCls} value={form.academicYear} onChange={e => handle('academicYear', e.target.value)}>
                                    {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Ngày bắt đầu">
                                <input type="date" className={inputCls} value={form.startDate} onChange={e => handle('startDate', e.target.value)} />
                            </Field>
                            <Field label="Ngày kết thúc">
                                <input type="date" className={inputCls} value={form.endDate} onChange={e => handle('endDate', e.target.value)} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Sĩ số tối đa *">
                                <input type="number" className={inputCls} min={1} max={100} value={form.maxStudents} onChange={e => handle('maxStudents', e.target.value)} />
                            </Field>
                            <Field label="Trạng thái">
                                <select className={inputCls} value={form.status} onChange={e => handle('status', e.target.value)}>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* ── RIGHT: teacher picker (always visible) ── */}
                    <div className="w-72 flex-shrink-0 px-5 py-5 flex flex-col gap-3 overflow-y-auto">
                        <p className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider">Giáo viên phụ trách</p>

                        {/* Selected indicator */}
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 transition-colors ${
                            selectedTeacher
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-gray-200 bg-gray-50'
                        }`}>
                            <GraduationCap className="w-4 h-4 flex-shrink-0 text-amber-500" weight="fill" />
                            <span className={`flex-1 text-xs font-extrabold truncate ${selectedTeacher ? 'text-amber-700' : 'text-gray-400'}`}>
                                {selectedTeacher ? selectedTeacherName : 'Chưa phân công'}
                            </span>
                            {selectedTeacher && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTeacher(null)}
                                    title="Bỏ chọn giáo viên"
                                    className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <X className="w-3 h-3 text-red-500" weight="bold" />
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        <input
                            className={inputCls}
                            placeholder="🔍 Tìm giáo viên..."
                            value={teacherSearch}
                            onChange={e => setTeacherSearch(e.target.value)}
                        />

                        {/* Teacher list — always visible */}
                        <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                            {filteredTeachers.map(t => (
                                <div
                                    key={t.teacherID}
                                    onClick={() => handleToggleTeacher(t.teacherID)}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border-2 cursor-pointer transition-colors select-none ${
                                        selectedTeacher === t.teacherID
                                            ? 'border-[#FF6B4A] bg-[#FF6B4A]/5'
                                            : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Custom radio */}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        selectedTeacher === t.teacherID ? 'border-[#FF6B4A] bg-[#FF6B4A]' : 'border-gray-300'
                                    }`}>
                                        {selectedTeacher === t.teacherID && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="w-7 h-7 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                                        {t.fullName.charAt(0)}
                                    </div>
                                    <span className="font-bold text-sm text-[#1A1A1A] flex-1 truncate">{t.fullName}</span>
                                    {cls.teacherID === t.teacherID && (
                                        <span className="text-[9px] font-extrabold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Hiện tại</span>
                                    )}
                                </div>
                            ))}
                            {filteredTeachers.length === 0 && (
                                <p className="text-xs text-center text-gray-400 py-4">Không tìm thấy giáo viên</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A] hover:bg-gray-100 transition-colors">Huỷ</button>
                    <button onClick={submit} disabled={loading} className="flex-1 py-3 rounded-2xl bg-[#FF6B4A] text-white font-extrabold text-sm hover:bg-[#ff5535] transition-colors disabled:opacity-50">
                        <PencilSimple className="inline w-4 h-4 mr-1" weight="bold" />{loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(modalContent, document.body);
}

// ─── Toggle Status Modal ──────────────────────────────────────────────────────
function ToggleStatusModal({ cls, onClose, onSuccess }: { cls: ClassroomDetail; onClose: () => void; onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLocked = cls.status === 'LOCKED' || cls.status === 'INACTIVE';

    const handleToggle = async () => {
        const token = authService.getToken();
        if (!token) { setError('Bạn chưa đăng nhập.'); return; }
        setLoading(true);
        setError(null);
        try {
            await api.authPut<ApiResponse<void>>(`/classrooms/${cls.classID}/status`, {}, token);
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <div className={`bg-white rounded-3xl border-2 shadow-2xl w-full max-w-md animate-fadeIn ${isLocked ? 'border-emerald-200' : 'border-orange-200'}`}>
                <div className="px-7 py-6 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isLocked ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                        {isLocked
                            ? <LockOpen className="w-8 h-8 text-emerald-500" weight="fill" />
                            : <Lock className="w-8 h-8 text-orange-500" weight="fill" />
                        }
                    </div>
                    <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">
                        {isLocked ? 'Mở khóa lớp học?' : 'Khóa lớp học?'}
                    </h2>
                    <p className="text-sm font-semibold text-gray-500 mb-1">
                        Bạn có chắc muốn {isLocked ? 'mở khóa' : 'khóa'} lớp{' '}
                        <span className="font-extrabold text-[#1A1A1A]">{cls.className}</span>?
                    </p>
                    <p className="text-xs font-semibold text-gray-400 mb-5">
                        {isLocked
                            ? 'Lớp học sẽ được kích hoạt trở lại và hoạt động bình thường.'
                            : 'Lớp học sẽ bị tạm ngưng và không thể hoạt động.'}
                    </p>
                    {error && <div className="text-sm font-bold text-red-600 bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200 w-full mb-4">{error}</div>}
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A] hover:bg-gray-50 transition-colors">Huỷ</button>
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`flex-1 py-3 rounded-2xl text-white font-extrabold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                                isLocked ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'
                            }`}
                        >
                            {isLocked
                                ? <><LockOpen className="w-4 h-4" weight="bold" />{loading ? 'Đang mở...' : 'Xác nhận mở khóa'}</>
                                : <><Lock className="w-4 h-4" weight="bold" />{loading ? 'Đang khóa...' : 'Xác nhận khóa'}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(modalContent, document.body);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ClassManage() {
    const [classes, setClasses] = useState<ClassroomResponse[]>([]);
    const [stats, setStats] = useState<ClassroomStatsResponse | null>(null);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<ModalType>(null);
    const [activeClass, setActiveClass] = useState<ClassroomResponse | null>(null);
    const [activeDetail, setActiveDetail] = useState<ClassroomDetail | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [pageLoading, setPageLoading] = useState(false);

    const PAGE_SIZE = 12;

    const fetchClasses = useCallback(async (page = 1) => {
        const token = authService.getToken();
        if (!token) return;
        setPageLoading(true);
        try {
            const res = await api.get<ApiResponse<PageResponse<ClassroomResponse>>>(
                `/classrooms?page=${page}&size=${PAGE_SIZE}`, token
            );
            const pageData = res.result;
            setClasses(pageData.data ?? []);
            setCurrentPage(pageData.currentPage);
            setTotalPages(pageData.totalPages);
            setTotalElements(pageData.totalElements);
        } catch (e) {
            console.error('Lỗi tải danh sách lớp:', e);
        } finally {
            setPageLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        const token = authService.getToken();
        if (!token) return;
        try {
            const res = await api.get<ApiResponse<ClassroomStatsResponse>>('/classrooms/stats', token);
            setStats(res.result);
        } catch (e) {
            console.error('Lỗi tải thống kê:', e);
        }
    }, []);

    useEffect(() => {
        fetchClasses(1);
        fetchStats();
    }, []);

    const refresh = () => {
        fetchClasses(currentPage);
        fetchStats();
    };

    const filtered = classes.filter(c =>
        c.className.toLowerCase().includes(search.toLowerCase()) ||
        c.subjectName.toLowerCase().includes(search.toLowerCase()) ||
        (c.teacherName ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const isLastPage = currentPage >= totalPages;

    const openAssign = (cls: ClassroomResponse) => { setActiveClass(cls); setModal('assignTeacher'); };
    const openAddStudent = (cls: ClassroomResponse) => { setActiveClass(cls); setModal('addStudent'); };
    const openDetail = (cls: ClassroomResponse) => { setActiveClass(cls); setModal('classDetail'); };
    const openEdit = (detail: ClassroomDetail) => { setActiveDetail(detail); setModal('editClass'); };
    const openToggleStatus = (detail: ClassroomDetail) => { setActiveDetail(detail); setModal('toggleStatus'); };

    const statsCards = [
        {
            label: 'Tổng số lớp',
            value: stats?.totalClasses ?? '—',
            lightBgClass: 'bg-[#FCE38A]',
            darkBgClass: 'dark:bg-[#3b3213]',
        },
        {
            label: 'Đang hoạt động',
            value: stats?.activeClasses ?? '—',
            lightBgClass: 'bg-[#95E1D3]',
            darkBgClass: 'dark:bg-[#123a35]',
        },
        {
            label: 'Chưa có giáo viên',
            value: stats?.unassignedClasses ?? '—',
            lightBgClass: 'bg-[#FFB5B5]',
            darkBgClass: 'dark:bg-[#4a2222]',
        },
        {
            label: 'Sĩ số trung bình',
            value: stats?.averageClassSize ?? '—',
            lightBgClass: 'bg-[#B8B5FF]',
            darkBgClass: 'dark:bg-[#2c2b53]',
        },
    ];

    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-slate-100">Quản lý Lớp học</h1>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
                        <input
                            placeholder="Tìm kiếm lớp học..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#0f172a] border-2 border-[#1A1A1A]/20 dark:border-white/15 rounded-2xl text-sm font-semibold text-[#1A1A1A] dark:text-slate-100 focus:outline-none focus:border-[#FF6B4A] transition-colors w-56"
                        />
                    </div>
                    <button
                        onClick={() => setModal('createClass')}
                        className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] px-4 py-2.5 rounded-2xl font-extrabold text-sm text-white transition-colors"
                    >
                        <Plus className="w-4 h-4" weight="bold" /> Tạo lớp mới
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statsCards.map((s, i) => (
                    <div key={i} className={`rounded-3xl p-5 border-2 border-[#1A1A1A] dark:border-white/15 ${s.lightBgClass} ${s.darkBgClass}`}>
                        <p className="text-xs font-extrabold text-[#1A1A1A]/60 dark:text-slate-300 uppercase tracking-wider mb-2">{s.label}</p>
                        <h3 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-white">{s.value}</h3>
                    </div>
                ))}
            </div>

            {/* Loading */}
            {pageLoading && (
                <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-4 border-[#FF6B4A] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Class cards */}
            {!pageLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map((cls) => {
                        const accent = getAccent(cls.subjectName);
                        const isFull = cls.currentStudents >= cls.maxStudents;
                        const pct = Math.min((cls.currentStudents / cls.maxStudents) * 100, 100);
                        const noTeacher = !cls.teacherName;
                        const isLocked = cls.status === 'INACTIVE' || cls.status === 'LOCKED';
                        const statusLabel = isLocked ? 'Đã khóa'
                            : cls.status === 'ACTIVE' ? 'Đang diễn ra'
                            : cls.status === 'FULL' ? 'Đủ sĩ số'
                            : cls.status;
                        const statusColor = isLocked ? 'text-gray-500'
                            : noTeacher ? 'text-[#FF6B4A]'
                            : isFull ? 'text-red-500'
                            : 'text-emerald-600';

                        return (
                            <div key={cls.classID} className={`rounded-3xl border-2 overflow-hidden flex flex-col shadow-sm transition-shadow relative ${isLocked ? 'border-gray-300 bg-gray-50 dark:border-white/20 dark:bg-slate-800/70' : 'border-[#1A1A1A]/15 bg-white hover:shadow-md dark:border-white/15 dark:bg-[#111827]'}`}>
                                {/* Locked overlay banner */}
                                {isLocked && (
                                    <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
                                        <span className="flex items-center gap-1 bg-gray-700/80 text-white text-[11px] font-extrabold px-3 py-1 rounded-full backdrop-blur-sm">
                                            <Lock className="w-3 h-3" weight="fill" /> Đã khóa
                                        </span>
                                    </div>
                                )}
                                <div className={`p-5 flex-1 flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-base" style={{ backgroundColor: accent }}>
                                            {cls.subjectName?.charAt(0)}
                                        </div>
                                        <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 text-[10px] px-2 py-1 rounded-xl font-extrabold border border-gray-200 dark:border-white/15">
                                            #{cls.classID}
                                        </span>
                                    </div>

                                    <h3 className="font-extrabold text-lg text-[#1A1A1A] dark:text-slate-100 mb-0.5 leading-snug">{cls.className}</h3>
                                    <p className="text-sm font-bold text-[#1A1A1A]/50 dark:text-slate-400 mb-3">Môn học: {cls.subjectName}</p>

                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700/90 text-gray-600 dark:text-slate-100 text-[11px] font-extrabold px-2 py-0.5 rounded-lg border border-transparent dark:border-white/15">
                                            {cls.semester}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700/90 text-gray-600 dark:text-slate-100 text-[11px] font-extrabold px-2 py-0.5 rounded-lg border border-transparent dark:border-white/15">
                                            {cls.academicYear}
                                        </span>
                                    </div>

                                    {(cls.startDate || cls.endDate) && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1A1A1A]/50 dark:text-slate-400 mb-3">
                                            <CalendarBlank className="w-3.5 h-3.5 flex-shrink-0 text-[#1A1A1A]/60 dark:text-[#ffb199]" weight="fill" />
                                            <span>{cls.startDate ? cls.startDate.substring(0, 10) : '—'} → {cls.endDate ? cls.endDate.substring(0, 10) : '—'}</span>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <GraduationCap className={`w-4 h-4 ${noTeacher ? 'text-[#FF6B4A]' : 'text-gray-400 dark:text-slate-400'}`} weight="fill" />
                                            <span className={`font-bold ${noTeacher ? 'text-[#FF6B4A] italic dark:text-[#ff9f82]' : 'text-[#1A1A1A]/70 dark:text-slate-300'}`}>
                                                {cls.teacherName || 'Chưa có giáo viên'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="w-4 h-4 text-gray-400 dark:text-slate-400" weight="fill" />
                                            <span className="font-bold text-[#1A1A1A]/70 dark:text-slate-300">
                                                {cls.currentStudents} / {cls.maxStudents} học sinh
                                            </span>
                                            {isFull && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-lg font-extrabold">Đầy</span>}
                                        </div>
                                    </div>

                                    <div className="h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 border border-gray-200 dark:border-white/15">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: isFull ? '#F87171' : '#4ADE80' }}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => !isLocked && openAssign(cls)}
                                            disabled={isLocked}
                                            className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold border-2 transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={isLocked
                                                ? { borderColor: '#ccc', color: '#999', backgroundColor: 'transparent' }
                                                : cls.teacherName
                                                    ? { borderColor: accent, color: accent, backgroundColor: 'transparent' }
                                                    : { borderColor: '#FF6B4A', backgroundColor: '#FF6B4A', color: 'white' }
                                            }
                                        >
                                            {cls.teacherName
                                                ? <><UserSwitch className="w-3.5 h-3.5" weight="bold" />Đổi GV</>
                                                : <><UserPlus className="w-3.5 h-3.5" weight="bold" />Gán GV</>
                                            }
                                        </button>
                                        <button
                                            onClick={() => !isLocked && openAddStudent(cls)}
                                            disabled={isLocked}
                                            className="flex-1 py-2.5 rounded-2xl text-xs font-extrabold bg-[#1A1A1A] dark:bg-slate-700 text-white border-2 border-[#1A1A1A] dark:border-slate-700 hover:bg-[#333] dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" weight="bold" /> Thêm HS
                                        </button>
                                    </div>
                                </div>

                                <div className={`border-t px-5 py-3 flex justify-between items-center ${isLocked ? 'bg-gray-100 border-gray-200 dark:bg-slate-900/80 dark:border-white/15' : 'bg-gray-50 border-gray-100 dark:bg-slate-900/60 dark:border-white/10'}`}>
                                    <span className={`text-xs font-extrabold flex items-center gap-1 ${statusColor}`}>
                                        {isLocked && <Lock className="w-3 h-3" weight="fill" />}
                                        {statusLabel}
                                    </span>
                                    <button onClick={() => openDetail(cls)} className="text-xs font-extrabold text-[#1A1A1A] dark:text-slate-100 hover:text-[#FF6B4A] transition-colors">
                                        Chi tiết →
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add new card (only appears on last page) */}
                    {isLastPage && (
                        <div
                            onClick={() => setModal('createClass')}
                            className="rounded-3xl border-2 border-dashed border-[#1A1A1A]/20 dark:border-white/25 bg-white dark:bg-[#111827] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-[#FF6B4A] hover:bg-[#FF6B4A]/5 dark:hover:bg-[#FF6B4A]/10 transition-colors min-h-[300px] group"
                        >
                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 border-2 border-gray-200 dark:border-white/15 group-hover:bg-[#FF6B4A]/10 group-hover:border-[#FF6B4A]/30 flex items-center justify-center text-gray-400 dark:text-slate-300 group-hover:text-[#FF6B4A] mb-4 transition-colors">
                                <Plus className="w-7 h-7" weight="bold" />
                            </div>
                            <h3 className="font-extrabold text-[#1A1A1A] dark:text-slate-100 mb-2 group-hover:text-[#FF6B4A] transition-colors">Thêm lớp học mới</h3>
                            <p className="text-sm text-[#1A1A1A]/40 dark:text-slate-400 font-semibold max-w-[180px]">Tạo lớp mới cho học kỳ tới</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {!pageLoading && totalPages > 1 && (
                <div className="flex justify-between items-center text-sm font-bold text-gray-400 dark:text-slate-400 pt-2">
                    <span>Hiển thị {classes.length} trên {totalElements} lớp học</span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => fetchClasses(currentPage - 1)}
                            className="w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 dark:border-white/15 bg-white dark:bg-[#0f172a] text-[#1A1A1A] dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
                        >&lt;</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => fetchClasses(p)}
                                className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 ${p === currentPage ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' : 'border-[#1A1A1A]/20 dark:border-white/15 bg-white dark:bg-[#0f172a] text-[#1A1A1A] dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >{p}</button>
                        ))}
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => fetchClasses(currentPage + 1)}
                            className="w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 dark:border-white/15 bg-white dark:bg-[#0f172a] text-[#1A1A1A] dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
                        >&gt;</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {modal === 'classDetail' && activeClass && (
                <ClassDetailModal
                    cls={activeClass}
                    onClose={() => setModal(null)}
                    onEdit={openEdit}
                    onToggleStatus={openToggleStatus}
                />
            )}
            {modal === 'editClass' && activeDetail && (
                <EditClassModal cls={activeDetail} onClose={() => setModal(null)} onSuccess={refresh} />
            )}
            {modal === 'toggleStatus' && activeDetail && (
                <ToggleStatusModal cls={activeDetail} onClose={() => setModal(null)} onSuccess={refresh} />
            )}
            {modal === 'createClass' && (
                <CreateClassModal onClose={() => setModal(null)} onSuccess={refresh} />
            )}
            {modal === 'assignTeacher' && activeClass && (
                <AssignTeacherModal cls={activeClass} onClose={() => setModal(null)} onSuccess={refresh} />
            )}
            {modal === 'addStudent' && activeClass && (
                <AddStudentModal cls={activeClass} onClose={() => setModal(null)} onSuccess={refresh} />
            )}
        </div>
    );
}
