const forceHttps = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (window.location.protocol === 'https:') {
    return url.replace(/^http:\/\//, 'https://');
  }
  return url;
};

export const API_BASE_URL = forceHttps(import.meta.env.VITE_API_BASE_URL);
export const FAST_API_BASE_URL = forceHttps(import.meta.env.VITE_FAST_API_BASE_URL);
