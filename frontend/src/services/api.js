import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not configured');
}

let inMemoryAccessToken = null;
let onUnauthorizedCallback = null;
let refreshPromise = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token || null;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorizedCallback = handler;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post('/auth/refresh')
            .then((res) => {
              const newToken = res.data?.data?.accessToken || null;
              setAccessToken(newToken);
              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const freshToken = await refreshPromise;
        if (freshToken) {
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(err, fallback = 'An unexpected error occurred') {
  const apiError = err?.response?.data?.error;
  if (apiError?.details && Array.isArray(apiError.details) && apiError.details.length > 0) {
    return `${apiError.message}: ${apiError.details.map((d) => d.message).join(', ')}`;
  }
  return apiError?.message || err?.message || fallback;
}

export default api;
