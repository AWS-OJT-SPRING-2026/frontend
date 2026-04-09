import { fetchAuthSession, signIn, signOut } from 'aws-amplify/auth';
import { AuthResponse, LoginRequest, User } from '../types/auth';

export type QuickLoginRole = "admin" | "teacher" | "student";
const QUICK_DEMO_SESSION_KEY = "educare_quick_demo_session";
const COGNITO_ACCESS_TOKEN_KEY = "educare_cognito_access_token";
const COGNITO_ID_TOKEN_KEY = "educare_cognito_id_token";
const COGNITO_REFRESH_TOKEN_KEY = "educare_cognito_refresh_token";

const AUTH_STORAGE_MODE = String(import.meta.env.VITE_AUTH_STORAGE ?? 'local').toLowerCase();

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type MaybeTokenWithToString = { toString: () => string };
type MaybeSessionTokens = { refreshToken?: MaybeTokenWithToString };

function getAuthStorage(): StorageLike {
  if (AUTH_STORAGE_MODE === 'session') {
    return sessionStorage;
  }
  return localStorage;
}

function extractRefreshToken(tokens: unknown): string {
  const refreshToken = (tokens as MaybeSessionTokens | undefined)?.refreshToken;
  if (!refreshToken) {
    return '';
  }
  try {
    return refreshToken.toString();
  } catch {
    return '';
  }
}

const ALLOWED_LOGOUT_URLS = [
  "http://localhost:5173",
  "https://slothub.id.vn",
] as const;

