import type { Version } from '../lib/versions';

export function Contributors({ versions }: { versions: Version[] }) {
  const byLogin = new Map<string, { login: string; avatarUrl?: string }>();
  for (const v of versions) {
    if (v.author?.login && !byLogin.has(v.author.login)) byLogin.set(v.author.login, v.author);
  }
  const authors = [...byLogin.values()];
  if (authors.length === 0) return null;

  return (
    <span className="row" style={{ gap: 'var(--sp-2)' }} title={authors.map((a) => `@${a.login}`).join(', ')}>
      <span className="facepile">
        {authors.slice(0, 5).map((a) =>
          a.avatarUrl ? (
            <img key={a.login} src={a.avatarUrl} alt={`@${a.login}`} className="facepile__avatar" />
          ) : (
            <span key={a.login} className="facepile__avatar">{a.login.slice(0, 2).toUpperCase()}</span>
          ),
        )}
      </span>
      <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        {authors.length} contributor{authors.length === 1 ? '' : 's'}
      </span>
    </span>
  );
}