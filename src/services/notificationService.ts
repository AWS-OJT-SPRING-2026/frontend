import { api } from './api';

export type NotificationType =
  | 'ASSIGNMENT_NEW'
  | 'ASSIGNMENT_DUE_SOON'
  | 'ASSIGNMENT_OVERDUE'
  | 'TEST_UPCOMING'
  | 'TEST_STARTING'
  | 'TEST_RESULT'
  | 'SCHEDULE_CHANGED'
  | 'TEACHER_CHANGED'
  | 'REMINDER_CLASS'
  | 'FEEDBACK_RECEIVED';

export type NotificationCategory = 'ALL' | 'IMPORTANT' | 'LEARNING' | 'SYSTEM';

export interface NotificationItem {
  notificationId: number;
  type: NotificationType;
  title: string;
  content: string;
  assignmentDeadline?: string | null;
  testStartTime?: string | null;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

interface BackendResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const IMPORTANT_TYPES: NotificationType[] = [
  'ASSIGNMENT_DUE_SOON',
  'ASSIGNMENT_OVERDUE',
  'TEST_STARTING',
];

export const LEARNING_TYPES: NotificationType[] = [
  'ASSIGNMENT_NEW',
  'TEST_UPCOMING',
  'TEST_RESULT',
  'FEEDBACK_RECEIVED',
];

export const SYSTEM_TYPES: NotificationType[] = [
  'SCHEDULE_CHANGED',
  'TEACHER_CHANGED',
  'REMINDER_CLASS',
];

export const notificationService = {
  async getMyNotifications(category?: NotificationCategory): Promise<NotificationItem[]> {
    const params = category && category !== 'ALL' ? `?category=${category}` : '';
    const res = await api.get<BackendResponse<NotificationItem[]>>(`/notifications${params}`);
    return res.result ?? [];
  },

  async markAsRead(notificationId: number): Promise<NotificationItem> {
    const res = await api.authPut<BackendResponse<NotificationItem>>(
      `/notifications/${notificationId}/read`,
      {}
    );
    return res.result;
  },

  async markAllAsRead(): Promise<void> {
    await api.authPut<BackendResponse<void>>('/notifications/read-all', {});
  },

  async deleteNotification(notificationId: number): Promise<void> {
    await api.authDelete<BackendResponse<void>>(`/notifications/${notificationId}`);
  },

  async sendClassNotification(classId: number, req: { title: string; content: string; actionUrl?: string }): Promise<void> {
    await api.authPost<BackendResponse<void>>(`/notifications/send-class/${classId}`, req);
  },
};
