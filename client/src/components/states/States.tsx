import type { ReactNode } from 'react';
import { Loader2, AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';

interface StateProps {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <Loader2 size={20} className="spin muted" />
      <span className="muted">{label}…</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, desc, action }: StateProps) {
  return (
    <div className="state fade-up">
      <div className="state__icon"><Icon size={22} /></div>
      <div className="state__title">{title}</div>
      {desc && <p className="state__desc">{desc}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', desc, action }: Partial<StateProps>) {
  return (
    <div className="state state--error fade-up" role="alert">
      <div className="state__icon"><AlertTriangle size={22} /></div>
      <div className="state__title">{title}</div>
      {desc && <p className="state__desc">{desc}</p>}
      {action}
    </div>
  );
}

export function Skeletons({ count = 4, height = 64 }: { count?: number; height?: number }) {
  return (
    <div className="stack-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}