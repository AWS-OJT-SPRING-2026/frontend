import { api } from './api';

export interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface TimetableItem {
  timetableID: number;
  classID: number;
  className: string;
  subjectName: string;
  teacherID: number | null;
  teacherName: string | null;
  status: string;
  startTime: string;
  endTime: string;
  topic: string;
  googleMeetLink: string | null;
}

export interface TimetableStats {
  totalToday: number;
  ongoing: number;
  upcoming: number;
  completed: number;
}

export interface TeacherItem {
  teacherID: number;
  fullName: string;
}

export interface CreateSingleTimetableRequest {
  classID: number;
  teacherID?: number;
  topic: string;
  googleMeetLink?: string;
  startTime: string;
  endTime: string;
}

export interface CreateRecurringTimetableRequest {
  classID: number;
  teacherID?: number;
  topic: string;
  googleMeetLink?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: Array<'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'>;
}

export interface BulkUpdateTimetableRequest {
  subjectID?: number;
  teacherID?: number;
  topic?: string;
  googleMeetLink?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateSingleTimetableRequest {
  classID?: number;
  teacherID?: number | null;
  topic?: string;
  googleMeetLink?: string;
  startTime: string;
  endTime: string;
}

export interface AttendanceRequest {
  studentID: number;
  status: string;
  note: string;
}

export interface AttendanceStudentResponse {
  studentID: number;
  studentCode: string;
  fullName: string;
  status: string;
  note: string;
}

function toLocalDateTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export const timetableService = {
  async getTimetables(start: Date, end: Date, token: string): Promise<TimetableItem[]> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TimetableItem[]>>(`/timetables${query}`, token);
    return response.result ?? [];
  },

  async getStats(token: string): Promise<TimetableStats> {
    const response = await api.get<ApiResponse<TimetableStats>>('/timetables/stats', token);
    return response.result;
  },

  async createSingle(request: CreateSingleTimetableRequest, token: string): Promise<TimetableItem> {
    const response = await api.authPost<ApiResponse<TimetableItem>>('/timetables/single', request, token);
    return response.result;
  },

  async createRecurring(request: CreateRecurringTimetableRequest, token: string): Promise<void> {
    await api.authPost<ApiResponse<void>>('/timetables/recurring', request, token);
  },

  async bulkUpdateTimetable(classId: number, request: BulkUpdateTimetableRequest, token: string): Promise<void> {
    await api.authPut<ApiResponse<void>>(`/timetables/bulk/${classId}`, request, token);
  },

  async updateSingleTimetable(id: number, request: UpdateSingleTimetableRequest, token: string): Promise<TimetableItem> {
    const response = await api.authPut<ApiResponse<TimetableItem>>(`/timetables/${id}`, request, token);
    return response.result;
  },

  async deleteTimetable(id: number, token: string): Promise<void> {
    await api.authDelete<ApiResponse<void>>(`/timetables/${id}`, token);
  },

  async deleteAllByClass(classId: number, token: string): Promise<void> {
    await api.authDelete<ApiResponse<void>>(`/timetables/class/${classId}`, token);
  },

  async getTeachers(token: string): Promise<TeacherItem[]> {
    const response = await api.get<ApiResponse<TeacherItem[]>>('/teachers', token);
    return response.result ?? [];
  },

  async getAttendanceByTimetable(timetableId: number, token: string): Promise<AttendanceStudentResponse[]> {
    const response = await api.get<ApiResponse<AttendanceStudentResponse[]>>(`/timetables/${timetableId}/attendance`, token);
    return response.result ?? [];
  },

  async saveAttendance(timetableId: number, requests: AttendanceRequest[], token: string): Promise<void> {
    await api.authPost<ApiResponse<void>>(`/timetables/${timetableId}/attendance`, requests, token);
  },

  async getMyScheduleList(start: Date, end: Date, token: string): Promise<TimetableItem[]> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TimetableItem[]>>(`/timetables/my-schedule${query}`, token);
    return response.result ?? [];
  },

  async getMyScheduleStats(start: Date, end: Date, token: string): Promise<TeacherScheduleStats> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TeacherScheduleStats>>(`/timetables/my-schedule/stats${query}`, token);
    return response.result;
  },

  async updateMeetLink(timetableId: number, googleMeetLink: string, token: string): Promise<TimetableItem> {
    const response = await api.authPatch<ApiResponse<TimetableItem>>(`/timetables/${timetableId}/meet-link`, { googleMeetLink }, token);
    return response.result;
  },
};


export interface TeacherScheduleStats {
  totalSessions: number;
  hasLinkSessions: number;
  missingLinkSessions: number;
}
