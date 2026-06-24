import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github, Mail, Lock, User, AlertTriangle } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button, Input, Divider } from '../components/ui';
import { GitHubConnectModal } from '../components/GitHubConnectModal';
import { useAuth } from '../lib/hooks/useAuth';
import { parseAuthError } from '../lib/auth';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ghModal, setGhModal] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFields({}); setFormError('');
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (Object.keys(next).length) { setFields(next); return; }
    setLoading(true);
    try {
      await register(fullName.trim(), email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const parsed = parseAuthError(err);
      setFields(parsed.fields ?? {});
      if (!parsed.fields) setFormError(parsed.message);
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <div className="auth__form">
        <h2 className="auth__title">Create your account</h2>
        <p className="auth__sub">Start turning notes and code into living docs.</p>
        <div className="stack-4" style={{ marginTop: 'var(--sp-6)' }}>
          <Button variant="github" block leftIcon={<Github size={17} />} onClick={() => setGhModal(true)}>
            Continue with GitHub
          </Button>
          <Divider>or</Divider>
          <form className="stack-4" onSubmit={onSubmit} noValidate>
            {formError && (
              <div className="auth__error" role="alert"><AlertTriangle size={16} /><span>{formError}</span></div>
            )}
            <Input label="Full name" autoComplete="name" icon={<User size={16} />} value={fullName} onChange={(e) => setFullName(e.target.value)} error={fields.fullName} autoFocus />
            <Input label="Email" type="email" autoComplete="email" icon={<Mail size={16} />} value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} />
            <Input label="Password" type="password" autoComplete="new-password" icon={<Lock size={16} />} value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} hint={fields.password ? undefined : 'At least 8 characters'} />
            <Button variant="primary" type="submit" block loading={loading}>Create account</Button>
          </form>
        </div>
        <p className="auth__switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
      <GitHubConnectModal open={ghModal} onClose={() => setGhModal(false)} />
    </AuthLayout>
  );
}
