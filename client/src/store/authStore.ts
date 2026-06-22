import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SessionUser {
  userId: string;
  fullName: string;
  email: string;
  githubLogin?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: 'adgvc.auth' },
  ),
);