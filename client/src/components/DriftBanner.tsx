import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Badge } from './ui';
import type { ChangedFile, DriftState } from '../lib/drift';

const STATE_META: Record<DriftState, { tone: 'add' | 'amber' | 'remove'; label: string; icon: typeof AlertTriangle; headline: string; sub: string }> = {
  current: {
    tone: 'add',
    label: 'Up to date',
    icon: AlertTriangle,
    headline: 'Documentation is current.',
    sub: '',
  },
  implementation_changed: {
    tone: 'amber',
    label: 'Implementation changed',
    icon: AlertTriangle,
    headline: 'Source updated — API surface unchanged.',
    sub: 'The file changed upstream but the exported signatures are the same. Your docs may still be accurate — review and regenerate if the behavior description needs updating.',
  },
  signature_changed: {
    tone: 'remove',
    label: 'Signatures changed',
    icon: AlertCircle,
    headline: 'API surface changed — documentation may be wrong.',
    sub: 'One or more exported signatures (names, params, or return types) changed upstream. Regenerate to keep your docs correct.',
  },
};

export function DriftBanner({
  worstState,
  changedFiles,
  onUpdate,
  updating,
}: {
  worstState: DriftState;
  changedFiles: ChangedFile[];
  onUpdate: () => void;
  updating: boolean;
}) {
  if (worstState === 'current') return null;

  const meta = STATE_META[worstState];
  const Icon = meta.icon;

  return (
    <div className="drift-banner" role="status" data-drift-state={worstState}>
      <Icon size={18} className="drift-banner__icon" />
      <div style={{ flex: 1 }}>
        <div className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{meta.headline}</strong>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        {meta.sub && (
          <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
            {meta.sub}
          </div>
        )}
        <div className="drift-banner__files">
          {changedFiles.map((f) => (
            <span key={f.path} className="drift-banner__file" style={{ display: 'block' }}>
              <span className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <span className="mono">{f.path}</span>
                <span className="muted">{f.oldSha.slice(0, 7)} → {f.newSha.slice(0, 7)}</span>
                <Badge tone={f.driftState === 'signature_changed' ? 'remove' : 'amber'}>
                  {f.driftState === 'signature_changed' ? 'API changed' : 'Implementation changed'}
                </Badge>
              </span>
              {f.driftState === 'signature_changed' && f.changedFunctions.length > 0 && (
                <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc', fontSize: 'var(--text-xs)' }}>
                  {f.changedFunctions.map((fn) => (
                    <li key={fn} className="mono muted">{fn}</li>
                  ))}
                </ul>
              )}
              {f.driftState === 'implementation_changed' && (
                <span className="muted" style={{ fontSize: 'var(--text-xs)', marginLeft: 16 }}>
                  Body changed — exported API signatures are the same.
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <Button variant="primary" leftIcon={<RefreshCw size={15} />} loading={updating} onClick={onUpdate}>
        Update documentation
      </Button>
    </div>
  );
}
