import { useState } from 'react';
import { Github, ExternalLink } from 'lucide-react';
import { Modal, Button, Input } from './ui';
import { commitToGithub, WriteScopeError } from '../lib/githubCommit';
import { githubAuthUrl } from '../lib/auth';
import { toast } from '../store/toastStore';

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

export function CommitToGitHubModal({ open, onClose, docId, title, defaultRepo, onCommitted }: {
  open: boolean; onClose: () => void; docId: string; title: string; defaultRepo: string | null; onCommitted: () => void;
}) {
  const [repoFullName, setRepoFullName] = useState(defaultRepo ?? '');
  const [branch, setBranch] = useState('main');
  const [path, setPath] = useState(`docs/${slug(title)}.md`);
  const [message, setMessage] = useState(`docs: update ${title} via ADGVC`);
  const [busy, setBusy] = useState(false);
  const [needsScope, setNeedsScope] = useState(false);

  async function submit() {
    if (!repoFullName.includes('/')) { toast.error('Enter the repository as owner/repo.'); return; }
    setBusy(true); setNeedsScope(false);
    try {
      const res = await commitToGithub(docId, { repoFullName, branch, path, message });
      toast.success('Committed to GitHub', res.path);
      onCommitted(); onClose();
      window.open(res.commitUrl, '_blank', 'noopener');
    } catch (err) {
      if (err instanceof WriteScopeError) { setNeedsScope(true); }
      else { toast.error('Commit failed', (err as any)?.response?.data?.error?.message); }
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} title="Commit to GitHub" onClose={onClose}
      footer={needsScope ? (
        <><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="github" leftIcon={<Github size={15} />} onClick={() => (window.location.href = githubAuthUrl())}>Reconnect GitHub</Button></>
      ) : (
        <><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Github size={15} />} loading={busy} onClick={submit}>Commit</Button></>
      )}
    >
      <p className="muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--text-sm)' }}>
        Publishes this document's Markdown into the repository. This is separate from internal version history.
      </p>
      {needsScope ? (
        <div className="auth__error">
          <ExternalLink size={16} />
          <span>ADGVC needs write access to commit. Reconnect GitHub to grant the <span className="mono">repo</span> / <span className="mono">public_repo</span> scope, then try again.</span>
        </div>
      ) : (
        <div className="stack-4">
          <Input label="Repository (owner/repo)" value={repoFullName} onChange={(e) => setRepoFullName(e.target.value)} />
          <Input label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
          <Input label="File path" value={path} onChange={(e) => setPath(e.target.value)} />
          <Input label="Commit message" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}