# 🎓 SlotHubEdu Frontend

> **SlotHubEdu – Nền tảng học tập thông minh**
>
> Giao diện người dùng cho hệ thống e-learning SlotHubEdu, xây dựng bằng React 18 + TypeScript + Vite.

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng](#-tính-năng)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Khởi chạy](#-cài-đặt--khởi-chạy)
- [Cấu hình môi trường](#-cấu-hình-môi-trường)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Phân quyền vai trò](#-phân-quyền-vai-trò)
- [Quản lý xác thực](#-quản-lý-xác-thực)
- [UI Components](#-ui-components)
- [Scripts](#-scripts)
- [Quy ước phát triển](#-quy-ước-phát-triển)
- [Triển khai Production](#-triển-khai-production)

---

## 🌟 Tổng quan

SlotHubEdu Frontend là ứng dụng SPA (Single Page Application) cung cấp giao diện cho ba vai trò chính: **Admin**, **Teacher** (Giáo viên) và **Student** (Học sinh). Ứng dụng kết nối với backend Spring Boot thông qua REST API và hỗ trợ xác thực JWT + AWS Cognito.

## ✨ Tính năng

### 🔐 Xác thực & Bảo mật
- Đăng nhập / Đăng ký với giao diện hiện đại
- Xác thực JWT + AWS Cognito
- Phân quyền theo vai trò (ADMIN / TEACHER / STUDENT)
- Route guards: `ProtectedRoute` & `PublicRoute`
- Tự động xử lý session hết hạn với `SessionExpiredOverlay`
- Quên mật khẩu & đặt lại mật khẩu qua email

### 👨‍💼 Admin Dashboard
- **Quản lý người dùng** – CRUD tài khoản giáo viên, học sinh
- **Quản lý lớp học** – Tạo/sửa/xóa lớp, gán giáo viên & học sinh
- **Quản lý thời khóa biểu** – Lên lịch học, quản lý trạng thái buổi học
- **Thống kê & Phân tích** – Dashboard tổng quan hệ thống
- **Ngân hàng câu hỏi** – Quản lý câu hỏi thi tập trung

### 👩‍🏫 Teacher Dashboard
- **Quản lý lớp học** – Xem danh sách lớp, quản lý thành viên
- **Tạo bài kiểm tra** – Soạn đề thi với hỗ trợ LaTeX (công thức toán)
- **Quản lý tài liệu** – Upload & chia sẻ tài liệu cho lớp
- **Thời khóa biểu** – Xem và quản lý lịch dạy
- **Báo cáo bài nộp** – Xem kết quả, chấm điểm, gửi phản hồi (rich-text)
- **Thông báo lớp học** – Gửi thông báo đến học sinh trong lớp
- **Xuất báo cáo** – Export kết quả ra Excel/PDF

### 🎒 Student Dashboard
- **Trang chủ** – Tổng quan khóa học, bài tập sắp tới (auto-refresh)
- **Làm bài kiểm tra** – Hỗ trợ anti-cheat (fullscreen, phát hiện tab-switch)
- **Không gian học tập** – AI Chat Study Space, ghi chú cá nhân
- **Xem tài liệu** – Truy cập tài liệu lớp học
- **Thời khóa biểu** – Xem lịch học cá nhân
- **Lộ trình học tập** – Roadmap theo chương trình
- **Ôn tập** – Xem lại bài thi và kết quả
- **Thông báo** – Nhận thông báo real-time từ hệ thống & giáo viên

### 🎨 UI/UX
- Responsive design (Desktop & Mobile)
- Dark mode / Light mode
- Đa ngôn ngữ (i18n)
- Hiệu ứng animation mượt mà
- Font Nunito từ Google Fonts
- Hỗ trợ render công thức toán (LaTeX/KaTeX)

---

## 🛠 Công nghệ sử dụng

| Mục | Công nghệ | Phiên bản |
|-----|-----------|-----------|
| **Framework** | React | 18.3.x |
| **Language** | TypeScript | 5.5.x |
| **Build Tool** | Vite | 7.3.x |
| **Styling** | Tailwind CSS | 3.4.x |
| **UI Components** | shadcn/ui (Radix Primitives) | – |
| **Routing** | React Router DOM | 7.13.x |
| **HTTP Client** | Axios | 1.11.x |
| **Charts** | Recharts | 2.15.x |
| **Icons** | Lucide React, Phosphor Icons | – |
| **Math Rendering** | KaTeX + react-katex | 0.16.x |
| **Markdown** | react-markdown + remark-gfm | – |
| **Form Validation** | Zod + React Hook Form | – |
| **Date Handling** | date-fns + date-fns-tz | – |
| **Testing** | Vitest + Testing Library | – |
| **Linting** | ESLint | 9.9.x |

---

## 📦 Yêu cầu hệ thống

- **Node.js** >= 18.x
- **npm** >= 9.x
- Backend SlotHubEdu đang chạy tại `http://localhost:8080/api`

---

## 🚀 Cài đặt & Khởi chạy

```bash
# 1. Clone repository và di chuyển vào thư mục FE
cd FE

# 2. Cài đặt dependencies
npm install

# 3. Tạo file cấu hình môi trường
cp .env.example .env

# 4. Khởi chạy development server
npm run dev
```

Ứng dụng sẽ chạy tại **`http://localhost:5173`**

---

## ⚙️ Cấu hình môi trường

Tạo file `.env` từ `.env.example` và cấu hình các biến sau:

```env
# URL API Backend (Spring Boot)
VITE_API_BASE_URL=http://localhost:8080/api

# URL FastAPI service (AI features)
VITE_FAST_API_BASE_URL=http://localhost:8000/api/v1

# URL Agent service
VITE_AGENT_BASE_URL=http://localhost:8081
```

---

## 📁 Cấu trúc dự án

```
FE/
├── public/                     # Static assets (logo, favicon)
├── img/                        # Image assets
├── src/
│   ├── components/
│   │   ├── admin/              # Admin pages
│   │   │   ├── AdminLayout.tsx         # Layout chính Admin
│   │   │   ├── AdminSchedule.tsx       # Quản lý thời khóa biểu
│   │   │   ├── AdminAnalytics.tsx      # Phân tích & thống kê
│   │   │   ├── AdminStatistics.tsx     # Thống kê tổng quan
│   │   │   ├── ClassManage.tsx         # Quản lý lớp học
│   │   │   ├── UserManage.tsx          # Quản lý người dùng
│   │   │   └── QuestionBank.tsx        # Ngân hàng câu hỏi
│   │   ├── teacher/            # Teacher pages
│   │   │   ├── TeacherLayout.tsx       # Layout chính Teacher
│   │   │   ├── TeacherDashboard.tsx    # Dashboard giáo viên
│   │   │   ├── TeacherClassList.tsx    # Danh sách lớp
│   │   │   ├── TeacherMakeTest.tsx     # Tạo bài kiểm tra
│   │   │   ├── TeacherDocuments.tsx    # Quản lý tài liệu
│   │   │   ├── TeacherSchedule.tsx     # Thời khóa biểu
│   │   │   ├── ExportReportModal.tsx   # Xuất báo cáo
│   │   │   ├── NotificationTimeline.tsx # Timeline thông báo
│   │   │   ├── curriculum/            # Quản lý chương trình
│   │   │   └── question-banks/        # Ngân hàng câu hỏi
│   │   ├── student/            # Student pages
│   │   │   ├── StudentLayout.tsx       # Layout chính Student
│   │   │   ├── StudentHomepage.tsx     # Trang chủ học sinh
│   │   │   ├── StudentTests.tsx        # Làm bài kiểm tra
│   │   │   ├── StudentStudySpace.tsx   # Không gian học tập (AI Chat)
│   │   │   ├── StudentDocuments.tsx    # Xem tài liệu
│   │   │   ├── StudentSchedule.tsx     # Thời khóa biểu
│   │   │   ├── StudentRoadmap.tsx      # Lộ trình học tập
│   │   │   ├── StudentReview.tsx       # Ôn tập & xem lại bài
│   │   │   ├── StudentChat.tsx         # Chat AI
│   │   │   ├── ChatWidgets.tsx         # Chat widgets
│   │   │   └── NotificationDropdown.tsx # Thông báo
│   │   ├── shared/             # Shared components
│   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── MathRenderer.tsx        # Render công thức toán (KaTeX)
│   │   │   ├── button.tsx, card.tsx, dialog.tsx, ...
│   │   │   └── ...
│   │   ├── Login.tsx           # Trang đăng nhập
│   │   ├── LandingPage.tsx     # Trang landing
│   │   ├── ForgotPassword.tsx  # Quên mật khẩu
│   │   ├── AccountSettings.tsx # Cài đặt tài khoản
│   │   ├── Dashboard.tsx       # Router dashboard
│   │   ├── UserMenu.tsx        # Menu người dùng
│   │   └── SettingsPanel.tsx   # Panel cài đặt
│   ├── context/
│   │   ├── AuthContext.tsx     # Quản lý xác thực (JWT, session)
│   │   └── SettingsContext.tsx # Cài đặt người dùng (theme, language)
│   ├── services/               # API service layer
│   │   ├── api.ts              # HTTP client (axios wrapper)
│   │   ├── authService.ts      # Xác thực (login, register, logout)
│   │   ├── classroomService.ts # API lớp học
│   │   ├── assignmentService.ts # API bài tập
│   │   ├── timetableService.ts # API thời khóa biểu
│   │   ├── notificationService.ts # API thông báo
│   │   ├── chatService.ts      # API AI Chat
│   │   └── ...                 # Các service khác
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities & helpers
│   ├── types/                  # TypeScript type definitions
│   ├── validation/             # Form validation schemas
│   ├── i18n/                   # Đa ngôn ngữ
│   ├── test/                   # Test files
│   ├── App.tsx                 # Root component & routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles & Tailwind
├── .env.example                # Template biến môi trường
├── index.html                  # HTML entry point
├── tailwind.config.js          # Cấu hình Tailwind CSS
├── vite.config.ts              # Cấu hình Vite
├── tsconfig.json               # Cấu hình TypeScript
├── eslint.config.js            # Cấu hình ESLint
└── package.json                # Dependencies & scripts
```

---

## 🔑 Phân quyền vai trò

| Vai trò | Route prefix | Mô tả |
|---------|-------------|-------|
| `ADMIN` | `/admin` | Quản trị hệ thống toàn quyền |
| `TEACHER` | `/teacher` | Giáo viên quản lý lớp & bài tập |
| `STUDENT` | `/student` | Học sinh học tập & làm bài |

Routing theo vai trò được cấu hình tại `src/lib/roleRoutes.ts`. Hàm `getHomeRouteForRole()` ánh xạ role từ backend sang route tương ứng.

### Route Guards

- **`ProtectedRoute`** – Yêu cầu đăng nhập + đúng vai trò
- **`PublicRoute`** – Redirect người dùng đã đăng nhập về dashboard

Cả hai được định nghĩa tại `src/App.tsx`.

---

## 🔐 Quản lý xác thực

| Thành phần | File | Mô tả |
|------------|------|-------|
| Auth State | `context/AuthContext.tsx` | Quản lý token & user state |
| Auth Service | `services/authService.ts` | API login/register/logout |
| HTTP Client | `services/api.ts` | Axios wrapper, auto-attach token |
| Session Expiry | `App.tsx` | Overlay khi session hết hạn |

**Luồng xác thực:**
1. User đăng nhập → nhận JWT token
2. Token & user info được lưu vào `localStorage`
3. `api.ts` tự động gắn `Authorization: Bearer <token>` cho request authenticated
4. Khi nhận response `401`, event `educare:session-expired` được dispatch
5. `AuthContext` lắng nghe event → hiển thị `SessionExpiredOverlay`

**Lưu trữ:**
- Token: `localStorage` key `auth_token`
- User info: `localStorage` key `user`

---

## 🧩 UI Components

Sử dụng **shadcn/ui** (Radix Primitives) làm nền tảng. Các component có sẵn:

| Component | File |
|-----------|------|
| Button | `src/components/ui/button.tsx` |
| Card | `src/components/ui/card.tsx` |
| Dialog | `src/components/ui/dialog.tsx` |
| Input | `src/components/ui/input.tsx` |
| Select | `src/components/ui/select.tsx` |
| Table | `src/components/ui/table.tsx` |
| Tabs | `src/components/ui/tabs.tsx` |
| Avatar | `src/components/ui/avatar.tsx` |
| Dropdown Menu | `src/components/ui/dropdown-menu.tsx` |
| Scroll Area | `src/components/ui/scroll-area.tsx` |
| Chart | `src/components/ui/chart.tsx` |
| Math Renderer | `src/components/ui/MathRenderer.tsx` |

> **Quy tắc:** Luôn sử dụng component có sẵn trước khi thêm thư viện mới.

---

## 📜 Scripts

```bash
# Khởi chạy dev server
npm run dev

# Build production
npm run build

# Xem bản build production
npm run preview

# Kiểm tra TypeScript types
npm run typecheck

# Chạy linter
npm run lint

# Chạy unit tests
npm test
```

---

## 📐 Quy ước phát triển

### API Calls
- Sử dụng `api.get`, `api.post` cho request công khai
- Sử dụng `api.authGet`, `api.authPost`, `api.authPut`, `api.authDelete` cho request cần xác thực
- Response lỗi throw `ApiError` có type

### Form Validation
- Validators dùng chung tại `src/validation/registerValidation.ts`
- Các hàm: `validateRegister`, `validateRegisterRequired`, `mapBackendRegisterErrorToField`

### Timezone
- Sử dụng tiện ích `parseVnDate` cho tất cả việc parse ngày tháng
- Timezone thống nhất: `Asia/Ho_Chi_Minh`
- **Không** sử dụng `new Date()` trực tiếp cho date từ backend

### Code Style
- Sử dụng functional components + hooks
- Đặt tên file component theo PascalCase
- Service files theo camelCase
- Luôn thêm TypeScript types cho props & state

---

## 🚢 Triển khai Production

```bash
# Build
npm run build

# Output tại thư mục dist/
# Deploy dist/ lên bất kỳ static hosting nào (S3, Vercel, Netlify, ...)
```

> **Lưu ý:** Đảm bảo cấu hình biến môi trường `VITE_API_BASE_URL` trỏ đến URL backend production trước khi build.

---

## 📞 Liên hệ

- **Project:** SlotHubEdu – OJT Program
- **Team:** AWS OJT SP26
- **Backend:** Xem [BE/README.md](../BE/README.md)

---

<p align="center">
  <b>© 2026 SlotHubEdu – Slothub. All rights reserved.</b>
</p>
