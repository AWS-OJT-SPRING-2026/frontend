import { authService } from './authService';
import { api, ApiError } from './api';

const FAST_API_BASE_URL = import.meta.env.VITE_FAST_API_BASE_URL;

export type DocType = 'theory' | 'question';

export interface TeacherDocumentItem {
  id: number;
  book_name: string;
  subject_name: string;
  uploadDate: string;
  meta: string;
  doc_type: DocType;
  assigned_class_count: number;
}

export interface AssignedClassroom {
  classid: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  assigned_at: string;
}

export interface TeacherDocumentDetail {
  id: number;
  doc_type: DocType;
  book_name: string;
  subject_id: number;
  subject_name: string;
  uploadDate: string;
  assigned_class_count: number;
  assigned_classrooms: AssignedClassroom[];
  stats: {
    chapters?: number;
    lessons?: number;
    sections?: number;
    content_blocks?: number;
    questions?: number;
    answers?: number;
  };
}

type LegacyBookItem = {
  id: number;
  book_name: string;
  subject_name: string;
  uploadDate?: string;
  create_at?: string;
  meta: string;
  doc_type: DocType;
  assigned_class_count?: number;
};

function buildAuthHeader(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.detail || body?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<T>;
}

function mapLegacyBook(item: LegacyBookItem): TeacherDocumentItem {
  return {
    id: item.id,
    book_name: item.book_name,
    subject_name: item.subject_name,
    uploadDate: item.uploadDate || item.create_at || new Date().toISOString(),
    meta: item.meta,
    doc_type: item.doc_type,
    assigned_class_count: item.assigned_class_count ?? 0,
  };
}

export const teacherDocumentService = {
  async getDocuments(token: string): Promise<TeacherDocumentItem[]> {
    const authedResponse = await fetch(`${FAST_API_BASE_URL}/books`, {
      headers: buildAuthHeader(token),
    });

    // Backward compatibility: some AI instances expose /books as public and may reject invalid bearer token.
    if (authedResponse.status === 401) {
      const publicResponse = await fetch(`${FAST_API_BASE_URL}/books`);
      const data = await handleJson<LegacyBookItem[]>(publicResponse);
      return data.map(mapLegacyBook);
    }

    const data = await handleJson<LegacyBookItem[]>(authedResponse);
    return data.map(mapLegacyBook);
  },

  async uploadDocument(formData: FormData, token: string): Promise<{ record_id: number }> {
    if (authService.isQuickDemoSession()) {
      throw new Error('Tài khoản demo không hỗ trợ tải tài liệu. Vui lòng đăng nhập tài khoản thật.');
    }

    const response = await fetch(`${FAST_API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: buildAuthHeader(token),
      body: formData,
    });
    return handleJson<{ record_id: number }>(response);
  },

  async getDocumentDetail(docType: DocType, docId: number, token: string): Promise<TeacherDocumentDetail> {
    if (authService.isQuickDemoSession()) {
      throw new Error('Tài khoản demo không hỗ trợ xem chi tiết tài liệu. Vui lòng đăng nhập tài khoản thật.');
    }

    const response = await fetch(`${FAST_API_BASE_URL}/books/${docType}/${docId}`, {
      headers: buildAuthHeader(token),
    });
    return handleJson<TeacherDocumentDetail>(response);
  },

  async distributeDocument(
    docType: DocType,
    docId: number,
    payload: { subject_id: number; class_ids: number[] },
    token: string,
  ): Promise<{ distributed_count: number }> {
    if (authService.isQuickDemoSession()) {
      throw new Error('Tài khoản demo không hỗ trợ phân phối tài liệu. Vui lòng đăng nhập tài khoản thật.');
    }

    try {
      await api.authPut('/documents/' + docId + '/distributions', {
        type: docType.toUpperCase(),
        classIds: payload.class_ids,
      }, token);

      return { distributed_count: payload.class_ids.length };
    } catch (error) {
      // Backward compatibility with legacy Python distribution endpoint.
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        const response = await fetch(`${FAST_API_BASE_URL}/books/${docType}/${docId}/distribute`, {
          method: 'POST',
          headers: {
            ...buildAuthHeader(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        return handleJson<{ distributed_count: number }>(response);
      }
      throw error;
    }
  },

  async deleteDocument(docType: DocType, docId: number, token: string): Promise<void> {
    if (authService.isQuickDemoSession()) {
      throw new Error('Tài khoản demo không hỗ trợ xóa tài liệu. Vui lòng đăng nhập tài khoản thật.');
    }

    const response = await fetch(`${FAST_API_BASE_URL}/books/${docType}/${docId}`, {
      method: 'DELETE',
      headers: buildAuthHeader(token),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }
  },

  getTokenOrThrow(): string {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    return token;
  },
};


