import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { fetchMe, loginRequest, registerRequest, logoutRequest } from '../auth';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  const user = meQuery.data ?? null;

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.isError && token) clearSession();
  }, [meQuery.isError, token, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: t, user: u } = await loginRequest({ email, password });
      setSession(t, u);
      queryClient.setQueryData(['me'], u);
    },
    [setSession, queryClient],
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const { token: t, user: u } = await registerRequest({ fullName, email, password });
      setSession(t, u);
      queryClient.setQueryData(['me'], u);
    },
    [setSession, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['me'] });
    }
  }, [clearSession, queryClient]);

  return {
    user,
    isAuthenticated: Boolean(user),
    bootstrapping: meQuery.isLoading,
    login,
    register,
    logout,
  };
}