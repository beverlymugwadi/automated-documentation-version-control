import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Github, Mail, Lock, AlertTriangle } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input, Divider } from '../components/ui';
import { useAuth } from '../lib/hooks/useAuth';
import { githubAuthUrl, parseAuthError } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <AuthLayout>
      <div className="auth__form">
        <h2 className="auth__title">Sign in to ADGVC</h2>
        <p className="auth__sub">Pick up where your docs left off.</p>
        <div className="stack-4" style={{ marginTop: 'var(--sp-6)' }}>
          <Button variant="github" block leftIcon={<Github size={17} />} onClick={() => (window.location.href = githubAuthUrl())}>
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
        <p className="auth__switch" style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--text-xs)' }}>
          <span className="faint mono">demo · ada@adgvc.dev / password123</span>
        </p>
      </div>
    </AuthLayout>
  );
}