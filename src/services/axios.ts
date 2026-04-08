import axios from 'axios';
import { API_BASE_URL } from './env';
import { authService } from './authService';

const QUICK_DEMO_SESSION_KEY = 'educare_quick_demo_session';
const SESSION_EXPIRED_EVENT = 'educare:session-expired';

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/teacher') || pathname.startsWith('/student');
}

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('/auth/account-status');
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use(async (config) => {
  if (isPublicAuthRequest(config.url)) {
    return config;
  }

  const accessToken = authService.getToken() ?? (await authService.syncTokensFromAmplifySession());
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const isQuickDemoSession = localStorage.getItem(QUICK_DEMO_SESSION_KEY) === '1';
      if (!isQuickDemoSession) {

        // Prevent redirect loops: only trigger session-expired flow from protected pages.
        if (isProtectedPath(window.location.pathname)) {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