type JwtPayload = {
  sub?: string;
  username?: string;
  email?: string;
  name?: string;
  fullName?: string;
  scope?: string;
  roles?: string[];
  authorities?: string[];
  role?: string;
  /** Cognito custom user pool attribute — contains the application role. */
  "custom:role"?: string;
  avatarUrl?: string;
  exp?: number;
  iat?: number;
  [k: string]: unknown;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

function tryDecodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRole(input: unknown): User["role"] {
  const roleLower = String(input ?? "").toLowerCase();
  if (roleLower.includes("admin")) return "admin";
  if (roleLower.includes("teacher")) return "teacher";
  // backend STUDENT (or legacy USER) maps to student area
  if (roleLower.includes("student") || roleLower.includes("user")) return "student";
  return "student";
}

function deriveUserFromToken(token: string, fallbackUsername?: string): User {
  const payload = tryDecodeJwt(token);

  const idCandidate = payload?.sub ?? "";

  // NEW: "custom:role" (Cognito) takes precedence over all other role claims.
  // OLD: role was read from scope / roles / authorities / role claims.
  const roleFromScope = payload?.scope?.split(/\s+/).find(Boolean);
  const roleCandidate =
    payload?.["custom:role"] ??   // Cognito custom attribute (highest priority)
    payload?.role ??
    (Array.isArray(payload?.roles) ? payload?.roles[0] : undefined) ??
    (Array.isArray(payload?.authorities) ? payload?.authorities[0] : undefined) ??
    roleFromScope;

  return {
    id: String(idCandidate),
    email: String(payload?.email ?? ""),
    name: String(
      payload?.name ?? payload?.fullName ?? payload?.username ?? fallbackUsername ?? "User"
    ),
    role: normalizeRole(roleCandidate),
    avatarUrl: typeof payload?.avatarUrl === "string" ? payload.avatarUrl : undefined,
  };
}

function mapCognitoSignInError(error: unknown): string {
  const anyError = error as { name?: string; code?: string; message?: string };
  const errorCode = anyError?.name ?? anyError?.code;

  if (errorCode === 'NotAuthorizedException') {
    return 'Tên đăng nhập hoặc mật khẩu không đúng.';
  }
  if (errorCode === 'UserDisabledException') {
    return 'ACCOUNT_LOCKED';
  }
  if (errorCode === 'UserNotConfirmedException') {
    return 'Tài khoản chưa được xác nhận. Vui lòng kiểm tra email để xác nhận tài khoản.';
  }
  if (errorCode === 'PasswordResetRequiredException') {
    return 'Tài khoản yêu cầu đặt lại mật khẩu trước khi đăng nhập.';
  }
  if (errorCode === 'UserNotFoundException') {
    return 'Tài khoản không tồn tại.';
  }
  if (errorCode === 'TooManyRequestsException') {
    return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
  }

  return anyError?.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
}

async function getCognitoTokens(): Promise<{ accessToken: string; idToken: string }> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() ?? '';
  const idToken = session.tokens?.idToken?.toString() ?? '';
  const refreshToken = extractRefreshToken(session.tokens);

  if (!accessToken || !idToken) {
    throw new Error('Không thể lấy phiên đăng nhập từ Cognito.');
  }

  const storage = getAuthStorage();
  storage.setItem(COGNITO_ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(COGNITO_ID_TOKEN_KEY, idToken);
  if (refreshToken) {
    storage.setItem(COGNITO_REFRESH_TOKEN_KEY, refreshToken);
  }

  return { accessToken, idToken };
}

// ─────────────────────────────────────────────────────────────────────────────

export const authService = {
  async getCurrentSessionAuth(): Promise<AuthResponse | null> {
    try {
      const { accessToken, idToken } = await getCognitoTokens();
      return {
        token: accessToken,
        user: deriveUserFromToken(idToken),
      };
    } catch {
      return null;
    }
  },

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const result = await signIn({
        username: credentials.username,
        password: credentials.password,
      });

      const signInStep = result.nextStep?.signInStep;
      if (signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        throw new Error('NEW_PASSWORD_REQUIRED');
      }
      if (!result.isSignedIn) {
        throw new Error('Không thể hoàn tất đăng nhập. Vui lòng thử lại.');
      }

      const { accessToken, idToken } = await getCognitoTokens();
      this.clearQuickDemoSession();
      return {
        token: accessToken,
        user: deriveUserFromToken(idToken, credentials.username),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'NEW_PASSWORD_REQUIRED') {
        throw error;
      }
      throw new Error(mapCognitoSignInError(error));
    }
  },

  // ── OLD quickDemoLogin (commented — quick role buttons now redirect to Cognito) ──
  // async quickDemoLogin(role: QuickLoginRole): Promise<AuthResponse> {
  //   this.markQuickDemoSession();
  //   return {
  //     token: `quick-demo-${role}`,
  //     user: buildQuickDemoUser(role),
  //   };
  // },

  async logoutRemote(): Promise<void> {
    if (this.isQuickDemoSession()) return;
    const redirectUrl = ALLOWED_LOGOUT_URLS.includes(window.location.origin as (typeof ALLOWED_LOGOUT_URLS)[number])
      ? window.location.origin
      : "http://localhost:5173";
    await signOut({ global: false, oauth: { redirectUrl } });
  },

  /**
   * Returns true if the stored access token's `exp` claim is in the past.
   * Checks the raw JWT directly — does NOT call fetchAuthSession, so Amplify
   * cannot silently refresh before we get a chance to act.
   */
  isAccessTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const payload = tryDecodeJwt(token);
    if (!payload?.exp) return true;
    // 10-second buffer to account for clock skew
    return payload.exp < Math.floor(Date.now() / 1000) + 10;
  },

  /**
   * Wipes every Cognito / Amplify key from both localStorage and sessionStorage,
   * including our own custom keys and Amplify's internal keys.
   */
  clearAllCognitoKeys(): void {
    const storage = getAuthStorage();
    storage.removeItem(COGNITO_ACCESS_TOKEN_KEY);
    storage.removeItem(COGNITO_ID_TOKEN_KEY);
    storage.removeItem(COGNITO_REFRESH_TOKEN_KEY);

    // Amplify v6 writes CognitoIdentityServiceProvider.* and amplify-* keys.
    const clearFromStorage = (s: Storage) => {
      const toRemove: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const key = s.key(i);
        if (
          key &&
          (key.startsWith('CognitoIdentityServiceProvider') ||
            key.startsWith('amplify-') ||
            key.startsWith('aws-amplify'))
        ) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => s.removeItem(k));
    };

    clearFromStorage(localStorage);
    clearFromStorage(sessionStorage);

    // Legacy keys from the old local-JWT flow
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  },

  /**
   * Hard logout: invalidates the session server-side via Cognito's global
   * signOut (revokes the refresh token), then wipes all local credentials.
   * Always resolves — errors from signOut are swallowed so the local wipe
   * always completes.
   */
  async hardLogout(): Promise<void> {
    try {
      await signOut({ global: true });
    } catch {
      // Even if signOut fails we still clear local storage below.
    }
    this.clearAllCognitoKeys();
    this.removeUser();
    this.clearQuickDemoSession();
  },

  saveToken(token: string): void {
    getAuthStorage().setItem(COGNITO_ACCESS_TOKEN_KEY, token);
  },

  getToken(): string | null {
    return getAuthStorage().getItem(COGNITO_ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return getAuthStorage().getItem(COGNITO_REFRESH_TOKEN_KEY);
  },

  removeToken(): void {
    const storage = getAuthStorage();
    storage.removeItem(COGNITO_ACCESS_TOKEN_KEY);
    storage.removeItem(COGNITO_ID_TOKEN_KEY);
    storage.removeItem(COGNITO_REFRESH_TOKEN_KEY);
    // Cleanup legacy keys from old local JWT flow.
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
  },

  saveUser(user: unknown): void {
    localStorage.setItem("user", JSON.stringify(user));
  },

  getUser(): unknown {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  removeUser(): void {
    localStorage.removeItem("user");
  },

  markQuickDemoSession(): void {
    localStorage.setItem(QUICK_DEMO_SESSION_KEY, "1");
  },

  clearQuickDemoSession(): void {
    localStorage.removeItem(QUICK_DEMO_SESSION_KEY);
  },

  isQuickDemoSession(): boolean {
    return localStorage.getItem(QUICK_DEMO_SESSION_KEY) === "1";
  },

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.clearQuickDemoSession();
  },

  async syncTokensFromAmplifySession(): Promise<string | null> {
    try {
      const { accessToken } = await getCognitoTokens();
      return accessToken;
    } catch {
      return null;
    }
  },

  async refreshAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const accessToken = session.tokens?.accessToken?.toString() ?? '';
      const idToken = session.tokens?.idToken?.toString() ?? '';
      const refreshToken = extractRefreshToken(session.tokens);

      if (!accessToken || !idToken) {
        return null;
      }

      const storage = getAuthStorage();
      storage.setItem(COGNITO_ACCESS_TOKEN_KEY, accessToken);
      storage.setItem(COGNITO_ID_TOKEN_KEY, idToken);
      if (refreshToken) {
        storage.setItem(COGNITO_REFRESH_TOKEN_KEY, refreshToken);
      }

      return accessToken;
    } catch {
      return null;
    }
  },
};
