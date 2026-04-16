import { api } from './api';
import type {
  ApiResponse,
  ChangePasswordConfirmRequest,
  ChangePasswordInitRequest,
  MyProfileResponse,
  UpdateMyTeacherProfileRequest,
  UpdateMyStudentProfileRequest,
} from '../types/profile';

function appendJsonAsBlob(formData: FormData, key: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value)], { type: 'application/json' });
  formData.append(key, blob);
}

export const profileService = {
  async getMyProfile(token: string): Promise<MyProfileResponse> {
    const response = await api.get<ApiResponse<MyProfileResponse>>('/users/my-profile', token);
    return response.result;
  },

  async updateMyStudentProfile(
    payload: UpdateMyStudentProfileRequest,
    avatarFile: File | null,
    token: string,
  ): Promise<MyProfileResponse> {
    const formData = new FormData();
    appendJsonAsBlob(formData, 'data', payload);

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const response = await api.authPutForm<ApiResponse<MyProfileResponse>>('/users/my-profile/student', formData, token);
    return response.result;
  },

  async updateMyTeacherProfile(
    payload: UpdateMyTeacherProfileRequest,
    avatarFile: File | null,
    token: string,
  ): Promise<MyProfileResponse> {
    const formData = new FormData();
    appendJsonAsBlob(formData, 'data', payload);

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const response = await api.authPutForm<ApiResponse<MyProfileResponse>>('/users/my-profile/teacher', formData, token);
    return response.result;
  },

  async initChangePassword(payload: ChangePasswordInitRequest, token: string): Promise<string> {
    const response = await api.authPost<ApiResponse<string>>('/users/my-profile/change-password/init', payload, token);
    return response.message;
  },

  async confirmChangePassword(payload: ChangePasswordConfirmRequest, token: string): Promise<string> {
    const response = await api.authPost<ApiResponse<string>>('/users/my-profile/change-password/confirm', payload, token);
    return response.message;
  },
};

