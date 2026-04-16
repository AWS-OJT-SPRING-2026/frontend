import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, UserPlus, PencilSimple, Trash, X, ChalkboardTeacher, Student, Eye, EyeSlash, Lock, LockOpen } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

/* ─── API Types ──────────────────────────────────────────────────────────── */
interface RoleResponse {
    roleID: number;
    roleName: string;
    description: string;
}

interface UserResponse {
    userID: number;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    avatarUrl?: string;
    createdAt: string;
    classes: string[] | null;
    role: RoleResponse;
}

type UserRoleCluster = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'OTHER';

interface UserMutationSuccessMeta {
    roleCluster: UserRoleCluster;
    userId?: number;
    username?: string;
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

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface TeacherForm {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    specialization: string;
    dateOfBirth: string;
    address: string;
    isHomeroomTeacher: boolean;
    status: string;
}

interface StudentForm {
    // Thông tin tài khoản
    username: string;
    password: string;
    email: string;
    phone: string;
    // Thông tin cá nhân
    fullName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    // Thông tin phụ huynh
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    parentRelationship: string;
}

const EMPTY_TEACHER: TeacherForm = {
    username: '', password: '', fullName: '', email: '',
    phone: '', gender: '', specialization: '', dateOfBirth: '', address: '', isHomeroomTeacher: false, status: 'ACTIVE',
};
const EMPTY_STUDENT: StudentForm = {
    username: '', password: '', email: '', phone: '',
    fullName: '', dateOfBirth: '', gender: '', address: '',
    parentName: '', parentPhone: '', parentEmail: '', parentRelationship: '',
};

/* ─── Input helper ───────────────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold text-[#1A1A1A]/60 uppercase tracking-wider dark:text-[#94a3b8]">
                {label}{required && <span className="text-[#FF6B4A] ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 bg-white border-2 border-[#1A1A1A]/20 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FF6B4A] transition-colors placeholder:text-gray-300 dark:bg-[#111827] dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-[#f08a5d] dark:[color-scheme:dark] dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:opacity-85";

function BodyPortal({ children }: { children: React.ReactNode }) {
    if (typeof document === 'undefined') {
        return null;
    }
    return createPortal(children, document.body);
}

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function getAvatarValidationError(file: File): string | null {
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        return 'Chỉ chấp nhận ảnh PNG, JPG, WEBP hoặc GIF.';
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
        return 'Ảnh đại diện tối đa 5MB.';
    }
    return null;
}

function buildStudentFormData(payload: Record<string, unknown>, avatar?: File | null): FormData {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (avatar) {
        formData.append('avatar', avatar);
    }
    return formData;
}

function buildTeacherFormData(payload: Record<string, unknown>, avatar?: File | null): FormData {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (avatar) {
        formData.append('avatar', avatar);
    }
    return formData;
}

function AvatarPreview({
    avatarUrl,
    fallbackName,
    userId,
    sizeClass = 'w-16 h-16',
    textClass = 'text-xl',
}: {
    avatarUrl?: string | null;
    fallbackName: string;
    userId: number;
    sizeClass?: string;
    textClass?: string;
}) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={fallbackName || 'Avatar'}
                className={`${sizeClass} rounded-full border-2 border-[#1A1A1A] object-cover dark:border-white/15`}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} rounded-full border-2 border-[#1A1A1A] flex items-center justify-center font-extrabold text-[#1A1A1A] dark:border-white/15 dark:text-slate-100 ${textClass}`}
            style={{ backgroundColor: getAvatarColor(userId) }}
        >
            {getInitials(fallbackName)}
        </div>
    );
}

function AvatarZoomModal({
    avatarUrl,
    onClose,
    title,
}: {
    avatarUrl: string;
    onClose: () => void;
    title?: string;
}) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 dark:bg-black/80" onClick={onClose}>
            <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white border-2 border-[#1A1A1A] flex items-center justify-center shadow-xl dark:bg-[#111827] dark:border-white/10"
                >
                    <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                </button>
                <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-3 shadow-2xl dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
                    {title && <p className="px-2 pb-2 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider dark:text-[#94a3b8]">{title}</p>}
                    <img src={avatarUrl} alt={title || 'Avatar'} className="w-full max-h-[75vh] object-contain rounded-2xl bg-[#F7F7F2] dark:bg-[#111827]" />
                </div>
            </div>
        </div>
    );
}

/* ─── Add User Modal ─────────────────────────────────────────────────────── */
function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (meta?: UserMutationSuccessMeta) => void | Promise<void> }) {
    const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
    const [teacherForm, setTeacherForm] = useState<TeacherForm>(EMPTY_TEACHER);
    const [studentForm, setStudentForm] = useState<StudentForm>(EMPTY_STUDENT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showTeacherPassword, setShowTeacherPassword] = useState(false);
    const [showStudentPassword, setShowStudentPassword] = useState(false);
    const [teacherAvatarFile, setTeacherAvatarFile] = useState<File | null>(null);
    const [teacherAvatarPreviewUrl, setTeacherAvatarPreviewUrl] = useState<string | null>(null);
    const [teacherAvatarError, setTeacherAvatarError] = useState<string | null>(null);
    const addTeacherAvatarInputRef = useRef<HTMLInputElement | null>(null);
    const [studentAvatarFile, setStudentAvatarFile] = useState<File | null>(null);
    const [studentAvatarPreviewUrl, setStudentAvatarPreviewUrl] = useState<string | null>(null);
    const [studentAvatarError, setStudentAvatarError] = useState<string | null>(null);
    const addStudentAvatarInputRef = useRef<HTMLInputElement | null>(null);

    function updateTeacher(field: keyof TeacherForm, value: string | boolean) {
        setTeacherForm(prev => ({ ...prev, [field]: value }));
    }
    function updateStudent(field: keyof StudentForm, value: string) {
        setStudentForm(prev => ({ ...prev, [field]: value }));
    }

    function handleTeacherAvatarChange(file?: File) {
        setTeacherAvatarError(null);
        if (!file) {
            setTeacherAvatarFile(null);
            setTeacherAvatarPreviewUrl(null);
            return;
        }

        const validationError = getAvatarValidationError(file);
        if (validationError) {
            setTeacherAvatarError(validationError);
            return;
        }

        setTeacherAvatarFile(file);
        setTeacherAvatarPreviewUrl(URL.createObjectURL(file));
    }

    function openAddTeacherAvatarPicker() {
        addTeacherAvatarInputRef.current?.click();
    }

    function handleStudentAvatarChange(file?: File) {
        setStudentAvatarError(null);
        if (!file) {
            setStudentAvatarFile(null);
            setStudentAvatarPreviewUrl(null);
            return;
        }

        const validationError = getAvatarValidationError(file);
        if (validationError) {
            setStudentAvatarError(validationError);
            return;
        }

        setStudentAvatarFile(file);
        setStudentAvatarPreviewUrl(URL.createObjectURL(file));
    }

    function openAddStudentAvatarPicker() {
        addStudentAvatarInputRef.current?.click();
    }

    useEffect(() => {
        return () => {
            if (teacherAvatarPreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(teacherAvatarPreviewUrl);
            }
        };
    }, [teacherAvatarPreviewUrl]);

    useEffect(() => {
        return () => {
            if (studentAvatarPreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(studentAvatarPreviewUrl);
            }
        };
    }, [studentAvatarPreviewUrl]);

    async function handleSubmit() {
        setError(null);
        setSuccess(null);
        const token = authService.getToken();
        if (!token) { setError('Bạn chưa đăng nhập.'); return; }

        setLoading(true);
        try {
            let successMeta: UserMutationSuccessMeta | undefined;
            if (tab === 'teacher') {
                const payload: any = { ...teacherForm };
                if (!payload.dateOfBirth) delete payload.dateOfBirth;
                if (!payload.gender) delete payload.gender;
                if (!payload.address) delete payload.address;
                const formData = buildTeacherFormData(payload, teacherAvatarFile);
                await api.authPostForm('/users/teachers', formData, token);
                successMeta = {
                    roleCluster: 'TEACHER',
                    username: teacherForm.username.trim(),
                };
                setSuccess('Tạo giáo viên thành công!');
            } else {
                // Build student payload — omit empty optional fields
                const payload: any = {
                    username: studentForm.username,
                    password: studentForm.password,
                    fullName: studentForm.fullName,
                    email: studentForm.email,
                };
                if (studentForm.phone) payload.phone = studentForm.phone;
                if (studentForm.dateOfBirth) payload.dateOfBirth = studentForm.dateOfBirth;
                if (studentForm.gender) payload.gender = studentForm.gender;
                if (studentForm.address) payload.address = studentForm.address;
                if (studentForm.parentName) payload.parentName = studentForm.parentName;
                if (studentForm.parentPhone) payload.parentPhone = studentForm.parentPhone;
                if (studentForm.parentEmail) payload.parentEmail = studentForm.parentEmail;
                if (studentForm.parentRelationship) payload.parentRelationship = studentForm.parentRelationship;
                const formData = buildStudentFormData(payload, studentAvatarFile);
                await api.authPostForm('/users/students', formData, token);
                successMeta = {
                    roleCluster: 'STUDENT',
                    username: studentForm.username.trim(),
                };
                setSuccess('Tạo học sinh thành công!');
            }
            setTimeout(async () => {
                await onSuccess(successMeta);
                onClose();
            }, 1200);
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }

    const modalContent = (
        /* Backdrop */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/75" onClick={onClose}>
            {/* Modal — wider when student tab */}
                <div
                    className={`bg-[#FAF9F6] w-full rounded-3xl border-2 border-[#1A1A1A] shadow-2xl overflow-hidden transition-all dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)] ${tab === 'student' ? 'max-w-5xl' : 'max-w-5xl'}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-0.5 dark:text-[#94a3b8]">Quản lý người dùng</p>
                        <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-slate-50">Thêm người dùng mới</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors dark:bg-white/5 dark:hover:bg-white/10">
                        <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-6 pt-4">
                    {([
                        { key: 'teacher', label: 'Giáo viên', icon: <ChalkboardTeacher className="w-4 h-4" weight="fill" /> },
                        { key: 'student', label: 'Học sinh', icon: <Student className="w-4 h-4" weight="fill" /> },
                    ] as const).map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setError(null); setSuccess(null); }}
                            className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-extrabold text-sm transition-all border-2
                                ${tab === t.key
                                    ? 'bg-[#FF6B4A] text-white border-[#FF6B4A] shadow dark:bg-[#d97757] dark:border-[#d97757]'
                                    : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/20 hover:border-[#FF6B4A]/50 dark:bg-[#111827] dark:text-slate-300 dark:border-white/10 dark:hover:border-[#d97757]/60'}`}
                        >
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>

                {/* Form body */}
                <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {tab === 'teacher' ? (
                        <>
                            <input
                                ref={addTeacherAvatarInputRef}
                                type="file"
                                accept={AVATAR_ACCEPT}
                                className="hidden"
                                onChange={(e) => handleTeacherAvatarChange(e.target.files?.[0])}
                            />

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white lg:col-span-3 dark:bg-[#161b22] dark:border-white/10">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#B8B5FF]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#7f87d7]">
                                        <span className="w-5 h-5 rounded-lg bg-[#B8B5FF] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#7f87d7] dark:text-slate-50">1</span>
                                        <p className="text-xs font-extrabold text-[#6C63FF] uppercase tracking-wider dark:text-[#aab4ff]">Thông tin cá nhân</p>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <button
                                            type="button"
                                            onClick={openAddTeacherAvatarPicker}
                                            className="w-full rounded-2xl border-2 border-dashed border-[#1A1A1A]/15 bg-[#F7F7F2] p-4 hover:border-[#FF6B4A]/40 transition-colors dark:bg-[#111827] dark:border-white/10 dark:hover:border-[#d97757]/60"
                                        >
                                            <div className="flex flex-col items-center text-center gap-2">
                                                <AvatarPreview
                                                    avatarUrl={teacherAvatarPreviewUrl}
                                                    fallbackName={teacherForm.fullName || teacherForm.username || 'Giáo viên'}
                                                    userId={0}
                                                    sizeClass="w-24 h-24"
                                                    textClass="text-3xl"
                                                />
                                                <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">{teacherAvatarFile ? 'Nhấn để đổi avatar' : 'Nhấn để thêm avatar'}</p>
                                                <p className="text-[11px] font-bold text-[#1A1A1A]/50 dark:text-[#94a3b8]">PNG/JPG/WEBP/GIF, tối đa 5MB</p>
                                            </div>
                                        </button>
                                        {teacherAvatarError && <p className="text-xs font-extrabold text-[#c0392b]">{teacherAvatarError}</p>}

                                        <Field label="Họ và tên" required>
                                            <input className={inputCls} placeholder="Nguyễn Văn A" value={teacherForm.fullName} onChange={e => updateTeacher('fullName', e.target.value)} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Giới tính">
                                                <select className={inputCls} value={teacherForm.gender} onChange={e => updateTeacher('gender', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </Field>
                                            <Field label="Ngày sinh">
                                                <input type="date" className={inputCls} value={teacherForm.dateOfBirth} onChange={e => updateTeacher('dateOfBirth', e.target.value)} />
                                            </Field>
                                        </div>
                                        <Field label="Địa chỉ">
                                            <input className={inputCls} placeholder="123 Đường ABC, Quận 1, TP.HCM" value={teacherForm.address} onChange={e => updateTeacher('address', e.target.value)} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white lg:col-span-2 dark:bg-[#161b22] dark:border-white/10">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B4A]/8 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#d97757]">
                                        <span className="w-5 h-5 rounded-lg bg-[#FF6B4A] flex items-center justify-center text-white text-xs font-extrabold dark:bg-[#d97757]">2</span>
                                        <p className="text-xs font-extrabold text-[#FF6B4A] uppercase tracking-wider dark:text-[#f0b09b]">Thông tin tài khoản</p>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <Field label="Tên đăng nhập" required>
                                            <input className={inputCls} placeholder="vd: gv.nguyenvan" value={teacherForm.username} onChange={e => updateTeacher('username', e.target.value)} />
                                        </Field>
                                        <Field label="Mật khẩu" required>
                                            <div className="relative">
                                                <input type={showTeacherPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="Tối thiểu 6 ký tự" value={teacherForm.password} onChange={e => updateTeacher('password', e.target.value)} />
                                                <button type="button" onClick={() => setShowTeacherPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B4A] transition-colors dark:text-slate-300 dark:hover:text-[#f0b09b]">
                                                    {showTeacherPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Email">
                                                <input type="email" className={inputCls} placeholder="giaovien@school.edu.vn" value={teacherForm.email} onChange={e => updateTeacher('email', e.target.value)} />
                                            </Field>
                                            <Field label="Số điện thoại">
                                                <input className={inputCls} placeholder="0912345678" value={teacherForm.phone} onChange={e => updateTeacher('phone', e.target.value)} />
                                            </Field>
                                        </div>
                                        <Field label="Trạng thái">
                                            <select className={inputCls} value={teacherForm.status} onChange={e => updateTeacher('status', e.target.value)}>
                                                <option value="ACTIVE">Hoạt động</option>
                                                <option value="LOCKED">Khóa</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white dark:bg-[#161b22] dark:border-white/10">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#95E1D3]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#6ba79c]">
                                    <span className="w-5 h-5 rounded-lg bg-[#95E1D3] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#6ba79c] dark:text-slate-50">3</span>
                                    <p className="text-xs font-extrabold text-[#1A7A6E] uppercase tracking-wider dark:text-[#93c7bf]">Thông tin giảng dạy</p>
                                </div>
                                <div className="p-4 space-y-3">
                                    <Field label="Chuyên môn">
                                        <input className={inputCls} placeholder="Toán học" value={teacherForm.specialization} onChange={e => updateTeacher('specialization', e.target.value)} />
                                    </Field>
                                    <div className="flex items-center gap-3 bg-[#FAF9F6] border-2 border-[#1A1A1A]/10 rounded-2xl px-4 py-3 dark:bg-[#111827] dark:border-white/10">
                                        <input
                                            id="homeroom"
                                            type="checkbox"
                                            className="w-4 h-4 accent-[#FF6B4A]"
                                            checked={teacherForm.isHomeroomTeacher}
                                            onChange={e => updateTeacher('isHomeroomTeacher', e.target.checked)}
                                        />
                                        <label htmlFor="homeroom" className="text-sm font-bold text-[#1A1A1A] cursor-pointer select-none dark:text-slate-100">
                                            Là giáo viên chủ nhiệm
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white lg:col-span-3 dark:bg-[#161b22] dark:border-white/10">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#B8B5FF]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#7f87d7]">
                                        <span className="w-5 h-5 rounded-lg bg-[#B8B5FF] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#7f87d7] dark:text-slate-50">1</span>
                                        <p className="text-xs font-extrabold text-[#6C63FF] uppercase tracking-wider dark:text-[#aab4ff]">Thông tin cá nhân</p>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <input
                                            ref={addStudentAvatarInputRef}
                                            type="file"
                                            accept={AVATAR_ACCEPT}
                                            className="hidden"
                                            onChange={(e) => handleStudentAvatarChange(e.target.files?.[0])}
                                        />
                                        <button
                                            type="button"
                                            onClick={openAddStudentAvatarPicker}
                                            className="w-full rounded-2xl border-2 border-dashed border-[#1A1A1A]/15 bg-[#F7F7F2] p-4 hover:border-[#FF6B4A]/40 transition-colors dark:bg-[#111827] dark:border-white/10 dark:hover:border-[#d97757]/60"
                                        >
                                            <div className="flex flex-col items-center text-center gap-2">
                                                <AvatarPreview
                                                    avatarUrl={studentAvatarPreviewUrl}
                                                    fallbackName={studentForm.fullName || studentForm.username || 'Học sinh'}
                                                    userId={0}
                                                    sizeClass="w-24 h-24"
                                                    textClass="text-3xl"
                                                />
                                                <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">{studentAvatarFile ? 'Nhấn để đổi avatar' : 'Nhấn để thêm avatar'}</p>
                                                <p className="text-[11px] font-bold text-[#1A1A1A]/50 dark:text-[#94a3b8]">PNG/JPG/WEBP/GIF, tối đa 5MB</p>
                                            </div>
                                        </button>
                                        {studentAvatarError && <p className="text-xs font-extrabold text-[#c0392b]">{studentAvatarError}</p>}
                                        <Field label="Họ và tên" required>
                                            <input className={inputCls} placeholder="Trần Văn B" value={studentForm.fullName} onChange={e => updateStudent('fullName', e.target.value)} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Ngày sinh">
                                                <input type="date" className={inputCls} value={studentForm.dateOfBirth} onChange={e => updateStudent('dateOfBirth', e.target.value)} />
                                            </Field>
                                            <Field label="Giới tính">
                                                <select className={inputCls} value={studentForm.gender} onChange={e => updateStudent('gender', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </Field>
                                        </div>
                                        <Field label="Địa chỉ">
                                            <input className={inputCls} placeholder="123 Đường ABC, Quận 1, TP.HCM" value={studentForm.address} onChange={e => updateStudent('address', e.target.value)} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-4 lg:col-span-2">
                                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white dark:bg-[#161b22] dark:border-white/10">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B4A]/8 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#d97757]">
                                            <span className="w-5 h-5 rounded-lg bg-[#FF6B4A] flex items-center justify-center text-white text-xs font-extrabold dark:bg-[#d97757]">2</span>
                                            <p className="text-xs font-extrabold text-[#FF6B4A] uppercase tracking-wider dark:text-[#f0b09b]">Thông tin tài khoản</p>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <Field label="Tên đăng nhập" required>
                                                <input className={inputCls} placeholder="vd: hs.tranvan" value={studentForm.username} onChange={e => updateStudent('username', e.target.value)} />
                                            </Field>
                                            <Field label="Mật khẩu" required>
                                                <div className="relative">
                                                    <input type={showStudentPassword ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="Tối thiểu 6 ký tự, có chữ + số" value={studentForm.password} onChange={e => updateStudent('password', e.target.value)} />
                                                    <button type="button" onClick={() => setShowStudentPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B4A] transition-colors dark:text-slate-300 dark:hover:text-[#f0b09b]">
                                                        {showStudentPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Email" required>
                                                    <input type="email" className={inputCls} placeholder="hocsinh@student.edu.vn" value={studentForm.email} onChange={e => updateStudent('email', e.target.value)} />
                                                </Field>
                                                <Field label="Số điện thoại">
                                                    <input className={inputCls} placeholder="0912345678" value={studentForm.phone} onChange={e => updateStudent('phone', e.target.value)} />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white dark:bg-[#161b22] dark:border-white/10">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#95E1D3]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#6ba79c]">
                                            <span className="w-5 h-5 rounded-lg bg-[#95E1D3] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#6ba79c] dark:text-slate-50">3</span>
                                            <p className="text-xs font-extrabold text-[#1A7A6E] uppercase tracking-wider dark:text-[#93c7bf]">Thông tin phụ huynh</p>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <Field label="Họ tên phụ huynh">
                                                <input className={inputCls} placeholder="Nguyễn Văn C" value={studentForm.parentName} onChange={e => updateStudent('parentName', e.target.value)} />
                                            </Field>
                                            <Field label="Quan hệ">
                                                <select className={inputCls} value={studentForm.parentRelationship} onChange={e => updateStudent('parentRelationship', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    <option value="Father">Cha</option>
                                                    <option value="Mother">Mẹ</option>
                                                    <option value="Grandfather">Ông</option>
                                                    <option value="Grandmother">Bà</option>
                                                    <option value="Sibling">Anh / Chị</option>
                                                    <option value="Guardian">Người giám hộ</option>
                                                </select>
                                            </Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="SĐT phụ huynh">
                                                    <input className={inputCls} placeholder="0987654321" value={studentForm.parentPhone} onChange={e => updateStudent('parentPhone', e.target.value)} />
                                                </Field>
                                                <Field label="Email phụ huynh">
                                                    <input type="email" className={inputCls} placeholder="phuhuynh@email.com" value={studentForm.parentEmail} onChange={e => updateStudent('parentEmail', e.target.value)} />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Feedback */}
                    {error && (
                        <div className="bg-[#FFB5B5]/40 border-2 border-[#FF6B4A]/40 text-[#c0392b] text-sm font-bold px-4 py-2.5 rounded-2xl">
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-[#95E1D3]/40 border-2 border-[#95E1D3] text-[#1A7A6E] text-sm font-bold px-4 py-2.5 rounded-2xl">
                            ✅ {success}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 pb-6 pt-3 border-t-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors dark:bg-[#111827] dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#1f2937]"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B4A] hover:bg-[#ff5535] font-extrabold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:bg-[#d97757] dark:hover:bg-[#c86c4f]"
                    >
                        {loading ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                            </svg>
                        ) : <UserPlus className="w-4 h-4" weight="fill" />}
                        {loading ? 'Đang tạo...' : `Tạo ${tab === 'teacher' ? 'giáo viên' : 'học sinh'}`}
                    </button>
                </div>
            </div>

        </div>
    );

    return <BodyPortal>{modalContent}</BodyPortal>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ['#e6d78c', '#a8a5de', '#dca6a6', '#8bc6ba', '#9bcbbd', '#d9bca6', '#b4a2d8', '#9fc8ba'];

function getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function normalizeRoleCluster(roleName?: string): UserRoleCluster {
    const normalizedRole = roleName?.toUpperCase() ?? '';
    if (normalizedRole.includes('ADMIN')) return 'ADMIN';
    if (normalizedRole.includes('TEACHER')) return 'TEACHER';
    if (normalizedRole.includes('STUDENT') || normalizedRole.includes('USER')) return 'STUDENT';
    return 'OTHER';
}

function getRoleClusterOrder(cluster: UserRoleCluster): number {
    if (cluster === 'ADMIN') return 0;
    if (cluster === 'TEACHER') return 1;
    if (cluster === 'STUDENT') return 2;
    return 3;
}

function parseTimestamp(dateTime?: string | null): number {
    if (!dateTime) return 0;
    const parsed = new Date(dateTime).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getRoleLabel(roleName: string): string {
    if (!roleName) return '';
    const r = roleName.toUpperCase();
    if (r.includes('TEACHER')) return 'Giáo viên';
    if (r.includes('STUDENT')) return 'Học sinh';
    if (r.includes('ADMIN')) return 'Admin';
    return roleName;
}

function getRoleBg(roleName: string): string {
    const r = roleName?.toUpperCase() ?? '';
    if (r.includes('TEACHER')) return '#9f9ac7';
    if (r.includes('STUDENT')) return '#c6b681';
    return '#7d8798';
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    } catch {
        return dateStr;
    }
}

function getUserCode(user: UserResponse): string {
    const r = user.role?.roleName?.toUpperCase() ?? '';
    const prefix = r.includes('TEACHER') ? 'GV' : r.includes('STUDENT') ? 'HS' : 'ND';
    return `${prefix}-${String(user.userID).padStart(4, '0')}`;
}

function getGenderLabel(gender?: string | null): string {
    const g = (gender ?? '').toUpperCase();
    if (g === 'MALE') return 'Nam';
    if (g === 'FEMALE') return 'Nữ';
    if (g === 'OTHER') return 'Khác';
    return '—';
}

function getParentRelationshipLabel(relationship?: string | null): string {
    const value = (relationship ?? '').trim().toLowerCase();
    if (!value) return '—';
    if (value === 'father') return 'Ba';
    if (value === 'mother') return 'Mẹ';
    if (value === 'grandfather') return 'Ông';
    if (value === 'grandmother') return 'Bà';
    if (value === 'sibling') return 'Anh / Chị';
    if (value === 'guardian') return 'Người giám hộ';
    return relationship || '—';
}

function renderClassPreview(classes: string[] | null) {
    if (!classes || classes.length === 0) return '—';
    const visible = classes.slice(0, 2);
    const hasOverflow = classes.length >= 3;
    const fullList = classes.join(', ');

    return (
        <span className="font-bold text-[#1A1A1A]/70">
            {visible.join(', ')}
            {hasOverflow && (
                <span
                    className="ml-1 inline-flex cursor-help rounded-md border border-[#1A1A1A]/15 px-1.5 text-xs font-extrabold text-[#1A1A1A]/60"
                    title={fullList}
                    aria-label={`Xem toàn bộ lớp học: ${fullList}`}
                >
                    ...
                </span>
            )}
        </span>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="py-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B7280] dark:text-[#94a3b8]">{label}</p>
            <p className="mt-1 text-[18px] leading-6 font-bold text-[#1A1A1A] break-words dark:text-slate-100">{value || '—'}</p>
        </div>
    );
}

/* ─── Edit User Modal ────────────────────────────────────────────────────── */
interface TeacherDetailResponse {
    teacherID: number;
    username: string;
    email: string;
    phone: string;
    status: string;
    avatarUrl?: string;
    createdAt: string;
    role: RoleResponse;
    fullName: string;
    specialization: string;
    gender: string;
    isHomeroomTeacher: boolean;
    dateOfBirth: string | null;
    address: string | null;
    classes: string[] | null;
}

interface StudentDetailResponse {
    studentID: number;
    username: string;
    email: string;
    phone: string;
    status: string;
    avatarUrl?: string;
    createdAt: string;
    role: RoleResponse;
    fullName: string;
    dateOfBirth: string | null;
    gender: string;
    address: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    parentRelationship: string;
}

type UserDetailResponse = TeacherDetailResponse | StudentDetailResponse;

interface TeacherEditForm {
    fullName: string;
    email: string;
    phone: string;
    status: string;
    gender: string;
    specialization: string;
    dateOfBirth: string;
    address: string;
    isHomeroomTeacher: boolean;
}

interface StudentEditForm {
    fullName: string;
    email: string;
    phone: string;
    status: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    parentRelationship: string;
}

function EditUserModal({ user, onClose, onSuccess }: { user: UserResponse; onClose: () => void; onSuccess: (meta?: UserMutationSuccessMeta) => void | Promise<void> }) {
    const isTeacher = user.role?.roleName?.toUpperCase().includes('TEACHER');

    const [teacherForm, setTeacherForm] = useState<TeacherEditForm>({
        fullName: user.fullName ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        status: user.status ?? 'ACTIVE',
        gender: '',
        specialization: '',
        dateOfBirth: '',
        address: '',
        isHomeroomTeacher: false,
    });

    const [studentForm, setStudentForm] = useState<StudentEditForm>({
        fullName: user.fullName ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        status: user.status ?? 'ACTIVE',
        dateOfBirth: '',
        gender: '',
        address: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        parentRelationship: '',
    });

    const [fetchingDetail, setFetchingDetail] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [studentAvatarFile, setStudentAvatarFile] = useState<File | null>(null);
    const [studentAvatarPreviewUrl, setStudentAvatarPreviewUrl] = useState<string | null>(null);
    const [studentAvatarCurrentUrl, setStudentAvatarCurrentUrl] = useState<string | null>(user.avatarUrl ?? null);
    const [studentAvatarError, setStudentAvatarError] = useState<string | null>(null);
    const [showAvatarActions, setShowAvatarActions] = useState(false);
    const [avatarZoomUrl, setAvatarZoomUrl] = useState<string | null>(null);
    const editStudentAvatarInputRef = useRef<HTMLInputElement | null>(null);
    const avatarActionRef = useRef<HTMLDivElement | null>(null);

    // Fetch full detail from GET /users/{userID} on mount
    useEffect(() => {
        async function loadDetail() {
            const token = authService.getToken();
            if (!token) { setFetchingDetail(false); return; }
            try {
                const resp = await api.get<ApiResponse<TeacherDetailResponse | StudentDetailResponse>>(
                    `/users/${user.userID}`, token
                );
                const detail = resp.result;
                if (isTeacher) {
                    const t = detail as TeacherDetailResponse;
                    setTeacherForm({
                        fullName: t.fullName ?? '',
                        email: t.email ?? '',
                        phone: t.phone ?? '',
                        status: t.status ?? 'ACTIVE',
                        gender: (t.gender ?? '').toUpperCase(),
                        specialization: t.specialization ?? '',
                        dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toString().slice(0, 10) : '',
                        address: t.address ?? '',
                        isHomeroomTeacher: t.isHomeroomTeacher ?? false,
                    });
                    setStudentAvatarCurrentUrl(t.avatarUrl ?? user.avatarUrl ?? null);
                } else {
                    const s = detail as StudentDetailResponse;
                    setStudentForm({
                        fullName: s.fullName ?? '',
                        email: s.email ?? '',
                        phone: s.phone ?? '',
                        status: s.status ?? 'ACTIVE',
                        dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toString().slice(0, 10) : '',
                        gender: (s.gender ?? '').toUpperCase(),
                        address: s.address ?? '',
                        parentName: s.parentName ?? '',
                        parentPhone: s.parentPhone ?? '',
                        parentEmail: s.parentEmail ?? '',
                        parentRelationship: s.parentRelationship ?? '',
                    });
                    setStudentAvatarCurrentUrl(s.avatarUrl ?? user.avatarUrl ?? null);
                }
            } catch {
                // giữ nguyên giá trị mặc định nếu lỗi
            } finally {
                setFetchingDetail(false);
            }
        }
        loadDetail();
    }, [user.userID, isTeacher]);

    function updateTeacher(field: keyof TeacherEditForm, value: string | boolean) {
        setTeacherForm(prev => ({ ...prev, [field]: value }));
    }
    function updateStudent(field: keyof StudentEditForm, value: string) {
        setStudentForm(prev => ({ ...prev, [field]: value }));
    }

    function handleStudentAvatarChange(file?: File) {
        setStudentAvatarError(null);
        setShowAvatarActions(false);
        if (!file) {
            setStudentAvatarFile(null);
            setStudentAvatarPreviewUrl(null);
            return;
        }

        const validationError = getAvatarValidationError(file);
        if (validationError) {
            setStudentAvatarError(validationError);
            return;
        }

        setStudentAvatarFile(file);
        setStudentAvatarPreviewUrl(URL.createObjectURL(file));
    }

    function openEditStudentAvatarPicker() {
        editStudentAvatarInputRef.current?.click();
    }

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!avatarActionRef.current?.contains(event.target as Node)) {
                setShowAvatarActions(false);
            }
        }

        if (showAvatarActions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAvatarActions]);

    useEffect(() => {
        return () => {
            if (studentAvatarPreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(studentAvatarPreviewUrl);
            }
        };
    }, [studentAvatarPreviewUrl]);

    async function handleSubmit() {
        setError(null);
        setSuccess(null);
        const token = authService.getToken();
        if (!token) { setError('Bạn chưa đăng nhập.'); return; }
        setLoading(true);
        try {
            const successMeta: UserMutationSuccessMeta = {
                roleCluster: normalizeRoleCluster(user.role?.roleName),
                userId: user.userID,
                username: user.username,
            };
            if (isTeacher) {
                const payload: any = {
                    fullName: teacherForm.fullName,
                    email: teacherForm.email,
                    status: teacherForm.status,
                    isHomeroomTeacher: teacherForm.isHomeroomTeacher,
                };
                if (teacherForm.phone) payload.phone = teacherForm.phone;
                if (teacherForm.gender) payload.gender = teacherForm.gender;
                if (teacherForm.specialization) payload.specialization = teacherForm.specialization;
                if (teacherForm.dateOfBirth) payload.dateOfBirth = teacherForm.dateOfBirth;
                if (teacherForm.address) payload.address = teacherForm.address;
                const formData = buildTeacherFormData(payload, studentAvatarFile);
                await api.authPutForm(`/users/teachers/${user.userID}`, formData, token);
                setSuccess('Cập nhật giáo viên thành công!');
            } else {
                const payload: any = {
                    fullName: studentForm.fullName,
                    email: studentForm.email,
                    status: studentForm.status,
                };
                if (studentForm.phone) payload.phone = studentForm.phone;
                if (studentForm.dateOfBirth) payload.dateOfBirth = studentForm.dateOfBirth;
                if (studentForm.gender) payload.gender = studentForm.gender;
                if (studentForm.address) payload.address = studentForm.address;
                if (studentForm.parentName) payload.parentName = studentForm.parentName;
                if (studentForm.parentPhone) payload.parentPhone = studentForm.parentPhone;
                if (studentForm.parentEmail) payload.parentEmail = studentForm.parentEmail;
                if (studentForm.parentRelationship) payload.parentRelationship = studentForm.parentRelationship;
                const formData = buildStudentFormData(payload, studentAvatarFile);
                await api.authPutForm(`/users/students/${user.userID}`, formData, token);
                setSuccess('Cập nhật học sinh thành công!');
            }
            setTimeout(async () => {
                await onSuccess(successMeta);
                onClose();
            }, 1200);
        } catch (e: any) {
            setError(e?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/75" onClick={onClose}>
            <div
                className={`bg-[#FAF9F6] w-full rounded-3xl border-2 border-[#1A1A1A] shadow-2xl overflow-hidden transition-all dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)] ${!isTeacher ? 'max-w-5xl' : 'max-w-xl'}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-0.5 dark:text-[#94a3b8]">Quản lý người dùng</p>
                        <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-slate-50">
                            Chỉnh sửa {isTeacher ? 'giáo viên' : 'học sinh'}
                        </h2>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5 dark:text-[#94a3b8]">{getUserCode(user)} — {user.username}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors dark:bg-white/5 dark:hover:bg-white/10">
                        <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                    </button>
                </div>

                {/* Form body */}
                <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    {fetchingDetail ? (
                        <div className="space-y-3 py-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 bg-[#1A1A1A]/8 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : isTeacher ? (
                        <>
                            <input
                                ref={editStudentAvatarInputRef}
                                type="file"
                                accept={AVATAR_ACCEPT}
                                className="hidden"
                                onChange={(e) => handleStudentAvatarChange(e.target.files?.[0])}
                            />
                            <div className="rounded-2xl border-2 border-[#1A1A1A]/10 bg-white p-4 dark:bg-[#161b22] dark:border-white/10">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <AvatarPreview
                                            avatarUrl={studentAvatarPreviewUrl ?? studentAvatarCurrentUrl}
                                            fallbackName={teacherForm.fullName || user.fullName || user.username}
                                            userId={user.userID}
                                            sizeClass="w-16 h-16"
                                            textClass="text-xl"
                                        />
                                        <div>
                                            <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">Avatar giáo viên</p>
                                            <p className="text-[11px] font-bold text-[#1A1A1A]/50 dark:text-[#94a3b8]">PNG/JPG/WEBP/GIF, tối đa 5MB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openEditStudentAvatarPicker}
                                        className="px-3 py-2 rounded-xl border-2 border-[#FF6B4A]/30 text-[#FF6B4A] text-xs font-extrabold hover:bg-[#FF6B4A]/10 transition-colors"
                                    >
                                        {studentAvatarFile ? 'Đổi avatar' : 'Chọn avatar'}
                                    </button>
                                </div>
                                {studentAvatarError && <p className="mt-2 text-xs font-extrabold text-[#c0392b]">{studentAvatarError}</p>}
                            </div>

                            <Field label="Họ và tên" required>
                                <input className={inputCls} placeholder="Nguyễn Văn A" value={teacherForm.fullName} onChange={e => updateTeacher('fullName', e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Email" required>
                                    <input type="email" className={inputCls} placeholder="giaovien@school.edu.vn" value={teacherForm.email} onChange={e => updateTeacher('email', e.target.value)} />
                                </Field>
                                <Field label="Số điện thoại">
                                    <input className={inputCls} placeholder="0912345678" value={teacherForm.phone} onChange={e => updateTeacher('phone', e.target.value)} />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Chuyên môn">
                                    <input className={inputCls} placeholder="Toán học" value={teacherForm.specialization} onChange={e => updateTeacher('specialization', e.target.value)} />
                                </Field>
                                <Field label="Ngày sinh">
                                    <input type="date" className={inputCls} value={teacherForm.dateOfBirth} onChange={e => updateTeacher('dateOfBirth', e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Địa chỉ">
                                <input className={inputCls} placeholder="123 Đường ABC, Quận 1, TP.HCM" value={teacherForm.address} onChange={e => updateTeacher('address', e.target.value)} />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Trạng thái">
                                    <select className={inputCls} value={teacherForm.status} onChange={e => updateTeacher('status', e.target.value)}>
                                        <option value="ACTIVE">Hoạt động</option>
                                        <option value="LOCKED">Khóa</option>
                                    </select>
                                </Field>
                                <Field label="Giới tính">
                                    <select className={inputCls} value={teacherForm.gender} onChange={e => updateTeacher('gender', e.target.value)}>
                                        <option value="">-- Chọn --</option>
                                        <option value="MALE">Nam</option>
                                        <option value="FEMALE">Nữ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </Field>
                            </div>
                            <div className="flex items-center gap-3 bg-white border-2 border-[#1A1A1A]/10 rounded-2xl px-4 py-3 dark:bg-[#161b22] dark:border-white/10">
                                <input
                                    id="edit-homeroom"
                                    type="checkbox"
                                    className="w-4 h-4 accent-[#FF6B4A]"
                                    checked={teacherForm.isHomeroomTeacher}
                                    onChange={e => updateTeacher('isHomeroomTeacher', e.target.checked)}
                                />
                                <label htmlFor="edit-homeroom" className="text-sm font-bold text-[#1A1A1A] cursor-pointer select-none dark:text-slate-100">
                                    Là giáo viên chủ nhiệm
                                </label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white lg:col-span-3 dark:bg-[#161b22] dark:border-white/10">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#B8B5FF]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#7f87d7]">
                                        <span className="w-5 h-5 rounded-lg bg-[#B8B5FF] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#7f87d7] dark:text-slate-50">1</span>
                                        <p className="text-xs font-extrabold text-[#6C63FF] uppercase tracking-wider dark:text-[#aab4ff]">Thông tin cá nhân</p>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <input
                                            ref={editStudentAvatarInputRef}
                                            type="file"
                                            accept={AVATAR_ACCEPT}
                                            className="hidden"
                                            onChange={(e) => handleStudentAvatarChange(e.target.files?.[0])}
                                        />
                                        <div ref={avatarActionRef} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowAvatarActions(v => !v)}
                                                className="w-full rounded-2xl border-2 border-dashed border-[#1A1A1A]/15 bg-[#F7F7F2] p-4 hover:border-[#FF6B4A]/40 transition-colors dark:bg-[#111827] dark:border-white/10 dark:hover:border-[#d97757]/60"
                                            >
                                                <div className="flex flex-col items-center text-center gap-2">
                                                    <AvatarPreview
                                                        avatarUrl={studentAvatarPreviewUrl ?? studentAvatarCurrentUrl}
                                                        fallbackName={studentForm.fullName || user.fullName || user.username}
                                                        userId={user.userID}
                                                        sizeClass="w-24 h-24"
                                                        textClass="text-3xl"
                                                    />
                                                    <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-slate-100">Nhấn để thao tác avatar</p>
                                                    <p className="text-[11px] font-bold text-[#1A1A1A]/50 dark:text-[#94a3b8]">Xem hoặc thay đổi ảnh đại diện</p>
                                                </div>
                                            </button>
                                            {showAvatarActions && (
                                                <div className="absolute left-1/2 top-full z-10 mt-2 w-52 -translate-x-1/2 rounded-2xl border-2 border-[#1A1A1A]/15 bg-white p-2 shadow-xl dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
                                                    <button
                                                        type="button"
                                                        disabled={!(studentAvatarPreviewUrl ?? studentAvatarCurrentUrl)}
                                                        onClick={() => {
                                                            const current = studentAvatarPreviewUrl ?? studentAvatarCurrentUrl;
                                                            if (current) setAvatarZoomUrl(current);
                                                            setShowAvatarActions(false);
                                                        }}
                                                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-extrabold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-100 dark:hover:bg-white/10"
                                                    >
                                                        Xem avatar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={openEditStudentAvatarPicker}
                                                        className="w-full rounded-xl px-3 py-2 text-left text-sm font-extrabold text-[#FF6B4A] hover:bg-[#FF6B4A]/10 dark:text-[#f0b09b] dark:hover:bg-[#d97757]/15"
                                                    >
                                                        {studentAvatarFile ? 'Đổi ảnh khác' : 'Thay đổi avatar'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {studentAvatarFile && (
                                            <button
                                                type="button"
                                                onClick={() => handleStudentAvatarChange(undefined)}
                                                    className="text-xs font-extrabold text-[#FF6B4A] hover:text-[#ff5535] dark:text-[#f0b09b] dark:hover:text-[#ffc1ab]"
                                            >
                                                Bỏ thay đổi ảnh
                                            </button>
                                        )}
                                        {studentAvatarError && <p className="text-xs font-extrabold text-[#c0392b]">{studentAvatarError}</p>}
                                        <Field label="Họ và tên" required>
                                            <input className={inputCls} value={studentForm.fullName} onChange={e => updateStudent('fullName', e.target.value)} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Ngày sinh">
                                                <input type="date" className={inputCls} value={studentForm.dateOfBirth} onChange={e => updateStudent('dateOfBirth', e.target.value)} />
                                            </Field>
                                            <Field label="Giới tính">
                                                <select className={inputCls} value={studentForm.gender} onChange={e => updateStudent('gender', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </Field>
                                        </div>
                                        <Field label="Địa chỉ">
                                            <input className={inputCls} value={studentForm.address} onChange={e => updateStudent('address', e.target.value)} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-4 lg:col-span-2">
                                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white dark:bg-[#161b22] dark:border-white/10">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B4A]/8 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#d97757]">
                                            <span className="w-5 h-5 rounded-lg bg-[#FF6B4A] flex items-center justify-center text-white text-xs font-extrabold dark:bg-[#d97757]">2</span>
                                            <p className="text-xs font-extrabold text-[#FF6B4A] uppercase tracking-wider dark:text-[#f0b09b]">Thông tin tài khoản</p>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Email" required>
                                                    <input type="email" className={inputCls} value={studentForm.email} onChange={e => updateStudent('email', e.target.value)} />
                                                </Field>
                                                <Field label="Số điện thoại">
                                                    <input className={inputCls} value={studentForm.phone} onChange={e => updateStudent('phone', e.target.value)} />
                                                </Field>
                                            </div>
                                            <Field label="Trạng thái">
                                                <select className={inputCls} value={studentForm.status} onChange={e => updateStudent('status', e.target.value)}>
                                                    <option value="ACTIVE">Hoạt động</option>
                                                    <option value="LOCKED">Khóa</option>
                                                </select>
                                            </Field>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border-2 border-[#1A1A1A]/10 overflow-hidden bg-white dark:bg-[#161b22] dark:border-white/10">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#95E1D3]/20 border-b-2 border-[#1A1A1A]/10 dark:bg-transparent dark:border-b-white/[0.08] dark:border-t-2 dark:border-t-[#6ba79c]">
                                            <span className="w-5 h-5 rounded-lg bg-[#95E1D3] flex items-center justify-center text-[#1A1A1A] text-xs font-extrabold dark:bg-[#6ba79c] dark:text-slate-50">3</span>
                                            <p className="text-xs font-extrabold text-[#1A7A6E] uppercase tracking-wider dark:text-[#93c7bf]">Thông tin phụ huynh</p>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <Field label="Họ tên phụ huynh">
                                                <input className={inputCls} value={studentForm.parentName} onChange={e => updateStudent('parentName', e.target.value)} />
                                            </Field>
                                            <Field label="Quan hệ">
                                                <select className={inputCls} value={studentForm.parentRelationship} onChange={e => updateStudent('parentRelationship', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    <option value="Father">Cha</option>
                                                    <option value="Mother">Mẹ</option>
                                                    <option value="Grandfather">Ông</option>
                                                    <option value="Grandmother">Bà</option>
                                                    <option value="Sibling">Anh / Chị</option>
                                                    <option value="Guardian">Người giám hộ</option>
                                                </select>
                                            </Field>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="SĐT phụ huynh">
                                                    <input className={inputCls} value={studentForm.parentPhone} onChange={e => updateStudent('parentPhone', e.target.value)} />
                                                </Field>
                                                <Field label="Email phụ huynh">
                                                    <input type="email" className={inputCls} value={studentForm.parentEmail} onChange={e => updateStudent('parentEmail', e.target.value)} />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Feedback */}
                    {error && (
                        <div className="bg-[#FFB5B5]/40 border-2 border-[#FF6B4A]/40 text-[#c0392b] text-sm font-bold px-4 py-2.5 rounded-2xl">
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-[#95E1D3]/40 border-2 border-[#95E1D3] text-[#1A7A6E] text-sm font-bold px-4 py-2.5 rounded-2xl">
                            ✅ {success}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 pb-6 pt-3 border-t-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors dark:bg-[#111827] dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#1f2937]"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B4A] hover:bg-[#ff5535] font-extrabold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:bg-[#d97757] dark:hover:bg-[#c86c4f]"
                    >
                        {loading ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                            </svg>
                        ) : <PencilSimple className="w-4 h-4" weight="fill" />}
                        {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                    </button>
                </div>
            </div>

            {avatarZoomUrl && (
                <AvatarZoomModal
                    avatarUrl={avatarZoomUrl}
                    title="Avatar học sinh"
                    onClose={() => setAvatarZoomUrl(null)}
                />
            )}
        </div>
    );

    return <BodyPortal>{modalContent}</BodyPortal>;
}

function UserDetailModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
    const isTeacher = user.role?.roleName?.toUpperCase().includes('TEACHER');
    const [detail, setDetail] = useState<UserDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [avatarZoomUrl, setAvatarZoomUrl] = useState<string | null>(null);

    useEffect(() => {
        async function loadDetail() {
            const token = authService.getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const resp = await api.get<ApiResponse<UserDetailResponse>>(`/users/${user.userID}`, token);
                setDetail(resp.result ?? null);
            } finally {
                setLoading(false);
            }
        }
        loadDetail();
    }, [user.userID]);

    const teacherDetail = isTeacher ? detail as TeacherDetailResponse | null : null;
    const studentDetail = !isTeacher ? detail as StudentDetailResponse | null : null;
    const fullName = detail?.fullName ?? user.fullName ?? user.username;
    const avatarUrl = detail?.avatarUrl ?? user.avatarUrl ?? null;
    const email = detail?.email ?? user.email ?? '—';
    const phone = detail?.phone ?? user.phone ?? '—';
    const classes = isTeacher
        ? (teacherDetail?.classes ?? user.classes ?? [])
        : (user.classes ?? []);
    const statusLabel = user.status === 'ACTIVE' ? 'Hoạt động' : 'Khóa';
    const infoRows = [
        { label: 'Tên đăng nhập', value: user.username ?? '—' },
        { label: 'Ngày tạo', value: formatDate(detail?.createdAt ?? user.createdAt) },
        { label: 'Email', value: email },
        { label: 'Số điện thoại', value: phone || '—' },
        { label: 'Ngày sinh', value: formatDate(detail?.dateOfBirth ?? null) },
        { label: 'Giới tính', value: getGenderLabel(detail?.gender) },
    ];

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/75" onClick={onClose}>
            <div
                className="bg-[#FAF9F6] w-full max-w-4xl rounded-3xl border-2 border-[#1A1A1A] shadow-2xl overflow-hidden dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative bg-gradient-to-r from-[#FF6B4A]/10 via-white to-[#B8B5FF]/20 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-gray-200 dark:bg-gradient-to-r dark:from-[#1b2230] dark:via-[#1f2634] dark:to-[#222938] dark:border-white/[0.06]">
                    <button onClick={onClose} className="absolute right-4 top-4 sm:right-6 sm:top-6 w-8 h-8 rounded-xl bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors dark:bg-white/5 dark:hover:bg-white/10">
                        <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-1 pr-10 sm:pr-12">
                        <button
                            type="button"
                            disabled={!avatarUrl}
                            onClick={() => avatarUrl && setAvatarZoomUrl(avatarUrl)}
                            className="rounded-full self-center sm:self-auto shrink-0"
                        >
                            <AvatarPreview
                                avatarUrl={avatarUrl}
                                fallbackName={fullName}
                                userId={user.userID}
                                sizeClass="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32"
                                textClass="text-2xl sm:text-3xl lg:text-4xl"
                            />
                        </button>

                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest dark:text-[#94a3b8]">Chi tiết người dùng</p>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] leading-tight mt-1 dark:text-slate-50">{fullName}</h2>
                            <p className="text-sm sm:text-base text-gray-500 font-bold mt-1 tracking-wide dark:text-slate-300">{getUserCode(user)}</p>
                            {avatarUrl && <p className="text-[10px] sm:text-[11px] font-bold text-[#1A1A1A]/50 mt-1 dark:text-[#94a3b8]">Nhấn vào avatar để phóng to</p>}
                            <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span
                                    className="inline-flex px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 text-xs font-extrabold dark:border-white/10 dark:text-slate-100"
                                    style={{ backgroundColor: getRoleBg(user.role?.roleName ?? '') }}
                                >
                                    {getRoleLabel(user.role?.roleName ?? '')}
                                </span>
                                <span className={`inline-flex px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20 text-xs font-extrabold dark:border-white/10 dark:text-slate-100 ${user.status === 'ACTIVE' ? 'bg-[#7be3d4] text-[#0f3d38] dark:bg-[#2f9d90] dark:text-[#dcfdf8]' : 'bg-[#FFB5B5] text-[#7f1d1d] dark:bg-[#8a4f57] dark:text-[#ffe4e8] dark:border-[#c77f89]/35'}`}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto bg-[#FAF9F6] dark:bg-[#1b2230]">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-1">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-16 bg-[#1A1A1A]/8 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                {infoRows.map((item) => (
                                    <DetailItem key={item.label} label={item.label} value={item.value} />
                                ))}
                                {isTeacher ? (
                                    <DetailItem label="Chuyên môn" value={teacherDetail?.specialization || '—'} />
                                ) : null}
                            </div>

                            {!isTeacher && (
                                <div className="pt-2">
                                    <DetailItem label="Địa chỉ" value={studentDetail?.address || '—'} />
                                </div>
                            )}

                            {!isTeacher && (
                                <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                                    <p className="text-sm font-extrabold text-[#1A7A6E] uppercase tracking-wider mb-2 dark:text-[#93c7bf]">Thông tin phụ huynh</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                        <DetailItem label="Họ tên phụ huynh" value={studentDetail?.parentName || '—'} />
                                        <DetailItem label="Quan hệ" value={getParentRelationshipLabel(studentDetail?.parentRelationship)} />
                                        <DetailItem label="SĐT phụ huynh" value={studentDetail?.parentPhone || '—'} />
                                        <DetailItem label="Email phụ huynh" value={studentDetail?.parentEmail || '—'} />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                                <p className="text-sm font-extrabold uppercase tracking-wider text-[#FF6B4A] mb-2">Danh sách lớp học</p>
                                <p className="text-sm font-bold text-[#1A1A1A]/80 leading-7 dark:text-slate-100/90">{classes.length > 0 ? classes.join(', ') : '—'}</p>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 pb-6 pt-1 border-t border-gray-200 flex justify-end bg-[#FAF9F6] dark:border-white/[0.06] dark:bg-[#1b2230]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/5 transition-colors dark:bg-[#111827] dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#1f2937]"
                    >
                        Đóng
                    </button>
                </div>
            </div>

            {avatarZoomUrl && (
                <AvatarZoomModal
                    avatarUrl={avatarZoomUrl}
                    title={`Avatar - ${fullName}`}
                    onClose={() => setAvatarZoomUrl(null)}
                />
            )}
        </div>
    );

    return <BodyPortal>{modalContent}</BodyPortal>;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function UserManage() {
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [detailUser, setDetailUser] = useState<UserResponse | null>(null);
    const [editUser, setEditUser] = useState<UserResponse | null>(null);
    const [lockConfirmUser, setLockConfirmUser] = useState<UserResponse | null>(null);
    const [lockLoading, setLockLoading] = useState(false);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserResponse | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [recentMutationMeta, setRecentMutationMeta] = useState<UserMutationSuccessMeta | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function fetchUsers(page: number, role: string, keyword: string): Promise<UserResponse[]> {
        const token = authService.getToken();
        if (!token) return [];
        setLoading(true);
        setError(null);
        try {
            const roleParam = role !== 'all' ? role.toUpperCase() : '';
            let url = `/users/paging?page=${page}&size=${pageSize}`;
            if (roleParam) url += `&roleName=${encodeURIComponent(roleParam)}`;
            if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
            const resp = await api.get<ApiResponse<PageResponse<UserResponse>>>(url, token);
            if (resp.result) {
                const nextUsers = resp.result.data ?? [];
                setAllUsers(nextUsers);
                setTotalPages(resp.result.totalPages ?? 1);
                setTotalElements(resp.result.totalElements ?? 0);

                // If current page is now out of range (e.g. after delete), step back to the last valid page.
                const nextTotalPages = resp.result.totalPages ?? 1;
                if (nextTotalPages > 0 && page > nextTotalPages) {
                    setCurrentPage(nextTotalPages);
                }
                return nextUsers;
            } else {
                setAllUsers([]);
                setTotalPages(1);
                setTotalElements(0);
                return [];
            }
        } catch (e: any) {
            setError(e?.message ?? 'Không thể tải danh sách người dùng.');
            setAllUsers([]);
            return [];
        } finally {
            setLoading(false);
        }
    }

    // Derive unique class names from all fetched users
    const uniqueClasses = Array.from(
        new Set(
            allUsers.flatMap(u => u.classes ?? []).filter(Boolean)
        )
    ).sort();

    // Apply client-side filters (status + class) on top of server-filtered data
    useEffect(() => {
        let filtered = allUsers;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(u => u.status === statusFilter);
        }
        if (classFilter !== 'all') {
            filtered = filtered.filter(u => u.classes?.includes(classFilter));
        }

        const sorted = [...filtered].sort((a, b) => {
            const roleA = normalizeRoleCluster(a.role?.roleName);
            const roleB = normalizeRoleCluster(b.role?.roleName);
            const roleOrderDiff = getRoleClusterOrder(roleA) - getRoleClusterOrder(roleB);
            if (roleOrderDiff !== 0) {
                return roleOrderDiff;
            }

            if (recentMutationMeta && roleA === recentMutationMeta.roleCluster && roleB === recentMutationMeta.roleCluster) {
                const aIsRecent =
                    (recentMutationMeta.userId != null && a.userID === recentMutationMeta.userId) ||
                    (!!recentMutationMeta.username && a.username === recentMutationMeta.username);
                const bIsRecent =
                    (recentMutationMeta.userId != null && b.userID === recentMutationMeta.userId) ||
                    (!!recentMutationMeta.username && b.username === recentMutationMeta.username);
                if (aIsRecent !== bIsRecent) {
                    return aIsRecent ? -1 : 1;
                }
            }

            const createdDiff = parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt);
            if (createdDiff !== 0) {
                return createdDiff;
            }
            return b.userID - a.userID;
        });

        setUsers(sorted);
    }, [allUsers, statusFilter, classFilter, recentMutationMeta]);

    // Fetch whenever page, role or searchTerm changes
    useEffect(() => {
        fetchUsers(currentPage, roleFilter, searchTerm);
    }, [currentPage, roleFilter, searchTerm]);

    // Debounce search input → update searchTerm and reset to page 1
    function handleSearchChange(value: string) {
        setSearchInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchTerm(value.trim());
            setCurrentPage(1);
        }, 400);
    }

    function handleRoleChange(value: string) {
        setRoleFilter(value);
        setCurrentPage(1);
    }

    function handleStatusChange(value: string) {
        setStatusFilter(value);
        setCurrentPage(1);
    }

    function handleClassChange(value: string) {
        setClassFilter(value);
        setCurrentPage(1);
    }

    async function handleLockUser() {
        if (!lockConfirmUser) return;
        const token = authService.getToken();
        if (!token) return;
        setLockLoading(true);
        const isActive = lockConfirmUser.status === 'ACTIVE';
        try {
            await api.authDelete(`/users/${lockConfirmUser.userID}`, token);
            setLockConfirmUser(null);
            fetchUsers(currentPage, roleFilter, searchTerm);
        } catch (e: any) {
            setError(e?.message ?? (isActive ? 'Không thể khóa tài khoản.' : 'Không thể mở khóa tài khoản.'));
            setLockConfirmUser(null);
        } finally {
            setLockLoading(false);
        }
    }

    async function handleDeleteUser() {
        if (!deleteConfirmUser) return;
        const token = authService.getToken();
        if (!token) return;
        setDeleteLoading(true);
        try {
            await api.authDelete(`/users/${deleteConfirmUser.userID}/delete`, token);
            setDeleteConfirmUser(null);
            fetchUsers(currentPage, roleFilter, searchTerm);
        } catch (e: any) {
            setError(e?.message ?? 'Không thể xóa người dùng.');
            setDeleteConfirmUser(null);
        } finally {
            setDeleteLoading(false);
        }
    }

    const isClientFilterActive = statusFilter !== 'all' || classFilter !== 'all';
    const displayedTotalElements = isClientFilterActive ? users.length : totalElements;
    const displayedStartItem = displayedTotalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayedEndItem = isClientFilterActive
        ? users.length
        : Math.min(currentPage * pageSize, totalElements);

    return (
        <div className="p-8 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Quản trị hệ thống</p>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Quản lý Người dùng</h1>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên, email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#1A1A1A]/20 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#FF6B4A] transition-colors"
                            value={searchInput}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#FF6B4A] hover:bg-[#ff5535] px-4 py-2.5 rounded-2xl font-extrabold text-sm text-white transition-colors shrink-0"
                    >
                        <UserPlus className="w-4 h-4" weight="fill" />
                        <span className="hidden sm:inline">Thêm người dùng</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Vai trò</p>
                    <Select value={roleFilter} onValueChange={handleRoleChange}>
                        <SelectTrigger className="w-36 bg-white rounded-2xl border-2 border-[#1A1A1A]/20 h-9 font-bold text-[#1A1A1A]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả vai trò</SelectItem>
                            <SelectItem value="teacher">Giáo viên</SelectItem>
                            <SelectItem value="student">Học sinh</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Trạng thái</p>
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-36 bg-white rounded-2xl border-2 border-[#1A1A1A]/20 h-9 font-bold text-[#1A1A1A]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                            <SelectItem value="LOCKED">Khóa</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Lớp học</p>
                    <Select value={classFilter} onValueChange={handleClassChange}>
                        <SelectTrigger className="w-36 bg-white rounded-2xl border-2 border-[#1A1A1A]/20 h-9 font-bold text-[#1A1A1A]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả lớp</SelectItem>
                            {uniqueClasses.map(cls => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-[#FFB5B5]/40 border-2 border-[#FF6B4A]/40 text-[#c0392b] text-sm font-bold px-4 py-3 rounded-2xl">
                    ⚠️ {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/20">
                        <tr>
                            {['Mã số', 'Họ tên', 'Vai trò', 'Lớp', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map(h => (
                                <th key={h} className="px-6 py-4 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-semibold">
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-5 h-5 text-[#FF6B4A]" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                        </svg>
                                        Đang tải...
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-semibold">
                                    Không có người dùng nào.
                                </td>
                            </tr>
                        ) : users.map(user => (
                            <tr
                                key={user.userID}
                                className="cursor-pointer transition-all duration-200 hover:bg-[#FF6B4A]/6 hover:shadow-[inset_0_0_0_1px_rgba(255,107,74,0.12)] hover:scale-[1.002]"
                                onClick={() => setDetailUser(user)}
                            >
                                <td className="px-6 py-4">
                                    <span className="text-xs font-extrabold text-[#1A1A1A]/50 bg-[#1A1A1A]/5 px-2.5 py-1 rounded-xl border-2 border-[#1A1A1A]/10 tracking-wider">
                                        {getUserCode(user)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <AvatarPreview
                                            avatarUrl={user.avatarUrl}
                                            fallbackName={user.fullName ?? user.username ?? ''}
                                            userId={user.userID}
                                            sizeClass="w-10 h-10"
                                            textClass="text-sm"
                                        />
                                        <div>
                                            <p className="font-extrabold text-[#1A1A1A]">{user.fullName || user.username}</p>
                                            <p className="text-xs text-gray-400 font-semibold">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className="text-sm font-bold px-3 py-1 rounded-full border-2 border-[#1A1A1A]/20"
                                        style={{ backgroundColor: getRoleBg(user.role?.roleName ?? ''), color: '#1A1A1A' }}
                                    >
                                        {getRoleLabel(user.role?.roleName ?? '')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {renderClassPreview(user.classes)}
                                </td>
                                <td className="px-6 py-4 font-semibold text-gray-400">{formatDate(user.createdAt)}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLockConfirmUser(user);
                                        }}
                                        title={user.status === 'ACTIVE' ? 'Bấm để khóa tài khoản' : 'Tài khoản đang bị khóa'}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border-2 transition-all hover:opacity-90 active:scale-95 ${user.status === 'ACTIVE' ? 'bg-[#7be3d4] border-[#38b2a6]/40 text-[#0f3d38] dark:bg-[#2f9d90] dark:border-[#56c0b4]/40 dark:text-[#dcfdf8]' : 'bg-[#FFB5B5] border-[#d38a95]/35 text-[#7f1d1d] dark:bg-[#8a4f57] dark:border-[#c77f89]/35 dark:text-[#ffe4e8]'}`}
                                    >
                                        {user.status === 'ACTIVE'
                                            ? <><LockOpen className="w-3 h-3" weight="fill" /> Hoạt động</>
                                            : <><Lock className="w-3 h-3" weight="fill" /> Khóa</>
                                        }
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditUser(user);
                                            }}
                                            className="flex items-center gap-1 text-xs font-extrabold text-[#FF6B4A] hover:text-[#ff5535] bg-[#FF6B4A]/10 px-3 py-1.5 rounded-xl transition-colors"
                                        >
                                            <PencilSimple className="w-3.5 h-3.5" /> Sửa
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmUser(user);
                                            }}
                                            className="flex items-center gap-1 text-xs font-extrabold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors"
                                        >
                                            <Trash className="w-3.5 h-3.5" /> Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t-2 border-[#1A1A1A]/10 flex items-center justify-between text-sm font-bold text-gray-400">
                    <span>
                        {displayedTotalElements === 0
                            ? 'Không có dữ liệu'
                            : `Hiển thị ${displayedStartItem}–${displayedEndItem} trên ${displayedTotalElements.toLocaleString('vi-VN')} người dùng`}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {'<'}
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 ${currentPage === page ? 'bg-[#FF6B4A] text-white border-[#FF6B4A]' : 'bg-white text-[#1A1A1A] hover:bg-gray-50'}`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="w-8 h-8 rounded-xl font-extrabold text-sm border-2 border-[#1A1A1A]/20 bg-white text-[#1A1A1A] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {'>'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={async (meta) => {
                        const latestUsers = await fetchUsers(currentPage, roleFilter, searchTerm);
                        if (!meta) return;

                        if (meta.userId != null) {
                            setRecentMutationMeta(meta);
                            return;
                        }

                        if (meta.username) {
                            const matchedUser = latestUsers.find(
                                (u) => u.username === meta.username && normalizeRoleCluster(u.role?.roleName) === meta.roleCluster
                            );
                            setRecentMutationMeta({
                                ...meta,
                                userId: matchedUser?.userID,
                            });
                        }
                    }}
                />
            )}

            {/* User Detail Modal */}
            {detailUser && (
                <UserDetailModal
                    user={detailUser}
                    onClose={() => setDetailUser(null)}
                />
            )}

            {/* Edit User Modal */}
            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSuccess={async (meta) => {
                        await fetchUsers(currentPage, roleFilter, searchTerm);
                        if (meta) {
                            setRecentMutationMeta(meta);
                        }
                    }}
                />
            )}

            {/* Lock / Unlock Confirm Modal */}
            {lockConfirmUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/75" onClick={() => !lockLoading && setLockConfirmUser(null)}>
                    <div
                        className="bg-[#FAF9F6] w-full max-w-sm rounded-3xl border-2 border-[#1A1A1A] shadow-2xl overflow-hidden dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                        onClick={e => e.stopPropagation()}
                    >
                        {(() => {
                            const isActive = lockConfirmUser.status === 'ACTIVE';
                            return (
                                <>
                                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-[#FFB5B5] dark:bg-[#aa7878]' : 'bg-[#95E1D3] dark:bg-[#6ca89b]'}`}>
                                                {isActive
                                                    ? <Lock className="w-5 h-5 text-red-600" weight="fill" />
                                                    : <LockOpen className="w-5 h-5 text-[#1A7A6E]" weight="fill" />
                                                }
                                            </div>
                                            <div>
                                                <h2 className="text-base font-extrabold text-[#1A1A1A] dark:text-slate-50">
                                                    {isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                </h2>
                                                <p className="text-xs text-gray-400 font-semibold dark:text-[#94a3b8]">{getUserCode(lockConfirmUser)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => !lockLoading && setLockConfirmUser(null)} className="w-8 h-8 rounded-xl bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors dark:bg-white/5 dark:hover:bg-white/10">
                                            <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                                        </button>
                                    </div>
                                    <div className="px-6 py-5">
                                        <p className="text-sm font-bold text-[#1A1A1A] dark:text-slate-100">
                                            Bạn có chắc muốn{' '}
                                            <span className={isActive ? 'text-red-500' : 'text-[#1A7A6E]'}>
                                                {isActive ? 'khóa tài khoản' : 'mở khóa tài khoản'}
                                            </span>{' '}
                                            của <span className="font-extrabold">{lockConfirmUser.fullName || lockConfirmUser.username}</span> không?
                                        </p>
                                        <p className="text-xs text-gray-400 font-semibold mt-1 dark:text-[#94a3b8]">
                                            {isActive
                                                ? 'Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống.'
                                                : 'Tài khoản được mở khóa sẽ có thể đăng nhập lại bình thường.'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3 px-6 pb-6">
                                        <button
                                            onClick={() => setLockConfirmUser(null)}
                                            disabled={lockLoading}
                                            className="px-5 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors disabled:opacity-50 dark:bg-[#111827] dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#1f2937]"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleLockUser}
                                            disabled={lockLoading}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1A7A6E] hover:bg-[#155f55]'}`}
                                        >
                                            {lockLoading ? (
                                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                                </svg>
                                            ) : isActive
                                                ? <Lock className="w-4 h-4" weight="fill" />
                                                : <LockOpen className="w-4 h-4" weight="fill" />
                                            }
                                            {lockLoading
                                                ? (isActive ? 'Đang khóa...' : 'Đang mở khóa...')
                                                : (isActive ? 'Xác nhận khóa' : 'Xác nhận mở khóa')
                                            }
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirmUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/75" onClick={() => !deleteLoading && setDeleteConfirmUser(null)}>
                    <div
                        className="bg-[#FAF9F6] w-full max-w-sm rounded-3xl border-2 border-[#1A1A1A] shadow-2xl overflow-hidden dark:bg-[#1b2230] dark:border-white/10 dark:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b-2 border-[#1A1A1A]/10 dark:border-white/[0.08]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center dark:bg-[#aa7878]">
                                    <Trash className="w-5 h-5 text-red-600" weight="fill" />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-[#1A1A1A] dark:text-slate-50">Xóa người dùng</h2>
                                    <p className="text-xs text-gray-400 font-semibold dark:text-[#94a3b8]">{getUserCode(deleteConfirmUser)}</p>
                                </div>
                            </div>
                            <button onClick={() => !deleteLoading && setDeleteConfirmUser(null)} className="w-8 h-8 rounded-xl bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20 flex items-center justify-center transition-colors dark:bg-white/5 dark:hover:bg-white/10">
                                <X className="w-4 h-4 text-[#1A1A1A] dark:text-slate-200" />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm font-bold text-[#1A1A1A] dark:text-slate-100">
                                Bạn có chắc muốn <span className="text-red-500">xóa vĩnh viễn</span> tài khoản của{' '}
                                <span className="font-extrabold">{deleteConfirmUser.fullName || deleteConfirmUser.username}</span> không?
                            </p>
                            <p className="text-xs text-gray-400 font-semibold mt-1 dark:text-[#94a3b8]">Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="flex justify-end gap-3 px-6 pb-6">
                            <button
                                onClick={() => setDeleteConfirmUser(null)}
                                disabled={deleteLoading}
                                className="px-5 py-2.5 rounded-2xl border-2 border-[#1A1A1A]/20 font-extrabold text-sm text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 transition-colors disabled:opacity-50 dark:bg-[#111827] dark:border-white/10 dark:text-slate-300 dark:hover:bg-[#1f2937]"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={deleteLoading}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 font-extrabold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {deleteLoading ? (
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                    </svg>
                                ) : <Trash className="w-4 h-4" weight="fill" />}
                                {deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
