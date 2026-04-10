import { api } from './api';

export interface WeeklyProgressBreakdown {
  assignmentDone: number;
  assignmentTotal: number;
  testDone: number;
  testTotal: number;
  attendanceDone: number;
  attendanceTotal: number;
}

export interface WeeklyProgressData {
  progressPercent: number;
  totalTasks: number;
  completedTasks: number;
  breakdown: WeeklyProgressBreakdown;
}

interface BackendResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const weeklyProgressService = {
  async getMyWeeklyProgress(): Promise<WeeklyProgressData> {
    const res = await api.get<BackendResponse<WeeklyProgressData>>('/student/progress-week');
    return res.result;
  },
};
