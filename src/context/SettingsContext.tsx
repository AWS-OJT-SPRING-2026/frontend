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
