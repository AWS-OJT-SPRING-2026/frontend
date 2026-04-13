import { api } from './api';

export type ProgressType = 'WEEK' | 'MONTH';

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
  async getStudentProgress(type: ProgressType, options: { startDate?: string; month?: string }): Promise<WeeklyProgressData> {
    const params = new URLSearchParams({ type });

    if (type === 'WEEK' && options.startDate) {
      params.set('startDate', options.startDate);
    }

    if (type === 'MONTH' && options.month) {
      params.set('month', options.month);
    }

    const res = await api.get<BackendResponse<WeeklyProgressData>>(`/student/progress?${params.toString()}`);
    return res.result;
  },

  async getMyWeeklyProgress(): Promise<WeeklyProgressData> {
    const res = await api.get<BackendResponse<WeeklyProgressData>>('/student/progress-week');
    return res.result;
  },
};
