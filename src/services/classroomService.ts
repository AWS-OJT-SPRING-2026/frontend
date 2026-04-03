import { api } from './api';
import type { ApiResponse } from './timetableService';

export interface ClassroomItem {
  classID: number;
  className: string;
  subjectName: string;
  semester: string;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  maxStudents: number;
  currentStudents: number;
  teacherName: string | null;
}

export interface ClassroomDetail {
  classID: number;
  className: string;
  subjectID: number;
  subjectName: string;
  teacherID: number | null;
  teacherName: string | null;
  semester: string;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  maxStudents: number;
  currentStudents: number;
}

export interface SubjectItem {
  subjectID: number;
  subjectName: string;
}

export interface TeacherClassroomOption {
  classID: number;
  className: string;
  subjectID: number;
  subjectName: string;
}

export interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  data: T[];
}

export interface ClassDashboard {
  classID: number;
  className: string;
  totalStudents: number;
  onlineStudents: number;
  offlineStudents: number;
  attentionStudents: number;
  averageGpa: number;
}

export interface WeeklyGradeDay {
  dayOfWeek: number;
  dayLabel: string;
  hocSinhGioiKha: number;
  hocSinhYeuKem: number;
  tongBaiCham: number;
}

export interface WeeklyGradeStatistics {
  classID: number;
  classCapacity: number;
  days: WeeklyGradeDay[];
}

export interface ClassStudent {
  studentId: number;
  fullName: string;
  mssv: string;
  avatarUrl?: string;
  completionRate: number;
  gpa: number;
  missingCount: number;
  lastActiveTime: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'ATTENTION';
}

export interface ClassNotification {
  id: number;
  category: 'GRADE' | 'ATTENDANCE' | 'SYSTEM';
  title: string;
  body: string;
  createdAt: string;
}

export interface ClassStudentProfile {
  studentID: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  memberStatus?: string;
}

export interface ExportReportRequest {
  format: 'EXCEL' | 'PDF' | 'CSV';
  dataTypes: Array<'GRADEBOOK' | 'GRADES' | 'ATTENDANCE' | 'PROGRESS'>;
  timeRange: 'THIS_WEEK' | 'THIS_MONTH' | 'CURRENT_SEMESTER';
}

export interface ExportDownloadResult {
  blob: Blob;
  fileName: string;
  contentType: string;
}

function getFileNameFromDisposition(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  if (!match?.[1]) return fallback;
  return decodeURIComponent(match[1]).replace(/\"/g, '').trim();
}

export const classroomService = {
  async getAllClassrooms(token: string): Promise<ClassroomItem[]> {
	const size = 100;
	let page = 1;
	let totalPages = 1;
	const all: ClassroomItem[] = [];

	while (page <= totalPages) {
	  const response = await api.get<ApiResponse<PageResponse<ClassroomItem>>>(
		`/classrooms?page=${page}&size=${size}`,
		token,
	  );
	  const result = response.result;
	  all.push(...(result.data ?? []));
	  totalPages = result.totalPages ?? 1;
	  page += 1;
	}

	return all;
  },

  async getClassroomById(classId: number, token: string): Promise<ClassroomDetail> {
	const response = await api.get<ApiResponse<ClassroomDetail>>(`/classrooms/${classId}`, token);
	return response.result;
  },

  async getAllSubjects(token: string): Promise<SubjectItem[]> {
	const response = await api.get<ApiResponse<SubjectItem[]>>('/subjects', token);
	return response.result ?? [];
  },

  async getMyClassroomOptions(token: string): Promise<TeacherClassroomOption[]> {
    const response = await api.get<ApiResponse<TeacherClassroomOption[]>>('/classrooms/teacher/me/options', token);
    return response.result ?? [];
  },

  async getClassDashboard(classId: number, token: string): Promise<ClassDashboard> {
    const response = await api.get<ApiResponse<ClassDashboard>>(`/classrooms/${classId}/dashboard`, token);
    return response.result;
  },

  async getStudentsByClassPaged(
    classId: number,
    token: string,
    params: { page: number; size: number; keyword?: string; status?: string },
  ): Promise<PageResponse<ClassStudent>> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.status) query.set('status', params.status);

    const response = await api.get<ApiResponse<PageResponse<ClassStudent>>>(
      `/classrooms/${classId}/students/paged?${query.toString()}`,
      token,
    );
    return response.result;
  },

  async getClassNotifications(
    classId: number,
    token: string,
    params: { page: number; size: number; category?: string },
  ): Promise<PageResponse<ClassNotification>> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });
    if (params.category && params.category !== 'ALL') query.set('category', params.category);

    const response = await api.get<ApiResponse<PageResponse<ClassNotification>>>(
      `/classrooms/${classId}/notifications?${query.toString()}`,
      token,
    );
    return response.result;
  },

  async getWeeklyGradeStatistics(classId: number, token: string): Promise<WeeklyGradeStatistics> {
    const response = await api.get<ApiResponse<WeeklyGradeStatistics>>(
      `/classrooms/${classId}/statistics/weekly-grades`,
      token,
    );
    return response.result;
  },

  async getStudentsByClass(classId: number, token: string, params?: { keyword?: string; status?: string }): Promise<ClassStudentProfile[]> {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.status) query.set('status', params.status);

    const suffix = query.toString();
    const endpoint = suffix
      ? `/classrooms/${classId}/students?${suffix}`
      : `/classrooms/${classId}/students`;

    const response = await api.get<ApiResponse<ClassStudentProfile[]>>(endpoint, token);
    return response.result ?? [];
  },

  async downloadClassReport(classId: number, token: string, payload: ExportReportRequest): Promise<ExportDownloadResult> {
    const response = await api.authPostBlob(`/classrooms/${classId}/export/download`, payload, token);
    const fileName = getFileNameFromDisposition(
      response.headers.get('content-disposition'),
      `Bao_cao_Lop_${classId}.xlsx`,
    );

    return {
      blob: response.blob,
      fileName,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
    };
  },
};


