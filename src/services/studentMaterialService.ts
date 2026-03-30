import { api } from './api';
import type { ApiResponse } from './timetableService';

export interface StudentTheorySubjectOverview {
  subjectId: number;
  subjectName: string;
  bookId: number;
  totalChapters: number;
  totalLessons: number;
}

export interface ContentBlockDto {
  id: number;
  content: string;
  title?: string | null;
  blockType?: string | null;
}

export interface SubsectionDto {
  id: number;
  subsectionNumber: string;
  subsectionTitle: string | null;
  contentBlocks: ContentBlockDto[];
}

export interface SectionDto {
  id: number;
  sectionNumber: string;
  sectionTitle: string | null;
  subsections: SubsectionDto[];
}

export interface LessonDto {
  id: number;
  lessonNumber: string;
  title: string;
  estimatedTime: number | null;
  sections: SectionDto[];
}

export interface ChapterDto {
  id: number;
  chapterNumber: string;
  title: string;
  lessons: LessonDto[];
}

export interface BookHierarchyResponse {
  id: number;
  bookName: string;
  subjectId: number;
  subjectName: string;
  chapters: ChapterDto[];
}

export const studentMaterialService = {
  async getTheorySubjectsOverview(token: string): Promise<StudentTheorySubjectOverview[]> {
    const response = await api.get<ApiResponse<StudentTheorySubjectOverview[]>>(
      '/students/me/materials/theory/subjects',
      token,
    );
    return response.result ?? [];
  },

  async getBookFullHierarchy(bookId: number, token: string): Promise<BookHierarchyResponse> {
    const response = await api.get<ApiResponse<BookHierarchyResponse>>(
      `/students/me/materials/theory/books/${bookId}/full-hierarchy`,
      token,
    );
    return response.result;
  },
};
