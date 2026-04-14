import { api } from './api';

export interface AnswerPayload {
  id?: number;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface QuestionPayload {
  questionText: string;
  imageUrl?: string;
  explanation?: string;
  difficultyLevel: number;
  answers: AnswerPayload[];
}

export interface AnswerResponse {
  id: number;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface QuestionPreviewResponse {
  id: number;
  questionText: string;
  imageUrl?: string;
  explanation?: string;
  difficultyLevel: number;
  difficultyLabel: string;
  isAi: boolean;
  bankId: number;
  bankName: string;
  answers: AnswerResponse[];
}

export const teacherQuestionService = {
  getQuestionsByBankId: async (bankId: number, token: string): Promise<QuestionPreviewResponse[]> => {
    const response = await api.get<{ code: number; message: string; result: QuestionPreviewResponse[] }>(
      `/teacher/question-banks/${bankId}/questions`,
      token
    );
    return response.result;
  },

  createQuestion: async (bankId: number, payload: QuestionPayload, token: string): Promise<QuestionPreviewResponse> => {
    const response = await api.authPost<{ code: number; message: string; result: QuestionPreviewResponse }>(
      `/teacher/question-banks/${bankId}/questions`,
      payload,
      token
    );
    return response.result;
  },

  updateQuestion: async (questionId: number, payload: QuestionPayload, token: string): Promise<QuestionPreviewResponse> => {
    const response = await api.authPut<{ code: number; message: string; result: QuestionPreviewResponse }>(
      `/teacher/questions/${questionId}`,
      payload,
      token
    );
    return response.result;
  },

  deleteQuestion: async (questionId: number, token: string): Promise<void> => {
    await api.authDelete(`/teacher/questions/${questionId}`, token);
  },
};
