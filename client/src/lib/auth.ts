import { api } from './api';
import type { SessionUser } from '../store/authStore';

interface AuthResponse {
  user: SessionUser;
  token: string;
}

export async function registerRequest(input: { fullName: string; email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input);
  return data;
}

export async function loginRequest(input: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<SessionUser> {
  const { data } = await api.get<{ user: SessionUser }>('/auth/me');
  return data.user;
}

export async function deleteAccountRequest(): Promise<void> {
  await api.delete('/auth/me');
}

export async function disconnectGithubRequest(): Promise<void> {
  await api.delete('/auth/github');
}

export function githubAuthUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}/auth/github`;
}

export function parseAuthError(err: unknown): { message: string; fields?: Record<string, string> } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = (err as any)?.response?.data?.error;
  return {
    message: res?.message ?? 'Something went wrong. Please try again.',
    fields: res?.fields,
  };
}