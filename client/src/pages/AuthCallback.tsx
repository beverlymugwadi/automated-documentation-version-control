import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuthStore, type SessionUser } from '../routes/store/authStore';
import { api } from '../lib/api';

/**
 * Handles the GitHub OAuth token-handoff redirect.
 *
 * After the server completes the GitHub OAuth flow it redirects here with
 * the JWT in ?token= instead of straight to /dashboard.  We read the token,
 * store it in Zustand (same localStorage key as email/password login), hydrate
 * the user via /api/auth/me, then navigate to /dashboard.
 *
 * Why this page exists:
 *   The server sets a SameSite=Lax httpOnly cookie which is NOT sent on
 *   cross-origin XHR requests (frontend and backend are on different origins
 *   in production).  Email/password login works because it receives the JWT
 *   in the JSON response body and calls setSession().  This page gives GitHub
 *   OAuth the same treatment.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No authentication token received. Redirecting to login…');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    // Fetch the user profile using the token from the URL.
    // We pass it explicitly in the header so the request succeeds before Zustand
    // has been updated (the interceptor in api.ts reads from the store, which is
    // still empty at this point).
    api
      .get<{ user: SessionUser }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        // Store token + user in Zustand — identical to what loginRequest() does.
        setSession(token, data.user);

        // Pre-populate the React Query cache so ProtectedRoute doesn't
        // show a spinner or re-fetch /auth/me immediately.
        qc.setQueryData(['me'], data.user);

        // Remove the token from the URL so it doesn't linger in browser history.
        window.history.replaceState({}, '', '/auth/callback');

        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setError('Sign-in failed. The link may have expired. Redirecting to login…');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        gap: 'var(--sp-3)',
        flexDirection: 'column',
      }}
    >
      {error ? (
        <p className="muted">{error}</p>
      ) : (
        <>
          <Loader2 size={24} className="spin muted" />
          <p className="muted" style={{ marginTop: 'var(--sp-3)' }}>Signing you in…</p>
        </>
      )}
    </div>
  );
}
