import { useState, useEffect } from 'react';
import { User as UserIcon, Lock, AlertCircle, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { ArrowRight, ShieldCheck, Lightning, GraduationCap, Student as StudentIcon, Shield } from '@phosphor-icons/react';
import { authService, type QuickLoginRole } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function Login({ onSwitchToRegister, onSwitchToForgotPassword }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();

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
      className={`min-h-screen flex items-center justify-center bg-[#F7F7F2] p-4 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px]">

        {/* ── LEFT PANEL – dark ── */}
        <div className="relative flex flex-col justify-between p-10 md:w-5/12 bg-[#1A1A1A] overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-48 -right-12 w-56 h-56 rounded-full bg-[#FF6B4A]/10" />
          <div className="absolute -bottom-20 left-4 w-52 h-52 rounded-full bg-[#B8B5FF]/10" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <img src="/logo.svg" alt="AntiEdu" className="w-20 rounded-xl bg-white" />
            <span className="text-white text-2xl font-extrabold tracking-tight">Anti
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
        <div className="flex-1 bg-white flex flex-col justify-center px-10 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Chào mừng trở lại</h1>
            <p className="text-gray-400 text-sm mt-1 font-semibold">Vui lòng nhập thông tin để truy cập hệ thống</p>
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
              <label htmlFor="username" className="block text-sm font-extrabold text-[#1A1A1A] mb-2">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] bg-gray-50 focus:bg-white transition-all"
                  placeholder="username@school.edu.vn"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-extrabold text-[#1A1A1A] mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30 focus:border-[#FF6B4A] bg-gray-50 focus:bg-white transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B4A] transition-colors"
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
            <p className="text-center text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">
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
                  className="flex flex-col items-center gap-1.5 py-3 px-2 border border-gray-100 bg-gray-50 hover:bg-gray-100 text-[#1A1A1A] rounded-2xl font-extrabold text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="text-[#FF6B4A]">{role.icon}</span>
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm font-semibold">
              Cần hỗ trợ kỹ thuật?{' '}
              <button onClick={onSwitchToRegister} className="text-[#FF6B4A] hover:text-[#ff5535] font-extrabold transition-colors">
                Trung tâm trợ giúp
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
