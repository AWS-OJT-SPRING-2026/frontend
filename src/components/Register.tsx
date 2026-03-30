import { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle, Eye, EyeOff, Phone } from 'lucide-react';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '../lib/utils';
import {
  mapBackendRegisterErrorToField,
  type RegisterField,
  type RegisterFormValues,
  validateRegister,
  validateRegisterRequired,
} from '../validation/registerValidation';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { theme } = useSettings();
  const isDark = theme === 'dark';

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const values: RegisterFormValues = {
    username,
    password,
    confirmPassword,
    fullName: name,
    email,
    phone,
  };

  const setFieldTouched = (field: RegisterField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateAndSetErrors = (nextValues: RegisterFormValues, onlyFields?: RegisterField[]) => {
    const all = validateRegister(nextValues);

    if (!onlyFields) {
      setFieldErrors(all);
      return all;
    }

    setFieldErrors((prev) => {
      const copy = { ...prev };
      for (const f of onlyFields) {
        if (all[f]) copy[f] = all[f];
        else delete copy[f];
      }
      return copy;
    });

    return all;
  };

  const validateRequiredAndSetError = (field: RegisterField, nextValues: RegisterFormValues) => {
    const msg = validateRegisterRequired(field, nextValues);

    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (msg) copy[field] = msg;
      else delete copy[field];
      return copy;
    });

    return msg;
  };

  const showError = (field: RegisterField) => {
    // Required errors: show when field touched
    // Other validation errors: show only after submitAttempted
    // Exception: confirmPassword mismatch should show as soon as confirmPassword is touched
    const hasError = Boolean(touched[field] && fieldErrors[field]);
    if (!hasError) return false;

    const requiredMsg = validateRegisterRequired(field, values);
    const isRequiredError = Boolean(requiredMsg && requiredMsg === fieldErrors[field]);

    if (field === 'confirmPassword') {
      return true;
    }

    return isRequiredError || submitAttempted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    setSubmitAttempted(true);

    // mark all as touched so required errors show
    setTouched({
      username: true,
      password: true,
      confirmPassword: true,
      fullName: true,
      email: true,
      phone: true,
    });

    const errs = validateAndSetErrors(values);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);

    try {
      await authService.register({
        username: username.trim(),
        password,
        fullName: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        // roleId in DB. Assumption: 2 = STUDENT (adjust if your DB differs)
        roleId: 2,
      });
      setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
      // Không tự chuyển sang màn hình đăng nhập.
      // Người dùng có thể bấm "Đăng nhập ngay" bên dưới khi sẵn sàng.
    } catch (err) {
      if (err instanceof ApiError) {
        const field = mapBackendRegisterErrorToField(err.message);
        if (field) {
          setTouched((prev) => ({ ...prev, [field]: true }));
          setFieldErrors((prev) => ({ ...prev, [field]: err.message }));
          // show backend validation immediately even if not submitted again
          setSubmitAttempted(true);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

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
      <div
        className={cn(
          "w-full max-w-lg lg:max-w-xl transform transition-all duration-700",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-400 to-green-400 rounded-2xl blur-xl opacity-25 animate-pulse"></div>
        <div className="relative bg-white/70 border border-white/40 rounded-2xl shadow-2xl p-10 backdrop-blur-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-4 shadow-lg animate-bounce">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Đăng Ký</h2>
            <p className="text-gray-600 mt-2 font-medium">Tạo tài khoản và bắt đầu học tập</p>
          </div>

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {formError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="group">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setName(v);
                    if (submitAttempted) validateAndSetErrors({ ...values, fullName: v }, ['fullName']);
                  }}
                  onBlur={() => {
                    setFieldTouched('fullName');
                    validateRequiredAndSetError('fullName', values);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('fullName') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                />
              </div>
              {showError('fullName') && <p className="mt-2 text-sm text-red-600">{fieldErrors.fullName}</p>}
            </div>

            <div className="group">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Số điện thoại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    // only keep digits, limit 11
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhone(v);
                    if (submitAttempted) validateAndSetErrors({ ...values, phone: v }, ['phone']);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = (e.clipboardData || (window as any).clipboardData).getData('text');
                    const v = (text ?? '').replace(/\D/g, '').slice(0, 11);
                    const next = (phone + v).slice(0, 11);
                    setPhone(next);
                    if (submitAttempted) validateAndSetErrors({ ...values, phone: next }, ['phone']);
                  }}
                  onBlur={() => {
                    setFieldTouched('phone');
                    if (submitAttempted) validateAndSetErrors(values, ['phone']);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('phone') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="0xxxxxxxxx"
                />
              </div>
              {showError('phone') && <p className="mt-2 text-sm text-red-600">{fieldErrors.phone}</p>}
            </div>

            <div className="group">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUsername(v);
                    if (submitAttempted) validateAndSetErrors({ ...values, username: v }, ['username']);
                  }}
                  onBlur={() => {
                    setFieldTouched('username');
                    validateRequiredAndSetError('username', values);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('username') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                />
              </div>
              {showError('username') && <p className="mt-2 text-sm text-red-600">{fieldErrors.username}</p>}
            </div>

            <div className="group">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmail(v);
                    if (submitAttempted) validateAndSetErrors({ ...values, email: v }, ['email']);
                  }}
                  onBlur={() => {
                    setFieldTouched('email');
                    validateRequiredAndSetError('email', values);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('email') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="email@gmail.com"
                  autoComplete="email"
                />
              </div>
              {showError('email') && <p className="mt-2 text-sm text-red-600">{fieldErrors.email}</p>}
            </div>

            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPassword(v);
                    if (submitAttempted || touched.confirmPassword) {
                      validateAndSetErrors({ ...values, password: v }, ['password', 'confirmPassword']);
                    }
                  }}
                  onBlur={() => {
                    setFieldTouched('password');
                    validateRequiredAndSetError('password', values);
                    if (submitAttempted || touched.confirmPassword) validateAndSetErrors(values, ['password', 'confirmPassword']);
                  }}
                  className={`block w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('password') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-gray-400 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {showError('password') && <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>}
            </div>

            <div className="group">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-green-600 transition-colors">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CheckCircle className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    const v = e.target.value;
                    setConfirmPassword(v);
                    if (submitAttempted || touched.confirmPassword) {
                      validateAndSetErrors({ ...values, confirmPassword: v }, ['confirmPassword']);
                    }
                  }}
                  onBlur={() => {
                    setFieldTouched('confirmPassword');
                    validateRequiredAndSetError('confirmPassword', values);
                    // Validate mismatch immediately after user finishes this field
                    validateAndSetErrors(values, ['confirmPassword']);
                  }}
                  className={`block w-full pl-10 pr-10 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-500 hover:border-green-400 transition-all bg-gray-50 focus:bg-white ${
                    showError('confirmPassword') ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="text-gray-400 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {showError('confirmPassword') && <p className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-bold hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all disabled:from-green-400 disabled:to-green-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng Ký'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Đã có tài khoản?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-green-600 hover:text-green-700 font-bold transition-colors hover:underline"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}