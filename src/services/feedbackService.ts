import { api } from './api';

export interface FeedbackItem {
  feedbackId: number;
  studentId: number;
  studentName: string;
  assignmentId: number;
  assignmentTitle: string;
  teacherId: number;
  teacherName: string;
  comment: string;
  createdAt: string;
}

interface BackendResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const feedbackService = {
  /** Teacher submits feedback for a student's assignment */
  async createFeedback(data: {
    studentId: number;
    assignmentId: number;
    comment: string;
  }): Promise<FeedbackItem> {
    const res = await api.authPost<BackendResponse<FeedbackItem>>(
      '/teacher/feedback',
      data
    );
    return res.result;
  },

  /** Student fetches their own feedback for a specific assignment */
  async getMyFeedbackForAssignment(assignmentId: number): Promise<FeedbackItem[]> {
    const res = await api.get<BackendResponse<FeedbackItem[]>>(
      `/teacher/feedback/my/assignment/${assignmentId}`
    );
    return res.result ?? [];
  },

  /** Teacher/Admin fetches all feedback for a student */
  async getFeedbackByStudent(studentId: number): Promise<FeedbackItem[]> {
    const res = await api.get<BackendResponse<FeedbackItem[]>>(
      `/teacher/feedback/student/${studentId}`
    );
    return res.result ?? [];
  },
};
