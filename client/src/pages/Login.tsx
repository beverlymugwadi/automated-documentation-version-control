import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Github, Mail, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input, Divider } from '../components/ui';
import { GitHubConnectModal } from '../components/GitHubConnectModal';
import { useAuth } from '../lib/hooks/useAuth';
import { useAuthStore, type SessionUser } from '../routes/store/authStore';
import { api } from '../lib/api';
import { parseAuthError } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ghModal, setGhModal] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  // ── GitHub OAuth token-handoff ────────────────────────────────────────────
  // The server redirects here with ?github_token=<jwt> after a successful
  // OAuth round-trip.  We read the token, verify it against /api/auth/me
  // (which hydrates the full user object), then store it exactly the same way
  // email/password login does (Zustand → localStorage via persist middleware).
  useEffect(() => {
    const token = searchParams.get('github_token');
    if (!token) return;

    // Remove the token from the URL immediately so it doesn't linger in history.
    window.history.replaceState({}, '', '/login');

    setGithubLoading(true);

    // Call /auth/me with the token in the Authorization header.
    // This avoids the SameSite=Lax cookie issue on cross-origin requests.
    api
      .get<{ user: SessionUser }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        // setSession writes to Zustand (persisted to localStorage).
        // This is the SAME call email/password login makes.
        setSession(token, data.user);
        // Pre-populate the React Query cache so ProtectedRoute renders instantly.
        qc.setQueryData(['me'], data.user);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        setGithubLoading(false);
        setFormError('GitHub sign-in failed — the session may have expired. Please try again.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFields({}); setFormError('');
    const next: Record<string, string> = {};
    if (!email) next.email = 'Enter your email';
    if (!password) next.password = 'Enter your password';
    if (Object.keys(next).length) { setFields(next); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const parsed = parseAuthError(err);
      setFields(parsed.fields ?? {});
      if (!parsed.fields) setFormError(parsed.message);
    } finally { setLoading(false); }
  }

  // Show a spinner while the GitHub token is being exchanged.
  if (githubLoading) {
    return (
      <AuthLayout>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 240, gap: 'var(--sp-3)' }}>
          <Loader2 size={24} className="spin muted" />
          <p className="muted">Signing you in with GitHub…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth__form">
        <h2 className="auth__title">Sign in to ADGVC</h2>
        <p className="auth__sub">Pick up where your docs left off.</p>
        <div className="stack-4" style={{ marginTop: 'var(--sp-6)' }}>
          <Button variant="github" block leftIcon={<Github size={17} />} onClick={() => setGhModal(true)}>
            Continue with GitHub
          </Button>
          <Divider>or</Divider>
          <form className="stack-4" onSubmit={onSubmit} noValidate>
            {formError && (
              <div className="auth__error" role="alert"><AlertTriangle size={16} /><span>{formError}</span></div>
            )}
            <Input label="Email" type="email" autoComplete="email" icon={<Mail size={16} />} value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} autoFocus />
            <Input label="Password" type="password" autoComplete="current-password" icon={<Lock size={16} />} value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} />
            <Button variant="primary" type="submit" block loading={loading}>Sign in</Button>
          </form>
        </div>
        <p className="auth__switch">New to ADGVC? <Link to="/register">Create an account</Link></p>
      </div>
      <GitHubConnectModal open={ghModal} onClose={() => setGhModal(false)} />
    </AuthLayout>
  );
}
