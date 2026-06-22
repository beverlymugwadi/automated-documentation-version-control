import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';
import type { ChangedFile } from '../lib/drift';

export function DriftBanner({
  changedFiles,
  onUpdate,
  updating,
}: {
  changedFiles: ChangedFile[];
  onUpdate: () => void;
  updating: boolean;
}) {
  return (
    <div className="drift-banner" role="status">
      <AlertTriangle size={18} className="drift-banner__icon" />
      <div style={{ flex: 1 }}>
        <strong>Source changed since this doc was generated.</strong>
        <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
          {changedFiles.length} file{changedFiles.length === 1 ? '' : 's'} updated upstream. Regenerate to bring the
          documentation in line — it creates a new version, nothing is overwritten.
        </div>
        <div className="drift-banner__files">
          {changedFiles.map((f) => (
            <span key={f.path} className="drift-banner__file">
              {f.path} · {f.oldSha.slice(0, 7)} → {f.newSha.slice(0, 7)}
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