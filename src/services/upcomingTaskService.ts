import { api } from './api';

export interface UpcomingTask {
  id: number;
  type: 'ASSIGNMENT' | 'TEST';
  title: string;
  deadline: string | null;   // ISO datetime for assignments
  startTime: string | null;  // ISO datetime for tests
  progress: number | null;
  actionUrl: string;
}

interface UpcomingTaskApiResponse {
  code: number;
  message: string;
  result: UpcomingTask[];
}

export const upcomingTaskService = {
  async getUpcomingTasks(): Promise<UpcomingTask[]> {
    const token = localStorage.getItem('token');
    const response = await api.get<UpcomingTaskApiResponse>(
      '/assignments/student/upcoming-tasks',
      token || undefined,
    );
    return response.result ?? [];
  },
};
