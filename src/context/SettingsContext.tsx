import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { authService } from '../services/authService';
import { api } from '../services/api';
import vi from '../i18n/vi';
import en from '../i18n/en';
import type { Translations } from '../i18n/vi';

// ── Types ───────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';
export type Language = 'vi' | 'en';
export type SidebarMode = 'auto' | 'visible';

interface SettingsState {
  theme: ThemeMode;
  language: Language;
  sidebarMode: SidebarMode;
}

interface SettingsContextType extends SettingsState {
  /** Translations for current language */
  t: Translations;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  /** Whether settings are being synced to backend */
  isSyncing: boolean;
}

const STORAGE_KEY = 'educare_settings';

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'light',
  language: 'vi',
  sidebarMode: 'auto',
};

const translations: Record<Language, Translations> = { vi, en };

// Temporary bridge for legacy hardcoded Vietnamese UI strings in role pages.
// This lets language switching affect all tabs while those pages are being fully migrated to i18n keys.
const EN_UI_MAP: Array<[string, string]> = [
  ['AI tự động tạo đề ôn tập tối ưu', 'AI auto-generated optimized review'],
  ['Ôn tập Cá nhân (AI)', 'Personal Review (AI)'],
  ['Cấu hình chung', 'General Configuration'],
  ['Chọn Bài học', 'Select Lessons'],
  ['Quản trị hệ thống', 'System Administration'],
  ['Tổng quan hệ thống', 'System Overview'],
  ['Ngân hàng Câu hỏi', 'Question Bank'],
  ['Quản lý người dùng', 'User Management'],
  ['Thêm người dùng mới', 'Add New User'],
  ['Giáo viên', 'Teacher'],
  ['Học sinh', 'Student'],
  ['Tên đăng nhập', 'Username'],
  ['Mật khẩu', 'Password'],
  ['Họ và tên', 'Full name'],
  ['Số điện thoại', 'Phone number'],
  ['Quản lý lớp học', 'Class Management'],
  ['Tạo lớp học mới', 'Create New Class'],
  ['Môn học', 'Subject'],
  ['Học kỳ', 'Semester'],
  ['Năm học', 'Academic year'],
  ['Ngày bắt đầu', 'Start date'],
  ['Ngày kết thúc', 'End date'],
  ['Giáo viên (tuỳ chọn)', 'Teacher (optional)'],
  ['Huỷ', 'Cancel'],
  ['Đang tải...', 'Loading...'],
  ['Đang tạo...', 'Creating...'],
  ['Tạo lớp', 'Create class'],
  ['Import', 'Import'],
  ['Thêm câu hỏi', 'Add question'],
  ['BỘ LỌC NÂNG CAO', 'ADVANCED FILTERS'],
  ['Môn học', 'Subject'],
  ['Chương / Chủ đề', 'Chapter / Topic'],
  ['Mức độ', 'Difficulty'],
  ['Tất cả môn học', 'All subjects'],
  ['Tất cả chương', 'All chapters'],
  ['Dễ', 'Easy'],
  ['Trung bình', 'Medium'],
  ['Khó', 'Hard'],
  ['Tags', 'Tags'],
  ['Tìm theo thẻ...', 'Search by tag...'],
  ['Nội dung câu hỏi', 'Question content'],
  ['Loại', 'Type'],
  ['Môn học', 'Subject'],
  ['Thao tác', 'Actions'],
  ['Hiển thị 1-3 / 1,250 câu hỏi', 'Showing 1-3 / 1,250 questions'],
  ['Cập nhật 10 phút trước', 'Updated 10 minutes ago'],
  ['Thống kê Lớp học Học kỳ I', 'Class Statistics - Semester I'],
  ['Lọc dữ liệu', 'Filter data'],
  ['Xuất Excel', 'Export Excel'],
  ['Phổ điểm lớp học', 'Class score distribution'],
  ['Tỷ lệ đúng theo Chương học', 'Correct rate by chapter'],
  ['Bảng điểm lớp 12A1', 'Gradebook - Class 12A1'],
  ['Tất cả học sinh', 'All students'],
  ['Học sinh', 'Students'],
  ['Mã HS', 'Student ID'],
  ['Trung bình', 'Average'],
  ['Trạng thái', 'Status'],
  ['Chỉnh sửa', 'Edit'],
  ['Hiển thị 4 trên 45 học sinh', 'Showing 4 of 45 students'],
  ['Sinh học 101 / Tài liệu', 'Biology 101 / Documents'],
  ['Quản lý Tài liệu', 'Document Management'],
  ['Đã đồng bộ với kho lưu trữ trực tuyến thành công.', 'Successfully synced with online storage.'],
  ['Tải lên tài liệu mới', 'Upload new document'],
  ['Kéo và thả tệp vào đây', 'Drag and drop file here'],
  ['Hoặc nhấp để chọn (Tối đa 50MB)', 'Or click to choose (max 50MB)'],
  ['Thay đổi tệp', 'Change file'],
  ['+ Chọn tệp', '+ Choose file'],
  ['Gán cho lớp học', 'Assign to class'],
  ['Chọn môn học', 'Select subject'],
  ['Loại tài liệu', 'Document type'],
  ['Lý thuyết', 'Theory'],
  ['Câu hỏi', 'Question'],
  ['Đang xử lý tài liệu (có thể mất vài phút)...', 'Processing document (this may take a few minutes)...'],
  ['Xác nhận tải lên', 'Confirm upload'],
  ['Gợi ý quản lý', 'Management tips'],
  ['Bảng điều khiển / Tạo bài kiểm tra', 'Dashboard / Create Test'],
  ['Thiết lập Đề kiểm tra', 'Test Setup'],
  ['Thông tin cơ bản', 'Basic Information'],
  ['Chọn lớp', 'Select class'],
  ['Hạn nộp', 'Due date'],
  ['Hình thức', 'Format'],
  ['Trắc nghiệm', 'Multiple choice'],
  ['Tự luận', 'Essay'],
  ['Phương thức lấy câu hỏi', 'Question source method'],
  ['Từ ngân hàng', 'From bank'],
  ['Chương/Chủ đề', 'Chapter/Topic'],
  ['Số lượng', 'Quantity'],
  ['Tạo đề tự động', 'Auto-generate test'],
  ['Xem trước danh sách câu hỏi', 'Preview question list'],
  ['Đã random', 'Randomized'],
  ['Tổng: 10 câu', 'Total: 10 questions'],
  ['Xem thêm 8 câu hỏi', 'Show 8 more questions'],
  ['Trạng thái', 'Status'],
  ['Đã sẵn sàng phát hành', 'Ready to publish'],
  ['Lưu nháp', 'Save draft'],
  ['Phát hành ngay', 'Publish now'],
  ['Lịch giảng dạy hôm nay', "Today's Teaching Schedule"],
  ['Cần xử lý ngay', 'Needs immediate attention'],
  ['Xử lý', 'Handle'],
  ['Hoạt động gần đây', 'Recent activities'],
  ['Thống kê Học tập & Giảng dạy', 'Academic & Teaching Analytics'],
  ['Thống kê Tuyển sinh & Tăng trưởng', 'Admissions & Growth Analytics'],
  ['Thống kê Tương tác Hệ thống', 'System Engagement Analytics'],
  ['Thống kê Kho học liệu & Ngân hàng câu hỏi', 'Content Library & Question Bank Analytics'],
  ['Thống kê Phản hồi & Đánh giá', 'Feedback & Evaluation Analytics'],
  ['Thống kê Kỹ thuật & Bảo mật', 'Technical & Security Analytics'],
  ['Học tập', 'Academic'],
  ['Tuyển sinh', 'Growth'],
  ['Tương tác', 'Engagement'],
  ['Học liệu', 'Content'],
  ['Phản hồi', 'Feedback'],
  ['Hệ thống', 'System'],
  ['Tổng quan', 'Overview'],
  ['Lịch học của tôi', 'My Study Schedule'],
  ['Bài tập & Kiểm tra', 'Assignments & Tests'],
  ['Tài liệu học tập', 'Learning Documents'],
  ['Con đường chinh phục 9.5', 'Path to 9.5'],
  ['Tổng quan đề ôn', 'Review Summary'],
  ['Mẹo từ AI', 'AI Tip'],
  ['Bắt đầu ôn tập', 'Start Review'],
  ['Hỏi đáp AI', 'AI Chat'],
  ['Cài đặt', 'Settings'],
  ['Đăng xuất', 'Sign out'],

  // ── Student Homepage ──
  ['Streak học tập', 'Study streak'],
  ['Pomodoro hôm nay', "Today's Pomodoro"],
  ['phút tập trung', 'minutes focused'],
  ['Slozy AI Tutor', 'Slozy AI Tutor'],
  ['Hỏi Slozy ngay', 'Ask Slozy now'],
  ['Giải đáp bài tập tức thì →', 'Instant homework help →'],
  ['Lộ trình đang học', 'Current roadmap'],
  ['Bạn chưa có lộ trình ôn tập nào.', 'No study roadmap yet.'],
  ['Tạo Lộ trình AI →', 'Create AI Roadmap →'],
  ['Tiến độ tổng thể', 'Overall progress'],
  ['Bắt đầu học →', 'Start learning →'],
  ['Deadline & Thông báo', 'Deadlines & Notifications'],
  ['việc cần làm ngay', 'urgent tasks'],
  ['thông báo chưa đọc', 'unread notifications'],
  ['Xem tất cả', 'View all'],
  ['Ghi chú nhanh', 'Quick notes'],
  ['ghi chú đã lưu', 'notes saved'],
  ['Lưu ghi chú', 'Save note'],
  ['Chưa có ghi chú nào', 'No notes yet'],
  ['Xem lịch', 'View schedule'],
  ['Làm bài', 'Start test'],

  // ── Student Study Space ──
  ['Nguồn tài liệu', 'Sources'],
  ['Chưa có lộ trình ôn tập.', 'No study roadmap yet.'],
  ['Tạo Lộ trình', 'Create Roadmap'],
  ['Chưa có cuộc hội thoại nào', 'No conversations yet'],
  ['Hôm nay bạn cần hỗ trợ gì?', 'What do you need help with today?'],
  ['Đặt câu hỏi về bài tập, lý thuyết, hoặc yêu cầu AI giải thích.', 'Ask about homework, theory, or request AI explanation.'],
  ['Đang phân tích...', 'Analyzing...'],
  ['Hỏi Slozy AI bất cứ điều gì...', 'Ask Slozy AI anything...'],
  ['Công cụ học tập', 'Study tools'],
  ['Trang ôn tập tổng hợp', 'Comprehensive review page'],
  ['Trắc nghiệm AI cá nhân hóa', 'Personalized AI quiz'],
  ['thẻ đã tạo', 'cards created'],
  ['AI tóm tắt bài đang đọc', 'AI summarizes current reading'],
  ['Tóm tắt tài liệu', 'Summarize document'],
  ['Tạo Quiz ôn tập', 'Create review quiz'],
  ['Mặt trước (câu hỏi)...', 'Front (question)...'],
  ['Mặt sau (đáp án)...', 'Back (answer)...'],
  ['Tạo thẻ', 'Create card'],
  ['Chưa có flashcard nào', 'No flashcards yet'],
  ['Hoàn thành!', 'Complete!'],

  // ── Student Chat ──
  ['Đoạn thoại tương tác', 'Conversation history'],
  ['Chưa có lịch sử chat.', 'No chat history.'],
  ['Luyện tập tình huống', 'Scenario practice'],
  ['Truyền cảm hứng (AI)', 'Inspiration (AI)'],
  ['Chia nhỏ câu hỏi', 'Break down questions'],
  ['Đặt câu hỏi về bài tập, lý thuyết hoặc yêu cầu giải thích công thức.', 'Ask about homework, theory, or request formula explanations.'],
  ['Nhập dữ liệu...', 'Loading...'],
  ['Đang phân tích và tìm trong Sách lý thuyết...', 'Analyzing and searching in textbook...'],

  // ── Student Review ──
  ['Cấu hình chung', 'General Configuration'],
  ['Chọn Bài học', 'Select Lessons'],
  ['Tổng số câu hỏi', 'Total questions'],
  ['Số câu hỏi tạo bằng AI', 'AI-generated questions'],
  ['Ưu tiên phần kiến thức còn yếu (AI)', 'Prioritize weak areas (AI)'],
  ['Tập trung vào chủ đề bạn thường làm sai hoặc chưa nắm.', 'Focus on topics you often get wrong or have not mastered.'],
  ['AI Hỗ trợ', 'AI Support'],
  ['Hoàn thành ôn tập!', 'Review complete!'],
  ['Tuyệt vời, bạn đã hoàn thành đề ôn tập được AI cá nhân hóa.', 'Great job — you have finished your AI-personalized review session.'],
  ['Phân tích từ AI về kết quả:', 'AI analysis of your results:'],
  ['Ôn tập lại', 'Retake review'],
  ['Quay về Dashboard', 'Back to Dashboard'],
  ['Lịch sử ôn tập', 'Review history'],
  ['Đang tải chi tiết...', 'Loading details...'],
  ['Quay lại cấu hình', 'Back to configuration'],

  // ── Student Schedule ──
  ['Tiết học tuần này', 'Classes this week'],
  ['Đang diễn ra', 'Ongoing'],
  ['Đã kết thúc', 'Ended'],
  ['Sắp diễn ra', 'Upcoming'],
  ['Chi tiết lớp học', 'Class details'],
  ['Danh sách bạn học', 'Classmates'],
  ['Tài liệu bài giảng', 'Lesson materials'],
  ['Tham gia Meet', 'Join Meet'],
  ['Xem bài tập', 'View homework'],

  // ── Student Documents ──
  ['Tổng quan tài liệu lý thuyết', 'Theory documents overview'],
  ['Môn học này hiện chưa có tài liệu lý thuyết khả dụng.', 'No theory materials available for this subject.'],
  ['Quay lại tổng quan', 'Back to overview'],
  ['Bài học chưa có nội dung.', 'No content for this lesson.'],
  ['Đang tải tài liệu học tập...', 'Loading learning materials...'],

  // ── Student Tests ──
  ['Đã hoàn thành', 'Completed'],
  ['Đang làm dở', 'In progress'],
  ['Chưa làm', 'Not started'],
  ['SẮP MỞ', 'OPENING SOON'],
  ['SẮP HẾT', 'DUE SOON'],
  ['Có sẵn', 'Available'],
  ['Bỏ lỡ', 'Missed'],
  ['Không nộp bài', 'Not submitted'],
  ['Tiếp tục', 'Continue'],
  ['Xem lại', 'Review'],
  ['Quay lại danh sách', 'Back to list'],
  ['Thời gian làm bài', 'Duration'],
  ['Số câu hỏi', 'Questions'],
  ['Thời gian bắt đầu', 'Start time'],
  ['Thời gian kết thúc', 'End time'],
  ['Kết quả và đáp án chưa đến thời điểm công bố', 'Results and answers are not yet published'],
  ['Bạn đã làm bài này rồi, không thể bắt đầu làm lại.', 'You have already completed this test.'],
  ['Xem đáp án chi tiết', 'View detailed answers'],
  ['Xem kết quả', 'View results'],
  ['Bài kiểm tra chưa đến thời gian bắt đầu, vui lòng quay lại sau.', 'This test has not started yet. Please come back later.'],
  ['Bạn chưa chọn đáp án.', 'You have not selected an answer.'],
  ['Đáp án đúng', 'Correct answer'],
  ['Bạn chọn', 'Your choice'],
  ['Giải thích:', 'Explanation:'],
  ['Chưa mở', 'Not open'],

  // ── Teacher Schedule ──
  ['Lịch dạy của tôi', 'My teaching schedule'],
  ['Thời khóa biểu dạy học', 'Teaching timetable'],
  ['Hôm nay', 'Today'],
  ['Hiển thị lớp đã khóa', 'Show inactive classes'],
  ['Buổi trong tuần', 'Sessions this week'],
  ['Có link Meet', 'Has Meet link'],
  ['Chi tiết buổi học', 'Session details'],
  ['Ngày dạy', 'Teaching date'],
  ['Link Google Meet', 'Google Meet link'],
  ['Dán link Google Meet...', 'Paste Google Meet link...'],
  ['Mở link Meet', 'Open Meet link'],
  ['Cập nhật link buổi học', 'Update session link'],
  ['Đang cập nhật...', 'Updating...'],
  ['Điểm danh học sinh', 'Take attendance'],
  ['Giáo viên chỉ được cập nhật link Google Meet cho buổi học này.', 'Teachers can only update the Google Meet link for this session.'],
  ['Đã cập nhật link Google Meet.', 'Google Meet link updated.'],
  ['Không thể cập nhật link. Vui lòng thử lại.', 'Unable to update link. Please try again.'],
  ['Chú thích trạng thái:', 'Status legend:'],

  // ── Teacher Documents ──
  ['Quản lý Tài liệu', 'Document Management'],
  ['Tải lên tài liệu mới', 'Upload new document'],
  ['Kéo và thả tệp vào đây', 'Drag and drop file here'],
  ['Hoặc nhấp để chọn (Tối đa 50MB)', 'Or click to choose (max 50MB)'],
  ['Gán cho lớp học', 'Assign to class'],
  ['Loại tài liệu', 'Document type'],
  ['Tài liệu đã tải lên', 'Uploaded documents'],
  ['Chưa có tài liệu nào được tải lên.', 'No documents uploaded yet.'],
  ['Xem tất cả tài liệu', 'View all documents'],
  ['Thu gọn danh sách', 'Collapse list'],
  ['Chi tiết tài liệu', 'Document details'],
  ['Thông tin nội dung và lớp đã được phân phối.', 'Content info and distributed classes.'],
  ['Thống kê nội dung', 'Content statistics'],
  ['Lớp đã phân phối', 'Distributed classes'],
  ['Chưa phân phối cho lớp nào.', 'Not distributed to any class.'],
  ['Phân phối tài liệu', 'Distribute document'],
  ['Đang tải lên tài liệu...', 'Uploading document...'],
  ['Vui lòng không đóng tab hoặc thoát trang trong khi hệ thống đang xử lý.', 'Please do not close this tab while the system is processing.'],
  ['Đang phân phối...', 'Distributing...'],
  ['Phân phối tài liệu thành công.', 'Document distributed successfully.'],
  ['Phân phối tài liệu thất bại.', 'Failed to distribute document.'],

  // ── Teacher Class List ──
  ['Học sinh của tôi', 'My Students'],
  ['Đang tải danh sách lớp...', 'Loading class list...'],
  ['Chưa phân công', 'Not assigned'],
  ['Xem danh sách', 'View roster'],
  ['Xuất báo cáo', 'Export report'],
  ['Đang Online', 'Online'],
  ['Cần chú ý', 'Needs attention'],
  ['Tìm tên hoặc MSSV...', 'Search name or student ID...'],
  ['Điểm giảm dần', 'Score desc'],
  ['Điểm tăng dần', 'Score asc'],
  ['Hoàn thành giảm', 'Completion desc'],
  ['Tỷ lệ hoàn thành', 'Completion rate'],
  ['Đang tải dữ liệu học sinh...', 'Loading student data...'],
  ['Không tìm thấy học sinh phù hợp', 'No students match your search'],
  ['Xóa bộ lọc', 'Clear filters'],
  ['Thống kê điểm theo tuần', 'Weekly score statistics'],
  ['Thông báo mới nhất', 'Latest notifications'],
  ['Chưa có thông báo gần đây.', 'No recent notifications.'],
  ['Xem tất cả thông báo', 'View all notifications'],
  ['Chi tiết học sinh', 'Student details'],
  ['Ngày sinh', 'Date of birth'],
  ['Địa chỉ', 'Address'],
  ['Vui lòng đăng nhập lại để xem dữ liệu.', 'Please sign in again to view data.'],
];

