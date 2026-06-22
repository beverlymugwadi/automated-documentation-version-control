import { useHealth } from '../lib/hooks/useHealth';

type Status = 'connecting' | 'connected' | 'disconnected';

const COPY: Record<Status, { label: string; color: string }> = {
  connecting: { label: 'Connecting…', color: 'var(--amber)' },
  connected: { label: 'Connected', color: 'var(--green)' },
  disconnected: { label: 'Disconnected', color: 'var(--red)' },
};

export function ConnectionStatus() {
  const { data, isLoading, isError } = useHealth();

  const status: Status = isLoading
    ? 'connecting'
    : isError || !data?.ok
      ? 'disconnected'
      : 'connected';

  const { label, color } = COPY[status];

  return (
    <span
      className="card"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '6px var(--sp-3)', fontSize: 'var(--text-sm)' }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)` }} />
      <span>{label}</span>
      {status === 'connected' && data?.mockMode && (
        <span className="dim mono" style={{ fontSize: 'var(--text-xs)' }}>· mock mode</span>
      )}
    </span>
  );
}