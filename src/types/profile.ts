export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface MyProfileResponse {
  studentID?: number;
  teacherID?: number;
  userID?: number;
  username?: string;
  email: string;
  phone?: string;
  status?: string;
  avatarUrl?: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelationship?: string;
}

export interface UpdateMyStudentProfileRequest {
  fullName: string;
  email: string;
  phone?: string;
  status?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelationship?: string;
}

export interface ChangePasswordInitRequest {
  currentPassword: string;
}

export interface ChangePasswordConfirmRequest {
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

