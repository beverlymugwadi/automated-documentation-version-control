import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Github, Trash2, LogOut, Unlink } from 'lucide-react';
import { Button, Card, Input, Modal } from '../components/ui';
import { useAuth } from '../lib/hooks/useAuth';
import { deleteAccountRequest, disconnectGithubRequest } from '../lib/auth';
import { GitHubConnectModal } from '../components/GitHubConnectModal';
import { toast } from '../store/toastStore';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [ghModal, setGhModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGithubRequest();
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('GitHub disconnected');
    } catch {
      toast.error('Could not disconnect GitHub');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccountRequest();
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not delete account');
      setDeleting(false);
    }
  }

  const confirmMatch = typed.trim() === user.email;

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-6)' }}>Account</h1>

      {/* Profile */}
      <Card style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
        <div className="row" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <span className="avatar" style={{ width: 56, height: 56, fontSize: 'var(--text-xl)' }}>{initials(user.fullName)}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>{user.fullName}</div>
            <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{user.email}</div>
          </div>
        </div>
      </Card>

      {/* GitHub */}
      <Card style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--sp-3)' }}>GitHub</div>
        {user.githubLogin ? (
          <div className="row row--between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              <Github size={16} />
              <span className="mono" style={{ fontSize: 'var(--text-sm)' }}>@{user.githubLogin}</span>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>connected</span>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<Unlink size={14} />} loading={disconnecting} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="row row--between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
              No GitHub account connected. Make sure you are signed into the correct GitHub account in your browser before connecting.
            </p>
            <Button variant="github" size="sm" leftIcon={<Github size={14} />} onClick={() => setGhModal(true)}>
              Connect GitHub
            </Button>
          </div>
        )}
      </Card>

      {/* Session */}
      <Card style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Session</div>
        <div className="row row--between" style={{ alignItems: 'center' }}>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>Sign out of this device.</p>
          <Button variant="ghost" size="sm" leftIcon={<LogOut size={14} />} onClick={async () => { await logout(); navigate('/login'); }}>
            Sign out
          </Button>
        </div>
      </Card>

      {/* Danger zone */}
      <Card style={{ padding: 'var(--sp-5)', borderColor: 'var(--red-6)' }}>
        <div style={{ fontWeight: 600, marginBottom: 'var(--sp-1)', color: 'var(--red-9)' }}>Danger zone</div>
        <div className="row row--between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
            Permanently delete your account, all projects, documents, and versions.
          </p>
          <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => { setTyped(''); setDeleteOpen(true); }}>
            Delete account
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        title="Delete account"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" leftIcon={<Trash2 size={15} />} disabled={!confirmMatch} loading={deleting} onClick={handleDelete}>
              Delete my account
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--sp-3)' }}>
          This permanently deletes your account and <strong>everything</strong> in it — all projects, documents, and version history.
        </p>
        <p className="muted" style={{ marginBottom: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
          This cannot be undone. Type your email <span className="mono confirm-strong">{user.email}</span> to confirm.
        </p>
        <Input label="Your email" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </Modal>

      <GitHubConnectModal open={ghModal} onClose={() => setGhModal(false)} />
    </div>
  );
}
