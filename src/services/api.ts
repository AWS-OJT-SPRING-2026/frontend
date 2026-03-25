const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const QUICK_DEMO_SESSION_KEY = 'educare_quick_demo_session';

// Keep in sync with AuthContext.ts
const SESSION_EXPIRED_EVENT = 'educare:session-expired';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function isLogoutEndpoint(endpoint: string): boolean {
  const normalized = endpoint.split('?')[0].replace(/\/+$/, '');
  return normalized === '/auth/logout';
}

function buildAuthHeaders(token: string, endpoint: string, includeContentType = true): HeadersInit {
  const headers: HeadersInit = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  // Logout endpoint must send token in body only; skip Authorization header entirely.
  if (!isLogoutEndpoint(endpoint)) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseErrorMessage(response: Response): Promise<string | undefined> {
  // Try JSON first
  try {
    const errorData = (await response.clone().json()) as any;

    // identity-service standard error shape: { code, message }
    const code: number | undefined = typeof errorData?.code === 'number' ? errorData.code : undefined;
    const msg: string | undefined = errorData?.message ?? errorData?.error ?? errorData?.msg;

    // If backend sends a known error code, provide a stable VN message.
    // IMPORTANT: For these known cases we intentionally DO NOT use backend `message` to keep FE copy consistent.
    if (code === 1002) return 'Tên đăng nhập đã tồn tại, hãy dùng tên khác.'; // USER_EXISTED
    if (code === 1003) return 'Email đã tồn tại, hãy dùng email khác.'; // EMAIL_EXISTED
    if (code === 1021) return 'ACCOUNT_LOCKED'; // USER_INACTIVE – special sentinel for Login.tsx

    return msg;
  } catch {
    // ignore
  }

  // Then try text
  try {
    const text = await response.clone().text();
    // Avoid leaking raw HTML / stack traces to UI; return undefined so caller uses generic message.
    const cleaned = text?.trim();
    if (!cleaned) return undefined;
    if (cleaned.startsWith('<!doctype') || cleaned.startsWith('<html')) return undefined;
    return cleaned;
  } catch {
    return undefined;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Token expired / unauthorised → notify AuthContext immediately
    if (response.status === 401) {
      const isQuickDemoSession = localStorage.getItem(QUICK_DEMO_SESSION_KEY) === '1';
      if (!isQuickDemoSession) {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }
    const msg = await parseErrorMessage(response);
    throw new ApiError(response.status, msg || `HTTP Error: ${response.status}`);
  }
  return response.json();
}

export const api = {
  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async get<T>(endpoint: string, token?: string): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return handleResponse<T>(response);
  },

  async authPost<T>(endpoint: string, data: unknown, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: buildAuthHeaders(token, endpoint),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async authPut<T>(endpoint: string, data: unknown, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: buildAuthHeaders(token, endpoint),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async authPostForm<T>(endpoint: string, formData: FormData, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: buildAuthHeaders(token, endpoint, false),
      body: formData,
    });
    return handleResponse<T>(response);
  },

  async authPutForm<T>(endpoint: string, formData: FormData, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: buildAuthHeaders(token, endpoint, false),
      body: formData,
    });
    return handleResponse<T>(response);
  },

  async authDelete<T>(endpoint: string, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token, endpoint),
    });
    return handleResponse<T>(response);
  },

  async authPatch<T>(endpoint: string, data: unknown, token: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(token, endpoint),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },
};
