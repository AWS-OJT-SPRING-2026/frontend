import { useState, useEffect } from 'react';
import {
    UserCircle, Users, Camera, Check, ArrowLeft, ShieldCheck,
    DeviceMobile, EnvelopeSimple, PencilSimple, Eye, EyeSlash,
    Lock, CalendarBlank, GenderIntersex, MapPinLine
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ApiError } from '../services/api';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import type { MyProfileResponse, UpdateMyStudentProfileRequest } from '../types/profile';
import {
    formatDisplayId,
    toApiGender,
    toApiRelation,
    toVietnameseGender,
    toVietnameseRelation,
} from '../lib/profileMappings';

const PASSWORD_CHANGE_COOLDOWN_DAYS = 7;
const PASSWORD_CHANGE_COOLDOWN_MS = PASSWORD_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const PASSWORD_CHANGE_HISTORY_KEY = 'educare_last_password_change_at';

function mapProfileToFormData(profile: MyProfileResponse) {
    return {
        name: profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: toVietnameseGender(profile.gender),
        address: profile.address || '',
        parentName: profile.parentName || '',
        parentPhone: profile.parentPhone || '',
        parentEmail: profile.parentEmail || '',
        parentRelation: toVietnameseRelation(profile.parentRelationship),
        status: profile.status || 'ACTIVE',
    };
}

function resolveProfileId(profile: MyProfileResponse): string {
    if (typeof profile.studentID === 'number') return String(profile.studentID);
    if (typeof profile.teacherID === 'number') return String(profile.teacherID);
    if (typeof profile.userID === 'number') return String(profile.userID);
    return '';
}

function buildStudentUpdatePayload(formData: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    parentRelation: string;
    status: string;
}): UpdateMyStudentProfileRequest {
    return {
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        status: formData.status,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: toApiGender(formData.gender),
        address: formData.address.trim() || undefined,
        parentName: formData.parentName.trim() || undefined,
        parentPhone: formData.parentPhone.trim() || undefined,
        parentEmail: formData.parentEmail.trim() || undefined,
        parentRelationship: toApiRelation(formData.parentRelation),
    };
}

function isPasswordChangeLimited(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized === 'password_change_limit' || normalized.includes('7 ngày');
}

function truncateAfter20Chars(value: string): string {
    if (value.length <= 20) return value;
    return `${value.slice(0, 20)}...`;
}

async function deriveAvatarThemeColor(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 24;
                canvas.height = 24;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve('#FF6B4A');
                    return;
                }

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;

                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha < 32) continue;
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count += 1;
                }

                if (!count) {
                    resolve('#FF6B4A');
                    return;
                }

                resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
            } catch {
                resolve('#FF6B4A');
            }
        };
        img.onerror = () => resolve('#FF6B4A');
        img.src = imageUrl;
    });
}

