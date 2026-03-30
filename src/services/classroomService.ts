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

interface PageResponse<T> {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  data: T[];
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
};


