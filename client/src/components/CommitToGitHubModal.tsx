import { useState } from 'react';
import { Github, ExternalLink, ShieldAlert, FolderGit2 } from 'lucide-react';
import { Modal, Button, Input } from './ui';
import { GitHubConnectModal } from './GitHubConnectModal';
import { commitToGithub, WriteScopeError, BranchProtectedError } from '../lib/githubCommit';
import { toast } from '../routes/store/toastStore';

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

/** Mirror a source path into docs/<path>.md — same logic as server's mirroredDocPath. */
function deriveDocPath(sourcePath: string | null | undefined, title: string): string {
  if (!sourcePath) return `docs/${slug(title)}.md`;
  const stripped = sourcePath
    .replace(/^(src\/)?app\/(\([^)]*\)\/)*/, '')
    .replace(/^(src\/)?pages\//, '')
    .replace(/^src\//, '');
  const withoutExt = stripped.replace(/\.(tsx?|jsx?|mdx?)$/, '');
  return `docs/${withoutExt}.md`;
}

export function CommitToGitHubModal({
  open,
  onClose,
  docId,
  title,
  defaultRepo,
  defaultBranch,
  firstSourcePath,
  onCommitted,
}: {
  open: boolean;
  onClose: () => void;
  docId: string;
  title: string;
  defaultRepo: string | null;
  defaultBranch?: string | null;
  firstSourcePath?: string | null;
  onCommitted: () => void;
}) {
  const [repoFullName, setRepoFullName] = useState(defaultRepo ?? '');
  const [branch, setBranch] = useState(defaultBranch ?? 'main');
  const [docPath, setDocPath] = useState(deriveDocPath(firstSourcePath, title));
  const [message, setMessage] = useState(`docs: update ${title} via ADGVC`);
  const [busy, setBusy] = useState(false);
  const [needsScope, setNeedsScope] = useState(false);
  const [branchProtected, setBranchProtected] = useState(false);
  const [ghModal, setGhModal] = useState(false);

  async function submit() {
    if (!repoFullName.includes('/')) { toast.error('Enter the repository as owner/repo.'); return; }
    setBusy(true); setNeedsScope(false); setBranchProtected(false);
    try {
      const res = await commitToGithub(docId, { repoFullName, branch, docPath: docPath.trim() || undefined, message });
      toast.success('Committed to GitHub', res.docPath);
      onCommitted();
      onClose();
      window.open(res.commitUrl, '_blank', 'noopener');
    } catch (err) {
      if (err instanceof WriteScopeError) { setNeedsScope(true); }
      else if (err instanceof BranchProtectedError) { setBranchProtected(true); }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else { toast.error('Commit failed', (err as any)?.response?.data?.error?.message); }
    } finally { setBusy(false); }
  }

  return (
    <>
      <Modal
        open={open}
        title="Commit to GitHub"
        onClose={onClose}
        footer={
          needsScope ? (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="github" leftIcon={<Github size={15} />} onClick={() => setGhModal(true)}>Reconnect GitHub</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" leftIcon={<Github size={15} />} loading={busy} onClick={submit}>Commit</Button>
            </>
          )
        }
      >
        <div className="row muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)', gap: 'var(--sp-2)' }}>
          <FolderGit2 size={14} />
          <span>
            Publishes this document to <span className="mono">docs/</span> in your repository and updates{' '}
            <span className="mono">docs/.adgvc/manifest.json</span> in one atomic commit.
            This is separate from internal version history.
          </span>
        </div>

        {needsScope ? (
          <div className="auth__error">
            <ExternalLink size={16} />
            <span>
              ADGVC needs write access to commit. Reconnect GitHub to grant the{' '}
              <span className="mono">repo</span> / <span className="mono">public_repo</span> scope, then try again.
            </span>
          </div>
        ) : (
          <div className="stack-4">
            {branchProtected && (
              <div className="auth__error" style={{ alignItems: 'flex-start' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Branch protected.</strong> Direct commits to <span className="mono">{branch}</span> are blocked — this repo requires a pull request.
                  <br />
                  Use a new branch (e.g.{' '}
                  <button
                    className="mono"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', textDecoration: 'underline' }}
                    onClick={() => { setBranch('docs/update'); setBranchProtected(false); }}
                  >
                    docs/update
                  </button>
                  ), commit there, then open a pull request on GitHub.
                </span>
              </div>
            )}

            <Input
              label="Repository (owner/repo)"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
            />
            <Input
              label="Branch"
              value={branch}
              onChange={(e) => { setBranch(e.target.value); setBranchProtected(false); }}
              hint={branchProtected ? undefined : 'Use a feature branch if the default branch is protected.'}
              error={branchProtected ? 'This branch is protected — use a different name' : undefined}
            />
            <Input
              label="Document path in repo"
              value={docPath}
              onChange={(e) => setDocPath(e.target.value)}
              hint="Auto-derived from source file path. Edit if needed."
            />
            <Input
              label="Commit message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <GitHubConnectModal open={ghModal} onClose={() => setGhModal(false)} />
    </>
  );
}
