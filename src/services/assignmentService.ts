import { api } from './api';

export interface AnswerResponse {
  id: number;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface QuestionPreviewResponse {
  id: number;
  questionText: string;
  imageUrl: string | null;
  explanation: string | null;
  difficultyLevel: number;
  difficultyLabel: string;
  isAi: boolean;
  bankId: number | null;
  bankName: string | null;
  answers: AnswerResponse[];
}

export interface AssignmentResponse {
  assignmentID: number;
  title: string;
  assignmentType: 'TEST' | 'ASSIGNMENT';
  format: 'MULTIPLE_CHOICE' | 'ESSAY';
  status: string;
  startTime: string | null;
  endTime: string | null;
  deadline: string | null;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  classroomId: number;
  className: string;
  subjectName: string | null;
  totalQuestions: number;
  totalSubmissions: number;
}

export interface AssignmentDetailResponse extends AssignmentResponse {
  questions: QuestionPreviewResponse[];
}

export interface AssignmentReportResponse {
  assignmentId: number;
  title: string;
  className: string;
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  studentResults: StudentSubmissionSummary[];
  questionStats: QuestionStatistic[];
}

export interface StudentSubmissionSummary {
  submissionId: number;
  userId: number;
  studentName: string;
  score: number;
  timeTaken: number;
  submitTime: string;
}

export interface QuestionStatistic {
  questionId: number;
  questionText: string;
  difficultyLevel: number;
  correctCount: number;
  totalAnswered: number;
  accuracyRate: number;
}

export interface SubmissionResponse {
  submissionID: number;
  assignmentId: number;
  assignmentTitle: string;
  userId: number;
  studentName: string;
  score: number;
  timeTaken: number;
  startedAt: string | null;
  expiredAt: string | null;
  submittedAt: string | null;
  submitTime: string;
  answers: SubmissionAnswerDetail[];
}

export interface AssignmentResultResponse {
  submissionId: number;
  assignmentId: number;
  assignmentTitle: string;
  userId: number;
  studentName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeTaken: number;
  submitTime: string;
  questions: AssignmentResultQuestion[];
}

export interface AssignmentResultQuestion {
  questionId: number;
  questionText: string;
  selectedAnswerRefId: number | null;
  selectedAnswer: string | null;
  correctAnswerRefId: number | null;
  correctAnswer: string | null;
  isCorrect: boolean;
}

export interface AssignmentAttemptResponse {
  submissionID: number;
  assignmentId: number;
  startedAt: string;
  expiredAt: string;
}

export interface SubmissionAnswerDetail {
  questionId: number;
  questionText: string;
  answerRefId: number | null;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export interface QuestionBankResponse {
  id: number;
  bankName: string;
  subjectId: number | null;
  subjectName: string | null;
  createdAt: string;
}

interface ApiWrapper<T> {
  code: number;
  message: string;
  result: T;
}

export const assignmentService = {
  // Teacher
  getMyAssignments: (token: string) =>
    api.get<ApiWrapper<AssignmentResponse[]>>('/assignments/my', token).then(r => r.result),

  getDetail: (id: number, token: string) =>
    api.get<ApiWrapper<AssignmentDetailResponse>>(`/assignments/${id}`, token).then(r => r.result),

  create: (data: {
    classroomId: number;
    title: string;
    assignmentType: 'TEST' | 'ASSIGNMENT';
    format: 'MULTIPLE_CHOICE' | 'ESSAY';
    startTime: string | null;
    endTime: string | null;
    deadline: string | null;
    durationMinutes: number;
    questionIds: number[];
  }, token: string) =>
    api.authPost<ApiWrapper<AssignmentDetailResponse>>('/assignments', data, token).then(r => r.result),

  update: (id: number, data: Partial<{
    title: string;
    assignmentType: 'TEST' | 'ASSIGNMENT';
    format: 'MULTIPLE_CHOICE' | 'ESSAY';
    startTime: string | null;
    endTime: string | null;
    deadline: string | null;
    durationMinutes: number;
    questionIds: number[];
  }>, token: string) =>
    api.authPut<ApiWrapper<AssignmentDetailResponse>>(`/assignments/${id}`, data, token).then(r => r.result),

  publish: (id: number, token: string) =>
    api.authPut<ApiWrapper<AssignmentResponse>>(`/assignments/${id}/publish`, {}, token).then(r => r.result),

  close: (id: number, token: string) =>
    api.authPut<ApiWrapper<AssignmentResponse>>(`/assignments/${id}/close`, {}, token).then(r => r.result),

  delete: (id: number, token: string) =>
    api.authDelete<ApiWrapper<void>>(`/assignments/${id}`, token),

  getReport: (id: number, token: string) =>
    api.get<ApiWrapper<AssignmentReportResponse>>(`/assignments/${id}/report`, token).then(r => r.result),

  getRandomQuestions: (params: { bankId?: number; difficultyLevel?: number; limit?: number }, token: string) => {
    const query = new URLSearchParams();
    if (params.bankId != null) query.set('bankId', String(params.bankId));
    if (params.difficultyLevel != null) query.set('difficultyLevel', String(params.difficultyLevel));
    if (params.limit != null) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<ApiWrapper<QuestionPreviewResponse[]>>(`/assignments/questions/random${qs ? `?${qs}` : ''}`, token)
      .then(r => r.result);
  },

  getMyBanks: (token: string) =>
    api.get<ApiWrapper<QuestionBankResponse[]>>('/assignments/banks/my', token).then(r => r.result),

  // Student
  getForStudent: (classroomId: number, token: string) =>
    api.get<ApiWrapper<AssignmentResponse[]>>(`/assignments/classroom/${classroomId}`, token).then(r => r.result),

  getStudentActiveAssignments: (token: string) =>
    api.get<ApiWrapper<AssignmentResponse[]>>('/assignments/student/active', token).then(r => r.result),

  getStudentSubmissions: (token: string) =>
    api.get<ApiWrapper<SubmissionResponse[]>>('/assignments/student/submissions', token).then(r => r.result),

  start: (assignmentId: number, token: string) =>
    api.authPost<ApiWrapper<AssignmentAttemptResponse>>(`/assignments/${assignmentId}/start`, {}, token).then(r => r.result),

  submit: (assignmentId: number, data: { timeTaken: number; answers: { questionId: number; answerRefId: number | null; selectedAnswer: string | null }[] }, token: string) =>
    api.authPost<ApiWrapper<SubmissionResponse>>(`/assignments/${assignmentId}/submit`, data, token).then(r => r.result),

  getMySubmission: (assignmentId: number, token: string) =>
    api.get<ApiWrapper<SubmissionResponse>>(`/assignments/${assignmentId}/my-submission`, token).then(r => r.result),

  getResult: (assignmentId: number, token: string) =>
    api.get<ApiWrapper<AssignmentResultResponse>>(`/assignments/${assignmentId}/results`, token).then(r => r.result),
};
