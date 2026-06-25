import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2, Github, FileText, GitBranch, ArrowRight, Sparkles } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { EmptyState, ErrorState, Skeletons } from '../components/states/States';
import { useAuth } from '../lib/hooks/useAuth';
import { listDocs } from '../lib/docs';
import { relativeTime } from '../lib/time';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const connected = Boolean(user?.githubLogin);
  const { data: docs, isLoading, isError, refetch } = useQuery({ queryKey: ['docs'], queryFn: listDocs });

  return (
    <div className="container">
      <div className="row row--between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', maxWidth: '18ch' }}>Turn notes and code into living docs.</h1>
          <div className="conn-line" style={{ marginTop: 'var(--sp-3)' }}>
            {connected ? (
              <>{user?.avatarUrl && <img src={user.avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />}
              <span>Connected to <span className="mono">github.com/{user?.githubLogin}</span></span></>
            ) : (
              <><Github size={15} /> <span>Not connected to GitHub yet</span></>
            )}
          </div>
        </div>
        <Button variant="primary" leftIcon={<FilePlus2 size={16} />} onClick={() => navigate('/transform')}>New document</Button>
      </div>

      {isLoading ? (
        <div className="doc-grid"><Skeletons count={6} height={150} /></div>
      ) : isError ? (
        <ErrorState desc="Could not load your documents." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : !docs || docs.length === 0 ? (
        <FirstRun connected={connected} onConnect={() => navigate('/repos')} onGenerate={() => navigate('/transform')} />
      ) : (
        <div className="doc-grid fade-up">
          {docs.map((d) => (
            <Card key={d.docId} hover className="doc-card" onClick={() => navigate(`/docs/${d.docId}`)}>
              <div className="row" style={{ gap: 'var(--sp-2)' }}>
                <FileText size={16} style={{ color: 'var(--signal)' }} />
                <span className="doc-card__title" style={{ flex: 1, minWidth: 0 }}>{d.title}</span>
                {d.driftState === 'signature_changed' && <Badge tone="remove" dot>Signatures changed</Badge>}
                {d.driftState === 'implementation_changed' && <Badge tone="amber" dot>Updated upstream</Badge>}
              </div>
              <button className="muted" style={{ fontSize: 'var(--text-sm)', flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={(e) => { e.stopPropagation(); navigate(`/projects/${d.projectId}`); }} title="Open project">
                {d.projectName}
              </button>
              <div className="doc-card__meta">
                <Badge mono>v{d.currentVersion}</Badge>
                {d.sourceRepo && <span className="row" style={{ gap: 4 }}><GitBranch size={12} /> {d.sourceRepo}</span>}
                <span>Updated {relativeTime(d.updatedAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FirstRun({ connected, onConnect, onGenerate }: { connected: boolean; onConnect: () => void; onGenerate: () => void }) {
  const steps = [
    { n: 1, icon: Github, title: 'Connect GitHub', desc: 'Link a repository to pull source files.' },
    { n: 2, icon: Sparkles, title: 'Generate', desc: 'Notes + code become a structured document.' },
    { n: 3, icon: GitBranch, title: 'Version & export', desc: 'Commit changes, diff, roll back, export.' },
  ];
  return (
    <Card style={{ padding: 'var(--sp-7)' }}>
      <EmptyState icon={FileText} title="No documents yet" desc="Create your first living document in three steps." />
      <div className="doc-grid" style={{ marginTop: 'var(--sp-5)' }}>
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <Badge tone="signal" mono>{s.n}</Badge>
              <div>
                <div className="row" style={{ gap: 6 }}><Icon size={15} /> <strong>{s.title}</strong></div>
                <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--sp-6)', gap: 'var(--sp-2)' }}>
        <Button variant="primary" rightIcon={<ArrowRight size={15} />} onClick={connected ? onGenerate : onConnect}>
          {connected ? 'Generate a document' : 'Connect GitHub'}
        </Button>
      </div>
    </Card>
  );
}