/**
 * aiFetch — thin wrapper around the native Fetch API for AI-service (FastAPI) calls.
 *
 * Mirrors the session-expiry behaviour of the main-BE Axios interceptor in axios.ts:
 *  - Automatically injects the Cognito access token as a Bearer header (when the
 *    caller has not already supplied one).
 *  - Dispatches the `educare:session-expired` custom event when the AI service
 *    returns HTTP 401, triggering the existing SessionExpiredOverlay.
 */
import { authService } from './authService';

const SESSION_EXPIRED_EVENT = 'educare:session-expired';

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/student')
  );
}

/**
 * Drop-in replacement for `fetch()` when calling the FastAPI AI service.
 *
 * @param url     Full URL of the AI-service endpoint.
 * @param options Standard `RequestInit` options (headers, method, body, …).
 *                If `Authorization` is already present in `options.headers`
 *                it is preserved as-is; otherwise the stored Cognito access
 *                token is injected automatically.
 */
export async function aiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Normalise headers so we can check / set Authorization safely.
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('authorization')) {
    const token = authService.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && isProtectedPath(window.location.pathname)) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  return response;
}
