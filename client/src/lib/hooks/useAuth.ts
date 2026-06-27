import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../routes/store/authStore';
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

  // Track whether we had a token when the last fetchMe was INITIATED.
  // We only want to clear the session when fetchMe fails for a request that
  // was sent on behalf of an authenticated user — NOT for the unauthenticated
  // mount-time fetchMe on the Login page.
  //
  // The previous code `if (meQuery.isError && token) clearSession()` with
  // [meQuery.isError, token] as deps caused a race on GitHub OAuth login:
  //   1. Login mounts, fetchMe fires without a token (401 expected).
  //   2. GitHub handoff calls setSession(token, user) → token changes to non-null.
  //   3. This effect re-runs because `token` changed.
  //   4. meQuery.isError is already true → clearSession() wipes the new session.
  //
  // Fix: only react to meQuery.isError changing, and read the token from the
  // store at that moment (not from the closed-over hook value).
  const hadTokenRef = useRef(false);
  useEffect(() => {
    hadTokenRef.current = Boolean(token);
  }, [token]);

  useEffect(() => {
    if (meQuery.isError && hadTokenRef.current) {
      clearSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.isError]);

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
