import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { User } from '../types/auth';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { quizSessionGuard } from '../lib/quizSessionGuard';

const PHASE1_DELAY = 1500; // ms – first message duration
const PHASE2_DELAY = 1200; // ms – second message duration (total = PHASE1 + PHASE2)
const SESSION_CHECK_INTERVAL = 30_000; // ms – Amplify session check interval

export type TransitionType = 'login' | 'logout' | 'session_expired' | null;
export type TransitionPhase = 1 | 2 | null;

// Custom event name used by api.ts to notify when a 401 is received
export const SESSION_EXPIRED_EVENT = 'educare:session-expired';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isTransitioning: boolean;
  transitionType: TransitionType;
  transitionPhase: TransitionPhase;
  sessionExpired: boolean;
  login: (token: string, user: User) => void;
  updateUser: (nextUser: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  fullName?: string;
  username?: string;
  role?: string;
  scope?: string;
  roles?: string[];
  authorities?: string[];
  'custom:role'?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRole(roleCandidate: unknown): User['role'] {
  const role = String(roleCandidate ?? '').toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('teacher')) return 'teacher';
  return 'student';
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/teacher') || pathname.startsWith('/student');
}

async function getAmplifySessionAuth(): Promise<{ token: string; user: User } | null> {
  try {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString() ?? '';
    const idToken = session.tokens?.idToken?.toString() ?? '';
    if (!accessToken || !idToken) {
      return null;
    }

    const payload = decodeJwtPayload(idToken);
    const roleCandidate =
      payload?.['custom:role'] ??
      payload?.role ??
      (Array.isArray(payload?.roles) ? payload.roles[0] : undefined) ??
      (Array.isArray(payload?.authorities) ? payload.authorities[0] : undefined) ??
      payload?.scope?.split(/\s+/).find(Boolean);

    return {
      token: accessToken,
      user: {
        id: String(payload?.sub ?? ''),
        email: String(payload?.email ?? ''),
        name: String(payload?.name ?? payload?.fullName ?? payload?.username ?? 'User'),
        role: normalizeRole(roleCandidate),
      },
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<TransitionType>(null);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const isCheckingSessionRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const bootstrapAuth = async () => {
      const savedUser = authService.getUser() as User | null;
      const hasQuickDemoSession = authService.isQuickDemoSession();

      if (hasQuickDemoSession) {
        if (savedUser && !isCancelled) {
          setUser(savedUser);
        }
        if (!isCancelled) {
          setIsInitializing(false);
        }
        return;
      }

      const sessionAuth = await getAmplifySessionAuth();
      if (isCancelled) return;

      if (sessionAuth) {
        await authService.syncTokensFromAmplifySession();
        if (savedUser) {
          setUser(savedUser);
        } else {
          authService.saveUser(sessionAuth.user);
          setUser(sessionAuth.user);
        }
      } else if (authService.getToken() || savedUser) {
        authService.logout();
      }

      setIsInitializing(false);
    };

    void bootstrapAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Keep auth user profile in sync for sidebar/header UI.
  useEffect(() => {
    if (!user) return;
    if (authService.isQuickDemoSession()) return;

    let isCancelled = false;

    const hydrateUser = async () => {
      try {
        const sessionAuth = await getAmplifySessionAuth();
        if (!sessionAuth) return;
        await authService.syncTokensFromAmplifySession();

        const profile = await profileService.getMyProfile(sessionAuth.token);
        if (isCancelled) return;

        const nextUser: User = {
          ...user,
          name: profile.fullName || user.name,
          email: profile.email || user.email,
          avatarUrl: profile.avatarUrl || user.avatarUrl,
        };

        const changed =
          nextUser.name !== user.name ||
          nextUser.email !== user.email ||
          nextUser.avatarUrl !== user.avatarUrl;

        if (changed) {
          authService.saveUser(nextUser);
          setUser(nextUser);
        }
      } catch {
        // Ignore hydration errors; account page can still fetch profile independently.
      }
    };

    void hydrateUser();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // ── Hard-logout helper ────────────────────────────────────────────────────
  // Clears all Cognito keys, revokes the refresh token server-side via
  // signOut({ global: true }), then shows the session-expired overlay.
  // Use this whenever the access token has genuinely expired so that
  // Amplify cannot silently issue a new one from the refresh token.
  const hardLogout = useCallback(async () => {
    if (sessionExpired) return;
    if (authService.isQuickDemoSession()) return;

    await authService.hardLogout();

    setUser(null);
    setIsTransitioning(false);
    setTransitionType(null);
    setTransitionPhase(null);

    const pathname = window.location.pathname;
    if (isProtectedPath(pathname)) {
      setSessionExpired(true);
    }
    // Replace history entry so the browser back-button cannot return to the
    // protected page after the user lands on /login.
    window.history.replaceState(null, '', window.location.href);
  }, [sessionExpired]);

  // ── Expire session helper ─────────────────────────────────────────────────
  const expireSession = useCallback(() => {
    // Don't trigger if already expired or not logged in
    if (sessionExpired) return;
    if (authService.isQuickDemoSession()) return;
    const currentUser = authService.getUser();
    if (!currentUser) return;

    // Never force session-expired overlay when user is already on public pages.
    const pathname = window.location.pathname;
    if (!isProtectedPath(pathname)) {
      authService.logout();
      setUser(null);
      setSessionExpired(false);
      return;
    }

    authService.logout();
    setUser(null);
    setIsTransitioning(false);
    setTransitionType(null);
    setTransitionPhase(null);
    setSessionExpired(true);
  }, [sessionExpired]);

  // ── Periodic Amplify session check ────────────────────────────────────────
  useEffect(() => {
    if (isInitializing) return;

    const interval = setInterval(() => {
      if (authService.isQuickDemoSession()) return;
      if (isCheckingSessionRef.current) return;

      void (async () => {
        isCheckingSessionRef.current = true;
        try {
          // Check the raw token exp BEFORE calling fetchAuthSession.
          // fetchAuthSession auto-refreshes using the refresh token, so we
          // must inspect the stored JWT ourselves to detect genuine expiry.
          if (authService.isAccessTokenExpired()) {
            if (quizSessionGuard.isActive()) {
              // Student is in a timed quiz — attempt a silent token refresh
              // so they don't lose progress mid-session. Only hard-logout if
              // the refresh token itself is also expired or revoked.
              const refreshed = await authService.refreshAccessToken();
              if (!refreshed) {
                // Refresh failed (refresh token expired/revoked) — no choice
                await hardLogout();
              }
              // Refresh succeeded: new tokens are already stored by
              // refreshAccessToken(). The student continues uninterrupted.
              return;
            }
            await hardLogout();
            return;
          }

          // Token is still within its lifetime — verify the Amplify session
          // is otherwise intact (e.g. revoked server-side).
          const hasSession = await getAmplifySessionAuth();
          if (!hasSession && authService.getUser()) {
            expireSession();
          }
        } finally {
          isCheckingSessionRef.current = false;
        }
      })();
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitializing, expireSession, hardLogout]);

  // ── Listen for 401 event fired by api.ts ─────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (isProtectedPath(window.location.pathname)) {
        // Use hardLogout so the refresh token is also revoked and cleared.
        void hardLogout();
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [hardLogout]);

  const login = useCallback((token: string, userData: User) => {
    authService.saveToken(token);
    authService.saveUser(userData);
    setSessionExpired(false);
    setTransitionType('login');
    setTransitionPhase(1);
    setIsTransitioning(true);
    // Phase 1: "Đang đăng nhập..."
    setTimeout(() => {
      setTransitionPhase(2);
      // Phase 2: "Đang tải dữ liệu..." then actually navigate
      setTimeout(() => {
        setUser(userData);
        setIsTransitioning(false);
        setTransitionType(null);
        setTransitionPhase(null);
      }, PHASE2_DELAY);
    }, PHASE1_DELAY);
  }, []);

  const logout = useCallback(async () => {
    setTransitionType('logout');
    setTransitionPhase(1);
    setIsTransitioning(true);
    try {
      await authService.logoutRemote();
    } catch {
      // Ignore remote logout errors; still clear local session.
    }
    // Phase 1: "Đang đăng xuất..."
    setTimeout(() => {
      authService.logout();
      setUser(null);
      setTransitionPhase(2);
      // Phase 2: "Bạn đã đăng xuất. Hẹn gặp lại!" then close overlay
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionType(null);
        setTransitionPhase(null);
      }, PHASE2_DELAY);
    }, PHASE1_DELAY);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    authService.saveUser(nextUser);
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        isTransitioning,
        transitionType,
        transitionPhase,
        sessionExpired,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
