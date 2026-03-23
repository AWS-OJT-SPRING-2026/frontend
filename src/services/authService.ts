import { api } from "./api";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from "../types/auth";

export type QuickLoginRole = "admin" | "teacher" | "student";
const QUICK_DEMO_SESSION_KEY = "educare_quick_demo_session";

type AnyObj = Record<string, any>;

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

  // Common patterns:
  // - scope: "ADMIN TEACHER" or "ROLE_ADMIN"
  // - roles: ["ADMIN"]
  // - authorities: ["ROLE_ADMIN"]
  // - role: "ADMIN"
  const roleFromScope = payload?.scope?.split(/\s+/).find(Boolean);
  const roleCandidate =
    payload?.role ??
    (Array.isArray(payload?.roles) ? payload?.roles[0] : undefined) ??
    (Array.isArray(payload?.authorities) ? payload?.authorities[0] : undefined) ??
    roleFromScope;

  return {
    id: String(payload?.sub ?? ""),
    email: String(payload?.email ?? ""),
    name: String(
      payload?.name ?? payload?.fullName ?? payload?.username ?? fallbackUsername ?? "User"
    ),
    role: normalizeRole(roleCandidate),
    avatarUrl: typeof payload?.avatarUrl === 'string' ? payload.avatarUrl : undefined,
  };
}

function normalizeAuthResponse(
  raw: any,
  fallbackUsername?: string
): AuthResponse {
  const root: AnyObj = raw ?? {};
  const data: AnyObj = root.result ?? root.data ?? root; // support {result:{...}} wrappers

  const token: string | undefined = data.token ?? data.accessToken ?? data.jwt;
  const userRaw: AnyObj =
    data.user ??
    data.account ??
    data.profile ??
    data.data?.user ??
    data.data?.account;

  if (!token) {
    throw new Error("Invalid login response from server");
  }

  // If backend doesn't return user info (our BE currently returns only token+authenticated), derive from JWT.
  if (!userRaw) {
    return { token, user: deriveUserFromToken(token, fallbackUsername) };
  }

  const roleRaw = (userRaw.role ?? userRaw.authority ?? userRaw.userRole) as
    | string
    | undefined;
  const roleLower = String(roleRaw ?? "").toLowerCase();

  let role: User["role"] = "student";
  if (roleLower === "admin") role = "admin";
  else if (roleLower === "teacher") role = "teacher";
  else if (roleLower === "student" || roleLower === "user") role = "student";

  const user: User = {
    id: String(userRaw.id ?? userRaw.userId ?? ""),
    email: String(userRaw.email ?? ""),
    name: String(userRaw.name ?? userRaw.fullName ?? ""),
    role,
    avatarUrl: typeof userRaw.avatarUrl === 'string' ? userRaw.avatarUrl : undefined,
  };

  return { token, user };
}

function normalizeRegisterResponse(
  raw: any,
  fallbackUsername?: string,
  fallbackEmail?: string,
  fallbackFullName?: string,
): AuthResponse {
  const root: AnyObj = raw ?? {};
  const data: AnyObj = root.result ?? root.data ?? root;

  // Register endpoint returns UserResponse and doesn't return token.
  const roleLower = String(
    data.role?.roleName ?? data.roleName ?? data.role ?? "",
  ).toLowerCase();

  const user: User = {
    id: String(data.userID ?? data.userId ?? data.id ?? ""),
    email: String(data.email ?? fallbackEmail ?? ""),
    name: String(
      data.fullName ?? data.name ?? fallbackFullName ?? fallbackUsername ?? "",
    ),
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : undefined,
    role:
      roleLower === "admin"
        ? "admin"
        : roleLower === "teacher"
          ? "teacher"
          : "student",
  };

  return { token: "", user };
}

function buildQuickDemoUser(role: QuickLoginRole): User {
  if (role === "admin") {
    return {
      id: "demo-admin",
      email: "admin@demo.local",
      name: "Quản trị viên Demo",
      role: "admin",
    };
  }

  if (role === "teacher") {
    return {
      id: "demo-teacher",
      email: "teacher@demo.local",
      name: "Giáo viên Demo",
      role: "teacher",
    };
  }

  return {
    id: "demo-student",
    email: "student@demo.local",
    name: "Học sinh Demo",
    role: "student",
  };
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Backend: http://localhost:8080/api/auth/login
    const raw = await api.post<any>("/auth/login", credentials);
    this.clearQuickDemoSession();
    return normalizeAuthResponse(raw, credentials.username);
  },

  async quickDemoLogin(role: QuickLoginRole): Promise<AuthResponse> {
    this.markQuickDemoSession();
    return {
      token: `quick-demo-${role}`,
      user: buildQuickDemoUser(role),
    };
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Backend: http://localhost:8080/api/users/register
    const raw = await api.post<any>("/users/register", userData);
    return normalizeRegisterResponse(
      raw,
      userData.username,
      userData.email,
      userData.fullName,
    );
  },

  async logoutRemote(): Promise<void> {
    if (this.isQuickDemoSession()) return;

    const token = this.getToken();
    if (!token) return;

    // Backend: POST /api/auth/logout expects { token }
    await api.post('/auth/logout', { token });
  },

  saveToken(token: string): void {
    localStorage.setItem("auth_token", token);
  },

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  },

  removeToken(): void {
    localStorage.removeItem("auth_token");
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
};