export function AccountSettings() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    // Core states
    const [isProfileEditing, setIsProfileEditing] = useState(false);
    const [isPasswordEditing, setIsPasswordEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [profileId, setProfileId] = useState('');
    const [showAvatarPreview, setShowAvatarPreview] = useState(false);
    const [avatarThemeColor, setAvatarThemeColor] = useState('#FF6B4A');

    // Avatar
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // General Profile Data
    const [formData, setFormData] = useState({
        name: user?.name || 'Phạm Thị Dung',
        email: user?.email || 'student1@educare.com',
        phone: '0912 345 678',
        dateOfBirth: '2008-09-15',
        gender: 'Nam',
        address: '12 Nguyễn Trãi, Quận 1, TP.HCM',
        parentName: 'Phạm Văn A',
        parentPhone: '0987 654 321',
        parentEmail: 'phuhuynh@example.com',
        parentRelation: 'Bố',
        status: 'ACTIVE',
    });

    const parentRelationOptions = ['Bố', 'Mẹ', 'Ông/Bà', 'Anh/Chị', 'Người giám hộ', 'Khác'];
    const genderOptions = ['Nam', 'Nữ', 'Khác'];

    // Password Update States
    const [showPassword, setShowPassword] = useState(false);
    const [pwState, setPwState] = useState({ current: '', new: '', confirm: '' });
    const [pwFlow, setPwFlow] = useState<'idle' | 'sending' | 'otp' | 'success'>('idle');
    const [otpInputs, setOtpInputs] = useState(['', '', '', '', '', '']);

    // OTP Timer
    const [countdown, setCountdown] = useState(90);

    // Last password change date (null means no recent change)
    const [lastPasswordChangeDate, setLastPasswordChangeDate] = useState<Date | null>(null);

    const timeSinceLastChange = lastPasswordChangeDate ? new Date().getTime() - lastPasswordChangeDate.getTime() : Infinity;
    const canChangePassword = timeSinceLastChange >= PASSWORD_CHANGE_COOLDOWN_MS;
    const daysRemaining = canChangePassword ? 0 : Math.ceil((PASSWORD_CHANGE_COOLDOWN_MS - timeSinceLastChange) / (1000 * 60 * 60 * 24));

    useEffect(() => {
        const userId = user?.id;
        if (!userId) {
            setIsLoadingProfile(false);
            return;
        }

        const token = authService.getToken();
        if (!token) {
            setErrorMessage('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            setIsLoadingProfile(false);
            return;
        }

        const savedCooldownRaw = localStorage.getItem(`${PASSWORD_CHANGE_HISTORY_KEY}:${userId}`);
        if (savedCooldownRaw) {
            const parsedDate = new Date(savedCooldownRaw);
            if (!Number.isNaN(parsedDate.getTime())) {
                setLastPasswordChangeDate(parsedDate);
            }
        }

        const loadProfile = async () => {
            setIsLoadingProfile(true);
            try {
                const profile = await profileService.getMyProfile(token);
                setFormData(mapProfileToFormData(profile));
                setAvatarUrl(profile.avatarUrl || null);
                setProfileId(resolveProfileId(profile));
                if (user) {
                    updateUser({
                        ...user,
                        name: profile.fullName || user.name,
                        email: profile.email || user.email,
                        avatarUrl: profile.avatarUrl || user.avatarUrl,
                    });
                }
                setErrorMessage('');
            } catch (error) {
                const fallback = 'Không thể tải hồ sơ. Vui lòng thử lại.';
                setErrorMessage(error instanceof ApiError ? error.message || fallback : fallback);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        void loadProfile();
    }, [user?.id]);

    useEffect(() => {
        if (!avatarUrl) {
            setAvatarThemeColor('#FF6B4A');
            return;
        }

        let isCancelled = false;
        const loadThemeColor = async () => {
            const nextColor = await deriveAvatarThemeColor(avatarUrl);
            if (!isCancelled) {
                setAvatarThemeColor(nextColor);
            }
        };

        void loadThemeColor();

        return () => {
            isCancelled = true;
        };
    }, [avatarUrl]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (pwFlow === 'otp' && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [pwFlow, countdown]);

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const getPasswordStrength = (pw: string) => {
        if (!pw) return { label: 'Trống', color: 'bg-gray-200', width: '0%' };

        const hasSpec = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
        const hasNumber = /[0-9]/.test(pw);
        const isLengthValid = pw.length > 6;

        let score = 0;
        if (isLengthValid) score += 1;
        if (hasSpec) score += 1;
        if (hasNumber) score += 1;

        if (score <= 1) return { label: 'Yếu', color: 'bg-red-500', width: '30%' };
        if (score === 2) return { label: 'Trung bình', color: 'bg-[#FCE38A]', width: '60%' };
        return { label: 'Mạnh', color: 'bg-[#10B981]', width: '100%' };
    };

    const strength = getPasswordStrength(pwState.new);

    const isPasswordValid =
        pwState.new.length > 6 &&
        /[0-9]/.test(pwState.new) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(pwState.new);

    const handleSaveProfile = async () => {
        if (!user) return;

        const token = authService.getToken();
        if (!token) {
            setErrorMessage('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            return;
        }

        if (user.role !== 'student') {
            setErrorMessage('Hiện tại chỉ hỗ trợ cập nhật hồ sơ học sinh.');
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            const payload = buildStudentUpdatePayload(formData);
            const updated = await profileService.updateMyStudentProfile(payload, avatarFile, token);

            setFormData(mapProfileToFormData(updated));
            setAvatarUrl(updated.avatarUrl || avatarUrl);
            setProfileId(resolveProfileId(updated));
            setAvatarFile(null);

            updateUser({
                ...user,
                name: updated.fullName || user.name,
                email: updated.email || user.email,
                avatarUrl: updated.avatarUrl || user.avatarUrl,
            });

            setIsProfileEditing(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            const fallback = 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.';
            setErrorMessage(error instanceof ApiError ? error.message || fallback : fallback);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelProfileEdit = () => {
        setIsProfileEditing(false);
        setAvatarFile(null);
        setErrorMessage('');
    };

    const handleStartPasswordChange = () => {
        setIsPasswordEditing(true);
        setPwFlow('idle');
        setPwState({ current: '', new: '', confirm: '' });
        setOtpInputs(['', '', '', '', '', '']);
        setErrorMessage('');
    };

    const handleCancelPasswordChange = () => {
        setIsPasswordEditing(false);
        setPwFlow('idle');
        setPwState({ current: '', new: '', confirm: '' });
        setOtpInputs(['', '', '', '', '', '']);
    };

    const handleSendOtp = async () => {
        const token = authService.getToken();
        if (!token) {
            setErrorMessage('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            return;
        }

        setPwFlow('sending');
        setErrorMessage('');

        try {
            await profileService.initChangePassword({ currentPassword: pwState.current }, token);
            setPwFlow('otp');
            setCountdown(90);
        } catch (error) {
            setPwFlow('idle');
            const fallback = 'Không thể gửi mã OTP. Vui lòng thử lại.';
            const apiMessage = error instanceof ApiError ? error.message || fallback : fallback;
            setErrorMessage(apiMessage);

            if (user?.id && isPasswordChangeLimited(apiMessage)) {
                const now = new Date();
                localStorage.setItem(`${PASSWORD_CHANGE_HISTORY_KEY}:${user.id}`, now.toISOString());
                setLastPasswordChangeDate(now);
            }
        }
    };

    const handleResendOtp = async () => {
        await handleSendOtp();
        setOtpInputs(['', '', '', '', '', '']);
    };

    const handleOtpChange = (index: number, value: string) => {
        // Prevent typing non-digits
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otpInputs];

        // Handle paste of multiple digits
        if (value.length > 1) {
            let pasteIndex = index;
            for (let i = 0; i < value.length && pasteIndex < 6; i++) {
                newOtp[pasteIndex] = value[i];
                pasteIndex++;
            }
            setOtpInputs(newOtp);
            const focusIndex = pasteIndex < 6 ? pasteIndex : 5;
            document.getElementById(`otp-${focusIndex}`)?.focus();
        } else {
            // Handle single digit typing
            newOtp[index] = value;
            setOtpInputs(newOtp);
            // Move to next input automatically if typing a digit
            if (value && index < 5) {
                document.getElementById(`otp-${index + 1}`)?.focus();
            }
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Move to prev input on backspace if current is empty
        if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleConfirmPasswordChange = async () => {
        const otpString = otpInputs.join('');
        if (otpString.length !== 6) return;

        const token = authService.getToken();
        if (!token) {
            setErrorMessage('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            return;
        }

        try {
            await profileService.confirmChangePassword({
                otpCode: otpString,
                newPassword: pwState.new,
                confirmPassword: pwState.confirm,
            }, token);

            const now = new Date();
            setPwFlow('success');
            setLastPasswordChangeDate(now);
            setErrorMessage('');
            if (user?.id) {
                localStorage.setItem(`${PASSWORD_CHANGE_HISTORY_KEY}:${user.id}`, now.toISOString());
            }
            setShowPasswordSuccess(true);
            setTimeout(() => setShowPasswordSuccess(false), 3000);
            handleCancelPasswordChange();
        } catch (error) {
            const apiMessage = error instanceof ApiError ? error.message : '';
            const fallback = 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại OTP.';
            setErrorMessage(apiMessage || fallback);
            if (user?.id && isPasswordChangeLimited(apiMessage)) {
                const now = new Date();
                localStorage.setItem(`${PASSWORD_CHANGE_HISTORY_KEY}:${user.id}`, now.toISOString());
                setLastPasswordChangeDate(now);
            }
        }
    };

    const closeOtpModal = () => {
        setPwFlow('idle');
        setOtpInputs(['', '', '', '', '', '']);
    };

    const renderActionButtons = () => {
        if (!isProfileEditing) {
            return (
                <button
                    onClick={() => setIsProfileEditing(true)}
                    disabled={isPasswordEditing}
                    className="px-6 py-2.5 bg-white border-2 border-[#1A1A1A] hover:bg-[#F7F7F2] transition-colors rounded-xl font-extrabold text-[#1A1A1A] text-sm flex items-center gap-2"
                >
                    <PencilSimple size={18} weight="bold" />
                    Chỉnh sửa hồ sơ
                </button>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={handleCancelProfileEdit}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-extrabold text-sm transition-colors"
                >
                    Hủy
                </button>
                <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[#FF6B4A] hover:bg-[#e5593c] text-white rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-lg disabled:cursor-not-allowed"
                >
                    {isSaving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                    Lưu thay đổi
                </button>
            </div>
        );
    };

    const renderField = (
        label: string,
        fieldKey: keyof typeof formData,
        value: string,
        Icon: any,
        type: 'text' | 'email' | 'tel' | 'date' | 'select' = 'text',
        selectOptions?: string[]
    ) => {
        const shouldTruncate = fieldKey === 'email' || fieldKey === 'address' || fieldKey === 'parentEmail';
        const baseDisplayValue = fieldKey === 'dateOfBirth' && value
            ? new Date(value).toLocaleDateString('vi-VN')
            : value;
        const displayValue = shouldTruncate ? truncateAfter20Chars(baseDisplayValue) : baseDisplayValue;

        if (!isProfileEditing) {
            return (
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</span>
                    <div className="flex items-center gap-3">
                        <Icon size={20} className="text-gray-400" />
                        <span className="font-extrabold text-[#1A1A1A] text-base" title={baseDisplayValue}>{displayValue}</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-widest ml-2">{label}</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FF6B4A] transition-colors z-10">
                        <Icon size={20} weight="bold" />
                    </div>
                    {type === 'select' ? (
                        <select
                            value={value}
                            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                            className="w-full bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 rounded-2xl pl-12 pr-5 py-4 font-bold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-all appearance-none cursor-pointer relative"
                        >
                            {(selectOptions || parentRelationOptions).map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={type}
                            value={value}
                            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                            className="w-full bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 rounded-2xl pl-12 pr-5 py-4 font-bold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-all"
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-8" style={{ fontFamily: "'Nunito', sans-serif" }}>

            {showSuccess && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#10B981] text-white px-6 py-3 rounded-2xl shadow-2xl font-extrabold flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
                    <Check size={20} weight="bold" />
                    Hồ sơ đã được lưu thành công!
                </div>
            )}

            {showPasswordSuccess && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-extrabold flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
                    <ShieldCheck size={20} weight="bold" />
                    Đổi mật khẩu thành công!
                </div>
            )}

            {errorMessage && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-extrabold text-sm animate-in slide-in-from-top-4 duration-300">
                    {errorMessage}
                </div>
            )}

            {isLoadingProfile && (
                <div className="bg-white border-2 border-[#1A1A1A] rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1A1A1A] rounded-full animate-spin" />
                    Đang tải hồ sơ...
                </div>
            )}

            {/* OTP Modal */}
            {pwFlow === 'otp' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A1A1A]/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-8 max-w-[400px] w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center relative">
                        <button
                            onClick={closeOtpModal}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-[#1A1A1A] transition-colors"
                        >
                            ✕
                        </button>

                        <div className="w-16 h-16 bg-orange-100/50 text-[#FF6B4A] rounded-2xl flex items-center justify-center mb-6 border-2 border-orange-100 border-dashed">
                            <EnvelopeSimple size={32} weight="fill" />
                        </div>

                        <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-2">Nhập mã xác thực</h3>
                        <p className="text-xs font-bold text-gray-400 text-center mb-8 px-4 leading-relaxed">
                            Mã OTP gồm 6 chữ số vừa được gửi tới email của bạn. Vui lòng kiểm tra hộp thư đến.
                        </p>

                        <div className="flex gap-2 justify-center mb-8 w-full">
                            {otpInputs.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className="w-10 h-12 md:w-12 md:h-14 text-center text-xl md:text-2xl font-extrabold bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 rounded-xl focus:border-[#FF6B4A] focus:outline-none focus:bg-white focus:shadow-sm transition-all caret-[#FF6B4A]"
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleConfirmPasswordChange}
                            disabled={otpInputs.join('').length < 6}
                            className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-extrabold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg"
                        >
                            Xác nhận Mật khẩu mới
                        </button>

                        <div className="mt-5 text-center flex flex-col items-center gap-1.5">
                            {countdown > 0 ? (
                                <p className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase">
                                    Gửi lại mã khả dụng sau: <span className="text-[#FF6B4A]">{formatTime(countdown)}</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendOtp}
                                    className="text-[11px] font-extrabold text-[#FF6B4A] cursor-pointer hover:text-[#e5593c] hover:underline transition-all tracking-widest uppercase"
                                >
                                    Gửi lại mã OTP
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Navigation */}
            <div className="flex items-center gap-5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 rounded-[20px] bg-white border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#F7F7F2] transition-colors shadow-sm cursor-pointer"
                >
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Hồ sơ của tôi</h1>
                    <p className="text-sm font-bold text-gray-500">Quản lý định danh và không gian học tập</p>
                </div>
            </div>

            {/* Banner & Avatar Card */}
            <div className="bg-white rounded-[40px] border-2 border-[#1A1A1A] overflow-hidden shadow-sm relative">
                {/* Banner Gradient */}
                <div className="h-32 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-300 relative" />

                {/* Content Container */}
                <div className="px-6 md:px-10 pb-8 pt-6 relative">
                    {/* Avatar Overlapping Banner */}
                    <div className="absolute -top-[52px] left-6 md:left-10">
                        <div
                            className={cn(
                                'w-[104px] h-[104px] rounded-[32px] bg-white border-[4px] border-white shadow-xl flex items-center justify-center relative overflow-hidden group',
                                !isProfileEditing && avatarUrl ? 'cursor-zoom-in' : '',
                            )}
                            onClick={() => {
                                if (!isProfileEditing && avatarUrl) {
                                    setShowAvatarPreview(true);
                                }
                            }}
                        >
                            <div
                                className="w-full h-full flex items-center justify-center text-white text-4xl font-extrabold"
                                style={{ backgroundColor: avatarThemeColor }}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    formData.name[0]
                                )}
                            </div>

                            {/* Overlay Upload (Chỉ hiện khi Edit Mode) */}
                            {isProfileEditing && (
                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                                    <Camera size={28} weight="fill" className="text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                const file = e.target.files[0];
                                                setAvatarFile(file);
                                                setAvatarUrl(URL.createObjectURL(file));
                                                setIsProfileEditing(true);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Top Right */}
                    <div className="flex justify-end mb-4 h-10">
                        {renderActionButtons()}
                    </div>

                    {/* Name & Role */}
                    <div className="mt-2 space-y-1">
                        <h2 className="text-2xl font-extrabold text-[#1A1A1A]">{formData.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-blue-100">
                                {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                            </span>
                            <span className="text-sm font-bold text-gray-400">
                                ID: {formatDisplayId(user?.role || 'student', profileId || user?.id)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {showAvatarPreview && avatarUrl && (
                <div
                    className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowAvatarPreview(false)}
                >
                    <div
                        className="relative max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden border-2 border-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img src={avatarUrl} alt="Avatar phóng to" className="w-full h-full object-contain bg-black" />
                        <button
                            onClick={() => setShowAvatarPreview(false)}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#1A1A1A] font-extrabold"
                        >
                            x
                        </button>
                    </div>
                </div>
            )}

            {/* Personal Info Forms */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] border-2 border-[#1A1A1A] shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-[#1A1A1A]/10 pb-5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserCircle size={24} weight="fill" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-[#1A1A1A]">Thông tin cá nhân</h3>
                        <p className="text-xs font-bold text-gray-400">Chi tiết liên lạc và thông tin cơ bản</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField('Họ và tên', 'name', formData.name, UserCircle)}
                    {renderField('Ngày sinh', 'dateOfBirth', formData.dateOfBirth, CalendarBlank, 'date')}
                    {renderField('Giới tính', 'gender', formData.gender, GenderIntersex, 'select', genderOptions)}
                    {renderField('Email cá nhân', 'email', formData.email, EnvelopeSimple)}
                    {renderField('Số điện thoại', 'phone', formData.phone, DeviceMobile)}
                    {renderField('Địa chỉ', 'address', formData.address, MapPinLine)}
                </div>

                {/* Parent Info */}
                <div className="pt-6 mt-4 border-t-2 border-dashed border-[#1A1A1A]/10">
                    <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
                        <Users size={20} weight="fill" className="text-[#FF6B4A]" />
                        <h4 className="text-sm font-extrabold uppercase tracking-widest">Thông tin phụ huynh</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderField('Họ tên phụ huynh', 'parentName', formData.parentName, UserCircle)}
                        {renderField('Mối quan hệ', 'parentRelation', formData.parentRelation, Users, 'select', parentRelationOptions)}
                        {renderField('SĐT phụ huynh', 'parentPhone', formData.parentPhone, DeviceMobile)}
                        {renderField('Email phụ huynh', 'parentEmail', formData.parentEmail, EnvelopeSimple)}
                    </div>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] border-2 border-[#1A1A1A] shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-[#1A1A1A]/10 pb-5">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <Lock size={24} weight="fill" />
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-[#1A1A1A]">Bảo mật & Mật khẩu</h3>
                        <p className="text-xs font-bold text-gray-400">Quản lý lớp bảo mật của tài khoản</p>
                    </div>
                </div>

                {!isPasswordEditing ? (
                    <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                        <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 max-w-md w-full">
                            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Mật khẩu hiện tại</span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Lock size={20} className="text-gray-400" />
                                    <span className="font-extrabold text-[#1A1A1A] text-xl tracking-[0.2em] mt-1">
                                        ••••••••
                                    </span>
                                </div>
                                <span className="text-[10px] font-extrabold text-emerald-600 px-3 py-1.5 bg-emerald-100 rounded-full border border-emerald-200 flex items-center gap-1 uppercase tracking-widest">
                                    <ShieldCheck size={14} weight="bold" />
                                    Bảo mật tốt
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleStartPasswordChange}
                            disabled={isProfileEditing}
                            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl font-extrabold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Đổi mật khẩu
                        </button>
                    </div>
                ) : (
                    <div className="p-6 rounded-3xl bg-gray-50 border-2 border-[#1A1A1A]/5 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-extrabold uppercase tracking-widest text-[#1A1A1A]">Đổi mật khẩu mới (Tùy chọn)</h4>
                            <button
                                onClick={handleCancelPasswordChange}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-extrabold text-gray-600 hover:bg-gray-100"
                            >
                                Hủy
                            </button>
                        </div>

                        {!canChangePassword ? (
                            <div className="bg-white border-2 border-dashed border-gray-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-12 h-12 bg-orange-100/50 text-orange-500 rounded-2xl flex items-center justify-center mb-2">
                                    <Lock size={24} weight="fill" />
                                </div>
                                <h4 className="font-extrabold text-[#1A1A1A]">Chưa thể thay đổi mật khẩu</h4>
                                <p className="text-xs font-bold text-gray-500 leading-relaxed max-w-xs">
                                    Hệ thống chỉ cho phép đổi mật khẩu <strong className="text-[#1A1A1A]">7 ngày</strong> một lần để đảm bảo an toàn.
                                </p>
                                <div className="mt-2 text-[11px] font-extrabold text-[#FF6B4A] bg-[#FF6B4A]/10 px-4 py-2 rounded-xl border border-[#FF6B4A]/20">
                                    Thử lại sau {daysRemaining} ngày
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-widest ml-1">Mật khẩu hiện tại</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full bg-white border-2 border-[#1A1A1A]/10 rounded-xl px-4 py-3 font-bold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-all disabled:opacity-50"
                                                placeholder="Nhập mật khẩu hiện tại"
                                                value={pwState.current}
                                                onChange={(e) => setPwState({ ...pwState, current: e.target.value })}
                                                disabled={pwFlow !== 'idle'}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-widest ml-1">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full bg-white border-2 border-[#1A1A1A]/10 rounded-xl px-4 py-3 font-bold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-all disabled:opacity-50"
                                                placeholder="Nhập mật khẩu mới"
                                                value={pwState.new}
                                                onChange={(e) => setPwState({ ...pwState, new: e.target.value })}
                                                disabled={pwFlow !== 'idle'}
                                            />
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A1A1A]"
                                                disabled={pwFlow !== 'idle'}
                                            >
                                                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-widest ml-1">Xác nhận mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="w-full bg-white border-2 border-[#1A1A1A]/10 rounded-xl px-4 py-3 font-bold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-all disabled:opacity-50"
                                                placeholder="Nhập lại mật khẩu mới"
                                                value={pwState.confirm}
                                                onChange={(e) => setPwState({ ...pwState, confirm: e.target.value })}
                                                disabled={pwFlow !== 'idle'}
                                            />
                                        </div>
                                        {pwState.confirm && pwState.new !== pwState.confirm && (
                                            <p className="text-[10px] font-extrabold text-red-500 ml-2 mt-1 relative flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-red-500" />
                                                Mật khẩu xác nhận không khớp!
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Password Rules Check */}
                                {pwState.new && pwFlow === 'idle' && (
                                    <div className="animate-in slide-in-from-top-2 space-y-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FCE38A]/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                                        <div className="space-y-2 relative z-10">
                                            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-widest">
                                                <span className="text-gray-400">Độ mạnh mật khẩu</span>
                                                <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-500", strength.color)}
                                                    style={{ width: strength.width }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5 pt-1 relative z-10">
                                            {[
                                                { text: 'Lớn hơn 6 ký tự', met: pwState.new.length > 6 },
                                                { text: 'Chứa ít nhất 1 chữ số', met: /[0-9]/.test(pwState.new) },
                                                { text: 'Chứa ít nhất 1 ký tự đặc biệt (@, #, !,...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(pwState.new) }
                                            ].map((tip, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300",
                                                        tip.met ? "bg-emerald-500" : "bg-gray-300"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-bold tracking-wide transition-colors duration-300",
                                                        tip.met ? "text-emerald-600" : "text-gray-500"
                                                    )}>{tip.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Next Logic Buttons */}
                                {pwFlow === 'idle' && pwState.current && pwState.new && pwState.confirm && (
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={!isPasswordValid || pwState.new !== pwState.confirm}
                                        className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-extrabold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        Xác nhận & Gửi OTP qua Email
                                    </button>
                                )}

                                {pwFlow === 'sending' && (
                                    <button disabled className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 opacity-70">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Đang gửi mã OTP...
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
