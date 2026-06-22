import type { Diff } from '../lib/versions';
import { Badge } from './ui';

export function DiffView({ diff, from, to }: { diff: Diff | null; from: number; to: number }) {
  if (!diff || diff.lines.length === 0) {
    return (
      <div className="diff">
        <div className="diff__bar"><span className="muted">No differences between these versions.</span></div>
      </div>
    );
  }
  const sym = (t: string) => (t === 'add' ? '+' : t === 'del' ? '-' : ' ');
  return (
    <div className="diff">
      <div className="diff__bar">
        <Badge mono>v{from} → v{to}</Badge>
        <span className="diff__add-stat">+{diff.stats.additions}</span>
        <span className="diff__del-stat">−{diff.stats.deletions}</span>
      </div>
      <div className="diff__body">
        {diff.lines.map((l, i) => (
          <div key={i} className={`diff__line diff__line--${l.type}`}>
            <span className="diff__gutter">{l.oldLine ?? ''}</span>
            <span className="diff__gutter">{l.newLine ?? ''}</span>
            <span className="diff__text">{sym(l.type)} {l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}