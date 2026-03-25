const GENDER_LABELS: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  NAM: 'Nam',
  NU: 'Nữ',
  KHAC: 'Khác',
};

const RELATION_LABELS: Record<string, string> = {
  FATHER: 'Bố',
  MOTHER: 'Mẹ',
  GRANDFATHER: 'Ông',
  GRANDMOTHER: 'Bà',
  GRANDPARENT: 'Ông/Bà',
  SIBLING: 'Anh/Chị',
  GUARDIAN: 'Người giám hộ',
  OTHER: 'Khác',
  BO: 'Bố',
  ME: 'Mẹ',
};

const GENDER_API_VALUES: Record<string, string> = {
  Nam: 'MALE',
  Nữ: 'FEMALE',
  Khác: 'OTHER',
};

const RELATION_API_VALUES: Record<string, string> = {
  Bố: 'FATHER',
  Mẹ: 'MOTHER',
  'Ông/Bà': 'GRANDPARENT',
  'Anh/Chị': 'SIBLING',
  'Người giám hộ': 'GUARDIAN',
  Khác: 'OTHER',
};

export function toVietnameseGender(value?: string): string {
  if (!value) return 'Khác';
  return GENDER_LABELS[value.trim().toUpperCase()] ?? value;
}

export function toApiGender(value?: string): string | undefined {
  if (!value) return undefined;
  return GENDER_API_VALUES[value] ?? value;
}

export function toVietnameseRelation(value?: string): string {
  if (!value) return 'Khác';
  return RELATION_LABELS[value.trim().toUpperCase()] ?? value;
}

export function toApiRelation(value?: string): string | undefined {
  if (!value) return undefined;
  return RELATION_API_VALUES[value] ?? value;
}

function toNumericId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return null;
  return Number(digitsOnly);
}

export function formatDisplayId(
  role: 'student' | 'teacher' | 'admin',
  rawId?: string | number | null,
): string {
  const prefix = role === 'teacher' ? 'GV' : role === 'student' ? 'HS' : 'AD';
  const normalized = rawId == null ? '' : String(rawId);
  const numericId = toNumericId(normalized);

  if (numericId == null || Number.isNaN(numericId)) {
    return `${prefix}-0000`;
  }

  return `${prefix}-${String(numericId).padStart(4, '0')}`;
}

