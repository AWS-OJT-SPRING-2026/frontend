import { useState, useEffect } from 'react';
import { User as UserIcon, Lock, AlertCircle, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { ArrowRight, ShieldCheck, Lightning, GraduationCap, Student as StudentIcon, Shield } from '@phosphor-icons/react';
import { authService, type QuickLoginRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ApiError } from '../services/api';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';

interface LoginProps {
  onSwitchToForgotPassword: () => void;
}

export function Login({ onSwitchToForgotPassword }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    setLoading(true);
    try {
      const response = await authService.login({ username, password });
      login(response.token, response.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === 'ACCOUNT_LOCKED') {
          setIsLocked(true);
        } else if (err.status === 401 || err.status === 403) {
          setError('Tên đăng nhập hoặc mật khẩu không đúng.');
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

  const handleQuickRoleLogin = async (role: QuickLoginRole) => {
    setError('');
    setIsLocked(false);
    setLoading(true);

    try {
      const response = await authService.quickDemoLogin(role);
      login(response.token, response.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Không thể đăng nhập nhanh.');
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
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
                  Tài khoản của bạn đã bị khóa. Vui lòng liên hệ giáo viên hoặc trung tâm để được mở khóa.
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
                  className={cn(
                    'w-full pl-10 pr-4 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] transition-all',
                    isDark
                      ? 'border-white/15 text-white bg-[#111722] focus:bg-[#111722]'
                      : 'border-gray-200 text-[#1A1A1A] bg-gray-50 focus:bg-white'
                  )}
                  placeholder="username@school.edu.vn"
                  required
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
                  className={cn(
                    'w-full pl-10 pr-11 py-3 border rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] transition-all',
                    isDark
                      ? 'border-white/15 text-white bg-[#111722] focus:bg-[#111722]'
                      : 'border-gray-200 text-[#1A1A1A] bg-gray-50 focus:bg-white'
                  )}
                  placeholder="••••••••"
                  required
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
              disabled={loading}
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

          {/* Quick role login */}
          <div className="mt-8">
            <p className={cn('text-center text-xs font-extrabold uppercase tracking-widest mb-4', isDark ? 'text-gray-500' : 'text-gray-400')}>
              Hoặc chọn vai trò
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Quản trị', icon: <Shield className="w-5 h-5" weight="fill" />, role: 'admin' as const },
                { label: 'Giáo viên', icon: <GraduationCap className="w-5 h-5" weight="fill" />, role: 'teacher' as const },
                { label: 'Học sinh', icon: <StudentIcon className="w-5 h-5" weight="fill" />, role: 'student' as const },
              ].map((role) => (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => handleQuickRoleLogin(role.role)}
                  disabled={loading}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 border rounded-2xl font-extrabold text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed',
                    isDark
                      ? 'border-white/10 bg-[#111722] hover:bg-[#151d2a] text-white'
                      : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-[#1A1A1A]'
                  )}
                >
                  <span className="text-[#FF6B4A]">{role.icon}</span>
                  {role.label}
                </button>
              ))}
            </div>
          </div>

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
