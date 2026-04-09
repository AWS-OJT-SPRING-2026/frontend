import { useEffect, useMemo, useState, useRef } from 'react';
import { CaretDown, CaretLeft, CaretRight, BookOpen, Star } from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import {
  studentMaterialService,
  type BookHierarchyResponse,
  type ChapterDto,
  type LessonDto,
  type ContentBlockDto,
  type StudentTheorySubjectOverview,
} from '../../services/studentMaterialService';
import { MathRenderer } from '../ui/MathRenderer';

const SPECIAL_BLOCK_KEYWORDS = ['diem nhan', 'tom tat', 'ghi nho', 'key highlight', 'cot loi', 'quan trong'];

function normalizeVietnameseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isSpecialContentBlock(block: ContentBlockDto): boolean {
  if (block.blockType?.toLowerCase() === 'highlight') {
    return true;
  }

  const normalizedTitle = normalizeVietnameseText(block.title ?? '');
  const normalizedContent = normalizeVietnameseText(block.content ?? '');
  return SPECIAL_BLOCK_KEYWORDS.some(
    (keyword) => normalizedTitle.includes(keyword) || normalizedContent.includes(keyword),
  );
}

export function StudentDocuments() {
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<StudentTheorySubjectOverview[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [activeBook, setActiveBook] = useState<BookHierarchyResponse | null>(null);

  const [openChapters, setOpenChapters] = useState<number[]>([]);
  const [openLessons, setOpenLessons] = useState<number[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlBookId = searchParams.get('book');
  const urlLessonId = searchParams.get('lesson');
  const urlApplied = useRef(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = authService.getToken();
        if (!token) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        const data = await studentMaterialService.getTheorySubjectsOverview(token);
        setSubjects(data);

        // Auto-load book if specified in URL
        if (urlBookId && !urlApplied.current) {
          const bookIdNum = parseInt(urlBookId);
          if (!isNaN(bookIdNum)) {
            // Find subject that has this book
            const subject = data.find(s => s.bookId === bookIdNum);
            if (subject) {
              setSelectedSubjectId(subject.subjectId);
              setBookLoading(true);
              try {
                const hierarchy = await studentMaterialService.getBookFullHierarchy(bookIdNum, token);
                setActiveBook(hierarchy);
                
                // If a lesson is specified, open its chapter and the lesson itself
                if (urlLessonId) {
                  const lessonIdNum = parseInt(urlLessonId);
                  if (!isNaN(lessonIdNum)) {
                    // Find the chapter containing this lesson
                    const chapter = hierarchy.chapters.find(c => c.lessons.some(l => l.id === lessonIdNum));
                    if (chapter) {
                       setOpenChapters([chapter.id]);
                       setOpenLessons([lessonIdNum]);
                       
                       // Scroll to lesson after a short delay for render
                       setTimeout(() => {
                         const el = document.getElementById(`lesson-${lessonIdNum}`);
                         if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Optional: add a temporary highlight class or inline style
                         }
                       }, 300);
                    }
                  }
                } else if (hierarchy.chapters.length > 0) {
                   setOpenChapters([hierarchy.chapters[0].id]);
                }
              } catch (err) {
                console.error('Failed to load deep link book', err);
              } finally {
                setBookLoading(false);
              }
            }
          }
          urlApplied.current = true;
          setSearchParams({}, { replace: true });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Không thể tải dữ liệu tài liệu học tập.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.subjectId === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  );

  const handleOpenSubject = async (subjectId: number) => {
    const selected = subjects.find((item) => item.subjectId === subjectId);
    if (!selected?.bookId) {
      setError('Môn học này hiện chưa có tài liệu lý thuyết khả dụng.');
      return;
    }

    setSelectedSubjectId(subjectId);
    setBookLoading(true);
    setError(null);
    setActiveBook(null);
    setOpenChapters([]);
    setOpenLessons([]);

    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      const hierarchy = await studentMaterialService.getBookFullHierarchy(selected.bookId, token);
      setActiveBook(hierarchy);
      if (hierarchy.chapters.length > 0) {
        setOpenChapters([hierarchy.chapters[0].id]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể tải chi tiết tài liệu.';
      setError(message);
    } finally {
      setBookLoading(false);
    }
  };

  const toggleChapter = (chapterId: number) => {
    setOpenChapters((prev) => (prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]));
  };

  const toggleLesson = (lessonId: number) => {
    setOpenLessons((prev) => (prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]));
  };

  const stripSubsectionPrefix = (value: string | null): string => {
    if (!value) return 'Nội dung chi tiết';
    const cleaned = value.replace(/^subsection\s*[\d.]+\s*:\s*/i, '').trim();
    return cleaned || 'Nội dung chi tiết';
  };

  const renderContentBlock = (block: ContentBlockDto, fallbackKey: string) => {
    const special = isSpecialContentBlock(block);
    const blockKey = block.id ? `${block.id}` : fallbackKey;

    if (special) {
      return (
        <article
          key={blockKey}
          className={`rounded-2xl border-2 px-5 py-4 md:px-6 md:py-5 shadow-md ${isDark
            ? 'border-blue-400/80 bg-blue-950/40 text-blue-50 shadow-blue-950/30'
            : 'border-blue-500 bg-blue-50 text-blue-950 shadow-blue-200/80'
            }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-400" weight="fill" />
            <h5 className="text-xl md:text-2xl font-black leading-tight">
              <MathRenderer content={block.title?.trim() || 'Điểm nhấn quan trọng của bài'} />
            </h5>
          </div>
          <p className="whitespace-pre-wrap text-base md:text-lg font-bold leading-8"><MathRenderer content={block.content} /></p>
        </article>
      );
    }

    return (
      <article
        key={blockKey}
        className={`rounded-xl border px-4 py-3 whitespace-pre-wrap text-sm leading-7 ${isDark
          ? 'border-white/10 bg-[#1b2229] text-gray-200'
          : 'border-[#1A1A1A]/10 bg-white text-[#1A1A1A]/85'
          }`}
      >
        {block.title && <h5 className="font-bold text-base mb-1"><MathRenderer content={block.title} /></h5>}
        <p><MathRenderer content={block.content} /></p>
      </article>
    );
  };

  const renderLessonContent = (lesson: LessonDto, chapterNumber: string) => {
    if (lesson.sections.length === 0) {
      return <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}>Bài học chưa có nội dung.</p>;
    }

    return (
      <div className="space-y-4">
        {lesson.sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            className={`rounded-xl border p-3 md:p-4 ${isDark ? 'border-white/10 bg-[#171b20]' : 'border-[#1A1A1A]/10 bg-[#F9FAFF]'}`}
          >
            <h4 className={`text-base md:text-lg font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
              {chapterNumber}.{lesson.lessonNumber}.{sectionIndex + 1}: {section.sectionTitle ?? 'Nội dung tổng quan'}
            </h4>

            <div className="mt-3 space-y-3">
              {section.subsections.map((subsection) => (
                <div
                  key={subsection.id}
                  className={`rounded-xl border p-3 md:p-4 ${isDark ? 'border-white/10 bg-[#1b2229]' : 'border-[#1A1A1A]/10 bg-white'}`}
                >
                  <h5 className={`text-sm md:text-base font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                    {stripSubsectionPrefix(subsection.subsectionTitle)}
                  </h5>

                  <div className="mt-3 space-y-3">
                    {subsection.contentBlocks.length === 0 ? (
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}>Phan nay chua co noi dung.</p>
                    ) : (
                      subsection.contentBlocks.map((block, index) =>
                        renderContentBlock(block, `${section.id}-${subsection.id}-${index}`),
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderChapter = (chapter: ChapterDto) => {
    const chapterOpen = openChapters.includes(chapter.id);

    return (
      <div key={chapter.id} className={`rounded-2xl border ${isDark ? 'border-white/10 bg-[#171b20]' : 'border-[#1A1A1A]/20 bg-white'}`}>
        <button
          onClick={() => toggleChapter(chapter.id)}
          className={`w-full px-4 py-3 flex items-center justify-between text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/5'}`}
        >
          <div>
            <p className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
              Chương {chapter.chapterNumber}: {chapter.title}
            </p>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>
              {chapter.lessons.length} bài học
            </p>
          </div>
          {chapterOpen ? <CaretDown className="w-5 h-5" /> : <CaretRight className="w-5 h-5" />}
        </button>

        {chapterOpen && (
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
            {chapter.lessons.map((lesson) => {
              const lessonOpen = openLessons.includes(lesson.id);
              return (
                <div key={lesson.id} id={`lesson-${lesson.id}`} className={`border-b last:border-b-0 scroll-mt-24 ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                  <button
                    onClick={() => toggleLesson(lesson.id)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#1A1A1A]/5'}`}
                  >
                    <div>
                      <p className={`font-bold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                        Bài {lesson.lessonNumber}: {lesson.title}
                      </p>
                      <p className={`text-xs font-semibold flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>
                        <BookOpen className="w-3.5 h-3.5" weight="fill" />
                        ≈ {lesson.estimatedTime ?? 1} phút đọc
                      </p>
                    </div>
                    {lessonOpen ? <CaretDown className="w-4 h-4" /> : <CaretRight className="w-4 h-4" />}
                  </button>

                  {lessonOpen && (
                    <div className="px-4 pb-4 pt-1">
                      {renderLessonContent(lesson, chapter.chapterNumber)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-8">Đang tải tài liệu học tập...</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {!selectedSubject || !activeBook ? (
        <>
          <div>
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Học sinh / Tài liệu</p>
            <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Tổng quan tài liệu lý thuyết</h1>
          </div>

          {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.subjectId}
                onClick={() => handleOpenSubject(subject.subjectId)}
                className={`rounded-2xl border p-5 text-left transition ${isDark
                  ? 'border-white/10 bg-[#171b20] hover:bg-[#1d232a] text-gray-100'
                  : 'border-[#1A1A1A]/20 bg-white hover:bg-[#F7F7F2] text-[#1A1A1A]'
                  }`}
              >
                <p className="text-lg font-extrabold">{subject.subjectName}</p>
                <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>
                  {subject.totalChapters} chương · {subject.totalLessons} bài học
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              setSelectedSubjectId(null);
              setActiveBook(null);
              setOpenChapters([]);
              setOpenLessons([]);
              setError(null);
            }}
            className={`inline-flex items-center gap-2 font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}
          >
            <CaretLeft className="w-4 h-4" /> Quay lại tổng quan
          </button>

          <div>
            <h2 className={`text-2xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{selectedSubject?.subjectName}</h2>
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/60'}`}>{activeBook.bookName}</p>
          </div>

          {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
          {bookLoading ? <p>Đang tải cấu trúc tài liệu...</p> : <div className="space-y-3">{activeBook.chapters.map(renderChapter)}</div>}
        </>
      )}
    </div>
  );
}
