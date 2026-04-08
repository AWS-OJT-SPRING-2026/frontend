import { AxiosError } from 'axios';
import { api } from './api';
import axiosClient from './axios';

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

export interface StudentClassmate {
  studentID: number;
  fullName: string;
  avatarUrl: string | null;
}

export interface StudentScheduleItem {
  timetableID: number;
  classID: number;
  subjectName: string;
  className: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  room: string | null;
  topic: string | null;
  meetUrl: string | null;
  studentCount: number;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_YET' | null;
  classmates: StudentClassmate[];
}

export interface StudentWeeklyStats {
  totalClassesThisWeek: number;
  totalHoursStudied: number;
  totalSubjects: number;
  totalExams: number;
}

function getAxiosErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Không thể tải dữ liệu lịch học.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Không thể tải dữ liệu lịch học.';
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
  async getTimetables(start: Date, end: Date): Promise<TimetableItem[]> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TimetableItem[]>>(`/timetables${query}`);
    return response.result ?? [];
  },

  async getStats(): Promise<TimetableStats> {
    const response = await api.get<ApiResponse<TimetableStats>>('/timetables/stats');
    return response.result;
  },

  async createSingle(request: CreateSingleTimetableRequest): Promise<TimetableItem> {
    const response = await api.authPost<ApiResponse<TimetableItem>>('/timetables/single', request);
    return response.result;
  },

  async createRecurring(request: CreateRecurringTimetableRequest): Promise<void> {
    await api.authPost<ApiResponse<void>>('/timetables/recurring', request);
  },

  async bulkUpdateTimetable(classId: number, request: BulkUpdateTimetableRequest): Promise<void> {
    await api.authPut<ApiResponse<void>>(`/timetables/bulk/${classId}`, request);
  },

  async updateSingleTimetable(id: number, request: UpdateSingleTimetableRequest): Promise<TimetableItem> {
    const response = await api.authPut<ApiResponse<TimetableItem>>(`/timetables/${id}`, request);
    return response.result;
  },

  async deleteTimetable(id: number): Promise<void> {
    await api.authDelete<ApiResponse<void>>(`/timetables/${id}`);
  },

  async deleteAllByClass(classId: number): Promise<void> {
    await api.authDelete<ApiResponse<void>>(`/timetables/class/${classId}`);
  },

  async getTeachers(): Promise<TeacherItem[]> {
    const response = await api.get<ApiResponse<TeacherItem[]>>('/teachers');
    return response.result ?? [];
  },

  async getAttendanceByTimetable(timetableId: number): Promise<AttendanceStudentResponse[]> {
    const response = await api.get<ApiResponse<AttendanceStudentResponse[]>>(`/timetables/${timetableId}/attendance`);
    return response.result ?? [];
  },

  async saveAttendance(timetableId: number, requests: AttendanceRequest[]): Promise<void> {
    await api.authPost<ApiResponse<void>>(`/timetables/${timetableId}/attendance`, requests);
  },

  async getMyScheduleList(start: Date, end: Date): Promise<TimetableItem[]> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TimetableItem[]>>(`/timetables/my-schedule${query}`);
    return response.result ?? [];
  },

  async getMyScheduleStats(start: Date, end: Date): Promise<TeacherScheduleStats> {
    const query = `?start=${encodeURIComponent(toLocalDateTime(start))}&end=${encodeURIComponent(toLocalDateTime(end))}`;
    const response = await api.get<ApiResponse<TeacherScheduleStats>>(`/timetables/my-schedule/stats${query}`);
    return response.result;
  },

  async updateMeetLink(timetableId: number, googleMeetLink: string): Promise<TimetableItem> {
    const response = await api.authPatch<ApiResponse<TimetableItem>>(`/timetables/${timetableId}/meet-link`, { googleMeetLink });
    return response.result;
  },

  async getStudentSchedule(start: Date, end: Date): Promise<StudentScheduleItem[]> {
    try {
      const response = await axiosClient.get<ApiResponse<StudentScheduleItem[]>>('/timetables/my-schedule/student', {
        params: {
          start: toLocalDateTime(start),
          end: toLocalDateTime(end),
        },
      });

      return response.data.result ?? [];
    } catch (error) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },

  async getStudentScheduleStats(start: Date, end: Date): Promise<StudentWeeklyStats> {
    try {
      const response = await axiosClient.get<ApiResponse<StudentWeeklyStats>>('/timetables/my-schedule/student/stats', {
        params: {
          start: toLocalDateTime(start),
          end: toLocalDateTime(end),
        },
      });

      return response.data.result;
    } catch (error) {
      throw new Error(getAxiosErrorMessage(error));
    }
  },
};


export interface TeacherScheduleStats {
  totalSessions: number;
  hasLinkSessions: number;
  missingLinkSessions: number;
}
