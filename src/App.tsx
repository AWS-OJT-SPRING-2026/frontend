import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import type { TransitionType, TransitionPhase } from './context/AuthContext';
import { authService } from './services/authService';
import { getHomeRouteForRole } from './lib/roleRoutes';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { LandingPage } from './components/LandingPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { TeacherLayout } from './components/teacher/TeacherLayout';
import { StudentLayout } from './components/student/StudentLayout';
import { AdminStatistics } from './components/admin/AdminStatistics';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { UserManage } from './components/admin/UserManage';
import { ClassManage } from './components/admin/ClassManage';
import { AdminSchedule } from './components/admin/AdminSchedule';
import { QuestionBank } from './components/admin/QuestionBank';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherClassList } from './components/teacher/TeacherClassList';
import { TeacherMakeTest } from './components/teacher/TeacherMakeTest';
import { TeacherDocuments } from './components/teacher/TeacherDocuments';
import { TeacherSchedule } from './components/teacher/TeacherSchedule';
import { TeacherQuestionBankLayout } from './components/teacher/question-banks/TeacherQuestionBankLayout';
import { StudentHomepage } from './components/student/StudentHomepage';
import { StudentRoadmap } from './components/student/StudentRoadmap';
import { StudentReview } from './components/student/StudentReview';
import { StudentTests } from './components/student/StudentTests';
import { StudentChat } from './components/student/StudentChat';
import { StudentSchedule } from './components/student/StudentSchedule';
import { StudentDocuments } from './components/student/StudentDocuments';
import { AccountSettings } from './components/AccountSettings';

/** Returns the correct overlay message based on transition type & phase */
function useOverlayMessage(type: TransitionType, phase: TransitionPhase) {
  const { t } = useSettings();

  if (type === 'login') {
    if (phase === 1) return { text: t.auth.loggingIn, sub: t.auth.loggingInSub };
    return { text: t.auth.loadingData, sub: t.auth.loadingDataSub };
  }
  if (type === 'logout') {
    if (phase === 1) return { text: t.auth.loggingOut, sub: t.auth.loggingOutSub };
    return { text: t.auth.loggedOut, sub: t.auth.loggedOutSub, isGoodbye: true };
  }
  return { text: t.auth.loadingSystem };
}

/** Full-screen overlay shown while initialising or during login/logout transition */
function LoadingOverlay({ type, phase }: { type: TransitionType; phase: TransitionPhase }) {
  const msg = useOverlayMessage(type, phase);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1A1A] transition-all"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <img
        src="/logo.svg"
        alt="SlothubEdu"
        className={`w-16 rounded-xl bg-white mb-6 ${msg.isGoodbye ? 'opacity-60' : 'animate-pulse'}`}
      />

      {/* Bouncing dots – hidden on goodbye screen */}
      {!msg.isGoodbye && (
        <div className="flex gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:0ms]" />
          <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:150ms]" />
          <span className="w-3 h-3 rounded-full bg-[#FF6B4A] animate-bounce [animation-delay:300ms]" />
        </div>
      )}

      {/* Main message */}
      <p
        key={msg.text}
        className={`text-sm font-extrabold tracking-wide transition-all duration-500 ${
          msg.isGoodbye ? 'text-[#FF6B4A] text-base' : 'text-gray-300'
        }`}
      >
        {msg.text}
      </p>

      {/* Sub message */}
      {msg.sub && (
        <p
          key={msg.sub}
          className="mt-1.5 text-xs text-gray-500 font-semibold tracking-wide transition-all duration-500"
        >
          {msg.sub}
        </p>
      )}
    </div>
  );
}

/** Full-screen overlay shown when session has expired */
function SessionExpiredOverlay() {
  const { t } = useSettings();

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1A1A1A]"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <img src="/logo.svg" alt="SlothubEdu" className="w-16 rounded-xl bg-white mb-6 opacity-70" />

      {/* Icon cảnh báo */}
      <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mb-4">
        <span className="text-3xl">⏱️</span>
      </div>

      <p className="text-white font-extrabold text-lg mb-1 tracking-wide">{t.auth.sessionExpired}</p>
      <p className="text-gray-400 font-semibold text-sm mb-6 text-center max-w-xs leading-relaxed">
        {t.auth.sessionExpiredSub}
      </p>

      {/* Nút đăng nhập lại — reload về "/" để React Router redirect */}
      <button
        onClick={() => { window.location.href = '/login'; }}
        className="px-8 py-3 rounded-2xl bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold text-sm transition-colors"
      >
        {t.auth.loginAgain}
      </button>
    </div>
  );
}

/**
 * Only renders children when NOT authenticated.
 * If the user is logged in, redirect them to their role dashboard instead.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
}

/**
 * Only renders children when authenticated AND role matches.
 * Otherwise redirects to the landing / login page.
 */
function ProtectedRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== role) {
    // Wrong role – redirect to their actual dashboard
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
}

function AuthPages() {
  const [authView, setAuthView] = useState<'login' | 'forgot'>('login');

  return (
    <PublicRoute>
      {authView === 'login' && (
        <Login
          onSwitchToForgotPassword={() => setAuthView('forgot')}
        />
      )}
      {authView === 'forgot' && (
        <ForgotPassword onBackToLogin={() => setAuthView('login')} />
      )}
    </PublicRoute>
  );
}

function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const completeCallback = async () => {
      const sessionAuth = await authService.getCurrentSessionAuth();
      if (cancelled) return;

      if (!sessionAuth) {
        navigate('/login', { replace: true });
        return;
      }

      login(sessionAuth.token, sessionAuth.user);
      navigate(getHomeRouteForRole(sessionAuth.user.role), { replace: true });
    };

    void completeCallback();

    return () => {
      cancelled = true;
    };
  }, [login, navigate]);

  return <LoadingOverlay type={'login'} phase={1} />;
}

function AppRoutes() {
  const { isInitializing, isTransitioning, transitionType, transitionPhase, sessionExpired } = useAuth();
  const { t } = useSettings();

  if (isInitializing || isTransitioning) {
    return <LoadingOverlay type={transitionType} phase={transitionPhase} />;
  }

  // Session expired — show full-screen notice, block all routes
  if (sessionExpired) {
    return <SessionExpiredOverlay />;
  }

  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<AuthPages />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminStatistics />} />
        <Route path="statistics" element={<AdminAnalytics />} />
        <Route path="users" element={<UserManage />} />
        <Route path="classes" element={<ClassManage />} />
        <Route path="schedule" element={<AdminSchedule />} />
        <Route path="questions" element={<QuestionBank />} />
        <Route path="*" element={<div className="font-bold text-2xl p-8">{t.common.pageUnderConstruction}</div>} />
      </Route>

      {/* Teacher */}
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherLayout /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<TeacherClassList />} />
        <Route path="classes/:classId" element={<TeacherClassList />} />
        <Route path="tests" element={<TeacherMakeTest />} />
        <Route path="documents" element={<TeacherDocuments />} />
        <Route path="question-banks/*" element={<TeacherQuestionBankLayout />} />
        <Route path="schedule" element={<TeacherSchedule />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="*" element={<div className="font-bold text-2xl p-8">{t.common.pageUnderConstruction}</div>} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
        <Route index element={<StudentHomepage />} />
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="roadmap" element={<StudentRoadmap />} />
        <Route path="review" element={<StudentReview />} />
        <Route path="exercises" element={<StudentTests />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="*" element={<div className="font-bold text-2xl p-8">{t.common.pageUnderConstruction}</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