const SORTED_EN_UI_MAP = [...EN_UI_MAP].sort((a, b) => b[0].length - a[0].length);

function translateLegacyText(input: string): string {
  let out = input;
  for (const [viText, enText] of SORTED_EN_UI_MAP) {
    if (out.includes(viText)) {
      out = out.split(viText).join(enText);
    }
  }
  return out;
}

// ── Context ─────────────────────────────────────────────────────────────────────
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ── Helpers ─────────────────────────────────────────────────────────────────────
function loadLocal(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      language: parsed.language === 'en' ? 'en' : 'vi',
      sidebarMode: parsed.sidebarMode === 'visible' ? 'visible' : 'auto',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocal(settings: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface ApiResp<T> {
  code?: number;
  result?: T;
}

// ── Provider ────────────────────────────────────────────────────────────────────
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(loadLocal);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (settings.language !== 'en') return;

    const translateNodeTree = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        textNodes.push(current as Text);
        current = walker.nextNode();
      }

      textNodes.forEach((node) => {
        const original = node.nodeValue ?? '';
        if (!original.trim()) return;
        const translated = translateLegacyText(original);
        if (translated !== original) {
          node.nodeValue = translated;
        }
      });

      if (root instanceof Element || root instanceof Document) {
        const els = (root instanceof Document ? root : root.ownerDocument)?.querySelectorAll?.('input[placeholder], textarea[placeholder], [title], [aria-label]') ?? [];
        els.forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          const placeholder = (el as HTMLInputElement).placeholder;
          if (placeholder) {
            const next = translateLegacyText(placeholder);
            if (next !== placeholder) (el as HTMLInputElement).placeholder = next;
          }
          const title = el.getAttribute('title');
          if (title) {
            const next = translateLegacyText(title);
            if (next !== title) el.setAttribute('title', next);
          }
          const ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) {
            const next = translateLegacyText(ariaLabel);
            if (next !== ariaLabel) el.setAttribute('aria-label', next);
          }
        });
      }
    };

    translateNodeTree(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && mutation.target) {
          translateNodeTree(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            translateNodeTree(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [settings.language]);

  // Sync dark class on <html> so Tailwind dark: works
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [settings.theme]);

  // Load from backend when user is logged in
  useEffect(() => {
    const token = authService.getToken();
    if (!token || authService.isQuickDemoSession()) return;

    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const resp = await api.get<ApiResp<SettingsState>>('/users/settings', token);
        if (cancelled) return;
        if (resp?.result) {
          const remote: SettingsState = {
            theme: resp.result.theme === 'dark' ? 'dark' : 'light',
            language: resp.result.language === 'en' ? 'en' : 'vi',
            sidebarMode: resp.result.sidebarMode === 'visible' ? 'visible' : 'auto',
          };
          setSettings(remote);
          saveLocal(remote);
        }
      } catch {
        // Ignore – use local settings
      }
    };

    void fetchSettings();

    return () => { cancelled = true; };
  }, []);

  // Persist to backend helper
  const syncToBackend = useCallback(async (next: SettingsState) => {
    const token = authService.getToken();
    if (!token || authService.isQuickDemoSession()) return;

    setIsSyncing(true);
    try {
      await api.authPut<ApiResp<SettingsState>>('/users/settings', next, token);
    } catch {
      // Ignore sync errors
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const update = useCallback((patch: Partial<SettingsState>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      void syncToBackend(next);
      return next;
    });
  }, [syncToBackend]);

  const setTheme = useCallback((theme: ThemeMode) => update({ theme }), [update]);
  const setLanguage = useCallback((language: Language) => update({ language }), [update]);
  const setSidebarMode = useCallback((sidebarMode: SidebarMode) => update({ sidebarMode }), [update]);

  const t = useMemo(() => translations[settings.language], [settings.language]);

  const value = useMemo<SettingsContextType>(() => ({
    ...settings,
    t,
    setTheme,
    setLanguage,
    setSidebarMode,
    isSyncing,
  }), [settings, t, setTheme, setLanguage, setSidebarMode, isSyncing]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────────
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
