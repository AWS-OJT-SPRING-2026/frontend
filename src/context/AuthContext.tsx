import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types/auth';
import { authService } from '../services/authService';

const PHASE1_DELAY = 1500; // ms – first message duration
const PHASE2_DELAY = 1200; // ms – second message duration (total = PHASE1 + PHASE2)
const TOKEN_CHECK_INTERVAL = 30_000; // ms – token expiry check interval

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Returns true when a stored JWT token is still valid (not expired). */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (typeof payload.exp !== 'number') return true; // no exp → treat as valid
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<TransitionType>(null);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    const savedUser = authService.getUser() as User | null;
    const isQuickDemoSession = authService.isQuickDemoSession();

    if (token && savedUser && (isQuickDemoSession || isTokenValid(token))) {
      setUser(savedUser);
    } else if (token || savedUser) {
      // Token missing or expired – clean up stale data
      authService.logout();
    }

    setIsInitializing(false);
  }, []);

  // ── Expire session helper ─────────────────────────────────────────────────
  const expireSession = useCallback(() => {
    // Don't trigger if already expired or not logged in
    if (sessionExpired) return;
    if (authService.isQuickDemoSession()) return;
    const currentUser = authService.getUser();
    if (!currentUser) return;

    authService.logout();
    setUser(null);
    setIsTransitioning(false);
    setTransitionType(null);
    setTransitionPhase(null);
    setSessionExpired(true);
  }, [sessionExpired]);

  // ── Periodic token expiry check ───────────────────────────────────────────
  useEffect(() => {
    if (isInitializing) return;

    const interval = setInterval(() => {
      const token = authService.getToken();
      if (token && !authService.isQuickDemoSession() && !isTokenValid(token)) {
        expireSession();
      }
    }, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitializing, expireSession]);

  // ── Listen for 401 event fired by api.ts ─────────────────────────────────
  useEffect(() => {
    const handler = () => expireSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [expireSession]);

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
