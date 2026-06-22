import { useNavigate } from 'react-router-dom';
import { Diamond, Github, ArrowRight, GitBranch, Sparkles, FolderGit2 } from 'lucide-react';
import { Button } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { PipelineConnector } from '../components/PipelineConnector';
import { CommitRail } from '../components/CommitRail';
import { DiffView } from '../components/DiffView';
import { ThemeToggle } from '../components/ThemeToggle';
import { githubAuthUrl } from '../lib/auth';
import type { Version, Diff } from '../lib/versions';

const SAMPLE_NOTES = `Overview: formats prices and manages the cart.
Install with npm install @shop/cart.
GET /api/cart returns the cart as JSON.
TODO: persistence is in-memory only.`;

const SAMPLE_DOC = `# Checkout Service

## Overview
- formats prices and manages the cart.

## API Reference
#### \`subtotal\`
\`\`\`ts
subtotal(items: LineItem[]): number
\`\`\``;

const SAMPLE_VERSIONS: Version[] = [
  { versionId: '3', versionNo: 3, commitHash: 'c3f9a21', message: 'Add usage examples', createdAt: new Date(Date.now() - 3600_000).toISOString() },
  { versionId: '2', versionNo: 2, commitHash: 'b2e7d40', message: 'Document API', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
  { versionId: '1', versionNo: 1, commitHash: 'a1b2c3d', message: 'Initial generation', createdAt: new Date(Date.now() - 172_800_000).toISOString() },
];

const SAMPLE_DIFF: Diff = {
  stats: { additions: 2, deletions: 1 },
  lines: [
    { type: 'context', text: '## Overview', oldLine: 1, newLine: 1 },
    { type: 'del', text: '- manages the cart.', oldLine: 2, newLine: null },
    { type: 'add', text: '- formats prices and manages the cart.', oldLine: null, newLine: 2 },
    { type: 'add', text: '- supports USD and EUR.', oldLine: null, newLine: 3 },
  ],
};

export function Landing() {
  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing">
      <nav className="landing__nav">
        <span className="wordmark" style={{ fontSize: 'var(--text-md)' }}>
          <Diamond size={15} className="wordmark__diamond" fill="currentColor" /> ADGVC
        </span>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <ThemeToggle />
          <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>Sign in</Button>
          <Button size="sm" variant="primary" leftIcon={<Github size={15} />} onClick={() => (window.location.href = githubAuthUrl())}>
            Continue with GitHub
          </Button>
        </div>
      </nav>

      <header className="landing__section hero">
        <span className="hero__eyebrow"><Diamond size={11} className="wordmark__diamond" fill="currentColor" /> The Living Document</span>
        <h1 className="hero__title">Documentation that <em>keeps up</em> with your code.</h1>
        <p className="hero__sub">
          ADGVC turns developer notes and source code into clean, structured documentation — version-controlled
          like commits, with diffs, rollback and export.
        </p>
        <div className="hero__cta">
          <Button variant="primary" leftIcon={<Github size={16} />} onClick={() => (window.location.href = githubAuthUrl())}>
            Continue with GitHub
          </Button>
          <Button variant="secondary" rightIcon={<ArrowRight size={15} />} onClick={() => scrollTo('how')}>
            See how it works
          </Button>
        </div>
        <div className="mini">
          <div className="mini__col mini__col--in">
            <div className="mini__label">Notes + code</div>
            <div className="mini__notes">{SAMPLE_NOTES}</div>
          </div>
          <div className="mini__pipe"><PipelineConnector running /></div>
          <div className="mini__col">
            <div className="mini__label">Generated document</div>
            <Markdown content={SAMPLE_DOC} />
          </div>
        </div>
      </header>

      <section className="landing__section" id="how">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Three steps, in the order you'd actually take them.</p>
        <div className="steps">
          {[
            { n: 1, icon: FolderGit2, t: 'Connect a repository', d: 'Link GitHub and pull JavaScript/TypeScript files straight in.' },
            { n: 2, icon: Sparkles, t: 'Generate', d: 'A rule engine categorises notes; an AST parser reads your code. They merge into Markdown.' },
            { n: 3, icon: GitBranch, t: 'Version & export', d: 'Every save is a commit. Diff, roll back, and export to PDF, Word or Markdown.' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n}>
                <div className="step__num">0{s.n}</div>
                <div className="row" style={{ gap: 6 }}><Icon size={16} /><span className="step__title">{s.t}</span></div>
                <p className="muted">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing__section">
        <h2 className="section-title">Your docs have a history</h2>
        <p className="section-sub">A real commit graph and line-level diffs make documentation decay visible — and reversible.</p>
        <div className="showcase">
          <div className="card" style={{ padding: 'var(--sp-5) var(--sp-4)' }}>
            <CommitRail versions={SAMPLE_VERSIONS} activeVersion={3} onSelect={() => {}} />
          </div>
          <DiffView diff={SAMPLE_DIFF} from={2} to={3} />
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <span>ADGVC — Automated Documentation Generator with Version Control</span>
          <span>Capstone · BSc Software Engineering · African Leadership University</span>
        </div>
      </footer>
    </div>
  );
}