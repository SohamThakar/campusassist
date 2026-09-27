import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const baseURL = rawApiUrl ? `${rawApiUrl.replace(/\/+$/, '')}/api/v1` : '/api/v1';

const api = axios.create({
  baseURL,
  // Do NOT set a default Content-Type here.
  // Axios auto-sets 'application/json' for plain objects and
  // 'multipart/form-data; boundary=...' for FormData.
  // A default 'application/json' here overrides FormData detection
  // and breaks multipart file uploads (causes FastAPI 422).
});

/**
 * Resolves uploaded media URLs (photos, videos) using backend origin if relative.
 */
export const getUploadUrl = (path) => {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const backendOrigin = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendOrigin}${cleanPath}`;
};

// Intercept requests to attach JWT bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on public paths
      const publicPaths = ['/student', '/login', '/start-complaint', '/complaint', '/complaints', '/track', '/track-complaint'];
      const isPublic = publicPaths.some(p => window.location.pathname.startsWith(p));
      if (!isPublic && window.location.pathname !== '/login') {
        localStorage.removeItem('campus_token');
        localStorage.removeItem('campus_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
