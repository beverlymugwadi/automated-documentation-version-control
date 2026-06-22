import { useMemo } from 'react';

const MESSAGES = [
  'docs: regenerate API reference',
  'feat: parse TSDoc comments',
  'chore: bump version tag v3',
  'fix: diff gutter alignment',
  'docs: sync from main',
  'refactor: extract generator',
  'feat: rollback to previous version',
  'docs: add usage section',
  'chore: link commit hash',
  'feat: export to markdown',
  'fix: outdated doc warning',
  'docs: initial commit',
];

function randomHash(seed: number): string {
  const chars = 'abcdef0123456789';
  let out = '';
  let n = seed * 9301 + 49297;
  for (let i = 0; i < 7; i += 1) {
    n = (n * 9301 + 49297) % 233280;
    out += chars[Math.floor((n / 233280) * chars.length)];
  }
  return out;
}

export function CommitGraph() {
  const commits = useMemo(
    () => MESSAGES.map((msg, i) => ({ hash: randomHash(i + 3), msg, glow: i % 3 === 0 })),
    [],
  );
  const loop = [...commits, ...commits];

  return (
    <div className="commitgraph" aria-hidden>
      <div className="commitgraph__track">
        {loop.map((c, i) => (
          <div className="commit" key={i}>
            <span className={c.glow ? 'commit__node commit__node--glow' : 'commit__node'} />
            <span className="commit__hash">{c.hash}</span>
            <span className="commit__msg">{c.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}