import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Lock, GitFork, FolderGit2 } from 'lucide-react';
import { useAuth } from '../lib/hooks/useAuth';
import { useRepos } from '../lib/hooks/useGithub';
import { ConnectCard } from '../components/repo/ConnectCard';
import { LanguageDot } from '../components/repo/LanguageDot';
import { Badge } from '../components/ui';
import { EmptyState, ErrorState, Skeletons } from '../components/states/States';
import { relativeTime } from '../lib/time';

export function Repos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const connected = Boolean(user?.githubLogin);
  const { data, isLoading, isError, refetch } = useRepos(search);

  if (!connected) {
    return (
      <div className="container">
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-2)' }}>Repositories</h1>
        <p className="muted" style={{ marginBottom: 'var(--sp-6)' }}>Bring your code in from GitHub to generate documentation.</p>
        <ConnectCard />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row row--between" style={{ marginBottom: 'var(--sp-2)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>Repositories</h1>
        <Badge tone="add" dot>Connected as {user?.githubLogin}</Badge>
      </div>
      <p className="muted" style={{ marginBottom: 'var(--sp-5)' }}>Pick a repository to browse its JavaScript and TypeScript files.</p>

      <div className="toolbar">
        <div className="search">
          <Search size={15} className="muted" />
          <input placeholder="Search repositories…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search repositories" />
        </div>
      </div>

      {isLoading ? (
        <Skeletons count={5} height={72} />
      ) : isError ? (
        <ErrorState desc="Could not load your repositories." action={<button className="ui-btn" onClick={() => refetch()}>Retry</button>} />
      ) : !data || data.repos.length === 0 ? (
        <EmptyState icon={FolderGit2} title="No repositories found" desc={search ? `Nothing matches "${search}".` : 'Your account has no repositories yet.'} />
      ) : (
        <div className="fade-up">
          {data.repos.map((r) => {
            const [owner, name] = r.fullName.split('/');
            return (
              <div key={r.id} className="repo-row" onClick={() => navigate(`/repos/${owner}/${name}?branch=${encodeURIComponent(r.defaultBranch)}`)}>
                <div className="repo-row__main">
                  <div className="repo-row__name">
                    <FolderGit2 size={16} style={{ color: 'var(--signal)' }} />
                    <span className="mono">{r.fullName}</span>
                    <Badge tone={r.private ? 'amber' : 'neutral'}>
                      {r.private ? <><Lock size={11} /> Private</> : 'Public'}
                    </Badge>
                  </div>
                  {r.description && <div className="repo-row__desc">{r.description}</div>}
                </div>
                <div className="repo-row__meta">
                  <LanguageDot language={r.language} />
                  <span className="row" style={{ gap: 4 }}><Star size={12} /> {r.stargazers}</span>
                  <span className="row" style={{ gap: 4 }}><GitFork size={12} /> {r.defaultBranch}</span>
                  <span>Updated {relativeTime(r.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}