import axios from 'axios';
import { useAuthStore } from '../routes/store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

export function getToken(): string | null {
  return useAuthStore.getState().token;
}

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  // Only set Authorization when the request hasn't already provided one.
  // Explicit per-request headers (e.g. the GitHub OAuth handoff passing a
  // fresh JWT before it's in Zustand yet) must NOT be overwritten by a
  // stale token sitting in localStorage from a previous session.
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[api] interceptor: attached token from store (len:', token.length, ')');
  } else if (config.headers.Authorization) {
    console.log('[api] interceptor: explicit Authorization present — not overwriting');
  } else {
    console.log('[api] interceptor: no token — request will be unauthenticated');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);