import { useState, useEffect } from 'react';
import { confirmSignIn, fetchAuthSession, getCurrentUser, signIn } from 'aws-amplify/auth';
import { User as UserIcon, Lock, AlertCircle, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { ArrowRight, ShieldCheck, Lightning, GraduationCap, Student as StudentIcon, Shield } from '@phosphor-icons/react';
import type { QuickLoginRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import type { User } from '../types/auth';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
// import { ApiError } from '../services/api';        // OLD: used for typed error handling on local auth
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';

interface LoginProps {
  onSwitchToForgotPassword: () => void;
}

type JwtPayload = {
  sub?: string;
  username?: string;
  email?: string;
  name?: string;
  fullName?: string;
  role?: string;
  scope?: string;
  roles?: string[];
  authorities?: string[];
  'custom:role'?: string;
};

type AccountStatusResponse = {
  result?: {
    locked?: boolean;
  };
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function toRole(input: unknown): User['role'] {
  const role = String(input ?? '').toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('teacher')) return 'teacher';
  return 'student';
}

function isLockedAccountError(err: unknown): boolean {
  const errorName = err instanceof Error ? err.name : '';
  const errorMessage = err instanceof Error ? err.message : String(err ?? '');
  const normalized = `${errorName} ${errorMessage}`.toLowerCase();

  return (
    normalized.includes('userdisabledexception') ||
    normalized.includes('account_locked') ||
    normalized.includes('user_inactive') ||
    normalized.includes('tai khoan cua ban da bi khoa') ||
    normalized.includes('tài khoản của bạn đã bị khóa') ||
    normalized.includes('bi khoa') ||
    normalized.includes('bị khóa') ||
    normalized.includes('locked')
  );
}

async function checkLockedFromBackend(identifier: string): Promise<boolean> {
  const normalized = identifier.trim();
  if (!normalized) return false;

  try {
    const endpoint = `/auth/account-status?identifier=${encodeURIComponent(normalized)}`;
    const response = await api.get<AccountStatusResponse>(endpoint);
    return response?.result?.locked === true;
  } catch {
    return false;
  }
}

export function Login({ onSwitchToForgotPassword }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [requireNewPassword, setRequireNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAmplifySession = async () => {
      try {
        await getCurrentUser();
        if (cancelled) return;
        await completeLoginFromSession('User');
        if (cancelled) return;
        navigate('/', { replace: true });
      } catch {
        // No active Cognito user; keep showing login form.
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    };

    void bootstrapAmplifySession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const completeLoginFromSession = async (fallbackUsername: string) => {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString() ?? '';
    const idToken = session.tokens?.idToken?.toString() ?? '';

    if (!accessToken || !idToken) {
      throw new Error('Không thể lấy phiên đăng nhập từ Cognito.');
    }

    const payload = decodeJwtPayload(idToken);
    const roleCandidate =
      payload?.['custom:role'] ??
      payload?.role ??
      (Array.isArray(payload?.roles) ? payload?.roles[0] : undefined) ??
      (Array.isArray(payload?.authorities) ? payload?.authorities[0] : undefined) ??
      payload?.scope?.split(/\s+/).find(Boolean);

    const user: User = {
      id: String(payload?.sub ?? ''),
      email: String(payload?.email ?? ''),
      name: String(payload?.name ?? payload?.fullName ?? payload?.username ?? fallbackUsername ?? 'User'),
      role: toRole(roleCandidate),
    };

    login(accessToken, user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    setLoading(true);

    // OLD: local backend authentication (commented — replaced by Cognito Hosted UI):
    // try {
    //   const response = await authService.login({ username, password });
    //   login(response.token, response.user);
    // } catch (err) {
    //   if (err instanceof ApiError) {
    //     if (err.message === 'ACCOUNT_LOCKED') {
    //       setIsLocked(true);
    //     } else if (err.status === 0) {
    //       setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
    //     } else if (err.status === 401 || err.status === 403) {
    //       setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    //     } else {
    //       setError(err.message);
    //     }
    //   } else {
    //     setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    //   }
    // } finally {
    //   setLoading(false);
    // }

    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });

      if (String(nextStep?.signInStep).includes('NEW_PASSWORD')) {
        setRequireNewPassword(true);
        return;
      }

      if (isSignedIn) {
        await completeLoginFromSession(username);
        return;
      }

      setError('Không thể hoàn tất đăng nhập. Vui lòng thử lại.');
    } catch (err) {
      const errName = err instanceof Error ? err.name : '';
      const errMessage = err instanceof Error ? err.message : String(err ?? '');

      if (errMessage.includes('already a signed in user')) {
        await completeLoginFromSession(username || 'User');
        navigate('/', { replace: true });
        return;
      }

      if (err instanceof Error) {
        if (isLockedAccountError(err)) {
          setIsLocked(true);
          setError('');
        } else if (errName === 'UserNotConfirmedException' || err.message.includes('UserNotConfirmedException') || err.message.includes('chưa được xác nhận')) {
          setError('Tài khoản chưa được xác nhận. Vui lòng kiểm tra email để xác nhận tài khoản.');
        } else if (errName === 'NotAuthorizedException' || err.message.includes('NotAuthorizedException') || err.message.includes('không đúng')) {
          const isLockedByStatus = await checkLockedFromBackend(username);
          if (isLockedByStatus) {
            setIsLocked(true);
            setError('');
          } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng.');
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    setLoading(true);

    try {
      const { isSignedIn } = await confirmSignIn({ challengeResponse: newPassword });

      if (isSignedIn) {
        setRequireNewPassword(false);
        setNewPassword('');
        await completeLoginFromSession(username);
        return;
      }

      setError('Không thể xác nhận mật khẩu mới. Vui lòng thử lại.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = async (_role: QuickLoginRole) => {
    setError('');
    setIsLocked(false);
    setLoading(true);

    // OLD: bypass backend with hardcoded demo credentials (commented):
    // try {
    //   const response = await authService.quickDemoLogin(role);
    //   login(response.token, response.user);
    // } catch (err) {
    //   if (err instanceof ApiError) {
    //     setError(err.message || 'Không thể đăng nhập nhanh.');
    //   } else {
    //     setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    //   }
    // } finally {
    //   setLoading(false);
    // }

    setLoading(false);
    setError('Vui lòng nhập tài khoản và mật khẩu để đăng nhập.');
  };

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4 transition-opacity duration-700 relative',
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

        {/* ── LEFT PANEL – dark ── */}
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
            <img src="/logo.svg" alt="SlothubEdu" className="w-16 rounded-xl bg-white" />
            <span className="text-white text-2xl font-extrabold tracking-tight">Slothub
              <span className="text-[#FF6B4A]">Edu</span>
            </span>
          </div>

          {/* Main copy */}
          <div className="relative z-10 space-y-4 my-8">
            <h2 className="text-white text-3xl font-extrabold leading-tight">
              Hệ thống<br />
              <span className="text-[#FF6B4A]">Quản lý Giáo dục</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed font-semibold">
              Trải nghiệm giải pháp công nghệ giáo dục đồng bộ, hiện đại và bảo mật tuyệt đối.
            </p>
          </div>

          {/* Feature badges */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 border border-white/10">
              <ShieldCheck className="w-5 h-5 text-[#FF6B4A] shrink-0" weight="fill" />
              <span className="text-white text-sm font-bold">Bảo mật đa tầng</span>
            </div>
            <div className="flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 border border-white/10">
              <Lightning className="w-5 h-5 text-[#FCE38A] shrink-0" weight="fill" />
              <span className="text-white text-sm font-bold">Hiệu năng tối ưu</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL – white ── */}
        <div className={cn(
          'flex-1 flex flex-col justify-center px-10 py-10 transition-colors duration-300',
          isDark ? 'bg-[#1b2230]' : 'bg-white'
        )}>
          <div className="mb-8">
            <h1 className={cn('text-2xl font-extrabold', isDark ? 'text-white' : 'text-[#1A1A1A]')}>Chào mừng trở lại</h1>
            <p className={cn('text-sm mt-1 font-semibold', isDark ? 'text-gray-400' : 'text-gray-400')}>Vui lòng nhập thông tin để truy cập hệ thống</p>
          </div>

          {isLocked && (
            <div className="mb-5 p-4 bg-orange-50 border-2 border-orange-300 rounded-2xl flex items-start gap-3">
              <ShieldOff className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-extrabold text-orange-700">Tài khoản bị khóa</p>
                <p className="text-xs font-semibold text-orange-600 mt-0.5">
                  Tài khoản của bạn tạm thời bị khóa. Liên hệ quản trị viên để mở lại.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {checkingSession && (
            <p className={cn('mb-4 text-xs font-semibold', isDark ? 'text-gray-400' : 'text-gray-500')}>
              Dang kiem tra phien dang nhap...
            </p>
          )}

          {/* Form UI is unchanged; submit now authenticates directly with Cognito via Amplify signIn(). */}
          {requireNewPassword ? (
            <form onSubmit={handleConfirmNewPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className={cn('block text-sm font-extrabold mb-2', isDark ? 'text-gray-100' : 'text-[#1A1A1A]')}>
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className={cn('absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4', isDark ? 'text-gray-500' : 'text-gray-400')} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-11 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] transition-all',
                      isDark
                        ? 'border-white/15 text-white bg-[#111722] focus:bg-[#111722]'
                        : 'border-gray-200 text-[#1A1A1A] bg-gray-50 focus:bg-white'
                    )}
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={cn(
                      'absolute right-4 top-1/2 -translate-y-1/2 hover:text-[#FF6B4A] transition-colors',
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    )}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                    Đang xác nhận...
                  </>
                ) : (
                  <>
                    Xác nhận đổi mật khẩu
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className={cn('block text-sm font-extrabold mb-2', isDark ? 'text-gray-100' : 'text-[#1A1A1A]')}>
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative">
                <UserIcon className={cn('absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4', isDark ? 'text-gray-500' : 'text-gray-400')} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={checkingSession}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] transition-all',
                    isDark
                      ? 'border-white/15 text-white bg-[#111722] focus:bg-[#111722]'
                      : 'border-gray-200 text-[#1A1A1A] bg-gray-50 focus:bg-white'
                  )}
                  placeholder="username@school.edu.vn"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={cn('block text-sm font-extrabold mb-2', isDark ? 'text-gray-100' : 'text-[#1A1A1A]')}>
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className={cn('absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4', isDark ? 'text-gray-500' : 'text-gray-400')} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={checkingSession}
                  className={cn(
                    'w-full pl-10 pr-11 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] transition-all',
                    isDark
                      ? 'border-white/15 text-white bg-[#111722] focus:bg-[#111722]'
                      : 'border-gray-200 text-[#1A1A1A] bg-gray-50 focus:bg-white'
                  )}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={cn(
                    'absolute right-4 top-1/2 -translate-y-1/2 hover:text-[#FF6B4A] transition-colors',
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  )}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={onSwitchToForgotPassword} className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535] transition-colors">
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || checkingSession}
              className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] active:bg-[#e04d30] text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B4A]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập hệ thống
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            </form>
          )}

          {/* Quick role login */}
          {!requireNewPassword && <div className="mt-8">
            <p className={cn('text-center text-xs font-extrabold uppercase tracking-widest mb-4', isDark ? 'text-gray-500' : 'text-gray-400')}>
              Hoặc chọn vai trò
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Quản trị', icon: <Shield className="w-5 h-5" weight="fill" />, role: 'admin' as const },
                { label: 'Giáo viên', icon: <GraduationCap className="w-5 h-5" weight="fill" />, role: 'teacher' as const },
                { label: 'Học sinh', icon: <StudentIcon className="w-5 h-5" weight="fill" />, role: 'student' as const },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickRoleLogin(item.role)}
                  disabled={loading}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 border rounded-2xl font-extrabold text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
                    isDark
                      ? 'border-white/10 bg-[#111722] hover:bg-[#151d2a] text-white'
                      : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                  )}
                >
                  <span className="text-[#FF6B4A]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>}

          <div className="mt-6 text-center">
            <p className={cn('text-sm font-semibold', isDark ? 'text-gray-400' : 'text-gray-400')}>
              Cần hỗ trợ kỹ thuật?{' '}
              <button onClick={onSwitchToForgotPassword} className="text-[#FF6B4A] hover:text-[#ff5535] font-extrabold transition-colors">
                Trung tâm trợ giúp
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
