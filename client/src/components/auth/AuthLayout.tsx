import type { ReactNode } from 'react';
import { Diamond } from 'lucide-react';
import { CommitGraph } from '../CommitGraph';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <CommitGraph />
        <div className="auth__brand-top">
          <span className="wordmark" style={{ fontSize: 'var(--text-lg)' }}>
            <Diamond size={16} className="wordmark__diamond" fill="currentColor" />
            ADGVC
          </span>
        </div>
        <div className="auth__brand-foot">
          <h1 className="auth__valueprop">
            Documentation that <em>keeps up</em> with your code.
          </h1>
          <p className="auth__subcopy">
            Generate clean docs from your notes and source, then version every change like commits —
            with diffs, rollback, and export.
          </p>
        </div>
      </aside>
      <main className="auth__form-side">{children}</main>
    </div>
  );
}