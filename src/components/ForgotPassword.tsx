import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail, ArrowLeft, ArrowRight, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle2, ShieldCheck, KeyRound, Timer,
  RefreshCw, PartyPopper
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';

/* ────────────────────── types ────────────────────── */
type Step = 'email' | 'otp' | 'reset' | 'success';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

/* ────────────────────── helpers ────────────────────── */
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 90; // 1 min 30 sec – matches backend expiry

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 3) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 3)}${'*'.repeat(Math.min(local.length - 3, 5))}@${domain}`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ─────────────────── component ─────────────────── */
export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  /* shared state */
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  /* OTP state */
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [resending, setResending] = useState(false);

  /* Reset password state */
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState(''); // stored after verify

  /* fade-in */
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* countdown timer */
  useEffect(() => {
    if (step !== 'otp' || isExpired) return;
    if (countdown <= 0) {
      setIsExpired(true);
      return;
    }
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [step, countdown, isExpired]);

  /* ─── email validation ─── */
  const validateEmail = (val: string): string | null => {
    if (!val.trim()) return 'Vui lòng nhập địa chỉ email.';
    if (!emailRegex.test(val)) return 'Định dạng email không hợp lệ.';
    return null;
  };

  /* ─── password validation ─── */
  const validatePasswords = (): string | null => {
    if (!newPassword) return 'Vui lòng nhập mật khẩu mới.';
    if (newPassword.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
    if (!passwordRegex.test(newPassword))
      return 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt.';
    if (!confirmPassword) return 'Vui lòng xác nhận mật khẩu mới.';
    if (newPassword !== confirmPassword) return 'Mật khẩu xác nhận không khớp.';
    return null;
  };

  /* ─── map backend error code to VN message ─── */
  const mapApiError = (err: unknown): string => {
    if (err instanceof ApiError) {
      const msg = err.message?.toUpperCase() ?? '';
      if (msg.includes('USER_NOT_FOUND') || msg.includes('1006'))
        return 'Email không tồn tại trong hệ thống.';
      if (msg.includes('INVALID_OTP_OR_EMAIL') || msg.includes('1063'))
        return 'Mã OTP hoặc email không chính xác.';
      if (msg.includes('OTP_EXPIRED') || msg.includes('1061'))
        return 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.';
      if (msg.includes('OTP_ALREADY_USED') || msg.includes('1062'))
        return 'Mã OTP đã được sử dụng.';
      if (msg.includes('PASSWORDS_NOT_MATCH') || msg.includes('1065'))
        return 'Mật khẩu xác nhận không khớp.';
      if (msg.includes('INVALID_PASSWORD') || msg.includes('1005'))
        return 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ cái và số.';
      return err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
    return 'Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.';
  };

  /* ─── Step 1: send OTP ─── */
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    setLoading(true);
    try {
      await api.post('/users/forgot-password', { email: email.trim() });
      setSuccess(`Mã xác nhận đã được gửi đến ${maskEmail(email)}. Vui lòng kiểm tra hộp thư của bạn.`);
      // reset OTP state
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(COUNTDOWN_SECONDS);
      setIsExpired(false);
      setTimeout(() => {
        setStep('otp');
        setSuccess('');
      }, 1200);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─── Resend OTP ─── */
  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setResending(true);
    try {
      await api.post('/users/forgot-password', { email: email.trim() });
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCountdown(COUNTDOWN_SECONDS);
      setIsExpired(false);
      setSuccess('Mã OTP mới đã được gửi đến email của bạn.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setResending(false);
    }
  };

  /* ─── OTP input handlers ─── */
  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const digit = value.slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otpDigits]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('');
    setOtpDigits((prev) => {
      const next = [...prev];
      digits.forEach((d, i) => { if (i < OTP_LENGTH) next[i] = d; });
      return next;
    });
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  }, []);

  /* ─── Step 2: verify OTP ─── */
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/verify-otp', { email: email.trim(), otpCode: code });
      setOtpCode(code);
      setSuccess('Mã OTP hợp lệ!');
      setTimeout(() => {
        setStep('reset');
        setSuccess('');
      }, 800);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step 3: reset password ─── */
  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const passErr = validatePasswords();
    if (passErr) { setError(passErr); return; }

    setLoading(true);
    try {
      await api.post('/users/reset-password', {
        email: email.trim(),
        otpCode,
        newPassword,
        confirmPassword,
      });
      setStep('success');
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  };

  /* ─── step indicator ─── */
  const stepConfig: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
    { key: 'otp', label: 'Xác nhận', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: 'reset', label: 'Mật khẩu', icon: <KeyRound className="w-3.5 h-3.5" /> },
  ];
  const currentIdx = stepConfig.findIndex((s) => s.key === step);

  /* ─── password strength indicator ─── */
  const getPasswordStrength = (): { score: number; label: string; color: string } => {
    if (!newPassword) return { score: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) score++;

    if (score <= 2) return { score, label: 'Yếu', color: '#ef4444' };
    if (score <= 3) return { score, label: 'Trung bình', color: '#f59e0b' };
    if (score <= 4) return { score, label: 'Khá', color: '#3b82f6' };
    return { score, label: 'Mạnh', color: '#22c55e' };
  };
  const strength = getPasswordStrength();

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4 transition-all duration-700 relative',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        fontFamily: "'Nunito', sans-serif",
        backgroundColor: isDark ? '#465C88' : '#F7F7F2',
        backgroundImage: isDark
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23FFFFFF' fill-opacity='0.05' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`
            : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`,
        backgroundBlendMode: 'normal',
      }}
    >
      <div className="absolute top-5 right-5 md:top-7 md:right-8 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <div className={cn(
        'w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] border transition-colors duration-300',
        isDark ? 'border-white/10' : 'border-[#1A1A1A]/8'
      )}>

        {/* ── LEFT PANEL – dark (matching Login) ── */}
        <div className={cn(
          'relative flex flex-col justify-between p-10 md:w-5/12 overflow-hidden transition-colors duration-300',
          isDark ? 'bg-[#141a24]' : 'bg-[#1A1A1A]'
        )}>
          {/* Decorative shapes */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-48 -right-12 w-56 h-56 rounded-full bg-[#FF6B4A]/10" />
          <div className="absolute -bottom-20 left-4 w-52 h-52 rounded-full bg-[#B8B5FF]/10" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <img src="/logo.svg" alt="Slothub" className="w-20 rounded-xl bg-white" />
            <span className="text-white text-2xl font-extrabold tracking-tight">Sloth
              <span className="text-[#FF6B4A]">ub</span>
            </span>
          </div>

          {/* Main copy */}
          <div className="relative z-10 space-y-4 my-8">
            <h2 className="text-white text-3xl font-extrabold leading-tight">
              Khôi phục<br />
              <span className="text-[#FF6B4A]">Tài khoản</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed font-semibold">
              Đừng lo lắng! Chỉ cần vài bước đơn giản, bạn sẽ lấy lại quyền truy cập tài khoản của mình.
            </p>
          </div>

          {/* Step progress */}
          {step !== 'success' && (
            <div className="relative z-10 space-y-3">
              {stepConfig.map((s, i) => {
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all duration-300 ${
                      isActive
                        ? 'bg-[#FF6B4A]/15 border-[#FF6B4A]/40'
                        : isDone
                          ? 'bg-white/8 border-emerald-500/30'
                          : 'bg-white/5 border-white/10 opacity-50'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-[#FF6B4A]' : isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : s.icon}
                    </span>
                    <span className={`text-sm font-bold ${isActive ? 'text-white' : isDone ? 'text-emerald-300' : 'text-gray-500'}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Success panel illustration */}
          {step === 'success' && (
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center animate-bounce">
                <PartyPopper className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-emerald-300 font-bold text-sm text-center">Mật khẩu đã được đặt lại!</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL – white ── */}
        <div className={cn(
          'flex-1 flex flex-col justify-center px-10 py-10 transition-colors duration-300',
          isDark ? 'bg-[#1b2230]' : 'bg-white'
        )}>

          {/* ──── STEP: EMAIL ──── */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <button
                  onClick={onBackToLogin}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-[#FF6B4A] transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
                </button>
                <h1 className={cn('text-2xl font-extrabold', isDark ? 'text-white' : 'text-[#1A1A1A]')}>Quên mật khẩu</h1>
                <p className={cn('text-sm mt-1 font-semibold', isDark ? 'text-gray-400' : 'text-gray-400')}>
                  Nhập địa chỉ email liên kết với tài khoản của bạn.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 font-semibold">{success}</p>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-extrabold text-[#1A1A1A] mb-2">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] bg-gray-50 focus:bg-white transition-all"
                      placeholder="email@example.com"
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] active:bg-[#e04d30] text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B4A]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang gửi mã...
                    </>
                  ) : (
                    <>
                      Gửi mã xác nhận
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ──── STEP: OTP ──── */}
          {step === 'otp' && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-[#FF6B4A] transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" /> Thay đổi email
                </button>
                <h1 className={cn('text-2xl font-extrabold', isDark ? 'text-white' : 'text-[#1A1A1A]')}>Xác nhận mã OTP</h1>
                <p className={cn('text-sm mt-1 font-semibold', isDark ? 'text-gray-400' : 'text-gray-400')}>
                  Mã OTP đã được gửi đến: <span className="text-[#FF6B4A] font-extrabold">{maskEmail(email)}</span>
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700 font-semibold">{success}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* OTP digit inputs */}
                <div>
                  <label className="block text-sm font-extrabold text-[#1A1A1A] mb-3">Nhập mã 6 chữ số</label>
                  <div className="flex gap-2.5 justify-center">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className={`w-12 h-14 text-center text-xl font-extrabold border-2 rounded-2xl bg-gray-50 focus:bg-white transition-all focus:outline-none ${
                          digit
                            ? 'border-[#FF6B4A] text-[#1A1A1A] ring-2 ring-[#FF6B4A]/20'
                            : 'border-gray-200 text-gray-400 focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/20'
                        }`}
                        disabled={isExpired}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                {/* Countdown / Expired */}
                <div className="flex items-center justify-center gap-2">
                  {isExpired ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-red-500 font-bold flex items-center gap-1.5">
                        <Timer className="w-4 h-4" />
                        Mã OTP đã hết hạn.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending}
                        className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {resending ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-[#FF6B4A] border-t-transparent rounded-full animate-spin" />
                            Đang gửi lại...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Gửi lại mã
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 font-semibold flex items-center gap-1.5">
                      <Timer className="w-4 h-4" />
                      Mã có hiệu lực trong{' '}
                      <span className={`font-extrabold tabular-nums ${countdown <= 30 ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
                        {formatCountdown(countdown)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Resend when not expired */}
                {!isExpired && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400 font-semibold">
                      Không nhận được mã?{' '}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending}
                        className="text-[#FF6B4A] hover:text-[#ff5535] font-extrabold transition-colors disabled:opacity-60"
                      >
                        {resending ? 'Đang gửi...' : 'Gửi lại'}
                      </button>
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || isExpired || otpDigits.join('').length !== OTP_LENGTH}
                  className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] active:bg-[#e04d30] text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B4A]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xác nhận...
                    </>
                  ) : (
                    <>
                      Xác nhận OTP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ──── STEP: RESET PASSWORD ──── */}
          {step === 'reset' && (
            <>
              <div className="mb-6">
                <h1 className={cn('text-2xl font-extrabold', isDark ? 'text-white' : 'text-[#1A1A1A]')}>Đặt lại mật khẩu mới</h1>
                <p className={cn('text-sm mt-1 font-semibold', isDark ? 'text-gray-400' : 'text-gray-400')}>
                  Tạo mật khẩu mới cho tài khoản <span className="text-[#FF6B4A] font-extrabold">{maskEmail(email)}</span>
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New password */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-extrabold text-[#1A1A1A] mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] bg-gray-50 focus:bg-white transition-all"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B4A] transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password note */}
                  <p className="mt-1.5 text-xs text-gray-400 font-semibold leading-relaxed">
                    (Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.)
                  </p>
                  {/* Strength bar */}
                  {newPassword && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className="h-1.5 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: level <= strength.score ? strength.color : '#e5e7eb',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-bold" style={{ color: strength.color }}>
                        Độ mạnh: {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-extrabold text-[#1A1A1A] mb-2">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      className={`w-full pl-10 pr-11 py-3 border rounded-2xl text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] bg-gray-50 focus:bg-white transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300'
                          : confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-300'
                            : 'border-gray-200'
                      }`}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B4A] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1.5 text-xs text-red-500 font-semibold">Mật khẩu xác nhận không khớp.</p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="mt-1.5 text-xs text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mật khẩu khớp
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] active:bg-[#e04d30] text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B4A]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang đặt lại...
                    </>
                  ) : (
                    <>
                      Đặt lại mật khẩu
                      <KeyRound className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ──── STEP: SUCCESS ──── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Thành công!</h1>
              <p className="text-gray-500 text-sm font-semibold mb-2 max-w-xs leading-relaxed">
                Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <p className="text-xs text-gray-400 font-semibold mb-8">
                Tài khoản: <span className="text-[#FF6B4A] font-extrabold">{maskEmail(email)}</span>
              </p>

              <button
                onClick={onBackToLogin}
                className="bg-[#FF6B4A] hover:bg-[#ff5535] active:bg-[#e04d30] text-white px-8 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-[#FF6B4A]/25 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
