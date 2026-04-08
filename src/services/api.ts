import { AxiosError } from 'axios';
import axiosClient from './axios';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface BlobResult {
  blob: Blob;
  headers: Headers;
}

function parseErrorMessage(error: AxiosError): string | undefined {
  const errorData = error.response?.data as any;
  if (!errorData) {
    return undefined;
  }

  // identity-service standard error shape: { code, message }
  const code: number | undefined = typeof errorData?.code === 'number' ? errorData.code : undefined;
  const msg: string | undefined = errorData?.message ?? errorData?.error ?? errorData?.msg;

  // Keep FE wording stable for known backend codes.
  if (code === 1002) return 'Tên đăng nhập đã tồn tại, hãy dùng tên khác.';
  if (code === 1003) return 'Email đã tồn tại, hãy dùng email khác.';
  if (code === 1021) return 'ACCOUNT_LOCKED';
  if (code === 1071) return 'PASSWORD_CHANGE_LIMIT';

  if (typeof msg === 'string' && msg.trim()) {
    return msg;
  }

  return undefined;
}

function normalizeAxiosError(error: unknown): never {
  if (error instanceof AxiosError) {
    if (!error.response) {
      throw new ApiError(0, 'Không thể kết nối máy chủ (lỗi mạng hoặc CORS).');
    }

    const msg = parseErrorMessage(error);
    throw new ApiError(error.response.status, msg || `HTTP Error: ${error.response.status}`);
  }

  throw error;
}

export const api = {
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    try {
      const response = await axiosClient.post<T>(endpoint, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async get<T>(endpoint: string, token?: string): Promise<T> {
    try {
      const response = await axiosClient.get<T>(endpoint, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            },
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPost<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await axiosClient.post<T>(endpoint, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPut<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await axiosClient.put<T>(endpoint, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPostForm<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    try {
      const response = await axiosClient.post<T>(endpoint, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPutForm<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
    try {
      const response = await axiosClient.put<T>(endpoint, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authDelete<T>(endpoint: string, token?: string): Promise<T> {
    try {
      const response = await axiosClient.delete<T>(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPatch<T>(endpoint: string, data: unknown, token?: string): Promise<T> {
    try {
      const response = await axiosClient.patch<T>(endpoint, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response.data;
    } catch (error) {
      normalizeAxiosError(error);
    }
  },

  async authPostBlob(endpoint: string, data: unknown, token?: string): Promise<BlobResult> {
    try {
      const response = await axiosClient.post<Blob>(endpoint, data, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            },
        responseType: 'blob',
      });

      return {
        blob: response.data,
        headers: new Headers(response.headers as Record<string, string>),
      };
    } catch (error) {
      normalizeAxiosError(error);
    }
  },
};

