import { Github, ShieldCheck, GitBranch } from 'lucide-react';
import { Card, Button } from '../ui';
import { githubAuthUrl } from '../../lib/auth';

export function ConnectCard() {
  return (
    <Card className="fade-up" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: 'var(--sp-7)' }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, margin: '0 auto var(--sp-4)', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        <Github size={24} />
      </div>
      <h2 style={{ fontSize: 'var(--text-xl)' }}>Connect a repository</h2>
      <p className="muted" style={{ marginTop: 'var(--sp-2)', maxWidth: '44ch', marginInline: 'auto' }}>
        Link your GitHub account to browse repositories and pull JavaScript/TypeScript files straight into a document.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-5)', margin: 'var(--sp-5) 0', flexWrap: 'wrap' }}>
        <span className="row muted" style={{ gap: 6, fontSize: 'var(--text-sm)' }}><ShieldCheck size={15} /> Token encrypted at rest</span>
        <span className="row muted" style={{ gap: 6, fontSize: 'var(--text-sm)' }}><GitBranch size={15} /> Read-only by default</span>
      </div>
      <Button variant="github" leftIcon={<Github size={17} />} onClick={() => (window.location.href = githubAuthUrl())}>
        Connect GitHub
      </Button>
    </Card>
  );
}