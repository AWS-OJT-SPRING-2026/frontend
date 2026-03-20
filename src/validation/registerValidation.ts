import type { RegisterRequest } from '../types/auth';

export type RegisterFormValues = Omit<RegisterRequest, 'roleId'> & {
  confirmPassword: string;
};

export type RegisterField = keyof RegisterFormValues;
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

// Mirrors backend constraints in identity-service `UserRegisterRequest`
export const registerRules = {
  username: { min: 3, max: 100 } as const,
  password: {
    min: 6,
    // Must include at least one letter and one digit
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/,
  } as const,
  fullName: { max: 255 } as const,
  email: {
    pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}$/,
  } as const,
  phone: {
    // optional, but if provided must be 10-11 digits
    pattern: /^[0-9]{10,11}$/,
  } as const,
} as const;

/**
 * Full validation (required + format/length/match rules).
 * Use this when user presses "Đăng Ký".
 */
export function validateRegister(values: RegisterFormValues): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};

  const username = values.username.trim();
  if (!username) errors.username = 'Tên đăng nhập không được để trống';
  else if (username.length < registerRules.username.min) errors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
  else if (username.length > registerRules.username.max) errors.username = `Tên người dùng không được vượt quá ${registerRules.username.max} ký tự`;

  const password = values.password;
  if (!password) errors.password = 'Password không được để trống';
  else if (password.length < registerRules.password.min || !registerRules.password.pattern.test(password)) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ cái và số';
  }

  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = 'Họ tên không được để trống';
  else if (fullName.length > registerRules.fullName.max) errors.fullName = 'Họ tên không được vượt quá 255 ký tự';

  const email = values.email.trim();
  if (!email) errors.email = 'Email không được để trống';
  else if (!registerRules.email.pattern.test(email)) errors.email = 'Email không đúng định dạng (ví dụ: 112@gmail.com)';

  const phone = values.phone?.trim() ?? '';
  if (phone && !registerRules.phone.pattern.test(phone)) errors.phone = 'Số điện thoại phải có 10-11 chữ số';

  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
  else if (values.confirmPassword !== password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';

  return errors;
}

/**
 * Required-only validation for a single field.
 * Use this on blur: user bỏ trống thì báo ngay, còn lỗi nhập liệu khác chỉ báo sau khi submit.
 */
export function validateRegisterRequired(field: RegisterField, values: RegisterFormValues): string | undefined {
  switch (field) {
    case 'username': {
      const v = values.username.trim();
      return v ? undefined : 'Tên đăng nhập không được để trống';
    }
    case 'password': {
      const v = values.password;
      return v ? undefined : 'Mật khẩu không được để trống';
    }
    case 'fullName': {
      const v = values.fullName.trim();
      return v ? undefined : 'Họ tên không được để trống';
    }
    case 'email': {
      const v = values.email.trim();
      return v ? undefined : 'Email không được để trống';
    }
    case 'confirmPassword': {
      const v = values.confirmPassword;
      return v ? undefined : 'Vui lòng xác nhận mật khẩu';
    }
    case 'phone':
      // phone optional
      return undefined;
    default:
      return undefined;
  }
}

export function mapBackendRegisterErrorToField(message: string): RegisterField | undefined {
  const msg = message.toLowerCase();

  // Common duplicate constraints (VN + EN)
  // Keep these first because some messages may not include raw field keys.
  if (msg.includes('tên đăng nhập') || msg.includes('username')) return 'username';
  if (msg.includes('email')) return 'email';

  // Validation / semantic errors coming from backend ErrorCode messages
  if (msg.includes('mật khẩu') || msg.includes('password')) return 'password';
  if (msg.includes('họ tên')) return 'fullName';
  if (msg.includes('điện thoại') || msg.includes('phone')) return 'phone';

  return undefined;
}
