import { api } from './api';

export interface StreakDayDto {
    label: string;
    done: boolean;
    today: boolean;
}

export interface RoadmapStepDto {
    week: number;
    title: string;
    done: boolean;
    current: boolean;
}

export interface DeadlineItemDto {
    id: number;
    subject: string;
    color: string;
    title: string;
    due: string;
    urgent: boolean;
    action: string;
    missing: boolean;
}

export interface StudentDashboardResponse {
    streakCount: number;
    streakDays: StreakDayDto[];
    pomodoroSessions: number;
    totalFocusMinutes: number;
    roadmapSteps: RoadmapStepDto[];
    completedRoadmapSteps: number;
    totalRoadmapSteps: number;
    deadlines: DeadlineItemDto[];
}

import { authService } from './authService';

export const studentDashboardService = {
    async getMyDashboard(): Promise<StudentDashboardResponse> {
        const token = authService.getToken();
        if (!token) throw new Error('Missing token');
        
        const res = await api.get<{ code: number; message: string; result: StudentDashboardResponse }>('/students/dashboard/my', token);
        return res.result;
    }
};
